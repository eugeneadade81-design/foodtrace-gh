-- V11 used commons.wikimedia.org/wiki/Special:FilePath/... URLs, which redirect
-- twice (Special:FilePath -> Special:Redirect/file -> upload.wikimedia.org)
-- before serving the image. That extra round-trip was slow enough over a
-- mobile/emulator connection to make the image appear to never load. Point
-- everything at the final upload.wikimedia.org URL directly (one hop).
-- Also swaps Rice.jpg, which turned out to be an unrelated Commons redirect
-- (a photo of a man with pumpkins), for a real rice photo.
--
-- Uses an inline VALUES table rather than a real/temp table so this stays
-- safely re-runnable by SchemaRepairRunner on every boot.

UPDATE product_batches pb SET image_url = f.new_url
FROM (VALUES
  ('https://commons.wikimedia.org/wiki/Special:FilePath/Bissap.jpg', 'https://upload.wikimedia.org/wikipedia/commons/3/3e/Bissap.jpg'),
  ('https://commons.wikimedia.org/wiki/Special:FilePath/Bottled_water.jpg', 'https://upload.wikimedia.org/wikipedia/commons/b/b1/Bottled_water.jpg'),
  ('https://commons.wikimedia.org/wiki/Special:FilePath/Canned_tomatoes.jpg', 'https://upload.wikimedia.org/wikipedia/commons/b/b7/Canned_tomatoes.jpg'),
  ('https://commons.wikimedia.org/wiki/Special:FilePath/Rice.jpg', 'https://upload.wikimedia.org/wikipedia/commons/a/a3/White_rice.jpg'),
  ('https://commons.wikimedia.org/wiki/Special:FilePath/Wheat_flour.jpg', 'https://upload.wikimedia.org/wikipedia/commons/d/df/Wheat_flour.jpg'),
  ('https://commons.wikimedia.org/wiki/Special:FilePath/Cooking_oil.jpg', 'https://upload.wikimedia.org/wikipedia/commons/c/c7/Cooking_oil.jpg'),
  ('https://commons.wikimedia.org/wiki/Special:FilePath/Milk.jpg', 'https://upload.wikimedia.org/wikipedia/commons/a/ad/Glass_of_milk_on_tablecloth.jpg'),
  ('https://commons.wikimedia.org/wiki/Special:FilePath/Biscuits.jpg', 'https://upload.wikimedia.org/wikipedia/commons/a/a8/Biszkopt.jpg'),
  ('https://commons.wikimedia.org/wiki/Special:FilePath/Groundnuts.jpg', 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Groundnuts.jpg'),
  ('https://commons.wikimedia.org/wiki/Special:FilePath/Spices.jpg', 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Spices.jpg'),
  ('https://commons.wikimedia.org/wiki/Special:FilePath/Paracetamol.jpg', 'https://upload.wikimedia.org/wikipedia/commons/4/49/Paracetamol.jpg'),
  ('https://commons.wikimedia.org/wiki/Special:FilePath/Pills.jpg', 'https://upload.wikimedia.org/wikipedia/commons/7/7f/Pills.jpg')
) AS f(old_url, new_url)
WHERE f.old_url = pb.image_url;

UPDATE drug_batches db SET image_url = f.new_url
FROM (VALUES
  ('https://commons.wikimedia.org/wiki/Special:FilePath/Paracetamol.jpg', 'https://upload.wikimedia.org/wikipedia/commons/4/49/Paracetamol.jpg'),
  ('https://commons.wikimedia.org/wiki/Special:FilePath/Pills.jpg', 'https://upload.wikimedia.org/wikipedia/commons/7/7f/Pills.jpg')
) AS f(old_url, new_url)
WHERE f.old_url = db.image_url;

UPDATE marketplace_posts mp SET image_url = f.new_url
FROM (VALUES
  ('https://commons.wikimedia.org/wiki/Special:FilePath/Bissap.jpg', 'https://upload.wikimedia.org/wikipedia/commons/3/3e/Bissap.jpg'),
  ('https://commons.wikimedia.org/wiki/Special:FilePath/Bottled_water.jpg', 'https://upload.wikimedia.org/wikipedia/commons/b/b1/Bottled_water.jpg'),
  ('https://commons.wikimedia.org/wiki/Special:FilePath/Canned_tomatoes.jpg', 'https://upload.wikimedia.org/wikipedia/commons/b/b7/Canned_tomatoes.jpg'),
  ('https://commons.wikimedia.org/wiki/Special:FilePath/Rice.jpg', 'https://upload.wikimedia.org/wikipedia/commons/a/a3/White_rice.jpg'),
  ('https://commons.wikimedia.org/wiki/Special:FilePath/Paracetamol.jpg', 'https://upload.wikimedia.org/wikipedia/commons/4/49/Paracetamol.jpg')
) AS f(old_url, new_url)
WHERE f.old_url = mp.image_url;
