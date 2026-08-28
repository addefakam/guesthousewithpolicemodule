import re

with open('/home/z/my-project/src/components/ghms/pages/guest-communication-page.tsx', 'r') as f:
    content = f.read()

# 1. Change useTranslation() to useTranslation("messages")
content = content.replace('const { t } = useTranslation();', 'const { t } = useTranslation("messages");')

# 2. Replace TYPE_LABELS with a comment (will be moved inside component)
content = content.replace(
    'const TYPE_LABELS: Record<string, string> = {\n  CHECKIN_REMINDER: "Check-in Reminder",\n  WELCOME: "Welcome",\n  CHECKOUT_REMINDER: "Checkout Reminder",\n  CONFIRMATION: "Confirmation",\n  CUSTOM: "Custom",\n};',
    '// TYPE_LABELS moved inside component for t() access'
)

# Now do all the replacements
replacements = [
    # --- Toasts ---
    ('"Failed to load message templates"', 't("toastFailedLoadTemplates")'),
    ('"Failed to load message history"', 't("toastFailedLoadHistory")'),
    ('"Template name and body are required"', 't("toastNameBodyRequired")'),
    ('"Template updated"', 't("toastTemplateUpdated")'),
    ('"Template created"', 't("toastTemplateCreated")'),
    ('"Failed to save template"', 't("toastFailedSaveTemplate")'),
    ('"Template deleted"', 't("toastTemplateDeleted")'),
    ('"Failed to delete template"', 't("toastFailedDeleteTemplate")'),
    ('"Template activated"', 't("toastTemplateActivated")'),
    ('"Template deactivated"', 't("toastTemplateDeactivated")'),
    ('"Failed to toggle template"', 't("toastFailedToggle")'),
    ('"Recipient phone number is required"', 't("toastRecipientRequired")'),
    ('"Message body is required"', 't("toastMessageRequired")'),
    ('"Message sent successfully"', 't("toastMessageSent")'),
    ('"Failed to send message"', 't("toastFailedSend")'),
    ('"Please select a template"', 't("toastSelectTemplate")'),
    ('"Bulk send failed"', 't("toastBulkFailed")'),
    # --- Page header ---
    ('Guest Communication\n          </h1>', '          {t("pageTitle")}\n          </h1>'),
    ('Send SMS/WhatsApp messages to guests\n          </p>', '          {t("pageSubtitle")}\n          </p>'),
    ('            New Template\n          </Button>', '            {t("btnNewTemplate")}\n          </Button>'),
    # --- Tab labels ---
    ('Templates ({templates.length})', '{t("tabTemplates")} ({templates.length})'),
    ('Send Message\n          </TabsTrigger>', '{t("tabSendMessage")}\n          </TabsTrigger>'),
    ('Message History\n          </TabsTrigger>', '{t("tabHistory")}\n          </TabsTrigger>'),
    # --- Empty states ---
    ('No message templates\n              </p>', '{t("emptyTitle")}\n              </p>'),
    ('Create your first template to get started\n              </p>', '{t("emptySubtitle")}\n              </p>'),
    ('<Plus className="h-4 w-4" /> New Template\n              </Button>', '<Plus className="h-4 w-4" /> {t("btnNewTemplate")}\n              </Button>'),
    # --- Template card ---
    ('Default\n                              </Badge>', '{t("badgeDefault")}\n                              </Badge>'),
    ('{tpl.isActive ? "Active" : "Inactive"}', '{tpl.isActive ? t("toggleActive") : t("toggleInactive")}'),
    # --- Single Message ---
    ('Single Message\n                </CardTitle>', '{t("singleTitle")}\n                </CardTitle>'),
    ('Recipient Phone <span className="text-rose-500">*</span>', '{t("lblRecipientPhone")} <span className="text-rose-500">*</span>'),
    # --- Anti-pattern replacements ---
    ("t('lblchannel', 'Channel')", 't("lblChannel")'),
    ("t('lbltemplateOptional', 'Template (Optional)')", 't("lblTemplateOptional")'),
    ("t('lbltargetGuests', 'Target Guests')", 't("lblTargetGuests")'),
    ("t('lblstatus', 'Status:')", 't("lblStatus")'),
    ("t('lblstatus', 'Status')", 't("lblStatus")'),
    ("t('lblchannel', 'Channel:')", 't("lblChannel")'),
    ("t('lbltype', 'Type')", 't("lblType")'),
    # --- Select items (channel) ---
    ('<SelectItem value="SMS">SMS</SelectItem>', '<SelectItem value="SMS">{t("channelSMS")}</SelectItem>'),
    ('<SelectItem value="WHATSAPP">WhatsApp</SelectItem>', '<SelectItem value="WHATSAPP">{t("channelWHATSAPP")}</SelectItem>'),
    # --- Placeholders ---
    ('placeholder="Select a template..."', 'placeholder={t("placeholderSelectTemplate")}'),
    ('placeholder="Type your message here..."', 'placeholder={t("placeholderMessage")}'),
    # --- Labels ---
    ('Message <span className="text-rose-500">*</span>', '{t("lblMessage")} <span className="text-rose-500">*</span>'),
    ('Template <span className="text-rose-500">*</span>', '{t("lblTemplate")} <span className="text-rose-500">*</span>'),
    # --- Template preview info ---
    ('Preview from template \u201c{selectedTemplateForSingle.name}\n                      \u201d. You can edit before sending.', 't("templatePreviewInfo", { name: selectedTemplateForSingle.name })'),
    # --- Button labels ---
    ('{sendingSingle ? "Sending..." : "Send Message"}', '{sendingSingle ? t("btnSending") : t("btnSendMessage")}'),
    # --- Bulk Send ---
    ('Bulk Send\n                </CardTitle>', '{t("bulkTitle")}\n                </CardTitle>'),
    # --- Bulk target guests select ---
    ('<SelectItem value="UPCOMING">Upcoming</SelectItem>', '<SelectItem value="UPCOMING">{t("targetUPCOMING")}</SelectItem>'),
    ('<SelectItem value="ACTIVE">Active</SelectItem>', '<SelectItem value="ACTIVE">{t("targetACTIVE")}</SelectItem>'),
    ('<SelectItem value="COMPLETED">Completed</SelectItem>', '<SelectItem value="COMPLETED">{t("targetCOMPLETED")}</SelectItem>'),
    # --- Template Preview label ---
    ('Template Preview\n                    </p>', '{t("templatePreview")}\n                    </p>'),
    # --- Filter select items ---
    ('<SelectItem value="ALL">All</SelectItem>', '<SelectItem value="ALL">{t("statusALL")}</SelectItem>'),
    ('<SelectItem value="SENT">Sent</SelectItem>', '<SelectItem value="SENT">{t("statusSENT")}</SelectItem>'),
    ('<SelectItem value="DELIVERED">Delivered</SelectItem>', '<SelectItem value="DELIVERED">{t("statusDELIVERED")}</SelectItem>'),
    ('<SelectItem value="PENDING">Pending</SelectItem>', '<SelectItem value="PENDING">{t("statusPENDING")}</SelectItem>'),
    ('<SelectItem value="FAILED">Failed</SelectItem>', '<SelectItem value="FAILED">{t("statusFAILED")}</SelectItem>'),
    # --- Message count plural ---
    ('{logsTotal} message{logsTotal !== 1 ? "s" : ""}', 't(logsTotal === 1 ? "messagesCount_one" : "messagesCount_other", { count: logsTotal })'),
    # --- History empty ---
    ('No messages found\n                </p>', '{t("historyEmptyTitle")}\n                </p>'),
    ('Messages you send will appear here\n                </p>', '{t("historyEmptySubtitle")}\n                </p>'),
    # --- Table headers (anti-pattern) ---
    ("t('thdate', 'Date')", 't("thDate")'),
    ("t('threcipient', 'Recipient')", 't("thRecipient")'),
    ("t('thchannel', 'Channel')", 't("thChannel")'),
    ("t('thtemplate', 'Template')", 't("thTemplate")'),
    ("t('thstatus', 'Status')", 't("thStatus")'),
    ("t('thmessage', 'Message')", 't("thMessage")'),
    # --- Pagination ---
    ('Previous\n                    </Button>', '{t("btnPrevious")}\n                    </Button>'),
    ('Page {logsPage} of {logsTotalPages}', '{t("pageOf", { page: logsPage, total: logsTotalPages })}'),
    ('Next\n                    </Button>', '{t("btnNext")}\n                    </Button>'),
    # --- Template dialog ---
    ('{editingTpl ? "Edit Template" : "New Template"}', '{editingTpl ? t("dlgEditTitle") : t("dlgNewTitle")}'),
    ('"Update the message template details."', 't("dlgEditDesc")'),
    ('"Create a new message template for guest communications."', 't("dlgNewDesc")'),
    ('Name <span className="text-rose-500">*</span>', '{t("lblName")} <span className="text-rose-500">*</span>'),
    ('placeholder="e.g. Check-in Reminder"', 'placeholder={t("placeholderTemplateName")}'),
    ('Body <span className="text-rose-500">*</span>', '{t("lblBody")} <span className="text-rose-500">*</span>'),
    ('placeholder="Write your message template..."', 'placeholder={t("placeholderBody")}'),
    ('Available Placeholders\n                </p>', '{t("availablePlaceholders")}\n                </p>'),
    ('Cancel\n            </Button>', '{t("btnCancel")}\n            </Button>'),
    # --- Template dialog buttons ---
    ('{tplSaving\n                ? "Saving..."\n                : editingTpl\n                  ? "Update Template"\n                  : "Create Template"}', '{tplSaving ? t("btnSaving") : editingTpl ? t("btnUpdateTemplate") : t("btnCreateTemplate")}'),
    # --- Delete dialog ---
    ('Delete \u0026quot;{tplDeleteTarget?.name}\u0026quot;?', 't("dlgDeleteTitle", { name: tplDeleteTarget?.name || "" })'),
    ('This will permanently delete this template. This action cannot be\n              undone.', 't("dlgDeleteDesc")'),
    ('<AlertDialogCancel>Cancel</AlertDialogCancel>', '<AlertDialogCancel>{t("btnCancel")}</AlertDialogCancel>'),
    ('{tplDeleting ? "Deleting..." : "Delete"}', '{tplDeleting ? t("btnDeleting") : t("btnDelete")}'),
    # --- Bulk confirm dialog ---
    ('Confirm Bulk Send\n            </AlertDialogTitle>', '{t("dlgBulkTitle")}\n            </AlertDialogTitle>'),
    ('sendingBulk ? "Sending..." : "Confirm Send"', 'sendingBulk ? t("btnSending") : t("btnConfirmSend")'),
]

