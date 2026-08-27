#!/usr/bin/env python3
"""Phase 2: Replace remaining hardcoded strings in daytime-page.tsx."""

FILE = "/home/z/my-project/src/components/ghms/pages/daytime-page.tsx"

with open(FILE, "r", encoding="utf-8") as f:
    content = f.read()

count = 0

def rep(old, new, desc):
    global content, count
    if old in content:
        content = content.replace(old, new, 1)
        count += 1
        print(f"  OK: {desc}")
    else:
        print(f"  SKIP: {desc}")

# Tab labels in JSX (text nodes after badge count)
rep('Services ({services.length})', '{t("tabServices")} ({services.length})', 'tab services with count')
rep('Bookings ({bookings.length})', '{t("tabBookings")} ({bookings.length})', 'tab bookings with count')

# Menu items (text nodes after icons)
rep('Pencil className="mr-2 h-4 w-4" /> Edit', 'Pencil className="mr-2 h-4 w-4" /> {t("menuEdit")}', 'menu edit')
rep('{svc.active ? "Deactivate" : "Activate"}', '{svc.active ? t("menuDeactivate") : t("menuActivate")}', 'menu activate/deactivate')
rep('Trash2 className="mr-2 h-4 w-4" /> Delete', 'Trash2 className="mr-2 h-4 w-4" /> {t("menuDelete")}', 'menu delete')

# Service form labels
rep('>Service Name<', '>{t("lblServiceName")}<', 'lbl service name')
rep('>Price<', '>{t("lblPrice")}<', 'lbl price')

# Booking form labels  
rep('>Guest Name<', '>{t("lblGuestName")}<', 'lbl guest name')
rep('>Date<', '>{t("lblDate")}<', 'lbl date')
rep('>Time<', '>{t("lblTime")}<', 'lbl time')

# Payment dialog labels
rep('>Amount<', '>{t("lblAmount")}<', 'lbl amount')

# Cancel buttons
rep('>Cancel<', '>{t("cancel")}<', 'cancel btn')

# Delete alert descriptions
rep('>This will permanently delete this service. Services with existing bookings cannot be deleted.<', '>{t("alertDeleteServiceDesc")}<', 'alert delete service desc')
rep('>This will permanently delete this booking and cannot be undone.<', '>{t("alertDeleteBookingDesc")}<', 'alert delete booking desc')

# Other
rep('>No services created yet<', '>{t("noServicesInSelect")}<', 'no services in select')
rep('"Estimated Total: "', 't("estimatedTotal")', 'estimated total')

# Payment toast with template
rep('`Payment of ${formatPrice(amount)} recorded`', 't("toastPaymentRecorded", { amount: formatPrice(amount) })', 'toast payment recorded')

# Service toggle toast
rep('`Service ${svc.active ? "deactivated" : "activated"}`', 'svc.active ? t("toastServiceDeactivated") : t("toastServiceActivated")', 'toast service toggle')

# Category option
rep('"MEETING"', 't("catMeeting")', 'cat meeting')

with open(FILE, "w", encoding="utf-8") as f:
    f.write(content)

print(f"\nTotal: {count} replacements")