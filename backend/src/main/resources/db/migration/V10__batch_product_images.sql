ALTER TABLE product_batches ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE drug_batches ADD COLUMN IF NOT EXISTS image_url text;
