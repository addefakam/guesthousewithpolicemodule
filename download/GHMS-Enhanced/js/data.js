/**
 * data.js — LocalStorage Data Layer
 * All CRUD operations for Guest House Management System
 */

const PREFIX = 'ghms_';

// ---- Utility ----
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function now() {
  return new Date().toISOString();
}

function get(key) {
  try { return JSON.parse(localStorage.getItem(PREFIX + key) || 'null'); }
  catch { return null; }
}

function set(key, val) {
  localStorage.setItem(PREFIX + key, JSON.stringify(val));
}

// ============================================================
// USERS & AUTH
// ============================================================
export const Users = {
  getAll() { return get('users') || []; },
  save(users) { set('users', users); },

  add(user) {
    const all = this.getAll();
    const newUser = { id: uid(), createdAt: now(), ...user };
    all.push(newUser);
    this.save(all);
    return newUser;
  },

  update(id, changes) {
    const all = this.getAll().map(u => u.id === id ? { ...u, ...changes, updatedAt: now() } : u);
    this.save(all);
    return all.find(u => u.id === id);
  },

  delete(id) { this.save(this.getAll().filter(u => u.id !== id)); },

  getById(id) { return this.getAll().find(u => u.id === id); },

  getByUsername(username) { return this.getAll().find(u => u.username === username); }
};

// Ensure default users exist if none are found (e.g., if seeded flag was already set before auth was added)
if (Users.getAll().length === 0) {
  Users.add({ username: 'admin', password: '123', role: 'superuser', name: 'Super Admin' });
  Users.add({ username: 'operator', password: '123', role: 'operator', name: 'Front Desk' });
}

export const Auth = {
  login(username, password) {
    const user = Users.getByUsername(username);
    if (user && user.password === password) { // simple plaintext for demo
      set('current_user', user);
      Activity.log(`User logged in: ${username}`, 'info');
      return true;
    }
    return false;
  },

  logout() {
    localStorage.removeItem(PREFIX + 'current_user');
    Activity.log(`User logged out`, 'info');
  },

  getCurrentUser() { return get('current_user'); },

  hasRole(role) {
    const u = this.getCurrentUser();
    return u && u.role === role;
  }
};

// ============================================================
// ROOMS
// ============================================================
export const Rooms = {
  getAll() { return get('rooms') || []; },
  save(rooms) { set('rooms', rooms); },

  add(room) {
    const rooms = this.getAll();
    const newRoom = { id: uid(), createdAt: now(), status: 'available', ...room };
    rooms.push(newRoom);
    this.save(rooms);
    return newRoom;
  },

  update(id, changes) {
    const rooms = this.getAll().map(r => r.id === id ? { ...r, ...changes, updatedAt: now() } : r);
    this.save(rooms);
    return rooms.find(r => r.id === id);
  },

  delete(id) {
    this.save(this.getAll().filter(r => r.id !== id));
  },

  getById(id) { return this.getAll().find(r => r.id === id); },

  getAvailable() { return this.getAll().filter(r => r.status === 'available'); },

  setStatus(id, status) { return this.update(id, { status }); },

  getStats() {
    const rooms = this.getAll();
    return {
      total:       rooms.length,
      available:   rooms.filter(r => r.status === 'available').length,
      occupied:    rooms.filter(r => r.status === 'occupied').length,
      maintenance: rooms.filter(r => r.status === 'maintenance').length,
    };
  }
};

// ============================================================
// GUESTS
// ============================================================
export const Guests = {
  getAll() { return get('guests') || []; },
  save(g) { set('guests', g); },

  add(guest) {
    const guests = this.getAll();
    const newGuest = { id: uid(), createdAt: now(), ...guest };
    guests.push(newGuest);
    this.save(guests);
    return newGuest;
  },

  update(id, changes) {
    const guests = this.getAll().map(g => g.id === id ? { ...g, ...changes, updatedAt: now() } : g);
    this.save(guests);
    return guests.find(g => g.id === id);
  },

  delete(id) {
    this.save(this.getAll().filter(g => g.id !== id));
  },

  getById(id) { return this.getAll().find(g => g.id === id); },

  search(query) {
    const q = query.toLowerCase();
    return this.getAll().filter(g =>
      g.name?.toLowerCase().includes(q) ||
      g.phone?.includes(q) ||
      g.idNumber?.toLowerCase().includes(q) ||
      g.email?.toLowerCase().includes(q)
    );
  },

  getInitials(name) {
    if (!name) return '?';
    return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  }
};

