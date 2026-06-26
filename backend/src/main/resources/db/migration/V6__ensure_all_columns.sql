-- Comprehensive, non-destructive schema reconciliation.
-- The Render database was created from an earlier partial schema, so several
-- tables are missing columns the application queries. Every statement here is
-- idempotent (enum types guarded by DO blocks, ADD COLUMN IF NOT EXISTS), so it
-- safely fills gaps without touching existing data on repeated runs.

-- ── Enum types ────────────────────────────────────────────────────────────────
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='user_role') THEN CREATE TYPE user_role AS ENUM ('consumer','farmer','manufacturer','regulator','pharmacist'); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='badge_status') THEN CREATE TYPE badge_status AS ENUM ('none','certified'); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='recall_status') THEN CREATE TYPE recall_status AS ENUM ('active','recalled','under_investigation'); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='qr_status') THEN CREATE TYPE qr_status AS ENUM ('active','recalled','invalidated','under_investigation'); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='report_status') THEN CREATE TYPE report_status AS ENUM ('pending','reviewing','resolved','dismissed'); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='input_type') THEN CREATE TYPE input_type AS ENUM ('pesticide','fertilizer','seed','irrigation','other'); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='epa_status') THEN CREATE TYPE epa_status AS ENUM ('approved','banned','restricted','unverified'); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='verification_status') THEN CREATE TYPE verification_status AS ENUM ('pending','verified','rejected','suspended'); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='farm_cycle_status') THEN CREATE TYPE farm_cycle_status AS ENUM ('growing','ready','harvested'); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='product_batch_status') THEN CREATE TYPE product_batch_status AS ENUM ('active','recalled','under_investigation','expired'); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='drug_approval_status') THEN CREATE TYPE drug_approval_status AS ENUM ('approved','banned','restricted','under_review','not_approved'); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='subscription_tier') THEN CREATE TYPE subscription_tier AS ENUM ('micro','small','medium','large'); END IF; END $$;

-- ── farms ─────────────────────────────────────────────────────────────────────
ALTER TABLE farms
  ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS district text,
  ADD COLUMN IF NOT EXISTS region text,
  ADD COLUMN IF NOT EXISTS size_acres numeric(10,2),
  ADD COLUMN IF NOT EXISTS crop_types text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS epa_registration_number text,
  ADD COLUMN IF NOT EXISTS verification_status verification_status NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS badge_status badge_status NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

