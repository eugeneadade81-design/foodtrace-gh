-- Backfill real product photos onto existing demo batches/posts created before
-- image_url existed. Freely-licensed Wikimedia Commons photos, matched by
-- keyword against the product/drug name. Only fills rows that are still blank.

UPDATE product_batches SET image_url = CASE
  WHEN lower(product_name) LIKE '%sobolo%' OR lower(product_name) LIKE '%bissap%'
    OR lower(product_name) LIKE '%hibiscus%' OR lower(product_name) LIKE '%zobo%'
    OR lower(product_name) LIKE '%roselle%' OR lower(product_name) LIKE '%sorrel%'
    THEN 'https://commons.wikimedia.org/wiki/Special:FilePath/Bissap.jpg'
  WHEN lower(product_name) LIKE '%water%'
    THEN 'https://commons.wikimedia.org/wiki/Special:FilePath/Bottled_water.jpg'
  WHEN lower(product_name) LIKE '%tomato%'
    THEN 'https://commons.wikimedia.org/wiki/Special:FilePath/Canned_tomatoes.jpg'
  WHEN lower(product_name) LIKE '%rice%'
    THEN 'https://commons.wikimedia.org/wiki/Special:FilePath/Rice.jpg'
  WHEN lower(product_name) LIKE '%flour%' OR lower(product_name) LIKE '%wheat%'
    THEN 'https://commons.wikimedia.org/wiki/Special:FilePath/Wheat_flour.jpg'
  WHEN lower(product_name) LIKE '%oil%'
    THEN 'https://commons.wikimedia.org/wiki/Special:FilePath/Cooking_oil.jpg'
  WHEN lower(product_name) LIKE '%milk%' OR lower(product_name) LIKE '%dairy%'
    THEN 'https://commons.wikimedia.org/wiki/Special:FilePath/Milk.jpg'
  WHEN lower(product_name) LIKE '%biscuit%' OR lower(product_name) LIKE '%snack%' OR lower(product_name) LIKE '%cookie%'
    THEN 'https://commons.wikimedia.org/wiki/Special:FilePath/Biscuits.jpg'
  WHEN lower(product_name) LIKE '%groundnut%' OR lower(product_name) LIKE '%peanut%' OR lower(product_name) LIKE '%nut%'
    THEN 'https://commons.wikimedia.org/wiki/Special:FilePath/Groundnuts.jpg'
  WHEN lower(product_name) LIKE '%spice%' OR lower(product_name) LIKE '%pepper%' OR lower(product_name) LIKE '%seasoning%'
    THEN 'https://commons.wikimedia.org/wiki/Special:FilePath/Spices.jpg'
  ELSE 'https://commons.wikimedia.org/wiki/Special:FilePath/Rice.jpg'
END
WHERE image_url IS NULL;

UPDATE drug_batches db SET image_url = CASE
  WHEN EXISTS (
    SELECT 1 FROM drugs d WHERE d.id = db.drug_id
      AND (lower(d.name) LIKE '%paracetamol%' OR lower(d.generic_name) LIKE '%paracetamol%')
  ) THEN 'https://commons.wikimedia.org/wiki/Special:FilePath/Paracetamol.jpg'
  ELSE 'https://commons.wikimedia.org/wiki/Special:FilePath/Pills.jpg'
END
WHERE image_url IS NULL;

UPDATE marketplace_posts SET image_url = CASE
  WHEN lower(title) LIKE '%sobolo%' OR lower(title) LIKE '%bissap%'
    OR lower(title) LIKE '%hibiscus%' OR lower(title) LIKE '%zobo%'
    THEN 'https://commons.wikimedia.org/wiki/Special:FilePath/Bissap.jpg'
  WHEN lower(title) LIKE '%water%'
    THEN 'https://commons.wikimedia.org/wiki/Special:FilePath/Bottled_water.jpg'
  WHEN lower(title) LIKE '%tomato%'
    THEN 'https://commons.wikimedia.org/wiki/Special:FilePath/Canned_tomatoes.jpg'
  WHEN domain = 'drug'
    THEN 'https://commons.wikimedia.org/wiki/Special:FilePath/Paracetamol.jpg'
  ELSE 'https://commons.wikimedia.org/wiki/Special:FilePath/Rice.jpg'
END
WHERE image_url IS NULL;
