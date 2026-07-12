-- ---------------------------------------------------------------------------
-- FoodTrace GH — local development seed data (analytics-service)
--
-- Mirrors the column contract in schema.sql. This lets the analytics service
-- run with realistic numbers locally without waiting on Role 1's Postgres.
-- On AWS (Day 11) spring.sql.init.mode is "never", so this is NOT executed
-- against the shared RDS instance.
--
-- DELETE-before-INSERT keeps the seed idempotent across restarts (ddl-auto is
-- "none", so the tables persist for the life of the in-memory DB).
-- ---------------------------------------------------------------------------

DELETE FROM input_logs;
DELETE FROM recalls;
DELETE FROM batches;
DELETE FROM farms;

-- Farms: 10 across Ghana's main agricultural regions ----------------------
INSERT INTO farms (id, name, region, district, owner_name, phone_number, created_at) VALUES
 (1,  'Asante Akyem Organic Farms', 'Ashanti',        'Asante Akyem North', 'Kwame Boateng',   '+233241000001', TIMESTAMP '2025-01-12 08:00:00'),
 (2,  'Pru Valley Poultry',         'Bono East',      'Pru',                'Ama Serwaa',      '+233241000002', TIMESTAMP '2025-01-20 08:00:00'),
 (3,  'Keta Lagoon Aquaculture',    'Volta',          'Keta',               'Yao Mensah',      '+233241000003', TIMESTAMP '2025-02-03 08:00:00'),
 (4,  'Tamale Greenbelt Gardens',   'Northern',       'Tamale',             'Fuseini Iddrisu', '+233241000004', TIMESTAMP '2025-02-15 08:00:00'),
 (5,  'Wenchi Tomato Cooperative',  'Bono',           'Wenchi',             'Akosua Owusu',    '+233241000005', TIMESTAMP '2025-02-28 08:00:00'),
 (6,  'Cape Coast Shore Fisheries', 'Central',        'Cape Coast',         'Esi Quayson',     '+233241000006', TIMESTAMP '2025-03-10 08:00:00'),
 (7,  'Kintampo Maize & Grains',    'Bono East',      'Kintampo North',     'Mohammed Awal',   '+233241000007', TIMESTAMP '2025-03-22 08:00:00'),
 (8,  'Dodowa Vegetable Estate',    'Greater Accra',  'Shai Osudoku',       'Naa Adoley',      '+233241000008', TIMESTAMP '2025-04-05 08:00:00'),
 (9,  'Sunyani Citrus Orchards',    'Bono',           'Sunyani West',       'Kojo Antwi',      '+233241000009', TIMESTAMP '2025-04-18 08:00:00'),
 (10, 'Ho Highland Piggery',        'Volta',          'Ho',                 'Selorm Agbeko',   '+233241000010', TIMESTAMP '2025-05-01 08:00:00');

