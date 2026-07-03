-- Marketplace posts now require regulator approval before going public.
-- Add a 'pending' state to the status enum (idempotent).
ALTER TYPE marketplace_post_status ADD VALUE IF NOT EXISTS 'pending';
