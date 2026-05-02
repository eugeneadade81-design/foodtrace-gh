# FoodTrace GH Data Model

## 1. Model Principles

The database should support one shared traceability platform with two distinct product domains:

- food
- drugs

Rules:

- keep shared identity and access data in common tables
- keep food-specific records separate from drug-specific records
- keep QR, recall, and report logic reusable across both domains where possible
- store only the minimum location data needed for the use case
- keep audit history for traceability and regulator review

## 2. Shared Tables

### users

Stores all platform accounts.

Important fields:

- `id`
- `full_name`
- `phone`
- `email`
- `password_hash`
- `role`
- `language`
- `is_verified`
- `is_active`
- `created_at`
- `updated_at`

Suggested roles:

- consumer
- farmer
- manufacturer
- regulator
- admin
- agent

### otp_tokens

Stores login and verification codes.

Important fields:

- `id`
- `user_id`
- `token`
- `purpose`
- `expires_at`
- `used_at`
- `created_at`

### audit_logs

Tracks important user and system actions.

Important fields:

- `id`
- `user_id`
- `action`
- `entity_type`
- `entity_id`
- `metadata`
- `created_at`

### qr_codes

Stores generated QR codes for traceable records.

Important fields:

- `id`
- `code_string`
- `product_type`
- `product_id`
- `status`
- `scan_count`
- `s3_url`
- `generated_at`
- `status_updated_at`

Suggested statuses:

- active
- recalled
- under_investigation
- invalidated

### recalls

Stores recall events.

Important fields:

- `id`
- `product_type`
- `product_id`
- `issued_by_user_id`
- `issued_by_role`
- `recall_type`
- `reason`
- `safe_disposal_instructions`
- `affected_districts`
- `consumers_notified`
- `broadcast_completed_at`
- `resolved_at`
- `created_at`

### consumer_reports

Stores reports from consumers and reviewers.

Important fields:

- `id`
- `reporter_id`
- `product_type`
- `product_id`
- `qr_code_string`
- `description`
- `photo_s3_url`
- `district`
- `report_status`
- `created_at`

Suggested statuses:

- pending
- under_review
- resolved
- dismissed

## 3. Food Domain Tables

### farms

Stores farmer farm profiles.

Important fields:

- `id`
- `owner_id`
- `farm_name`
- `district`
- `region`
- `size_acres`
- `crop_types`
- `epa_registration_number`
- `verification_status`
- `badge_status`
- `created_at`

Suggested verification statuses:

- pending
- verified
- rejected
- suspended

### crop_cycles

Stores each crop-growing cycle.

Important fields:

- `id`
- `farm_id`
- `crop_type`
- `planting_date`
- `harvest_date`
- `market_ready`
- `market_ready_at`
- `status`
- `created_at`

Suggested statuses:

- growing
- ready
- harvested

### pesticides

Stores the EPA pesticide reference database.

Important fields:

- `id`
- `name`
- `active_ingredient`
- `epa_status`
- `approved_crops`
- `max_dosage_per_ha`
- `dosage_unit`
- `withdrawal_days`
- `health_risk_level`
- `health_risks`
- `ban_reason`
- `last_updated`
- `source`

Suggested EPA statuses:

- approved
- banned
- restricted
- unverified

### pesticide_applications

Stores each pesticide application log.

Important fields:

- `id`
- `crop_cycle_id`
- `pesticide_id`
- `pesticide_name`
- `in_database`
- `application_date`
- `concentration`
- `concentration_unit`
- `area_treated_ha`
- `applied_by`
- `notes`
- `flagged_banned`
- `earliest_harvest`
- `created_at`

### product_batches

Stores manufacturer batches for food products.

Important fields:

- `id`
- `manufacturer_id`
- `product_name`
- `batch_number`
- `ingredient_sources`
- `processing_steps`
- `quality_checks`
- `packaging_date`
- `expiry_date`
- `batch_status`
- `pesticide_residue_declared`
- `created_at`

Suggested batch statuses:

- active
- recalled
- under_investigation
- expired

## 4. Drug Domain Tables

### drugs

Stores the drug reference database.

Important fields:

- `id`
- `name`
- `brand_names`
- `drug_class`
- `active_ingredient`
- `approval_status`
- `approved_use_cases`
- `withdrawal_days`
- `health_risk_level`
- `health_risks`
- `ban_reason`
- `regulatory_authority`
- `codex_reference`
- `last_updated`
- `source`

Suggested approval statuses:

- approved
- banned
- restricted
- under_review
- not_approved

### drug_applications

Stores each drug or residue-related log for the drug domain.

Important fields:

- `id`
- `source_type`
- `source_id`
- `drug_id`
- `drug_name`
- `in_database`
- `administration_date`
- `dosage`
- `dosage_unit`
- `route`
- `notes`
- `flagged_banned`
- `earliest_clear_date`
- `created_at`

### drug_batches

Stores drug-related product or batch records.

Important fields:

- `id`
- `manufacturer_id`
- `product_name`
- `batch_number`
- `ingredients`
- `safety_checks`
- `packaging_date`
- `expiry_date`
- `batch_status`
- `residue_declaration_notes`
- `created_at`

## 5. Relationships

Suggested relationships:

- one user can own many farms
- one farm can have many crop cycles
- one crop cycle can have many pesticide applications
- one manufacturer can have many food batches
- one manufacturer can have many drug batches
- one batch can have one QR code
- one product can have many reports
- one product can have many recalls over time, though only one active recall may exist at once

## 6. Product Type Strategy

Use a `product_type` field when a shared table needs to handle both domains.

Suggested `product_type` values:

- food
- drug

Use separate domain tables when the fields diverge too much.

## 7. Safety State Logic

The status engine should follow this order:

1. red
2. yellow
3. green

Examples:

- red: recalled, banned, blocked, or under investigation with high confidence
- yellow: unverified input, pending review, or incomplete data
- green: verified and clear

## 8. Notes for Implementation

- add indexes to foreign keys and lookup columns
- use timestamps for all major tables
- keep immutable logs where possible
- never depend on the AI assistant to calculate the final safety status
