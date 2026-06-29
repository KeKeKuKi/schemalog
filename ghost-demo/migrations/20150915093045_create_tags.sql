CREATE TABLE tags (
    id VARCHAR(24) PRIMARY KEY,
    name VARCHAR(191) NOT NULL,
    slug VARCHAR(191) NOT NULL,
    description TEXT,
    feature_image VARCHAR(2000),
    meta_title VARCHAR(2000),
    meta_description VARCHAR(2000),
    visibility VARCHAR(50) NOT NULL DEFAULT 'public',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME,
    created_by VARCHAR(24) NOT NULL,
    updated_by VARCHAR(24)
);

CREATE UNIQUE INDEX idx_tags_slug ON tags(slug);

CREATE TABLE posts_tags (
    id VARCHAR(24) PRIMARY KEY,
    post_id VARCHAR(24) NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    tag_id VARCHAR(24) NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    sort_order INT NOT NULL DEFAULT 0,
    UNIQUE (post_id, tag_id)
);

CREATE INDEX idx_posts_tags_post_id ON posts_tags(post_id);
CREATE INDEX idx_posts_tags_tag_id ON posts_tags(tag_id);
