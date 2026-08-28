#!/usr/bin/env python3
"""Rewrite my-subscription-page.tsx for i18n (subscription namespace)."""

FILE = "/home/z/my-project/src/components/ghms/pages/my-subscription-page.tsx"

with open(FILE, "r") as f:
    code = f.read()

# 1. Change useTranslation() -> useTranslation("subscription")
code = code.replace('const { t } = useTranslation();', 'const { t } = useTranslation("subscription");')

# 2. Add lookup maps inside component (after useTranslation line)
lookup_maps = r'''
  // -- i18n lookup maps --
  const PAYMENT_METHOD_LABELS: Record<string, string> = {
    CHAPA: t("payMethodCHAPA"),
    CASH: t("payMethodCASH"),
    BANK_TRANSFER: t("payMethodBANK_TRANSFER"),
    TELEBIRR: t("payMethodTELEBIRR"),
    CBE_BIRR: t("payMethodCBE_BIRR"),
    OTHER: t("payMethodOTHER"),
  };
  const CYCLE_LABELS: Record<string, string> = {
    MONTHLY: t("cycleMONTHLY"),
    QUARTERLY: t("cycleQUARTERLY"),
    SEMI_ANNUAL: t("cycleSEMI_ANNUAL"),
    YEARLY: t("cycleYEARLY"),
  };
  const STATUS_LABELS: Record<string, string> = {
    ACTIVE: t("statusACTIVE"),
    WARNING: t("statusWARNING"),
    EXPIRED: t("statusEXPIRED"),
    SUSPENDED: t("statusSUSPENDED"),
  };
  function fmtDaysRemaining(days: number): string {
    if (days > 0) return t(days === 1 ? "daysRemaining_one" : "daysRemaining_other", { count: days });
    if (days === 0) return t("expiresToday");
    const abs = Math.abs(days);
    return t(abs === 1 ? "expiredAgo_one" : "expiredAgo_other", { count: abs });
  }
  function fmtCycle(cycle: string): string {
    return CYCLE_LABELS[cycle] || cycle;
  }
'''

code = code.replace(
    'const { t } = useTranslation("subscription");',
    'const { t } = useTranslation("subscription");' + lookup_maps
)

