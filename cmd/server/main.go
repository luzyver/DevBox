package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/luzyver/tempmail/internal/config"
	"github.com/luzyver/tempmail/internal/dns"
	"github.com/luzyver/tempmail/internal/smtp"
	"github.com/luzyver/tempmail/internal/web"
	"github.com/luzyver/tempmail/internal/store"
)

func main() {
	cfg := config.Load()

	rdb := store.NewRedis(cfg.RedisURL)
	defer rdb.Close()

	s := &store.Store{Redis: rdb, InboxTTL: cfg.InboxTTL}

	go smtp.Start(cfg, s)
	go web.Start(cfg, s)
	go web.StartSSE(cfg, s)
	go dns.StartChecker(s, cfg.ServerIP, 5*time.Minute)

	log.Printf("SMTP listening on :%s", cfg.SMTPPort)
	log.Printf("HTTP listening on :%s", cfg.HTTPPort)
	log.Printf("SSE listening on :8081")

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("shutting down")
}
