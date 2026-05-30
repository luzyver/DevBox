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
	textBody, htmlBody := extractParts(msg)

	for _, to := range s.to {
		email := &store.Email{
			ID:      uuid.NewString(),
			From:    from,
			To:      to,
			Subject: subject,
			Body:    textBody,
			HTML:    htmlBody,
			Date:    time.Now().Unix(),
		}
		if err := s.b.store.SaveEmail(context.Background(), email); err != nil {
			log.Println("save error:", err)
		}
	}
	return nil
}

func extractParts(msg *mail.Message) (text, html string) {
	contentType := msg.Header.Get("Content-Type")
	mediaType, params, err := mime.ParseMediaType(contentType)
	if err != nil {
		// Fallback: treat entire body as text
		b, _ := io.ReadAll(msg.Body)
		return string(b), ""
	}

	if strings.HasPrefix(mediaType, "multipart/") {
		mr := multipart.NewReader(msg.Body, params["boundary"])
		for {
			part, err := mr.NextPart()
			if err != nil {
				break
			}
			partType, _, _ := mime.ParseMediaType(part.Header.Get("Content-Type"))
			partBody, _ := io.ReadAll(part)
			switch partType {
			case "text/plain":
				if text == "" {
					text = string(partBody)
				}
			case "text/html":
				if html == "" {
					html = string(partBody)
				}
			case "multipart/alternative":
				// Nested multipart
				innerText, innerHTML := parseMultipart(partBody, part.Header.Get("Content-Type"))
				if text == "" {
					text = innerText
				}
				if html == "" {
					html = innerHTML
				}
			}
			part.Close()
		}
		return
	}

	b, _ := io.ReadAll(msg.Body)
	if strings.HasPrefix(mediaType, "text/html") {
		return "", string(b)
	}
	return string(b), ""
}

func parseMultipart(body []byte, contentType string) (text, html string) {
	_, params, err := mime.ParseMediaType(contentType)
	if err != nil {
		return string(body), ""
	}
	mr := multipart.NewReader(bytes.NewReader(body), params["boundary"])
	for {
		part, err := mr.NextPart()
		if err != nil {
			break
		}
		partType, _, _ := mime.ParseMediaType(part.Header.Get("Content-Type"))
		partBody, _ := io.ReadAll(part)
		switch partType {
		case "text/plain":
			if text == "" {
				text = string(partBody)
			}
		case "text/html":
			if html == "" {
				html = string(partBody)
			}
		}
		part.Close()
	}
	return
}

func (s *session) Reset()        {}
func (s *session) Logout() error { return nil }
