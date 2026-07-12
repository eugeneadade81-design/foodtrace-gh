# FoodTrace GH — Role 5 Architecture

How the regulator slice fits together and connects to the rest of the system.

## Context

FoodTrace GH traces food batches from farm to consumer. Role 5 is the
**regulator + public-safety** layer. It does not own the core data — Role 1
owns auth and the canonical tables (`farms`, `batches`, `input_logs`,
`recalls`). Role 5 **reads** those for analytics and **owns the recall
workflow** (status changes, evidence, alerts).

## Channels in

```
  Regulator (browser)            Farmer / citizen (feature phone)
        │                                   │
        │ HTTPS + JWT                       │ USSD *714*FOOD#
        ▼                                   ▼
  React dashboard  ──── REST/JSON ───►  Spring Boot analytics-service  ◄── Africa's Talking webhook (POST /api/ussd)
  (Amplify)                              (Elastic Beanstalk)
                                              │
                  ┌───────────────────────────┼───────────────────────────┐
                  ▼                           ▼                           ▼
            RDS PostgreSQL            ElastiCache Redis              AWS S3
            (read model +            (analytics cache,            (recall evidence
             recall writes)           per-endpoint TTL)            files)
                                              
            Outbound: Africa's Talking SMS ──► affected farmer on recall activation
```

## Backend layering (`analytics-service`)

- **domain/** — JPA entities (`Farm`, `Batch`, `InputLog`, `Recall`). All read-only except `Recall`, which Role 5 writes.
- **repository/** — Spring Data repositories; chart aggregations are `@Query` methods returning projected rows.
- **service/** — `AnalyticsService` (`@Cacheable`, maps rows → DTOs), `RecallService` (workflow + two-phase save for the unique recall code + SMS-on-activate).
- **web/** — REST controllers (`AnalyticsController`, `RecallController`, `CacheAdminController`).
- **ussd/** — `UssdController` + `UssdMenuService` state machine over Africa's Talking `*`-joined text.
- **sms/** — `SmsSender` interface; `AfricasTalkingSmsSender` (prod, property-gated) and `LocalSmsSender` (stub).
- **storage/** — `StorageService` interface; `S3StorageService` (prod, property-gated) and `LocalStorageService` (stub).
- **config/** — CORS, Redis cache manager (TTLs, `@Profile("!test")`), S3 / Africa's Talking clients (all `@ConditionalOnProperty`).

### Why the stubs matter
Every external integration (Redis, S3, SMS) is behind an interface with a
local stub selected by `matchIfMissing=true`. So the service — and all 24
tests — run with **zero external dependencies**, while the same code talks to
real AWS/Africa's Talking when the `*_ENABLED` flags are set in the cloud.

## Caching

`AnalyticsService` methods are `@Cacheable` under named caches
(`summary` 60s · `batchesByStatus` 120s · `recallsByMonth` / `farmsByRegion`
300s). Redis is the cache only (not a Spring Data store). `POST
/api/analytics/cache/evict` clears all caches. Tests use a `simple` in-memory
cache via the `test` profile, so Redis is never required to build.

## Recall workflow

```
DRAFT ──activate──► ACTIVE ──resolve──► RESOLVED
   └─────────────── cancel ───────────► CANCELLED
```
- Create → DRAFT, code `RCL-<year>-<id>` (two-phase save because `recall_code` is NOT NULL + UNIQUE and depends on the generated id).
- Edge **into** ACTIVE → resolve batch → farm → `phoneNumber` and send one SMS. Reactivation / other transitions stay silent (guarded), so re-saves never double-text.
- RESOLVED stamps `resolvedAt`.
- Evidence files POST as multipart → `StorageService` → `recalls/<id>/<filename>`.

## Frontend (`regulator-dashboard`)

- `api/client.js` — axios instance, Bearer-JWT request interceptor, 401 → clear token; base URL from `VITE_API_BASE_URL`.
- `auth/AuthContext.jsx` — `useAuth` + `ProtectedRoute`. Dev login mints a local token until Role 1's `/auth/login` is live.
- Pages: `Login`, `Dashboard` (KPI cards + 3 Recharts), `Recalls` (filterable table), `RecallDetail` (status change + evidence upload).

## Deployment topology

| Tier | AWS service | Config |
|------|-------------|--------|
| Frontend | Amplify Hosting | `regulator-dashboard/amplify.yml` |
| Backend | Elastic Beanstalk (Corretto 17, single instance) | `Procfile`, `.ebextensions/env.config` |
| Database | RDS PostgreSQL | `SQL_INIT_MODE=never`; schema/data owned by Role 1 |
| Cache | ElastiCache Redis | `REDIS_HOST` |
| Evidence | S3 | `S3_BUCKET`, `S3_ENABLED=true` |

Security groups: EB instance SG is the source for inbound Postgres (5432) and
Redis (6379). Secrets are set via `eb setenv`, never committed. Full steps in
[../analytics-service/DEPLOY.md](../analytics-service/DEPLOY.md).

## End-to-end demo flow

1. Farmer dials `*714*FOOD#` → verifies a batch / reports unsafe food.
2. Regulator opens the dashboard → sees KPIs and charts (cached analytics).
3. Regulator activates a recall → affected farmer receives an SMS.
4. Regulator uploads lab-report evidence → stored in S3.
5. Dashboard reflects the new recall state on next load.
