CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('consumer', 'farmer', 'manufacturer', 'regulator', 'pharmacist');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'badge_status') THEN
    CREATE TYPE badge_status AS ENUM ('none', 'certified');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'recall_status') THEN
    CREATE TYPE recall_status AS ENUM ('active', 'recalled', 'under_investigation');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'qr_status') THEN
    CREATE TYPE qr_status AS ENUM ('active', 'recalled', 'invalidated', 'under_investigation');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'report_status') THEN
    CREATE TYPE report_status AS ENUM ('pending', 'reviewing', 'resolved', 'dismissed');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'input_type') THEN
    CREATE TYPE input_type AS ENUM ('pesticide', 'fertilizer', 'seed', 'irrigation', 'other');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'epa_status') THEN
    CREATE TYPE epa_status AS ENUM ('approved', 'banned', 'restricted', 'unverified');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'verification_status') THEN
    CREATE TYPE verification_status AS ENUM ('pending', 'verified', 'rejected', 'suspended');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'farm_cycle_status') THEN
    CREATE TYPE farm_cycle_status AS ENUM ('growing', 'ready', 'harvested');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'product_batch_status') THEN
    CREATE TYPE product_batch_status AS ENUM ('active', 'recalled', 'under_investigation', 'expired');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'drug_approval_status') THEN
    CREATE TYPE drug_approval_status AS ENUM ('approved', 'banned', 'restricted', 'under_review', 'not_approved');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_tier') THEN
    CREATE TYPE subscription_tier AS ENUM ('micro', 'small', 'medium', 'large');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  phone text,
  email text,
  password_hash text NOT NULL,
  role user_role NOT NULL,
  language text NOT NULL DEFAULT 'en',
  is_verified boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_phone_email_unique UNIQUE (phone, email)
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone_unique ON users(phone) WHERE phone IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique ON users(email) WHERE email IS NOT NULL;

CREATE TABLE IF NOT EXISTS otp_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token text NOT NULL,
  purpose text NOT NULL DEFAULT 'login',
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_otp_tokens_user_id ON otp_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_otp_tokens_token ON otp_tokens(token);

CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

CREATE TABLE IF NOT EXISTS farms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  district text NOT NULL,
  region text NOT NULL,
  size_acres numeric(10,2),
  crop_types text[] NOT NULL DEFAULT '{}',
  epa_registration_number text,
  verification_status verification_status NOT NULL DEFAULT 'pending',
  badge_status badge_status NOT NULL DEFAULT 'none',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_farms_owner_id ON farms(owner_id);
CREATE INDEX IF NOT EXISTS idx_farms_location ON farms(district, region);

CREATE TABLE IF NOT EXISTS crop_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  crop_type text NOT NULL,
  planting_date date NOT NULL,
  harvest_date date,
  market_ready boolean NOT NULL DEFAULT false,
  market_ready_at timestamptz,
  status farm_cycle_status NOT NULL DEFAULT 'growing',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crop_cycles_farm_id ON crop_cycles(farm_id);
CREATE INDEX IF NOT EXISTS idx_crop_cycles_status ON crop_cycles(status);

CREATE TABLE IF NOT EXISTS pesticides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  active_ingredient text,
  epa_status epa_status NOT NULL DEFAULT 'unverified',
  approved_crops text[] NOT NULL DEFAULT '{}',
  max_dosage_per_ha numeric(12,4),
  dosage_unit text,
  withdrawal_days integer NOT NULL DEFAULT 0,
  health_risk_level text,
  health_risks text,
  ban_reason text,
  last_updated timestamptz,
  source text
);

CREATE INDEX IF NOT EXISTS idx_pesticides_name ON pesticides(name);
CREATE INDEX IF NOT EXISTS idx_pesticides_active_ingredient ON pesticides(active_ingredient);

CREATE TABLE IF NOT EXISTS input_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_cycle_id uuid NOT NULL REFERENCES crop_cycles(id) ON DELETE CASCADE,
  input_type input_type NOT NULL,
  product_name text NOT NULL,
  epa_approval_status epa_status NOT NULL DEFAULT 'unverified',
  application_date date NOT NULL,
  concentration numeric(12,4),
  unit text,
  withdrawal_period_days integer NOT NULL DEFAULT 0,
  safe_harvest_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_input_logs_cycle_id ON input_logs(crop_cycle_id);
CREATE INDEX IF NOT EXISTS idx_input_logs_product_name ON input_logs(product_name);

CREATE TABLE IF NOT EXISTS manufacturers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_name text NOT NULL,
  fda_registration_number text,
  sector text,
  is_verified boolean NOT NULL DEFAULT false,
  subscription_tier subscription_tier NOT NULL DEFAULT 'micro',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_manufacturers_user_id ON manufacturers(user_id);

CREATE TABLE IF NOT EXISTS product_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manufacturer_id uuid NOT NULL REFERENCES manufacturers(id) ON DELETE CASCADE,
  batch_number text NOT NULL,
  ingredient_sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  processing_steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  quality_checks jsonb NOT NULL DEFAULT '[]'::jsonb,
  packaging_date date NOT NULL,
  expiry_date date NOT NULL,
  recall_status recall_status NOT NULL DEFAULT 'active',
  recall_reason text,
  recalled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_batches_unique_batch_number UNIQUE (manufacturer_id, batch_number)
);

