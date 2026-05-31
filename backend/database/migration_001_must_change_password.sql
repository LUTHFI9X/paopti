-- Migration 001: Force password change for admin-created accounts
-- Run once. Safe to run multiple times (uses IF NOT EXISTS checks).

USE spi_hub;

-- Add must_change_password column if missing
SET @col := (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'must_change_password'
);
SET @sql := IF(@col = 0,
  'ALTER TABLE users ADD COLUMN must_change_password TINYINT(1) NOT NULL DEFAULT 0',
  'SELECT "must_change_password already exists" AS msg');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add password_changed_at column if missing
SET @col := (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'password_changed_at'
);
SET @sql := IF(@col = 0,
  'ALTER TABLE users ADD COLUMN password_changed_at TIMESTAMP NULL',
  'SELECT "password_changed_at already exists" AS msg');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
