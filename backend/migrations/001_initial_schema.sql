-- Initial schema for Fairtrike
-- Run with: npx node-pg-migrate up

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id              SERIAL PRIMARY KEY,
    fullname        VARCHAR(255) NOT NULL,
    email           VARCHAR(191) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) DEFAULT NULL,        -- nullable for Google sign-in users
    google_id       VARCHAR(255) UNIQUE DEFAULT NULL, -- Google OAuth subject ID
    role            VARCHAR(20) NOT NULL DEFAULT 'passenger' CHECK (role IN ('passenger', 'driver', 'admin')),
    status          VARCHAR(20) NOT NULL DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
    profile_picture VARCHAR(255) DEFAULT NULL,
    created_at      TIMESTAMPTZ   DEFAULT NOW(),
    updated_at      TIMESTAMPTZ   DEFAULT NOW()
);

-- Drivers table
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

-- Rides table
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

-- Driver documents table
CREATE TABLE IF NOT EXISTS driver_documents (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    doc_type    VARCHAR(50) NOT NULL,
    file_path   VARCHAR(255) NOT NULL,
    status      VARCHAR(20) NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Password reset requests table
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

-- Refresh tokens table
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash      VARCHAR(64) NOT NULL,
    user_agent      TEXT,
    ip_address      INET,
    expires_at      TIMESTAMPTZ NOT NULL,
    revoked_at      TIMESTAMPTZ DEFAULT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rides_status ON rides(status);
CREATE INDEX IF NOT EXISTS idx_rides_driver ON rides(driver_user_id, status);
CREATE INDEX IF NOT EXISTS idx_rides_passenger ON rides(passenger_user_id, status);
CREATE INDEX IF NOT EXISTS idx_driver_documents_user_id ON driver_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_driver_documents_status ON driver_documents(status);
CREATE INDEX IF NOT EXISTS idx_password_reset_requests_status ON password_reset_requests(status);
CREATE INDEX IF NOT EXISTS idx_password_reset_requests_user_id ON password_reset_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
DROP TRIGGER IF EXISTS trigger_set_updated_at ON users;
CREATE TRIGGER trigger_set_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trigger_set_updated_at_drivers ON drivers;
CREATE TRIGGER trigger_set_updated_at_drivers
BEFORE UPDATE ON drivers
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trigger_set_updated_at_rides ON rides;
CREATE TRIGGER trigger_set_updated_at_rides
BEFORE UPDATE ON rides
FOR EACH ROW EXECUTE FUNCTION set_updated_at();