import re

FILE = "/home/z/my-project/src/components/ghms/pages/daytime-page.tsx"
with open(FILE, "r") as f:
    c = f.read()

# Fix placeholder={t("key")  to  placeholder={t("key")}
c = re.sub(r'placeholder=\{t("([^"]+)")\s', r'placeholder={t("\1")} ', c)

with open(FILE, "w") as f:
    f.write(c)
print("Fixed placeholders")
