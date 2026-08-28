import re

with open('/home/z/my-project/src/components/ghms/pages/staff-logs-page.tsx', 'r') as f:
    content = f.read()

# 1. Replace ACTION_OPTIONS labels with value-only
old_actions = '''const ACTION_OPTIONS = [
  { value: "ALL", label: "All" },
  { value: "CHECKIN", label: "Check In" },
  { value: "CHECKOUT", label: "Check Out" },
  { value: "CREATE_RESERVATION", label: "Create Reservation" },
  { value: "UPDATE_RESERVATION", label: "Update Reservation" },
  { value: "CANCEL_RESERVATION", label: "Cancel Reservation" },
  { value: "CREATE_PAYMENT", label: "Create Payment" },
  { value: "CREATE_GROUP_BOOKING", label: "Create Group Booking" },
  { value: "UPDATE_GROUP_BOOKING", label: "Update Group Booking" },
  { value: "DELETE_GROUP_BOOKING", label: "Delete Group Booking" },
  { value: "CREATE_MESSAGE_TEMPLATE", label: "Create Message Template" },
  { value: "SEND_MESSAGE", label: "Send Message" },
  { value: "BULK_SEND_MESSAGES", label: "Bulk Send Messages" },
  { value: "UPDATE_ROOM", label: "Update Room" },
];'''
new_actions = 'const ACTION_VALUES = ["ALL", "CHECKIN", "CHECKOUT", "CREATE_RESERVATION", "UPDATE_RESERVATION", "CANCEL_RESERVATION", "CREATE_PAYMENT", "CREATE_GROUP_BOOKING", "UPDATE_GROUP_BOOKING", "DELETE_GROUP_BOOKING", "CREATE_MESSAGE_TEMPLATE", "SEND_MESSAGE", "BULK_SEND_MESSAGES", "UPDATE_ROOM"] as const;'
if old_actions in content:
    content = content.replace(old_actions, new_actions)
else:
    print("MISSED: ACTION_OPTIONS")

# 2. Replace TARGET_TYPE_OPTIONS
old_targets = '''const TARGET_TYPE_OPTIONS = [
  { value: "ALL", label: "All" },
  { value: "RESERVATION", label: "Reservation" },
  { value: "GUEST", label: "Guest" },
  { value: "ROOM", label: "Room" },
  { value: "PAYMENT", label: "Payment" },
  { value: "EXPENSE", label: "Expense" },
  { value: "GROUP_BOOKING", label: "Group Booking" },
  { value: "MESSAGE_TEMPLATE", label: "Message Template" },
  { value: "MESSAGE_LOG", label: "Message Log" },
];'''
new_targets = 'const TARGET_VALUES = ["ALL", "RESERVATION", "GUEST", "ROOM", "PAYMENT", "EXPENSE", "GROUP_BOOKING", "MESSAGE_TEMPLATE", "MESSAGE_LOG"] as const;'
if old_targets in content:
    content = content.replace(old_targets, new_targets)
else:
    print("MISSED: TARGET_TYPE_OPTIONS")

# 3. Remove getActionLabel function (will use lookup in component)
old_fn = '''function getActionLabel(action: string): string {
  const match = ACTION_OPTIONS.find((o) => o.value === action.toUpperCase());
  return match ? match.label : action;
}'''
if old_fn in content:
    content = content.replace(old_fn, '// getActionLabel replaced by ACTION_LABELS lookup in component')
else:
    print("MISSED: getActionLabel")

# 4. Switch namespace and add lookup maps
old_hook = 'const { t } = useTranslation();'
new_hook = '''const { t } = useTranslation("staffLogs");

  const ACTION_LABELS: Record<string, string> = {
    ALL: t("actionALL"),
    CHECKIN: t("actionCHECKIN"),
    CHECKOUT: t("actionCHECKOUT"),
    CREATE_RESERVATION: t("actionCREATE_RESERVATION"),
    UPDATE_RESERVATION: t("actionUPDATE_RESERVATION"),
    CANCEL_RESERVATION: t("actionCANCEL_RESERVATION"),
    CREATE_PAYMENT: t("actionCREATE_PAYMENT"),
    CREATE_GROUP_BOOKING: t("actionCREATE_GROUP_BOOKING"),
    UPDATE_GROUP_BOOKING: t("actionUPDATE_GROUP_BOOKING"),
    DELETE_GROUP_BOOKING: t("actionDELETE_GROUP_BOOKING"),
    CREATE_MESSAGE_TEMPLATE: t("actionCREATE_MESSAGE_TEMPLATE"),
    SEND_MESSAGE: t("actionSEND_MESSAGE"),
    BULK_SEND_MESSAGES: t("actionBULK_SEND_MESSAGES"),
    UPDATE_ROOM: t("actionUPDATE_ROOM"),
  };
  const TARGET_LABELS: Record<string, string> = {
    ALL: t("targetALL"),
    RESERVATION: t("targetRESERVATION"),
    GUEST: t("targetGUEST"),
    ROOM: t("targetROOM"),
    PAYMENT: t("targetPAYMENT"),
    EXPENSE: t("targetEXPENSE"),
    GROUP_BOOKING: t("targetGROUP_BOOKING"),
    MESSAGE_TEMPLATE: t("targetMESSAGE_TEMPLATE"),
    MESSAGE_LOG: t("targetMESSAGE_LOG"),
  };'''
if old_hook in content:
    content = content.replace(old_hook, new_hook)
else:
    print("MISSED: hook")

