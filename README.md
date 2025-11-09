# ProDuh – Local Development

This repo now defaults to a **local Postgres** instance instead of Neon. The server auto-creates tables on boot, so you only need to run the database once and you can iterate entirely offline.

## Prereqs

- Docker (or any local Postgres 15+ install)
- Node 20+

## Start Postgres locally

```bash
# from the repo root
docker compose up -d db

# optional: inspect the database
docker compose exec db psql -U produh -d produh
```

The connection string baked into `server/.env` is:

```
postgresql://produh:produh@localhost:5432/produh
```

It matches the credentials defined in `docker-compose.yml`. If you already have Postgres running on 5432, either stop it or change the port/user/password in both files.

## Run the stack

```bash
# server (auto-runs schema migrations via ensureSchema)
cd server
npm install
npm run dev

# client
cd client
npm install
npm run dev
```

With `MOCK_MODE=false` the API writes directly to the local Postgres database. If you still want the Discovery flow to use canned Teams data (recommended while the Graph creds are TBD), leave `MOCK_DISCOVERY=true` in `server/.env`; flip it to `false` once you’re ready for live Teams messages.

## Switching back to Neon (optional)

If you want to reconnect to Neon later, simply replace `DATABASE_URL` inside `server/.env` with the Neon connection string (including `sslmode=require`) and restart `npm run dev`. No code changes are required—`ensureSchema()` will run against whichever Postgres URL you provide.
