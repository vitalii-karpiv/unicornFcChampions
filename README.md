# 🦄 Unicorn FC Champions

Track our 1v1 EA FC matches: Elo ratings, monthly awards, head-to-heads, records and trash talk.

See [`docs/spec.md`](docs/spec.md) for the full product spec and [`docs/plan.md`](docs/plan.md) for the implementation plan.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind v4 + shadcn/ui · Drizzle ORM + Postgres (`pg`) · hand-rolled JWT auth (`jose` + argon2) · Recharts · Vitest

## Local development

1. Install deps: `npm install`
2. Create `.env.local` from `.env.example`:
   - `DATABASE_URL` — a Neon dev branch, or local Postgres, e.g.
     `docker run -d --name ufc-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=ufc -p 54329:5432 postgres:17-alpine`
     → `postgres://postgres:postgres@localhost:54329/ufc`
   - `AUTH_SECRET` — `openssl rand -base64 32`
3. Apply migrations: `npm run db:migrate`
4. (Optional) Seed fake data — **wipes the database**: `npm run db:seed` (users `vitalii`, `max`, `andrii`, `oleh`; password in `scripts/seed.ts`)
5. `npm run dev` → http://localhost:3000

## Deploying to Vercel

1. Push the repo to GitHub and import it in Vercel.
2. In the Vercel project → **Storage** → add **Neon Postgres** (Marketplace). It sets `DATABASE_URL` for you.
3. Add `AUTH_SECRET` in **Settings → Environment Variables**.
4. Run migrations against the production database once (and after every schema change):
   `DATABASE_URL=<prod url> npx drizzle-kit migrate`
5. Deploy. Everyone signs up at `/signup`.

## Scripts

| Command | What it does |
|---------|--------------|
| `npm run dev` | Dev server |
| `npm test` | Unit tests (Elo, awards, records, time zones, validation, auth helpers) |
| `npm run lint` / `npm run build` | Lint / production build |
| `npm run db:generate` | Generate a migration after editing `src/lib/db/schema.ts` |
| `npm run db:migrate` | Apply migrations (uses `.env.local`) |
| `npm run db:seed` | Wipe and seed fake data (refuses in production) |
| `npm run reset-password <username>` | Set a random password, sign the user out everywhere, print it |

## How things work

- **Elo:** start 1000, K = 40 for a player's first 10 games then 32, goal-difference multiplier (World Football Elo). Any create/edit/delete replays the whole history and stores Elo before/after on every match.
- **Months** use Europe/Kyiv time. A month locks the moment it ends: its matches can't be added, edited or deleted.
- **Awards** are live during the month and frozen into the Hall of Fame on the first page view after it ends.
- **Sessions:** a 30-day JWT in an httpOnly cookie; `users.token_version` revokes sessions (log out everywhere, password change/reset).
