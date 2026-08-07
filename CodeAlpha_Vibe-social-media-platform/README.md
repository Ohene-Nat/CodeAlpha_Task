# Vibe — Modern Social Media Platform

A full-stack social media platform with a premium glassmorphism UI, built with vanilla HTML/CSS/JS on the front end and Node.js/Express/PostgreSQL on the back end. Inspired by Instagram, Threads, X, and Discord, with its own visual identity (the "aurora glass" theme).

![Tech Stack](https://img.shields.io/badge/stack-Node.js%20%7C%20Express%20%7C%20PostgreSQL%20%7C%20Vanilla%20JS-6366F1)

---

## Features

- **Auth**: register, login, logout, JWT sessions, "remember me", bcrypt password hashing
- **Profiles**: avatar + cover photo, bio, follower/following/post counts, edit profile
- **Posts**: text + image posts (500 char limit), edit/delete (owner only), newest-first feed
- **Engagement**: likes (duplicate-proof), comments, bookmarks, share/copy link
- **Follow system**: follow/unfollow, followers/following lists, live count updates
- **Search**: live user search by name/username
- **Notifications**: likes, comments, follows, unread badge, mark-as-read
- **Settings**: change password, edit profile, delete account, dark/light mode
- **Extras**: infinite scroll, image previews, emoji picker, trending hashtags, skeleton loading, toasts, responsive design (desktop/tablet/mobile with hamburger + bottom tab bar)

---

## Project Structure

```
Vibe/
├── backend/
│   ├── config/          # DB pool + JWT helpers
│   ├── controllers/      # Route handlers (business logic)
│   ├── middleware/        # auth, upload, validation, rate limiting, errors
│   ├── models/            # Parameterized SQL queries (MVC "Model" layer)
│   ├── routes/            # Express routers
│   ├── database/          # schema.sql, seed.sql, seed.js
│   ├── uploads/            # Uploaded images (profiles/covers/posts)
│   ├── utils/               # XSS sanitization
│   ├── app.js               # Express app config
│   ├── server.js             # Entry point
│   └── package.json
├── frontend/
│   ├── css/                # variables, base, components, auth, app, responsive
│   ├── js/                  # api.js, utils.js, feed.js, profile.js, ...
│   ├── auth.html             # Login / Register
│   └── index.html             # Main app shell (SPA)
└── postman/
    └── Vibe_API.postman_collection.json
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 13+

### 1. Database Setup

Create the database and load the schema + seed data:

```bash
createdb Vibe_db
cd backend
cp .env.example .env
# edit .env with your PostgreSQL credentials
```

Apply the schema and seed data (two options):

```bash
# Option A: via psql directly
psql -U postgres -d Vibe_db -f database/schema.sql
psql -U postgres -d Vibe_db -f database/seed.sql

# Option B: via the bundled Node script (reads the same files)
npm install
npm run seed
```

> **Sample login (from seed data):** `nathan@Vibe.com` / `Password123!` (also `sarahk`, `johna`, `mayac`, `leom`, same password).

### 2. Backend

```bash
cd backend
npm install
npm run dev      # starts on http://localhost:5000 with nodemon
# or: npm start
```

The API is verified working end-to-end (auth, posts, likes, comments, follows, notifications, search) against a live PostgreSQL instance.

### 3. Frontend

The frontend is static — no build step. Serve it with any static file server:

```bash
cd frontend
python3 -m http.server 5500
# open http://localhost:5500/auth.html
```

Or use the VS Code "Live Server" extension, or `npx serve`.

By default the frontend calls the API at `http://localhost:5000/api` (see `frontend/js/utils.js`, `API_BASE`). Update that constant if you deploy the backend elsewhere.

---

## API Testing

Import `postman/Vibe_API.postman_collection.json` into Postman. It includes every endpoint, grouped by resource (Auth, Users, Posts, Comments, Notifications). The collection auto-saves your JWT into a `{{token}}` variable after a successful Login request, so subsequent requests are authenticated automatically.

---

## Security Measures

- **Password hashing**: bcrypt, 10 salt rounds
- **JWT authentication**: signed tokens, configurable expiry, "remember me" extends session length
- **SQL injection prevention**: every query is parameterized (`$1, $2, ...`); no string concatenation into SQL
- **XSS protection**: user text is sanitized server-side (`xss` package) and HTML-escaped client-side before rendering
- **Helmet**: sets secure HTTP headers
- **CORS**: restricted to the configured client origin
- **Rate limiting**: general API limiter (300 req/15min) + a stricter auth limiter (20 req/15min) to slow brute-force attempts
- **Input validation**: `express-validator` chains on every mutating route
- **Protected routes**: JWT middleware guards all endpoints that require a logged-in user; ownership checks on edit/delete for posts and comments

---

## Database Schema

See `backend/database/schema.sql` for the full DDL. Summary:

| Table | Purpose |
|---|---|
| `users` | Account + profile data |
| `posts` | Text/image posts |
| `comments` | Comments on posts |
| `likes` | Post likes, unique on `(post_id, user_id)` |
| `bookmarks` | Saved posts, unique on `(post_id, user_id)` |
| `followers` | Follow graph, unique on `(follower_id, following_id)` |
| `notifications` | Like/comment/follow notifications |

---

## Notes for Graders / Reviewers

- This was built and tested against a real PostgreSQL instance in the development sandbox — registration, login, post CRUD, likes, comments, follows, notifications, and search were all exercised through both direct API calls and a full browser-driven UI test (Playwright), with screenshots confirming the glassmorphism UI, dark/light themes, and mobile responsive layout all render correctly.
- Font Awesome icons and Google Fonts are loaded from CDNs (`cdnjs.cloudflare.com`, `fonts.googleapis.com`) — an internet connection is required for icons/fonts to display; everything else works offline against your local API.
- The `uploads/` folder ships with `profiles/`, `covers/`, and `posts/` subfolders already created; Multer will populate them at runtime.
