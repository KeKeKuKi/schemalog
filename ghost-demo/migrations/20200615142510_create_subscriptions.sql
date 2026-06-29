CREATE TABLE stripe_customers (
    id VARCHAR(24) PRIMARY KEY,
    customer_id VARCHAR(255) NOT NULL,
    member_id VARCHAR(24) NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    name VARCHAR(191),
    email VARCHAR(191) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_stripe_customers_member ON stripe_customers(member_id);

CREATE TABLE subscriptions (
    id VARCHAR(24) PRIMARY KEY,
    customer_id VARCHAR(255) NOT NULL,
    member_id VARCHAR(24) NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    stripe_subscription_id VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'trialing',
    current_period_end DATETIME,
    plan_id VARCHAR(24),
    plan_nickname VARCHAR(50),
    plan_interval VARCHAR(50),
    plan_amount INT,
    plan_currency VARCHAR(3) DEFAULT 'usd',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME
);

CREATE INDEX idx_subscriptions_member ON subscriptions(member_id);
CREATE INDEX idx_subscriptions_stripe ON subscriptions(stripe_subscription_id);
