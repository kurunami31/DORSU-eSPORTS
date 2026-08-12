# DOrSU eSPORTS 🎮⚡

The official competitive gaming website for **Davao Oriental State University**'s esports organization — featuring **tournament matching**, **team registrations**, and **announcements**. Live on Vercel with a Supabase Postgres database.

## ✨ Features

- **Tournament matching** — one-click single-elimination bracket generation with random draws, auto-byes for odd team counts, winner propagation between rounds, and automatic champion crowning
- **Registrations** — enter as a **solo player** (in-game tag, individual entry) or as a **full team** with captain info, roster builder, and an optional **team logo / group photo** for identification; slot limits, registration deadlines, and duplicate name checks are enforced server-side (transactionally)
- **Game hubs** — per-game pages at **/games/:slug** with themed hero art, live stats (open/live/finished/entrants), a hall of champions, and that game's tournaments; **/games** indexes every title on the roster
- **Leaderboard** — all-time team standings at **/leaderboard** built from real bracket results: match wins, championship titles, win rate, and events played — filterable by game, with a podium for the top three
- **Announcements** — categorized feed (Tournament / General / Community / Patch) with pinned posts
- **Player accounts** — sign up / sign in at **/login**; scrypt-hashed passwords, 30-day bearer sessions, and one-tap prefilled team registration
- **AI assistant** — a floating **DOrSU eSPORTS Assist** chat widget (bottom-right) answers visitors about open tournaments, registration, and the org — powered by **Groq** (Llama 3.3 70B), grounded in live site data, rate-limited, and safe for the public (no staff/internal details)
- **Admin panel** — super-admin-protected dashboard (username + password) to create/edit tournaments, generate brackets, advance matches, manage registrations, publish announcements, manage player accounts, assign moderator roles, and toggle maintenance
- **Live bracket UI** — SVG-connected round columns, winner highlighting, and click-to-advance in admin mode
- Dark esports theme with DOrSU blue/yellow and a woven **Dagmay** textile motif

## 🛠 Tech Stack

| Layer | Tech |
| --- | --- |
| Frontend | React 18 + Vite 6 + React Router |
| API | Node.js + Express |
| Database | **Supabase Postgres** (production) · built-in SQLite (local dev fallback) |
| Hosting | Vercel (static client + serverless API) |

## 🚀 Local Development

**Requirements:** Node.js 22.5+ (24 recommended)

```bash
# 1. Install everything (root + server + client)
npm run install:all

# 2. Run the dev servers (API on :5000, site on :5173)
npm run dev
```

Open **http://localhost:5173** — with no `DATABASE_URL` set, the app uses a local SQLite file (`server/data/dorsu.db`) and auto-seeds demo data on first boot.

