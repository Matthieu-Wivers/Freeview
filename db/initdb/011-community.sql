CREATE TABLE IF NOT EXISTS games (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pgn TEXT NOT NULL,
    white_player VARCHAR(255),
    black_player VARCHAR(255),
    result VARCHAR(20),
    played_at DATE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shared_games (
    id SERIAL PRIMARY KEY,
    game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    visibility VARCHAR(30) NOT NULL DEFAULT 'public',
    moderation_status VARCHAR(30) NOT NULL DEFAULT 'visible',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT shared_games_visibility_check
        CHECK (visibility IN ('public', 'private', 'unlisted')),

    CONSTRAINT shared_games_moderation_status_check
        CHECK (moderation_status IN ('visible', 'hidden', 'pending_review', 'deleted'))
);

CREATE TABLE IF NOT EXISTS game_likes (
    id SERIAL PRIMARY KEY,
    shared_game_id INTEGER NOT NULL REFERENCES shared_games(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT game_likes_unique_user_game
        UNIQUE (shared_game_id, user_id)
);

CREATE TABLE IF NOT EXISTS comments (
    id SERIAL PRIMARY KEY,
    shared_game_id INTEGER NOT NULL REFERENCES shared_games(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    moderation_status VARCHAR(30) NOT NULL DEFAULT 'visible',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP,

    CONSTRAINT comments_moderation_status_check
        CHECK (moderation_status IN ('visible', 'hidden', 'pending_review', 'deleted'))
);

CREATE TABLE IF NOT EXISTS reports (
    id SERIAL PRIMARY KEY,
    reporter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_type VARCHAR(30) NOT NULL,
    target_id INTEGER NOT NULL,
    reason VARCHAR(255) NOT NULL,
    details TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'open',
    reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMP,

    CONSTRAINT reports_target_type_check
        CHECK (target_type IN ('shared_game', 'comment')),

    CONSTRAINT reports_status_check
        CHECK (status IN ('open', 'reviewed', 'rejected', 'action_taken'))
);

CREATE INDEX IF NOT EXISTS idx_games_user_id
    ON games(user_id);

CREATE INDEX IF NOT EXISTS idx_shared_games_user_id
    ON shared_games(user_id);

CREATE INDEX IF NOT EXISTS idx_shared_games_game_id
    ON shared_games(game_id);

CREATE INDEX IF NOT EXISTS idx_shared_games_visibility
    ON shared_games(visibility);

CREATE INDEX IF NOT EXISTS idx_shared_games_moderation_status
    ON shared_games(moderation_status);

CREATE INDEX IF NOT EXISTS idx_game_likes_shared_game_id
    ON game_likes(shared_game_id);

CREATE INDEX IF NOT EXISTS idx_game_likes_user_id
    ON game_likes(user_id);

CREATE INDEX IF NOT EXISTS idx_comments_shared_game_id
    ON comments(shared_game_id);

CREATE INDEX IF NOT EXISTS idx_comments_user_id
    ON comments(user_id);

CREATE INDEX IF NOT EXISTS idx_reports_status
    ON reports(status);

CREATE INDEX IF NOT EXISTS idx_reports_target
    ON reports(target_type, target_id);