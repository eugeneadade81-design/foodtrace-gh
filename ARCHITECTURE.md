# FoodTrace GH Architecture & Navigation

## 1. Platform Shape

FoodTrace GH should be built as one shared platform with two product modules:

- Food traceability
- Drug traceability

Shared platform services:

- authentication
- role-based access control
- QR generation and QR scanning
- recalls
- notifications
- AI assistant
- audit trail
- regulator review workflow

## 2. Navigation Model

The app should feel like one system, but the navigation should clearly separate user tasks.

### Primary Tabs

1. Consumer scan
2. Farmer portal
3. Manufacturer portal
4. FDA dashboard
5. Safety assistant

### Consumer Screens

- `Scan`
- `Search by code`
- `Scan history`
- `Product safety result`
- `Report concern`

### Farmer Screens

- `Farmer dashboard`
- `Farm profile`
- `Crop cycles`
- `Log input`
- `Withdrawal calendar`
- `Offline queue`

### Manufacturer Screens

- `Manufacturer dashboard`
- `New batch`
- `Batch list`
- `QR label`
- `Recall center`

### Regulator Screens

- `Regulator overview`
- `Active recalls`
- `Violation queue`
- `Consumer reports`
- `Food reviews`
- `Drug reviews`
- `Analytics`

### AI Screens

- `Ask FoodTrace AI`
- `Scan explanation`
- `Report summary`
- `Farmer help`
- `Regulator triage`

## 3. Route Map

If we move to a real web or React build, the app should use this route structure:

### Public

- `/`
- `/public/scan`
- `/public/scan/:code`

### Auth

- `/login`
- `/register`
- `/verify-otp`

### Consumer

- `/consumer`
- `/consumer/scan`
- `/consumer/history`
- `/consumer/report`

### Farmer

- `/farmer`
- `/farmer/dashboard`
- `/farmer/farms`
- `/farmer/cycles`
- `/farmer/log-input`
- `/farmer/cycle/:id`

### Manufacturer

- `/manufacturer`
- `/manufacturer/dashboard`
- `/manufacturer/batches`
- `/manufacturer/batches/new`
- `/manufacturer/batches/:id`
- `/manufacturer/recalls`

### Regulator

- `/regulator`
- `/regulator/dashboard`
- `/regulator/recalls`
- `/regulator/reports`
- `/regulator/reviews`
- `/regulator/analytics`

### AI Assistant

- `/assistant`

## 4. Folder Structure

When we convert the prototype into a real app, the repo should look roughly like this:

```text
foodtrace-gh/
  frontend/
    src/
      app/
      components/
      features/
        consumer/
        farmer/
        manufacturer/
        regulator/
        assistant/
      hooks/
      lib/
      styles/
  backend/
    src/
      auth/
      qr/
      recalls/
      notifications/
      food/
      drugs/
      reports/
      ai/
      admin/
      shared/
  docs/
    MASTER_SPEC.md
    ARCHITECTURE.md
    DATA_MODEL.md
```

## 5. Shared Logic Boundaries

Keep these pieces shared across both food and drug modules:

- user accounts
- OTP / login
- QR creation and lookup
- recall broadcasts
- notification delivery
- audit logging
- AI explanation layer

Keep these pieces separate:

- food-specific record types
- drug-specific record types
- withdrawal rules
- domain-specific validation
- regulator review categories

## 6. State Rules

The UI should always make the current status obvious.

### Status Colors

- green: verified safe
- yellow: caution or under review
- red: recalled or blocked

### Status Priority

If more than one condition applies, use the most serious state:

1. red
2. yellow
3. green

### AI Rule

AI may explain the status, but it must not override the core rules engine.

## 7. Build Discipline

To keep the app clean:

- build one screen or flow at a time
- keep food and drug modules separate in code
- do not mix prototype UI with backend logic
- do not let AI become the source of truth
- make every new feature fit the route map before adding it