// ============================================================
// RESERVATIONS
// ============================================================
export const Reservations = {
  getAll() { return get('reservations') || []; },
  save(r) { set('reservations', r); },

  add(res) {
    const all = this.getAll();
    const nights = this.calcNights(res.checkIn, res.checkOut);
    const room   = Rooms.getById(res.roomId);
    const rate   = room ? parseFloat(room.pricePerNight) : 0;
    const total  = nights * rate;

    const newRes = {
      id: uid(),
      createdAt: now(),
      nights,
      roomRate: rate,
      totalCost: total,
      paidAmount: parseFloat(res.paidAmount) || 0,
      paymentStatus: this.calcPaymentStatus(parseFloat(res.paidAmount) || 0, total),
      status: 'upcoming',
      ...res,
    };
    all.push(newRes);
    this.save(all);

    // Check-in immediately if check-in date is today or past
    const today = new Date(); today.setHours(0,0,0,0);
    const checkInDate = new Date(res.checkIn); checkInDate.setHours(0,0,0,0);
    if (checkInDate <= today) {
      this.checkIn(newRes.id);
    }
    return newRes;
  },

  update(id, changes) {
    const all = this.getAll().map(r => {
      if (r.id !== id) return r;
      const updated = { ...r, ...changes, updatedAt: now() };
      if (changes.paidAmount !== undefined || changes.totalCost !== undefined) {
        updated.paymentStatus = this.calcPaymentStatus(
          parseFloat(updated.paidAmount) || 0,
          parseFloat(updated.totalCost) || 0
        );
      }
      return updated;
    });
    this.save(all);
    return all.find(r => r.id === id);
  },

  delete(id) {
    const res = this.getById(id);
    if (res && res.roomId) Rooms.setStatus(res.roomId, 'available');
    this.save(this.getAll().filter(r => r.id !== id));
  },

  checkIn(id) {
    const res = this.getById(id);
    if (!res) return;
    this.update(id, { status: 'active', actualCheckIn: now() });
    Rooms.setStatus(res.roomId, 'occupied');
    Activity.log(`Guest checked in to Room ${Rooms.getById(res.roomId)?.number || '?'}`, 'checkin');
  },

  checkOut(id) {
    const res = this.getById(id);
    if (!res) return;
    this.update(id, { status: 'completed', actualCheckOut: now() });
    Rooms.setStatus(res.roomId, 'available');
    Activity.log(`Guest checked out from Room ${Rooms.getById(res.roomId)?.number || '?'}`, 'checkout');
  },

  cancel(id) {
    const res = this.getById(id);
    if (!res) return;
    this.update(id, { status: 'cancelled' });
    if (res.status === 'active') Rooms.setStatus(res.roomId, 'available');
    Activity.log('Reservation cancelled', 'cancel');
  },

  getById(id) { return this.getAll().find(r => r.id === id); },

  calcNights(checkIn, checkOut) {
    const d1 = new Date(checkIn);
    const d2 = new Date(checkOut);
    const diff = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 1;
  },

  calcPaymentStatus(paid, total) {
    if (paid <= 0) return 'pending';
    if (paid >= total) return 'paid';
    return 'partial';
  },

  getActive() { return this.getAll().filter(r => r.status === 'active'); },

  getUpcoming() {
    const today = new Date(); today.setHours(0,0,0,0);
    return this.getAll().filter(r => {
      const ci = new Date(r.checkIn); ci.setHours(0,0,0,0);
      return r.status === 'upcoming' && ci >= today;
    });
  },

  getTodayCheckIns() {
    const today = new Date().toISOString().slice(0,10);
    return this.getAll().filter(r => r.checkIn?.slice(0,10) === today);
  },

  getTodayCheckOuts() {
    const today = new Date().toISOString().slice(0,10);
    return this.getAll().filter(r => r.checkOut?.slice(0,10) === today && r.status === 'active');
  },

  getPendingPayments() {
    return this.getAll().filter(r =>
      (r.paymentStatus === 'pending' || r.paymentStatus === 'partial') &&
      r.status !== 'cancelled'
    );
  },

  getRevenue(from, to) {
    const f = new Date(from); f.setHours(0,0,0,0);
    const t = new Date(to);   t.setHours(23,59,59,999);
    return this.getAll()
      .filter(r => {
        const d = new Date(r.createdAt);
        return d >= f && d <= t && r.status !== 'cancelled';
      })
      .reduce((sum, r) => sum + (parseFloat(r.paidAmount) || 0), 0);
  },

  getLast7DaysRevenue() {
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0,10);
      const rev = this.getAll()
        .filter(r => r.createdAt?.slice(0,10) === dateStr && r.status !== 'cancelled')
        .reduce((s, r) => s + (parseFloat(r.paidAmount) || 0), 0);
      result.push({ date: dateStr, revenue: rev });
    }
    return result;
  },

  filter({ status, from, to, guestId, roomId } = {}) {
    return this.getAll().filter(r => {
      if (status && status !== 'all' && r.status !== status) return false;
      if (from && r.checkIn < from) return false;
      if (to   && r.checkOut > to) return false;
      if (guestId && r.guestId !== guestId) return false;
      if (roomId  && r.roomId  !== roomId)  return false;
      return true;
    });
  }
};

