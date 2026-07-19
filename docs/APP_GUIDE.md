# FoodTrace GH — Complete App Guide

**How the whole application works** (for your group, consultants, and oral exam).

Related docs:
- [BUSINESS_MODEL.md](BUSINESS_MODEL.md) — how the product makes money  
- [MICROSERVICES.md](MICROSERVICES.md) — Core API + Analytics Service  
- [DEMO_SCRIPT.md](DEMO_SCRIPT.md) — 5-minute presentation script  

---

## 1. What is FoodTrace GH?

**FoodTrace GH** (“Scan It. Trace It. Trust It.”) is a Ghana-focused **food traceability and safety** platform.

It connects:

| Who | What they do |
|---|---|
| **Consumers** | Scan a QR / type a batch code → see if the product is safe, caution, or recalled |
| **Farmers** | Log farms, crops, pesticides/fertilizers, safe harvest timing |
| **Manufacturers** | Create product batches, generate QR codes, issue recalls |
| **Regulators (FDA-style)** | See dashboards, manage recalls, review consumer reports |
| **Feature-phone users** | Use **USSD/SMS** when they have no smartphone |

Optional: a **drug/pharmacy** module (enabled on the live web demo).

**Problem it solves:** many consumers cannot verify local food safety; recalls are slow; farm-to-shelf data is fragmented.

---

## 2. Tech stack (main tools)

| Layer | Main technology |
|---|---|
| Mobile | **Expo** (React Native) + TypeScript |
| Web | **React** + Vite + **TypeScript** |
| Backend | **Spring Boot** (two microservices) |
| Database | **PostgreSQL** |
| SMS / USSD | Africa’s Talking |
| Audio | Google TTS (optional) + device speech fallback |

**Microservices:**
1. **Core API** (`backend/`, port `3000`) — auth, farm, scan, marketplace, manufacturer, drugs  
2. **Analytics Service** (`analytics-service/`, port `8081`) — regulator charts, recalls, USSD  

Both share **PostgreSQL**. Details: [MICROSERVICES.md](MICROSERVICES.md).

---

## 3. How the whole system functions (big picture)

```text
FARMER                MANUFACTURER              CONSUMER
  │                        │                        │
  │ logs farm +            │ creates batch +        │ scans QR / types code
  │ pesticide inputs       │ generates QR           │
  ▼                        ▼                        ▼
              ┌─────────────────────────────────────────┐
              │           Core API (Spring Boot)         │
              │   auth · farms · batches · scan · reports│
              └──────────────────┬──────────────────────┘
                                 │
                                 ▼
                           PostgreSQL
                                 ▲
                                 │
              ┌──────────────────┴──────────────────────┐
              │     Analytics Service (Spring Boot)      │
              │   charts · recall workflow · USSD · SMS  │
              └──────────────────┬──────────────────────┘
                                 │
                            REGULATOR
```

### The main safety loop

1. Farmer records farm / crop / inputs (e.g. pesticide + withdrawal period).  
2. Manufacturer creates a **batch** linked to traceability data and gets a **QR / batch code**.  
3. Consumer **scans** that code on mobile or web.  
4. Core API looks up the batch in PostgreSQL and returns:
   - **Green** — verified / safe  
   - **Yellow** — caution / under review  
   - **Red** — recalled / unsafe  
5. If something is wrong, consumer can **report** a concern.  
6. Regulator (or manufacturer) **issues / activates a recall**.  
7. Later scans immediately show the updated **recalled** status.  
8. On recall activation, Analytics can send **SMS** alerts; feature phones can check via **USSD**.

That loop is the heart of the app.

---

## 4. User roles and what each screen does

### 4.1 Consumer (no login required for basic scan)

**Apps:** Expo mobile + main web  

**Functions:**
- Scan QR with camera **or** type a code (e.g. `FT-FD1001-2B5B7A`)  
- See product name, manufacturer, batch, expiry, safety status, recommended action  
- Optional **audio summary** of the result  
- Submit a **safety report** (needs login/session)  
- Browse marketplace posts (community content)

**Demo codes:**
| Code | Expected result |
|---|---|
| `FT-FD1001-2B5B7A` | Safe — ZenMalt Barley Drink |
| `FT-FD1000-932BF6` | Recalled — AquaFresh Pure Water |
| `DR-DR2001-7FEA32` | Safe drug — AmoxiCure 500mg (if drug module on) |
| `DR-DR2000-C652FA` | Recalled drug — AmoxiCure 250mg |

### 4.2 Farmer

**Login example:** `kwame.asante@foodtrace.gh` / `Password123!`  

**Functions:**
- Manage farm profile (location, region)  
- Create **crop cycles**  
- Log inputs: pesticide, fertilizer, seed, notes  
- See **EPA-style approval** hints and **safe harvest date** from withdrawal timing  
- Banned inputs (e.g. DDT) should trigger alerts  
- Offline-ish sync path exists for queued farm actions (`/api/food/offline-sync`)

### 4.3 Manufacturer

**Login example:** `accra.foods@foodtrace.gh` / `Password123!`  

**Functions:**
- Company profile (FDA registration number, sector, **subscription tier**)  
- Create / list **product batches**  
- Generate **QR / batch codes**  
- Self-issue a **manufacturer recall** so consumer scans flip to red  

Subscription tiers (`micro` / `sme` / `enterprise`) support the business model.

### 4.4 Regulator (FDA-style)

**Login example:** `regulator@foodtrace.gh` / `Password123!`  

**Apps:** main web regulator views + dedicated **regulator-dashboard** (talks to Analytics Service)