for old, new in replacements:
    if old in content:
        content = content.replace(old, new)
    else:
        print(f"MISSED: {old[:60]}")

# Now handle the more complex cases

# Bulk send button: Send to All ... Guests
old_bulk_btn = 'Send to All {bulkForm.status === "UPCOMING" ? "Upcoming" : bulkForm.status === "ACTIVE" ? "Active" : "Completed"} Guests'
new_bulk_btn = 't("btnSendToAll", { status: t("target" + bulkForm.status) })'
if old_bulk_btn in content:
    content = content.replace(old_bulk_btn, new_bulk_btn)
else:
    print("MISSED: bulk send button")

# Bulk confirm description
old_bulk_desc = '''This will send the selected template to all{" "}
              {bulkForm.status === "UPCOMING"
                ? "upcoming"
                : bulkForm.status === "ACTIVE"
                  ? "active"
                  : "completed"}{" "}
              guests via {bulkForm.channel}. Are you sure?'''
new_bulk_desc = 't("dlgBulkDesc", { status: t("target" + bulkForm.status), channel: t("channel" + bulkForm.channel) })'
if old_bulk_desc in content:
    content = content.replace(old_bulk_desc, new_bulk_desc)
else:
    print("MISSED: bulk confirm desc")

# Toast with interpolation: `${sent} messages sent, ${failed} failed`
old_toast = '`${sent} messages sent, ${failed} failed`'
new_toast = 't("toastBulkResult", { sent, failed })'
if old_toast in content:
    content = content.replace(old_toast, new_toast)
