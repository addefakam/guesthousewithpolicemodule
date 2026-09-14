"use client";

import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, Shield, UserCog, User, Crown, Plus, Trash2, AlertCircle } from "lucide-react";

/**
 * Companion — a single person traveling with the family leader.
 * Used for both family members, security personnel, and servants.
 */
export interface Companion {
  name: string;
  idNumber: string;
  idType: string;
  phone: string;
  nationality: string;
  role: "FAMILY" | "SECURITY" | "SERVANT";
}

/**
 * FamilyCompanionForm — multi-step dialog for collecting a family
 * reservation's full roster:
 *   Step 1: leader is already chosen (the primary guest on the
 *           reservation, collected via the existing guest search).
 *   Step 2: operator enters how many family/security/servants will
 *           travel under this leader.
 *   Step 3: per-companion form fills in each person's ID details.
 *
 * On submit, calls onConfirm(companions) and the parent stores them
 * to send to the API alongside the reservation.
 *
 * Usage:
 *   <FamilyCompanionForm
 *     open={open}
 *     onOpenChange={setOpen}
 *     leaderName={leaderName}
 *     onConfirm={(companions) => { ... }}
 *   />
 */
export function FamilyCompanionForm({
  open,
  onOpenChange,
  leaderName,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leaderName: string;
  onConfirm: (companions: Companion[]) => void;
}) {
  const { t } = useTranslation("mobile");
  const [numFamily, setNumFamily] = useState("0");
  const [numSecurity, setNumSecurity] = useState("0");
  const [numServant, setNumServant] = useState("0");
  const [step, setStep] = useState<1 | 2>(1);
  const [companions, setCompanions] = useState<Companion[]>([]);
  const [error, setError] = useState<string | null>(null);

  const totalCount = useMemo(() => {
    return (
      (parseInt(numFamily, 10) || 0) +
      (parseInt(numSecurity, 10) || 0) +
      (parseInt(numServant, 10) || 0)
    );
  }, [numFamily, numSecurity, numServant]);

  // Generate companion slots when moving from step 1 → step 2
  const handleProceed = () => {
    setError(null);
    if (totalCount === 0) {
      setError(t("companionRequired"));
      return;
    }
    const slots: Companion[] = [];
    for (let i = 0; i < (parseInt(numFamily, 10) || 0); i++) {
      slots.push({ name: "", idNumber: "", idType: "NATIONAL_ID", phone: "", nationality: "", role: "FAMILY" });
    }
    for (let i = 0; i < (parseInt(numSecurity, 10) || 0); i++) {
      slots.push({ name: "", idNumber: "", idType: "NATIONAL_ID", phone: "", nationality: "", role: "SECURITY" });
    }
    for (let i = 0; i < (parseInt(numServant, 10) || 0); i++) {
      slots.push({ name: "", idNumber: "", idType: "NATIONAL_ID", phone: "", nationality: "", role: "SERVANT" });
    }
    setCompanions(slots);
    setStep(2);
  };

  const updateCompanion = (idx: number, patch: Partial<Companion>) => {
    setCompanions((prev) => prev.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  };

  const handleSubmit = () => {
    setError(null);
    // Validate: every companion needs a name + ID number
    for (let i = 0; i < companions.length; i++) {
      if (!companions[i].name.trim()) {
        setError(`Companion ${i + 1}: name is required`);
        return;
      }
      if (!companions[i].idNumber.trim()) {
        setError(`Companion ${i + 1}: ID number is required`);
        return;
      }
    }
    onConfirm(companions);
    // Reset for next time
    setStep(1);
    setNumFamily("0");
    setNumSecurity("0");
    setNumServant("0");
    setCompanions([]);
    setError(null);
  };

  const handleClose = () => {
    setStep(1);
    setNumFamily("0");
    setNumSecurity("0");
    setNumServant("0");
    setCompanions([]);
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); else onOpenChange(true); }}>
      <DialogContent className="max-w-md mx-4 w-[calc(100%-2rem)] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-emerald-600" />
            {t("familyRoomTitle")}
          </DialogTitle>
          <DialogDescription>{t("familyRoomDesc")}</DialogDescription>
        </DialogHeader>

        {/* Step 1: Leader banner + companion counts */}
        {step === 1 && (
          <div className="space-y-4">
            {/* Leader banner */}
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
              <div className="flex items-center gap-2">
                <Crown className="h-4 w-4 text-emerald-700" />
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700">
                    {t("roleLEADER")}
                  </p>
                  <p className="truncate text-sm font-semibold text-emerald-900">
                    {leaderName || "—"}
                  </p>
                </div>
              </div>
            </div>

            {/* Companion counts */}
            <div className="space-y-3">
              <div>
                <Label className="text-xs font-medium text-slate-500">
                  {t("numFamily")}
                </Label>
                <Input
                  type="number"
                  min="0"
                  max="20"
                  value={numFamily}
                  onChange={(e) => setNumFamily(e.target.value)}
                  className="mt-1.5 h-11"
                />
              </div>
              <div>
                <Label className="text-xs font-medium text-slate-500">
                  {t("numSecurity")}
                </Label>
                <Input
                  type="number"
                  min="0"
                  max="20"
                  value={numSecurity}
                  onChange={(e) => setNumSecurity(e.target.value)}
                  className="mt-1.5 h-11"
                />
              </div>
              <div>
                <Label className="text-xs font-medium text-slate-500">
                  {t("numServant")}
                </Label>
                <Input
                  type="number"
                  min="0"
                  max="20"
                  value={numServant}
                  onChange={(e) => setNumServant(e.target.value)}
                  className="mt-1.5 h-11"
                />
              </div>
            </div>

            {/* Summary */}
            {totalCount > 0 && (
              <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                {t("familyRoomSummary", {
                  total: totalCount,
                  family: parseInt(numFamily, 10) || 0,
                  security: parseInt(numSecurity, 10) || 0,
                  servant: parseInt(numServant, 10) || 0,
                })}
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-xs text-rose-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
                {t("cancel")}
              </Button>
              <Button
                type="button"
                onClick={handleProceed}
                disabled={totalCount === 0}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              >
                {t("addCompanions")} ({totalCount})
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Step 2: per-companion forms */}
        {step === 2 && (
          <div className="space-y-4">
            {/* Back to step 1 */}
            <button
              type="button"
              onClick={() => setStep(1)}
              className="text-xs font-medium text-slate-500 hover:text-slate-700"
            >
              ← {t("editCompanions")}
            </button>

            {companions.map((c, idx) => (
              <CompanionCard
                key={idx}
                index={idx}
                companion={c}
                onChange={(patch) => updateCompanion(idx, patch)}
                t={t}
              />
            ))}

            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-xs text-rose-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1">
                {t("cancel")}
              </Button>
              <Button
                type="button"
                onClick={handleSubmit}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              >
                {t("reviewCompanions")} ({companions.length})
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * CompanionCard — single companion form card. Shows the role badge
 * and the input fields for name, ID number, ID type, phone (optional),
 * nationality (optional).
 */
function CompanionCard({
  index,
  companion,
  onChange,
  t,
}: {
  index: number;
  companion: Companion;
  onChange: (patch: Partial<Companion>) => void;
  t: (k: string, opts?: Record<string, unknown>) => string;
}) {
  const roleIcon = {
    FAMILY: <User className="h-3.5 w-3.5" />,
    SECURITY: <Shield className="h-3.5 w-3.5" />,
    SERVANT: <UserCog className="h-3.5 w-3.5" />,
  }[companion.role];

  const roleColor = {
    FAMILY: "bg-emerald-100 text-emerald-700 border-emerald-200",
    SECURITY: "bg-rose-100 text-rose-700 border-rose-200",
    SERVANT: "bg-amber-100 text-amber-700 border-amber-200",
  }[companion.role];

  return (
    <div className="rounded-xl border border-slate-200 p-3 space-y-2">
      {/* Role header */}
      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${roleColor}`}>
          {roleIcon}
          {t(`role${companion.role}`)}
        </span>
        <span className="text-[10px] text-slate-400">
          #{index + 1}
        </span>
      </div>

      {/* Name */}
      <div>
        <Label className="text-[10px] font-medium text-slate-500">
          {t("companionName")} *
        </Label>
        <Input
          value={companion.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder={t("companionName")}
          className="mt-1 h-9 text-sm"
        />
      </div>

      {/* ID number + ID type */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-[10px] font-medium text-slate-500">
            {t("companionId")} *
          </Label>
          <Input
            value={companion.idNumber}
            onChange={(e) => onChange({ idNumber: e.target.value })}
            placeholder={t("companionId")}
            className="mt-1 h-9 text-sm"
          />
        </div>
        <div>
          <Label className="text-[10px] font-medium text-slate-500">
            {t("companionIdType")}
          </Label>
          <Select
            value={companion.idType}
            onValueChange={(v) => onChange({ idType: v })}
          >
            <SelectTrigger className="mt-1 h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NATIONAL_ID">National ID</SelectItem>
              <SelectItem value="PASSPORT">Passport</SelectItem>
              <SelectItem value="DRIVERS_LICENSE">Driver's License</SelectItem>
              <SelectItem value="OTHER">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Phone + nationality */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-[10px] font-medium text-slate-500">
            {t("companionPhone")}
          </Label>
          <Input
            value={companion.phone}
            onChange={(e) => onChange({ phone: e.target.value })}
            placeholder="+251..."
            className="mt-1 h-9 text-sm"
          />
        </div>
        <div>
          <Label className="text-[10px] font-medium text-slate-500">
            {t("companionNationality")}
          </Label>
          <Input
            value={companion.nationality}
            onChange={(e) => onChange({ nationality: e.target.value })}
            placeholder="Ethiopian"
            className="mt-1 h-9 text-sm"
          />
        </div>
      </div>
    </div>
  );
}
