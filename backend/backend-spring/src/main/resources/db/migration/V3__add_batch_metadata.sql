ALTER TABLE product_batches
  ADD COLUMN IF NOT EXISTS product_name text,
  ADD COLUMN IF NOT EXISTS farm_origin text;

