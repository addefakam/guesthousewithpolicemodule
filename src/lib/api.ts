import { useAppStore } from '@/lib/store';

const BASE_URL = '';

async function fetchAPI<T = any>(
  method: string,
  url: string,
  data?: any
): Promise<T> {
  const { currentUser } = useAppStore.getState();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Pass role and providerId for tenant isolation
  if (currentUser) {
    headers['x-user-role'] = currentUser.role;
    if (currentUser.providerId) {
      headers['x-provider-id'] = currentUser.providerId;
    }
  }

  const res = await fetch(`${BASE_URL}${url}`, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP ${res.status}`);
  }

  return res.json();
}

// Auth
export const login = (username: string, password: string) =>
  fetchAPI('POST', '/api/auth', { username, password });

// Dashboard
export const getDashboard = () => fetchAPI('GET', '/api/dashboard');

// Rooms
export const getRooms = (params?: Record<string, string>) => {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  return fetchAPI('GET', `/api/rooms${qs}`);
};
export const createRoom = (data: any) => fetchAPI('POST', '/api/rooms', data);
export const updateRoom = (id: string, data: any) =>
  fetchAPI('PUT', `/api/rooms?id=${id}`, data);
export const deleteRoom = (id: string) =>
  fetchAPI('DELETE', `/api/rooms?id=${id}`);
export const updateRoomStatus = (id: string, status: string) =>
  fetchAPI('PUT', `/api/rooms/${encodeURIComponent(id)}/status`, { status });

// Guests
export const getGuests = (search?: string) => {
  const qs = search ? `?search=${encodeURIComponent(search)}` : '';
  return fetchAPI('GET', `/api/guests${qs}`);
};
export const createGuest = (data: any) => fetchAPI('POST', '/api/guests', data);
export const updateGuest = (id: string, data: any) =>
  fetchAPI('PUT', `/api/guests?id=${id}`, data);
export const deleteGuest = (id: string) =>
  fetchAPI('DELETE', `/api/guests?id=${id}`);

// Reservations
export const getReservations = (params?: Record<string, string>) => {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  return fetchAPI('GET', `/api/reservations${qs}`);
};
export const createReservation = (data: any) =>
  fetchAPI('POST', '/api/reservations', data);
export const updateReservation = (id: string, data: any) =>
  fetchAPI('PUT', `/api/reservations?id=${id}`, data);
export const deleteReservation = (id: string) =>
  fetchAPI('DELETE', `/api/reservations?id=${id}`);
export const checkinReservation = (id: string) =>
  fetchAPI('POST', `/api/reservations/${encodeURIComponent(id)}/checkin`);
export const checkoutReservation = (id: string) =>
  fetchAPI('POST', `/api/reservations/${encodeURIComponent(id)}/checkout`);
export const cancelReservation = (id: string) =>
  fetchAPI('POST', `/api/reservations/${encodeURIComponent(id)}/cancel`);

// Daytime Services
export const getDaytimeServices = () =>
  fetchAPI('GET', '/api/daytime-services');
export const createDaytimeService = (data: any) =>
  fetchAPI('POST', '/api/daytime-services', data);
export const updateDaytimeService = (id: string, data: any) =>
  fetchAPI('PUT', `/api/daytime-services?id=${id}`, data);
export const deleteDaytimeService = (id: string) =>
  fetchAPI('DELETE', `/api/daytime-services?id=${id}`);

// Daytime Bookings
export const getDaytimeBookings = (params?: Record<string, string>) => {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  return fetchAPI('GET', `/api/daytime-bookings${qs}`);
};
export const createDaytimeBooking = (data: any) =>
  fetchAPI('POST', '/api/daytime-bookings', data);
export const updateDaytimeBooking = (id: string, data: any) =>
  fetchAPI('PUT', `/api/daytime-bookings?id=${id}`, data);
export const deleteDaytimeBooking = (id: string) =>
  fetchAPI('DELETE', `/api/daytime-bookings?id=${id}`);

// Expenses
export const getExpenses = (params?: Record<string, string>) => {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  return fetchAPI('GET', `/api/expenses${qs}`);
};
export const createExpense = (data: any) =>
  fetchAPI('POST', '/api/expenses', data);
export const updateExpense = (id: string, data: any) =>
  fetchAPI('PUT', `/api/expenses?id=${id}`, data);
export const deleteExpense = (id: string) =>
  fetchAPI('DELETE', `/api/expenses?id=${id}`);

// Expense Categories
export const getExpenseCategories = () =>
  fetchAPI('GET', '/api/expense-categories');
export const createExpenseCategory = (data: any) =>
  fetchAPI('POST', '/api/expense-categories', data);
export const deleteExpenseCategory = (id: string) =>
  fetchAPI('DELETE', `/api/expense-categories?id=${id}`);

// Resources
export const getResources = (params?: Record<string, string>) => {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  return fetchAPI('GET', `/api/resources${qs}`);
};
export const createResource = (data: any) =>
  fetchAPI('POST', '/api/resources', data);
export const updateResource = (id: string, data: any) =>
  fetchAPI('PUT', `/api/resources?id=${id}`, data);
export const deleteResource = (id: string) =>
  fetchAPI('DELETE', `/api/resources?id=${id}`);
export const restockResource = (id: string, quantity: number) =>
  fetchAPI('POST', `/api/resources/${encodeURIComponent(id)}/restock`, { quantity });

// Notifications
export const getNotifications = (unread?: boolean) => {
  const qs = unread !== undefined ? `?unread=${unread}` : '';
  return fetchAPI('GET', `/api/notifications${qs}`);
};
export const markNotificationsRead = (ids: string[]) =>
  fetchAPI('PUT', '/api/notifications', { ids });

// Housekeeping
export const getHousekeeping = (params?: Record<string, string>) => {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  return fetchAPI('GET', `/api/housekeeping${qs}`);
};
export const createHousekeepingTask = (data: any) =>
  fetchAPI('POST', '/api/housekeeping', data);
export const updateHousekeepingTask = (id: string, data: any) =>
  fetchAPI('PUT', `/api/housekeeping?id=${id}`, data);
export const deleteHousekeepingTask = (id: string) =>
  fetchAPI('DELETE', `/api/housekeeping?id=${id}`);

// Reviews
export const getReviews = (guestId?: string) => {
  const qs = guestId ? `?guestId=${guestId}` : '';
  return fetchAPI('GET', `/api/reviews${qs}`);
};
export const createReview = (data: any) =>
  fetchAPI('POST', '/api/reviews', data);

// Reports
export const getReports = (from: string, to: string) =>
  fetchAPI('GET', `/api/reports?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);

// Settings
export const getSettings = () => fetchAPI('GET', '/api/settings');
export const updateSettings = (data: any) =>
  fetchAPI('PUT', '/api/settings', data);

// Users
export const getUsers = () => fetchAPI('GET', '/api/users');
export const createUser = (data: any) => fetchAPI('POST', '/api/users', data);
export const updateUser = (id: string, data: any) =>
  fetchAPI('PUT', `/api/users?id=${id}`, data);
export const deleteUser = (id: string) =>
  fetchAPI('DELETE', `/api/users?id=${id}`);

// Payments
export const getPayments = (reservationId?: string) => {
  const qs = reservationId ? `?reservationId=${reservationId}` : '';
  return fetchAPI('GET', `/api/payments${qs}`);
};
export const createPayment = (data: any) =>
  fetchAPI('POST', '/api/payments', data);

// Data Import/Export
export const exportData = () => fetchAPI('GET', '/api/data');
export const importData = (data: any) => fetchAPI('POST', '/api/data', data);

// Activity Log
export const getActivity = (limit?: number) => {
  const qs = limit ? `?limit=${limit}` : '';
  return fetchAPI('GET', `/api/activity${qs}`);
};

// ─── Police / Provider Management ──────────────────────────────────

export const getProviders = () => fetchAPI('GET', '/api/providers');
export const approveProvider = (id: string) =>
  fetchAPI('PUT', `/api/providers?id=${id}`, { status: 'APPROVED' });
export const rejectProvider = (id: string, reason: string) =>
  fetchAPI('PUT', `/api/providers?id=${id}`, { status: 'REJECTED', rejectionReason: reason });
export const suspendProvider = (id: string) =>
  fetchAPI('PUT', `/api/providers?id=${id}`, { status: 'SUSPENDED' });
export const getPoliceDashboard = () => fetchAPI('GET', '/api/police-dashboard');
export const getPoliceGuests = (search?: string, providerId?: string) => {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (providerId) params.set('providerId', providerId);
  const qs = params.toString() ? `?${params}` : '';
  return fetchAPI('GET', `/api/police-guests${qs}`);
};

// Provider Registration Request
export const requestProviderAccess = (data: any) =>
  fetchAPI('POST', '/api/providers', data);