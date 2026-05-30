package dns

import (
	"net"
	"strings"
)

// Verify checks that a domain has MX record and that the MX host resolves to serverIP.
func Verify(domain, serverIP string) (mxOk, aOk bool) {
	mxs, err := net.LookupMX(domain)
	if err != nil || len(mxs) == 0 {
		return
	}

	mxOk = true
	for _, mx := range mxs {
		host := strings.TrimSuffix(mx.Host, ".")
		ips, err := net.LookupHost(host)
		if err == nil {
			for _, ip := range ips {
				if ip == serverIP {
					aOk = true
					return
				}
			}
		}
	}

	return
}
