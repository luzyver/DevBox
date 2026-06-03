package config

import (
	"log"
	"os"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	SMTPPort        string
	HTTPPort        string
	RedisURL        string
	InboxTTL        time.Duration
	HMACSecret      string
	ServerIP        string // public IP for DNS verification
	TurnstileSecret string
	GoogleBaseEmail string
	GoogleIMAPUser  string
	GoogleIMAPPass  string
	GoogleIMAPHost  string
	GooglePollEvery time.Duration
}

func Load() *Config {
	godotenv.Load()
	ttl, err := time.ParseDuration(os.Getenv("INBOX_TTL"))
	if err != nil {
		log.Fatal("INBOX_TTL must be set to a valid duration")
	}
	googlePollEvery, err := time.ParseDuration(os.Getenv("GOOGLE_IMAP_POLL_INTERVAL"))
	if os.Getenv("GOOGLE_IMAP_POLL_INTERVAL") == "" || err != nil {
		googlePollEvery = 0
	}
	return &Config{
		SMTPPort:        os.Getenv("SMTP_PORT"),
		HTTPPort:        os.Getenv("HTTP_PORT"),
		RedisURL:        os.Getenv("REDIS_URL"),
		InboxTTL:        ttl,
		HMACSecret:      os.Getenv("HMAC_SECRET"),
		ServerIP:        os.Getenv("SERVER_IP"),
		TurnstileSecret: os.Getenv("TURNSTILE_SECRET"),
		GoogleBaseEmail: os.Getenv("GOOGLE_BASE_EMAIL"),
		GoogleIMAPUser:  os.Getenv("GOOGLE_IMAP_USER"),
		GoogleIMAPPass:  os.Getenv("GOOGLE_IMAP_APP_PASSWORD"),
		GoogleIMAPHost:  os.Getenv("GOOGLE_IMAP_HOST"),
		GooglePollEvery: googlePollEvery,
	}
}
