// Helper to get providerId from request headers
// Police users (role=POLICE) get null — they see all data
// Provider users get their providerId — they see only their own data
export function getProviderFilter(request: Request): { providerId: string | null; isPolice: boolean } {
  const role = request.headers.get('x-user-role');
  const providerId = request.headers.get('x-provider-id');
  const isPolice = role === 'POLICE';
  return {
    providerId: isPolice ? null : (providerId || null),
    isPolice,
  };
}