#!/usr/bin/env node
// Create admin user for Fairtrike
import pg from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const { Pool } = pg;

const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: Number.parseInt(process.env.PGPORT, 10) || 5432,
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || '',
  database: process.env.PGDATABASE || 'appdev',
  max: 3,
});

async function createAdmin() {
  const email = process.argv[2] || 'admin@fairtrike.test';
  const password = process.argv[3] || 'admin123';
  const fullname = process.argv[4] || 'Administrator';

  try {
    // Check if admin already exists
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      console.log(`✅ Admin user already exists: ${email}`);
      return;
    }

    const hash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      `INSERT INTO users (fullname, email, password_hash, role)
       VALUES ($1, $2, $3, 'admin')
       RETURNING id, email, fullname, role`,
      [fullname, email, hash]
    );

    console.log(`✅ Admin user created:`);
    console.log(`   Email:    ${result.rows[0].email}`);
    console.log(`   Password: ${password}`);
    console.log(`   Name:     ${result.rows[0].fullname}`);
    console.log(`   Role:     ${result.rows[0].role}`);
  } catch (err) {
    console.error('❌ Failed to create admin:', err.message);
  } finally {
    await pool.end();
  }
}

createAdmin();