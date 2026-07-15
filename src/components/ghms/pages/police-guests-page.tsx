"use client";

import { useState, useEffect, useCallback } from "react";
import { useAppStore } from "@/lib/store";
import { apiPoliceGuests } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Search,
  Phone,
  Mail,
  MapPin,
  Globe,
  CreditCard,
  Calendar,
  Star,
  UserCircle,
} from "lucide-react";

interface Guest {
  id: string;
  name: string;
  phone: string;
  email: string;
  idNumber: string;
  idType: string;
  nationality: string;
  address: string;
  notes: string;
  vip: boolean;
  totalSpent: number;
  totalStays: number;
  providerId: string;
  createdAt: string;
  updatedAt: string;
  provider: { id: string; name: string } | null;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "ETB", minimumFractionDigits: 0 }).format(amount);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function PoliceGuestsPage() {
  const { refreshKey } = useAppStore();
  const [guests, setGuests] = useState<Guest[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const fetchGuests = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiPoliceGuests(search);
      setGuests(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to search guests";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => fetchGuests(), 300);
    return () => clearTimeout(timer);
  }, [fetchGuests, refreshKey]);

  const openDetail = (guest: Guest) => {
    setSelectedGuest(guest);
    setDetailOpen(true);
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Guest Registry</h2>
          <p className="text-sm text-muted-foreground">Search guests across all providers by name, phone, or ID number</p>
        </div>
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search guests..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Guests Table */}
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : guests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <UserCircle className="mb-3 h-12 w-12 text-muted-foreground/40" />
              <p className="text-muted-foreground">{search ? "No guests match your search" : "No guests registered yet"}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Guest Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>ID Number</TableHead>
                  <TableHead>ID Type</TableHead>
                  <TableHead>Nationality</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead className="text-right">Total Spent</TableHead>
                  <TableHead className="text-center">Stays</TableHead>
                  <TableHead className="text-center">VIP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {guests.map((guest) => (
                  <TableRow
                    key={guest.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => openDetail(guest)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {guest.name}
                        {guest.vip && (
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{guest.phone}</TableCell>
                    <TableCell className="font-mono text-sm">{guest.idNumber || "—"}</TableCell>
                    <TableCell>
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium">
                        {guest.idType || "—"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {guest.nationality ? (
                          <>
                            <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-sm">{guest.nationality}</span>
                          </>
                        ) : (
                          "—"
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal">
                        {guest.provider?.name || "Unknown"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(guest.totalSpent)}</TableCell>
                    <TableCell className="text-center">{guest.totalStays}</TableCell>
                    <TableCell className="text-center">
                      {guest.vip ? (
                        <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200">
                          VIP
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* Guest Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCircle className="h-5 w-5" />
              {selectedGuest?.name}
              {selectedGuest?.vip && (
                <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200">
                  VIP
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>Guest details from {selectedGuest?.provider?.name || "Unknown Provider"}</DialogDescription>
          </DialogHeader>
          {selectedGuest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Phone</Label>
                  <p className="flex items-center gap-1.5 font-medium">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    {selectedGuest.phone}
                  </p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Email</Label>
                  <p className="flex items-center gap-1.5 font-medium">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    {selectedGuest.email || "—"}
                  </p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground">ID Number</Label>
                  <p className="font-mono font-medium">{selectedGuest.idNumber || "—"}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground">ID Type</Label>
                  <p className="font-medium">{selectedGuest.idType || "—"}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Nationality</Label>
                  <p className="flex items-center gap-1.5 font-medium">
                    <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                    {selectedGuest.nationality || "—"}
                  </p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Registered</Label>
                  <p className="flex items-center gap-1.5 font-medium">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    {formatDate(selectedGuest.createdAt)}
                  </p>
                </div>
              </div>

              {selectedGuest.address && (
                <div className="space-y-1 text-sm">
                  <Label className="text-muted-foreground">Address</Label>
                  <p className="flex items-center gap-1.5 font-medium">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    {selectedGuest.address}
                  </p>
                </div>
              )}

              <Separator />

              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-lg border bg-muted/30 p-3 text-center">
                  <CreditCard className="mx-auto mb-1 h-4 w-4 text-muted-foreground" />
                  <p className="text-lg font-bold">{formatCurrency(selectedGuest.totalSpent)}</p>
                  <p className="text-xs text-muted-foreground">Total Spent</p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3 text-center">
                  <p className="text-lg font-bold">{selectedGuest.totalStays}</p>
                  <p className="text-xs text-muted-foreground">Total Stays</p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3 text-center">
                  <p className="text-lg font-bold">{selectedGuest.vip ? "⭐ Yes" : "—"} </p>
                  <p className="text-xs text-muted-foreground">VIP Status</p>
                </div>
              </div>

              {selectedGuest.notes && (
                <>
                  <Separator />
                  <div className="space-y-1 text-sm">
                    <Label className="text-muted-foreground">Notes</Label>
                    <p className="rounded-lg bg-muted/50 p-3">{selectedGuest.notes}</p>
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