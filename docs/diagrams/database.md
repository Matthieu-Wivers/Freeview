erDiagram
    USERS {
        uuid id PK
        text email
        text email_normalized UK
        boolean email_verified
        timestamp created_at
        timestamp updated_at
        timestamp last_login_at
        timestamp disabled_at
        text role
    }

    AUTH_ACCOUNTS {
        uuid id PK
        uuid user_id FK
        text provider
        text provider_user_id
        text password_hash
        timestamp created_at
        timestamp updated_at
    }

    USER_PROFILES {
        uuid user_id PK, FK
        text username
        text username_normalized UK
        text bio
        text avatar_url
        timestamp created_at
        timestamp updated_at
    }

    USER_RATINGS {
        uuid id PK
        uuid user_id FK
        text rating_type
        int elo
        timestamp created_at
        timestamp updated_at
    }

    GAMES {
        uuid id PK
        uuid user_id FK
        text pgn
        varchar white_player
        varchar black_player
        varchar result
        timestamp played_at
        varchar source
        timestamp created_at
        timestamp updated_at
        timestamp deleted_at
    }

    SHARED_GAMES {
        uuid id PK
        uuid game_id FK
        uuid user_id FK
        varchar title
        text description
        varchar visibility
        varchar moderation_status
        timestamp created_at
        timestamp updated_at
        timestamp deleted_at
        jsonb review
        jsonb analysis_summary
        timestamp reviewed_at
    }

    COMMENTS {
        uuid id PK
        uuid shared_game_id FK
        uuid user_id FK
        text content
        varchar moderation_status
        timestamp created_at
        timestamp updated_at
        timestamp deleted_at
    }

    GAME_LIKES {
        uuid id PK
        uuid shared_game_id FK
        uuid user_id FK
        timestamp created_at
    }

    REPORTS {
        uuid id PK
        uuid reporter_id FK
        varchar target_type
        uuid shared_game_id FK
        uuid comment_id FK
        varchar reason
        text details
        varchar status
        uuid reviewed_by FK
        timestamp created_at
        timestamp reviewed_at
    }

    MODERATION_ACTIONS {
        uuid id PK
        uuid admin_id FK
        uuid report_id FK
        varchar target_type
        uuid shared_game_id FK
        uuid comment_id FK
        varchar action
        varchar previous_status
        varchar new_status
        text reason
        timestamp created_at
    }

    USERS ||--o{ AUTH_ACCOUNTS : has
    USERS ||--|| USER_PROFILES : owns
    USERS ||--o{ USER_RATINGS : has
    USERS ||--o{ GAMES : imports
    USERS ||--o{ SHARED_GAMES : publishes
    USERS ||--o{ COMMENTS : writes
    USERS ||--o{ GAME_LIKES : creates
    USERS ||--o{ REPORTS : submits
    USERS ||--o{ REPORTS : reviews
    USERS ||--o{ MODERATION_ACTIONS : performs

    GAMES ||--o{ SHARED_GAMES : shared_as

    SHARED_GAMES ||--o{ COMMENTS : receives
    SHARED_GAMES ||--o{ GAME_LIKES : receives
    SHARED_GAMES ||--o{ REPORTS : can_be_reported
    SHARED_GAMES ||--o{ MODERATION_ACTIONS : can_be_moderated

    COMMENTS ||--o{ REPORTS : can_be_reported
    COMMENTS ||--o{ MODERATION_ACTIONS : can_be_moderated

    REPORTS ||--o{ MODERATION_ACTIONS : leads_to