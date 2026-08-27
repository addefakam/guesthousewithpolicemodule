with open('/home/z/my-project/src/components/ghms/pages/daytime-page.tsx') as f:
    c = f.read()
    o = c.count('{') - c.count('}')
    print(f'Net brace diff: {o}')
    if o != 0:
        print('Brace mismatch!')
    else:
        print('Braces balanced')