// ============================================================
// DAYTIME SERVICES (Catalogue)
// ============================================================
export const DaytimeServices = {
  getAll() { return get('daytime_services') || []; },
  save(s) { set('daytime_services', s); },

  add(service) {
    const all = this.getAll();
    const newSvc = { id: uid(), createdAt: now(), active: true, ...service };
    all.push(newSvc);
    this.save(all);
    return newSvc;
  },

  update(id, changes) {
    const all = this.getAll().map(s => s.id === id ? { ...s, ...changes } : s);
    this.save(all);
    return all.find(s => s.id === id);
  },

  delete(id) { this.save(this.getAll().filter(s => s.id !== id)); },

  getById(id) { return this.getAll().find(s => s.id === id); },

  getActive() { return this.getAll().filter(s => s.active); }
};

// ============================================================
// DAYTIME BOOKINGS
// ============================================================
export const DaytimeBookings = {
  getAll() { return get('daytime_bookings') || []; },
  save(b) { set('daytime_bookings', b); },

  add(booking) {
    const all = this.getAll();
    const svc  = DaytimeServices.getById(booking.serviceId);
    const price = svc ? parseFloat(svc.price) : parseFloat(booking.unitPrice) || 0;
    const qty   = parseInt(booking.quantity) || 1;
    const total = price * qty;

    const newBooking = {
      id: uid(),
      createdAt: now(),
      unitPrice: price,
      quantity: qty,
      totalCost: total,
      paidAmount: parseFloat(booking.paidAmount) || 0,
      paymentStatus: parseFloat(booking.paidAmount) >= total ? 'paid' :
                     parseFloat(booking.paidAmount) > 0 ? 'partial' : 'pending',
      ...booking,
    };
    all.push(newBooking);
    this.save(all);
    Activity.log(`Daytime service booked: ${svc?.name || '—'}`, 'service');
    return newBooking;
  },

  update(id, changes) {
    const all = this.getAll().map(b => b.id === id ? { ...b, ...changes, updatedAt: now() } : b);
    this.save(all);
    return all.find(b => b.id === id);
  },

  delete(id) { this.save(this.getAll().filter(b => b.id !== id)); },

  getById(id) { return this.getAll().find(b => b.id === id); },

  getToday() {
    const today = new Date().toISOString().slice(0,10);
    return this.getAll().filter(b => b.date === today);
  },

  getRevenue(from, to) {
    const f = new Date(from); f.setHours(0,0,0,0);
    const to2 = new Date(to); to2.setHours(23,59,59,999);
    return this.getAll()
      .filter(b => { const d = new Date(b.createdAt); return d >= f && d <= to2; })
      .reduce((s, b) => s + (parseFloat(b.paidAmount) || 0), 0);
  }
};

