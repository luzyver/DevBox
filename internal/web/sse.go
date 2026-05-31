package web

import (
	"context"
	"crypto/hmac"
	"fmt"
	"net/http"

	"github.com/luzyver/tempmail/internal/config"
	"github.com/luzyver/tempmail/internal/store"
)

func StartSSE(cfg *config.Config, s *store.Store) {
	mux := http.NewServeMux()

	mux.HandleFunc("/api/inbox/{address}/stream", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Headers", "Cache-Control")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		address := r.PathValue("address")
		token := r.URL.Query().Get("token")
		expected := signAddress(address, cfg.HMACSecret)

		if token == "" || !hmac.Equal([]byte(token), []byte(expected)) {
			http.Error(w, `{"error":"forbidden"}`, http.StatusForbidden)
			return
		}

		flusher, ok := w.(http.Flusher)
		if !ok {
			http.Error(w, "streaming not supported", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "text/event-stream")
		w.Header().Set("Cache-Control", "no-cache")
		w.Header().Set("Connection", "keep-alive")
		w.Header().Set("X-Accel-Buffering", "no")
		w.WriteHeader(http.StatusOK)

		// Initial ping
		fmt.Fprintf(w, ": ping\n\n")
		flusher.Flush()

		sub := s.Redis.Subscribe(context.Background(), "notify:"+address)
		defer sub.Close()
		ch := sub.Channel()

		ctx := r.Context()
		for {
			select {
			case <-ctx.Done():
				return
			case msg, ok := <-ch:
				if !ok {
					return
				}
				fmt.Fprintf(w, "data: %s\n\n", msg.Payload)
				flusher.Flush()
			}
		}
	})

	http.ListenAndServe(":8081", mux)
}
