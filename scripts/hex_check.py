import bin

FILE = '/home/z/my-project/src/components/ghms/pages/rooms-page.tsx'
with open(FILE, 'rb') as f:
    data = f.read()

idx = data.find(b'placeholder=')
while idx >= 0:
    end = min(len(data), idx+60)
    hex_part = data[idx:end].hex()
    print(f'pos {idx}: {hex_part} | {data[idx:end].decode("utf-8", errors="replace")}')
    idx = data.find(b'placeholder=', idx+1)
