"use client";

import { useState, useEffect, useCallback } from "react";
import { useAppStore } from "@/lib/store";
import { apiGetProviders, apiUpdateProvider } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import {
  Building2,
  CheckCircle2,
  XCircle,
  Ban,
  Eye,
  Phone,
  Mail,
  MapPin,
  FileText,
  Calendar,
  ShieldCheck,
} from "lucide-react";

interface Provider {
  id: string;
  name: string;
  ownerName: string;
  phone: string;
  email: string;
  address: string;
  type: string;
  licenseNo: string;
  licenseFile: string;
  status: string;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectionReason: string;
  createdAt: string;
  updatedAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  PENDING: { label: "Pending", variant: "secondary" },
  APPROVED: { label: "Approved", variant: "default" },
  REJECTED: { label: "Rejected", variant: "destructive" },
  SUSPENDED: { label: "Suspended", variant: "outline" },
};

const STATUS_BADGE_CLASS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-yellow-200",
  APPROVED: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200",
  REJECTED: "bg-red-100 text-red-800 hover:bg-red-100 border-red-200",
  SUSPENDED: "bg-orange-100 text-orange-800 hover:bg-orange-100 border-orange-200",
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || { label: status, variant: "secondary" as const };
  return (
    <Badge variant={cfg.variant} className={STATUS_BADGE_CLASS[status] || ""}>
      {cfg.label}
    </Badge>
  );
}

