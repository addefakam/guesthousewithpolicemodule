'use client';

import { useState } from 'react';
import { Building2, Loader2, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useAppStore } from '@/lib/store';
import { login as apiLogin, requestProviderAccess } from '@/lib/api';
import { toast } from 'sonner';

export default function LoginPage() {
  const { setCurrentUser, setCurrentPage } = useAppStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [regForm, setRegForm] = useState({
    name: '', ownerName: '', phone: '', email: '', address: '', type: 'GUEST_HOUSE', licenseNo: '', username: '', password: '', confirmPassword: '',
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await apiLogin(username, password);
      setCurrentUser(user);
      setCurrentPage(user.role === 'POLICE' ? 'police-dashboard' : 'dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (regForm.password !== regForm.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await requestProviderAccess(regForm);
      toast.success('Registration submitted! Wait for police approval.');
      setShowRegister(false);
      setRegForm({ name: '', ownerName: '', phone: '', email: '', address: '', type: 'GUEST_HOUSE', licenseNo: '', username: '', password: '', confirmPassword: '' });
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  if (showRegister) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        </div>
        <Card className="relative w-full max-w-lg border-border/50 bg-card/80 backdrop-blur-sm shadow-2xl">
          <CardHeader className="text-center space-y-2 pb-2 pt-6">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Request System Access</h1>
              <p className="text-sm text-muted-foreground">Register your guest house for police approval</p>
            </div>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label className="text-xs">Business Name *</Label><Input value={regForm.name} onChange={e => setRegForm({...regForm, name: e.target.value})} required className="h-10" placeholder="e.g. Sunrise Guest House" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Owner Name *</Label><Input value={regForm.ownerName} onChange={e => setRegForm({...regForm, ownerName: e.target.value})} required className="h-10" placeholder="Full name" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Phone *</Label><Input value={regForm.phone} onChange={e => setRegForm({...regForm, phone: e.target.value})} required className="h-10" placeholder="+251 9XX XXX XXX" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Email</Label><Input type="email" value={regForm.email} onChange={e => setRegForm({...regForm, email: e.target.value})} className="h-10" placeholder="email@example.com" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Type</Label><select value={regForm.type} onChange={e => setRegForm({...regForm, type: e.target.value})} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="GUEST_HOUSE">Guest House</option><option value="HOTEL">Hotel</option><option value="LODGE">Lodge</option></select></div>
                <div className="space-y-1.5"><Label className="text-xs">License No.</Label><Input value={regForm.licenseNo} onChange={e => setRegForm({...regForm, licenseNo: e.target.value})} className="h-10" placeholder="License number" /></div>
              </div>
              <div className="space-y-1.5"><Label className="text-xs">Address</Label><Input value={regForm.address} onChange={e => setRegForm({...regForm, address: e.target.value})} className="h-10" placeholder="Full address" /></div>
              <div className="border-t pt-4 mt-2">
                <p className="text-xs font-medium text-muted-foreground mb-3">Admin Account</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5"><Label className="text-xs">Username *</Label><Input value={regForm.username} onChange={e => setRegForm({...regForm, username: e.target.value})} required className="h-10" placeholder="Login username" /></div>
                  <div className="space-y-1.5"><Label className="text-xs">Password *</Label><Input type="password" value={regForm.password} onChange={e => setRegForm({...regForm, password: e.target.value})} required className="h-10" placeholder="Password" /></div>
                </div>
                <div className="mt-3 space-y-1.5"><Label className="text-xs">Confirm Password *</Label><Input type="password" value={regForm.confirmPassword} onChange={e => setRegForm({...regForm, confirmPassword: e.target.value})} required className="h-10" placeholder="Confirm password" /></div>
              </div>
              {error && <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">{error}</div>}
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1 h-10" onClick={() => { setShowRegister(false); setError(''); }}>Back to Login</Button>
                <Button type="submit" className="flex-1 h-10" disabled={loading}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit Request'}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <Card className="relative w-full max-w-md border-border/50 bg-card/80 backdrop-blur-sm shadow-2xl">
        <CardHeader className="text-center space-y-4 pb-2 pt-8">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <Building2 className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">GHMS</h1>
            <p className="text-sm text-muted-foreground mt-1">Guest House Management System</p>
          </div>
        </CardHeader>

        <CardContent className="px-8 pb-8">
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium text-foreground">Username</Label>
              <Input id="username" type="text" placeholder="Enter your username" value={username} onChange={e => setUsername(e.target.value)} required className="h-11 bg-background border-border/50" autoComplete="username" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-foreground">Password</Label>
              <Input id="password" type="password" placeholder="Enter your password" value={password} onChange={e => setPassword(e.target.value)} required className="h-11 bg-background border-border/50" autoComplete="current-password" />
            </div>
            {error && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">{error}</div>
            )}
            <Button type="submit" className="w-full h-11 text-sm font-semibold" disabled={loading}>
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Signing in...</> : 'Sign In'}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-border/50 space-y-3">
            <button onClick={() => setShowRegister(true)} className="w-full text-center text-sm text-primary hover:underline font-medium">
              Request system access for your guest house
            </button>
            <div className="text-center space-y-1">
              <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5"><Shield className="h-3 w-3" /> Police: police / 123</p>
              <p className="text-xs text-muted-foreground">Provider: admin / 123 &nbsp;|&nbsp; admin2 / 123</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}