import { io } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:5000';
const SOCKET_PATH = '/socket.io';

async function testSocket() {
  // First login to get tokens
  const base = 'http://localhost:5000/api';

  // Login as driver
  const dLogin = await fetch(base + '/auth/login-driver', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'driver@test.com', password: 'password123' })
  });
  const dData = await dLogin.json();
  const driverToken = dData.token;
  console.log('Driver token:', driverToken ? 'OK' : 'FAIL');

  // Login as passenger
  const pLogin = await fetch(base + '/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'passenger@test.com', password: 'password123' })
  });
  const pData = await pLogin.json();
  const passengerToken = pData.token;
  console.log('Passenger token:', passengerToken ? 'OK' : 'FAIL');

  if (!driverToken || !passengerToken) return;

  // Connect driver socket
  console.log('\n--- Connecting driver socket ---');
  const driverSocket = io(SOCKET_URL, {
    path: SOCKET_PATH,
    transports: ['polling', 'websocket'],
    auth: { token: driverToken },
  });

  driverSocket.on('connect', () => {
    console.log('Driver socket connected:', driverSocket.id);
    // Join drivers room to receive ride requests
    driverSocket.emit('join:drivers');
  });

  driverSocket.on('connect_error', (err) => {
    console.error('Driver socket error:', err.message);
  });

  // Listen for ride-requested events
  driverSocket.on('ride-requested', (ride) => {
    console.log('\n🎉 REAL-TIME EVENT RECEIVED: ride-requested');
    console.log('Ride ID:', ride.id);
    console.log('Passenger:', ride.passengerName);
    console.log('Pickup:', ride.pickup);
    console.log('Dropoff:', ride.dropoff);
    console.log('Fare: ₱' + ride.fare);
    console.log('\n✅ REAL-TIME WORKS! Driver got the ride instantly without polling.');

    // Clean up
    driverSocket.disconnect();
    process.exit(0);
  });

  // Wait a moment, then create a ride as passenger
  setTimeout(async () => {
    console.log('\n--- Passenger creating a ride ---');
    const rideRes = await fetch(base + '/rides', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + passengerToken
      },
      body: JSON.stringify({
        passenger_name: 'Test Passenger',
        pickup_label: 'Subic Bay Freeport',
        dropoff_label: 'Olongapo City Hall',
        pickup_coord: { lat: 14.8000, lng: 120.2800 },
        dropoff_coord: { lat: 14.8300, lng: 120.2800 },
        distance_m: 3500,
        ride_type: 'regular'
      })
    });
    const rideData = await rideRes.json();
    console.log('Ride created:', rideData.ride?.id ? 'OK - Ride ID: ' + rideData.ride.id : rideData);
  }, 2000);

  // Timeout after 10 seconds
  setTimeout(() => {
    console.log('\n❌ TIMEOUT: No ride-requested event received');
    driverSocket.disconnect();
    process.exit(1);
  }, 10000);
}

testSocket();