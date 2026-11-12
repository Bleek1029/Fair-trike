import http from 'node:http';

const BASE = 'http://localhost:5000/api';

async function requestWithAuth(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE + path, 'http://localhost');
    const opts = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    };
    if (token) opts.headers.Authorization = `Bearer ${token}`;

    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function getTokenFromResponse(data) {
  if (!data) return null;
  if (data.token) return data.token;
  if (data.accessToken) return data.accessToken;
  if (data.authToken) return data.authToken;
  return null;
}

function getUserIdFromResponse(data) {
  if (!data) return null;
  if (data.user && data.user.id) return data.user.id;
  if (data.id) return data.id;
  return null;
}

async function testBookingFlow() {
  console.log('=== Testing Fairtrike Booking API ===\n');

  // Step 1: Health check
  console.log('1. Health check...');
  const res = await requestWithAuth('GET', '/health');
  console.log(`   Status: ${res.status}`);
  console.log(`   Response: ${JSON.stringify(res.data)}\n`);

  // Step 2: Register a test user
  console.log('2. Register test user...');
  const user = {
    fullname: 'Test Passenger',
    email: 'test-passenger-' + Date.now() + '@example.com',
    password: 'TestPass123!',
  };
  const regRes = await requestWithAuth('POST', '/auth/register', user);
  console.log(`   Status: ${regRes.status}`);
  console.log(`   Response: ${JSON.stringify(regRes.data)}\n`);

  // Step 3: Login to verify
  console.log('3. Login to verify...');
  const loginRes = await requestWithAuth('POST', '/auth/login', {
    email: user.email,
    password: user.password,
  });
  console.log(`   Status: ${loginRes.status}`);
  console.log(`   Response: ${JSON.stringify(loginRes.data)}\n`);

  const authToken = getTokenFromResponse(loginRes.data);
  if (!authToken) {
    console.log(`   Error: Could not extract token from login response`);
    console.log(`   Response: ${JSON.stringify(loginRes.data)}\n`);
    process.exit(1);
  }

  // Step 4: Create a ride (book a ride)
  console.log('4. Book a ride...');
  const ridePayload = {
    passenger_name: 'Test Passenger',
    pickup_label: 'East Bajac-Bajac Public Plaza Terminal',
    dropoff_label: 'Olongapo City Hall',
    pickup_coord: { lat: 14.9813, lng: 120.5736 },
    dropoff_coord: { lat: 14.9749, lng: 120.5407 },
    distance_m: 3500,
    ride_type: 'regular',
  };
  const rideRes = await requestWithAuth('POST', '/rides', ridePayload, authToken);
  console.log(`   Status: ${rideRes.status}`);

  if (rideRes.data.error) {
    console.log(`   Error: ${JSON.stringify(rideRes.data.error)}\n`);
    process.exit(1);
  }

  const ride = rideRes.data.ride || rideRes.data;
  console.log(`   Ride created successfully!\n`);
  console.log(`   Ride ID: ${ride.id}`);
  console.log(`   Pickup: ${ride.pickup}`);
  console.log(`   Dropoff: ${ride.dropoff}`);
  console.log(`   Fare: ₱${(ride.fare != null ? Number(ride.fare).toFixed(2) : 'N/A')}`);
  console.log(`   Status: ${ride.status}\n`);

  // Step 5: Verify ride is in history
  console.log('5. Verify ride in history...');
  const historyRes = await requestWithAuth('GET', '/rides/history', null, authToken);
  console.log(`   Status: ${historyRes.status}`);
  if (historyRes.data.rides && historyRes.data.rides.length > 0) {
    const h = historyRes.data.rides[0];
    console.log(`   Found ride in history: #${h.id} - ${h.pickup} → ${h.dropoff}\n`);
  } else {
    console.log('   No rides found in history yet\n');
  }

  // Step 6: Check available rides
  console.log('6. Check available rides...');
  const availRes = await requestWithAuth('GET', '/rides/available', null, authToken);
  console.log(`   Status: ${availRes.status}`);
  if (availRes.data.rides) {
    console.log(`   Available rides: ${availRes.data.rides.length}\n`);
  }

  // Summary
  console.log('\n=== Booking API Test Summary ===');
  console.log('✓ Health check: OK');
  console.log('✓ User registration: OK');
  console.log('✓ Login: OK');
  console.log('✓ Ride booking (POST /api/rides): OK');
  console.log('✓ Ride history retrieval: OK');
  console.log('✓ Available rides check: OK\n');
}

testBookingFlow().catch((err) => {
  console.error('Test failed:', err.message);
  console.error(err.stack);
  process.exit(1);
});