export default function ProvidersPage() {
  const { refreshKey, triggerRefresh } = useAppStore();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Action dialogs
  const [rejectDialog, setRejectDialog] = useState<Provider | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [confirmAction, setConfirmAction] = useState<{ provider: Provider; action: string } | null>(null);
  const [actioning, setActioning] = useState(false);

  const fetchProviders = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiGetProviders();
      setProviders(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load providers";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders, refreshKey]);

  const openDetail = (provider: Provider) => {
    setSelectedProvider(provider);
    setDetailOpen(true);
  };

  const openReject = (provider: Provider) => {
    setRejectDialog(provider);
    setRejectReason("");
  };

  const handleReject = async () => {
    if (!rejectDialog || !rejectReason.trim()) {
      toast.error("Rejection reason is required");
      return;
    }
    try {
      setActioning(true);
      await apiUpdateProvider(rejectDialog.id, { status: "REJECTED", rejectionReason: rejectReason.trim() });
      toast.success("Provider rejected");
      setRejectDialog(null);
      setRejectReason("");
      triggerRefresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to reject provider";
      toast.error(message);
    } finally {
      setActioning(false);
    }
  };

  const handleStatusAction = async (provider: Provider, status: string) => {
    try {
      setActioning(true);
      await apiUpdateProvider(provider.id, { status });
      toast.success(`Provider ${status.toLowerCase()}`);
      setConfirmAction(null);
      triggerRefresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update provider";
      toast.error(message);
    } finally {
      setActioning(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const approvedCount = providers.filter((p) => p.status === "APPROVED").length;
  const pendingCount = providers.filter((p) => p.status === "PENDING").length;

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
              <Building2 className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Providers</p>
              <p className="text-2xl font-bold">{providers.length}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Approved</p>
              <p className="text-2xl font-bold text-emerald-600">{approvedCount}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-50">
              <ShieldCheck className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pending Review</p>
              <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Providers Table */}
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="border-b px-6 py-4">
          <h2 className="text-lg font-semibold">Provider Applications</h2>
          <p className="text-sm text-muted-foreground">Manage guest house registrations and licensing</p>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : providers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Building2 className="mb-3 h-12 w-12 text-muted-foreground/40" />
              <p className="text-muted-foreground">No providers registered yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Provider Name</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>License No</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {providers.map((provider) => (
                  <TableRow
                    key={provider.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => openDetail(provider)}
                  >
                    <TableCell className="font-medium">{provider.name}</TableCell>
                    <TableCell>{provider.ownerName}</TableCell>
                    <TableCell>{provider.phone}</TableCell>
                    <TableCell className="max-w-[180px] truncate">{provider.email || "—"}</TableCell>
                    <TableCell>
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium">
                        {provider.type.replace(/_/g, " ")}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{provider.licenseNo || "—"}</TableCell>
                    <TableCell>
                      <StatusBadge status={provider.status} />
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        {provider.status !== "APPROVED" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                            onClick={() => setConfirmAction({ provider, action: "APPROVED" })}
                          >
                            <CheckCircle2 className="mr-1 h-4 w-4" />
                            <span className="hidden sm:inline">Approve</span>
                          </Button>
                        )}
                        {provider.status !== "REJECTED" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 text-red-600 hover:bg-red-50 hover:text-red-700"
                            onClick={() => openReject(provider)}
                          >
                            <XCircle className="mr-1 h-4 w-4" />
                            <span className="hidden sm:inline">Reject</span>
                          </Button>
                        )}
                        {provider.status === "APPROVED" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 text-orange-600 hover:bg-orange-50 hover:text-orange-700"
                            onClick={() => setConfirmAction({ provider, action: "SUSPENDED" })}
                          >
                            <Ban className="mr-1 h-4 w-4" />
                            <span className="hidden sm:inline">Suspend</span>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* Provider Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {selectedProvider?.name}
            </DialogTitle>
            <DialogDescription>Provider registration details</DialogDescription>
          </DialogHeader>
          {selectedProvider && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Owner Name</Label>
                  <p className="font-medium">{selectedProvider.ownerName}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Status</Label>
                  <div>
                    <StatusBadge status={selectedProvider.status} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Phone</Label>
                  <p className="flex items-center gap-1.5 font-medium">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    {selectedProvider.phone}
                  </p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Email</Label>
                  <p className="flex items-center gap-1.5 font-medium">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    {selectedProvider.email || "—"}
                  </p>
                </div>
                <div className="col-span-2 space-y-1">
                  <Label className="text-muted-foreground">Address</Label>
                  <p className="flex items-center gap-1.5 font-medium">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                    {selectedProvider.address || "—"}
                  </p>
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Type</Label>
                  <p className="font-medium">{selectedProvider.type.replace(/_/g, " ")}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground">License No</Label>
                  <p className="font-mono font-medium">{selectedProvider.licenseNo || "—"}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Registered</Label>
                  <p className="flex items-center gap-1.5 font-medium">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    {formatDate(selectedProvider.createdAt)}
                  </p>
                </div>
                {selectedProvider.approvedAt && (
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">Approved At</Label>
                    <p className="font-medium">{formatDate(selectedProvider.approvedAt)}</p>
                  </div>
                )}
                {selectedProvider.approvedBy && (
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">Approved By</Label>
                    <p className="font-medium">{selectedProvider.approvedBy}</p>
                  </div>
                )}
              </div>
              {selectedProvider.rejectionReason && (
                <>
                  <Separator />
                  <div className="space-y-1 text-sm">
                    <Label className="text-red-600">Rejection Reason</Label>
                    <p className="rounded-lg bg-red-50 p-3 text-red-800">{selectedProvider.rejectionReason}</p>
                  </div>
                </>
              )}
              {selectedProvider.licenseFile && (
                <div className="space-y-1 text-sm">
                  <Label className="text-muted-foreground">License Document</Label>
                  <a
                    href={selectedProvider.licenseFile}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium text-primary hover:bg-muted transition-colors"
                  >
                    <FileText className="h-4 w-4" />
                    View License File
                  </a>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={!!rejectDialog} onOpenChange={(open) => !open && setRejectDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" />
              Reject Provider
            </DialogTitle>
            <DialogDescription>
              Rejecting <strong>{rejectDialog?.name}</strong>. Please provide a reason.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject-reason">Rejection Reason *</Label>
            <Textarea
              id="reject-reason"
              placeholder="Enter the reason for rejection..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog(null)} disabled={actioning}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={actioning || !rejectReason.trim()}
            >
              {actioning ? "Rejecting..." : "Confirm Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Approve/Suspend Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.action === "APPROVED" ? "Approve Provider" : "Suspend Provider"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.action === "APPROVED"
                ? `Are you sure you want to approve "${confirmAction?.provider.name}"? The provider will be able to operate.`
                : `Are you sure you want to suspend "${confirmAction?.provider.name}"? The provider will lose access until re-approved.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actioning}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                confirmAction && handleStatusAction(confirmAction.provider, confirmAction.action)
              }
              disabled={actioning}
              className={
                confirmAction?.action === "APPROVED"
                  ? "bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-600"
                  : "bg-orange-600 hover:bg-orange-700 focus:ring-orange-600"
              }
            >
              {actioning ? "Processing..." : confirmAction?.action === "APPROVED" ? "Approve" : "Suspend"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}