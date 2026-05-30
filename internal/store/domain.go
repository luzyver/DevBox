package store

import (
	"context"
	"encoding/json"
	"time"
)

type PendingDomain struct {
	Domain    string `json:"domain"`
	SubmittedAt int64  `json:"submitted_at"`
}

const (
	keyDomainsActive  = "domains:active"
	keyDomainsPending = "domains:pending"
)

func (s *Store) AddActiveDomain(ctx context.Context, domain string) error {
	return s.Redis.SAdd(ctx, keyDomainsActive, domain).Err()
}

func (s *Store) RemoveActiveDomain(ctx context.Context, domain string) error {
	return s.Redis.SRem(ctx, keyDomainsActive, domain).Err()
}

func (s *Store) GetActiveDomains(ctx context.Context) ([]string, error) {
	return s.Redis.SMembers(ctx, keyDomainsActive).Result()
}

func (s *Store) IsActiveDomain(ctx context.Context, domain string) (bool, error) {
	return s.Redis.SIsMember(ctx, keyDomainsActive, domain).Result()
}

func (s *Store) AddPendingDomain(ctx context.Context, domain string) error {
	pd := PendingDomain{Domain: domain, SubmittedAt: time.Now().Unix()}
	data, _ := json.Marshal(pd)
	return s.Redis.HSet(ctx, keyDomainsPending, domain, data).Err()
}

func (s *Store) RemovePendingDomain(ctx context.Context, domain string) error {
	return s.Redis.HDel(ctx, keyDomainsPending, domain).Err()
}

func (s *Store) GetPendingDomains(ctx context.Context) ([]PendingDomain, error) {
	results, err := s.Redis.HGetAll(ctx, keyDomainsPending).Result()
	if err != nil {
		return nil, err
	}
	domains := make([]PendingDomain, 0, len(results))
	for _, v := range results {
		var pd PendingDomain
		if json.Unmarshal([]byte(v), &pd) == nil {
			domains = append(domains, pd)
		}
	}
	return domains, nil
}

func (s *Store) IsPendingDomain(ctx context.Context, domain string) (bool, error) {
	return s.Redis.HExists(ctx, keyDomainsPending, domain).Result()
}
