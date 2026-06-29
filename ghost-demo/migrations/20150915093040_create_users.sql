CREATE TABLE users (
    id VARCHAR(24) PRIMARY KEY,
    name VARCHAR(191) NOT NULL,
    slug VARCHAR(191) NOT NULL UNIQUE,
    password VARCHAR(60) NOT NULL,
    email VARCHAR(191) NOT NULL UNIQUE,
    profile_image VARCHAR(2000),
    cover_image VARCHAR(2000),
    bio TEXT,
    website VARCHAR(2000),
    location VARCHAR(65535),
    accessibility TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    visibility VARCHAR(50) NOT NULL DEFAULT 'public',
    meta_title VARCHAR(2000),
    meta_description VARCHAR(2000),
    tour TEXT,
    last_seen DATETIME,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME,
    created_by VARCHAR(24) NOT NULL,
    updated_by VARCHAR(24)
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_slug ON users(slug);
