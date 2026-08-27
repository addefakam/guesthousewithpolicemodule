#!/usr/bin/env python3
"""Clean i18n replacement for daytime-page.tsx. No sed, only exact string replacement."""

FILE = '/home/z/my-project/src/components/ghms/pages/daytime-page.tsx'
with open(FILE, 'r') as f:
    c = f.read()

count = 0

def rep(old, new, desc):
    global c, count
    if old in c:
        c = c.replace(old, new, 1)
        count += 1
        print(f'  OK: {desc}')
    else:
        print(f'  SKIP: {desc}')

# 1. Change namespace
rep('const { t } = useTranslation();', 'const { t } = useTranslation(["daytime", "common"]);', 'namespace')

# 2. Page header
rep('<h1 className="text-2xl font-bold text-gray-900">Daytime Services</h1>',
     '<h1 className="text-2xl font-bold text-gray-900">{t("pageTitle")}</h1>', 'page title')
rep('<p className="mt-1 text-sm text-gray-500">\n            Manage services and bookings for day guests\n          </p>',
     '<p className="mt-1 text-sm text-gray-500">\n            {t("pageSubtitle")}\n          </p>', 'page subtitle')

# 3. Tab labels with count
rep('Services ({services.length})', '{t("tabServices")} ({services.length})', 'tab services')
rep('Bookings ({bookings.length})', '{t("tabBookings")} ({bookings.length})', 'tab bookings')

# 4. Header buttons
rep('activeTab === "services" ? "Add Service" : "New Booking"',
     'activeTab === "services" ? t("btnAddService") : t("btnNewBooking")', 'header button')

# 5. Empty states
rep('>No services yet<', '>{t("noServicesYet")}<', 'no services yet')
rep('>Get started by adding your first daytime service<', '>{t("noServicesYetDesc")}<', 'no services yet desc')
rep('>No bookings yet<', '>{t("noBookingsYet")}<', 'no bookings yet')
rep('>Create a booking when a day guest uses a service<', '>{t("noBookingsYetDesc")}<', 'no bookings yet desc')

# 6. Service card - menu items
rep('<Pencil className="mr-2 h-4 w-4" /> Edit\n',
     '<Pencil className="mr-2 h-4 w-4" /> {t("menuEdit")}\n', 'menu edit')
rep('svc.active ? "Deactivate" : "Activate"',
     'svc.active ? t("menuDeactivate") : t("menuActivate")', 'menu activate/deactivate')
rep('<Trash2 className="mr-2 h-4 w-4" /> Delete\n',
     '<Trash2 className="mr-2 h-4 w-4" /> {t("menuDelete")}\n', 'menu delete')

# 7. Service card - status badge
rep('svc.active ? (\n                        <Badge className="bg-emerald-100 text-emerald-700 text-xs">Active</Badge>',
     'svc.active ? (\n                        <Badge className="bg-emerald-100 text-emerald-700 text-xs">{t("statusActive")}</Badge>', 'status active')
rep('<Badge className="bg-gray-100 text-gray-500 text-xs">Inactive</Badge>',
     '<Badge className="bg-gray-100 text-gray-500 text-xs">{t("statusInactive")}</Badge>', 'status inactive')
rep('(inactive)', 't("statusInactiveHint")', 'status inactive hint')

# 8. Toast messages
rep('toast.error("Failed to load services")', 'toast.error(t("toastFailedLoadServices"))', 'toast failed load')
rep('toast.error("Failed to load bookings")', 'toast.error(t("toastFailedLoadBookings"))', 'toast failed load bookings')
rep('"Name and price are required"', 't("valNamePriceRequired")', 'val name price')
rep('"Service, guest name, date, and time are required"', 't("valBookingRequired")', 'val booking required')
rep('"Selected service not found"', 't("valServiceNotFound")', 'val service not found')
rep('"Invalid phone number. Use format like +251 9XX XXX XXX (7-15 digits)"', 't("valInvalidPhone")', 'val invalid phone')
rep('"Enter a valid amount"', 't("valValidAmount")', 'val valid amount')
rep('toast.success("Service updated")', 'toast.success(t("toastServiceUpdated"))', 'toast service updated')
rep('toast.success("Service created")', 'toast.success(t("toastServiceCreated"))', 'toast service created')
rep('toast.error("Failed to save service")', 'toast.error(t("toastFailedSaveService"))', 'toast failed save')
rep('toast.error("Failed to delete service")', 'toast.error(t("toastFailedDeleteService"))', 'toast failed delete')
rep('toast.success("Service deleted")', 'toast.success(t("toastServiceDeleted"))', 'toast service deleted')