// ============================================================
// EXPENSES
// ============================================================
export const Expenses = {
  getAll() { return get('expenses') || []; },
  save(e) { set('expenses', e); },

  add(expense) {
    const all = this.getAll();
    const newExp = { id: uid(), createdAt: now(), ...expense };
    all.push(newExp);
    this.save(all);
    Activity.log(`Expense recorded: ${expense.description || expense.category}`, 'expense');
    return newExp;
  },

  update(id, changes) {
    const all = this.getAll().map(e => e.id === id ? { ...e, ...changes, updatedAt: now() } : e);
    this.save(all);
    return all.find(e => e.id === id);
  },

  delete(id) { this.save(this.getAll().filter(e => e.id !== id)); },

  getById(id) { return this.getAll().find(e => e.id === id); },

  getToday() {
    const today = new Date().toISOString().slice(0,10);
    return this.getAll().filter(e => e.date === today);
  },

  getThisMonth() {
    const ym = new Date().toISOString().slice(0,7);
    return this.getAll().filter(e => e.date?.startsWith(ym));
  },

  getTotalToday() {
    return this.getToday().reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  },

  getTotalMonth() {
    return this.getThisMonth().reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  },

  filter({ from, to, category } = {}) {
    return this.getAll().filter(e => {
      if (from && e.date < from) return false;
      if (to   && e.date > to)   return false;
      if (category && category !== 'all' && e.category !== category) return false;
      return true;
    });
  },

  getTotal(from, to) {
    return this.filter({ from, to }).reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  },

  getByCategory(from, to) {
    const filtered = this.filter({ from, to });
    const map = {};
    filtered.forEach(e => {
      map[e.category] = (map[e.category] || 0) + (parseFloat(e.amount) || 0);
    });
    return map;
  }
};

// ============================================================
// EXPENSE CATEGORIES
// ============================================================
export const ExpenseCategories = {
  getAll() {
    return get('expense_categories') || [
      { id: 'utilities',  name: 'Utilities',      nameAm: 'ዩቲሊቲ',        icon: 'zap',          color: '#f59e0b' },
      { id: 'staff',      name: 'Staff / Salary',  nameAm: 'ደሞዝ',          icon: 'users',         color: '#3b82f6' },
      { id: 'supplies',   name: 'Supplies',         nameAm: 'አቅርቦቶች',       icon: 'shopping-bag',  color: '#22c55e' },
      { id: 'maintenance',name: 'Maintenance',      nameAm: 'ጥገና',           icon: 'wrench',        color: '#f97316' },
      { id: 'food',       name: 'Food & Catering',  nameAm: 'ምግብ',           icon: 'utensils',      color: '#a855f7' },
      { id: 'marketing',  name: 'Marketing',        nameAm: 'ማርኬቲንግ',        icon: 'megaphone',     color: '#06b6d4' },
      { id: 'other',      name: 'Other',            nameAm: 'ሌሎች',           icon: 'more-horizontal',color: '#8b96b5' },
    ];
  },
  save(c) { set('expense_categories', c); },
  add(cat) {
    const all = this.getAll();
    const nc = { id: uid(), ...cat };
    all.push(nc);
    this.save(all);
    return nc;
  },
  delete(id) { this.save(this.getAll().filter(c => c.id !== id)); },
  getById(id) { return this.getAll().find(c => c.id === id); },
  getName(id) {
    const c = this.getById(id);
    return c ? c.name : id;
  }
};

