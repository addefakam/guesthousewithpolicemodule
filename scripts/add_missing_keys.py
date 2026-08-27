import json

translations = {
    'en': {
        'rooms': {
            'filterAll': 'All',
            'srActions': 'Actions',
            'infoFloorLabel': 'Floor {{floor}}',
            'importColumns': 'number · type · pricePerNight · floor · capacity · amenities · description',
            'resStatusLabel': '{{status}}',
            'inDaysShort': 'in {{days}}d',
            'perNightShort': '/night',
        },
        'daytime': {
            'lblcategory': 'Category',
            'lblduration': 'Duration',
            'lbldescription': 'Description',
            'lblphone': 'Phone',
            'lblquantity': 'Quantity',
            'lblpaymentMethod': 'Payment Method',
            'catTour': 'Tour',
            'catTransport': 'Transport',
            'catGym': 'Gym',
            'catPool': 'Pool',
            'catEvent': 'Event',
            'paymentStatusPaid': 'Paid',
            'paymentStatusPartial': 'Partial',
            'paymentStatusPending': 'Pending',
            'dashFallback': '—',
            'priceMultiply': '({{price}} × {{qty}})',
        },
    },
    'am': {
        'rooms': {
            'filterAll': 'ሁሉም',
            'srActions': 'ተግባራት',
            'infoFloorLabel': 'ፎት {{floor}}',
            'importColumns': 'number · type · pricePerNight · floor · capacity · amenities · description',
            'resStatusLabel': '{{status}}',
            'inDaysShort': 'በ{{days}} ቀናት ውስጥ',
            'perNightShort': '/ሌሊት',
        },
        'daytime': {
            'lblcategory': 'ምድብ',
            'lblduration': 'ርዝመት',
            'lbldescription': 'መግለጫ',
            'lblphone': 'ስልክ',
            'lblquantity': 'ብዛት',
            'lblpaymentMethod': 'የክፍያ ዘዴ',
            'catTour': 'ጉዞ',
            'catTransport': 'ትራንስፖርት',
            'catGym': 'ጂም',
            'catPool': 'ፖል',
            'catEvent': 'ዝግጅት',
            'paymentStatusPaid': 'ተከፍሏል',
            'paymentStatusPartial': 'ከፊል',
            'paymentStatusPending': 'በመጠባበቅ ላይ',
            'dashFallback': '—',
            'priceMultiply': '({{price}} × {{qty}})',
        },
    },
    'om': {
        'rooms': {
            'filterAll': 'Hunda',
            'srActions': 'Gosaalee',
            'infoFloorLabel': 'Dabarfama {{floor}}',
            'importColumns': 'number · type · pricePerNight · floor · capacity · amenities · description',
            'resStatusLabel': '{{status}}',
            'inDaysShort': 'guyyaa {{days}} keessatti',
            'perNightShort': '/halkan',
        },
        'daytime': {
            'lblcategory': 'Gosa',
            'lblduration': 'Yero',
            'lbldescription': 'Ibsa',
            'lblphone': 'Bilbila',
            'lblquantity': 'Lakkoofsa',
            'lblpaymentMethod': 'Tarkaanfii kabajaa',
            'catTour': 'Daawwii',
            'catTransport': 'Biraawsi',
            'catGym': 'Jiim',
            'catPool': 'Piilaa',
            'catEvent': 'Haala',
            'paymentStatusPaid': 'Kabajame',
            'paymentStatusPartial': 'Qeenxee',
            'paymentStatusPending': 'Eegaa jira',
            'dashFallback': '—',
            'priceMultiply': '({{price}} × {{qty}})',
        },
    },
}

for lang in ['en', 'am', 'om']:
    file = f'src/i18n/locales/{lang}.json'
    with open(file) as f:
        data = json.load(f)
    
    for ns in ['rooms', 'daytime']:
        if ns not in data:
            data[ns] = {}
        for k, v in translations[lang][ns].items():
            data[ns][k] = v
    
    with open(file, 'w') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f'{lang}: updated')
