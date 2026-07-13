// RBAC test: starts server, runs tests, exits
import { execSync, spawn } from 'child_process';

const HOST = 'http://127.0.0.1:3000';
let pass = 0, fail = 0;

function test(name, method, path, headers, body, expectStatus) {
  return new Promise((resolve) => {
    const args = ['--max-time', '3', '-s', '-X', method, `${HOST}${path}`];
    for (const [k, v] of Object.entries(headers)) {
      args.push('-H', `${k}: ${v}`);
    }
    if (body) args.push('-d', JSON.stringify(body));
    args.push('-w', '%{http_code}');

    const curl = spawn('curl', args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    curl.stdout.on('data', d => stdout += d);
    curl.on('close', () => {
      const code = stdout.trim().slice(-3);
      const ok = code === expectStatus;
      if (ok) { pass++; console.log(`  ✓ ${name}`); }
      else { fail++; console.log(`  ✗ ${name} — expected ${expectStatus}, got ${code || '000'}`); }
      resolve();
    });
    curl.on('error', () => {
      fail++; console.log(`  ✗ ${name} — connection failed`);
      resolve();
    });
    curl.stdin.end();
  });
}

async function main() {
  // Start server
  const server = spawn('node', ['.next/standalone/server.js'], {
    cwd: '/home/z/my-project',
    env: { ...process.env, HOSTNAME: '0.0.0.0', DATABASE_URL: 'file:/home/z/my-project/db/custom.db', NODE_ENV: 'production' },
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  // Wait for ready
  await new Promise(r => setTimeout(r, 2000));

  console.log('RBAC Test Suite\n');

  // SUPERUSER tests
  console.log('SUPERUSER:');
  await test('Can GET reports', 'GET', '/api/reports?from=2025-01-01&to=2025-12-31', { 'x-user-role': 'SUPERUSER' }, null, '200');
  await test('Can GET users', 'GET', '/api/users', { 'x-user-role': 'SUPERUSER' }, null, '200');
  await test('BLOCKED from POST housekeeping', 'POST', '/api/housekeeping', { 'x-user-role': 'SUPERUSER', 'Content-Type': 'application/json' }, {}, '403');
  await test('BLOCKED from POST expenses', 'POST', '/api/expenses', { 'x-user-role': 'SUPERUSER', 'Content-Type': 'application/json' }, {}, '403');
  await test('BLOCKED from POST resources', 'POST', '/api/resources', { 'x-user-role': 'SUPERUSER', 'Content-Type': 'application/json' }, {}, '403');
  await test('BLOCKED from POST reservations', 'POST', '/api/reservations', { 'x-user-role': 'SUPERUSER', 'Content-Type': 'application/json' }, {}, '403');
  await test('BLOCKED from POST guests', 'POST', '/api/guests', { 'x-user-role': 'SUPERUSER', 'Content-Type': 'application/json' }, {}, '403');

  // OPERATOR tests
  console.log('\nOPERATOR:');
  await test('Can GET reports', 'GET', '/api/reports?from=2025-01-01&to=2025-12-31', { 'x-user-role': 'OPERATOR' }, null, '200');
  await test('Can GET users', 'GET', '/api/users', { 'x-user-role': 'OPERATOR', 'x-provider-id': 'x' }, null, '200');
  await test('Can POST housekeeping', 'POST', '/api/housekeeping', { 'x-user-role': 'OPERATOR', 'x-provider-id': 'x', 'Content-Type': 'application/json' }, {}, '400');
  await test('Can POST expenses', 'POST', '/api/expenses', { 'x-user-role': 'OPERATOR', 'x-provider-id': 'x', 'Content-Type': 'application/json' }, {}, '400');
  await test('Can POST resources', 'POST', '/api/resources', { 'x-user-role': 'OPERATOR', 'x-provider-id': 'x', 'Content-Type': 'application/json' }, {}, '400');
  await test('BLOCKED from POST reservations', 'POST', '/api/reservations', { 'x-user-role': 'OPERATOR', 'x-provider-id': 'x', 'Content-Type': 'application/json' }, {}, '403');
  await test('BLOCKED from POST guests', 'POST', '/api/guests', { 'x-user-role': 'OPERATOR', 'x-provider-id': 'x', 'Content-Type': 'application/json' }, {}, '403');

  // STAFF without permission tests
  console.log('\nSTAFF (no permissions):');
  await test('BLOCKED from POST housekeeping', 'POST', '/api/housekeeping', { 'x-user-role': 'STAFF', 'x-user-permissions': '["reservations"]', 'Content-Type': 'application/json' }, {}, '403');
  await test('BLOCKED from POST expenses', 'POST', '/api/expenses', { 'x-user-role': 'STAFF', 'x-user-permissions': '["reservations"]', 'Content-Type': 'application/json' }, {}, '403');
  await test('BLOCKED from PUT reservations', 'PUT', '/api/reservations', { 'x-user-role': 'STAFF', 'x-user-permissions': '["guests"]', 'Content-Type': 'application/json' }, {}, '403');

  // STAFF with permission tests
  console.log('\nSTAFF (with matching permissions):');
  await test('Can POST housekeeping', 'POST', '/api/housekeeping', { 'x-user-role': 'STAFF', 'x-user-permissions': '["housekeeping"]', 'Content-Type': 'application/json' }, {}, '400');
  await test('Can PUT housekeeping', 'PUT', '/api/housekeeping', { 'x-user-role': 'STAFF', 'x-user-permissions': '["housekeeping"]', 'Content-Type': 'application/json' }, {}, '400');
  await test('Can POST expenses', 'POST', '/api/expenses', { 'x-user-role': 'STAFF', 'x-user-permissions': '["expenses"]', 'Content-Type': 'application/json' }, {}, '400');
  await test('Can POST resources', 'POST', '/api/resources', { 'x-user-role': 'STAFF', 'x-user-permissions': '["resources"]', 'Content-Type': 'application/json' }, {}, '400');
  await test('Can POST reservations', 'POST', '/api/reservations', { 'x-user-role': 'STAFF', 'x-user-permissions': '["reservations"]', 'Content-Type': 'application/json' }, {}, '400');
  await test('Can PUT reservations', 'PUT', '/api/reservations', { 'x-user-role': 'STAFF', 'x-user-permissions': '["reservations"]', 'Content-Type': 'application/json' }, {}, '400');
  await test('Can DELETE reservations', 'DELETE', '/api/reservations?id=x', { 'x-user-role': 'STAFF', 'x-user-permissions': '["reservations"]' }, null, '500');
  await test('Can POST guests', 'POST', '/api/guests', { 'x-user-role': 'STAFF', 'x-user-permissions': '["guests"]', 'Content-Type': 'application/json' }, {}, '400');
  await test('Can PUT guests', 'PUT', '/api/guests', { 'x-user-role': 'STAFF', 'x-user-permissions': '["guests"]', 'Content-Type': 'application/json' }, {}, '400');
  await test('Can POST rooms', 'POST', '/api/rooms', { 'x-user-role': 'STAFF', 'x-user-permissions': '["rooms"]', 'Content-Type': 'application/json' }, {}, '400');
  await test('Can POST daytime-services', 'POST', '/api/daytime-services', { 'x-user-role': 'STAFF', 'x-user-permissions': '["daytime"]', 'Content-Type': 'application/json' }, {}, '400');
  await test('Can POST daytime-bookings', 'POST', '/api/daytime-bookings', { 'x-user-role': 'STAFF', 'x-user-permissions': '["daytime"]', 'Content-Type': 'application/json' }, {}, '400');

  console.log(`\n════════════════════════`);
  console.log(`Results: ${pass} passed, ${fail} failed out of ${pass + fail} tests`);
  if (fail === 0) console.log('All RBAC checks passed! ✓');
  else console.log(`${fail} test(s) failed.`);

  server.kill();
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });