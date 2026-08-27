FILE = '/home/z/my-project/src/components/ghms/pages/daytime-page.tsx'
with open(FILE, 'rb') as f:
    data = f.read()

o = data.count(b'{') - data.count(b'}')
print('Brace balance:', o)

# Find })
brace_paren = b'})'
bp_positions = []
start = 0
while True:
    idx = data.find(brace_paren, start)
    if idx == -1:
        break
    bp_positions.append(idx)
    start = idx + 1

print('Found', len(bp_positions), 'occurrences of }\n')
for pos in bp_positions[:30]:
    s = max(0, pos-25)
    e = min(len(data), pos+15)
    context = data[s:e].decode('utf-8', errors='replace')
    print(f'  pos {pos}: {repr(context)}')
