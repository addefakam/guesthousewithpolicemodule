// Quick check of all users in the local DB
const path = require('path');
process.chdir('/home/z/my-project/ghms-clone');
const { PrismaClient } = require(path.resolve('/home/z/my-project/ghms-clone/node_modules/@prisma/client'));
const db = new PrismaClient();

(async () => {
  const users = await db.user.findMany({
    select: { id: true, username: true, role: true, name: true, providerId: true, password: true }
  });
  console.log('=== ALL USERS IN LOCAL DB ===');
  console.log(JSON.stringify(users, null, 2));
  console.log('=== COUNT:', users.length, '===');

  // Specifically look for username='admin' (case-sensitive and insensitive)
  const adminUsers = users.filter(u => u.username.toLowerCase() === 'admin');
  console.log('\n=== USERS WITH USERNAME "admin" (case-insensitive) ===');
  console.log(JSON.stringify(adminUsers, null, 2));

  await db.$disconnect();
})().catch(e => {
  console.error('ERROR:', e);
  process.exit(1);
});
