# DOrSU eSPORTS 🎮⚡

The official competitive gaming website for **Davao Oriental State University**'s esports organization — featuring **tournament matching**, **team registrations**, and **announcements**. Live on Vercel with a Supabase Postgres database.

## ✨ Features

- **Tournament matching** — one-click single-elimination bracket generation with random draws, auto-byes for odd team counts, winner propagation between rounds, and automatic champion crowning
- **Registrations** — public team sign-up with captain info and roster builder; slot limits, registration deadlines, and duplicate team-name checks are enforced server-side (transactionally)
- **Announcements** — categorized feed (Tournament / General / Community / Patch) with pinned posts
- **Admin panel** — passcode-protected dashboard to create/edit tournaments, generate brackets, advance matches, manage registrations, and publish announcements
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

Run the seed with the **direct connection** string (port `5432`, e.g. `postgresql://postgres.<ref>:<password>@db.<ref>.supabase.co:5432/postgres`) — DDL is more reliable on the direct connection than through the transaction pooler:

```bash
DATABASE_URL="postgresql://postgres.<ref>:<password>@db.<ref>.supabase.co:5432/postgres" npm run seed
```

## ▲ Vercel Deployment

The repo is configured to deploy as one Vercel project: the **static client** (from `dist/`) plus an **Express serverless function** at `/api/*`.

### Option A — Import from GitHub (recommended)

1. Push this repo to GitHub
2. In [vercel.com/new](https://vercel.com/new), click **Import** on the repo
3. Framework preset: **Other** — `vercel.json` already sets the build command and output directory
4. Add environment variables:
   - `DATABASE_URL` — your Supabase transaction pooler URI (above)
   - `ADMIN_PASSCODE` — your admin panel passcode
5. Click **Deploy** — the client and `/api` go live together

### Option B — Vercel CLI

```bash
npm i -g vercel
vercel login
vercel                     # preview
vercel --prod              # production
```

## 🔐 Admin Access

- Visit **/admin** on the deployed site
- The passcode is the `ADMIN_PASSCODE` environment variable (local default: `stallions`)

## 📡 API Overview

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/tournaments` | List tournaments (+ `?status=open`) |
| GET | `/api/tournaments/:id` | Tournament detail incl. bracket |
| POST | `/api/tournaments` | Create tournament *(admin)* |
| PATCH / DELETE | `/api/tournaments/:id` | Update / delete *(admin)* |
| POST | `/api/tournaments/:id/generate-brackets` | 🎲 Matchmaking *(admin)* |
| GET | `/api/tournaments/:id/bracket` | Resolved bracket |
| POST | `/api/tournaments/:id/registrations` | Register a team (public) |
| GET | `/api/tournaments/:id/registrations` | List entrants |
| POST | `/api/matches/:id/winner` | Advance a match *(admin)* |
| GET | `/api/announcements` | Announcements feed |
| POST / PATCH / DELETE | `/api/announcements[/:id]` | Manage announcements *(admin)* |
| GET | `/api/stats` | Site-wide stats |

Admin routes require the header `x-admin-key: <passcode>`.

## 🗂 Project Structure

```
├── api/index.js            # Vercel serverless entry (Express)
├── vercel.json             # Vercel build + rewrites config
├── server/                 # Express API
│   ├── index.js            # Local dev server (listen + auto-seed)
│   ├── app.js              # Express app (shared with Vercel)
│   ├── db.js               # Driver selector (Postgres vs SQLite)
│   ├── drivers/            # postgres.js (Supabase) · sqlite.js (local)
│   ├── seed.js             # Demo data
│   ├── matchmaking.js      # Bracket engine (generate/resolve/advance)
│   ├── middleware.js       # Admin auth + error handling
│   └── routes/             # tournaments, registrations, matches, announcements, stats
└── client/                 # React app (Vite, builds to dist/)
```

## ⚙️ Environment Variables

| Var | Purpose |
| --- | --- |
| `DATABASE_URL` | Supabase Postgres connection string (transaction pooler). Omit for local SQLite |
| `ADMIN_PASSCODE` | Admin panel passcode (default `stallions`) |
| `PORT` | API port for local dev (default `5000`) |
