DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_tier') THEN
    CREATE TYPE subscription_tier AS ENUM ('micro', 'small', 'medium', 'large');
  END IF;
END $$;

ALTER TABLE manufacturers
  ADD COLUMN IF NOT EXISTS subscription_tier subscription_tier NOT NULL DEFAULT 'micro';
