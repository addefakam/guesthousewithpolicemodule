#!/usr/bin/env python3
"""Replace hardcoded strings in rooms-page.tsx with t() calls."""
import re

FILE = "/home/z/my-project/src/components/ghms/pages/rooms-page.tsx"

with open(FILE, "r", encoding="utf-8") as f:
    content = f.read()

# Track replacements
replacements = []

def replace(old, new, desc=""):
    global content
    if old in content:
        content = content.replace(old, new, 1)
        replacements.append(f"OK: {desc}")
    else:
        replacements.append(f"SKIP (not found): {desc}")

# ── SubscriptionBadge: Add useTranslation ──
replace(
    'function SubscriptionBadge() {\n  const { currentUser, subscription } = useAppStore();',
    'function SubscriptionBadge() {\n  const { t } = useTranslation("rooms");\n  const { currentUser, subscription } = useAppStore();',
    "Add useTranslation to SubscriptionBadge"
)

# SubscriptionBadge labels
replace('? "Active"\n    : isSuspended\n    ? "Suspended"\n    : isExpired\n    ? "Expired"\n    : "Expiring";',
    '? t("subActive")\n    : isSuspended\n    ? t("subSuspended")\n    : isExpired\n    ? t("subExpired")\n    : t("subExpiring");',
    "SubscriptionBadge labels")

# ── Toast messages ──
replace('"Failed to load rooms"', 't("toastFailedLoadRooms")', 'toast failed load')
replace('"Please fill in all required fields"', 't("toastFillRequired")', 'toast fill required')
replace('"Room updated successfully"', 't("toastRoomUpdated")', 'toast room updated')
replace('"Room created successfully"', 't("toastRoomCreated")', 'toast room created')
replace('"Failed to save room"', 't("toastFailedSaveRoom")', 'toast failed save room')
replace('"Room deleted successfully"', 't("toastRoomDeleted")', 'toast room deleted')
replace('"Failed to delete room"', 't("toastFailedDeleteRoom")', 'toast failed delete room')
replace('"Failed to update status"', 't("toastFailedUpdateStatus")', 'toast failed update status')
replace('"New check-out must be after the current check-out date"', 't("toastInvalidCheckoutDate")', 'toast invalid checkout')
replace('"Stay extended successfully"', 't("toastStayExtended")', 'toast stay extended')
replace('"Failed to extend stay"', 't("toastFailedExtendStay")', 'toast failed extend')
replace('"Guest checked out successfully"', 't("toastGuestCheckedOut")', 'toast guest checked out')
replace('"Failed to check out"', 't("toastFailedCheckOut")', 'toast failed check out')
replace('"Cannot shift to the same room"', 't("toastCannotShiftSameRoom")', 'toast cannot shift')
replace('"Guest shifted to new room successfully"', 't("toastGuestShifted")', 'toast guest shifted')
replace('"Failed to shift room"', 't("toastFailedShiftRoom")', 'toast failed shift')
replace('"Please select an Excel file first"', 't("toastSelectExcelFile")', 'toast select excel')
replace('"No data rows found in the file"', 't("toastNoDataRows")', 'toast no data rows')
replace('"Import failed"', 't("toastImportFailed")', 'toast import failed')
replace('"No active reservation found for this room"', 't("toastNoActiveReservation")', 'toast no active res (3 places)')

# ── Search placeholder ──
replace('"Search rooms by number, name, or type..."', 't("searchPlaceholderFull")', 'search placeholder')

# ── Filter labels ──
# Floor filter
replace('"Floor:"', 't("filterFloor")', 'filter floor')
replace('"Others"', 't("filterOthers")', 'filter others')
replace('"Status:"', 't("filterStatus")', 'filter status')

