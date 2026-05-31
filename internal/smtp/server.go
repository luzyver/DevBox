package smtp

import (
	"bytes"
	"context"
	"io"
	"log"
	"mime"
	"mime/multipart"
	"net/mail"
	"strings"
	"time"

	gosmtp "github.com/emersion/go-smtp"
	"github.com/google/uuid"
	"github.com/luzyver/tempmail/internal/config"
	"github.com/luzyver/tempmail/internal/store"
)

type backend struct {
	store *store.Store
}

type session struct {
	from string
	to   []string
	b    *backend
}

func Start(cfg *config.Config, s *store.Store) {
	be := &backend{store: s}
	srv := gosmtp.NewServer(be)
	srv.Addr = ":" + cfg.SMTPPort
	srv.Domain = "localhost"
	srv.ReadTimeout = 10 * time.Second
	srv.WriteTimeout = 10 * time.Second
	srv.MaxMessageBytes = 10 * 1024 * 1024
	srv.MaxRecipients = 50
	srv.AllowInsecureAuth = true

	if err := srv.ListenAndServe(); err != nil {
		log.Fatal("smtp server:", err)
	}
}

func (b *backend) NewSession(_ *gosmtp.Conn) (gosmtp.Session, error) {
	return &session{b: b}, nil
}

func (s *session) Mail(from string, _ *gosmtp.MailOptions) error {
	s.from = from
	return nil
}

func (s *session) Rcpt(to string, _ *gosmtp.RcptOptions) error {
	parts := strings.Split(to, "@")
	if len(parts) != 2 {
		return &gosmtp.SMTPError{Code: 550, Message: "user not found"}
	}
	if active, _ := s.b.store.IsActiveDomain(context.Background(), parts[1]); !active {
		return &gosmtp.SMTPError{Code: 550, Message: "user not found"}
	}
	s.to = append(s.to, to)
	return nil
}

func (s *session) Data(r io.Reader) error {
	body, err := io.ReadAll(r)
	if err != nil {
		return err
	}

	msg, err := mail.ReadMessage(bytes.NewReader(body))
	if err != nil {
		log.Println("parse error:", err)
		return nil
	}

	subject := msg.Header.Get("Subject")
	from := s.from
	if addr, err := mail.ParseAddress(msg.Header.Get("From")); err == nil {
		from = addr.Address
	}
	textBody, htmlBody, attachments := extractParts(msg)

	for _, to := range s.to {
		emailID := uuid.NewString()
		email := &store.Email{
			ID:          emailID,
			From:        from,
			To:          to,
			Subject:     subject,
			Body:        textBody,
			HTML:        htmlBody,
			Date:        time.Now().Unix(),
			Attachments: make([]store.Attachment, 0, len(attachments)),
		}
		for _, a := range attachments {
			att := store.Attachment{
				ID:          uuid.NewString(),
				Filename:    a.filename,
				ContentType: a.contentType,
				Size:        len(a.data),
			}
			if err := s.b.store.SaveAttachment(context.Background(), emailID, att.ID, a.data); err != nil {
				log.Println("save attachment error:", err)
				continue
			}
			email.Attachments = append(email.Attachments, att)
		}
		if err := s.b.store.SaveEmail(context.Background(), email); err != nil {
			log.Println("save error:", err)
		}
	}
	return nil
}

type rawAttachment struct {
	filename    string
	contentType string
	data        []byte
}

func extractParts(msg *mail.Message) (text, html string, attachments []rawAttachment) {
	contentType := msg.Header.Get("Content-Type")
	mediaType, params, err := mime.ParseMediaType(contentType)
	if err != nil {
		b, _ := io.ReadAll(msg.Body)
		return string(b), "", nil
	}

	if strings.HasPrefix(mediaType, "multipart/") {
		text, html, attachments = parseMultipartRecursive(msg.Body, params["boundary"])
		return
	}

	b, _ := io.ReadAll(msg.Body)
	if strings.HasPrefix(mediaType, "text/html") {
		return "", string(b), nil
	}
	return string(b), "", nil
}

func parseMultipartRecursive(r io.Reader, boundary string) (text, html string, attachments []rawAttachment) {
	mr := multipart.NewReader(r, boundary)
	for {
		part, err := mr.NextPart()
		if err != nil {
			break
		}
		partType, partParams, _ := mime.ParseMediaType(part.Header.Get("Content-Type"))
		disposition, _, _ := mime.ParseMediaType(part.Header.Get("Content-Disposition"))

		if disposition == "attachment" || (disposition == "" && !strings.HasPrefix(partType, "text/") && !strings.HasPrefix(partType, "multipart/")) {
			data, _ := io.ReadAll(part)
			if len(data) > 0 && len(data) <= 5*1024*1024 {
				filename := part.FileName()
				if filename == "" {
					filename = "attachment"
				}
				attachments = append(attachments, rawAttachment{
					filename:    filename,
					contentType: partType,
					data:        data,
				})
			}
		} else if strings.HasPrefix(partType, "multipart/") {
			innerText, innerHTML, innerAtt := parseMultipartRecursive(part, partParams["boundary"])
			if text == "" {
				text = innerText
			}
			if html == "" {
				html = innerHTML
			}
			attachments = append(attachments, innerAtt...)
		} else if partType == "text/plain" && text == "" {
			b, _ := io.ReadAll(part)
			text = string(b)
		} else if partType == "text/html" && html == "" {
			b, _ := io.ReadAll(part)
			html = string(b)
		}
		part.Close()
	}
	return
}

func (s *session) Reset()        {}
func (s *session) Logout() error { return nil }
