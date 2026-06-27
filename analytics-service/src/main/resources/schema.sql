-- ---------------------------------------------------------------------------
-- FoodTrace GH — local development schema (analytics-service)
--
-- These tables are OWNED by Role 1 (Auth + core DB) in production. The
-- analytics service only ever READS them. This file exists so the service can
-- run end-to-end on a local in-memory H2 database without waiting on Role 1's
-- Postgres — it mirrors the agreed column contract.
--
-- On AWS (Day 11) the datasource points at the shared RDS Postgres and
-- spring.sql.init.mode is set to "never", so this file is NOT executed there.
-- CREATE TABLE IF NOT EXISTS keeps it safe to re-run.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS farms (
    id           BIGINT       PRIMARY KEY,
    name         VARCHAR(150) NOT NULL,
    region       VARCHAR(80)  NOT NULL,
    district     VARCHAR(80),
    owner_name   VARCHAR(120),
    phone_number VARCHAR(20),
    created_at   TIMESTAMP
);

CREATE TABLE IF NOT EXISTS batches (
    id             BIGINT        PRIMARY KEY,
    batch_code     VARCHAR(40)   NOT NULL UNIQUE,
    product_name   VARCHAR(120)  NOT NULL,
    category       VARCHAR(40)   NOT NULL,
    farm_id        BIGINT        NOT NULL,
    status         VARCHAR(20)   NOT NULL,
    quantity_kg    DECIMAL(12,2) NOT NULL,
    unit_price_ghs DECIMAL(10,2),
    harvest_date   DATE          NOT NULL,
    created_at     TIMESTAMP,
    CONSTRAINT fk_batch_farm FOREIGN KEY (farm_id) REFERENCES farms (id)
);

CREATE TABLE IF NOT EXISTS recalls (
    id           BIGINT        PRIMARY KEY,
    recall_code  VARCHAR(40)   NOT NULL UNIQUE,
    batch_id     BIGINT        NOT NULL,
    reason       VARCHAR(500)  NOT NULL,
    severity     VARCHAR(20)   NOT NULL,
    status       VARCHAR(20)   NOT NULL,
    region       VARCHAR(80)   NOT NULL,
    initiated_by VARCHAR(120),
    created_at   TIMESTAMP     NOT NULL,
    resolved_at  TIMESTAMP,
    CONSTRAINT fk_recall_batch FOREIGN KEY (batch_id) REFERENCES batches (id)
);

CREATE TABLE IF NOT EXISTS input_logs (
    id         BIGINT        PRIMARY KEY,
    batch_id   BIGINT        NOT NULL,
    input_type VARCHAR(30)   NOT NULL,
    substance  VARCHAR(120)  NOT NULL,
    quantity   DECIMAL(10,2),
    unit       VARCHAR(10),
    applied_at DATE          NOT NULL,
    approved   BOOLEAN       NOT NULL,
    CONSTRAINT fk_input_batch FOREIGN KEY (batch_id) REFERENCES batches (id)
);

-- Indexes the analytics aggregates lean on (status/region/time grouping).
CREATE INDEX IF NOT EXISTS idx_batches_status   ON batches (status);
CREATE INDEX IF NOT EXISTS idx_batches_farm      ON batches (farm_id);
CREATE INDEX IF NOT EXISTS idx_recalls_status    ON recalls (status);
CREATE INDEX IF NOT EXISTS idx_recalls_region    ON recalls (region);
CREATE INDEX IF NOT EXISTS idx_recalls_created   ON recalls (created_at);
CREATE INDEX IF NOT EXISTS idx_farms_region      ON farms (region);
CREATE INDEX IF NOT EXISTS idx_inputs_batch      ON input_logs (batch_id);
