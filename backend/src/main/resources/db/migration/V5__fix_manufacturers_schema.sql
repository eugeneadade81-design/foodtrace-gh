-- Ensure subscription_tier enum type exists
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_tier') THEN
    CREATE TYPE subscription_tier AS ENUM ('micro', 'small', 'medium', 'large');
  END IF;
END $$;

-- Add all potentially missing columns to manufacturers
ALTER TABLE manufacturers
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS sector text,
  ADD COLUMN IF NOT EXISTS subscription_tier subscription_tier NOT NULL DEFAULT 'micro',
  ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

-- Add index on user_id if missing
CREATE INDEX IF NOT EXISTS idx_manufacturers_user_id ON manufacturers(user_id);

-- Add missing columns to pharmacies
ALTER TABLE pharmacies
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS district text,
  ADD COLUMN IF NOT EXISTS region text,
  ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_pharmacies_user_id ON pharmacies(user_id);
