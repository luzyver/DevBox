package dns

import (
	"context"
	"log"
	"time"

	"github.com/luzyver/tempmail/internal/store"
)

// StartChecker runs a periodic loop that verifies pending domains and promotes them to active.
// It also re-checks active domains and deactivates them if DNS is no longer valid.
func StartChecker(s *store.Store, serverIP string, interval time.Duration) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	for range ticker.C {
		ctx := context.Background()

		// Promote pending → active
		pending, err := s.GetPendingDomains(ctx)
		if err != nil {
			log.Println("dns checker: failed to get pending domains:", err)
		} else {
			for _, pd := range pending {
				mxOk, aOk := Verify(pd.Domain, serverIP)
				if mxOk && aOk {
					s.AddActiveDomain(ctx, pd.Domain)
					s.RemovePendingDomain(ctx, pd.Domain)
					log.Printf("dns checker: %s verified and activated", pd.Domain)
				}
			}
		}

		// Re-verify active domains
		active, err := s.GetActiveDomains(ctx)
		if err != nil {
			log.Println("dns checker: failed to get active domains:", err)
			continue
		}
		for _, domain := range active {
			mxOk, aOk := Verify(domain, serverIP)
			if !mxOk || !aOk {
				s.RemoveActiveDomain(ctx, domain)
				log.Printf("dns checker: %s deactivated (DNS no longer valid)", domain)
			}
		}
	}
}
