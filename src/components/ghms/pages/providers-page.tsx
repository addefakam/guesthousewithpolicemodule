'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Building2,
  Search,
  Check,
  X,
  Eye,
  Ban,
  RotateCcw,
  Loader2,
  Phone,
  MapPin,
  FileText,
  User,
  Calendar,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Separator } from '@/components/ui/separator';
import {
  getProviders,
  approveProvider,
  rejectProvider,
  suspendProvider,
} from '@/lib/api';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';

type StatusFilter = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';

const statusFilters: { label: string; value: StatusFilter }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Rejected', value: 'REJECTED' },
  { label: 'Suspended', value: 'SUSPENDED' },
];

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

export default function ProvidersPage() {
  const { currentUser } = useAppStore();
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<StatusFilter>('ALL');
  const [search, setSearch] = useState('');
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [detailProvider, setDetailProvider] = useState<any>(null);

  const loadProviders = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getProviders();
      setProviders(Array.isArray(data) ? data : []);
    } catch (e: any) {
      toast.error(e.message || 'Failed to load providers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentUser?.id) {
      loadProviders();
    }
  }, [currentUser?.id, loadProviders]);

  const handleApprove = async (id: string) => {
    try {
      await approveProvider(id);
      toast.success('Provider approved');
      loadProviders();
    } catch (e: any) {
      toast.error(e.message || 'Failed to approve provider');
    }
  };

  const handleSuspend = async (id: string) => {
    try {
      await suspendProvider(id);
      toast.success('Provider suspended');
      loadProviders();
    } catch (e: any) {
      toast.error(e.message || 'Failed to suspend provider');
    }
  };

  const handleReactivate = async (id: string) => {
    try {
      await approveProvider(id);
      toast.success('Provider reactivated');
      loadProviders();
    } catch (e: any) {
      toast.error(e.message || 'Failed to reactivate provider');
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
      loadProviders();
    } catch (e: any) {
      toast.error(e.message || 'Failed to reject provider');
    } finally {
      setRejecting(false);
    }
  };

  const handleViewDetails = (provider: any) => {
    setDetailProvider(provider);
    setDetailDialogOpen(true);
  };

  const filteredProviders = providers.filter((p) => {
    const matchesStatus = activeFilter === 'ALL' || p.status === activeFilter;
    const matchesSearch =
      !search ||
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.ownerName?.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-64" />
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-1.5">
          {statusFilters.map((f) => (
            <Button
              key={f.value}
              variant={activeFilter === f.value ? 'default' : 'outline'}
              size="sm"
              className="h-8 text-xs"
              onClick={() => setActiveFilter(f.value)}
            >
              {f.label}
              {f.value !== 'ALL' && (
                <span className="ml-1.5 text-[10px] opacity-70">
                  ({providers.filter((p) => p.status === f.value).length})
                </span>
              )}
            </Button>
          ))}
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-8 text-sm"
          />
        </div>
      </div>

      {/* Providers Table */}
      <Card className="border-0 shadow-sm">
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
                  <TableHead className="text-xs font-semibold uppercase text-muted-foreground hidden md:table-cell">
                    Owner
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-muted-foreground hidden lg:table-cell">
                    Phone
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-muted-foreground hidden lg:table-cell">
                    Address
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-muted-foreground hidden xl:table-cell">
                    License
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-muted-foreground">
                    Status
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-muted-foreground text-right hidden sm:table-cell">
                    Rooms
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-muted-foreground text-right hidden md:table-cell">
                    Guests
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-muted-foreground hidden lg:table-cell">
                    Created
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-muted-foreground text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProviders.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={11}
                      className="text-center py-8 text-muted-foreground text-sm"
                    >
                      No providers found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProviders.map((p) => (
                    <TableRow key={p.id} className="border-border/50">
                      <TableCell className="font-medium text-sm">
                        {p.name}
                      </TableCell>
                      <TableCell className="text-sm">{p.type || '-'}</TableCell>
                      <TableCell className="text-sm hidden md:table-cell">
                        {p.ownerName || '-'}
                      </TableCell>
                      <TableCell className="text-sm hidden lg:table-cell">
                        {p.phone || '-'}
                      </TableCell>
                      <TableCell className="text-sm hidden lg:table-cell max-w-[200px] truncate">
                        {p.address || '-'}
                      </TableCell>
                      <TableCell className="text-sm hidden xl:table-cell">
                        {p.licenseNumber || '-'}
                      </TableCell>
                      <TableCell>{statusBadge(p.status)}</TableCell>
                      <TableCell className="text-sm text-right hidden sm:table-cell">
                        {p._count?.rooms ?? p.totalRooms ?? 0}
                      </TableCell>
                      <TableCell className="text-sm text-right hidden md:table-cell">
                        {p._count?.guests ?? p.totalGuests ?? 0}
                      </TableCell>
                      <TableCell className="text-sm hidden lg:table-cell">
                        {p.createdAt
                          ? new Date(p.createdAt).toLocaleDateString()
                          : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => handleViewDetails(p)}
                            title="View details"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          {p.status === 'PENDING' && (
                            <>
                              <Button
                                size="sm"
                                className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white"
                                onClick={() => handleApprove(p.id)}
                              >
                                <Check className="h-3 w-3 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50"
                                onClick={() => handleRejectClick(p.id)}
                              >
                                <X className="h-3 w-3 mr-1" />
                                Reject
                              </Button>
                            </>
                          )}
                          {p.status === 'APPROVED' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs text-amber-600 border-amber-200 hover:bg-amber-50"
                              onClick={() => handleSuspend(p.id)}
                            >
                              <Ban className="h-3 w-3 mr-1" />
                              Suspend
                            </Button>
                          )}
                          {(p.status === 'REJECTED' || p.status === 'SUSPENDED') && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs text-green-600 border-green-200 hover:bg-green-50"
                              onClick={() => handleReactivate(p.id)}
                            >
                              <RotateCcw className="h-3 w-3 mr-1" />
                              Reactivate
                            </Button>
                          )}
                        </div>
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

      {/* Provider Details Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-500" />
              Provider Details
            </DialogTitle>
          </DialogHeader>
          {detailProvider && (
            <div className="space-y-4 py-2">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  {detailProvider.name}
                </h3>
                {statusBadge(detailProvider.status)}
              </div>
              <Separator />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase">
                    Type
                  </p>
                  <p className="text-sm">{detailProvider.type || '-'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase">
                    Owner
                  </p>
                  <p className="text-sm">{detailProvider.ownerName || '-'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1">
                    <Phone className="h-3 w-3" /> Phone
                  </p>
                  <p className="text-sm">{detailProvider.phone || '-'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase">
                    Email
                  </p>
                  <p className="text-sm">{detailProvider.email || '-'}</p>
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> Address
                  </p>
                  <p className="text-sm">{detailProvider.address || '-'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1">
                    <FileText className="h-3 w-3" /> License
                  </p>
                  <p className="text-sm">{detailProvider.licenseNumber || '-'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Created
                  </p>
                  <p className="text-sm">
                    {detailProvider.createdAt
                      ? new Date(detailProvider.createdAt).toLocaleDateString()
                      : '-'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1">
                    <Building2 className="h-3 w-3" /> Rooms
                  </p>
                  <p className="text-sm">
                    {detailProvider._count?.rooms ?? detailProvider.totalRooms ?? 0}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1">
                    <User className="h-3 w-3" /> Guests
                  </p>
                  <p className="text-sm">
                    {detailProvider._count?.guests ?? detailProvider.totalGuests ?? 0}
                  </p>
                </div>
              </div>
              {detailProvider.rejectionReason && (
                <>
                  <Separator />
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-red-500 uppercase">
                      Rejection Reason
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {detailProvider.rejectionReason}
                    </p>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}