CREATE TABLE emails (
    id VARCHAR(24) PRIMARY KEY,
    post_id VARCHAR(24) NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    uuid VARCHAR(36) NOT NULL UNIQUE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    recipient_filter VARCHAR(50) NOT NULL DEFAULT 'all',
    subject VARCHAR(300) NOT NULL,
    html TEXT,
    plaintext TEXT,
    stats TEXT,
    email_count INT NOT NULL DEFAULT 0,
    delivered_count INT NOT NULL DEFAULT 0,
    opened_count INT NOT NULL DEFAULT 0,
    failed_count INT NOT NULL DEFAULT 0,
    source VARCHAR(50) DEFAULT 'html',
    source_type VARCHAR(50) DEFAULT 'mobiledoc',
    submitted_at DATETIME,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_emails_post_id ON emails(post_id);

CREATE TABLE email_batches (
    id VARCHAR(24) PRIMARY KEY,
    email_id VARCHAR(24) NOT NULL REFERENCES emails(id) ON DELETE CASCADE,
    provider_id VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    member_segment TEXT
);

CREATE INDEX idx_email_batches_email ON email_batches(email_id);
