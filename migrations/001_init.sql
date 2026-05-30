CREATE TABLE IF NOT EXISTS domains (
    id SERIAL PRIMARY KEY,
    domain VARCHAR(255) UNIQUE NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS emails (
    id UUID PRIMARY KEY,
    from_addr VARCHAR(255) NOT NULL,
    to_addr VARCHAR(255) NOT NULL,
    subject TEXT,
    body TEXT,
    html TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_emails_to_addr ON emails(to_addr);
CREATE INDEX idx_emails_created_at ON emails(created_at);
