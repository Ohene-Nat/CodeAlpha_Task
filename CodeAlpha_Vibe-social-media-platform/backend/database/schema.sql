-- ============================================================
-- vibe SOCIAL MEDIA PLATFORM - POSTGRESQL SCHEMA
-- ============================================================
-- Run this file against an empty PostgreSQL database:
--   psql -U postgres -d vibe_db -f schema.sql
-- ============================================================

-- Enable UUID/extra extensions if needed later (not required for serial ids)
-- CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS followers CASCADE;
DROP TABLE IF EXISTS likes CASCADE;
DROP TABLE IF EXISTS bookmarks CASCADE;
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS posts CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ============================================================
-- USERS TABLE
-- ============================================================
CREATE TABLE users (
    id              SERIAL PRIMARY KEY,
    fullname        VARCHAR(100)  NOT NULL,
    username        VARCHAR(30)   NOT NULL UNIQUE,
    email           VARCHAR(255)  NOT NULL UNIQUE,
    password        VARCHAR(255)  NOT NULL,
    bio             VARCHAR(280)  DEFAULT '',
    profile_image   VARCHAR(255)  DEFAULT NULL,
    cover_image     VARCHAR(255)  DEFAULT NULL,
    is_verified     BOOLEAN       DEFAULT FALSE,
    is_online       BOOLEAN       DEFAULT FALSE,
    last_seen       TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    created_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_username ON users (LOWER(username));
CREATE INDEX idx_users_fullname ON users (LOWER(fullname));

-- ============================================================
-- POSTS TABLE
-- ============================================================
CREATE TABLE posts (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content     VARCHAR(500) DEFAULT '',
    image       VARCHAR(255) DEFAULT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_posts_user_id ON posts (user_id);
CREATE INDEX idx_posts_created_at ON posts (created_at DESC);

-- ============================================================
-- COMMENTS TABLE
-- ============================================================
CREATE TABLE comments (
    id          SERIAL PRIMARY KEY,
    post_id     INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    comment     VARCHAR(300) NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_comments_post_id ON comments (post_id);

-- ============================================================
-- LIKES TABLE
-- ============================================================
CREATE TABLE likes (
    id          SERIAL PRIMARY KEY,
    post_id     INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_like UNIQUE (post_id, user_id)
);

CREATE INDEX idx_likes_post_id ON likes (post_id);

-- ============================================================
-- BOOKMARKS TABLE (bonus feature: saved posts)
-- ============================================================
CREATE TABLE bookmarks (
    id          SERIAL PRIMARY KEY,
    post_id     INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_bookmark UNIQUE (post_id, user_id)
);

-- ============================================================
-- FOLLOWERS TABLE
-- ============================================================
CREATE TABLE followers (
    id              SERIAL PRIMARY KEY,
    follower_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_follow UNIQUE (follower_id, following_id),
    CONSTRAINT no_self_follow CHECK (follower_id <> following_id)
);

CREATE INDEX idx_followers_follower ON followers (follower_id);
CREATE INDEX idx_followers_following ON followers (following_id);

-- ============================================================
-- NOTIFICATIONS TABLE
-- ============================================================
-- type: 'like' | 'comment' | 'follow'
-- reference_id: id of the post (for like/comment) or NULL (for follow)
CREATE TABLE notifications (
    id              SERIAL PRIMARY KEY,
    receiver_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sender_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type            VARCHAR(20) NOT NULL CHECK (type IN ('like','comment','follow')),
    reference_id    INTEGER DEFAULT NULL,
    is_read         BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_receiver ON notifications (receiver_id, is_read);

-- ============================================================
-- TRIGGER: auto-update posts.updated_at on edit
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_posts_updated_at
BEFORE UPDATE ON posts
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