# 3. Pair replacements: list of (old, new)
R = [
    # Toasts
    ('"Unknown error"', 't("toastFailedLoad")'),
    ('Failed to load subscription info:', 't("toastFailedLoad")'),
    ('"Chapa payment completed! Verifying your payment..."', 't("toastChapaCompleted")'),
    ('"Your subscription is now active."', 't("toastPaymentVerified")'),
    ("Payment not yet confirmed by Chapa. We'll keep checking.", 't("toastChapaPending")'),
    ('"Verification failed. The webhook will process it shortly."', 't("toastVerifyFailed")'),
    ('"Invalid payment details"', 't("toastInvalidPayment")'),
    ('"Failed to get Chapa checkout URL"', 't("toastNoChapaUrl")'),
    ('"Failed to initiate Chapa payment"', 't("toastChapaInitFailed")'),
    ('"Please fill in all required fields"', 't("toastFillRequired")'),
    ('"Transfer reference number is required"', 't("toastRefRequired")'),
    ('"Payment submitted! Awaiting verification."', 't("toastPaymentSubmitted")'),
    ('"Failed to submit"', 't("toastSubmitFailed")'),
    # No sub state
    ('<p className="text-sm font-medium text-slate-500">No subscription found</p>',
     '<p className="text-sm font-medium text-slate-500">{t("noSubFound")}</p>'),
    ('<p className="text-xs text-slate-400 mt-1">Contact the administrator</p>',
     '<p className="text-xs text-slate-400 mt-1">{t("noSubContact")}</p>'),
    # Header
    ('"Subscription & Payments"', 't("pageTitle")'),
    ('Manage your subscription, view plans, and submit payments', 't("pageSubtitle")'),
    ('>Refresh<', '>{t("btnRefresh")}<'),
    # Badges
    ('"Free Trial"', 't("freeTrial")'),
    ('"Rates Locked"', 't("ratesLocked")'),
    ('"Free"', 't("freeTrial")'),
    # Detail grid labels
    ('Current Plan', 't("lblCurrentPlan")'),
    ('"Amount"', 't("lblAmount")'),
    ('Expires On', 't("lblExpiresOn")'),
    ('"Provider"', 't("lblProvider")'),
    # Available Plans
    ('>Available Plans<', '>{t("availablePlans")}<'),
    ('No plans available yet', 't("noPlansYet")'),
    ('Contact the administrator for payment instructions', 't("noPlansContact")'),
    ('>Current<', '>{t("badgeCurrent")}<'),
    ('>Active<', '>{t("badgeActive")}<'),
    ('>Pay Now<', '>{t("btnPayNow")}<'),
    # Payment History
    ('>Payment History<', '>{t("paymentHistory")}<'),
    ('>No payment records yet<', '>{t("noPaymentRecords")}<'),
    ('"Chapa Pending"', 't("payStatusChapaPending")'),
    ('"Payment Overdue"', 't("payStatusOverdue")'),
    ('"Overdue (Will apply soon)"', 't("payStatusOverdueSoon")'),
    # Penalty
    ('>PAYMENT OVERDUE<', '>{t("penaltyTitle")}<'),
    ('>Base:<', '>{t("penaltyBase")}:<'),
    ('>Penalty:<', '>{t("penaltyLabel")}:<'),
    ('>TOTAL DUE:<', '>{t("penaltyTotalDue")}:<'),
    # Warning
    ('>Subscription expiring soon!<', '>{t("warningTitle")}<'),
    ('Please select a plan below and submit your payment to continue using the service.', 't("warningDesc")'),
    # Pricing banner
    ('No rooms configured yet. Add rooms to see your subscription pricing.', 't("noRoomsConfigured")'),
    # Dialog
    ('>Pay for Subscription<', '>{t("dlgPayTitle")}<'),
    ('>Auto-calculated based on your total beds and selected plan<', '>{t("amountAutoCalc")}<'),
    ('>Pay securely via Telebirr, CBE Birr, bank cards, and more<', '>{t("chapaMethodInfo")}<'),
    ('>Reference / Transaction Number <span className="text-rose-500">*</span><', '>{t("lblReferenceNumber")} <span className="text-rose-500">*</span><'),
    ('"e.g., FT25632i5632k"', 't("referencePlaceholder")'),
    ('>Enter the transaction/reference number from your payment receipt<', '>{t("referenceHint")}<'),
    ('"Any additional information (optional)"', 't("notesPlaceholder")'),
    ('>Cancel<', '>{t("btnCancel")}<'),
    ('>Redirecting...<', '>{t("btnRedirecting")}<'),
    ('>Submitting...<', '>{t("btnSubmitting")}<'),
    ('>Pay with Chapa<', '>{t("btnPayWithChapa")}<'),
    ('>Submit Payment<', '>{t("btnSubmitPayment")}<'),
    # Chapa banners
    ('>Verifying Payment with Chapa...<', '>{t("chapaVerifyingTitle")}<'),
    ('>Please wait while we confirm your payment with Chapa. This takes a few seconds.<', '>{t("chapaVerifyingDesc")}<'),
    ('>Payment Verified &amp; Active<', '>{t("chapaVerifiedTitle")}<'),
    ('>Your Chapa payment has been confirmed. Your subscription is now active!<', '>{t("chapaVerifiedDesc")}<'),
    ('>Verification Delayed<', '>{t("chapaDelayedTitle")}<'),
    ('>Payment Not Yet Confirmed<', '>{t("chapaPendingTitle")}<'),
    ('>Payment Processing<', '>{t("chapaProcessingTitle")}<'),
    # Payment Method label
    ('>Payment Method <span className="text-red-500">*</span><', '>{t("lblPaymentMethod")} <span className="text-red-500">*</span><'),
    # Amount label in dialog
    ('>Amount ({cur})<', '>{t("lblAmount")} ({cur})<'),
]

for old, new in R:
    code = code.replace(old, new, 1)

# 4. Replace formatDaysRemaining(sub.daysRemaining) -> fmtDaysRemaining
code = code.replace('formatDaysRemaining(sub.daysRemaining)', 'fmtDaysRemaining(sub.daysRemaining)')

# 5. Replace formatCycle calls -> fmtCycle
code = code.replace('formatCycle(sub.cycle)', 'fmtCycle(sub.cycle)')
code = code.replace('formatCycle(selectedPlan.cycle)', 'fmtCycle(selectedPlan.cycle)')
code = code.replace('formatCycle(plan.cycle)', 'fmtCycle(plan.cycle)')
code = code.replace('formatCycle(payment.cycle)', 'fmtCycle(payment.cycle)')

# 6. Replace status badge: {sub.status} -> {STATUS_LABELS[...]
code = code.replace('{sub.status}\n              </span>', '{STATUS_LABELS[sub.status] || sub.status}\n              </span>')

# 7. Replace PAYMENT_METHODS m.label -> PAYMENT_METHOD_LABELS
# The constant at top uses hardcoded labels, but in JSX we use the map
code = code.replace('{m.label}', '{PAYMENT_METHOD_LABELS[m.value] || m.label}')

# 8. Plans count plural
code = code.replace(
    '{data.plans.length} plan{data.plans.length !== 1 ? "s" : ""} available',
    '{t(data.plans.length === 1 ? "plansCount_one" : "plansCount_other", { count: data.plans.length })}'
)

