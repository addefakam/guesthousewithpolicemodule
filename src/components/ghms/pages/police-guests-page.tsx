'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Eye,
  Loader2,
  User,
  Phone,
  CreditCard,
  Globe,
  MapPin,
  Mail,
  Building2,
  BedDouble,
  CalendarDays,
  Hash,
} from 'lucide-react';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
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
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { getPoliceGuests } from '@/lib/api';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';

export default function PoliceGuestsPage() {
  const { currentUser } = useAppStore();
  const [guests, setGuests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [providerFilter, setProviderFilter] = useState<string>('all');
  const [providers, setProviders] = useState<{ id: string; name: string }[]>([]);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [detailGuest, setDetailGuest] = useState<any>(null);

  const loadGuests = useCallback(async () => {
    try {
      setLoading(true);
      const pId = providerFilter === 'all' ? undefined : providerFilter;
      const data = await getPoliceGuests(search || undefined, pId);
      setGuests(Array.isArray(data) ? data : []);
      // Extract unique providers from results for filter
      if (Array.isArray(data)) {
        const uniqueProviders = data
          .map((g: any) => g.provider)
          .filter(Boolean)
          .filter(
            (p: any, i: number, arr: any[]) =>
              arr.findIndex((a: any) => a.id === p.id) === i
          );
        setProviders(uniqueProviders);
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to load guests');
    } finally {
      setLoading(false);
    }
  }, [search, providerFilter]);

  useEffect(() => {
    if (currentUser?.id) {
      loadGuests();
    }
  }, [currentUser?.id, loadGuests]);

  const handleViewDetails = (guest: any) => {
    setDetailGuest(guest);
    setDetailDialogOpen(true);
  };

  const getActiveStay = (guest: any) => {
    if (!guest.reservations || guest.reservations.length === 0) return null;
    const now = new Date();
    const active = guest.reservations.find((r: any) => {
      if (!r.checkIn) return false;
      const checkIn = new Date(r.checkIn);
      const checkOut = r.checkOut ? new Date(r.checkOut) : null;
      return checkIn <= now && (!checkOut || checkOut >= now);
    });
    return active || null;
  };

  if (loading) {
    return (
      <div className="space-y-4">
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
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by guest name, phone, or ID number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-8 text-sm"
          />
        </div>
        <Select value={providerFilter} onValueChange={setProviderFilter}>
          <SelectTrigger className="h-9 w-full sm:w-64 text-sm">
            <SelectValue placeholder="All Providers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Providers</SelectItem>
            {providers.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Guests Table */}
      <Card className="border-0 shadow-sm">
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
                  <TableHead className="text-xs font-semibold uppercase text-muted-foreground hidden xl:table-cell">
                    ID Type
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-muted-foreground hidden lg:table-cell">
                    Nationality
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-muted-foreground">
                    Provider
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-muted-foreground text-right hidden sm:table-cell">
                    Total Stays
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-muted-foreground hidden md:table-cell">
                    Current Stay
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-muted-foreground text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {guests.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="text-center py-8 text-muted-foreground text-sm"
                    >
                      No guests found
                    </TableCell>
                  </TableRow>
                ) : (
                  guests.map((g) => {
                    const activeStay = getActiveStay(g);
                    return (
                      <TableRow key={g.id} className="border-border/50">
                        <TableCell className="font-medium text-sm">
                          {g.name}
                        </TableCell>
                        <TableCell className="text-sm hidden md:table-cell">
                          {g.phone || '-'}
                        </TableCell>
                        <TableCell className="text-sm hidden lg:table-cell">
                          {g.idNumber || '-'}
                        </TableCell>
                        <TableCell className="text-sm hidden xl:table-cell">
                          {g.idType || '-'}
                        </TableCell>
                        <TableCell className="text-sm hidden lg:table-cell">
                          {g.nationality || '-'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {g.provider?.name || '-'}
                        </TableCell>
                        <TableCell className="text-sm text-right hidden sm:table-cell">
                          {g._count?.reservations ?? g.reservations?.length ?? 0}
                        </TableCell>
                        <TableCell className="text-sm hidden md:table-cell">
                          {activeStay ? (
                            <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                              Room {activeStay.room?.number || activeStay.room?.name || 'N/A'}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">None</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => handleViewDetails(g)}
                            title="View details"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Guest Details Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-blue-500" />
              Guest Details
            </DialogTitle>
          </DialogHeader>
          {detailGuest && (
            <div className="space-y-4 py-2">
              {/* Guest Info */}
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{detailGuest.name}</h3>
                <Badge
                  className={
                    getActiveStay(detailGuest)
                      ? 'bg-green-100 text-green-700 hover:bg-green-100'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-100'
                  }
                >
                  {getActiveStay(detailGuest) ? 'Currently Staying' : 'Not Staying'}
                </Badge>
              </div>

              <Separator />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1">
                    <Phone className="h-3 w-3" /> Phone
                  </p>
                  <p className="text-sm">{detailGuest.phone || '-'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1">
                    <Mail className="h-3 w-3" /> Email
                  </p>
                  <p className="text-sm">{detailGuest.email || '-'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1">
                    <CreditCard className="h-3 w-3" /> ID Number
                  </p>
                  <p className="text-sm">{detailGuest.idNumber || '-'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1">
                    <Hash className="h-3 w-3" /> ID Type
                  </p>
                  <p className="text-sm">{detailGuest.idType || '-'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1">
                    <Globe className="h-3 w-3" /> Nationality
                  </p>
                  <p className="text-sm">{detailGuest.nationality || '-'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> Address
                  </p>
                  <p className="text-sm">{detailGuest.address || '-'}</p>
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1">
                    <Building2 className="h-3 w-3" /> Provider
                  </p>
                  <p className="text-sm">
                    {detailGuest.provider?.name || '-'}
                    {detailGuest.provider?.type && (
                      <span className="text-muted-foreground ml-1">
                        ({detailGuest.provider.type})
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Reservation History */}
              {detailGuest.reservations && detailGuest.reservations.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-semibold flex items-center gap-2 mb-3">
                      <CalendarDays className="h-4 w-4 text-blue-500" />
                      Reservation History
                    </h4>
                    <div className="rounded-lg border border-border/50 overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/30 hover:bg-muted/30">
                            <TableHead className="text-xs font-semibold uppercase text-muted-foreground">
                              Room
                            </TableHead>
                            <TableHead className="text-xs font-semibold uppercase text-muted-foreground hidden sm:table-cell">
                              Check-in
                            </TableHead>
                            <TableHead className="text-xs font-semibold uppercase text-muted-foreground hidden sm:table-cell">
                              Check-out
                            </TableHead>
                            <TableHead className="text-xs font-semibold uppercase text-muted-foreground">
                              Status
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {detailGuest.reservations.map((r: any, idx: number) => {
                            const now = new Date();
                            const checkIn = r.checkIn ? new Date(r.checkIn) : null;
                            const checkOut = r.checkOut ? new Date(r.checkOut) : null;
                            const isActive =
                              checkIn &&
                              checkIn <= now &&
                              (!checkOut || checkOut >= now);
                            const isPast = checkOut && checkOut < now;

                            return (
                              <TableRow key={idx} className="border-border/50">
                                <TableCell className="text-sm">
                                  <div className="flex items-center gap-1.5">
                                    <BedDouble className="h-3.5 w-3.5 text-muted-foreground" />
                                    {r.room?.number || r.room?.name || '-'}
                                  </div>
                                </TableCell>
                                <TableCell className="text-sm hidden sm:table-cell">
                                  {checkIn
                                    ? checkIn.toLocaleDateString()
                                    : '-'}
                                </TableCell>
                                <TableCell className="text-sm hidden sm:table-cell">
                                  {checkOut
                                    ? checkOut.toLocaleDateString()
                                    : '-'}
                                </TableCell>
                                <TableCell>
                                  {isActive ? (
                                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100 text-xs">
                                      Active
                                    </Badge>
                                  ) : isPast ? (
                                    <Badge variant="outline" className="text-xs">
                                      Completed
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 text-xs">
                                      Upcoming
                                    </Badge>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
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