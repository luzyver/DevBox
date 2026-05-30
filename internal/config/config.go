package config

import (
	"os"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	SMTPPort   string
	HTTPPort   string
	RedisURL   string
	InboxTTL   time.Duration
	HMACSecret string
	ServerIP   string // public IP for DNS verification
}

func Load() *Config {
	godotenv.Load()
	ttl, err := time.ParseDuration(os.Getenv("INBOX_TTL"))
	if err != nil {
		ttl = 1 * time.Hour
	}
	return &Config{
		SMTPPort:   os.Getenv("SMTP_PORT"),
		HTTPPort:   os.Getenv("HTTP_PORT"),
		RedisURL:   os.Getenv("REDIS_URL"),
		InboxTTL:   ttl,
		HMACSecret: os.Getenv("HMAC_SECRET"),
		ServerIP:   os.Getenv("SERVER_IP"),
	}
}
