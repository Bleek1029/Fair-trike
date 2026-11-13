import pg from 'pg';
import { env } from './config.js';

const { Pool } = pg;

// Connection pool bound to the app database.
export const pool = new Pool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.database,
  max: 20,
  ssl: env.db.ssl ? { rejectUnauthorized: env.db.sslMode === 'verify-full' } : false,
});

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
    id              SERIAL PRIMARY KEY,
    fullname        VARCHAR(255) NOT NULL,
    email           VARCHAR(191) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    role            VARCHAR(20) NOT NULL DEFAULT 'passenger' CHECK (role IN ('passenger', 'driver', 'admin')),
    status          VARCHAR(20) NOT NULL DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
    profile_picture VARCHAR(255) DEFAULT NULL,
    created_at      TIMESTAMPTZ   DEFAULT NOW(),
    updated_at      TIMESTAMPTZ   DEFAULT NOW()
);

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
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'users_role_check'
          AND pg_get_constraintdef(oid) LIKE '%admin%'
    ) THEN
        ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
        ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('passenger', 'driver', 'admin'));
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS drivers (
    id               SERIAL PRIMARY KEY,
    user_id          INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    license_number   VARCHAR(100) NOT NULL UNIQUE,
    toda_association VARCHAR(255) DEFAULT NULL,
    trike_number     VARCHAR(100) DEFAULT NULL,
    vehicle_plate    VARCHAR(50)  DEFAULT NULL,
    contact_number   VARCHAR(50)  DEFAULT NULL,
    status           VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    last_lat         DOUBLE PRECISION DEFAULT NULL,
    last_lng         DOUBLE PRECISION DEFAULT NULL,
    last_location_at TIMESTAMPTZ    DEFAULT NULL,
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Backfill for databases created before driver live-location columns existed.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'drivers' AND column_name = 'last_lat'
    ) THEN
        ALTER TABLE drivers ADD COLUMN last_lat DOUBLE PRECISION DEFAULT NULL;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'drivers' AND column_name = 'last_lng'
    ) THEN
        ALTER TABLE drivers ADD COLUMN last_lng DOUBLE PRECISION DEFAULT NULL;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'drivers' AND column_name = 'last_location_at'
    ) THEN
        ALTER TABLE drivers ADD COLUMN last_location_at TIMESTAMPTZ DEFAULT NULL;
    END IF;
END $$;

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

-- Rides: booking lifecycle shared between commuter and driver apps.
CREATE TABLE IF NOT EXISTS rides (
    id              SERIAL PRIMARY KEY,
    passenger_name  VARCHAR(120) DEFAULT NULL,
    passenger_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    pickup_label    VARCHAR(255) NOT NULL,
    dropoff_label   VARCHAR(255) NOT NULL,
    pickup_lat      DOUBLE PRECISION NOT NULL,
    pickup_lng      DOUBLE PRECISION NOT NULL,
    dropoff_lat     DOUBLE PRECISION NOT NULL,
    dropoff_lng     DOUBLE PRECISION NOT NULL,
    distance_m      INTEGER NOT NULL DEFAULT 0,
    fare            NUMERIC(10,2) NOT NULL DEFAULT 0,
    status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'accepted', 'completed', 'cancelled')),
    driver_user_id  INTEGER REFERENCES users(id) ON DELETE SET NULL,
    accepted_at     TIMESTAMPTZ DEFAULT NULL,
    completed_at    TIMESTAMPTZ DEFAULT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rides_status ON rides(status);
CREATE INDEX IF NOT EXISTS idx_rides_driver ON rides(driver_user_id, status);

-- Backfill for databases created before passenger_user_id existed.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'rides' AND column_name = 'passenger_user_id'
    ) THEN
        ALTER TABLE rides ADD COLUMN passenger_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
    END IF;
END $$;

DROP TRIGGER IF EXISTS trigger_set_updated_at_rides ON rides;
CREATE TRIGGER trigger_set_updated_at_rides
BEFORE UPDATE ON rides
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Driver documents (license, OR/CR, NBI clearance, TODA clearance…).
CREATE TABLE IF NOT EXISTS driver_documents (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    doc_type    VARCHAR(50) NOT NULL,
    file_path   VARCHAR(255) NOT NULL,
    status      VARCHAR(20) NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Password reset requests (for admin approval flow)
CREATE TABLE IF NOT EXISTS password_reset_requests (
    id                  SERIAL PRIMARY KEY,
    user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email               VARCHAR(191) NOT NULL,
    new_password_hash   VARCHAR(255) NOT NULL,
    status              VARCHAR(20) NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'approved', 'rejected')),
    admin_note          TEXT DEFAULT NULL,
    reviewed_by         INTEGER REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at         TIMESTAMPTZ DEFAULT NULL,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_requests_status ON password_reset_requests(status);
CREATE INDEX IF NOT EXISTS idx_password_reset_requests_user_id ON password_reset_requests(user_id);
`;

function quoteIdent(name) {
  return '"' + String(name).replace(/"/g, '""') + '"';
}

// Idempotent schema bootstrap. Guaranteed to only ever create the app DB once
// per process (guarded by an in-flight promise) and to never leak pools.
let ensureRun = null;
export function ensureDatabase() {
  if (ensureRun) return ensureRun;
  ensureRun = runEnsures().catch((err) => {
    // Allow a retry on the next boot if this one failed.
    ensureRun = null;
    throw err;
  });
  return ensureRun;
}

async function runEnsures() {
  const dbname = env.db.database;
  const admin = new Pool({ ...env.db, database: 'postgres', max: 3 });

  try {
    const exists = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbname]);
    if (exists.rows.length === 0) {
      console.log(`🛠️  Creating database "${dbname}"…`);
      await admin.query(`CREATE DATABASE ${quoteIdent(dbname)}`);
    }
  } catch (err) {
    // Non-fatal: DB may not exist or perms may be restricted; the app pool
    // will fail loudly with a clearer message.
    console.warn('⚠️  Could not auto-create database:', err.message);
  } finally {
    await admin.end();
  }

  const client = new Pool({ ...env.db, max: 3 });
  try {
    await client.query(SCHEMA);
    console.log(`✅ Database "${dbname}" ready (users + drivers tables present).`);
  } catch (err) {
    console.error('❌ Could not apply schema:', err.message);
  } finally {
    await client.end();
  }
}

// Test the connection and log diagnostics (non-fatal).
export async function testConnection() {
  try {
    const res = await pool.query('SELECT NOW() AS now');
    console.log(`✅ PostgreSQL connected — server time: ${res.rows[0].now}`);
    return true;
  } catch (err) {
    console.error('❌ PostgreSQL connection failed:', err.message);
    return false;
  }
}