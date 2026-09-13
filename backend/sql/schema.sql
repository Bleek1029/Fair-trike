-- ══════════════════════════════════════════════════════════
--  Fairtrike PostgreSQL schema
--
--  HOW TO RUN
--  ----------
--  1) Create the database (run ONCE, from any shell):
--        createdb -U postgres appdev
--     (or in pgAdmin: right-click "Databases" → Create → Database → name = appdev)
--
--  2) Apply this schema to that database:
--        psql -U postgres -d appdev -f backend/sql/schema.sql
--     (in pgAdmin, open the "appdev" database and paste this whole file)
-- ══════════════════════════════════════════════════════════

-- Users table (replaces MySQL `user information`)
CREATE TABLE IF NOT EXISTS users (
    id              SERIAL PRIMARY KEY,
    fullname        VARCHAR(255) NOT NULL,
    email           VARCHAR(191) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    role            VARCHAR(20) NOT NULL DEFAULT 'passenger' CHECK (role IN ('passenger', 'driver')),
    profile_picture VARCHAR(255) DEFAULT NULL,
    created_at      TIMESTAMPTZ   DEFAULT NOW(),
    updated_at      TIMESTAMPTZ   DEFAULT NOW()
);

-- Backfill for databases created before the role column existed.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'role'
    ) THEN
        ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'passenger';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_role_check') THEN
        ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('passenger', 'driver'));
    END IF;
END $$;

-- Driver profiles (one per driver account)
CREATE TABLE IF NOT EXISTS drivers (
    id               SERIAL PRIMARY KEY,
    user_id          INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    license_number   VARCHAR(100) NOT NULL UNIQUE,
    toda_association VARCHAR(255) DEFAULT NULL,
    trike_number     VARCHAR(100) DEFAULT NULL,
    vehicle_plate    VARCHAR(50)  DEFAULT NULL,
    contact_number   VARCHAR(50)  DEFAULT NULL,
    status           VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-update updated_at on UPDATE (like MySQL ON UPDATE CURRENT_TIMESTAMP)
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_updated_at ON users;
CREATE TRIGGER trigger_set_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trigger_set_updated_at_drivers ON drivers;
CREATE TRIGGER trigger_set_updated_at_drivers
BEFORE UPDATE ON drivers
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE users IS 'Fairtrike user accounts';

-- Optional sample user (password: '123456').
-- Generate a bcrypt hash first and paste it in, e.g.:
--   node -e "console.log(require('bcryptjs').hashSync('123456', 12))"
-- INSERT INTO users (fullname, email, password_hash) VALUES
-- ('Dwayne Erolin', 'dwayne@example.com',
--  '$2b$12$replace_with_a_real_bcrypt_hash');