-- Batches: 30 lots across all 10 farms and all 6 lifecycle statuses ---------
-- (HARVESTED, IN_TRANSIT, AT_MARKET, SOLD, FLAGGED, RECALLED) so the Day 9
-- "Batches by Status" chart has every bucket populated.
INSERT INTO batches (id, batch_code, product_name, category, farm_id, status, quantity_kg, unit_price_ghs, harvest_date, created_at) VALUES
 (1,  'FT-VEG-0001', 'Cabbage',          'VEGETABLE',   1,  'SOLD',       1200.00,  4.50, DATE '2025-05-15', TIMESTAMP '2025-05-15 09:00:00'),
 (2,  'FT-VEG-0002', 'Carrots',          'VEGETABLE',   1,  'AT_MARKET',   850.00,  6.00, DATE '2025-09-02', TIMESTAMP '2025-09-02 09:00:00'),
 (3,  'FT-VEG-0003', 'Sweet Pepper',     'VEGETABLE',   1,  'HARVESTED',   400.00,  9.00, DATE '2026-01-10', TIMESTAMP '2026-01-10 09:00:00'),
 (4,  'FT-PLT-0004', 'Broiler Chicken',  'POULTRY',     2,  'SOLD',       2000.00, 22.00, DATE '2025-06-04', TIMESTAMP '2025-06-04 09:00:00'),
 (5,  'FT-PLT-0005', 'Table Eggs',       'POULTRY',     2,  'AT_MARKET',   600.00, 18.00, DATE '2025-10-01', TIMESTAMP '2025-10-01 09:00:00'),
 (6,  'FT-PLT-0006', 'Spent Layers',     'POULTRY',     2,  'IN_TRANSIT',  450.00, 15.00, DATE '2026-02-12', TIMESTAMP '2026-02-12 09:00:00'),
 (7,  'FT-AQU-0007', 'Tilapia',          'AQUACULTURE', 3,  'RECALLED',   1500.00, 28.00, DATE '2025-07-08', TIMESTAMP '2025-07-08 09:00:00'),
 (8,  'FT-AQU-0008', 'Catfish',          'AQUACULTURE', 3,  'SOLD',        900.00, 25.00, DATE '2025-11-03', TIMESTAMP '2025-11-03 09:00:00'),
 (9,  'FT-AQU-0009', 'Tilapia',          'AQUACULTURE', 3,  'HARVESTED',  1100.00, 28.00, DATE '2026-03-05', TIMESTAMP '2026-03-05 09:00:00'),
 (10, 'FT-VEG-0010', 'Onions',           'VEGETABLE',   4,  'SOLD',       1800.00,  7.50, DATE '2025-05-20', TIMESTAMP '2025-05-20 09:00:00'),
 (11, 'FT-VEG-0011', 'Okra',             'VEGETABLE',   4,  'FLAGGED',     500.00,  8.00, DATE '2025-08-18', TIMESTAMP '2025-08-18 09:00:00'),
 (12, 'FT-VEG-0012', 'Leafy Greens',     'VEGETABLE',   4,  'AT_MARKET',   300.00, 10.00, DATE '2026-02-25', TIMESTAMP '2026-02-25 09:00:00'),
 (13, 'FT-VEG-0013', 'Tomatoes',         'VEGETABLE',   5,  'RECALLED',   3000.00,  5.00, DATE '2025-07-12', TIMESTAMP '2025-07-12 09:00:00'),
 (14, 'FT-VEG-0014', 'Tomatoes',         'VEGETABLE',   5,  'SOLD',       2800.00,  5.00, DATE '2025-12-01', TIMESTAMP '2025-12-01 09:00:00'),
 (15, 'FT-VEG-0015', 'Tomatoes',         'VEGETABLE',   5,  'IN_TRANSIT', 2600.00,  5.50, DATE '2026-03-20', TIMESTAMP '2026-03-20 09:00:00'),
 (16, 'FT-AQU-0016', 'Sea Bream',        'AQUACULTURE', 6,  'SOLD',       1300.00, 32.00, DATE '2025-06-22', TIMESTAMP '2025-06-22 09:00:00'),
 (17, 'FT-AQU-0017', 'Mackerel',         'AQUACULTURE', 6,  'AT_MARKET',  1700.00, 20.00, DATE '2025-10-14', TIMESTAMP '2025-10-14 09:00:00'),
 (18, 'FT-AQU-0018', 'Sea Bream',        'AQUACULTURE', 6,  'FLAGGED',     950.00, 32.00, DATE '2026-01-28', TIMESTAMP '2026-01-28 09:00:00'),
 (19, 'FT-GRN-0019', 'Maize',            'GRAIN',       7,  'SOLD',       5000.00,  3.20, DATE '2025-05-30', TIMESTAMP '2025-05-30 09:00:00'),
 (20, 'FT-GRN-0020', 'Maize',            'GRAIN',       7,  'HARVESTED',  4800.00,  3.20, DATE '2025-11-18', TIMESTAMP '2025-11-18 09:00:00'),
 (21, 'FT-GRN-0021', 'Soybean',          'GRAIN',       7,  'IN_TRANSIT', 2200.00,  6.80, DATE '2026-02-08', TIMESTAMP '2026-02-08 09:00:00'),
 (22, 'FT-VEG-0022', 'Lettuce',          'VEGETABLE',   8,  'RECALLED',    700.00,  6.50, DATE '2025-08-25', TIMESTAMP '2025-08-25 09:00:00'),
 (23, 'FT-VEG-0023', 'Spring Onion',     'VEGETABLE',   8,  'SOLD',        420.00,  9.50, DATE '2025-12-15', TIMESTAMP '2025-12-15 09:00:00'),
 (24, 'FT-VEG-0024', 'Cucumber',         'VEGETABLE',   8,  'AT_MARKET',   880.00,  7.00, DATE '2026-03-12', TIMESTAMP '2026-03-12 09:00:00'),
 (25, 'FT-FRT-0025', 'Sweet Orange',     'FRUIT',       9,  'SOLD',       3500.00,  4.00, DATE '2025-07-01', TIMESTAMP '2025-07-01 09:00:00'),
 (26, 'FT-FRT-0026', 'Tangerine',        'FRUIT',       9,  'HARVESTED',  2900.00,  4.50, DATE '2026-01-05', TIMESTAMP '2026-01-05 09:00:00'),
 (27, 'FT-FRT-0027', 'Sweet Orange',     'FRUIT',       9,  'FLAGGED',    3100.00,  4.00, DATE '2026-02-19', TIMESTAMP '2026-02-19 09:00:00'),
 (28, 'FT-LVS-0028', 'Pork Carcass',     'LIVESTOCK',   10, 'RECALLED',   1600.00, 30.00, DATE '2025-09-10', TIMESTAMP '2025-09-10 09:00:00'),
 (29, 'FT-LVS-0029', 'Pork Carcass',     'LIVESTOCK',   10, 'SOLD',       1750.00, 30.00, DATE '2025-12-20', TIMESTAMP '2025-12-20 09:00:00'),
 (30, 'FT-LVS-0030', 'Weaner Piglets',   'LIVESTOCK',   10, 'IN_TRANSIT',  500.00, 45.00, DATE '2026-03-28', TIMESTAMP '2026-03-28 09:00:00');

