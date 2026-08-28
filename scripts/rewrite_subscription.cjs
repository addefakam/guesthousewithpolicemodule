const fs = require('fs');
const FILE = '/home/z/my-project/src/components/ghms/pages/my-subscription-page.tsx';

let c = fs.readFileSync(FILE, 'utf8');

// 1. useTranslation() -> useTranslation("subscription")
c = c.replace('const { t } = useTranslation();', 'const { t } = useTranslation("subscription");');

// 2. Insert lookup maps after the useTranslation line
const lookupMaps = `
  // \u2500\u2500 i18n lookup maps \u2500\u2500
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
`;

c = c.replace(
  'const { t } = useTranslation("subscription");',
  'const { t } = useTranslation("subscription");' + lookupMaps
);

// 3. Replacements: plain text -> t() calls
// Using a function for each to be safe
function r(old, nw) {
  const idx = c.indexOf(old);
  if (idx === -1) { console.warn('NOT FOUND: ' + old.slice(0, 80)); return; }
  c = c.replace(old, nw);
}

// Toasts
r('"Unknown error"', 't("toastFailedLoad")');
r('Failed to load subscription info:', 't("toastFailedLoad")');
r('"Chapa payment completed! Verifying your payment..."', 't("toastChapaCompleted")');
r('"Your subscription is now active."', 't("toastPaymentVerified")');
r("We'll keep checking.", 't("toastChapaPending")');
r('"Verification failed. The webhook will process it shortly."', 't("toastVerifyFailed")');
r('"Invalid payment details"', 't("toastInvalidPayment")');
r('"Failed to get Chapa checkout URL"', 't("toastNoChapaUrl")');
r('"Failed to initiate Chapa payment"', 't("toastChapaInitFailed")');
r('"Please fill in all required fields"', 't("toastFillRequired")');
r('"Transfer reference number is required"', 't("toastRefRequired")');
r('"Payment submitted! Awaiting verification."', 't("toastPaymentSubmitted")');
r('"Failed to submit"', 't("toastSubmitFailed")');

// No sub state
r('<p className="text-sm font-medium text-slate-500">No subscription found</p>',
  '<p className="text-sm font-medium text-slate-500">{t("noSubFound")}</p>');
r('<p className="text-xs text-slate-400 mt-1">Contact the administrator</p>',
  '<p className="text-xs text-slate-400 mt-1">{t("noSubContact")}</p>');

// Header (text inside tags)
r('>Subscription & Payments<', '>{t("pageTitle")}<');
r('Manage your subscription, view plans, and submit payments', 't("pageSubtitle")');

// Refresh button: bare text node after icon
r('RefreshCw className="mr-1 h-3 w-3" />\n          Refresh',
  'RefreshCw className="mr-1 h-3 w-3" />\n          {t("btnRefresh")}');

// Badges
r('"Free Trial"', 't("freeTrial")');
r('Rates Locked', 't("ratesLocked")');

// Detail grid (text inside <p> tags)
r('>Current Plan<', '>{t("lblCurrentPlan")}<');
r('>Amount<', '>{t("lblAmount")}<');
r('>Expires On<', '>{t("lblExpiresOn")}<');
r('>Provider<', '>{t("lblProvider")}<');

// Plans section
r('>Available Plans<', '>{t("availablePlans")}<');
r('No plans available yet', 't("noPlansYet")');
r('Contact the administrator for payment instructions', 't("noPlansContact")');
r('>Current<', '>{t("badgeCurrent")}<');
r('>Active<', '>{t("badgeActive")}<');
r('>Pay Now<', '>{t("btnPayNow")}<');

// Payment History
r('>Payment History<', '>{t("paymentHistory")}<');
r('No payment records yet', 't("noPaymentRecords")');

// Payment status in history
r('"Chapa Pending"', 't("payStatusChapaPending")');
r('"Payment Overdue"', 't("payStatusOverdue")');
r('"Overdue (Will apply soon)"', 't("payStatusOverdueSoon")');

// Penalty
r('>PAYMENT OVERDUE<', '>{t("penaltyTitle")}<');

// Warning
r('>Subscription expiring soon!<', '>{t("warningTitle")}<');
r('Please select a plan below and submit your payment to continue using the service.', 't("warningDesc")');