else:
    print("MISSED: bulk result toast")

# Template type select items
old_type_items = '''<SelectItem value="CHECKIN_REMINDER">
                      Check-in Reminder
                    </SelectItem>
                    <SelectItem value="WELCOME">Welcome</SelectItem>
                    <SelectItem value="CHECKOUT_REMINDER">
                      Checkout Reminder
                    </SelectItem>
                    <SelectItem value="CONFIRMATION">
                      Confirmation
                    </SelectItem>
                    <SelectItem value="CUSTOM">Custom</SelectItem>'''
new_type_items = '''<SelectItem value="CHECKIN_REMINDER">{t("typeCHECKIN_REMINDER")}</SelectItem>
                    <SelectItem value="WELCOME">{t("typeWELCOME")}</SelectItem>
                    <SelectItem value="CHECKOUT_REMINDER">{t("typeCHECKOUT_REMINDER")}</SelectItem>
                    <SelectItem value="CONFIRMATION">{t("typeCONFIRMATION")}</SelectItem>
                    <SelectItem value="CUSTOM">{t("typeCUSTOM")}</SelectItem>'''
if old_type_items in content:
    content = content.replace(old_type_items, new_type_items)
else:
    print("MISSED: template type select items")

# Channel display in template cards and selects: ({x.channel})
# The pattern `{x.name} ({x.channel})` needs the channel translated
content = content.replace('{x.name} ({x.channel})', '{x.name} ({CHANNEL_LABELS[x.channel] || x.channel})')

