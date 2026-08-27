#!/usr/bin/env python3
"""Replace hardcoded strings in daytime-page.tsx with t() calls."""

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

# Change namespace to include daytime
rep('const { t } = useTranslation();', 'const { t } = useTranslation(["daytime", "common"]);', 'change namespace to daytime+common')

# Page header
rep('>Daytime Services<', '>{t("pageTitle")}<', 'page title')
rep('>Manage services and bookings for day guests<', '>{t("pageSubtitle")}<', 'page subtitle')

# Tab labels
rep('>Services<', '>{t("tabServices")}<', 'tab services')
rep('>Bookings<', '>{t("tabBookings")}<', 'tab bookings')

# Button labels
rep('Add Service', 't("btnAddService")', 'add service btn')
rep('New Booking', 't("btnNewBooking")', 'new booking btn')

# Toast messages - success
rep('"Service updated"', 't("toastServiceUpdated")', 'toast service updated')
rep('"Service created"', 't("toastServiceCreated")', 'toast service created')
rep('"Service deleted"', 't("toastServiceDeleted")', 'toast service deleted')
rep('"Booking updated"', 't("toastBookingUpdated")', 'toast booking updated')
rep('"Booking created"', 't("toastBookingCreated")', 'toast booking created')
rep('"Booking deleted"', 't("toastBookingDeleted")', 'toast booking deleted')

# Toast messages - error
rep('"Failed to load services"', 't("toastFailedLoadServices")', 'toast failed load services')
rep('"Failed to load bookings"', 't("toastFailedLoadBookings")', 'toast failed load bookings')
rep('"Failed to save service"', 't("toastFailedSaveService")', 'toast failed save service')
rep('"Failed to delete service"', 't("toastFailedDeleteService")', 'toast failed delete service')
rep('"Failed to toggle service"', 't("toastFailedToggleService")', 'toast failed toggle service')
rep('"Failed to save booking"', 't("toastFailedSaveBooking")', 'toast failed save booking')
rep('"Failed to delete booking"', 't("toastFailedDeleteBooking")', 'toast failed delete booking')
rep('"Failed to record payment"', 't("toastFailedRecordPayment")', 'toast failed record payment')

# Validation
rep('"Name and price are required"', 't("valNamePriceRequired")', 'val name price')
rep('"Service, guest name, date, and time are required"', 't("valBookingRequired")', 'val booking required')
rep('"Selected service not found"', 't("valServiceNotFound")', 'val service not found')
rep('"Invalid phone number. Use format like +251 9XX XXX XXX (7-15 digits)"', 't("valInvalidPhone")', 'val invalid phone')
rep('"Enter a valid amount"', 't("valValidAmount")', 'val valid amount')

# Status labels
rep('"Active"', 't("statusActive")', 'status active')
rep('"Inactive"', 't("statusInactive")', 'status inactive')
rep('(inactive)', 't("statusInactiveHint")', 'status inactive hint')

# Empty states
rep('>No services yet<', '>{t("noServicesYet")}<', 'no services yet')
rep('>Get started by adding your first daytime service<', '>{t("noServicesYetDesc")}<', 'no services yet desc')
rep('>No bookings yet<', '>{t("noBookingsYet")}<', 'no bookings yet')
rep('>Create a booking when a day guest uses a service<', '>{t("noBookingsYetDesc")}<', 'no bookings yet desc')

# Menu items
rep('>Edit<', '>{t("menuEdit")}<', 'menu edit')
rep('>Deactivate<', '>{t("menuDeactivate")}<', 'menu deactivate')
rep('>Activate<', '>{t("menuActivate")}<', 'menu activate')
rep('>Delete<', '>{t("menuDelete")}<', 'menu delete')
rep('>Record Payment<', '>{t("menuRecordPayment")}<', 'menu record payment')

