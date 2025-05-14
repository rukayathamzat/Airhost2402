-- Enable AI features
ALTER TABLE apartments 
  ADD COLUMN ai_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN last_ai_used TIMESTAMPTZ;

CREATE INDEX idx_ai_enabled ON apartments(ai_enabled);
