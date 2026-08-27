FILE = '/home/z/my-project/src/components/ghms/pages/rooms-page.tsx'
with open(FILE, 'r') as f:
    c = f.read()

import re
# Fix placeholder=t("...") to placeholder={t("...")}
c = re.sub(r'placeholder=t("([^"]+)")', r'placeholder={t("\1")}', c)

o = c.count('{') - c.count('}')
print(f'Brace balance: {o}')

with open(FILE, 'w') as f:
    f.write(c)
print('Done')