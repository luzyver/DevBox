package googleimap

import (
	"bufio"
	"bytes"
	"context"
	"crypto/tls"
	"fmt"
	"io"
	"log"
	"mime"
	"mime/multipart"
	"net"
	"net/mail"
	"net/textproto"
	"regexp"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/luzyver/tempmail/internal/config"
	"github.com/luzyver/tempmail/internal/store"
)

var literalSizePattern = regexp.MustCompile(`\{([0-9]+)\}$`)

type Poller struct {
	cfg   *config.Config
	store *store.Store
}

func Start(cfg *config.Config, s *store.Store) {
	if cfg.GoogleIMAPUser == "" || cfg.GoogleIMAPPass == "" || cfg.GoogleBaseEmail == "" || cfg.GoogleIMAPHost == "" || cfg.GooglePollEvery <= 0 {
		return
	}

	p := &Poller{cfg: cfg, store: s}
	go p.loop()
}

func (p *Poller) loop() {
	ticker := time.NewTicker(p.cfg.GooglePollEvery)
	defer ticker.Stop()

	for {
		if err := p.poll(context.Background()); err != nil {
			log.Println("google imap poll error:", err)
		}
		<-ticker.C
	}
}

func (p *Poller) poll(ctx context.Context) error {
	c, err := dial(p.cfg.GoogleIMAPHost)
	if err != nil {
		return err
	}
	defer c.close()

	if _, err := c.readLine(); err != nil {
		return err
	}
	if err := c.command("LOGIN %s %s", quote(p.cfg.GoogleIMAPUser), quote(p.cfg.GoogleIMAPPass)); err != nil {
		return err
	}
	if err := c.command("SELECT INBOX"); err != nil {
		return err
	}

	baseLocal, _, ok := strings.Cut(strings.ToLower(p.cfg.GoogleBaseEmail), "@")
	if !ok || baseLocal == "" {
		return fmt.Errorf("invalid GOOGLE_BASE_EMAIL")
	}

	searchLines, err := c.commandLines("UID SEARCH UNSEEN TO %s", quote(baseLocal))
	if err != nil {
		return err
	}

	uids := parseSearchUIDs(searchLines)
	for _, uid := range uids {
		raw, err := c.fetchRFC822(uid)
		if err != nil {
			log.Println("google imap fetch error:", err)
			continue
		}
		if err := p.saveMessage(ctx, raw); err != nil {
			log.Println("google imap save error:", err)
			continue
		}
		if err := c.command("UID STORE %s +FLAGS.SILENT (\\Seen)", uid); err != nil {
			log.Println("google imap mark seen error:", err)
		}
	}

	return c.command("LOGOUT")
}

func (p *Poller) saveMessage(ctx context.Context, raw []byte) error {
	msg, err := mail.ReadMessage(bytes.NewReader(raw))
	if err != nil {
		return err
	}

	alias, ok := p.aliasRecipient(msg.Header)
	if !ok {
		return nil
	}

	from := ""
	if addr, err := mail.ParseAddress(msg.Header.Get("From")); err == nil {
		from = addr.Address
	}
	subject := decodeHeader(msg.Header.Get("Subject"))
	textBody, htmlBody := extractBody(msg)

	email := &store.Email{
		ID:          uuid.NewString(),
		From:        from,
		To:          alias,
		Subject:     subject,
		Body:        textBody,
		HTML:        htmlBody,
		Date:        time.Now().Unix(),
		Attachments: nil,
	}
	if err := p.store.SaveEmail(ctx, email); err != nil {
		return err
	}
	return nil
}

func (p *Poller) aliasRecipient(header mail.Header) (string, bool) {
	baseLocal, baseDomain, ok := strings.Cut(strings.ToLower(p.cfg.GoogleBaseEmail), "@")
	if !ok || baseLocal == "" || baseDomain == "" {
		return "", false
	}

	if alias, ok := p.uniqueAliasFromHeaders(header, baseLocal, baseDomain, []string{"Delivered-To", "X-Original-To"}); ok {
		return alias, true
	}

	return p.uniqueAliasFromHeaders(header, baseLocal, baseDomain, []string{"To", "Cc"})
}

func (p *Poller) uniqueAliasFromHeaders(header mail.Header, baseLocal, baseDomain string, keys []string) (string, bool) {
	seen := make(map[string]struct{})
	for _, key := range keys {
		for _, value := range header[textproto.CanonicalMIMEHeaderKey(key)] {
			for _, address := range parseAddresses(value) {
				address = strings.ToLower(address)
				local, domain, ok := strings.Cut(address, "@")
				if !ok || domain != baseDomain || !strings.HasPrefix(local, baseLocal+"+") {
					continue
				}
				seen[address] = struct{}{}
			}
		}
	}

	if len(seen) != 1 {
		if len(seen) > 1 {
			log.Printf("google imap skipped ambiguous alias headers %v: %v", keys, mapKeys(seen))
		}
		return "", false
	}
	for address := range seen {
		return address, true
	}
	return "", false
}

func mapKeys(values map[string]struct{}) []string {
	keys := make([]string, 0, len(values))
	for key := range values {
		keys = append(keys, key)
	}
	return keys
}

