import { io } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:5000';
const SOCKET_PATH = '/socket.io';

async function testSocket() {
  const base = 'http://localhost:5000/api';

  // Login as driver
  const dLogin = await fetch(base + '/auth/login-driver', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'driver@test.com', password: 'password123' })
  });
  const dData = await dLogin.json();
  const driverToken = dData.token;

  // Login as passenger
  const pLogin = await fetch(base + '/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'passenger@test.com', password: 'password123' })
  });
  const pData = await pLogin.json();
  const passengerToken = pData.token;

  if (!driverToken || !passengerToken) return;

  // Connect passenger socket
  console.log('--- Connecting passenger socket ---');
  const passengerSocket = io(SOCKET_URL, {
    path: SOCKET_PATH,
    transports: ['polling', 'websocket'],
    auth: { token: passengerToken },
  });

  passengerSocket.on('connect', () => {
    console.log('Passenger socket connected:', passengerSocket.id);
  });

  passengerSocket.on('connect_error', (err) => {
    console.error('Passenger socket error:', err.message);
  });

  // Step 1: Passenger creates a ride
  console.log('\n--- Passenger creating a ride ---');
  const rideRes = await fetch(base + '/rides', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + passengerToken
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
  const rideId = rideData.ride.id;
  console.log('Ride created:', rideId);

  // Join the ride room
  passengerSocket.emit('join:ride', rideId);

  // Listen for ride-accepted event
  passengerSocket.on('ride-accepted', (data) => {
    console.log('\n🎉 PASSENGER REAL-TIME EVENT: ride-accepted');
    console.log('Ride ID:', data.rideId);
    console.log('Driver Name:', data.driverName);
    console.log('Driver Avatar:', data.driverAvatar);
    console.log('\n✅ PASSENGER SEES DRIVER PROFILE INSTANTLY!');

    // Clean up and exit
    passengerSocket.disconnect();
    process.exit(0);
  });

  // Step 2: Driver accepts the ride (after a short delay)
  setTimeout(async () => {
    console.log('\n--- Driver accepting ride ---');
    const acceptRes = await fetch(base + '/rides/' + rideId + '/accept', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + driverToken }
    });
    const acceptData = await acceptRes.json();
    console.log('Driver accepted:', acceptData.message);
  }, 2000);

  // Timeout after 10 seconds
  setTimeout(() => {
    console.log('\n❌ TIMEOUT: No ride-accepted event received');
    passengerSocket.disconnect();
    process.exit(1);
  }, 10000);
}

testSocket();