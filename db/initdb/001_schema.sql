CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    email TEXT NOT NULL,
    email_normalized TEXT NOT NULL UNIQUE,
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_login_at TIMESTAMPTZ,
    disabled_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS auth_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    provider TEXT NOT NULL,
    provider_user_id TEXT,
    password_hash TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (provider, provider_user_id),
    UNIQUE (user_id, provider),

    CHECK (
        (
            provider = 'email'
            AND password_hash IS NOT NULL
            AND provider_user_id IS NULL
        )
        OR
        (
            provider <> 'email'
            AND provider_user_id IS NOT NULL
            AND password_hash IS NULL
        )
    )
);

CREATE TABLE IF NOT EXISTS user_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

    username TEXT NOT NULL,
    username_normalized TEXT NOT NULL UNIQUE,

    bio TEXT,
    avatar_url TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CHECK (char_length(username) BETWEEN 3 AND 32),
    CHECK (bio IS NULL OR char_length(bio) <= 500)
);

CREATE TABLE IF NOT EXISTS user_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    rating_type TEXT NOT NULL,
    elo INTEGER NOT NULL DEFAULT 1200,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (user_id, rating_type),

    CHECK (elo >= 0),
    CHECK (rating_type IN ('bullet', 'blitz', 'rapid', 'classical', 'puzzle'))
);

CREATE INDEX IF NOT EXISTS idx_auth_accounts_user_id
ON auth_accounts(user_id);

CREATE INDEX IF NOT EXISTS idx_user_profiles_username_normalized
ON user_profiles(username_normalized);

CREATE INDEX IF NOT EXISTS idx_user_ratings_user_id
ON user_ratings(user_id);

CREATE INDEX IF NOT EXISTS idx_user_ratings_rating_type
ON user_ratings(rating_type);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_auth_accounts_updated_at ON auth_accounts;
CREATE TRIGGER update_auth_accounts_updated_at
BEFORE UPDATE ON auth_accounts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
BEFORE UPDATE ON user_profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_ratings_updated_at ON user_ratings;
CREATE TRIGGER update_user_ratings_updated_at
BEFORE UPDATE ON user_ratings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
