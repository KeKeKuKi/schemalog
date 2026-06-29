CREATE TABLE members (
    id VARCHAR(24) PRIMARY KEY,
    uuid VARCHAR(36) NOT NULL UNIQUE,
    email VARCHAR(191) NOT NULL UNIQUE,
    name VARCHAR(191),
    note TEXT,
    subscribed TINYINT(1) NOT NULL DEFAULT 1,
    geolocation VARCHAR(2000),
    expertise VARCHAR(191),
    status VARCHAR(50) NOT NULL DEFAULT 'free',
    email_count INT NOT NULL DEFAULT 0,
    email_opened_count INT NOT NULL DEFAULT 0,
    email_open_rate DOUBLE DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME,
    created_by VARCHAR(24) NOT NULL,
    updated_by VARCHAR(24)
);

CREATE INDEX idx_members_email ON members(email);
CREATE INDEX idx_members_status ON members(status);
