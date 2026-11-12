import { pool } from './db.js';
import bcrypt from 'bcryptjs';

// Create an admin user for testing
const adminEmail = 'testadmin-' + Date.now() + '@example.com';
const adminPass = 'AdminPass123!';
const hash = await bcrypt.hash(adminPass, 12);
await pool.query(
  "INSERT INTO users (fullname, email, password_hash, role) VALUES ($1, $2, $3, 'admin') RETURNING id, email, role",
  ['Test Admin', adminEmail, hash]
);
console.log('Created admin:', adminEmail, 'password:', adminPass);
await pool.end();