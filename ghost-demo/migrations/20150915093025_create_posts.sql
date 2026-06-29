CREATE TABLE posts (
    id VARCHAR(24) PRIMARY KEY,
    uuid VARCHAR(36) NOT NULL UNIQUE,
    title VARCHAR(2000) NOT NULL,
    slug VARCHAR(191) NOT NULL,
    mobiledoc TEXT,
    html TEXT,
    plaintext TEXT,
    featured_image VARCHAR(2000),
    featured TINYINT(1) NOT NULL DEFAULT 0,
    type VARCHAR(50) NOT NULL DEFAULT 'post',
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    locale VARCHAR(6),
    visibility VARCHAR(50) NOT NULL DEFAULT 'public',
    meta_title VARCHAR(2000),
    meta_description VARCHAR(2000),
    author_id VARCHAR(24) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME,
    published_at DATETIME,
    created_by VARCHAR(24) NOT NULL,
    updated_by VARCHAR(24)
);

CREATE INDEX idx_posts_slug ON posts(slug);
CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_posts_author_id ON posts(author_id);
CREATE INDEX idx_posts_published_at ON posts(published_at);
