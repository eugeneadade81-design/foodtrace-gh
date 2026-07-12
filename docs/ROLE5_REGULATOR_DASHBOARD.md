# FoodTrace GH — Regulator Dashboard & Deployment (Role 5)

Food-safety traceability for Ghana. **Role 5** delivers the regulator-facing
slice: an analytics + recall-management backend, a React dashboard, a USSD
channel for farmers/citizens on feature phones, SMS recall alerts, and the AWS
deployment configuration.

> The read-model tables (farms, batches, input logs, recalls) are owned by
> Role 1 in production; this service reads them and owns the recall-management
> write path. See [docs/architecture.md](docs/architecture.md).

## Components

| Path | What it is | Stack |
|------|-----------|-------|
| [`analytics-service/`](analytics-service/) | Backend: analytics, recall management, USSD, SMS | Spring Boot 3.3 · Java 17 · PostgreSQL/H2 · Redis · AWS S3 |
| [`regulator-dashboard/`](regulator-dashboard/) | Web dashboard: KPIs, charts, recall workflow | React 19 · Vite · React Router · Recharts · axios |
| [`tools/`](tools/) | Bundled Maven, ngrok (Java/Maven not installed globally) | — |

## Key features

- **Analytics API** — summary KPIs + batches-by-status, recalls-by-month, farms-by-region aggregations, Redis-cached with per-endpoint TTLs.
- **Recall management** — list/filter, create (auto `RCL-<year>-<id>` code), status workflow (DRAFT→ACTIVE→RESOLVED/CANCELLED), evidence upload to S3.
- **USSD `*714*FOOD#`** — feature-phone menu: (1) verify a batch by code, (2) report unsafe food, (3) list active recalls. Africa's Talking webhook at `POST /api/ussd`.
- **SMS alerts** — activating a recall texts the affected farmer (Africa's Talking).
- **Dashboard** — JWT-aware client, protected routes, live charts and recall workflow UI.

## Endpoints (backend, port 8081)

```
GET  /api/health
GET  /api/analytics/summary | batches-by-status | recalls-by-month | farms-by-region
POST /api/analytics/cache/evict
GET  /api/recalls            (?status=&region=)
GET  /api/recalls/{id}
POST /api/recalls
PATCH /api/recalls/{id}/status
POST /api/recalls/{id}/evidence      (multipart "file")
POST /api/ussd                       (Africa's Talking form-urlencoded)
```

## Run locally

**Backend** (H2 in-memory, no external services needed — Redis/S3/SMS default to in-process stubs):
```bash
cd analytics-service
../tools/apache-maven-3.9.9/bin/mvn.cmd spring-boot:run     # → http://localhost:8081
../tools/apache-maven-3.9.9/bin/mvn.cmd test                # 24 tests
```

**Frontend:**
```bash
cd regulator-dashboard
npm install
cp .env.example .env        # VITE_API_BASE_URL defaults to http://localhost:8081
npm run dev                 # → http://localhost:5173
```

## Seed data (loaded on local H2 boot)

10 farms · 30 batches (all 6 statuses; 4 recalled) · 5 recalls (2 ACTIVE) · 16 input logs (4 unapproved). Summary KPIs: 30 / 10 / 5 / 2 active / 4 compliance flags.

## Environment variables

| Var | Default | Purpose |
|-----|---------|---------|
| `DB_URL` / `DB_USERNAME` / `DB_PASSWORD` / `DB_DRIVER` | H2 in-memory | Datasource (set to RDS Postgres on AWS) |
| `SQL_INIT_MODE` | `always` | `never` on RDS (Role 1 owns the tables) |
| `REDIS_HOST` / `REDIS_PORT` | localhost:6379 | Cache (in-process simple cache if absent) |
| `S3_ENABLED` / `S3_BUCKET` / `AWS_REGION` | false | Evidence storage (local stub if off) |
| `SMS_ENABLED` / `AT_USERNAME` / `AT_API_KEY` / `AT_SENDER_ID` | false | Africa's Talking SMS (local stub if off) |
| `CORS_ALLOWED_ORIGINS` | localhost:5173,3000 | Allowed dashboard origins |
| `VITE_API_BASE_URL` (frontend) | http://localhost:8081 | Backend URL, inlined at build |

## Deployment (AWS)

- Backend → Elastic Beanstalk + RDS PostgreSQL + ElastiCache Redis — runbook in [analytics-service/DEPLOY.md](analytics-service/DEPLOY.md).
- Frontend → AWS Amplify — build spec in [regulator-dashboard/amplify.yml](regulator-dashboard/amplify.yml).

## Tests

Backend: 24 JUnit/MockMvc tests (seed integrity, analytics KPIs, cache hit/evict, recall API, USSD flow, SMS alerts) — run without Redis/S3/AT.
Frontend: `npm run build` (production bundle).
