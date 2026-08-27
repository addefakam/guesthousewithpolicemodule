with open('/home/z/my-project/src/components/ghms/pages/rooms-page.tsx', 'rb') as f:
    data = f.read()
    lines = data.split(b'\n')
    line = lines[712]
    print('Length:', len(line))
    print(repr(line[:100]))
    for i in range(max(0, 10), min(len(line), 15)):
        b = line[i:i+1]
        print(f'pos {i}: {b.hex()}')