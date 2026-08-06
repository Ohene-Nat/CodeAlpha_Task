-- ============================================================
-- vibe - SAMPLE SEED DATA
-- Run AFTER schema.sql:
--   psql -U postgres -d vibe_db -f seed.sql
-- NOTE: All sample users share the password: Password123!
-- The hash below is a bcrypt hash (10 rounds) of "Password123!"
-- ============================================================

INSERT INTO users (fullname, username, email, password, bio, is_verified) VALUES
('Nathan Cole',  'nathan',  'nathan@vibe.com',  '$2b$10$.pkBj6u39iuXPXUELBmBgeN3FoHFuxHqZBjoP19igi0zsgwf6ny..', 'Building things one commit at a time 🚀', TRUE),
('Sarah Kim',    'sarahk',  'sarah@vibe.com',   '$2b$10$.pkBj6u39iuXPXUELBmBgeN3FoHFuxHqZBjoP19igi0zsgwf6ny..', 'Designer • Coffee addict ☕ • Cat mom', TRUE),
('John Alvarez', 'johna',   'john@vibe.com',    '$2b$10$.pkBj6u39iuXPXUELBmBgeN3FoHFuxHqZBjoP19igi0zsgwf6ny..', 'Photographer 📸 | Traveling the world', FALSE),
('Maya Chen',    'mayac',   'maya@vibe.com',    '$2b$10$.pkBj6u39iuXPXUELBmBgeN3FoHFuxHqZBjoP19igi0zsgwf6ny..', 'Full-stack dev. I break prod on Fridays.', FALSE),
('Leo Martins',  'leom',    'leo@vibe.com',     '$2b$10$.pkBj6u39iuXPXUELBmBgeN3FoHFuxHqZBjoP19igi0zsgwf6ny..', 'Musician 🎸 | Making noise since 1998', FALSE);

INSERT INTO posts (user_id, content) VALUES
(1, 'Just shipped a new feature after debugging for 6 hours straight. The bug was a missing semicolon. #dev #pain'),
(2, 'Redesigned my portfolio this weekend. Glassmorphism is just built different ✨'),
(3, 'Sunrise over the mountains this morning was unreal. Nature always delivers. #photography'),
(4, 'Hot take: tabs vs spaces doesn''t matter as much as consistent formatting. Fight me.'),
(1, 'Does anyone else name their variables after snacks when prototyping? Just me? Ok.'),
(5, 'New song dropping next week. Been working on this one for months 🎶'),
(2, 'Reminder: take breaks, drink water, and stretch. Your future self says thanks.'),
(3, 'Finally organized my camera gear. Why do I own 4 tripods?');

INSERT INTO comments (post_id, user_id, comment) VALUES
(1, 2, 'Classic! Happens to the best of us 😂'),
(1, 4, 'The missing semicolon strikes again'),
(2, 1, 'This looks incredible, love the color palette'),
(3, 5, 'Wow, that lighting is perfect'),
(6, 3, 'Can''t wait to hear it!'),
(6, 4, 'You always deliver bangers');

INSERT INTO likes (post_id, user_id) VALUES
(1, 2), (1, 3), (1, 4), (1, 5),
(2, 1), (2, 3),
(3, 1), (3, 2), (3, 4), (3, 5),
(6, 1), (6, 2), (6, 3);

INSERT INTO followers (follower_id, following_id) VALUES
(2, 1), (3, 1), (4, 1), (5, 1),
(1, 2), (3, 2), (4, 2),
(1, 3), (2, 3),
(1, 4), (2, 4), (3, 4), (5, 4),
(1, 5), (4, 5);

INSERT INTO notifications (receiver_id, sender_id, type, reference_id, is_read) VALUES
(1, 2, 'like', 1, FALSE),
(1, 3, 'like', 1, FALSE),
(1, 4, 'comment', 1, TRUE),
(1, 5, 'follow', NULL, FALSE),
(2, 1, 'follow', NULL, TRUE),
(4, 1, 'follow', NULL, FALSE);