# Now do all string replacements
replacements = [
    # Toast
    ('"Failed to load staff logs"', 't("toastFailedLoad")'),
    # Page header
    ('Staff Activity Log\n        </h1>', '{t("pageTitle")}\n        </h1>'),
    ('Track all staff actions and changes\n        </p>', '{t("pageSubtitle")}\n        </p>'),
    # Filter label
    ('<span className="text-sm font-medium text-gray-700">Filters</span>', '<span className="text-sm font-medium text-gray-700">{t("lblFilters")}</span>'),
    # Anti-patterns
    ("t('lblaction', 'Action')", 't("lblAction")'),
    ("t('lbltargetType', 'Target Type')", 't("lblTargetType")'),
    ("t('lbldateFrom', 'Date From')", 't("lblDateFrom")'),
    ("t('lbldateTo', 'Date To')", 't("lblDateTo")'),
    ("t('thdateTime', 'Date / Time')", 't("thDateTime")'),
    ("t('thstaffName', 'Staff Name')", 't("thStaffName")'),
    ("t('thaction', 'Action')", 't("thAction")'),
    ("t('thtargetType', 'Target Type')", 't("thTargetType")'),
    ("t('thdetails', 'Details')", 't("thDetailsCol")'),
    ("t('thipAddress', 'IP Address')", 't("thIpAddressCol")'),
    # Placeholders
    ('placeholder="All actions"', 'placeholder={t("placeholderAllActions")}'),
    ('placeholder="All types"', 'placeholder={t("placeholderAllTypes")}'),
    # Buttons
    ('Search\n            </Button>', '{t("btnSearch")}\n            </Button>'),
    ('Clear\n            </Button>', '{t("btnClear")}\n            </Button>'),
    # Loading & results
    ('"Loading..."', 't("loading")'),
    # Pagination buttons
    ('Previous\n          </Button>', '{t("btnPrevious")}\n          </Button>'),
    ('Next\n          </Button>', '{t("btnNext")}\n          </Button>'),
    # Mobile card labels
    ('<span className="text-xs text-gray-500">Target Type</span>', '<span className="text-xs text-gray-500">{t("lblTargetTypeMobile")}</span>'),
    ('<span className="text-xs text-gray-500">IP Address</span>', '<span className="text-xs text-gray-500">{t("lblIpAddress")}</span>'),
    ('<span className="text-xs text-gray-500">Details</span>', '<span className="text-xs text-gray-500">{t("lblDetails")}</span>'),
    # Empty state
    ('No activity logs found\n            </h3>', '{t("emptyTitle")}\n            </h3>'),
    ('No staff activity logs match your current filters. Try adjusting\n              your search criteria or date range.\n            </p>', '{t("emptySubtitle")}\n            </p>'),
]

for old, new in replacements:
    if old in content:
        content = content.replace(old, new)
    else:
        print(f"MISSED: {old[:60]}")

# Show more/less (appears twice - mobile and desktop)
content = content.replace('Show less\n                              </>', '{t("btnShowLess")}\n                              </>')
content = content.replace('Show more\n                              </>', '{t("btnShowMore")}\n                              </>')
# Desktop show more/less (different indentation)
content = content.replace('Show less\n                                    </>', '{t("btnShowLess")}\n                                    </>')
content = content.replace('Show more\n                                    </>', '{t("btnShowMore")}\n                                    </>')

# Action filter select: {ACTION_OPTIONS.map((opt) => ...}
old_action_select = '''{ACTION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}'''
new_action_select = '''{ACTION_VALUES.map((val) => (
                    <SelectItem key={val} value={val}>
                      {ACTION_LABELS[val] || val}
                    </SelectItem>
                  ))}'''
if old_action_select in content:
    content = content.replace(old_action_select, new_action_select)
else:
    print("MISSED: action select")

# Target type filter select
old_target_select = '''{TARGET_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}'''
new_target_select = '''{TARGET_VALUES.map((val) => (
                    <SelectItem key={val} value={val}>
                      {TARGET_LABELS[val] || val}
                    </SelectItem>
                  ))}'''
if old_target_select in content:
    content = content.replace(old_target_select, new_target_select)
else:
    print("MISSED: target select")

# Action badges: {getActionLabel(log.action)} -> {ACTION_LABELS[log.action.toUpperCase()] || log.action}
content = content.replace('{getActionLabel(log.action)}', '{ACTION_LABELS[log.action.toUpperCase()] || log.action}')

# Target type display: log.targetType?.replace(/_/g, " ") -> TARGET_LABELS lookup
# Mobile
content = content.replace(
    '{log.targetType?.replace(/_/g, " ") || "\u2014"}',
    '{TARGET_LABELS[log.targetType] || log.targetType?.replace(/_/g, " ") || "\u2014"}'
)
# Desktop
content = content.replace(
    '{log.targetType?.replace(/_/g, " ")}',
    '{TARGET_LABELS[log.targetType] || log.targetType?.replace(/_/g, " ")}'
)

# Results summary with plural
old_results = '''{loading
            ? "Loading..."
            : `${total} log entr${total === 1 ? "y" : "ies"} found`}'''
new_results = '{loading ? t("loading") : t(total === 1 ? "logEntriesCount_one" : "logEntriesCount_other", { count: total })}'
if old_results in content:
    content = content.replace(old_results, new_results)
else:
    print("MISSED: results summary")

# Page info
old_page_info = 'Page {page} of {totalPages}'
new_page_info = '{t("pageOf", { page, total: totalPages })}'
if old_page_info in content:
    content = content.replace(old_page_info, new_page_info)
else:
    print("MISSED: page info")

with open('/home/z/my-project/src/components/ghms/pages/staff-logs-page.tsx', 'w') as f:
    f.write(content)

print("\nDone!")
