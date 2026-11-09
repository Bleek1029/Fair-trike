import { pool } from '../backend/db.js';

const mockQuery = async (sql, params) => {
  return { rows: [{ id: 999, passenger_name: 'T', pickup_label: 'A', dropoff_label: 'B', pickup_lat: 1, pickup_lng: 1, dropoff_lat: 2, dropoff_lng: 2, distance_m: 10, fare: 30, status: 'pending', driver_user_id: null, accepted_at: null, completed_at: null, created_at: new Date().toISOString() }] };
};

try {
  pool.query = mockQuery;
  console.log('pool.query assigned successfully');
} catch (err) {
  console.log('pool.query assignment failed:', err.message);
}

try {
  const mod = await import('../backend/routes/rides.js');
  console.log('rides module imported:', mod ? 'yes' : 'no');
} catch (err) {
  console.log('routes import failed:', err.message);
}