# FoodTrace GH

## Scan It. Trace It. Trust It.

FoodTrace GH is a Ghana-focused food traceability platform for consumers, farmers, manufacturers, and FDA regulators. It helps people verify product safety from a QR code, gives farmers and manufacturers a practical way to log traceability data, and gives regulators a faster view of recalls, consumer reports, and high-risk products across districts.

**Live app:** https://foodtrace-inc.github.io/foodtrace-gh/ (web) · backend API at https://foodtrace-gh.onrender.com

## Key Features

- Food traceability from farm input to packaged product.
- QR scanning on mobile and web, with typed fallback for damaged labels.
- Recall workflows for manufacturers and regulators.
- Farmer portal for farms, crop cycles, pesticide logs, and safe harvest timing.
- FDA dashboard with compliance metrics, alerts, reports, and emergency recall actions.
- USSD and SMS fallback for feature-phone users.
- Multilingual audio summaries for scan results.

The medicine/pharmacy module is available behind `VITE_ENABLE_DRUG_MODULE=true`. Local/pilot defaults keep it **off** (see `.env.example`). The live GitHub Pages deploy intentionally sets it **on** so demo drug QR codes work for reviewers.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Backend | Java 21 / 17, Spring Boot (**microservices**: Core API + Analytics Service) |
| Mobile | React Native, Expo |
| Web | React, Vite, TypeScript |
| Database | PostgreSQL |
| SMS / USSD | Africa's Talking |
| Audio | Google Text-to-Speech, Expo Speech fallback |

**Architecture & business docs (CODEQUEST):**

- [docs/APP_GUIDE.md](docs/APP_GUIDE.md) — **how the whole app works** (start here)
- [docs/MICROSERVICES.md](docs/MICROSERVICES.md) — how the two Spring services split work
- [docs/BUSINESS_MODEL.md](docs/BUSINESS_MODEL.md) — manufacturer SaaS + regulator licensing
- [docs/architecture.md](docs/architecture.md) — regulator / analytics deep dive

## Local Setup

1. Clone the repo.

   ```bash
   git clone https://github.com/eugeneadade81-design/foodtrace-gh.git
   cd foodtrace-gh
   ```

2. Copy `.env.example` to `.env` and fill in your local values.

   ```bash
   copy .env.example .env
   ```

3. Install dependencies in the root folder.

   ```bash
   npm install
   ```

4. Start PostgreSQL and make sure `DATABASE_URL` points to it. Spring Boot runs the Flyway migrations automatically on startup.

5. Seed demo data when you need the sample accounts and QR codes.

   ```bash
   npm run db:seed
   ```

6. Start the **Core API** microservice.

   ```bash
   npm run dev:backend
   ```

7. Start the **Analytics** microservice (regulator / USSD), against the same Postgres:

   ```bash
   cd analytics-service
   mvn spring-boot:run
   ```

   For shared-DB mode set `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DRIVER`, and `SQL_INIT_MODE=never` (see [docs/MICROSERVICES.md](docs/MICROSERVICES.md)). Or run everything with `docker compose up --build`.

8. Start the mobile app.

   ```bash
   npm run dev:mobile
   ```

9. Start the web app.

   ```bash
   npm run dev:web
   ```

Default local URLs:

- Core API: `http://localhost:3000` · API base `http://localhost:3000/api`
- Analytics Service: `http://localhost:8081`
- Web: `http://localhost:5173` or `http://127.0.0.1:5173`
- Health: `http://localhost:3000/health` · Analytics `http://localhost:8081/api/health`

## Known integration stubs

| Integration | Status | Notes |
| --- | --- | --- |
| Google TTS (`POST /api/audio/speech`) | Optional | Returns `{"status":"not_configured"}` unless `GOOGLE_APPLICATION_CREDENTIALS` / `GOOGLE_CLOUD_PROJECT` are set. Mobile/web can fall back to device speech. |
| Africa's Talking SMS (`POST /api/sms`) | Optional | Endpoints accept callbacks; outbound delivery needs `AFRICASTALKING_*` env vars. |
| Redis | Not used by main API | `/health` reports `redis: not_configured`. PostgreSQL is the source of truth; Redis appears only in compose/analytics docs. |
| Push notifications | Implemented | Expo push registration + server send path for recalls/alerts. |
| Farmer offline-sync | Implemented | `POST /api/food/offline-sync` (and farmer alias) applies queued farm/crop/input actions. |

