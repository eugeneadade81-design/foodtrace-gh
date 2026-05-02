# FoodTrace GH Master Spec

## Phase 1 Decision

FoodTrace GH is a shared traceability platform with two separate product modules:

- Food traceability
- Drug traceability

Both modules share the same core platform services:

- authentication and roles
- QR generation and scanning
- recalls
- notifications
- audit trail
- regulator dashboard shell
- AI assistant shell

## Design Direction

The app should follow the cleaner second mockup direction:

- mobile-first
- dark, official, and trust-focused
- simple cards and strong color states
- green = verified safe
- yellow = caution or under review
- red = recalled or blocked

## Primary User Groups

1. Consumers
2. Farmers
3. Manufacturers
4. Regulators
5. Admins / reviewers

## First Release Goal

The first release should prove that a user can:

1. register or sign in
2. create or scan a QR code
3. see a clear safety result
4. log food or drug traceability data
5. issue or view a recall
6. review the same record in the regulator dashboard

## Food Module Scope

### Must Have

- farmer registration
- farm profile
- crop cycle tracking
- pesticide and fertilizer logging
- withdrawal period checks
- consumer scan result for food products
- manufacturer batch logging
- QR label generation

### Later

- USSD
- voice logging
- advanced analytics
- retail sourcing workflows
- export certificates

## Drug Module Scope

### Must Have

- drug reference database
- drug batch or stock logging
- drug scan result
- recall status
- regulator review flow

### Later

- deeper veterinary workflows
- livestock-specific residue tracking
- advanced drug analytics

## AI Rules

AI may help with:

- plain-language explanations
- report summaries
- data quality warnings
- farmer guidance

AI must not:

- make the final safety decision alone
- silently approve or clear products
- replace regulator review

## Data Boundaries

Keep the data model separated by domain:

- shared users and auth tables
- food-specific tables
- drug-specific tables
- shared QR / recall / report tables where appropriate

Do not mix food and drug logic inside the same records unless a shared domain field is truly needed.

## Build Order After Phase 1

1. lock architecture and navigation
2. define the data model
3. build auth and roles
4. build consumer scan
5. build food module
6. build drug module
7. build regulator dashboard
8. add AI assistant
9. add offline and SMS support
10. test and pilot

## Success Criteria

Phase 1 is successful when the team can explain the app in one sentence:

> FoodTrace GH lets people trace food and drug products from source to scan, with clear safety states and recall visibility.

