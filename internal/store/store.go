package store

import (
	"time"

	"github.com/redis/go-redis/v9"
)

type Store struct {
	Redis    *redis.Client
	InboxTTL time.Duration
}

func NewRedis(url string) *redis.Client {
	opt, _ := redis.ParseURL(url)
	return redis.NewClient(opt)
}