**Functions:**
- Compliance / KPI overview (farms, batches, recalls, reports, districts)  
- Review consumer reports  
- Create / activate / resolve **recalls**  
- Upload or attach recall **evidence** (S3 or local stub)  
- Trigger **SMS** on recall activation (when Africa’s Talking is configured)

### 4.5 Feature-phone user (USSD / SMS)

- Dial USSD short code (demo concept: `*714*FOOD#`)  
- Africa’s Talking posts to **Analytics** `POST /api/ussd`  
- User enters a batch code → gets CON/END text with safety status  
- SMS used for OTP (Core) and recall alerts (Analytics)

---

## 5. Frontends and what they talk to

| Frontend | Folder | Talks to | Purpose |
|---|---|---|---|
| Mobile app | `mobile/` | Core API `:3000` | Scan, auth, farmer/consumer flows |
| Main web | `web/` | Core API `:3000` | Same product on browser; GitHub Pages live site |
| Regulator dashboard | `regulator-dashboard/` | Analytics `:8081` | Charts + recall tools |
| Manufacturer Portal | `Manufacturer Portal/` | Separate Express app (legacy/parallel) | Extra manufacturer UI; Core also has `/api/manufacturer` |

**Live URLs (production demo):**
- Web: https://foodtrace-inc.github.io/foodtrace-gh/  
- API: https://foodtrace-gh.onrender.com  

**Note:** Render free hosting can **sleep**. First request after idle may take 1–2 minutes or time out — wake `/health` before demos.

---

## 6. Backend APIs (what happens under the hood)

### Core API (port 3000)

Typical routes (all under `/api` unless noted):

| Area | Examples |
|---|---|
| Health | `GET /health`, `GET /api/health` |
| Auth | `/api/auth/login`, `/register`, OTP, security-question reset |
| Scan | `/api/scan/...` — verify food batch codes |
| Farmer / food | `/api/food`, `/api/farmer` — farms, cycles, inputs |
| Manufacturer | `/api/manufacturer` — profile, batches, recalls |
| Marketplace | `/api/marketplace` — posts, likes, comments |
| Drugs | `/api/drug/...` — pharmacy scan/register (feature-flagged on web) |
| Notifications | `/api/notifications` |
| Reports / regulator helpers | via compatibility controllers |

Auth uses **JWT**. Passwords are hashed. Flyway migrations own the Postgres schema (`V1`…`V22`, including product images).

### Analytics Service (port 8081)

| Area | Examples |
|---|---|
| Health | `GET /api/health` |
| Analytics | `/api/analytics/...` — summary charts, farms by region, etc. |
| Recalls | `/api/recalls/...` — draft → activate → resolve |
| USSD | `POST /api/ussd` — **only this service** owns USSD by default |
| Cache | Redis optional for chart caching |

---

## 7. Data that matters

PostgreSQL stores (among others):

- **Users** + roles (consumer, farmer, manufacturer, regulator)  
- **Farms**, crop cycles, input logs  
- **Product batches** + `image_url`, QR/batch codes, status  
- **Drug** register/batches (optional module)  
- **Consumer reports**  
- **Recalls**  
- **Manufacturers** + `subscription_tier`  
- Marketplace posts  

Product photos are stored as image URLs / embedded data URIs updated by migrations (unique per product after V19–V22).

---

## 8. End-to-end example (one product)

1. Farmer Kwame logs tomato cycle + Cypermethrin → safe harvest date calculated.  
2. Accra Foods creates batch **ZenMalt** → code `FT-FD1001-2B5B7A` + QR.  
3. Shopper scans with Expo app → Core returns **safe** (green) + details + optional audio.  
4. Later, AquaFresh batch `FT-FD1000-932BF6` is recalled.  
5. Next scan → **recalled** (red) + “do not consume” guidance.  
6. Regulator sees recall on Analytics dashboard; SMS may notify affected parties.  
7. Someone without a smartphone dials USSD, enters the code, gets the same status in text.

---

## 9. How to run locally (short)

```bash
# DB up (or docker compose)
npm install
npm run db:seed          # demo accounts + sample batches
npm run dev:backend      # Core :3000
cd analytics-service && mvn spring-boot:run   # Analytics :8081
npm run dev:web          # Web
npm run dev:mobile       # Expo
```

Or: `docker compose up --build` (Postgres + Redis + Core + Analytics).

Demo password for seeded users: **`Password123!`**

---

## 10. What to say in the oral exam (30 seconds)

> FoodTrace GH is a Ghana food-safety traceability app. Farmers and manufacturers put batch data into our **Core Spring Boot API**. Consumers scan QR codes on **Expo** or the **React** web app to see if food is safe. Regulators use a second microservice — **Analytics** — for dashboards, recalls, and USSD. Everything sits on **PostgreSQL**. We make money from manufacturer subscriptions and regulator licensing.

---

## 11. Checklist before presentation day

- [ ] Core health is green (`/health`)  
- [ ] Analytics health is green (`/api/health`)  
- [ ] Seeded demo codes work (safe + recalled)  
- [ ] At least one farmer + manufacturer + regulator login works  
- [ ] Each member can explain: stack, microservices, business model, one user flow  
- [ ] Live Render backend woken up if using production  

---

## 12. Doc map

| Need | Open this |
|---|---|
| Whole app (this file) | `docs/APP_GUIDE.md` |
| Money / proposal business | `docs/BUSINESS_MODEL.md` |
| Two Spring services | `docs/MICROSERVICES.md` |
| 5-min demo talk track | `docs/DEMO_SCRIPT.md` |
| MVP scope boundaries | `docs/PRODUCTION_MVP_SCOPE.md` |
| APK install notes | `docs/MOBILE_APK_READY.md` |
