import { pool } from './db.js';

const base = 'http://localhost:5000/api';

async function test() {
  // Update admin role in database
  await pool.query('UPDATE users SET role = $1 WHERE email = $2', ['admin', 'admin@test.com']);
  console.log('Admin role updated');

  // Login as admin
  const aLogin = await fetch(base + '/auth/login-admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@test.com', password: 'password123' })
  });
  const aData = await aLogin.json();
  console.log('Admin login:', aData);

  if (aData.token) {
    // Approve driver - endpoint uses userId (79), not driverId (28)
    const approve = await fetch(base + '/admin/drivers/79/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + aData.token },
      body: JSON.stringify({ status: 'approved' })
    });
    const approveData = await approve.json();
    console.log('Driver approve:', approveData);
  }
}

test();