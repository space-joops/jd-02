-- 1. Create the `pets` table
CREATE TABLE pets (
    name TEXT PRIMARY KEY,
    secret_token UUID NOT NULL DEFAULT uuid_generate_v4(),
    highest_score INTEGER NOT NULL DEFAULT 0,
    total_score BIGINT NOT NULL DEFAULT 0,
    evolution_lvl INTEGER NOT NULL DEFAULT 1,
    inventory JSONB NOT NULL DEFAULT '{"satellite": 0, "can": 0, "bolt": 0, "spring": 0}'::jsonb,
    stats JSONB NOT NULL DEFAULT '{"fuelLvl": 0, "thrustLvl": 0, "magnetLvl": 0}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_played TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Add an index for quick leaderboard sorting
CREATE INDEX idx_pets_highest_score ON pets(highest_score DESC);
CREATE INDEX idx_pets_total_score ON pets(total_score DESC);

-- 3. Set up Row Level Security (RLS)
-- We'll allow public inserts, but restrict updates to API routes 
-- Actually, since we use Vercel API routes as a trusted server, we can bypass RLS there using a Service Role Key, 
-- OR we can just allow public operations for now and handle auth in our Next.js API layer.
-- For simplicity and speed in MVP, let's disable RLS or allow all on anon, because our Next.js API checks the `secret_token` manually.
ALTER TABLE pets DISABLE ROW LEVEL SECURITY;
