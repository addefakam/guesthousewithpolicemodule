/**
 * i18n.js — Bilingual translations: English (en) + Amharic (am)
 * Guest House Management System
 */

export const translations = {
  en: {
    /* Brand */
    'brand.sub': 'Management System',

    /* Nav */
    'nav.overview':      'Overview',
    'nav.dashboard':     'Dashboard',
    'nav.operations':    'Operations',
    'nav.rooms':         'Rooms',
    'nav.guests':        'Guests',
    'nav.reservations':  'Reservations',
    'nav.calendar':     'Room Calendar',
    'nav.daytime':       'Daytime Services',
    'nav.finance':       'Finance & Resources',
    'nav.expenses':      'Expenses',
    'nav.resources':     'Resources',
    'nav.reports':       'Reports',
    'nav.settings':      'Settings',

    /* Role */
    'role.owner': 'Owner',

    /* Dashboard */
    'dash.title':        'Dashboard',
    'dash.subtitle':     'Overview of your business operations today',
    'dash.occupancy':    'Occupancy Rate',
    'dash.revenue':      "Today's Revenue",
    'dash.active_guests':'Active Guests',
    'dash.pending':      'Pending Payments',
    'dash.available':    'Rooms Available',
    'dash.today_checkin':'Today Check-ins',
    'dash.quick':        'Quick Actions',
    'dash.activity':     'Recent Activity',
    'dash.rev_chart':    'Revenue Overview (Last 7 Days)',
    'dash.occ_chart':    'Room Occupancy',
    'dash.no_activity':  'No recent activity',

    /* Rooms */
    'room.title':         'Room Management',
    'room.subtitle':      'Manage all rooms and their availability',
    'room.add':           'Add Room',
    'room.edit':          'Edit Room',
    'room.delete':        'Delete Room',
    'room.number':        'Room Number',
    'room.name':          'Room Name',
    'room.type':          'Room Type',
    'room.price':         'Price Per Night',
    'room.floor':         'Floor',
    'room.capacity':      'Capacity (persons)',
    'room.status':        'Status',
    'room.amenities':     'Amenities',
    'room.description':   'Description',
    'room.available':     'Available',
    'room.occupied':      'Occupied',
    'room.maintenance':   'Maintenance',
    'room.single':        'Single',
    'room.double':        'Double',
    'room.twin':          'Twin',
    'room.suite':         'Suite',
    'room.deluxe':        'Deluxe',
    'room.all':           'All Rooms',
    'room.view_grid':     'Grid View',
    'room.view_list':     'List View',
    'room.delete_confirm':'Are you sure you want to delete this room?',
    'room.per_night':     '/night',
    'room.no_rooms':      'No rooms found',
    'room.add_first':     'Add your first room to get started',

    /* Guests */
    'guest.title':        'Guest Management',
    'guest.subtitle':     'Register and manage all guests',
    'guest.add':          'Add Guest',
    'guest.edit':         'Edit Guest',
    'guest.name':         'Full Name',
    'guest.phone':        'Phone Number',
    'guest.email':        'Email Address',
    'guest.id_number':    'ID Number',
    'guest.id_type':      'ID Type',
    'guest.nationality':  'Nationality',
    'guest.address':      'Address',
    'guest.notes':        'Notes',
    'guest.history':      'Reservation History',
    'guest.since':        'Guest since',
    'guest.total_stays':  'Total Stays',
    'guest.id_national':  'National ID',
    'guest.id_passport':  'Passport',
    'guest.id_driving':   'Driving License',
    'guest.no_guests':    'No guests registered',
    'guest.add_first':    'Add your first guest',

    /* Reservations */
    'res.title':          'Reservations',
    'res.subtitle':       'Manage overnight room reservations',
    'res.add':            'New Reservation',
    'res.checkin':        'Check In',
    'res.checkout':       'Check Out',
    'res.do_checkin':     'Confirm Check-In',
    'res.do_checkout':    'Confirm Check-Out',
    'res.guest':          'Guest',
    'res.room':           'Room',
    'res.nights':         'Nights',
    'res.total':          'Total Cost',
    'res.paid':           'Amount Paid',
    'res.balance':        'Balance Due',
    'res.payment_status': 'Payment Status',
    'res.payment_method': 'Payment Method',
    'res.notes':          'Notes',
    'res.status':         'Status',
    'res.upcoming':       'Upcoming',
    'res.active':         'Active',
    'res.completed':      'Completed',
    'res.cancelled':      'Cancelled',
    'res.paid_lbl':       'Paid',
    'res.partial':        'Partial',
    'res.pending':        'Pending',
    'res.cash':           'Cash',
    'res.transfer':       'Bank Transfer',
    'res.card':           'Card',
    'res.cancel':         'Cancel Reservation',
    'res.receipt':        'View Receipt',
    'res.no_res':         'No reservations found',
    'res.select_guest':   '— Select Guest —',
    'res.select_room':    '— Select Room —',

    /* Daytime */
    'day.title':          'Daytime Services',
    'day.subtitle':       'Manage walk-in daytime service bookings',
    'day.catalogue':      'Service Catalogue',
    'day.bookings':       'Service Bookings',
    'day.book':           'Book Service',
    'day.add_service':    'Add Service',
    'day.edit_service':   'Edit Service',
    'day.service_name':   'Service Name',
    'day.price':          'Price',
    'day.category':       'Category',
    'day.duration':       'Duration',
    'day.guest_name':     'Guest Name',
    'day.guest_phone':    'Guest Phone',
    'day.date':           'Date',
    'day.time':           'Time',
    'day.quantity':       'Quantity',
    'day.total':          'Total',
    'day.no_services':    'No services defined',
    'day.no_bookings':    'No service bookings',

    /* Expenses */
    'exp.title':          'Expense Management',
    'exp.subtitle':       'Track all business expenses and costs',
    'exp.add':            'Add Expense',
    'exp.edit':           'Edit Expense',
    'exp.date':           'Date',
    'exp.category':       'Category',
    'exp.amount':         'Amount',
    'exp.description':    'Description',
    'exp.vendor':         'Vendor / Supplier',
    'exp.payment':        'Payment Method',
    'exp.receipt_no':     'Receipt Number',
    'exp.total_today':    "Today's Expenses",
    'exp.total_month':    "This Month's Expenses",
    'exp.no_expenses':    'No expenses recorded',
    'exp.add_first':      'Record your first expense',

    /* Resources */
    'res2.title':         'Resource & Inventory',
    'res2.subtitle':      'Track supplies, inventory, and stock levels',
    'res2.add':           'Add Item',
    'res2.edit':          'Edit Item',
    'res2.restock':       'Restock',
    'res2.item_name':     'Item Name',
    'res2.category':      'Category',
    'res2.quantity':      'Quantity',
    'res2.unit':          'Unit',
    'res2.min_level':     'Minimum Level',
    'res2.cost_per_unit': 'Cost per Unit',
    'res2.supplier':      'Supplier',
    'res2.low_stock':     'Low Stock Alert',
    'res2.no_items':      'No items in inventory',
    'res2.add_first':     'Add your first inventory item',

    /* Reports */
    'rep.title':          'Reports & Analytics',
    'rep.subtitle':       'Business intelligence and financial reports',
    'rep.period':         'Report Period',
    'rep.from':           'From',
    'rep.to':             'To',
    'rep.generate':       'Generate Report',
    'rep.export_csv':     'Export CSV',
    'rep.print':          'Print',
    'rep.revenue':        'Revenue Report',
    'rep.expenses':       'Expense Report',
    'rep.occupancy':      'Occupancy Report',
    'rep.gross_revenue':  'Gross Revenue',
    'rep.net_profit':     'Net Profit',
    'rep.room_rev':       'Room Revenue',
    'rep.service_rev':    'Service Revenue',
    'rep.total_exp':      'Total Expenses',
    'rep.avg_occ':        'Avg Occupancy',

    /* Settings */
    'set.title':          'Settings',
    'set.subtitle':       'Configure your guest house system',
    'set.house_name':     'Guest House Name',
    'set.owner_name':     'Owner Name',
    'set.address':        'Address',
    'set.phone':          'Phone Number',
    'set.email':          'Email',
    'set.currency':       'Currency',
    'set.language':       'Language',
    'set.save':           'Save Settings',
    'set.rooms_cfg':      'Room Types',
    'set.services_cfg':   'Daytime Services',
    'set.exp_cats':       'Expense Categories',

    /* Common */
    'common.save':        'Save',
    'common.cancel':      'Cancel',
    'common.edit':        'Edit',
    'common.delete':      'Delete',
    'common.add':         'Add',
    'common.search':      'Search...',
    'common.all':         'All',
    'common.loading':     'Loading...',
    'common.no_data':     'No data found',
    'common.actions':     'Actions',
    'common.status':      'Status',
    'common.date':        'Date',
    'common.amount':      'Amount',
    'common.name':        'Name',
    'common.notes':       'Notes',
    'common.close':       'Close',
    'common.confirm':     'Confirm',
    'common.view':        'View',
    'common.print':       'Print',
    'common.export':      'Export',
    'common.filter':      'Filter',
    'common.from':        'From',
    'common.to':          'To',
    'common.days':        'days',
    'common.of':          'of',
    'common.per_night':   'per night',
    'common.checkin':     'Check-in',
    'common.checkout':    'Check-out',
    'common.total':       'Total',
    'common.delete_confirm': 'This action cannot be undone.',

    /* Calendar */
    'cal.title':        'Room Calendar',
    'cal.subtitle':     'Visual room availability overview',

    /* Months */
    'months': ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],

    /* Users */
    'users.title':       'User Management',
    'users.subtitle':    'Manage system users and access control',
    'users.add':         'Add User',
    'users.edit':        'Edit User',
    'users.username':    'Username',
    'users.password':    'Password',
    'users.role':        'Role',
    'users.name':        'Full Name',
    'users.superuser':   'Superuser',
    'users.operator':    'Operator',

    /* Feedback */
    'feedback.title':    'Guest Feedback',
    'feedback.subtitle': 'Guest reviews and satisfaction ratings',
    'feedback.add':      'Add Review',
    'feedback.rating':   'Rating',
    'feedback.comment':  'Comment',
    'feedback.guest':    'Guest',

    /* Notifications */
    'nav.users':         'User Management',
    'nav.feedback':      'Guest Feedback',
    'nav.administration':'Administration',
  },

  am: {
    /* Brand */
    'brand.sub': 'አስተዳደር ስርዓት',

    /* Nav */
    'nav.overview':      'አጠቃላይ እይታ',
    'nav.dashboard':     'ዳሽቦርድ',
    'nav.operations':    'ስራዎች',
    'nav.rooms':         'ክፍሎች',
    'nav.guests':        'እንግዶች',
    'nav.reservations':  'ቦታ ማስያዝ',
    'nav.calendar':     'የክፍል ቀጠሮ',
    'nav.daytime':       'የቀን አገልግሎቶች',
    'nav.finance':       'ፋይናንስ እና ሃብቶች',
    'nav.expenses':      'ወጪዎች',
    'nav.resources':     'ሃብቶች',
    'nav.reports':       'ሪፖርቶች',
    'nav.settings':      'ቅንብሮች',

    /* Role */
    'role.owner': 'ባለቤት',

    /* Dashboard */
    'dash.title':        'ዳሽቦርድ',
    'dash.subtitle':     'የዛሬ የንግድ ስራ አጠቃላይ እይታ',
    'dash.occupancy':    'የክፍል ተጠቃሚ መጠን',
    'dash.revenue':      'የዛሬ ገቢ',
    'dash.active_guests':'ንቁ እንግዶች',
    'dash.pending':      'ያልተከፈሉ ክፍያዎች',
    'dash.available':    'ነፃ ክፍሎች',
    'dash.today_checkin':'የዛሬ ቼክ-ኢን',
    'dash.quick':        'ፈጣን ተግባሮች',
    'dash.activity':     'የቅርብ ጊዜ እንቅስቃሴ',
    'dash.rev_chart':    'ባለፉት 7 ቀናት ገቢ',
    'dash.occ_chart':    'የክፍል ተጠቃሚ ሁኔታ',
    'dash.no_activity':  'ምንም እንቅስቃሴ የለም',

    /* Rooms */
    'room.title':         'የክፍል አስተዳደር',
    'room.subtitle':      'ሁሉንም ክፍሎች እና ሁኔታቸውን ያስተዳድሩ',
    'room.add':           'ክፍል ጨምር',
    'room.edit':          'ክፍል ቀይር',
    'room.delete':        'ክፍል ሰርዝ',
    'room.number':        'የክፍል ቁጥር',
    'room.name':          'የክፍል ስም',
    'room.type':          'የክፍል አይነት',
    'room.price':         'የአንድ ሌሊት ዋጋ',
    'room.floor':         'ፎቅ',
    'room.capacity':      'አቅም (ሰዎች)',
    'room.status':        'ሁኔታ',
    'room.amenities':     'አገልግሎቶች',
    'room.description':   'ገለጻ',
    'room.available':     'ተገኝቷል',
    'room.occupied':      'ተይዟል',
    'room.maintenance':   'ጥገና',
    'room.single':        'ነጠላ',
    'room.double':        'ድርብ',
    'room.twin':          'ሁለት 침대',
    'room.suite':         'ሱዊት',
    'room.deluxe':        'ዴሉክስ',
    'room.all':           'ሁሉም ክፍሎች',
    'room.view_grid':     'የፍርግርግ እይታ',
    'room.view_list':     'የዝርዝር እይታ',
    'room.delete_confirm':'ይህን ክፍል ለመሰረዝ እርግጠኛ ነዎት?',
    'room.per_night':     '/ሌሊት',
    'room.no_rooms':      'ምንም ክፍሎች አልተገኙም',
    'room.add_first':     'ለመጀመር የመጀመሪያዎን ክፍል ጨምሩ',

    /* Guests */
    'guest.title':        'የእንግዶች አስተዳደር',
    'guest.subtitle':     'ሁሉንም እንግዶች መዝግቡ እና ያስተዳድሩ',
    'guest.add':          'እንግዳ ጨምር',
    'guest.edit':         'እንግዳ ቀይር',
    'guest.name':         'ሙሉ ስም',
    'guest.phone':        'ስልክ ቁጥር',
    'guest.email':        'ኢሜይል',
    'guest.id_number':    'መታወቂያ ቁጥር',
    'guest.id_type':      'መታወቂያ አይነት',
    'guest.nationality':  'ዜግነት',
    'guest.address':      'አድራሻ',
    'guest.notes':        'ማስታወሻ',
    'guest.history':      'የቦታ ማስያዝ ታሪክ',
    'guest.since':        'ከ',
    'guest.total_stays':  'ጠቅላላ ቆይታዎች',
    'guest.id_national':  'ብሔራዊ መታወቂያ',
    'guest.id_passport':  'ፓስፖርት',
    'guest.id_driving':   'ሹፌር ፈቃድ',
    'guest.no_guests':    'ምንም እንግዶች አልተመዘገቡም',
    'guest.add_first':    'የመጀመሪያዎን እንግዳ ይጨምሩ',

    /* Reservations */
    'res.title':          'ቦታ ማስያዝ',
    'res.subtitle':       'የምሽት ክፍል ቦታ ማስያዝ ያስተዳድሩ',
    'res.add':            'አዲስ ቦታ ያስይዙ',
    'res.checkin':        'ቼክ ኢን',
    'res.checkout':       'ቼክ አውት',
    'res.do_checkin':     'ቼክ-ኢን አረጋግጥ',
    'res.do_checkout':    'ቼክ-አውት አረጋግጥ',
    'res.guest':          'እንግዳ',
    'res.room':           'ክፍል',
    'res.nights':         'ሌሊቶች',
    'res.total':          'ጠቅላላ ዋጋ',
    'res.paid':           'የተከፈለ መጠን',
    'res.balance':        'ቀሪ ክፍያ',
    'res.payment_status': 'የክፍያ ሁኔታ',
    'res.payment_method': 'የክፍያ ዘዴ',
    'res.notes':          'ማስታወሻ',
    'res.status':         'ሁኔታ',
    'res.upcoming':       'መጪ',
    'res.active':         'ንቁ',
    'res.completed':      'ተጠናቀቀ',
    'res.cancelled':      'ተሰርዟል',
    'res.paid_lbl':       'ተከፍሏል',
    'res.partial':        'ከፊል',
    'res.pending':        'በጊዜ',
    'res.cash':           'ጥሬ ገንዘብ',
    'res.transfer':       'የባንክ ዝውውር',
    'res.card':           'ካርድ',
    'res.cancel':         'ቦታ ማስያዝ ሰርዝ',
    'res.receipt':        '영수증 ይመልከቱ',
    'res.no_res':         'ምንም ቦታ ማስያዝ አልተገኘም',
    'res.select_guest':   '— እንግዳ ምረጥ —',
    'res.select_room':    '— ክፍል ምረጥ —',

    /* Daytime */
    'day.title':          'የቀን አገልግሎቶች',
    'day.subtitle':       'ለቀን ጊዜ አገልግሎቶች ቦታ ያስይዙ',
    'day.catalogue':      'አገልግሎት ዝርዝር',
    'day.bookings':       'የቀን ቦታ ማስያዝ',
    'day.book':           'አገልግሎት ያስይዙ',
    'day.add_service':    'አገልግሎት ጨምር',
    'day.edit_service':   'አገልግሎት ቀይር',
    'day.service_name':   'የአገልግሎት ስም',
    'day.price':          'ዋጋ',
    'day.category':       'ምድብ',
    'day.duration':       'ጊዜ',
    'day.guest_name':     'የእንግዳ ስም',
    'day.guest_phone':    'የእንግዳ ስልክ',
    'day.date':           'ቀን',
    'day.time':           'ሰዓት',
    'day.quantity':       'መጠን',
    'day.total':          'ጠቅላላ',
    'day.no_services':    'ምንም አገልግሎቶች አልተገለጹም',
    'day.no_bookings':    'ምንም ቦታ ማስያዝ የለም',

    /* Expenses */
    'exp.title':          'ወጪ አስተዳደር',
    'exp.subtitle':       'ሁሉንም የንግድ ወጪዎች ይከታተሉ',
    'exp.add':            'ወጪ ጨምር',
    'exp.edit':           'ወጪ ቀይር',
    'exp.date':           'ቀን',
    'exp.category':       'ምድብ',
    'exp.amount':         'መጠን',
    'exp.description':    'ገለጻ',
    'exp.vendor':         'አቅራቢ',
    'exp.payment':        'የክፍያ ዘዴ',
    'exp.receipt_no':     '영수증 ቁጥር',
    'exp.total_today':    'የዛሬ ወጪ',
    'exp.total_month':    'የዚህ ወር ወጪ',
    'exp.no_expenses':    'ምንም ወጪ አልተመዘገበም',
    'exp.add_first':      'የመጀመሪያዎን ወጪ ይመዝግቡ',

    /* Resources */
    'res2.title':         'ሃብት እና ዕቃ',
    'res2.subtitle':      'አቅርቦቶችን፣ ዕቃዎችን እና ክምችት ደረጃን ይከታተሉ',
    'res2.add':           'ዕቃ ጨምር',
    'res2.edit':          'ዕቃ ቀይር',
    'res2.restock':       'ዕቃ ሙላ',
    'res2.item_name':     'የዕቃ ስም',
    'res2.category':      'ምድብ',
    'res2.quantity':      'መጠን',
    'res2.unit':          'ክፍሉ',
    'res2.min_level':     'ዝቅተኛ ደረጃ',
    'res2.cost_per_unit': 'ዋጋ በአንድ ክፍሉ',
    'res2.supplier':      'አቅራቢ',
    'res2.low_stock':     'ዝቅተኛ ክምችት ማስጠንቀቂያ',
    'res2.no_items':      'ምንም ዕቃዎች የሉም',
    'res2.add_first':     'የመጀመሪያዎን ዕቃ ይጨምሩ',

    /* Reports */
    'rep.title':          'ሪፖርቶች እና ትንተና',
    'rep.subtitle':       'የንግድ ብልህነት እና የፋይናንስ ሪፖርቶች',
    'rep.period':         'የሪፖርት ጊዜ',
    'rep.from':           'ከ',
    'rep.to':             'እስከ',
    'rep.generate':       'ሪፖርት ፍጠር',
    'rep.export_csv':     'CSV ወደ ውጭ ላክ',
    'rep.print':          'አትም',
    'rep.revenue':        'የገቢ ሪፖርት',
    'rep.expenses':       'የወጪ ሪፖርት',
    'rep.occupancy':      'የክፍል ተጠቃሚ ሪፖርት',
    'rep.gross_revenue':  'ጠቅላላ ገቢ',
    'rep.net_profit':     'ትርፍ',
    'rep.room_rev':       'የክፍል ገቢ',
    'rep.service_rev':    'የአገልግሎት ገቢ',
    'rep.total_exp':      'ጠቅላላ ወጪ',
    'rep.avg_occ':        'አማካይ ተጠቃሚ',

    /* Settings */
    'set.title':          'ቅንብሮች',
    'set.subtitle':       'የእንግዳ ቤት ስርዓቱን ያዋቅሩ',
    'set.house_name':     'የእንግዳ ቤት ስም',
    'set.owner_name':     'የባለቤት ስም',
    'set.address':        'አድራሻ',
    'set.phone':          'ስልክ ቁጥር',
    'set.email':          'ኢሜይል',
    'set.currency':       'ምንዛሪ',
    'set.language':       'ቋንቋ',
    'set.save':           'ቅንብሮችን አስቀምጥ',
    'set.rooms_cfg':      'የክፍል አይነቶች',
    'set.services_cfg':   'የቀን አገልግሎቶች',
    'set.exp_cats':       'የወጪ ምድቦች',

    /* Common */
    'common.save':        'አስቀምጥ',
    'common.cancel':      'ሰርዝ',
    'common.edit':        'ቀይር',
    'common.delete':      'ሰርዝ',
    'common.add':         'ጨምር',
    'common.search':      'ፈልግ...',
    'common.all':         'ሁሉም',
    'common.loading':     'እየጫነ...',
    'common.no_data':     'ምንም መረጃ አልተገኘም',
    'common.actions':     'ተግባሮች',
    'common.status':      'ሁኔታ',
    'common.date':        'ቀን',
    'common.amount':      'መጠን',
    'common.name':        'ስም',
    'common.notes':       'ማስታወሻ',
    'common.close':       'ዝጋ',
    'common.confirm':     'አረጋግጥ',
    'common.view':        'ይመልከቱ',
    'common.print':       'አትም',
    'common.export':      'ወደ ውጭ ላክ',
    'common.filter':      'አጣራ',
    'common.from':        'ከ',
    'common.to':          'እስከ',
    'common.days':        'ቀናት',
    'common.of':          'ከ',
    'common.per_night':   'በሌሊት',
    'common.checkin':     'ቼክ-ኢን',
    'common.checkout':    'ቼክ-አውት',
    'common.total':       'ጠቅላላ',
    'common.delete_confirm': 'ይህ ተግባር ሊቀለበስ አይችልም።',

    /* Calendar */
    'cal.title':        'የክፍል ቀጠሮ',
    'cal.subtitle':     'የክፍል ተገኝነት እይታ',

    /* Months */
    'months': ['ጥር','የካ','መጋ','ሚያ','ግን','ሰኔ','ሐም','ነሐ','መስ','ጥቅ','ኅዳ','ታህ'],

    /* Users */
    'users.title':       'የተጠቃሚ አስተዳደር',
    'users.subtitle':    'የስርዓት ተጠቃሚዎችን ያስተዳድሩ',
    'users.add':         'ተጠቃሚ ጨምር',
    'users.edit':        'ተጠቃሚ ቀይር',
    'users.username':    'የተጠቃሚ ስም',
    'users.password':    'የይለፍ ቃል',
    'users.role':        'ሚና',
    'users.name':        'ሙሉ ስም',
    'users.superuser':   'Superuser',
    'users.operator':    'ኦፕሬተር',

    /* Feedback */
    'feedback.title':    'የእንግዳ ግብረ መልስ',
    'feedback.subtitle': 'የእንግዶች ግብረ መልስ እና ደስታ',
    'feedback.add':      'ግብረ መልስ ጨምር',
    'feedback.rating':   'ደረጃ',
    'feedback.comment':  'አስተያየት',
    'feedback.guest':    'እንግዳ',

    /* Notifications */
    'nav.users':         'የተጠቃሚ አስተዳደር',
    'nav.feedback':      'የእንግዳ ግብረ መልስ',
    'nav.administration':'አስተዳደር',
  }
};

let currentLang = 'en';

export function setLanguage(lang) {
  currentLang = lang;
  document.documentElement.setAttribute('data-lang', lang);
  applyTranslations();
}

export function getLang() { return currentLang; }

export function t(key) {
  const dict = translations[currentLang] || translations.en;
  return dict[key] || translations.en[key] || key;
}

export function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    el.textContent = t(key);
  });
}

export function formatCurrency(amount) {
  const settings = JSON.parse(localStorage.getItem('ghms_settings') || '{}');
  const curr = settings.currency || 'ETB';
  if (typeof amount !== 'number') amount = parseFloat(amount) || 0;
  return `${curr} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  const months = t('months');
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  const months = t('months');
  const h = d.getHours().toString().padStart(2,'0');
  const m = d.getMinutes().toString().padStart(2,'0');
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} ${h}:${m}`;
}
