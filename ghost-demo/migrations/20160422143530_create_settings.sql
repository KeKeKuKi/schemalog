CREATE TABLE settings (
    id VARCHAR(24) PRIMARY KEY,
    `key` VARCHAR(50) NOT NULL UNIQUE,
    `value` TEXT,
    `type` VARCHAR(50) NOT NULL DEFAULT 'core',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME,
    created_by VARCHAR(24) NOT NULL,
    updated_by VARCHAR(24)
);

INSERT INTO settings (`key`, `value`, `type`) VALUES
    ('title', 'My Blog', 'blog'),
    ('description', 'Thoughts and stories', 'blog'),
    ('logo', '', 'blog'),
    ('cover_image', '', 'blog'),
    ('icon', '', 'blog'),
    ('default_locale', 'en', 'blog'),
    ('active_timezone', 'Etc/UTC', 'blog'),
    ('labs', '{}', 'blog'),
    ('navigation', '[]', 'blog'),
    ('secondary_navigation', '[]', 'blog'),
    ('slack', '[]', 'core'),
    ('unsplash', '[]', 'core'),
    ('shared_views', '[]', 'core'),
    ('members_email_auth_secret', '', 'core'),
    ('email_verification_required', 'false', 'core'),
    ('amp', 'true', 'blog');
