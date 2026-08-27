#!/usr/bin/env python3"""Phase 2: Replace remaining hardcoded strings in rooms-page.tsx."""

FILE = "/home/z/my-project/src/components/ghms/pages/rooms-page.tsx"

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

# Filter labels in JSX
rep('>Floor:<', '>{t("filterFloor")}<', 'filter floor jsx')
rep('>Others<', '>{t("filterOthers")}<', 'filter others jsx')
rep('>Status:<', '>{t("filterStatus")}<', 'filter status jsx')

# Info panel labels
rep('>Room Type<', '>{t("infoRoomType")}<', 'info room type jsx')
rep('>Price per Night<', '>{t("infoPricePerNight")}<', 'info price/night jsx')
rep('>Capacity<', '>{t("infoCapacity")}<', 'info capacity jsx')
rep('>Amenities<', '>{t("infoAmenities")}<', 'info amenities jsx')
rep('>Marked as occupied<', '>{t("infoMarkedOccupied")}<', 'info marked occupied jsx')
rep('>Check-out today<', '>{t("infoCheckoutToday")}<', 'info checkout today jsx')
rep('>Total: ', '>{t("infoTotal")} ', 'info total jsx')
rep('>Upcoming Guest<', '>{t("infoUpcomingGuest")}<', 'info upcoming guest jsx')
rep('>Reserved<', '>{t("infoReserved")}<', 'info reserved jsx')
rep('>Check-in today!<', '>{t("infoCheckinToday")}<', 'info checkin today jsx')
rep('>Marked as reserved<', '>{t("infoMarkedReserved")}<', 'info marked reserved jsx')
rep('>No upcoming reservation found for this room<', '>{t("infoNoUpcomingRes")}<', 'info no upcoming res jsx')
rep('>Room is available and ready for check-in<', '>{t("infoRoomAvailable")}<', 'info room available jsx')
rep('>Room is under maintenance<', '>{t("infoUnderMaintenance")}<', 'info under maintenance jsx')
rep('>This room is not available for booking until maintenance is complete.<', '>{t("infoMaintenanceNote")}<', 'info maintenance note jsx')

# Reservations history section
rep('> Reservations History<', '> {t("reservationsHistory")}<', 'reservations history jsx')
rep('>Loading...<', '>{t("loading")}<', 'loading jsx')
rep('>No reservations found for this room<', '>{t("noReservationsForRoom")}<', 'no reservations for room jsx')

# Buttons
rep('>Reserve This Room<', '>{t("btnReserveThisRoom")}<', 'btn reserve this room jsx')
rep('>Early Out<', '>{t("btnEarlyOut")}<', 'btn early out jsx')
rep('>Shift<', '>{t("btnShift")}<', 'btn shift jsx')

# Dialog titles/descriptions
rep('>Room Shift<', '>{t("dialogShiftTitle")}<', 'dialog shift title jsx')

# Menu items  
rep('>Extend Stay / Early Checkout<', '>{t("menuExtendEarlyCheckout")}<', 'menu extend/early jsx')
rep('>Room Shift<', '>{t("menuRoomShift")}<', 'menu room shift jsx')
rep('>Toggle Availability<', '>{t("menuToggleAvailability")}<', 'menu toggle jsx')

# Payment status (in Badge or conditional)
rep('"PAID"', 't("paymentPaid")', 'payment PAID')
rep('"UNPAID"', 't("paymentUnpaid")', 'payment UNPAID')
rep('"PARTIAL"', 't("paymentPartial")', 'payment PARTIAL')
rep('"OVERDUE"', 't("paymentOverdue")', 'payment OVERDUE')

# Stayed nights with plural
rep('Stayed {stayed} night{stayed !== 1 ? "s" : ""}', 't("infoStayedNights", { stayed })', 'stayed nights')

# More info panel strings that are in different format
rep('No active reservation found for this room', 't("infoNoActiveRes")', 'info no active res text 2')

with open(FILE, "w", encoding="utf-8") as f:
    f.write(content)

print(f"\nTotal: {count} replacements")