// Pricing
r('No rooms configured yet. Add rooms to see your subscription pricing.', 't("noRoomsConfigured")');

// Dialog
r('>Pay for Subscription<', '>{t("dlgPayTitle")}<');

// Labels in dialog
r('>Auto-calculated based on your total beds and selected plan<', '>{t("amountAutoCalc")}<');
r('>Pay securely via Telebirr, CBE Birr, bank cards, and more<', '>{t("chapaMethodInfo")}<');
r('"Any additional information (optional)"', 't("notesPlaceholder")');

// Dialog buttons (bare text nodes)
r('>Cancel<', '>{t("btnCancel")}<');
r('>Redirecting...<', '>{t("btnRedirecting")}<');
r('>Submitting...<', '>{t("btnSubmitting")}<');

// Chapa banners
r('>Verifying Payment with Chapa...<', '>{t("chapaVerifyingTitle")}<');
r('>Verification Delayed<', '>{t("chapaDelayedTitle")}<');
r('>Payment Not Yet Confirmed<', '>{t("chapaPendingTitle")}<');
r('>Payment Processing<', '>{t("chapaProcessingTitle")}<');

// 4. formatDaysRemaining/formatCycle replacements
c = c.replace('formatDaysRemaining(sub.daysRemaining)', 'fmtDaysRemaining(sub.daysRemaining)');
while (c.includes('formatCycle(')) {
  c = c.replace(/formatCycle\((\w+\.cycle)\)/g, 'fmtCycle($1)');
  break;
}

// 5. Status badge
c = c.replace('{sub.status}\n              </span>', '{STATUS_LABELS[sub.status] || sub.status}\n              </span>');

// 6. PAYMENT_METHODS label in JSX
c = c.replace('{m.label}', '{PAYMENT_METHOD_LABELS[m.value] || m.label}');

// 7. Plans count
c = c.replace('{data.plans.length} plan{data.plans.length !== 1 ? "s" : ""} available',
  '{t(data.plans.length === 1 ? "plansCount_one" : "plansCount_other", { count: data.plans.length })}');

// 8. Plan days
c = c.replace('{plan.days} days', '{t("planDays", { days: plan.days })}');
c = c.replace('{selectedPlan.days} days', '{t("planDays", { days: selectedPlan.days })}');

// 9. Per month
c = c.replace(/`~\$\{plan\.perMonth\.toLocaleString\(\)\} \$\{cur\}\/month`/,
  '`${t("perMonth", { amount: plan.perMonth.toLocaleString(), cur })}`');

// 10. Beds breakdown
c = c.replace('{cur}{pricePerBed} x {totalBeds} beds x {plan.days} days',
  '{t("bedsBreakdown", { cur, price: pricePerBed, beds: totalBeds, days: plan.days })}');

// 11. Payment status Pending/Verified
c = c.replace(': isProviderSubmitted ? "Pending" : "Verified"',
  ': isProviderSubmitted ? t("payStatusPending") : t("payStatusVerified")');

// 12. Anti-pattern t('lbladditionalNotes', 'Additional Notes')
c = c.replace("{t('lbladditionalNotes', 'Additional Notes')}", '{t("lblAdditionalNotes")}');

// 13. Dialog descriptions
const dlgChapa = 'You will be redirected to Chapa\u2019s secure payment page to complete payment online (Telebirr, CBE Birr, bank cards, etc.).';
c = c.replace('"' + dlgChapa + '"', 't("dlgPayDescChapa")');
c = c.replace('"Complete your payment offline, then fill in the details below. Your subscription will be activated after verification."', 't("dlgPayDescOffline")');

// 14. Chapa banner descriptions (with smart quotes / em-dashes)
r('Could not verify immediately. Don\u2019t worry \u2014 the payment will be confirmed automatically via our backend. No action needed.',
  '{t("chapaDelayedDesc")}');
r('Chapa hasn\u2019t confirmed the payment yet. It will be verified automatically once confirmed.',
  '{t("chapaPendingDesc")}');
r('Your Chapa payment was received. We are verifying it now \u2014 your subscription will be activated shortly.',
  '{t("chapaProcessingDesc")}');
