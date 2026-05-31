package web

import (
	"embed"
	"math/rand"
	"strings"
)

//go:embed names/*.txt
var namesFS embed.FS

var (
	westernFirst []string
	westernLast  []string
	indoFirst    []string
	indoLast     []string
	separators   = []string{".", "_", "-", ""}
)

func init() {
	westernFirst = loadNames("names/western-first.txt")
	westernLast = loadNames("names/western-last.txt")
	indoFirst = loadNames("names/indo-first.txt")
	indoLast = loadNames("names/indo-last.txt")
}

func loadNames(path string) []string {
	data, _ := namesFS.ReadFile(path)
	lines := strings.Split(strings.TrimSpace(string(data)), "\n")
	out := make([]string, 0, len(lines))
	for _, l := range lines {
		if l = strings.TrimSpace(l); l != "" {
			out = append(out, l)
		}
	}
	return out
}

func generateAddress(domain string) string {
	var first, last []string
	if rand.Intn(2) == 0 {
		first, last = westernFirst, westernLast
	} else {
		first, last = indoFirst, indoLast
	}
	f := first[rand.Intn(len(first))]
	l := last[rand.Intn(len(last))]
	sep := separators[rand.Intn(len(separators))]
	suffix := randString(5)
	return f + sep + l + sep + suffix + "@" + domain
}

func randString(n int) string {
	const chars = "abcdefghijklmnopqrstuvwxyz0123456789"
	b := make([]byte, n)
	for i := range b {
		b[i] = chars[rand.Intn(len(chars))]
	}
	return string(b)
}