To run locally against Supabase instead, create a **`.env`** file in the repo root (it's gitignored) with your pooler URI:

```bash
DATABASE_URL="postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true"
```

The server auto-loads the root `.env` (via `dotenv`) on every entrypoint (`npm run dev`, `npm run seed`, and the Vercel function).

## 🗄 Database: Supabase (production)

The app picks its database automatically from the environment:

- **`DATABASE_URL` set** → connects to Supabase Postgres
- **`DATABASE_URL` unset** → local SQLite file (great for demos/offline)

Both paths share one async driver interface and produce identical API responses.

### 1. Create a Supabase project

1. Create a project at [supabase.com](https://supabase.com) (free tier is fine)
2. Go to **Project Settings → Database → Connection string**
3. Enable **Connection pooling** and copy the **transaction mode** URI (port `6543`, e.g. `postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true`)
4. Set it as `DATABASE_URL`

### 2. Create the schema + seed data (once)

The schema auto-migrates on boot (`CREATE TABLE IF NOT EXISTS`), so seeding is the only manual step. The seed works fine through the **transaction pooler** URI:

```bash
DATABASE_URL="postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true" npm run seed
```

This drops and recreates all tables, then loads 5 tournaments, 38 teams, live brackets, and 5 announcements. Re-run it anytime to reset to pristine demo data.

## ▲ Vercel Deployment

The repo is configured to deploy as one Vercel project: the **static client** (from `dist/`) plus an **Express serverless function** at `/api/*`.

### Option A — Import from GitHub (recommended)

1. Push this repo to GitHub
2. In [vercel.com/new](https://vercel.com/new), click **Import** on the repo
3. Framework preset: **Other** — `vercel.json` already sets the build command and output directory
4. Add environment variables:
   - `DATABASE_URL` — your Supabase transaction pooler URI (above)
   - `GROQ_API_KEY` — your Groq API key (`gsk_…`) to enable the AI assistant
5. Click **Deploy** — the client and `/api` go live together

### Option B — Vercel CLI

```bash
npm i -g vercel
vercel login
vercel                     # preview
vercel --prod              # production
```

## 🛡 Security hardening

- **Security headers** — CSP (scripts/styles/fonts locked down, framing denied), `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, HSTS, strict `Referrer-Policy`, and a `Permissions-Policy` that blocks camera/mic/geolocation — set by `helmet` on the API and by `vercel.json` headers on the static site
- **Rate limiting** — 500 req/15 min per IP globally, 10 registrations/15 min per IP, 30 auth attempts/15 min (covers admin login), 120 state-changing ops/15 min (rate limits are per-serverless-instance — soft limits, acceptable for this scale)
- **Admin auth** — the admin panel is protected by **staff accounts** with a role hierarchy: `player` < `moderator` < `admin` (super admin). Staff log in with username + password (scrypt-hashed). Moderators can moderate teams + publish announcements and see site stats; super admins additionally manage tournaments, player accounts, roles, and system controls. Player accounts can never reach a staff role on their own — only a super admin can assign one
- **Player auth** — scrypt password hashing (N=16384, per-user salt, constant-time verify); opaque 256-bit session tokens of which only the SHA-256 hash is stored in the DB (a leak never exposes live sessions); tokens expire after 30 days and are destroyed on logout; login timing is equalized so responses never reveal whether an email is registered
- **Input validation** — length caps on every field, email format, roster caps, integer/date/status/format whitelists, registration deadline ≤ start date; request bodies capped at 100 KB
- **Privacy** — public registration lists expose only team name, captain name, and date; emails, contacts, and rosters are returned only to authenticated admins
- **SQL injection** — all queries use prepared statements; user content is escaped by React on render (no `dangerouslySetInnerHTML`)
- **Supabase RLS lockdown** — row-level security is enabled and the `anon` / `authenticated` / `service_role` roles are revoked from all tables, sequences, and functions, sealing the PostgREST API. The app connects as the project owner, which bypasses RLS, so nothing breaks — but even a leaked API key cannot read or write data over HTTP
- **Error handling** — internal error details (SQL, stack traces) are logged server-side only; clients always receive generic messages

### 🔑 Secrets checklist

- `DATABASE_URL` lives only in env vars (Vercel) or the gitignored `.env` — never commit it
- The Supabase **service_role** key is not used by the app at all (we connect via Postgres directly). If it was ever shared, regenerate it in **Project Settings → API**
- If the database password was shared, reset it in **Project Settings → Database → Reset database password** and update `DATABASE_URL`

## 🔐 Staff Access (Roles)

- Visit **/admin** on the deployed site (there is no public link to it; signed-in staff also see a **Panel** link in the navbar)
- Sign in with a **staff account**: username + password (super admins and moderators both use this form)
- **Super admin** (seed): username `esportadmin` · password `dorsuesports2026`
- **Moderators** are promoted by the super admin from existing player accounts — **Players tab → Role** dropdown offers only **Player / Moderator** (you can also set their sign-in username there). The **Super Admin role is reserved for the built-in `esportadmin` account** and can never be granted to another account — not from the panel and not via the API. Their access:
  - ✅ Site overview stats, publish/edit/delete announcements, review team lists + remove rule-breaking registrations, full team-list detail view
  - ❌ No tournament create/edit/delete, no bracket generation, no account management, no role changes, no maintenance toggle
- The super admin account is created by the seed script (`server/seed.js` — see `SUPER_ADMIN`) with the password stored as a scrypt hash. To change it, update `SUPER_ADMIN` in `seed.js` and re-run `npm run seed`

## 📡 API Overview

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/tournaments` | List tournaments (+ `?status=open`) |
| GET | `/api/tournaments/:id` | Tournament detail incl. bracket |
| POST | `/api/tournaments` | Create tournament *(admin)* |
| PATCH / DELETE | `/api/tournaments/:id` | Update / delete *(admin)* |
| POST | `/api/tournaments/:id/generate-brackets` | 🎲 Matchmaking *(admin)* |
| GET | `/api/tournaments/:id/bracket` | Resolved bracket |
| POST | `/api/auth/signup` | Create account → returns session token |
| POST | `/api/auth/login` | Sign in → returns session token |
| POST | `/api/auth/admin-login` | Staff sign-in (username + password — super admin or moderator) |
| GET | `/api/auth/me` | Current signed-in user |
| POST | `/api/auth/logout` | Invalidate the current session |
| POST | `/api/tournaments/:id/registrations` | Register a team (public) |
| GET | `/api/tournaments/:id/registrations` | List entrants |
| POST | `/api/matches/:id/winner` | Advance a match *(admin)* |
| GET | `/api/announcements` | Announcements feed |
| POST / PATCH / DELETE | `/api/announcements[/:id]` | Manage announcements *(admin)* |
| GET | `/api/stats` | Site-wide stats |
| GET | `/api/maintenance` | Maintenance flag + message (env var or panel setting) |
| POST | `/api/chat` | AI assistant reply (Groq, requires `GROQ_API_KEY`) |
| GET | `/api/health` | Liveness probe (+ current `maintenance` flag) |
| GET | `/api/admin/stats` | Rich dashboard stats (game/status breakdowns, recent sign-ups, deadlines) *(staff)* |
| GET | `/api/admin/users` | List player accounts (+ `?q=` search) *(admin)* |
| PATCH | `/api/admin/users/:id/role` | Set a role: `player` / `moderator` (+ optional `username` for moderators). The `admin` role is reserved for the super admin account *(admin)* |
| DELETE | `/api/admin/users/:id` | Delete a player account (staff accounts protected) *(admin)* |
| PUT | `/api/admin/maintenance` | Toggle maintenance mode + set message live from the panel *(admin)* |

Staff routes require `Authorization: Bearer <staff-session-token>` (obtained via `POST /api/auth/admin-login`).

## 🚧 Maintenance mode

Flip the site to a full-screen **"Under Maintenance"** page while you roll out updates:

1. Set `MAINTENANCE_MODE=1` in the environment (Vercel project settings, or your local `.env`) — `MAINTENANCE_MESSAGE` optionally customizes the copy shown
2. Redeploy / restart the API
3. Visitors see the branded maintenance page; the page **auto-recovers** (polls every 60s and on tab focus) the moment `MAINTENANCE_MODE` is removed
4. Staff (super admin + moderator) can still access the site so the panel stays usable to turn maintenance off

## 🗂 Project Structure

```
├── api/index.js            # Vercel serverless entry (Express)
├── vercel.json             # Vercel build + rewrites config
├── server/                 # Express API
│   ├── index.js            # Local dev server (listen + auto-seed)
│   ├── app.js              # Express app (shared with Vercel)
│   ├── db.js               # Driver selector (Postgres vs SQLite)
│   ├── auth.js             # Password hashing + session tokens
│   ├── drivers/            # postgres.js (Supabase) · sqlite.js (local)
│   ├── seed.js             # Demo data
│   ├── matchmaking.js      # Bracket engine (generate/resolve/advance)
│   ├── middleware.js       # Admin auth + error handling
│   └── routes/             # tournaments, registrations, matches, announcements, stats, auth
└── client/                 # React app (Vite, builds to dist/)
```

## ⚙️ Environment Variables

| Var | Purpose |
| --- | --- |
| `DATABASE_URL` | Supabase Postgres connection string (transaction pooler). Omit for local SQLite |
| `PORT` | API port for local dev (default `5000`) |
| `MAINTENANCE_MODE` | Set to `1`/`true`/`on` to show the "Under Maintenance" page site-wide (default off) |
| `MAINTENANCE_MESSAGE` | Optional custom message shown on the maintenance page |
| `GROQ_API_KEY` | Groq API key for the AI assistant (`gsk_…`). Omit to leave the chat widget showing "not connected" |
| `GROQ_MODEL` | Optional Groq model override (default `llama-3.3-70b-versatile`) |

> **Super admin credentials** are constants in `server/seed.js` (`SUPER_ADMIN.username` / `SUPER_ADMIN.password`) — they are *not* environment variables. Change them there and re-run `npm run seed`.
