# FoodTrace GH — Role 5: Regulator Dashboard & Deployment

**Owner:** Role 5 (Analytics, Regulator Dashboard, USSD, AWS Deployment)
**Stack:** Spring Boot · React.js · PostgreSQL · Redis · Africa's Talking · AWS S3 · AWS (RDS, Elastic Beanstalk, Amplify) · Recharts

This plan breaks Role 5 into ~13 daily chunks. Each day ends with one meaningful commit.
Early days use **mock/seed data** so you are never blocked waiting on Role 1 (Auth + DB schema).

---

## Index
- Day 1 — Analytics microservice scaffold
- Day 2 — Read-model entities + seed/mock data
- Day 3 — Analytics REST endpoints
- Day 4 — Redis caching layer
- Day 5 — Recall management backend + S3 evidence upload
- Day 6 — USSD service (*714*FOOD#) via Africa's Talking
- Day 7 — SMS recall alerts (Africa's Talking)
- Day 8 — React dashboard scaffold + JWT API client
- Day 9 — Analytics charts (Recharts)
- Day 10 — Recall management UI
- Day 11 — Deploy PostgreSQL to AWS RDS + backend to Elastic Beanstalk
- Day 12 — Deploy React frontend to AWS Amplify
- Day 13 — Polish, README, demo data, final integration

---

## Day 1 — Analytics microservice scaffold (2–3 hrs)

**Build:** A runnable Spring Boot service that starts and answers a health check. This is the skeleton everything else hangs off.

**Files to create:**
- `analytics-service/pom.xml` — dependencies: `spring-boot-starter-web`, `spring-boot-starter-data-jpa`, `spring-boot-starter-data-redis`, `postgresql`, `lombok`, `spring-boot-starter-validation`
- `analytics-service/src/main/java/gh/foodtrace/analytics/AnalyticsApplication.java` — `@SpringBootApplication` main class
- `analytics-service/src/main/resources/application.yml` — server port 8081, datasource + redis config via env vars
- `analytics-service/src/main/java/gh/foodtrace/analytics/web/HealthController.java` — `GET /api/health` returns `{"status":"UP"}`
- `.gitignore` (target/, node_modules/, .env)

**Setup note:** Install JDK 17 and Maven first (Java isn't on this machine yet).

**Commit:** `chore(analytics): scaffold Spring Boot analytics microservice with health endpoint`

---

## Day 2 — Read-model entities + seed/mock data (2–3 hrs)

**Build:** JPA read-only entities mirroring Role 1's tables, plus a seeder so the service has realistic data without waiting on teammates.

**Files to create:**
- `.../domain/Batch.java`, `Farm.java`, `Recall.java`, `InputLog.java` — `@Entity` read models mapped to existing tables
- `.../repo/BatchRepository.java`, `FarmRepository.java`, `RecallRepository.java`, `InputLogRepository.java` — Spring Data JPA repos
- `analytics-service/src/main/resources/data.sql` — seed ~30 batches, 10 farms, 5 recalls across regions/statuses
- `application.yml` — set `spring.jpa.hibernate.ddl-auto=none`, `spring.sql.init.mode=always`

**Commit:** `feat(analytics): add read-model entities, repositories, and seed data`

---

## Day 3 — Analytics REST endpoints (2–3 hrs)

**Build:** The numbers the dashboard will chart. Service computes aggregates; controller exposes them as JSON DTOs.

**Files to create:**
- `.../dto/SummaryDto.java`, `BatchesByStatusDto.java`, `RecallsByMonthDto.java`, `FarmsByRegionDto.java`
- `.../service/AnalyticsService.java` — methods: `getSummary()`, `batchesByStatus()`, `recallsByMonth()`, `farmsByRegion()`
- `.../web/AnalyticsController.java` — `GET /api/analytics/summary`, `/batches-by-status`, `/recalls-by-month`, `/farms-by-region`
- `.../config/CorsConfig.java` — allow the React origin

**Commit:** `feat(analytics): add analytics aggregation endpoints for dashboard`

---

## Day 4 — Redis caching layer (2–3 hrs)

**Build:** Cache the analytics aggregates so the dashboard loads fast and doesn't hammer Postgres on every page view.

**Files to create/modify:**
- `.../config/RedisConfig.java` — `RedisCacheManager` with JSON serialization, per-cache TTLs (e.g. summary 60s, monthly 300s)
- `AnalyticsService.java` — add `@Cacheable("summary")`, `@Cacheable("recallsByMonth")` etc.
- `AnalyticsApplication.java` — add `@EnableCaching`
- `.../web/CacheAdminController.java` — `POST /api/analytics/cache/evict` to clear caches (handy for demo)
- `application.yml` — redis host/port via env vars

**Verify:** Hit an endpoint twice, confirm the 2nd is served from cache (log or `redis-cli KEYS *`).

**Commit:** `feat(analytics): add Redis caching for dashboard aggregates with TTL and eviction`

---

## Day 5 — Recall management backend + S3 evidence upload (2–3 hrs)

**Build:** Endpoints a regulator uses to view, create, and update recalls — plus uploading recall evidence (lab reports, photos) to AWS S3.

**Files to create:**
- `.../dto/RecallDto.java`, `RecallUpdateRequest.java`, `CreateRecallRequest.java`
- `.../service/RecallService.java` — list (with status/region filters), getById, create, updateStatus
- `.../web/RecallController.java` — `GET /api/recalls`, `GET /api/recalls/{id}`, `POST /api/recalls`, `PATCH /api/recalls/{id}/status`
- `.../service/S3StorageService.java` — upload to S3, return object URL
- `.../web/RecallController.java` — `POST /api/recalls/{id}/evidence` (multipart → S3)
- `pom.xml` — add `software.amazon.awssdk:s3`

**Commit:** `feat(recalls): add recall management API with S3 evidence upload`

---

## Day 6 — USSD service (*714*FOOD#) via Africa's Talking (2–3 hrs)

**Build:** The USSD menu farmers/consumers dial to check a batch or report a problem — no smartphone needed.

**Files to create:**
- `.../ussd/UssdController.java` — `POST /api/ussd` consuming Africa's Talking params (`sessionId`, `phoneNumber`, `text`)
- `.../ussd/UssdMenuService.java` — state machine driven by `text`:
  - `` → main menu: 1. Verify a batch  2. Report unsafe food  3. Recall status
  - `1` → prompt for batch code → return product + status
  - `2` → capture report → store + ack
  - `3` → list active recalls (short)
- `.../ussd/UssdResponse.java` — helper for `CON ` / `END ` prefixes

**Verify:** Use the Africa's Talking USSD simulator pointed at your endpoint (via ngrok locally).

**Commit:** `feat(ussd): add Africa's Talking USSD menu flow for batch verification and reporting`

---

## Day 7 — SMS recall alerts via Africa's Talking (2–3 hrs)

**Build:** When a regulator activates a recall, affected farmers get an SMS automatically.

**Files to create:**
- `.../sms/SmsService.java` — wrap Africa's Talking SMS API (`username`, `apiKey` via env)
- `RecallService.java` — on `updateStatus(...ACTIVE)`, look up affected farm phone numbers and send SMS
- `.../config/AfricasTalkingConfig.java` — credentials bean
- `pom.xml` — add Africa's Talking Java SDK (or use `RestTemplate`)

**Commit:** `feat(sms): send Africa's Talking SMS alerts to affected farmers on recall activation`

---

## Day 8 — React dashboard scaffold + JWT API client (2–3 hrs)

**Build:** The regulator web app shell — routing, login-protected layout, and an API client that attaches the JWT from Role 1's auth.

**Files to create:**
- `regulator-dashboard/` — Vite + React app (`npm create vite@latest`)
- `src/api/client.js` — axios instance, request interceptor adds `Authorization: Bearer <token>`
- `src/auth/AuthContext.jsx` — store/read JWT (localStorage), `ProtectedRoute`
- `src/App.jsx` — routes: `/login`, `/dashboard`, `/recalls`
- `src/components/Layout.jsx` — sidebar nav + header (FDA/GSA branding)
- `.env` — `VITE_API_BASE_URL`

**Commit:** `feat(dashboard): scaffold React regulator dashboard with JWT-aware API client and routing`

---

## Day 9 — Analytics charts with Recharts (2–3 hrs)

**Build:** The actual dashboard — KPI cards and charts wired to Day 3's endpoints.

**Files to create:**
- `src/pages/Dashboard.jsx` — fetches summary + chart data
- `src/components/KpiCard.jsx` — total batches, active recalls, farms, reports
- `src/components/charts/BatchesByStatusBar.jsx` — Recharts `BarChart`
- `src/components/charts/RecallsByMonthLine.jsx` — Recharts `LineChart`
- `src/components/charts/FarmsByRegionPie.jsx` — Recharts `PieChart`
- `src/api/analytics.js` — endpoint wrappers

**Commit:** `feat(dashboard): add Recharts analytics visualizations wired to analytics API`

---

## Day 10 — Recall management UI (2–3 hrs)

**Build:** The screen regulators use to work recalls — list, filter, view detail, change status, upload evidence.

**Files to create:**
- `src/pages/Recalls.jsx` — table with status/region filters
- `src/pages/RecallDetail.jsx` — detail view + status-change dropdown + SMS-on-activate note
- `src/components/RecallStatusBadge.jsx`
- `src/components/EvidenceUpload.jsx` — multipart upload to `/api/recalls/{id}/evidence`
- `src/api/recalls.js` — list/get/create/updateStatus/uploadEvidence wrappers

**Commit:** `feat(dashboard): add recall management UI with filtering, status updates, and evidence upload`

---

## Day 11 — Deploy DB to RDS + backend to Elastic Beanstalk (2–3 hrs)

**Build:** Get the backend live on AWS against a managed Postgres.

**Steps / files:**
- Create **RDS PostgreSQL** instance; load Role 1 schema + seed data
- Create **ElastiCache Redis** (or note a managed Redis) and capture endpoint
- `analytics-service/.ebextensions/env.config` — env vars (DB URL, Redis, AT keys, S3 bucket, JWT secret)
- `Procfile` / build the JAR; create **Elastic Beanstalk** Java environment and deploy
- Set RDS/EB security groups so EB can reach RDS

**Commit:** `chore(deploy): deploy analytics backend to Elastic Beanstalk against AWS RDS PostgreSQL`

---

## Day 12 — Deploy React frontend to AWS Amplify (2–3 hrs)

**Build:** Put the dashboard online and point it at the live backend.

**Steps / files:**
- `regulator-dashboard/amplify.yml` — build spec (`npm ci && npm run build`, artifact `dist`)
- Connect the GitHub repo to **AWS Amplify**, set `VITE_API_BASE_URL` to the EB URL
- Update backend CORS to allow the Amplify domain
- Verify dashboard loads live charts + recalls end-to-end

**Commit:** `chore(deploy): deploy React regulator dashboard to AWS Amplify`

---

## Day 13 — Polish, README, demo data, final integration (2–3 hrs)

**Build:** Make it presentable and reproducible for the judge/lecturer.

**Files to create/modify:**
- `README.md` — architecture diagram, live URLs, USSD code `*714*FOOD#`, run instructions, env var list
- `docs/architecture.md` — how the pieces connect
- Final realistic demo seed data; loading/empty/error states in the UI
- Smoke-test the full flow: dial USSD → activate recall → SMS sent → dashboard updates

**Commit:** `docs(role5): add README, architecture docs, and polished demo data for final submission`

---

# What Role 5 Does — Explained in Plain English

Imagine Ghana's food safety regulators (the FDA and GSA) sitting in their office. Today, if a
batch of tomatoes or poultry turns out to be unsafe, they have no quick way to see the big picture
or to warn the farmers and sellers involved. **Role 5 is the control room that fixes that.**

It has four connected parts:

**1. A "brain" that crunches the numbers (the Analytics service).**
Behind the scenes, a Spring Boot program reads from the shared database — every farm, every batch
of food, every recall, every report. It counts and groups that information into simple figures:
how many batches are in circulation, how many recalls are active, which regions have the most
farms, how recalls trend month by month. To keep it snappy, it remembers recent answers in a fast
memory layer called **Redis**, so the screen loads instantly instead of recalculating every time.

**2. A dashboard the regulator looks at (the React web app with charts).**
This is the screen a regulator opens in their browser after logging in. At a glance they see
headline numbers and colourful **Recharts** graphs — bar charts, line charts, pie charts — telling
the story of food safety across the country. No spreadsheets, no guesswork.

**3. A recall command desk (the recall management screen).**
When something is wrong, the regulator opens a recall, attaches evidence (a lab report or a photo,
safely stored in **AWS S3**), and flips its status to "active." The moment they do that, the system
**automatically text-messages the affected farmers** through Africa's Talking — so the warning
reaches people in minutes, even those without internet.

**4. A phone menu for everyone else (the USSD service).**
Not every farmer or shopper has a smartphone. So anyone can dial **\*714\*FOOD#** on the most basic
phone and get a simple menu: verify a food batch, report unsafe food, or check active recalls.
This makes the whole system inclusive — it reaches the village, not just the city.

**How the pieces connect:**
The phone menu and the dashboard both talk to the same brain (the Analytics + recall backend),
which reads from the shared **PostgreSQL** database and caches results in **Redis**. Evidence files
live in **S3**. Alerts go out over Africa's Talking. Everything runs on **AWS**: the database on
**RDS**, the backend on **Elastic Beanstalk**, and the dashboard on **Amplify** — so it's online,
24/7, with a real web address.

**What a judge or lecturer will see:**
- A **live web dashboard** with real, moving charts — not screenshots.
- A working **\*714\*FOOD#** USSD menu they can try on a phone simulator.
- A **recall** they can activate and watch an **SMS** actually arrive.
- A **clean GitHub history** of ~13 daily commits that tells the story of the build, each one a
  meaningful, working step.
- A professional **README** with the architecture, the live links, and clear run instructions.

In short: Role 5 turns scattered food-safety data into a living control room that regulators can
see, act on, and use to protect ordinary Ghanaians — reachable from both a modern browser and the
simplest mobile phone.
