DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='marketplace_post_domain') THEN
    CREATE TYPE marketplace_post_domain AS ENUM ('food','drug','farm');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='marketplace_post_status') THEN
    CREATE TYPE marketplace_post_status AS ENUM ('active','flagged','hidden','recalled');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS marketplace_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seller_role user_role NOT NULL,
  domain marketplace_post_domain NOT NULL,
  title text NOT NULL,
  caption text NOT NULL DEFAULT '',
  location text,
  image_url text,
  price_text text,
  hashtags text[] NOT NULL DEFAULT '{}',
  qr_code_string text,
  product_batch_id uuid REFERENCES product_batches(id) ON DELETE SET NULL,
  drug_batch_id uuid REFERENCES drug_batches(id) ON DELETE SET NULL,
  farm_id uuid REFERENCES farms(id) ON DELETE SET NULL,
  safety_status text NOT NULL DEFAULT 'unverified',
  safety_label text NOT NULL DEFAULT 'Pending verification',
  safety_source text NOT NULL DEFAULT 'FoodTrace GH',
  status marketplace_post_status NOT NULL DEFAULT 'active',
  regulator_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketplace_posts_domain ON marketplace_posts(domain);
CREATE INDEX IF NOT EXISTS idx_marketplace_posts_seller ON marketplace_posts(seller_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_posts_created_at ON marketplace_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_posts_status ON marketplace_posts(status);

CREATE TABLE IF NOT EXISTS marketplace_post_likes (
  post_id uuid NOT NULL REFERENCES marketplace_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS marketplace_post_saves (
  post_id uuid NOT NULL REFERENCES marketplace_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS marketplace_post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES marketplace_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketplace_comments_post ON marketplace_post_comments(post_id, created_at DESC);