# ── Room info panel labels ──
replace('"Room Type"', 't("infoRoomType")', 'info room type')
replace('"Price per Night"', 't("infoPricePerNight")', 'info price/night')
replace('"Capacity"', 't("infoCapacity")', 'info capacity')
replace('"Floor"', 't("infoFloor")', 'info floor')
replace('"Amenities"', 't("infoAmenities")', 'info amenities')
replace('"Marked as occupied"', 't("infoMarkedOccupied")', 'info marked occupied')
replace('"No active reservation found for this room"', 't("infoNoActiveRes")', 'info no active res')
replace('"Check-out today"', 't("infoCheckoutToday")', 'info checkout today')
replace('"Total:"', 't("infoTotal")', 'info total')
replace('"Upcoming Guest"', 't("infoUpcomingGuest")', 'info upcoming guest')
replace('"Reserved"', 't("infoReserved")', 'info reserved')
replace('"Check-in today!"', 't("infoCheckinToday")', 'info checkin today')
replace('"Marked as reserved"', 't("infoMarkedReserved")', 'info marked reserved')
replace('"No upcoming reservation found for this room"', 't("infoNoUpcomingRes")', 'info no upcoming res')
replace('"Room is available and ready for check-in"', 't("infoRoomAvailable")', 'info room available')
replace('"Upcoming reservations:"', 't("infoUpcomingReservations")', 'info upcoming reservations')
replace('"Guest"', 't("guestFallback")', 'guest fallback')
replace('"Room is under maintenance"', 't("infoUnderMaintenance")', 'info under maintenance')
replace('"This room is not available for booking until maintenance is complete."', 't("infoMaintenanceNote")', 'info maintenance note')
replace('"Reservations History"', 't("reservationsHistory")', 'reservations history')
replace('"Loading..."', 't("loading")', 'loading')
replace('"No reservations found for this room"', 't("noReservationsForRoom")', 'no reservations for room')

# ── Button labels in dialogs ──
replace('"Reserve This Room"', 't("btnReserveThisRoom")', 'btn reserve this room')
replace('"Extend Stay"', 't("btnExtendStay")', 'btn extend stay')
replace('"Early Out"', 't("btnEarlyOut")', 'btn early out')
replace('"Shift"', 't("btnShift")', 'btn shift')
replace('"Extend Stay"', 't("btnExtendStay")', 'btn extend stay 2')

# ── Dialog titles/descriptions ──
replace('"Extend Stay"', 't("dialogExtendTitle")', 'dialog extend title')
replace('"Extend the guest\'s stay in this room"', 't("dialogExtendDesc")', 'dialog extend desc')
replace('"Current check-out:"', 't("extendCurrentCheckout")', 'extend current checkout')
replace('"Early Checkout"', 't("dialogEarlyCheckoutTitle")', 'dialog early checkout title')
replace('"Room Shift"', 't("dialogShiftTitle")', 'dialog shift title')
replace('"Move the guest to a different available room"', 't("dialogShiftDesc")', 'dialog shift desc')
replace('"Select available room"', 't("shiftSelectPlaceholder")', 'shift select placeholder')
replace('"No available rooms to shift to"', 't("shiftNoAvailableRooms")', 'shift no available rooms')

# ── Loading state buttons ──
replace('"Extending..."', 't("btnExtending")', 'btn extending')
replace('"Checking out..."', 't("btnCheckingOut")', 'btn checking out')
replace('"Shifting..."', 't("btnShifting")', 'btn shifting')
replace('"Confirm Checkout"', 't("btnConfirmCheckout")', 'btn confirm checkout')
replace('"Confirm Shift"', 't("btnConfirmShift")', 'btn confirm shift')

# ── Payment status labels ──
replace('"PAID"', 't("paymentPaid")', 'payment PAID')
replace('"UNPAID"', 't("paymentUnpaid")', 'payment UNPAID')
replace('"PARTIAL"', 't("paymentPartial")', 'payment PARTIAL')
replace('"OVERDUE"', 't("paymentOverdue")', 'payment OVERDUE')

# ── Menu items ──
replace('"Extend Stay / Early Checkout"', 't("menuExtendEarlyCheckout")', 'menu extend/early')
replace('"Room Shift"', 't("menuRoomShift")', 'menu room shift')
replace('"Toggle Availability"', 't("menuToggleAvailability")', 'menu toggle availability')

# ── Import hints ──
replace('"Room"', 't("roomLabel", { number: "" }).replace(/Room $/, "") || "Room"', 'import Room sheet name - SKIP MANUAL')

# ── Placeholders ──
replace('"e.g. 101"', 't("placeholderRoomNumber")', 'placeholder room number')
replace('"WiFi, TV, AC, Mini Bar, Hot Water"', 't("placeholderAmenities")', 'placeholder amenities')

# Write back
with open(FILE, "w", encoding="utf-8") as f:
    f.write(content)

print(f"\nTotal replacements attempted: {len(replacements)}")
for r in replacements:
    print(f"  {r}")