// ============================================================
// RESOURCES (Inventory)
// ============================================================
export const Resources = {
  getAll() { return get('resources') || []; },
  save(r) { set('resources', r); },

  add(item) {
    const all = this.getAll();
    const ni = { id: uid(), createdAt: now(), lastRestocked: now(), ...item };
    all.push(ni);
    this.save(all);
    return ni;
  },

  update(id, changes) {
    const all = this.getAll().map(r => r.id === id ? { ...r, ...changes, updatedAt: now() } : r);
    this.save(all);
    return all.find(r => r.id === id);
  },

  delete(id) { this.save(this.getAll().filter(r => r.id !== id)); },

  restock(id, qty) {
    return this.update(id, {
      quantity: (parseFloat(this.getById(id)?.quantity) || 0) + parseFloat(qty),
      lastRestocked: now()
    });
  },

  getById(id) { return this.getAll().find(r => r.id === id); },

  getLowStock() {
    return this.getAll().filter(r => parseFloat(r.quantity) <= parseFloat(r.minLevel || 0));
  }
};

// ============================================================
// FEEDBACK & REVIEWS
// ============================================================
export const Feedback = {
  getAll() { return get('feedback') || []; },
  save(f) { set('feedback', f); },

  add(review) {
    const all = this.getAll();
    const newReview = { id: uid(), createdAt: now(), ...review };
    all.push(newReview);
    this.save(all);
    return newReview;
  },

  update(id, changes) {
    const all = this.getAll().map(f => f.id === id ? { ...f, ...changes, updatedAt: now() } : f);
    this.save(all);
    return all.find(f => f.id === id);
  },

  delete(id) { this.save(this.getAll().filter(f => f.id !== id)); },
  getById(id) { return this.getAll().find(f => f.id === id); },

  getAverage() {
    const all = this.getAll();
    if (all.length === 0) return 0;
    return all.reduce((s, f) => s + (f.rating || 0), 0) / all.length;
  },

  getByGuest(guestId) { return this.getAll().filter(f => f.guestId === guestId); },

  getRecent(n = 10) { return this.getAll().sort((a,b) => b.createdAt.localeCompare(a.createdAt)).slice(0, n); }
};

// ============================================================
// ACTIVITY LOG
// ============================================================
export const Activity = {
  getAll() { return get('activity') || []; },

  log(message, type = 'info') {
    const all = this.getAll();
    all.unshift({ id: uid(), message, type, createdAt: now() });
    // Keep last 100
    set('activity', all.slice(0, 100));
  },

  getRecent(n = 10) { return this.getAll().slice(0, n); }
};

// ============================================================
// SETTINGS
// ============================================================
export const Settings = {
  get() {
    return get('settings') || {
      guestHouseName: 'My Guest House',
      ownerName:      'Owner',
      address:        '',
      phone:          '',
      email:          '',
      currency:       'ETB',
      language:       'en',
    };
  },
  save(s) {
    set('settings', { ...this.get(), ...s });
  },
  update(changes) {
    this.save({ ...this.get(), ...changes });
  }
};