# Service toggle toast
rep('`Service ${svc.active ? "deactivated" : "activated"}`',
     'svc.active ? t("toastServiceDeactivated") : t("toastServiceActivated")', 'toast toggle')
rep('toast.error("Failed to toggle service")', 'toast.error(t("toastFailedToggleService"))', 'toast failed toggle')

# Booking toasts
rep('toast.success("Booking updated")', 'toast.success(t("toastBookingUpdated"))', 'toast booking updated')
rep('toast.success("Booking created")', 'toast.success(t("toastBookingCreated"))', 'toast booking created')
rep('toast.error("Failed to save booking")', 'toast.error(t("toastFailedSaveBooking"))', 'toast failed save booking')
rep('toast.success("Booking deleted")', 'toast.success(t("toastBookingDeleted"))', 'toast booking deleted')
rep('toast.error("Failed to delete booking")', 'toast.error(t("toastFailedDeleteBooking"))', 'toast failed delete booking')

# Payment toast
rep('`Payment of ${formatPrice(amount)} recorded`',
     't("toastPaymentRecorded", { amount: formatPrice(amount) })', 'toast payment recorded')
rep('toast.error("Failed to record payment")', 'toast.error(t("toastFailedRecordPayment"))', 'toast failed record')

# 9. Dialog titles/descriptions
rep('editingSvc ? "Edit Service" : "Add New Service"',
     'editingSvc ? t("dlgEditServiceTitle") : t("dlgAddServiceTitle")', 'service dialog title')
rep('editingSvc ? "Update service details." : "Fill in details to create a new daytime service."',
     'editingSvc ? t("dlgEditServiceDesc") : t("dlgAddServiceDesc")', 'service dialog desc')

rep('editingBk ? "Edit Booking" : "New Booking"',
     'editingBk ? t("dlgEditBookingTitle") : t("dlgNewBookingTitle")', 'booking dialog title')
rep('editingBk ? "Update booking details." : "Create a new daytime service booking."',
     'editingBk ? t("dlgEditBookingDesc") : t("dlgNewBookingDesc")', 'booking dialog desc')

rep('<DialogTitle className="flex items-center gap-2">\n              <CreditCard className="h-5 w-5 text-emerald-600" /> Record Payment\n            </DialogTitle>',
     '<DialogTitle className="flex items-center gap-2">\n              <CreditCard className="h-5 w-5 text-emerald-600" /> {t("dlgRecordPaymentTitle")}\n            </DialogTitle>', 'payment dialog title')

# 10. Form labels
rep('<Label>Service Name <span className="text-rose-500">*</span></Label>',
     '<Label>{t("lblServiceName")} <span className="text-rose-500">*</span></Label>', 'lbl service name')
rep('<Label>Price <span className="text-rose-500">*</span></Label>',
     '<Label>{t("lblPrice")} <span className="text-rose-500">*</span></Label>', 'lbl price')
rep('<Label>Service <span className="text-rose-500">*</span></Label>',
     '<Label>{t("lblService")} <span className="text-rose-500">*</span></Label>', 'lbl service')
rep('<Label>Guest Name <span className="text-rose-500">*</span></Label>',
     '<Label>{t("lblGuestName")} <span className="text-rose-500">*</span></Label>', 'lbl guest name')
rep('<Label>Date <span className="text-rose-500">*</span></Label>',
     '<Label>{t("lblDate")} <span className="text-rose-500">*</span></Label>', 'lbl date')
rep('<Label>Time <span className="text-rose-500">*</span></Label>',
     '<Label>{t("lblTime")} <span className="text-rose-500">*</span></Label>', 'lbl time')
rep('<Label>Amount <span className="text-rose-500">*</span></Label>',
     '<Label>{t("lblAmount")} <span className="text-rose-500">*</span></Label>', 'lbl amount')

# 11. Placeholders
rep('placeholder="e.g. Spa Treatment"', 'placeholder={t("phServiceName")}', 'ph service name')
rep('placeholder="Select..."', 'placeholder={t("phSelectGeneric")}', 'ph select generic')
rep('placeholder="e.g. 1 hour, 30 mins"', 'placeholder={t("phDuration")}', 'ph duration')
rep('placeholder="Describe the service..."', 'placeholder={t("phDescription")}', 'ph description')
rep('placeholder="Select service..."', 'placeholder={t("phSelectService")}', 'ph select service')
rep('placeholder="Guest name"', 'placeholder={t("phGuestName")}', 'ph guest name')
rep('placeholder="Phone number"', 'placeholder={t("phPhoneNumber")}', 'ph phone number')
rep('placeholder="Amount to pay"', 'placeholder={t("phAmountToPay")}', 'ph amount')

# 12. Estimated total
rep('<span className="font-medium text-gray-900">Estimated Total: </span>',
     '<span className="font-medium text-gray-900">{t("estimatedTotal")}</span>', 'estimated total')

