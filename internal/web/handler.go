package web

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/luzyver/tempmail/internal/config"
	"github.com/luzyver/tempmail/internal/dns"
	"github.com/luzyver/tempmail/internal/store"
)

func signAddress(address, secret string) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(address))
	return hex.EncodeToString(mac.Sum(nil))
}

func verifyToken(c *fiber.Ctx, address, secret string) bool {
	auth := c.Get("Authorization")
	token := strings.TrimPrefix(auth, "Bearer ")
	return hmac.Equal([]byte(token), []byte(signAddress(address, secret)))
}

func Start(cfg *config.Config, s *store.Store) {
	app := fiber.New()
	app.Use(cors.New())

	api := app.Group("/api")

	api.Get("/server-info", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"ip": cfg.ServerIP})
	})

	api.Get("/domains", func(c *fiber.Ctx) error {
		active, err := s.GetActiveDomains(c.Context())
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": err.Error()})
		}
		return c.JSON(fiber.Map{"domains": strings.Join(active, ",")})
	})

	api.Get("/domains/pending", func(c *fiber.Ctx) error {
		pending, err := s.GetPendingDomains(c.Context())
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": err.Error()})
		}
		return c.JSON(fiber.Map{"domains": pending})
	})

	api.Post("/domains/submit", func(c *fiber.Ctx) error {
		var body struct {
			Domain string `json:"domain"`
		}
		if err := c.BodyParser(&body); err != nil || body.Domain == "" {
			return c.Status(400).JSON(fiber.Map{"error": "domain required"})
		}
		domain := strings.ToLower(strings.TrimSpace(body.Domain))

		if active, _ := s.IsActiveDomain(c.Context(), domain); active {
			return c.Status(409).JSON(fiber.Map{"error": "domain already active"})
		}
		if pending, _ := s.IsPendingDomain(c.Context(), domain); pending {
			return c.Status(409).JSON(fiber.Map{"error": "domain already pending verification"})
		}

		mxOk, aOk := dns.Verify(domain, cfg.ServerIP)
		if mxOk && aOk {
			s.AddActiveDomain(c.Context(), domain)
			return c.JSON(fiber.Map{"status": "active", "message": "DNS verified, domain is now active"})
		}

		s.AddPendingDomain(c.Context(), domain)
		return c.JSON(fiber.Map{
			"status":  "pending",
			"message": "Domain added to pending. DNS will be checked periodically.",
			"mx_ok":   mxOk,
			"a_ok":    aOk,
		})
	})

	api.Post("/inbox/claim", func(c *fiber.Ctx) error {
		var body struct {
			Address string `json:"address"`
		}
		if err := c.BodyParser(&body); err != nil || body.Address == "" {
			return c.Status(400).JSON(fiber.Map{"error": "address required"})
		}
		token := signAddress(body.Address, cfg.HMACSecret)
		return c.JSON(fiber.Map{"token": token})
	})

	api.Get("/inbox/:address", func(c *fiber.Ctx) error {
		address := c.Params("address")
		if !verifyToken(c, address, cfg.HMACSecret) {
			return c.Status(403).JSON(fiber.Map{"error": "forbidden"})
		}
		emails, err := s.GetInbox(c.Context(), address)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": err.Error()})
		}
		return c.JSON(emails)
	})

	api.Delete("/inbox/:address/:id", func(c *fiber.Ctx) error {
		address := c.Params("address")
		if !verifyToken(c, address, cfg.HMACSecret) {
			return c.Status(403).JSON(fiber.Map{"error": "forbidden"})
		}
		if err := s.DeleteEmail(c.Context(), address, c.Params("id")); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": err.Error()})
		}
		return c.JSON(fiber.Map{"ok": true})
	})

	app.Listen(":" + cfg.HTTPPort)
}
