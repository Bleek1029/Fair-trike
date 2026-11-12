import { pool } from './db.js';
import { getIo, emitRideRequested } from './socket.js';

const base = 'http://localhost:5000/api';

async function test() {
  // Login as passenger
  const pLogin = await fetch(base + '/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'passenger@test.com', password: 'password123' })
  });
  const pData = await pLogin.json();
  console.log('Passenger login:', pData.success ? 'OK' : pData);

  // Login as driver
  const dLogin = await fetch(base + '/auth/login-driver', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'driver@test.com', password: 'password123' })
  });
  const dData = await dLogin.json();
  console.log('Driver login:', dData.success ? 'OK' : dData);

  if (pData.token && dData.token) {
    console.log('\n--- Testing real-time ride request ---');

    // Passenger creates a ride
    const rideRes = await fetch(base + '/rides', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + pData.token
      },
      body: JSON.stringify({
        passenger_name: 'Test Passenger',
        pickup_label: 'SM City Olongapo',
        dropoff_label: 'Robinsons Place Olongapo',
        pickup_coord: { lat: 14.8290, lng: 120.2833 },
        dropoff_coord: { lat: 14.8240, lng: 120.2875 },
        distance_m: 1500,
        ride_type: 'regular'
      })
    });
    const rideData = await rideRes.json();
    console.log('Ride created:', rideData.success ? 'OK - Ride ID: ' + rideData.ride?.id : rideData);

    // Driver checks available rides
    const availRes = await fetch(base + '/rides/available', {
      headers: { 'Authorization': 'Bearer ' + dData.token }
    });
    const availData = await availRes.json();
    console.log('Available rides for driver:', availData.rides?.length || 0, 'rides');
    if (availData.rides?.length > 0) {
      console.log('First ride:', availData.rides[0]);
    }
  }
}

test();