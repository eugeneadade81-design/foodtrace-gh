# Scripts

This folder holds migration runners, seed scripts, and utility tasks for the full app.

## Database commands

Set `DATABASE_URL` first, then run:

- `npm run db:migrate`
- `npm run db:seed`

The migration runner applies SQL files in `scripts/migrations/` in filename order and records completed files in `schema_migrations`.