# 9. Plan days label
#   formatCycle(plan.cycle) -- {plan.days} days
#   Already replaced formatCycle. Now replace " {plan.days} days" pattern:
code = code.replace('{plan.days} days', '{t("planDays", { days: plan.days })}')
code = code.replace('{selectedPlan.days} days', '{t("planDays", { days: selectedPlan.days })}')

# 10. Per month
code = code.replace('{cur}/month', '{cur}/" + t("lblPerMonth") + "')

# 11. Beds breakdown
code = code.replace('{cur}{pricePerBed} x {totalBeds} beds x {plan.days} days', '{t("bedsBreakdown", { cur, price: pricePerBed, beds: totalBeds, days: plan.days })}')

# 12. Payment status Pending/Verified in history ternary
# Find: : isProviderSubmitted ? "Pending" : "Verified"
code = code.replace(': isProviderSubmitted ? "Pending" : "Verified"', ': isProviderSubmitted ? t("payStatusPending") : t("payStatusVerified")')

# 13. Chapa banner descriptions (multi-sentence texts)
# These have complex content - handle carefully
code = code.replace(
    'Could not verify immediately. Don\u2019t worry \u2014 the payment will be confirmed automatically via our backend. No action needed.',
    '{t("chapaDelayedDesc")}'
)
code = code.replace(
    'Chapa hasn\u2019t confirmed the payment yet. It will be verified automatically once confirmed.',
    '{t("chapaPendingDesc")}'
)
code = code.replace(
    'Your Chapa payment was received. We are verifying it now \u2014 your subscription will be activated shortly.',
    '{t("chapaProcessingDesc")}'
)

# 14. Anti-pattern fix: t('lbladditionalNotes', 'Additional Notes') -> t("lblAdditionalNotes")
code = code.replace("{t('lbladditionalNotes', 'Additional Notes')}", '{t("lblAdditionalNotes")}')

# 15. Dialog descriptions (ternary)
code = code.replace(
    '"You will be redirected to Chapa\u2019s secure payment page to complete payment online (Telebirr, CBE Birr, bank cards, etc.)."',
    't("dlgPayDescChapa")'
)
code = code.replace(
    '"Complete your payment offline, then fill in the details below. Your subscription will be activated after verification."',
    't("dlgPayDescOffline")'
)

# 16. Chapa redirect info in dialog (has You'll which is `\'` in JSX)
# This is in a <p> tag: Click "Pay with Chapa" below. You'll be...
# Find the line and replace
lines = code.split('\n')
new_lines = []
i = 0
while i < len(lines):
    line = lines[i]
    if 'Click \'Pay with Chapa\' below' in line or 'Click "Pay with Chapa" below' in line:
        # Replace the entire line
        line = '                    {t("chapaRedirectInfo")}'
    new_lines.append(line)
    i += 1
code = '\n'.join(new_lines)

# 17. Penalty description (multi-line with interpolation)
# Replace the multi-line penalty description
penalty_old = 'Your subscription expired {Math.abs(sub.daysRemaining)} day{Math.abs(sub.daysRemaining) !== 1 ? "s" : ""} ago.'
penalty_new = '{t("penaltyDesc", { days: Math.abs(sub.daysRemaining), percent: penaltyPercent })}'
code = code.replace(penalty_old, penalty_new)
# Also clean up the <strong> line after
penalty_strong_old = 'A <strong>{penaltyPercent}% late payment penalty</strong> has been applied.'
# This should already be consumed in the penaltyDesc translation
# But we need to remove the now-orphaned line
# Actually, the penalty_desc in locale already contains the strong tag info.
# The original JSX has TWO lines. Let's handle this.
# Line 1: Your subscription expired... days ago.
# Line 2: A <strong>...%</strong> has been applied.
# Our new single line replaces line 1. Line 2 needs to be removed.
# Let's just remove the second line entirely:
code = code.replace('\n                    ' + penalty_strong_old, '')

# 18. Bed plural in pricing banner
# {totalBeds} bed{totalBeds !== 1 ? "s" : ""}
code = code.replace('{totalBeds} bed{totalBeds !== 1 ? "s" : ""}', '{totalBeds} {totalBeds === 1 ? t("bed_one") : t("bed_other")}')

# 19. Pricing calc description (ternary)
pricing_desc_old = '`Your subscription is calculated based on ${totalBeds} total bed${totalBeds !== 1 ? "s" : ""} across all your rooms.`'
pricing_desc_new = '`${t("bedsCalcDescription", { beds: totalBeds })}`'
code = code.replace(pricing_desc_old, pricing_desc_new)

# 20. Payment verified toast: remove the OR fallback
# Original: `Payment verified! ${res.results?.[0] || "Your subscription is now active."}`
# Already replaced the inner string. Now fix the template literal
code = code.replace('`Payment verified! ${res.results?.[0] || t("toastPaymentVerified")}`', '`${t("toastPaymentVerified")}`')

with open(FILE, "w") as f:
    f.write(code)

print("Rewrite complete.")