-- Recalls: 5 raised against affected batches. region mirrors the batch's farm
-- region; created_at spread across months for the "Recalls by Month" chart.
INSERT INTO recalls (id, recall_code, batch_id, reason, severity, status, region, initiated_by, created_at, resolved_at) VALUES
 (1, 'RCL-2025-001', 7,  'Elevated heavy-metal (lead) levels detected in pond water sampling.',        'CRITICAL', 'RESOLVED',  'Volta',         'FDA Ghana - V. Adjei',   TIMESTAMP '2025-07-15 10:30:00', TIMESTAMP '2025-08-02 16:00:00'),
 (2, 'RCL-2025-002', 13, 'Unapproved pesticide residue (monocrotophos) above MRL on tomatoes.',         'HIGH',     'RESOLVED',  'Bono',          'FDA Ghana - K. Mensah',  TIMESTAMP '2025-07-20 11:00:00', TIMESTAMP '2025-08-10 14:00:00'),
 (3, 'RCL-2025-003', 22, 'E. coli contamination traced to irrigation water on leafy greens.',           'HIGH',     'ACTIVE',    'Greater Accra', 'GSA - A. Boateng',       TIMESTAMP '2025-09-01 09:15:00', NULL),
 (4, 'RCL-2025-004', 28, 'Antibiotic withdrawal period not observed before slaughter (pork).',          'MEDIUM',   'ACTIVE',    'Volta',         'FDA Ghana - V. Adjei',   TIMESTAMP '2025-09-18 13:45:00', NULL),
 (5, 'RCL-2026-005', 18, 'Histamine levels exceeding safe threshold in sea bream (cold-chain break).',  'CRITICAL', 'DRAFT',     'Central',       'FDA Ghana - E. Quayson', TIMESTAMP '2026-02-02 08:30:00', NULL);

-- Seeded ids above are explicit (1-5); restart the identity so API-created
-- recalls (Day 5) get ids from 6 upward without colliding.
ALTER TABLE recalls ALTER COLUMN id RESTART WITH 6;

-- Input logs: agricultural inputs applied per batch. The unapproved rows
-- (approved = FALSE) are the compliance flags surfaced by findByApprovedFalse()
-- and line up with the recall reasons above.
INSERT INTO input_logs (id, batch_id, input_type, substance, quantity, unit, applied_at, approved) VALUES
 (1,  1,  'FERTILIZER',      'NPK 15-15-15',          50.00, 'kg', DATE '2025-04-20', TRUE),
 (2,  1,  'PESTICIDE',       'Lambda-cyhalothrin',     2.50, 'L',  DATE '2025-05-01', TRUE),
 (3,  4,  'FEED',            'Layer Mash',           300.00, 'kg', DATE '2025-05-25', TRUE),
 (4,  4,  'VET_DRUG',        'Newcastle Vaccine',      1.00, 'L',  DATE '2025-05-10', TRUE),
 (5,  7,  'WATER_TREATMENT', 'Copper Sulphate',        3.00, 'kg', DATE '2025-06-15', TRUE),
 (6,  7,  'FEED',            'Floating Fish Feed',   400.00, 'kg', DATE '2025-06-25', TRUE),
 (7,  13, 'PESTICIDE',       'Monocrotophos',          1.80, 'L',  DATE '2025-06-28', FALSE),
 (8,  13, 'FERTILIZER',      'Urea',                  80.00, 'kg', DATE '2025-06-10', TRUE),
 (9,  11, 'HERBICIDE',       'Paraquat',               2.00, 'L',  DATE '2025-08-05', FALSE),
 (10, 19, 'FERTILIZER',      'NPK 23-10-05',         120.00, 'kg', DATE '2025-05-12', TRUE),
 (11, 22, 'WATER_TREATMENT', 'Untreated Borehole',    NULL,  NULL, DATE '2025-08-15', FALSE),
 (12, 25, 'PESTICIDE',       'Mancozeb',               4.00, 'kg', DATE '2025-06-10', TRUE),
 (13, 28, 'VET_DRUG',        'Oxytetracycline',        0.50, 'L',  DATE '2025-09-05', FALSE),
 (14, 28, 'FEED',            'Pig Grower Pellets',   500.00, 'kg', DATE '2025-08-20', TRUE),
 (15, 18, 'FEED',            'Marine Fish Feed',     350.00, 'kg', DATE '2026-01-15', TRUE),
 (16, 16, 'WATER_TREATMENT', 'Aerated Sea Pen',       NULL,  NULL, DATE '2025-06-10', TRUE);
