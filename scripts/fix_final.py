FILE = '/home/z/my-project/src/components/ghms/pages/daytime-page.tsx'
with open(FILE, 'r') as f:
    c = f.read()

# The sed s|)}|})|g turned t("key")} into t("key")}
# which is: quote, close-paren, close-brace, close-brace
# Fix: remove the extra close-brace

# Find pattern: "})}
# Replace with: "})

old = '")}'
new = '")'
c_fixed = c.replace(old, new)

# Also fix: '}) (without quote, like }) 
# These would be from onClick={...})  where sed turned }) into })}
# Actually this is getting complex. Let me count occurrences

print('Replaced', c.count(old), '->', c_fixed.count(old), '(still present)')
o = c_fixed.count('{') - c_fixed.count('}')
print('Net brace diff:', o)

with open(FILE, 'w') as f:
    f.write(c_fixed)
print('Done')
