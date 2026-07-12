const http = require('http');

const TARGET = 'http://127.0.0.1:3000';

// List of API routes to pre-warm (GET only, won't modify data)
const routes = [
  '/api/auth',
  '/api/dashboard',
  '/api/rooms',
  '/api/guests',
  '/api/reservations',
  '/api/expenses',
  '/api/resources',
  '/api/housekeeping',
  '/api/users',
  '/api/settings',
  '/api/providers',
  '/api/reports',
  '/api/payments',
  '/api/notifications',
  '/api/activity',
  '/api/police-dashboard',
  '/api/police-guests',
  '/api/daytime-services',
  '/api/daytime-bookings',
  '/api/expense-categories',
  '/api/data',
];

async function warmRoute(path) {
  try {
    await new Promise((resolve, reject) => {
      const req = http.get(TARGET + path, { timeout: 5000 }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(data));
      });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    });
  } catch (e) {
    // Ignore errors during warmup
  }
}

async function warmAll() {
  console.log('Warming up all routes...');
  // Warm in batches of 3 to avoid memory spike
  for (let i = 0; i < routes.length; i += 3) {
    const batch = routes.slice(i, i + 3);
    await Promise.all(batch.map(warmRoute));
    console.log(`  Warmed ${Math.min(i + 3, routes.length)}/${routes.length}`);
    // Give GC a chance
    if (global.gc) global.gc();
    await new Promise(r => setTimeout(r, 100));
  }
  console.log('All routes warmed up!');
}

warmAll().catch(console.error);