import re

FILE = '/home/z/my-project/src/components/ghms/pages/rooms-page.tsx'
with open(FILE, 'r') as f:
    c = f.read()

old_count = c.count('placeholder=t(')
print('Found', old_count, 'occurrences')

def fix_match(m):
    inner = m.group(1)
    result = 'placeholder={' + 't("' + inner + '")' + '}'
    return result

c = re.sub(r'placeholder=t\("([^"]+)"\)', fix_match, c)
print('Fixed', old_count - c.count('placeholder=t("))'), 'occurrences')

with open(FILE, 'w') as f:
    f.write(c)
print('Done')