CREATE INDEX IF NOT EXISTS idx_product_batches_manufacturer_id ON product_batches(manufacturer_id);
CREATE INDEX IF NOT EXISTS idx_product_batches_recall_status ON product_batches(recall_status);

CREATE TABLE IF NOT EXISTS qr_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES product_batches(id) ON DELETE CASCADE,
  code_string text NOT NULL UNIQUE,
  s3_url text,
  scan_count integer NOT NULL DEFAULT 0,
  status qr_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qr_codes_batch_id ON qr_codes(batch_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_status ON qr_codes(status);

CREATE TABLE IF NOT EXISTS consumer_scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_code_id uuid NOT NULL REFERENCES qr_codes(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  scanned_at timestamptz NOT NULL DEFAULT now(),
  user_agent text
);

CREATE INDEX IF NOT EXISTS idx_consumer_scans_qr_code_id ON consumer_scans(qr_code_id);
CREATE INDEX IF NOT EXISTS idx_consumer_scans_user_id ON consumer_scans(user_id);
CREATE INDEX IF NOT EXISTS idx_consumer_scans_scanned_at ON consumer_scans(scanned_at);

CREATE TABLE IF NOT EXISTS consumer_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_code_id uuid REFERENCES qr_codes(id) ON DELETE SET NULL,
  reporter_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  description text NOT NULL,
  photo_url text,
  district text,
  status report_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consumer_reports_reporter_id ON consumer_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_consumer_reports_qr_code_id ON consumer_reports(qr_code_id);
CREATE INDEX IF NOT EXISTS idx_consumer_reports_status ON consumer_reports(status);

CREATE TABLE IF NOT EXISTS recall_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES product_batches(id) ON DELETE CASCADE,
  issued_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recall_type text NOT NULL,
  reason text NOT NULL,
  scope_districts text[] NOT NULL DEFAULT '{}',
  notification_sent_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recall_events_batch_id ON recall_events(batch_id);
CREATE INDEX IF NOT EXISTS idx_recall_events_created_at ON recall_events(created_at);

CREATE TABLE IF NOT EXISTS pharmacies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_name text NOT NULL,
  ghana_pharmacy_council_number text NOT NULL,
  district text NOT NULL,
  region text NOT NULL,
  is_verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pharmacies_user_id ON pharmacies(user_id);

CREATE TABLE IF NOT EXISTS drugs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  generic_name text,
  manufacturer_name text,
  fda_drug_registration_number text,
  drug_class text,
  dosage_form text,
  strength text,
  requires_prescription boolean NOT NULL DEFAULT false,
  is_controlled boolean NOT NULL DEFAULT false,
  fda_approval_status drug_approval_status NOT NULL DEFAULT 'under_review',
  storage_conditions text,
  side_effects_summary text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_updated timestamptz
);

CREATE INDEX IF NOT EXISTS idx_drugs_name ON drugs(name);
CREATE INDEX IF NOT EXISTS idx_drugs_generic_name ON drugs(generic_name);
CREATE INDEX IF NOT EXISTS idx_drugs_approval_status ON drugs(fda_approval_status);

CREATE TABLE IF NOT EXISTS drug_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drug_id uuid NOT NULL REFERENCES drugs(id) ON DELETE CASCADE,
  pharmacy_id uuid NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
  batch_number text NOT NULL,
  manufacture_date date NOT NULL,
  expiry_date date NOT NULL,
  quantity_received integer NOT NULL,
  quantity_remaining integer NOT NULL,
  supplier_name text,
  recall_status recall_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT drug_batches_unique_batch_number UNIQUE (pharmacy_id, batch_number)
);

CREATE INDEX IF NOT EXISTS idx_drug_batches_drug_id ON drug_batches(drug_id);
CREATE INDEX IF NOT EXISTS idx_drug_batches_pharmacy_id ON drug_batches(pharmacy_id);

CREATE TABLE IF NOT EXISTS drug_qr_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drug_batch_id uuid NOT NULL REFERENCES drug_batches(id) ON DELETE CASCADE,
  code_string text NOT NULL UNIQUE,
  s3_url text,
  scan_count integer NOT NULL DEFAULT 0,
  status qr_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_drug_qr_codes_drug_batch_id ON drug_qr_codes(drug_batch_id);
CREATE INDEX IF NOT EXISTS idx_drug_qr_codes_status ON drug_qr_codes(status);

CREATE TABLE IF NOT EXISTS drug_consumer_scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drug_qr_code_id uuid NOT NULL REFERENCES drug_qr_codes(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  scanned_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_drug_consumer_scans_drug_qr_code_id ON drug_consumer_scans(drug_qr_code_id);
CREATE INDEX IF NOT EXISTS idx_drug_consumer_scans_user_id ON drug_consumer_scans(user_id);

CREATE TABLE IF NOT EXISTS drug_recall_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drug_batch_id uuid NOT NULL REFERENCES drug_batches(id) ON DELETE CASCADE,
  issued_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_drug_recall_events_drug_batch_id ON drug_recall_events(drug_batch_id);

