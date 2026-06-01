-- 家世—福德—压力三维系统 DDL (PostgreSQL)
CREATE TABLE IF NOT EXISTS family_background_config (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  order_no INT NOT NULL,
  effective_order INT NOT NULL,
  bloodline VARCHAR(16) NOT NULL,
  line_restriction VARCHAR(32) NOT NULL,
  initial_prestige INT NOT NULL,
  initial_resource INT NOT NULL,
  starting_rank VARCHAR(64) NOT NULL,
  event_weight NUMERIC(6,3) NOT NULL,
  equivalent_to VARCHAR(64),
  clear_reward_rewrite_to VARCHAR(64),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS route_stress_config (
  route_id VARCHAR(32) PRIMARY KEY,
  route_name VARCHAR(64) NOT NULL,
  base_stress_increase_per_month INT NOT NULL,
  relief_threshold INT NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS character_dimension_state (
  character_id VARCHAR(64) PRIMARY KEY,
  route_id VARCHAR(32) NOT NULL,
  family_background_id VARCHAR(64) NOT NULL,
  bloodline VARCHAR(16) NOT NULL,
  fortune INT NOT NULL CHECK (fortune BETWEEN -20 AND 20),
  stress INT NOT NULL CHECK (stress BETWEEN 0 AND 100),
  pregnant BOOLEAN NOT NULL,
  months_pregnant INT NOT NULL,
  in_crown_prince_pool BOOLEAN NOT NULL,
  prestige INT NOT NULL,
  resources INT NOT NULL,
  current_rank VARCHAR(64) NOT NULL,
  chenyuansucuo_completed BOOLEAN NOT NULL,
  verified_bloodline_replacement BOOLEAN NOT NULL,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS character_snapshot (
  snapshot_id UUID PRIMARY KEY,
  character_id VARCHAR(64) NOT NULL,
  node VARCHAR(32) NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_snapshot_character_time ON character_snapshot (character_id, created_at DESC);

CREATE TABLE IF NOT EXISTS fortune_audit_log (
  audit_id UUID PRIMARY KEY,
  character_id VARCHAR(64) NOT NULL,
  action VARCHAR(64) NOT NULL,
  operator VARCHAR(64) NOT NULL,
  delta INT,
  details JSONB,
  created_at TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_fortune_audit_character_time ON fortune_audit_log (character_id, created_at DESC);
