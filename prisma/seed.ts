import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();

async function seed() {
  // ── 1. Create Providers ────────────────────────────────────────────
  const provider1 = await db.provider.create({
    data: {
      name: 'Sunrise Guest House',
      ownerName: 'Abebe Kebede',
      phone: '+251 911 234 567',
      email: 'abebe@sunrise.com',
      address: 'Bole, Addis Ababa',
      type: 'GUEST_HOUSE',
      licenseNo: 'LIC-2024-001',
      status: 'APPROVED',
      approvedBy: 'police-admin',
      approvedAt: new Date(),
    },
  });

  const provider2 = await db.provider.create({
    data: {
      name: 'Blue Star Hotel',
      ownerName: 'Tigist Haile',
      phone: '+251 922 345 678',
      email: 'tigist@bluestar.com',
      address: 'Kazanchis, Addis Ababa',
      type: 'HOTEL',
      licenseNo: 'LIC-2024-002',
      status: 'APPROVED',
      approvedBy: 'police-admin',
      approvedAt: new Date(),
    },
  });

  const provider3 = await db.provider.create({
    data: {
      name: 'Ethio Comfort Lodge',
      ownerName: 'Dawit Amare',
      phone: '+251 933 456 789',
      email: 'dawit@ethiocomfort.com',
      address: 'Merkato, Addis Ababa',
      type: 'GUEST_HOUSE',
      licenseNo: 'LIC-2024-003',
      status: 'PENDING',
    },
  });

  // ── 2. Create Users ────────────────────────────────────────────────
  // Reserved system admin SUPERUSER (no provider)
  await db.user.create({
    data: {
      username: 'admin',
      password: '123',
      role: 'SUPERUSER',
      name: 'System Admin',
      // No providerId — this is the sole system-wide admin
    },
  });

  // Police officer
  await db.user.create({
    data: {
      username: 'police',
      password: '123',
      role: 'POLICE',
      name: 'Officer Kebede',
    },
  });

  // Provider 1 owner (SUPERUSER tied to provider)
  await db.user.create({
    data: {
      username: 'sunrise-admin',
      password: '123',
      role: 'SUPERUSER',
      name: 'Abebe Kebede',
      providerId: provider1.id,
    },
  });

  // Provider 1 operator
  await db.user.create({
    data: {
      username: 'operator',
      password: '123',
      role: 'OPERATOR',
      name: 'Helen Tadesse',
      providerId: provider1.id,
    },
  });

  // Provider 2 admin
  await db.user.create({
    data: {
      username: 'admin2',
      password: '123',
      role: 'SUPERUSER',
      name: 'Tigist Haile',
      providerId: provider2.id,
    },
  });

  // ── 3. Seed Provider 1 with rooms, guests, reservations ────────────
  const rooms1 = [
    { number: '101', name: 'Standard Single', type: 'SINGLE' as const, pricePerNight: 800, floor: 1, capacity: 1, amenities: 'WiFi,TV', description: 'Cozy single room' },
    { number: '102', name: 'Standard Double', type: 'DOUBLE' as const, pricePerNight: 1200, floor: 1, capacity: 2, amenities: 'WiFi,TV,AC', description: 'Comfortable double room' },
    { number: '201', name: 'Deluxe Suite', type: 'SUITE' as const, pricePerNight: 2500, floor: 2, capacity: 3, amenities: 'WiFi,TV,AC,Mini Bar', description: 'Premium suite' },
    { number: '202', name: 'Twin Room', type: 'TWIN' as const, pricePerNight: 1500, floor: 2, capacity: 2, amenities: 'WiFi,TV,AC', description: 'Twin bed room' },
    { number: '301', name: 'Deluxe Double', type: 'DELUXE' as const, pricePerNight: 2000, floor: 3, capacity: 2, amenities: 'WiFi,TV,AC,Balcony', description: 'Deluxe with balcony' },
  ];

  const createdRooms = [];
  for (const r of rooms1) {
    createdRooms.push(await db.room.create({
      data: { ...r, providerId: provider1.id, status: 'AVAILABLE' },
    }));
  }

  // Mark room 102 as occupied
  await db.room.update({ where: { id: createdRooms[1].id }, data: { status: 'OCCUPIED' } });

  const guests1 = [
    { name: 'John Smith', phone: '+1 555 0101', email: 'john@email.com', idNumber: 'P12345', idType: 'Passport', nationality: 'American', address: 'New York, USA' },
    { name: 'Sara Ahmed', phone: '+251 944 111 222', email: 'sara@email.com', idNumber: 'ID-0001', idType: 'National ID', nationality: 'Ethiopian', address: 'Addis Ababa' },
    { name: 'Michael Johnson', phone: '+44 7700 900123', email: 'michael@email.com', idNumber: 'P67890', idType: 'Passport', nationality: 'British', address: 'London, UK' },
  ];

  const createdGuests = [];
  for (const g of guests1) {
    createdGuests.push(await db.guest.create({
      data: { ...g, providerId: provider1.id, totalSpent: 2000, totalStays: 1 },
    }));
  }

  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

  await db.reservation.create({
    data: {
      guestId: createdGuests[0].id,
      roomId: createdRooms[1].id,
      checkIn: yesterday,
      checkOut: tomorrow,
      nights: 2,
      roomRate: 1200,
      totalCost: 2400,
      paidAmount: 2400,
      balance: 0,
      paymentStatus: 'PAID',
      paymentMethod: 'CASH',
      status: 'ACTIVE',
      providerId: provider1.id,
    },
  });

  await db.reservation.create({
    data: {
      guestId: createdGuests[1].id,
      roomId: createdRooms[2].id,
      checkIn: tomorrow,
      checkOut: nextWeek,
      nights: 7,
      roomRate: 2500,
      totalCost: 17500,
      paidAmount: 5000,
      balance: 12500,
      paymentStatus: 'PARTIAL',
      paymentMethod: 'TRANSFER',
      status: 'UPCOMING',
      providerId: provider1.id,
    },
  });

  // ── 4. Seed Provider 2 with rooms ──────────────────────────────────
  for (let i = 1; i <= 4; i++) {
    await db.room.create({
      data: {
        number: `${i}01`,
        name: `Room ${i}01`,
        type: i <= 2 ? 'DOUBLE' as const : 'SUITE' as const,
        pricePerNight: 1500 + i * 500,
        floor: i,
        capacity: 2,
        amenities: 'WiFi,TV,AC',
        description: `Blue Star room ${i}01`,
        providerId: provider2.id,
        status: i === 2 ? 'OCCUPIED' : 'AVAILABLE',
      },
    });
  }

  // Provider 2 guests
  await db.guest.create({
    data: {
      name: 'David Chen', phone: '+86 138 0000 1234', email: 'david@email.com',
      idNumber: 'E123456', idType: 'Passport', nationality: 'Chinese',
      address: 'Beijing, China', totalSpent: 4500, totalStays: 2, providerId: provider2.id,
    },
  });

  // ── 5. Seed expense categories ─────────────────────────────────────
  const categories = [
    { name: 'Utilities', nameAm: 'የኤሌክትሪክ', color: '#3b82f6', icon: 'Zap' },
    { name: 'Supplies', nameAm: 'እቃዎች', color: '#10b981', icon: 'Package' },
    { name: 'Maintenance', nameAm: 'ጥገና', color: '#f59e0b', icon: 'Wrench' },
    { name: 'Salary', nameAm: 'ደመወዝ', color: '#ef4444', icon: 'Banknote' },
    { name: 'Food & Beverage', nameAm: 'ምግብና መጠጥ', color: '#8b5cf6', icon: 'Coffee' },
  ];
  for (const c of categories) {
    await db.expenseCategory.create({ data: c });
  }

  // ── 6. Settings for Provider 1 ────────────────────────────────────
  await db.settings.create({
    data: {
      guestHouseName: 'Sunrise Guest House',
      ownerName: 'Abebe Kebede',
      address: 'Bole, Addis Ababa',
      phone: '+251 911 234 567',
      email: 'info@sunrise.com',
      currency: 'ETB',
      taxRate: 15,
      providerId: provider1.id,
    },
  });

  await db.settings.create({
    data: {
      guestHouseName: 'Blue Star Hotel',
      ownerName: 'Tigist Haile',
      address: 'Kazanchis, Addis Ababa',
      phone: '+251 922 345 678',
      email: 'info@bluestar.com',
      currency: 'ETB',
      taxRate: 15,
      providerId: provider2.id,
    },
  });

  console.log('✅ Seed completed successfully!');
  console.log('');
  console.log('System Admin: admin / 123  (SUPERUSER — reserved, no provider)');
  console.log('Police:        police / 123');
  console.log('Provider 1:    sunrise-admin / 123  (Sunrise Guest House owner)');
  console.log('Provider 2:    admin2 / 123 (Blue Star Hotel owner)');
  console.log('Operator:      operator / 123 (Sunrise GH)');
  console.log('Pending req:   Provider "Ethio Comfort Lodge" awaiting approval');
}

seed()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());