r('Your Chapa payment has been confirmed. Your subscription is now active!',
  '{t("chapaVerifiedDesc")}');
r('Please wait while we confirm your payment with Chapa. This takes a few seconds.',
  '{t("chapaVerifyingDesc")}');

// 15. Chapa redirect info
r('Click \"Pay with Chapa\" below. You\'ll be redirected to Chapa\'s secure checkout to complete your payment. After paying, you\'ll return here and your subscription activates automatically.',
  '{t("chapaRedirectInfo")}');

// 16. Penalty description
c = c.replace('Your subscription expired {Math.abs(sub.daysRemaining)} day{Math.abs(sub.daysRemaining) !== 1 ? "s" : ""} ago.',
  '{t("penaltyDesc", { days: Math.abs(sub.daysRemaining), percent: penaltyPercent })}');
// Remove orphaned second line of penalty
c = c.replace('A <strong>{penaltyPercent}% late payment penalty</strong> has been applied.', '');

// 17. Bed plural
while (c.includes('{totalBeds} bed{totalBeds !== 1 ? "s" : ""}')) {
  c = c.replace('{totalBeds} bed{totalBeds !== 1 ? "s" : ""}', '{totalBeds} {totalBeds === 1 ? t("bed_one") : t("bed_other")}');
  break;
}

// 18. Beds calc description
c = c.replace('`Your subscription is calculated based on ${totalBeds} total bed${totalBeds !== 1 ? "s" : ""} across all your rooms.`',
  '`${t("bedsCalcDescription", { beds: totalBeds })}`');

// 19. "Free" in trial plan display
c = c.replace(': "Free" :', ': t("freeTrial") :');

// 20. Payment verified toast - now that inner string was replaced, fix the template
// Should be: `Payment verified! ${res.results?.[0] || t("toastPaymentVerified")}`
// We want: `${t("toastPaymentVerified")}`
c = c.replace('`Payment verified! ${res.results?.[0] || t("toastPaymentVerified")}`', '`${t("toastPaymentVerified")}`');

// 21. noRoomsConfigured - this is inside a ternary. The original file has:
// >No rooms configured yet...< as a child of <p> inside a ternary
// Our r() call above should have caught it. Let's also handle the ternary structure.
// The pattern is: >{t("noRoomsConfigured")}< which might need {} wrapping
// Actually the replacement replaced the TEXT inside the <p> tag so it should be:
// <p ...>t("noRoomsConfigured")</p> which needs to be <p ...>{t("noRoomsConfigured")}</p>
// Check if this happened:
if (c.includes('>t("noRoomsConfigured")<')) {
  c = c.replace('>t("noRoomsConfigured")<', '>{t("noRoomsConfigured")}<');
}

// Similar check for other bare text that got replaced but lost {}:
const bareTChecks = [
  't("warningDesc")', 't("noRoomsConfigured")', 't("chapaDelayedDesc")',
  't("chapaPendingDesc")', 't("chapaProcessingDesc")', 't("chapaVerifiedDesc")',
  't("chapaVerifyingDesc")', 't("chapaRedirectInfo")', 't("noPlansYet")',
  't("noPlansContact")', 't("noPaymentRecords")'
];
for (const check of bareTChecks) {
  // Look for the pattern >t("...")< (without {} wrapping) and fix it
  const barePattern = '>' + check + '<';
  const fixedPattern = '>{' + check + '}<';
  if (c.includes(barePattern)) {
    console.log('FIXED BARE: ' + check);
    c = c.replace(barePattern, fixedPattern);
  }
}

// 22. Some replacements may have left text inside <p> without {}
// E.g. <p>text</p> -> <p>t("key")</p> should be <p>{t("key")}</p>
// Check all remaining t(" patterns not preceded by {
const bareRegex = />t\("([^"]+)"\)</g;
let m;
while ((m = bareRegex.exec(c)) !== null) {
  const match = m[0];
  const fixed = '>{' + match.slice(1);
  console.log('FIXED BARE T(): ' + m[1]);
  c = c.replace(match, fixed);
}

fs.writeFileSync(FILE, c);
console.log('Done. File written.');
