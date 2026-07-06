import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...\n");

  // ─── Clean existing data (order matters for FK constraints) ─────────────
  await db.review.deleteMany();
  await db.payment.deleteMany();
  await db.activityLog.deleteMany();
  await db.notification.deleteMany();
  await db.housekeepingTask.deleteMany();
  await db.daytimeBooking.deleteMany();
  await db.daytimeService.deleteMany();
  await db.reservation.deleteMany();
  await db.resource.deleteMany();
  await db.expense.deleteMany();
  await db.expenseCategory.deleteMany();
  await db.guest.deleteMany();
  await db.room.deleteMany();
  await db.user.deleteMany();
  await db.settings.deleteMany();

  // ─── 1. Users ───────────────────────────────────────────────────────────
  console.log("Creating users...");
  const admin = await db.user.create({
    data: {
      username: "admin",
      password: "123",
      role: "SUPERUSER",
      name: "Admin User",
    },
  });
  const operator = await db.user.create({
    data: {
      username: "operator",
      password: "123",
      role: "OPERATOR",
      name: "Operator User",
    },
  });
  console.log(`  ✓ Created 2 users (admin, operator)`);

  // ─── 2. Rooms ───────────────────────────────────────────────────────────
  console.log("Creating rooms...");
  const room101 = await db.room.create({
    data: {
      number: "101",
      name: "Standard Single",
      type: "SINGLE",
      pricePerNight: 1500,
      floor: 1,
      capacity: 1,
      status: "OCCUPIED",
      amenities: "WiFi, TV, AC, Mini Bar",
      description: "Comfortable single room on the ground floor",
    },
  });
  const room102 = await db.room.create({
    data: {
      number: "102",
      name: "Standard Double",
      type: "DOUBLE",
      pricePerNight: 2500,
      floor: 1,
      capacity: 2,
      status: "AVAILABLE",
      amenities: "WiFi, TV, AC, Mini Bar, Balcony",
      description: "Spacious double room with balcony view",
    },
  });
  const room103 = await db.room.create({
    data: {
      number: "103",
      name: "Twin Room",
      type: "TWIN",
      pricePerNight: 2200,
      floor: 1,
      capacity: 2,
      status: "RESERVED",
      amenities: "WiFi, TV, AC, Work Desk",
      description: "Twin room ideal for business travelers",
    },
  });
  const room201 = await db.room.create({
    data: {
      number: "201",
      name: "Deluxe Suite",
      type: "SUITE",
      pricePerNight: 4500,
      floor: 2,
      capacity: 3,
      status: "AVAILABLE",
      amenities: "WiFi, TV, AC, Mini Bar, Living Area, Bathtub",
      description: "Luxury suite with living area and city view",
    },
  });
  const room202 = await db.room.create({
    data: {
      number: "202",
      name: "Deluxe Room",
      type: "DELUXE",
      pricePerNight: 3500,
      floor: 2,
      capacity: 2,
      status: "MAINTENANCE",
      amenities: "WiFi, TV, AC, Mini Bar, Safe",
      description: "Premium room with modern amenities",
    },
  });
  console.log(`  ✓ Created 5 rooms (101-103, 201-202)`);

  // ─── 3. Guests ──────────────────────────────────────────────────────────
  console.log("Creating guests...");
  const guest1 = await db.guest.create({
    data: {
      name: "Abebe Kebede",
      phone: "+251911234567",
      email: "abebe@example.com",
      idNumber: "AA1234567",
      idType: "National ID",
      nationality: "Ethiopian",
      address: "Bole, Addis Ababa",
      notes: "Regular guest, prefers ground floor",
      vip: true,
      totalSpent: 15000,
      totalStays: 5,
    },
  });
  const guest2 = await db.guest.create({
    data: {
      name: "Sara Mohammed",
      phone: "+251922345678",
      email: "sara@example.com",
      idNumber: "PS9876543",
      idType: "Passport",
      nationality: "Ethiopian",
      address: "CMC, Addis Ababa",
      notes: "Business traveler",
      vip: false,
      totalSpent: 7500,
      totalStays: 2,
    },
  });
  const guest3 = await db.guest.create({
    data: {
      name: "John Smith",
      phone: "+14155551234",
      email: "john.smith@example.com",
      idNumber: "US789012345",
      idType: "Passport",
      nationality: "American",
      address: "San Francisco, CA, USA",
      notes: "Tourist, English speaking only",
      vip: false,
      totalSpent: 9000,
      totalStays: 3,
    },
  });
  console.log(`  ✓ Created 3 guests`);

  // ─── 4. Reservations ────────────────────────────────────────────────────
  console.log("Creating reservations...");
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().split("T")[0];
  const daysAgo = (n: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() - n);
    return fmt(d);
  };
  const daysFromNow = (n: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + n);
    return fmt(d);
  };

  // Active reservation - Abebe in room 101 (checked in 2 days ago, checking out tomorrow)
  const res1 = await db.reservation.create({
    data: {
      guestId: guest1.id,
      roomId: room101.id,
      checkIn: daysAgo(2),
      checkOut: daysFromNow(1),
      nights: 3,
      roomRate: 1500,
      totalCost: 4500,
      paidAmount: 4500,
      balance: 0,
      paymentStatus: "PAID",
      paymentMethod: "CASH",
      status: "ACTIVE",
      notes: "VIP guest, extended stay",
      actualCheckIn: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      taxAmount: 0,
      discountAmount: 0,
    },
  });

  // Upcoming reservation - Sara in room 103 (checking out in 5 days)
  const res2 = await db.reservation.create({
    data: {
      guestId: guest2.id,
      roomId: room103.id,
      checkIn: daysFromNow(3),
      checkOut: daysFromNow(6),
      nights: 3,
      roomRate: 2200,
      totalCost: 6600,
      paidAmount: 3300,
      balance: 3300,
      paymentStatus: "PARTIAL",
      paymentMethod: "TRANSFER",
      status: "UPCOMING",
      notes: "Business trip",
      taxAmount: 0,
      discountAmount: 0,
    },
  });

  // Completed reservation - John was in room 201 (5 days ago for 2 nights)
  const res3 = await db.reservation.create({
    data: {
      guestId: guest3.id,
      roomId: room201.id,
      checkIn: daysAgo(7),
      checkOut: daysAgo(5),
      nights: 2,
      roomRate: 4500,
      totalCost: 9000,
      paidAmount: 9000,
      balance: 0,
      paymentStatus: "PAID",
      paymentMethod: "CARD",
      status: "COMPLETED",
      notes: "",
      actualCheckIn: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      actualCheckOut: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      taxAmount: 0,
      discountAmount: 0,
    },
  });
  console.log(`  ✓ Created 3 reservations (1 active, 1 upcoming, 1 completed)`);

  // ─── 5. Daytime Services ───────────────────────────────────────────────
  console.log("Creating daytime services...");
  const svc1 = await db.daytimeService.create({
    data: {
      name: "Conference Room",
      price: 2000,
      category: "Meeting",
      duration: "2 hours",
      description: "Fully equipped conference room with projector and whiteboard",
      active: true,
    },
  });
  const svc2 = await db.daytimeService.create({
    data: {
      name: "Laundry Service",
      price: 200,
      category: "Laundry",
      duration: "Same day",
      description: "Professional laundry and dry cleaning service",
      active: true,
    },
  });
  const svc3 = await db.daytimeService.create({
    data: {
      name: "Breakfast Buffet",
      price: 350,
      category: "Food & Beverage",
      duration: "1.5 hours",
      description: "Full breakfast buffet with Ethiopian and international cuisine",
      active: true,
    },
  });
  const svc4 = await db.daytimeService.create({
    data: {
      name: "Airport Transfer",
      price: 800,
      category: "Transport",
      duration: "45 min",
      description: "Private airport pickup and drop-off service",
      active: true,
    },
  });
  const svc5 = await db.daytimeService.create({
    data: {
      name: "Spa & Massage",
      price: 1500,
      category: "Wellness",
      duration: "1 hour",
      description: "Relaxing spa treatments and professional massage",
      active: true,
    },
  });
  console.log(`  ✓ Created 5 daytime services`);

  // ─── 6. Daytime Bookings ────────────────────────────────────────────────
  console.log("Creating daytime bookings...");
  await db.daytimeBooking.create({
    data: {
      serviceId: svc1.id,
      guestName: "Abebe Kebede",
      guestPhone: "+251911234567",
      date: daysAgo(1),
      time: "10:00",
      quantity: 1,
      unitPrice: 2000,
      totalCost: 2000,
      paidAmount: 2000,
      paymentStatus: "PAID",
      paymentMethod: "CASH",
      notes: "Team meeting, 8 attendees",
    },
  });
  await db.daytimeBooking.create({
    data: {
      serviceId: svc4.id,
      guestName: "John Smith",
      guestPhone: "+14155551234",
      date: daysFromNow(1),
      time: "06:00",
      quantity: 1,
      unitPrice: 800,
      totalCost: 800,
      paidAmount: 0,
      paymentStatus: "PENDING",
      notes: "Airport pickup for departure flight",
    },
  });
  console.log(`  ✓ Created 2 daytime bookings`);

  // ─── 7. Expense Categories ──────────────────────────────────────────────
  console.log("Creating expense categories...");
  await db.expenseCategory.createMany({
    data: [
      { name: "Utilities", nameAm: "የኤሌክትሪክ እና ውሃ", color: "#ef4444", icon: "Zap" },
      { name: "Staff", nameAm: "ሰራተኞች", color: "#f97316", icon: "Users" },
      { name: "Supplies", nameAm: "እቃዎች", color: "#eab308", icon: "Package" },
      { name: "Maintenance", nameAm: "ጥገና", color: "#22c55e", icon: "Wrench" },
      { name: "Food & Beverage", nameAm: "ምግብ እና መጠጥ", color: "#06b6d4", icon: "UtensilsCrossed" },
      { name: "Marketing", nameAm: "ማስተዋወቂያ", color: "#8b5cf6", icon: "Megaphone" },
      { name: "Other", nameAm: "ሌሎች", color: "#6b7280", icon: "MoreHorizontal" },
    ],
  });
  console.log(`  ✓ Created 7 expense categories`);

  // ─── 8. Expenses ────────────────────────────────────────────────────────
  console.log("Creating expenses...");
  await db.expense.createMany({
    data: [
      { date: daysAgo(6), category: "Utilities", description: "Electricity bill - January", amount: 3500, vendor: "EEU", paymentMethod: "TRANSFER", receiptNo: "INV-2024-001", taxAmount: 0 },
      { date: daysAgo(5), category: "Food & Beverage", description: "Weekly grocery and food supplies", amount: 4200, vendor: "Shola Market", paymentMethod: "CASH", receiptNo: "RCP-2024-010", taxAmount: 0 },
      { date: daysAgo(4), category: "Staff", description: "Monthly staff salary - Housekeeper", amount: 5000, vendor: "", paymentMethod: "TRANSFER", receiptNo: "PAY-2024-003", taxAmount: 0 },
      { date: daysAgo(3), category: "Supplies", description: "Cleaning supplies and toiletries", amount: 1800, vendor: "ABC Supply Co.", paymentMethod: "CASH", receiptNo: "RCP-2024-011", taxAmount: 0 },
      { date: daysAgo(2), category: "Maintenance", description: "Plumbing repair - Room 202", amount: 2500, vendor: "Mekonnen Plumbing", paymentMethod: "CASH", receiptNo: "RCP-2024-012", taxAmount: 0 },
      { date: daysAgo(1), category: "Marketing", description: "Facebook and Instagram ads", amount: 1500, vendor: "Meta Ads", paymentMethod: "CARD", receiptNo: "DIG-2024-005", taxAmount: 0 },
      { date: daysAgo(0), category: "Utilities", description: "Water bill - January", amount: 1200, vendor: "AAWSA", paymentMethod: "TRANSFER", receiptNo: "INV-2024-002", taxAmount: 0 },
    ],
  });
  console.log(`  ✓ Created 7 expenses across 7 days`);

  // ─── 9. Resources (Inventory) ──────────────────────────────────────────
  console.log("Creating inventory items...");
  await db.resource.createMany({
    data: [
      { name: "Bath Towels", category: "Linens", quantity: 48, unit: "pieces", minLevel: 10, costPerUnit: 150, supplier: "Textile Importers", lastRestocked: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) },
      { name: "Bed Sheets", category: "Linens", quantity: 30, unit: "sets", minLevel: 8, costPerUnit: 350, supplier: "Textile Importers", lastRestocked: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) },
      { name: "Soap", category: "Toiletries", quantity: 120, unit: "bars", minLevel: 30, costPerUnit: 25, supplier: "Hygiene Supplies Ltd", lastRestocked: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
      { name: "Shampoo", category: "Toiletries", quantity: 80, unit: "bottles", minLevel: 20, costPerUnit: 45, supplier: "Hygiene Supplies Ltd", lastRestocked: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
      { name: "Bottled Water", category: "Beverages", quantity: 200, unit: "bottles", minLevel: 50, costPerUnit: 15, supplier: "Aqua Pure", lastRestocked: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
      { name: "Coffee", category: "Beverages", quantity: 5, unit: "kg", minLevel: 2, costPerUnit: 800, supplier: "Yirgacheffe Coffee", lastRestocked: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      { name: "Toilet Paper", category: "Toiletries", quantity: 60, unit: "rolls", minLevel: 20, costPerUnit: 35, supplier: "Hygiene Supplies Ltd", lastRestocked: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000) },
      { name: "Detergent", category: "Cleaning", quantity: 8, unit: "liters", minLevel: 3, costPerUnit: 250, supplier: "Clean Pro", lastRestocked: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000) },
    ],
  });
  console.log(`  ✓ Created 8 inventory items`);

  // ─── 10. Housekeeping Tasks ────────────────────────────────────────────
  console.log("Creating housekeeping tasks...");
  await db.housekeepingTask.createMany({
    data: [
      { roomId: room102.id, type: "CLEANING", status: "PENDING", scheduledDate: daysFromNow(0), notes: "Preparation for next guest", assignedTo: "Almaz" },
      { roomId: room101.id, type: "CLEANING", status: "IN_PROGRESS", scheduledDate: daysAgo(0), notes: "Daily room cleaning", assignedTo: "Helen" },
      { roomId: room202.id, type: "MAINTENANCE", status: "PENDING", scheduledDate: daysAgo(1), notes: "Fix leaking faucet and repaint walls", assignedTo: "Dereje" },
    ],
  });
  console.log(`  ✓ Created 3 housekeeping tasks`);

  // ─── 11. Reviews ────────────────────────────────────────────────────────
  console.log("Creating reviews...");
  await db.review.createMany({
    data: [
      { guestId: guest3.id, reservationId: res3.id, rating: 5, comment: "Excellent stay! The suite was beautiful and the staff was incredibly friendly. Highly recommend this guest house." },
      { guestId: guest1.id, reservationId: res1.id, rating: 4, comment: "Great service as always. The room is clean and comfortable. Only minor issue with WiFi speed." },
    ],
  });
  console.log(`  ✓ Created 2 reviews`);

  // ─── 12. Payments ──────────────────────────────────────────────────────
  console.log("Creating payments...");
  await db.payment.createMany({
    data: [
      { reservationId: res1.id, amount: 4500, method: "CASH", referenceNo: "RCP-CASH-001", notes: "Full payment for 3 nights" },
      { reservationId: res2.id, amount: 3300, method: "TRANSFER", referenceNo: "TRF-001", notes: "50% advance payment" },
      { reservationId: res3.id, amount: 9000, method: "CARD", referenceNo: "CARD-001", notes: "Full payment via Visa card" },
    ],
  });
  console.log(`  ✓ Created 3 payments`);

  // ─── 13. Notifications ─────────────────────────────────────────────────
  console.log("Creating notifications...");
  await db.notification.createMany({
    data: [
      { title: "Check-in Today", message: "Sara Mohammed is expected to check in today to Room 103.", type: "INFO", isRead: false, link: "/reservations" },
      { title: "Payment Received", message: "Abebe Kebede paid ETB 4,500 for Room 101.", type: "SUCCESS", isRead: true, link: "/reservations" },
      { title: "Low Stock Alert", message: "Coffee stock is running low (5 kg remaining). Consider reordering.", type: "WARNING", isRead: false, link: "/inventory" },
      { title: "Checkout Reminder", message: "John Smith checked out from Room 201. Room needs cleaning.", type: "INFO", isRead: true, link: "/housekeeping" },
      { title: "Maintenance Required", message: "Room 202 has plumbing issues. Repair scheduled.", type: "ERROR", isRead: false, link: "/housekeeping" },
    ],
  });
  console.log(`  ✓ Created 5 notifications (3 unread, 2 read)`);

  // ─── 14. Activity Logs ─────────────────────────────────────────────────
  console.log("Creating activity logs...");
  await db.activityLog.createMany({
    data: [
      { message: "System initialized with demo data", type: "SYSTEM" },
      { message: "Admin user logged in", type: "AUTH" },
      { message: "New reservation created for Abebe Kebede - Room 101", type: "RESERVATION" },
      { message: "Payment of ETB 4,500 received (Cash)", type: "PAYMENT" },
      { message: "Room 201 status changed to AVAILABLE", type: "ROOM" },
      { message: "New guest registered: John Smith", type: "GUEST" },
      { message: "Daytime booking: Conference Room for Abebe Kebede", type: "BOOKING" },
      { message: "Expense recorded: Electricity bill - ETB 3,500", type: "EXPENSE" },
      { message: "Housekeeping task assigned: Room 101 cleaning to Helen", type: "HOUSEKEEPING" },
      { message: "Review submitted by John Smith (5 stars)", type: "REVIEW" },
    ],
  });
  console.log(`  ✓ Created 10 activity logs`);

  // ─── 15. Settings ──────────────────────────────────────────────────────
  console.log("Creating settings...");
  await db.settings.create({
    data: {
      guestHouseName: "Ethiopian Heritage Guest House",
      ownerName: "Tadesse Alemu",
      address: "Bole Road, Near Edna Mall, Addis Ababa, Ethiopia",
      phone: "+251-11-234-5678",
      email: "info@ethheritage-guesthouse.com",
      currency: "ETB",
      taxRate: 15,
      language: "en",
      checkInTime: "14:00",
      checkOutTime: "12:00",
    },
  });
  console.log(`  ✓ Created settings`);

  console.log("\n✅ Database seeded successfully!");
  console.log("\n📊 Summary:");
  console.log("  • 2 Users (admin/123, operator/123)");
  console.log("  • 5 Rooms (101-103, 201-202)");
  console.log("  • 3 Guests");
  console.log("  • 3 Reservations (1 active, 1 upcoming, 1 completed)");
  console.log("  • 5 Daytime Services");
  console.log("  • 2 Daytime Bookings");
  console.log("  • 7 Expense Categories");
  console.log("  • 7 Expenses");
  console.log("  • 8 Inventory Items");
  console.log("  • 3 Housekeeping Tasks");
  console.log("  • 2 Reviews");
  console.log("  • 3 Payments");
  console.log("  • 5 Notifications");
  console.log("  • 10 Activity Logs");
  console.log("  • 1 Settings");
}

main()
  .then(async () => {
    await db.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Seeding failed:", e);
    await db.$disconnect();
    process.exit(1);
  });