-- ── crop_cycles ───────────────────────────────────────────────────────────────
ALTER TABLE crop_cycles
  ADD COLUMN IF NOT EXISTS farm_id uuid REFERENCES farms(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS crop_type text,
  ADD COLUMN IF NOT EXISTS planting_date date,
  ADD COLUMN IF NOT EXISTS harvest_date date,
  ADD COLUMN IF NOT EXISTS market_ready boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS market_ready_at timestamptz,
  ADD COLUMN IF NOT EXISTS status farm_cycle_status NOT NULL DEFAULT 'growing',
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

-- ── input_logs ────────────────────────────────────────────────────────────────
ALTER TABLE input_logs
  ADD COLUMN IF NOT EXISTS crop_cycle_id uuid REFERENCES crop_cycles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS input_type input_type NOT NULL DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS product_name text,
  ADD COLUMN IF NOT EXISTS epa_approval_status epa_status NOT NULL DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS application_date date,
  ADD COLUMN IF NOT EXISTS concentration numeric(12,4),
  ADD COLUMN IF NOT EXISTS unit text,
  ADD COLUMN IF NOT EXISTS withdrawal_period_days integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS safe_harvest_date date,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

-- ── manufacturers ─────────────────────────────────────────────────────────────
ALTER TABLE manufacturers
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS company_name text,
  ADD COLUMN IF NOT EXISTS fda_registration_number text,
  ADD COLUMN IF NOT EXISTS sector text,
  ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS subscription_tier subscription_tier NOT NULL DEFAULT 'micro',
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

-- ── product_batches ───────────────────────────────────────────────────────────
ALTER TABLE product_batches
  ADD COLUMN IF NOT EXISTS manufacturer_id uuid REFERENCES manufacturers(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS batch_number text,
  ADD COLUMN IF NOT EXISTS product_name text,
  ADD COLUMN IF NOT EXISTS farm_origin text,
  ADD COLUMN IF NOT EXISTS ingredient_sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS processing_steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS quality_checks jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS packaging_date date,
  ADD COLUMN IF NOT EXISTS expiry_date date,
  ADD COLUMN IF NOT EXISTS recall_status recall_status NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS recall_reason text,
  ADD COLUMN IF NOT EXISTS recalled_at timestamptz,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

-- ── qr_codes ──────────────────────────────────────────────────────────────────
ALTER TABLE qr_codes
  ADD COLUMN IF NOT EXISTS batch_id uuid REFERENCES product_batches(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS code_string text,
  ADD COLUMN IF NOT EXISTS s3_url text,
  ADD COLUMN IF NOT EXISTS scan_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status qr_status NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

-- ── consumer_reports ──────────────────────────────────────────────────────────
ALTER TABLE consumer_reports
  ADD COLUMN IF NOT EXISTS qr_code_id uuid REFERENCES qr_codes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reporter_id uuid REFERENCES users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS photo_url text,
  ADD COLUMN IF NOT EXISTS district text,
  ADD COLUMN IF NOT EXISTS status report_status NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

-- ── recall_events ─────────────────────────────────────────────────────────────
ALTER TABLE recall_events
  ADD COLUMN IF NOT EXISTS batch_id uuid REFERENCES product_batches(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS issued_by uuid REFERENCES users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS recall_type text,
  ADD COLUMN IF NOT EXISTS reason text,
  ADD COLUMN IF NOT EXISTS scope_districts text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS notification_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

-- ── pharmacies ────────────────────────────────────────────────────────────────
ALTER TABLE pharmacies
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS business_name text,
  ADD COLUMN IF NOT EXISTS ghana_pharmacy_council_number text,
  ADD COLUMN IF NOT EXISTS district text,
  ADD COLUMN IF NOT EXISTS region text,
  ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

-- ── drugs ─────────────────────────────────────────────────────────────────────
ALTER TABLE drugs
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS generic_name text,
  ADD COLUMN IF NOT EXISTS manufacturer_name text,
  ADD COLUMN IF NOT EXISTS fda_drug_registration_number text,
  ADD COLUMN IF NOT EXISTS drug_class text,
  ADD COLUMN IF NOT EXISTS dosage_form text,
  ADD COLUMN IF NOT EXISTS strength text,
  ADD COLUMN IF NOT EXISTS requires_prescription boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_controlled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS fda_approval_status drug_approval_status NOT NULL DEFAULT 'under_review',
  ADD COLUMN IF NOT EXISTS storage_conditions text,
  ADD COLUMN IF NOT EXISTS side_effects_summary text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS last_updated timestamptz;

-- ── drug_batches ──────────────────────────────────────────────────────────────
ALTER TABLE drug_batches
  ADD COLUMN IF NOT EXISTS drug_id uuid REFERENCES drugs(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS pharmacy_id uuid REFERENCES pharmacies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS batch_number text,
  ADD COLUMN IF NOT EXISTS manufacture_date date,
  ADD COLUMN IF NOT EXISTS expiry_date date,
  ADD COLUMN IF NOT EXISTS quantity_received integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quantity_remaining integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS supplier_name text,
  ADD COLUMN IF NOT EXISTS recall_status recall_status NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

-- ── drug_qr_codes ─────────────────────────────────────────────────────────────
ALTER TABLE drug_qr_codes
  ADD COLUMN IF NOT EXISTS drug_batch_id uuid REFERENCES drug_batches(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS code_string text,
  ADD COLUMN IF NOT EXISTS s3_url text,
  ADD COLUMN IF NOT EXISTS scan_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status qr_status NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
