import re

FILE = "/home/z/my-project/src/components/ghms/pages/daytime-page.tsx"
with open(FILE, "r") as f:
    c = f.read()

# Fix {t("key")} to {t("key")}
c = c.replace('{t("pageTitle")}', '{t("pageTitle")}')
c = c.replace('{t("tabServices")}', '{t("tabServices")}')
c = c.replace('{t("tabBookings")}', '{t("tabBookings")}')

# Fix plain text t("pageSubtitle") to {t("pageSubtitle")}
c = c.replace('            t("pageSubtitle")\n', '            {t("pageSubtitle")}\n')

with open(FILE, "w") as f:
    f.write(c)
print("Fixed")