# Dialog titles
rep('"Edit Service"', 't("dlgEditServiceTitle")', 'dlg edit service')
rep('"Add New Service"', 't("dlgAddServiceTitle")', 'dlg add service')
rep('"Update service details."', 't("dlgEditServiceDesc")', 'dlg edit service desc')
rep('"Fill in details to create a new daytime service."', 't("dlgAddServiceDesc")', 'dlg add service desc')
rep('"Edit Booking"', 't("dlgEditBookingTitle")', 'dlg edit booking')
rep('"New Booking"', 't("dlgNewBookingTitle")', 'dlg new booking')
rep('"Update booking details."', 't("dlgEditBookingDesc")', 'dlg edit booking desc')
rep('"Create a new daytime service booking."', 't("dlgNewBookingDesc")', 'dlg new booking desc')
rep('"Record Payment"', 't("dlgRecordPaymentTitle")', 'dlg record payment title')

# Form labels
rep('>Service Name<', '>{t("lblServiceName")}<', 'lbl service name')
rep('>Price<', '>{t("lblPrice")}<', 'lbl price')
rep('>Service<', '>{t("lblService")}<', 'lbl service')
rep('>Guest Name<', '>{t("lblGuestName")}<', 'lbl guest name')
rep('>Date<', '>{t("lblDate")}<', 'lbl date')
rep('>Time<', '>{t("lblTime")}<', 'lbl time')
rep('>Amount<', '>{t("lblAmount")}<', 'lbl amount')

# Placeholders
rep('"e.g. Spa Treatment"', 't("phServiceName")', 'ph service name')
rep('"Select..."', 't("phSelectGeneric")', 'ph select generic')
rep('"e.g. 1 hour, 30 mins"', 't("phDuration")', 'ph duration')
rep('"Describe the service..."', 't("phDescription")', 'ph description')
rep('"Select service..."', 't("phSelectService")', 'ph select service')
rep('"Guest name"', 't("phGuestName")', 'ph guest name')
rep('"Phone number"', 't("phPhoneNumber")', 'ph phone number')
rep('"Amount to pay"', 't("phAmountToPay")', 'ph amount to pay')

# Payment methods
rep('"Cash"', 't("payMethodCash")', 'pay cash')
rep('"Transfer"', 't("payMethodTransfer")', 'pay transfer')
rep('"Card"', 't("payMethodCard")', 'pay card')
rep('"Mobile"', 't("payMethodMobile")', 'pay mobile')

# Button states
rep('"Saving..."', 't("btnSaving")', 'btn saving')
rep('"Recording..."', 't("btnRecording")', 'btn recording')
rep('"Deleting..."', 't("btnDeleting")', 'btn deleting')
rep('"Create Service"', 't("btnCreateService")', 'btn create service')
rep('"Update Service"', 't("btnUpdateService")', 'btn update service')
rep('"Create Booking"', 't("btnCreateBooking")', 'btn create booking')
rep('"Update Booking"', 't("btnUpdateBooking")', 'btn update booking')
rep('"Record Payment"', 't("btnRecordPayment")', 'btn record payment (dialog)')

# Cancel buttons
rep('"Cancel"', 't("cancel")', 'cancel btn')

# Delete alerts
rep('"This will permanently delete this service. Services with existing bookings cannot be deleted."', 't("alertDeleteServiceDesc")', 'alert delete service desc')
rep('"This will permanently delete this booking and cannot be undone."', 't("alertDeleteBookingDesc")', 'alert delete booking desc')

# Other
rep('"No services created yet"', 't("noServicesInSelect")', 'no services in select')

# Estimated total
rep('"Estimated Total: "', 't("estimatedTotal")', 'estimated total')

# Category options (displayed to users)
rep('"SPA"', 't("catSpa")', 'cat spa')
rep('"FOOD"', 't("catFood")', 'cat food')
rep('"LAUNDRY"', 't("catLaundry")', 'cat laundry')
rep('"MEETING"', 't("catMeeting")', 'cat meeting')
rep('"OTHER"', 't("catOther")', 'cat other')

with open(FILE, "w", encoding="utf-8") as f:
    f.write(content)

print(f"\nTotal: {count} replacements")