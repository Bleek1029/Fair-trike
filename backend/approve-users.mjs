// Approve test users
import pg from 'pg';
import { env } from './config.js';

const client = new pg.Client({ ...env.db });
await client.connect();
await client.query('UPDATE users SET status = $1 WHERE email = $2', ['approved', 'admin@fairtrike.com']);
await client.query('UPDATE users SET status = $1 WHERE email = $2', ['approved', 'testuser@example.com']);
console.log('Updated statuses');
await client.end();