func parseAddresses(value string) []string {
	list, err := mail.ParseAddressList(value)
	if err == nil {
		addresses := make([]string, 0, len(list))
		for _, addr := range list {
			addresses = append(addresses, addr.Address)
		}
		return addresses
	}

	fields := strings.FieldsFunc(value, func(r rune) bool {
		return r == ',' || r == ';' || r == '<' || r == '>' || r == ' ' || r == '\t'
	})
	var addresses []string
	for _, field := range fields {
		if strings.Contains(field, "@") {
			addresses = append(addresses, strings.TrimSpace(field))
		}
	}
	return addresses
}

func extractBody(msg *mail.Message) (text, html string) {
	contentType := msg.Header.Get("Content-Type")
	mediaType, params, err := mime.ParseMediaType(contentType)
	if err != nil {
		b, _ := io.ReadAll(msg.Body)
		return string(b), ""
	}

	if strings.HasPrefix(mediaType, "multipart/") {
		return parseMultipartBody(msg.Body, params["boundary"])
	}

	b, _ := io.ReadAll(msg.Body)
	if strings.HasPrefix(mediaType, "text/html") {
		return "", string(b)
	}
	return string(b), ""
}

func parseMultipartBody(r io.Reader, boundary string) (text, html string) {
	mr := multipart.NewReader(r, boundary)
	for {
		part, err := mr.NextPart()
		if err != nil {
			break
		}
		partType, partParams, _ := mime.ParseMediaType(part.Header.Get("Content-Type"))
		disposition, _, _ := mime.ParseMediaType(part.Header.Get("Content-Disposition"))

		if strings.HasPrefix(partType, "multipart/") {
			innerText, innerHTML := parseMultipartBody(part, partParams["boundary"])
			if text == "" {
				text = innerText
			}
			if html == "" {
				html = innerHTML
			}
		} else if disposition != "attachment" && partType == "text/plain" && text == "" {
			text = string(readBody(part))
		} else if disposition != "attachment" && partType == "text/html" && html == "" {
			html = string(readBody(part))
		}
		part.Close()
	}
	return
}

func readBody(r io.Reader) []byte {
	b, _ := io.ReadAll(r)
	return b
}

func decodeHeader(value string) string {
	decoded, err := (&mime.WordDecoder{}).DecodeHeader(value)
	if err != nil {
		return value
	}
	return decoded
}

type imapConn struct {
	conn   net.Conn
	reader *bufio.Reader
	tag    int
}

func dial(host string) (*imapConn, error) {
	conn, err := tls.Dial("tcp", host, &tls.Config{ServerName: strings.Split(host, ":")[0]})
	if err != nil {
		return nil, err
	}
	return &imapConn{conn: conn, reader: bufio.NewReader(conn)}, nil
}

func (c *imapConn) close() {
	c.conn.Close()
}

func (c *imapConn) command(format string, args ...any) error {
	_, err := c.commandLines(format, args...)
	return err
}

func (c *imapConn) commandLines(format string, args ...any) ([]string, error) {
	c.tag++
	tag := fmt.Sprintf("A%04d", c.tag)
	if _, err := fmt.Fprintf(c.conn, "%s %s\r\n", tag, fmt.Sprintf(format, args...)); err != nil {
		return nil, err
	}

	var lines []string
	for {
		line, err := c.readLine()
		if err != nil {
			return lines, err
		}
		lines = append(lines, line)
		if strings.HasPrefix(line, tag+" ") {
			if strings.Contains(line, " OK") {
				return lines, nil
			}
			return lines, fmt.Errorf("imap command failed: %s", line)
		}
	}
}

func (c *imapConn) fetchRFC822(uid string) ([]byte, error) {
	c.tag++
	tag := fmt.Sprintf("A%04d", c.tag)
	if _, err := fmt.Fprintf(c.conn, "%s UID FETCH %s (RFC822)\r\n", tag, uid); err != nil {
		return nil, err
	}

	var raw []byte
	for {
		line, err := c.readLine()
		if err != nil {
			return nil, err
		}
		if matches := literalSizePattern.FindStringSubmatch(line); len(matches) == 2 {
			var size int
			fmt.Sscanf(matches[1], "%d", &size)
			raw = make([]byte, size)
			if _, err := io.ReadFull(c.reader, raw); err != nil {
				return nil, err
			}
			c.reader.ReadString('\n')
			continue
		}
		if strings.HasPrefix(line, tag+" ") {
			if strings.Contains(line, " OK") {
				return raw, nil
			}
			return nil, fmt.Errorf("imap fetch failed: %s", line)
		}
	}
}

func (c *imapConn) readLine() (string, error) {
	line, err := c.reader.ReadString('\n')
	if err != nil {
		return "", err
	}
	return strings.TrimRight(line, "\r\n"), nil
}

func parseSearchUIDs(lines []string) []string {
	for _, line := range lines {
		if !strings.HasPrefix(line, "* SEARCH") {
			continue
		}
		fields := strings.Fields(line)
		if len(fields) <= 2 {
			return nil
		}
		return fields[2:]
	}
	return nil
}

func quote(value string) string {
	return `"` + strings.ReplaceAll(value, `"`, `\"`) + `"`
}
