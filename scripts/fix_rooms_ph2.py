import re

FILE = '/home/z/my-project/src/components/ghms/pages/rooms-page.tsx'
with open(FILE, 'r') as f:
    c = f.read()

pattern = 'placeholder=t('
old_count = c.count(pattern)
print(f'Found {old_count} occurrences')
c = c.replace(pattern, 'placeholder={t(')
print(f'Fixed {old_count - c.count(pattern)} occurrences')

with open(FILE, 'w') as f:
    f.write(c)
print('Done')