# Raw {log.channel} in badges (desktop)
content = content.replace('{log.channel}\n                            </Badge>', '{CHANNEL_LABELS[log.channel] || log.channel}\n                            </Badge>')

# Raw {log.channel} in badges (mobile)
content = content.replace('{log.channel}\n                            </Badge>\n                            {log.template', '{CHANNEL_LABELS[log.channel] || log.channel}\n                            </Badge>\n                            {log.template')

# Raw {log.status} in badges (desktop)
content = content.replace('{log.status}\n                          </Badge>\n                        </TableCell>\n                        <TableCell className="text-sm text-muted-foreground max-w', '{STATUS_LABELS[log.status] || log.status}\n                          </Badge>\n                        </TableCell>\n                        <TableCell className="text-sm text-muted-foreground max-w')

# Raw {log.status} in badges (mobile) - need more specific match
# Mobile: {log.status}
#           </Badge>
#         </div>
#         <p
old_mobile_status = '''{log.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">'''
new_mobile_status = '''{STATUS_LABELS[log.status] || log.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">'''
if old_mobile_status in content:
    content = content.replace(old_mobile_status, new_mobile_status)
else:
    print("MISSED: mobile status badge")

# TYPE_LABELS[tpl.type] reference in template card
content = content.replace('{TYPE_LABELS[tpl.type] ?? tpl.type}', '{TYPE_LABELS[tpl.type] || tpl.type}')

# Raw {tpl.channel} in template card badge
content = content.replace('{tpl.channel}\n                            </Badge>\n                            {tpl.isDefault', '{CHANNEL_LABELS[tpl.channel] || tpl.channel}\n                            </Badge>\n                            {tpl.isDefault')

# Add lookup maps and TYPE_LABELS inside the component, after useTranslation line
old_hook = 'const { t } = useTranslation("messages");\n  const { refreshKey } = useAppStore();'
new_hook = '''const { t } = useTranslation("messages");
  const { refreshKey } = useAppStore();

  const TYPE_LABELS: Record<string, string> = {
    CHECKIN_REMINDER: t("typeCHECKIN_REMINDER"),
    WELCOME: t("typeWELCOME"),
    CHECKOUT_REMINDER: t("typeCHECKOUT_REMINDER"),
    CONFIRMATION: t("typeCONFIRMATION"),
    CUSTOM: t("typeCUSTOM"),
  };
  const CHANNEL_LABELS: Record<string, string> = {
    SMS: t("channelSMS"),
    WHATSAPP: t("channelWHATSAPP"),
  };
  const STATUS_LABELS: Record<string, string> = {
    SENT: t("statusSENT"),
    DELIVERED: t("statusDELIVERED"),
    PENDING: t("statusPENDING"),
    FAILED: t("statusFAILED"),
  };'''
if old_hook in content:
    content = content.replace(old_hook, new_hook)
else:
    print("MISSED: hook insertion point")

with open('/home/z/my-project/src/components/ghms/pages/guest-communication-page.tsx', 'w') as f:
    f.write(content)

print("\nDone!")
