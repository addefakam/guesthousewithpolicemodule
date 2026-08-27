with open('/home/z/my-project/src/components/ghms/pages/daytime-page.tsx') as f:
    c = f.read()
old = c.count('})}')
c = c.replace(')}', ')}')
new = c.count(')}')
print(f'Replaced {old - new} occurrences')
with open('/home/z/my-project/src/components/ghms/pages/daytime-page.tsx', 'w') as f:
    f.write(c)