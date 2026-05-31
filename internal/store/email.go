package store

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/redis/go-redis/v9"
)

type Attachment struct {
	ID          string `json:"id"`
	Filename    string `json:"filename"`
	ContentType string `json:"content_type"`
	Size        int    `json:"size"`
}

type Email struct {
	ID          string       `json:"id"`
	From        string       `json:"from"`
	To          string       `json:"to"`
	Subject     string       `json:"subject"`
	Body        string       `json:"body"`
	HTML        string       `json:"html"`
	Date        int64        `json:"date"`
	Attachments []Attachment `json:"attachments,omitempty"`
}

func (s *Store) SaveEmail(ctx context.Context, email *Email) error {
	data, err := json.Marshal(email)
	if err != nil {
		return err
	}
	key := fmt.Sprintf("inbox:%s", email.To)
	pipe := s.Redis.Pipeline()
	pipe.RPush(ctx, key, data)
	pipe.Expire(ctx, key, s.InboxTTL)
	pipe.Publish(ctx, "notify:"+email.To, data)
	_, err = pipe.Exec(ctx)
	return err
}

func (s *Store) GetInbox(ctx context.Context, address string) ([]Email, error) {
	key := fmt.Sprintf("inbox:%s", address)
	results, err := s.Redis.LRange(ctx, key, 0, -1).Result()
	if err == redis.Nil {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	emails := make([]Email, 0, len(results))
	for _, r := range results {
		var e Email
		if err := json.Unmarshal([]byte(r), &e); err == nil {
			emails = append(emails, e)
		}
	}
	return emails, nil
}

func (s *Store) DeleteEmail(ctx context.Context, address, id string) error {
	key := fmt.Sprintf("inbox:%s", address)
	results, err := s.Redis.LRange(ctx, key, 0, -1).Result()
	if err != nil {
		return err
	}
	for _, r := range results {
		var e Email
		if err := json.Unmarshal([]byte(r), &e); err == nil && e.ID == id {
			s.Redis.LRem(ctx, key, 1, r)
			// Clean up attachments
			for _, a := range e.Attachments {
				s.Redis.Del(ctx, fmt.Sprintf("attach:%s:%s", id, a.ID))
			}
			return nil
		}
	}
	return nil
}

func (s *Store) SaveAttachment(ctx context.Context, emailID, attachID string, data []byte) error {
	key := fmt.Sprintf("attach:%s:%s", emailID, attachID)
	pipe := s.Redis.Pipeline()
	pipe.Set(ctx, key, data, s.InboxTTL)
	_, err := pipe.Exec(ctx)
	return err
}

func (s *Store) GetAttachment(ctx context.Context, emailID, attachID string) ([]byte, error) {
	key := fmt.Sprintf("attach:%s:%s", emailID, attachID)
	return s.Redis.Get(ctx, key).Bytes()
}
