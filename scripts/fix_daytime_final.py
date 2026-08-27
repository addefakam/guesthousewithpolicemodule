FILE = '/home/z/my-project/src/components/ghms/pages/daytime-page.tsx'
with open(FILE, 'r') as f:
    c = f.read()

import re
pattern = r'\x22\)\x7d\x7d'
matches = list(re.finditer(pattern, c))
print(f'Found {len(matches)} occurrences')
for m in matches:
    start = max(0, m.start()-20)
    end = min(len(c), m.end()+5)
    print(f'  pos {m.start()}: {repr(c[start:end])}')

# Fix: replace all chr(34)+chr(41)+chr(125)+chr(125) with chr(34)+chr(41)+chr(125)
old = chr(34) + chr(41) + chr(125) + chr(125)
new = chr(34) + chr(41) + chr(125)
c_fixed = c.replace(old, new)

o = c_fixed.count('{') - c_fixed.count('}')
print(f'Net brace diff: {o}')

with open(FILE, 'w') as f:
    f.write(c_fixed)
print('Done')
