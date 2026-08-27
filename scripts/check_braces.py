with open('/home/z/my-project/src/components/ghms/pages/rooms-page.tsx') as f:
    lines = f.readlines()
    for i in range(700, 720):
        o = lines[i].count('{') - lines[i].count('}')
        if o != 0:
            print(f'{i+1}: o={o} {lines[i].rstrip()}')