## Demo Accounts

All seeded accounts use the password `Password123!`. These exist on both
local dev (via `scripts/seed/seed_dev.cjs`) and production
(`foodtrace-gh.onrender.com`, seeded manually to match this table).

| Role | Email |
| --- | --- |
| Consumer | `consumer@foodtrace.gh` |
| Farmer | `kwame.asante@foodtrace.gh` |
| Manufacturer | `accra.foods@foodtrace.gh` |
| Pharmacist | `kumasi.pharmacy@foodtrace.gh` |
| Regulator | `regulator@foodtrace.gh` |

**Password recovery (security questions):** every account can reset its
password without email/SMS — on the login screen, tap *Forgot password?*,
enter the email or phone, answer the security question, and set a new
password. All demo accounts above share the question **"What town were you
born in?"** with the answer **`Accra`** (answers are case- and
whitespace-insensitive). New accounts set their own question/answer at
registration.

Production also has ~500 bulk demo products/batches seeded via
`seed_demo_data.py` under a separate `accra.foods@foodtrace.gh`-style
manufacturer/pharmacist pair (phones `0200000001` / `0200000002`,
password `Demo@1234`) — that script's full QR list is written to
`demo_qr_codes.txt` (gitignored, regenerate by re-running the script).

Useful demo QR codes (verified working on production):

| Flow | Code | Expected result |
| --- | --- | --- |
| Safe food | `FT-FD1001-2B5B7A` | ZenMalt Barley Drink |
| Recalled food | `FT-FD1000-932BF6` | AquaFresh Pure Water (recalled) |
| Expired/caution food | `FT-FD1007-6FDD72` | AquaBliss Table Water (expired) |
| Safe drug | `DR-DR2001-7FEA32` | AmoxiCure 500mg Capsules |
| Recalled drug | `DR-DR2000-C652FA` | AmoxiCure 250mg Capsules (recalled) |
| Expired/caution drug | `DR-DR2007-ACD24D` | OfloxiCure 400mg Tablets (expired) |

Note: food codes resolve via `GET /api/scan/:code`, drug codes via
`GET /api/drug/scan/:code` — the apps route to the right one
automatically, but if testing with `curl` directly, use the matching
endpoint or the code will return `not_found`.

## API Endpoints

| Area | Endpoint |
| --- | --- |
| Health | `GET /health`, `GET /api/health` |
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` |
| Food scan | `GET /api/scan/:code` |
| Consumer reports | `POST /api/scan/:code/report` |
| Farmer | `GET /api/food/dashboard`, `POST /api/food/farms`, `POST /api/food/crop-cycles`, `POST /api/food/input-logs` |
| Manufacturer | `GET /api/manufacturer/dashboard`, `POST /api/manufacturer/profile`, `POST /api/manufacturer/batches`, `POST /api/manufacturer/recalls` |
| Drug scan | `GET /api/drug/scan/:code`, `GET /api/drugs/scan/:code` |
| Pharmacy | `GET /api/pharmacy/dashboard`, `POST /api/pharmacy/register`, `POST /api/pharmacy/drugs`, `POST /api/pharmacy/drug-batches` |
| Regulator | `GET /api/regulator/dashboard`, `PATCH /api/regulator/reports` (body: `{reportId, status}`), `POST /api/regulator/recalls` |
| Audio | `POST /api/audio/speech` |
| Assistant | `POST /api/assistant/query` |
| USSD/SMS | `POST /api/ussd`, `POST /api/sms` |

## Documentation

- [Demo Script](./docs/DEMO_SCRIPT.md)
- [Production MVP Scope](./docs/PRODUCTION_MVP_SCOPE.md)
- [Architecture](./ARCHITECTURE.md)
- [Data Model](./DATA_MODEL.md)
- [API Contract](./API_CONTRACT.md)
- [Postman Collection](./docs/FoodTrace.postman_collection.json)
- [Security](./SECURITY.md)

## Team

Group 94, KNUST, CodeQuest 2026.

Team members:

- Eugene Adade
- Team Member 2
- Team Member 3
- Team Member 4
- Team Member 5

## License

MIT. See [LICENSE](./LICENSE).
