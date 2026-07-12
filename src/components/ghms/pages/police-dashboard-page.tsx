'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Building2,
  Clock,
  Users,
  TrendingUp,
  CalendarCheck,
  DollarSign,
  BedDouble,
  Loader2,
  Check,
  X,
  Shield,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  getPoliceDashboard,
  approveProvider,
  rejectProvider,
} from '@/lib/api';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';

function statusBadge(status: string) {
  switch (status) {
    case 'APPROVED':
      return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">{status}</Badge>;
    case 'PENDING':
      return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">{status}</Badge>;
    case 'REJECTED':
      return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">{status}</Badge>;
    case 'SUSPENDED':
      return <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100">{status}</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export default function PoliceDashboardPage() {
  const { currentUser } = useAppStore();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const d = await getPoliceDashboard();
      setData(d);
    } catch (e: any) {
      toast.error(e.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentUser?.id) {
      loadDashboard();
    }
  }, [currentUser?.id, loadDashboard]);

  const handleApprove = async (id: string) => {
    try {
      await approveProvider(id);
      toast.success('Provider approved');
      loadDashboard();
    } catch (e: any) {
      toast.error(e.message || 'Failed to approve provider');
    }
  };

  const handleRejectClick = (id: string) => {
    setRejectId(id);
    setRejectReason('');
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = async () => {
    if (!rejectId) return;
    if (!rejectReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }
    try {
      setRejecting(true);
      await rejectProvider(rejectId, rejectReason.trim());
      toast.success('Provider rejected');
      setRejectDialogOpen(false);
      setRejectId(null);
      setRejectReason('');
      loadDashboard();
    } catch (e: any) {
      toast.error(e.message || 'Failed to reject provider');
    } finally {
      setRejecting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  const pendingRequests = data?.pendingRequests || [];
  const providerOverview = data?.providerOverview || [];
  const currentGuests = data?.currentGuests || [];
  const stats = data?.stats || {};

  return (
    <div className="space-y-6">
      {/* Top Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Approved Providers
                </p>
                <p className="mt-1 text-2xl font-bold text-foreground">
                  {stats.totalApprovedProviders ?? 0}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Pending Requests
                </p>
                <p className="mt-1 text-2xl font-bold text-foreground">
                  {stats.pendingRequests ?? 0}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Total Guests in City
                </p>
                <p className="mt-1 text-2xl font-bold text-foreground">
                  {stats.totalGuestsInCity ?? 0}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                <Users className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  City-wide Occupancy
                </p>
                <p className="mt-1 text-2xl font-bold text-foreground">
                  {stats.cityWideOccupancyRate != null
                    ? `${stats.cityWideOccupancyRate.toFixed(1)}%`
                    : '0%'}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Second Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Active Reservations
                </p>
                <p className="mt-1 text-2xl font-bold text-foreground">
                  {stats.activeReservations ?? 0}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-100">
                <CalendarCheck className="h-5 w-5 text-sky-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Total Revenue
                </p>
                <p className="mt-1 text-2xl font-bold text-foreground">
                  {stats.totalRevenue != null
                    ? `${Number(stats.totalRevenue).toLocaleString()} ETB`
                    : '0 ETB'}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
                <DollarSign className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Rooms / Occupied
                </p>
                <p className="mt-1 text-2xl font-bold text-foreground">
                  {stats.totalRooms ?? 0} / {stats.occupiedRooms ?? 0}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100">
                <BedDouble className="h-5 w-5 text-violet-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Requests Section */}
      {pendingRequests.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              Pending Approval Requests
              <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 ml-1">
                {pendingRequests.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingRequests.map((p: any) => (
              <div
                key={p.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-border/50 p-4 bg-white"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-foreground">
                      {p.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({p.type})
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Owner: {p.ownerName} &middot; Phone: {p.phone}
                  </p>
                  {p.address && (
                    <p className="text-xs text-muted-foreground">
                      {p.address}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    className="h-8 bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => handleApprove(p.id)}
                  >
                    <Check className="h-3.5 w-3.5 mr-1" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                    onClick={() => handleRejectClick(p.id)}
                  >
                    <X className="h-3.5 w-3.5 mr-1" />
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Provider Overview Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Building2 className="h-4 w-4 text-blue-500" />
            Provider Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead className="text-xs font-semibold uppercase text-muted-foreground">
                    Name
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-muted-foreground">
                    Type
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-muted-foreground">
                    Owner
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-muted-foreground hidden md:table-cell">
                    Phone
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-muted-foreground text-right">
                    Rooms
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-muted-foreground text-right">
                    Occupied
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-muted-foreground text-right">
                    Guests
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-muted-foreground text-right hidden sm:table-cell">
                    Revenue
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {providerOverview.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center py-8 text-muted-foreground text-sm"
                    >
                      No approved providers found
                    </TableCell>
                  </TableRow>
                ) : (
                  providerOverview.map((p: any) => (
                    <TableRow key={p.id} className="border-border/50">
                      <TableCell className="font-medium text-sm">
                        {p.name}
                      </TableCell>
                      <TableCell className="text-sm">{p.type}</TableCell>
                      <TableCell className="text-sm">{p.ownerName}</TableCell>
                      <TableCell className="text-sm hidden md:table-cell">
                        {p.phone}
                      </TableCell>
                      <TableCell className="text-sm text-right">
                        {p.totalRooms ?? 0}
                      </TableCell>
                      <TableCell className="text-sm text-right">
                        {p.occupiedRooms ?? 0}
                      </TableCell>
                      <TableCell className="text-sm text-right">
                        {p.totalGuests ?? 0}
                      </TableCell>
                      <TableCell className="text-sm text-right hidden sm:table-cell">
                        {p.revenue != null
                          ? `${Number(p.revenue).toLocaleString()} ETB`
                          : '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Currently Checked-In Guests Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Users className="h-4 w-4 text-green-500" />
            Currently Checked-In Guests
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead className="text-xs font-semibold uppercase text-muted-foreground">
                    Guest Name
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-muted-foreground hidden md:table-cell">
                    Phone
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-muted-foreground hidden lg:table-cell">
                    ID Number
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-muted-foreground hidden lg:table-cell">
                    Nationality
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-muted-foreground">
                    Provider
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-muted-foreground hidden sm:table-cell">
                    Room
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-muted-foreground hidden md:table-cell">
                    Check-in
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-muted-foreground hidden md:table-cell">
                    Check-out
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentGuests.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center py-8 text-muted-foreground text-sm"
                    >
                      No guests currently checked in
                    </TableCell>
                  </TableRow>
                ) : (
                  currentGuests.map((g: any) => (
                    <TableRow key={g.id} className="border-border/50">
                      <TableCell className="font-medium text-sm">
                        {g.guestName}
                      </TableCell>
                      <TableCell className="text-sm hidden md:table-cell">
                        {g.guestPhone}
                      </TableCell>
                      <TableCell className="text-sm hidden lg:table-cell">
                        {g.guestIdNumber}
                      </TableCell>
                      <TableCell className="text-sm hidden lg:table-cell">
                        {g.guestNationality || '-'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {g.providerName}
                      </TableCell>
                      <TableCell className="text-sm hidden sm:table-cell">
                        {g.roomNumber || g.roomName || '-'}
                      </TableCell>
                      <TableCell className="text-sm hidden md:table-cell">
                        {g.checkIn
                          ? new Date(g.checkIn).toLocaleDateString()
                          : '-'}
                      </TableCell>
                      <TableCell className="text-sm hidden md:table-cell">
                        {g.checkOut
                          ? new Date(g.checkOut).toLocaleDateString()
                          : '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Rejection Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <X className="h-5 w-5 text-red-500" />
              Reject Provider
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="reject-reason">
                Please provide a reason for rejection
              </Label>
              <Textarea
                id="reject-reason"
                placeholder="Enter rejection reason..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setRejectDialogOpen(false)}
              disabled={rejecting}
            >
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleRejectConfirm}
              disabled={rejecting}
            >
              {rejecting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Reject Provider
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}