# 13. Payment methods in Select
rep('"CASH"', 't("payMethodCash")', 'pay cash')
rep('"TRANSFER"', 't("payMethodTransfer")', 'pay transfer')
rep('"CARD"', 't("payMethodCard")', 'pay card')
rep('"MOBILE"', 't("payMethodMobile")', 'pay mobile')

# 14. Category options
rep('"SPA"', 't("catSpa")', 'cat spa')
rep('"FOOD"', 't("catFood")', 'cat food')
rep('"LAUNDRY"', 't("catLaundry")', 'cat laundry')
rep('"MEETING"', 't("catMeeting")', 'cat meeting')
rep('"OTHER"', 't("catOther")', 'cat other')

# 15. Button labels
rep('"Saving..."', 't("btnSaving")', 'btn saving')
rep('"Recording..."', 't("btnRecording")', 'btn recording')
rep('"Deleting..."', 't("btnDeleting")', 'btn deleting')
rep('editingSvc ? "Saving..." : "Update Service"',
     'editingSvc ? t("btnSaving") : t("btnUpdateService")', 'btn save/update service')
rep('!editingSvc ? "Create Service" : "Update Service"',
     '!editingSvc ? t("btnCreateService") : t("btnUpdateService")', 'btn create/update service')
rep('editingBk ? "Saving..." : "Update Booking"',
     'editingBk ? t("btnSaving") : t("btnUpdateBooking")', 'btn save/update booking')
rep('!editingBk ? "Create Booking" : "Update Booking"',
     '!editingBk ? t("btnCreateBooking") : t("btnUpdateBooking")', 'btn create/update booking')
rep('payLoading ? "Recording..." : "Record Payment"',
     'payLoading ? t("btnRecording") : t("btnRecordPayment")', 'btn recording/record payment')

# 16. Cancel buttons
rep('onClick={() => setSvcDialogOpen(false)}}>Cancel</Button>',
     'onClick={() => setSvcDialogOpen(false)}}>{t("cancel")}</Button>', 'cancel service dialog')
rep('onClick={() => setBkDialogOpen(false)}}>Cancel</Button>',
     'onClick={() => setBkDialogOpen(false)}}>{t("cancel")}</Button>', 'cancel booking dialog')
rep('onClick={() => setPayDialogOpen(false)}}>Cancel</Button>',
     'onClick={() => setPayDialogOpen(false)}}>{t("cancel")}</Button>', 'cancel payment dialog')

# 17. Delete alert buttons
rep('svcDeleteLoading ? "Deleting..." : "Delete"',
     'svcDeleteLoading ? t("btnDeleting") : t("btnDelete")', 'delete service btn')
rep('bkDeleteLoading ? "Deleting..." : "Delete"',
     'bkDeleteLoading ? t("btnDeleting") : t("btnDelete")', 'delete booking btn')

# 18. Cancel buttons in alerts  
rep('<AlertDialogCancel>Cancel</AlertDialogCancel>',
     '<AlertDialogCancel>{t("cancel")}</AlertDialogCancel>', 'alert cancel')

# 19. Delete alert descriptions
rep('This will permanently delete this service. Services with existing bookings cannot be deleted.',
     '{t("alertDeleteServiceDesc")}', 'alert delete service desc')
rep('This will permanently delete this booking and cannot be undone.',
     '{t("alertDeleteBookingDesc")}', 'alert delete booking desc')

# 20. No services in select
rep('>No services created yet<', '>{t("noServicesInSelect")}<', 'no services in select')

# 21. Booking menu items
rep('<Pencil className="mr-2 h-4 w-4" />\n                              Edit\n                            </DropdownMenuItem>',
     '<Pencil className="mr-2 h-4 w-4" />\n                              {t("menuEdit")}\n                            </DropdownMenuItem>', 'booking menu edit')

rep('<CreditCard className="mr-2 h-4 w-4" />\n                              Record Payment\n                            </DropdownMenuItem>',
     '<CreditCard className="mr-2 h-4 w-4" />\n                              {t("menuRecordPayment")}\n                            </DropdownMenuItem>', 'booking menu record payment')

rep('<Trash2 className="mr-2 h-4 w-4" />\n                              Delete\n                            </DropdownMenuItem>',
     '<Trash2 className="mr-2 h-4 w-4" />\n                              {t("menuDelete")}\n                            </DropdownMenuItem>', 'booking menu delete')

with open(FILE, 'w') as f:
    f.write(c)

o = c.count('{') - c.count('}')
print(f'\nTotal replacements: {count}')
print(f'Brace balance: {o}')
if o != 0:
    print('WARNING: Braces not balanced!')