// ============================================================
// SEED DATA (only if no data exists)
// ============================================================
export function seedDemoData() {
  if (get('seeded')) return;
  set('seeded', true);

  // Users
  Users.add({ username: 'admin', password: '123', role: 'superuser', name: 'Super Admin' });
  Users.add({ username: 'operator', password: '123', role: 'operator', name: 'Front Desk' });

  // Rooms (Name and Status removed from registration; Status is internal/default available)
  Rooms.add({ number: '101', type: 'single',  pricePerNight: 800,  floor: 1, capacity: 1, status: 'available',  amenities: 'WiFi, TV, AC' });
  Rooms.add({ number: '102', type: 'double',  pricePerNight: 1200, floor: 1, capacity: 2, status: 'occupied',   amenities: 'WiFi, TV, AC, Fridge' });
  Rooms.add({ number: '103', type: 'twin',    pricePerNight: 1200, floor: 1, capacity: 2, status: 'maintenance',amenities: 'WiFi, TV' });
  Rooms.add({ number: '201', type: 'suite',   pricePerNight: 2500, floor: 2, capacity: 4, status: 'occupied',   amenities: 'WiFi, TV, AC, Jacuzzi, Minibar' });
  Rooms.add({ number: '202', type: 'deluxe',  pricePerNight: 1800, floor: 2, capacity: 2, status: 'available',  amenities: 'WiFi, TV, AC, Balcony' });

  // Guests
  const g1 = Guests.add({ name: 'Abebe Kebede',    phone: '0911234567', email: 'abebe@email.com', idNumber: 'ET123456', idType: 'national_id', nationality: 'Ethiopian', address: 'Addis Ababa' });
  const g2 = Guests.add({ name: 'Sara Mohammed',   phone: '0922345678', email: 'sara@email.com',  idNumber: 'ET234567', idType: 'national_id', nationality: 'Ethiopian', address: 'Bahir Dar' });
  const g3 = Guests.add({ name: 'John Smith',      phone: '+1234567890',email: 'john@email.com',  idNumber: 'US987654', idType: 'passport',    nationality: 'American',  address: 'New York, USA' });

  // Reservations
  const today = new Date();
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  const tomorrow  = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const nextWeek  = new Date(today); nextWeek.setDate(today.getDate() + 5);

  const rooms = Rooms.getAll();
  Reservations.add({
    guestId: g1.id,
    roomId: rooms[1].id,
    checkIn: yesterday.toISOString().slice(0,10),
    checkOut: tomorrow.toISOString().slice(0,10),
    paidAmount: 1200,
    paymentMethod: 'cash',
    notes: 'Early check-in requested',
  });

  Reservations.add({
    guestId: g3.id,
    roomId: rooms[3].id,
    checkIn: today.toISOString().slice(0,10),
    checkOut: nextWeek.toISOString().slice(0,10),
    paidAmount: 12500,
    paymentMethod: 'transfer',
  });

  const futureCI = new Date(today); futureCI.setDate(today.getDate() + 2);
  const futureCO = new Date(today); futureCO.setDate(today.getDate() + 5);
  Reservations.add({
    guestId: g2.id,
    roomId: rooms[0].id,
    checkIn: futureCI.toISOString().slice(0,10),
    checkOut: futureCO.toISOString().slice(0,10),
    paidAmount: 0,
    paymentMethod: 'cash',
  });

  // Daytime Services
  DaytimeServices.add({ name: 'Conference Room',    price: 1500, category: 'Facilities',  duration: 'Full Day',   description: 'Air-conditioned conference room for up to 20 people' });
  DaytimeServices.add({ name: 'Laundry Service',    price: 150,  category: 'Laundry',     duration: 'Per load',   description: 'Wash and fold laundry service' });
  DaytimeServices.add({ name: 'Breakfast Buffet',   price: 350,  category: 'Meals',       duration: 'Per person', description: 'Full breakfast buffet service' });
  DaytimeServices.add({ name: 'Airport Transfer',   price: 800,  category: 'Transport',   duration: 'One way',    description: 'Drop or pickup from Bole Airport' });
  DaytimeServices.add({ name: 'Massage & Spa',      price: 600,  category: 'Wellness',    duration: '1 hour',     description: 'Relaxing massage and spa service' });

  // Expenses
  const expDates = [0,1,2,3,4,5,6].map(i => {
    const d = new Date(); d.setDate(d.getDate()-i); return d.toISOString().slice(0,10);
  });
  Expenses.add({ date: expDates[0], category: 'utilities',   amount: 1200, description: 'Electricity bill',    vendor: 'EEU',         paymentMethod: 'transfer' });
  Expenses.add({ date: expDates[0], category: 'supplies',    amount: 550,  description: 'Cleaning supplies',   vendor: 'Local Market', paymentMethod: 'cash' });
  Expenses.add({ date: expDates[1], category: 'staff',       amount: 3000, description: 'Weekly staff wages',  vendor: 'Staff',        paymentMethod: 'cash' });
  Expenses.add({ date: expDates[2], category: 'food',        amount: 800,  description: 'Breakfast supplies',  vendor: 'Supermarket',  paymentMethod: 'cash' });
  Expenses.add({ date: expDates[3], category: 'maintenance', amount: 450,  description: 'Plumbing repair',     vendor: 'Teklu Plumbing',paymentMethod:'cash' });
  Expenses.add({ date: expDates[4], category: 'utilities',   amount: 350,  description: 'Internet bill',       vendor: 'Ethio Telecom', paymentMethod:'transfer' });
  Expenses.add({ date: expDates[5], category: 'supplies',    amount: 280,  description: 'Towels & bed linen',  vendor: 'Textile Shop',  paymentMethod:'cash' });

  // Resources
  Resources.add({ name: 'Bath Towels',      category: 'Linens',    quantity: 45, unit: 'pcs',   minLevel: 20, costPerUnit: 80,  supplier: 'Textile Shop' });
  Resources.add({ name: 'Bed Sheets',       category: 'Linens',    quantity: 30, unit: 'sets',  minLevel: 15, costPerUnit: 150, supplier: 'Textile Shop' });
  Resources.add({ name: 'Soap Bars',        category: 'Toiletries',quantity: 8,  unit: 'boxes', minLevel: 5,  costPerUnit: 120, supplier: 'Supermarket' });
  Resources.add({ name: 'Shampoo',          category: 'Toiletries',quantity: 12, unit: 'btls',  minLevel: 10, costPerUnit: 45,  supplier: 'Supermarket' });
  Resources.add({ name: 'Bottled Water',    category: 'Food',      quantity: 3,  unit: 'crates',minLevel: 5,  costPerUnit: 250, supplier: 'Water Supplier' });
  Resources.add({ name: 'Coffee/Tea',       category: 'Food',      quantity: 6,  unit: 'pkgs',  minLevel: 4,  costPerUnit: 90,  supplier: 'Supermarket' });
  Resources.add({ name: 'Toilet Paper',     category: 'Supplies',  quantity: 60, unit: 'rolls', minLevel: 30, costPerUnit: 15,  supplier: 'Supermarket' });
  Resources.add({ name: 'Laundry Detergent',category: 'Supplies',  quantity: 4,  unit: 'kg',    minLevel: 5,  costPerUnit: 180, supplier: 'Local Market' });

  // Daytime bookings
  const svcs = DaytimeServices.getAll();
  DaytimeBookings.add({ serviceId: svcs[0].id, guestName: 'Kality Company', guestPhone: '0912000001', date: expDates[0], time: '09:00', quantity: 1, paidAmount: 1500, paymentMethod: 'transfer' });
  DaytimeBookings.add({ serviceId: svcs[2].id, guestName: 'Walk-in Guest',  guestPhone: '0912000002', date: expDates[0], time: '08:00', quantity: 3, paidAmount: 1050, paymentMethod: 'cash' });

  // Feedback
  Feedback.add({ guestId: g1.id, guestName: 'Abebe Kebede', reservationId: '', rating: 5, comment: 'Excellent service and clean rooms. Will definitely come back!' });
  Feedback.add({ guestId: g3.id, guestName: 'John Smith', reservationId: '', rating: 4, comment: 'Great location and friendly staff. The suite was very comfortable.' });
  Feedback.add({ guestId: g3.id, guestName: 'John Smith', reservationId: '', rating: 3, comment: 'Good overall but WiFi was a bit slow in the room.' });

  Activity.log('System initialized with demo data', 'info');
  Activity.log('Abebe Kebede checked in to Room 102', 'checkin');
  Activity.log('John Smith checked in to Room 201', 'checkin');
  Activity.log('Laundry service booked', 'service');
}
