-- Dashboard system tables
-- Migration: 001_create_dashboard_tables.sql

CREATE TABLE IF NOT EXISTS dashboards (
  id         VARCHAR(32)  NOT NULL PRIMARY KEY,
  uid        VARCHAR(32)  NOT NULL UNIQUE,
  title      VARCHAR(255) NOT NULL,
  description TEXT,
  tags       JSON,
  variables  JSON NOT NULL,
  time_range JSON NOT NULL,
  refresh_interval VARCHAR(32),
  panels     JSON NOT NULL,
  version    INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_uid (uid)
);

CREATE TABLE IF NOT EXISTS datasources (
  id         VARCHAR(32)  NOT NULL PRIMARY KEY,
  uid        VARCHAR(32)  NOT NULL UNIQUE,
  name       VARCHAR(255) NOT NULL,
  type       VARCHAR(32)  NOT NULL,
  config     JSON NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_type (type)
);
