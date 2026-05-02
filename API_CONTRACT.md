# FoodTrace GH API Contract

This document defines the backend shape the prototype is aiming toward.
It keeps the current UI clean and gives us a stable target for the real app.

## Core Principles

- Use one shared API for food and drug traceability.
- Keep domain data separate inside the payloads.
- Return status plus explanation, not just raw flags.
- Let the backend remain the source of truth.
- Keep AI responses clearly marked as assistant-generated.

## Authentication

### `POST /api/auth/request-otp`

Request a one-time code for email or phone login.

Request:

```json
{
  "identity": "demo@foodtrace.gh",
  "channel": "sms",
  "role": "consumer"
}
```

Response:

```json
{
  "requestId": "otp_123",
  "deliveryStatus": "queued"
}
```

### `POST /api/auth/verify-otp`

Verify the code and return the signed-in user session.

Request:

```json
{
  "requestId": "otp_123",
  "code": "123456"
}
```

Response:

```json
{
  "token": "jwt_or_session_token",
  "user": {
    "id": "usr_1",
    "role": "consumer",
    "language": "en"
  }
}
```

## QR Lookup

### `GET /api/qr/:code`

Resolve a QR or batch code into a product record.

Response:

```json
{
  "code": "FT-2026-00124",
  "productType": "food",
  "status": "green",
  "title": "Verified Safe",
  "subtitle": "Tomato Paste - Afram Foods Ltd",
  "details": {
    "farmOrigin": "Agyemang Farm, Ashanti",
    "recallStatus": "none",
    "qualityChecks": "3 / 3 passed"
  },
  "explanation": "All inputs are approved and no recall is active."
}
```

## Consumer Reports

### `POST /api/reports`

Submit a consumer concern tied to a product code.

Request:

```json
{
  "code": "BS-0199",
  "message": "The product looked suspicious.",
  "category": "quality"
}
```

Response:

```json
{
  "reportId": "rep_104",
  "status": "received"
}
```

## Food Domain

### `POST /api/food/farms`
Create or update a farm profile.

### `POST /api/food/cycles`
Create a crop cycle.

### `POST /api/food/input-logs`
Save a pesticide, fertilizer, seed, or water log.

### `POST /api/food/batches`
Create a food batch record and link it to verified sources.

## Drug Domain

### `POST /api/drugs/catalog`
Create or update a drug reference record.

### `POST /api/drugs/batches`
Create a drug batch or stock record.

### `POST /api/drugs/recalls`
Issue or update a drug recall record.

## Recalls

### `POST /api/recalls`
Create a recall broadcast for a product or batch.

Request:

```json
{
  "code": "BS-0199",
  "reason": "drug residue violation",
  "severity": "high"
}
```

## Offline Sync

### `POST /api/sync`
Upload locally queued actions from the app.

Request:

```json
{
  "deviceId": "dev_01",
  "events": [
    {
      "type": "food_input_saved",
      "timestamp": "2026-04-30T10:15:00Z"
    }
  ]
}
```

## AI Assistant

### `POST /api/assistant/query`
Ask for a plain-language explanation, ingredient help, or sourcing guidance.

Request:

```json
{
  "question": "Where can I source tomatoes?",
  "context": {
    "role": "consumer",
    "code": "FT-2026-00124"
  }
}
```

Response:

```json
{
  "title": "General sourcing guidance",
  "answer": "I cannot check live inventory here, but local markets, wholesalers, supermarkets, farms, and cooperatives are the usual places to look."
}
```

## Audit Trail

### `POST /api/audit`
Store a user-visible activity record.

## Notes

- Status should always come from the backend rules engine.
- The frontend can cache data locally, but it must not invent final safety results.
- AI suggestions must never silently change the product status.
