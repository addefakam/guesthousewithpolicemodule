with open('/home/z/my-project/src/components/ghms/pages/daytime-page.tsx') as f:
    for i, line in enumerate(f.readlines(), 1):
        if 'Active' in line and 'Inactive' in line and i > 500:
            print(f'{i}: {line.rstrip()}')
            break
