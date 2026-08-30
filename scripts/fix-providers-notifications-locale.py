#!/usr/bin/env python3
"""Fix providers and notifications locale keys across all 3 locale files."""

import json

LOCALE_DIR = "/home/z/my-project/src/i18n/locales"
FILES = ["en.json", "am.json", "om.json"]

# ── Full providers namespace (English values) ──
PROVIDERS_EN = {
  "cardTotal": "Total",
  "cardApproved": "Approved",
  "cardPending": "Pending",
  "titleGuesthouses": "Guesthouses",
  "titleProviderApplications": "Provider Applications",
  "subtitleGuesthouses": "Manage all registered guesthouses and their statuses",
  "subtitleProviderApplications": "Review and manage guesthouse registration applications",
  "btnRegisterGuesthouse": "Register Guesthouse",
  "btnBulkImport": "Bulk Import",
  "emptyState": "No providers found",
  "btnDetails": "Details",
  "btnApprove": "Approve",
  "btnReject": "Reject",
  "btnSuspend": "Suspend",
  "btnReactivate": "Reactivate",
  "thProviderName": "Provider Name",
  "thAddress": "Address",
  "thOwner": "Owner",
  "thPhone": "Phone",
  "thStatus": "Status",
  "thActions": "Actions",
  "licenseDocument": "License Document",
  "clickToOpenLicense": "Click to open license",
  "providerInformation": "Provider Information",
  "btnViewFullLicense": "View Full License",
  "registered": "Registered",
  "approved": "Approved",
  "approvedBy": "Approved by {{name}}",
  "labelOwner": "Owner",
  "labelPhone": "Phone",
  "labelEmail": "Email",
  "labelAddress": "Address",
  "labelLicenseNo": "License No",
  "labelRegistered": "Registered",
  "labelApproved": "Approved",
  "labelApprovedBy": "Approved by {{name}}",
  "rejectionReason": "Rejection Reason",
  "suspensionReason": "Suspension Reason",
  "byLabel": "By",
  "onLabel": "On",
  "rejectProviderTitle": "Reject Provider",
  "rejectProviderDesc": "Are you sure you want to reject {{name}}? This will deny their registration application.",
  "enterRejectionReason": "Enter the reason for rejection...",
  "btnCancel": "Cancel",
  "confirmRejection": "Confirm Rejection",
  "rejecting": "Rejecting...",
  "approveProviderTitle": "Approve Provider",
  "reactivateProviderTitle": "Reactivate Provider",
  "suspendProviderTitle": "Suspend Provider",
  "confirmApproveDesc": "Are you sure you want to approve {{name}}? They will be able to operate immediately.",
  "confirmReactivateDesc": "Are you sure you want to reactivate {{name}}? Their guesthouse will become active again.",
  "confirmSuspendDesc": "Are you sure you want to suspend {{name}}? Their operations will be paused.",
  "processing": "Processing...",
  "registerNewGuesthouse": "Register New Guesthouse",
  "registerNewGuesthouseDesc": "Create a new guesthouse account. It will be automatically approved.",
  "contactInformation": "Contact Information",
  "fullName": "Full Name",
  "placeholderOwnerName": "Enter owner's full name",
  "placeholderPhone": "+251...",
  "placeholderEmail": "email@example.com",
  "guestHouseDetails": "Guest House Details",
  "guestHouseName": "Guest House Name",
  "placeholderGuestHouseName": "Enter guesthouse name",
  "labelType": "Type",
  "selectType": "Select type",
  "placeholderLicenseNo": "e.g. LIC-2024-001",
  "typeGuestHouse": "Guest House",
  "typeHotel": "Hotel",
  "typeLodge": "Lodge",
  "typeHomestay": "Homestay",
  "typeResort": "Resort",
  "typeDharamshala": "Dharamshala",
  "typeOther": "Other",
  "uploadLicenseDocument": "Upload License Document",
  "clickToUploadLicense": "Click to upload license",
  "fileFormatHint": "PDF, JPG, or PNG (max 5 MB)",
  "licenseUploaded": "License uploaded",
  "fileSizeExceeded": "File size exceeds 5 MB limit",
  "location": "Location",
  "city": "City",
  "subCity": "Sub-City",
  "woreda": "Woreda",
  "selectSubCity": "Select sub-city",
  "selectWoreda": "Select woreda",
  "selectSubCityFirst": "Select sub-city first",
  "loginCredentials": "Login Credentials",
  "username": "Username",
  "password": "Password",
  "placeholderUsername": "Choose a username",
  "placeholderPassword": "Minimum 4 characters",
  "registerAutoApprovedInfo": "The new guesthouse will be automatically approved and the owner will receive login credentials.",
  "btnRegisterAndApprove": "Register & Approve",
  "registering": "Registering...",
  "fillRequiredFields": "Please fill in all required fields",
  "passwordMinLength": "Password must be at least 4 characters",
  "invalidPhone": "Please enter a valid phone number",
  "invalidEmail": "Please enter a valid email address",
  "failedToLoad": "Failed to load providers",
  "failedToRegister": "Failed to register guesthouse",
  "failedToReject": "Failed to reject provider",
  "failedToUpdate": "Failed to update provider status",
  "failedToSuspend": "Failed to suspend provider",
  "rejectionReasonRequired": "Please provide a rejection reason",
  "registeredAndApproved": "{{name}} has been registered and approved",
  "providerRejected": "Provider rejected successfully",
  "providerReactivated": "{{name}} has been reactivated",
  "providerStatusUpdated": "Provider status updated to {{status}}",
  "providerSuspendedNotified": "{{name}} has been suspended and notified",
  "suspendGuesthouseTitle": "Suspend Guesthouse",
  "suspendGuesthouseDesc": "Suspend this guesthouse. A mandatory notification will be sent to the provider. You can optionally add a custom message.",
  "reasonForSuspension": "Reason for Suspension",
  "placeholderSuspensionReason": "Explain why this guesthouse is being suspended...",
  "messageToProvider": "Message to Provider",
  "optional": "optional",
  "placeholderProviderMessage": "Optional message to the provider...",
  "defaultNotificationInfo": "A system notification will be sent automatically with the suspension details.",
  "suspendWarningText": "Warning: Suspending will immediately pause all operations for this guesthouse. Guests will be notified.",
  "suspensionReasonRequired": "Please provide a reason for suspension",
  "suspending": "Suspending...",
  "btnSuspendAndNotify": "Suspend & Notify",
  "bulkImportTitle": "Bulk Import Guesthouses",
  "bulkImportDesc": "Import multiple guesthouses at once using an Excel template.",
  "step1Title": "Download Template",
  "step1Desc": "Download the Excel template and fill in the guesthouse data.",
  "btnDownloadTemplate": "Download Template",
  "templateDownloaded": "Template downloaded",
  "step2Title": "Upload Filled Template",
  "step2Desc": "Upload the completed Excel file with guesthouse data.",
  "clickToSelectExcel": "Click to select Excel file",
  "xlsxFilesOnly": ".xlsx files only",
  "bulkInvalidFile": "Failed to read the file. Please upload a valid .xlsx file.",
  "bulkNoDataRows": "The file has no data rows.",
  "bulkMissingCols": "Missing columns: {{cols}}",
  "bulkRowFieldEmpty": "Row {{row}}: {{field}} is empty",
  "bulkRowInvalidPhone": "Row {{row}}: Invalid phone number \"{{value}}\"",
  "bulkRowInvalidEmail": "Row {{row}}: Invalid email \"{{value}}\"",
  "bulkRowInvalidType": "Row {{row}}: Invalid type \"{{value}}\". Valid: {{valid}}",
  "bulkRowInvalidSubCity": "Row {{row}}: Invalid sub-city \"{{value}}\". Valid: {{valid}}",
  "bulkRowInvalidWoreda": "Row {{row}}: \"{{woreda}}\" is not a valid woreda in {{subCity}}",
  "bulkRowPasswordMinLength": "Row {{row}}: Password must be at least 4 characters",
  "bulkMoreErrors": "...and {{count}} more error(s)",
  "bulkFixErrorsBeforeImport": "Please fix the errors before importing",
  "bulkNoDataToImport": "No data to import",
  "bulkImportSuccess": "Imported {{success}} guesthouse(s) successfully.{{failedPart}}",
  "bulkImportFailed": "{{count}} failed",
  "validationErrors": "Validation Errors",
  "step3Title": "Preview & Import",
  "step3Desc": "Review {{count}} guesthouse(s) before importing.",
  "bulkThFullName": "Full Name",
  "bulkThPhone": "Phone",
  "bulkThGuesthouse": "Guesthouse",
  "bulkAutoApprovedInfo": "All imported guesthouses will be automatically approved.",
  "importingCount": "Importing {{count}}...",
  "btnImportCount": "Import {{count}}",
  "statusPending": "Pending",
  "statusApproved": "Approved",
  "statusRejected": "Rejected",
  "statusSuspended": "Suspended",
}

# ── Missing notifications keys (English values) ──
NOTIFICATIONS_MISSING_EN = {
  "lblsubject": "Subject",
  "lblmessage": "Message",
  "severity_CRITICAL": "CRITICAL",
  "severity_HIGH": "HIGH",
  "severity_MEDIUM": "MEDIUM",
  "severity_LOW": "LOW",
}

# ── Missing policeDashboard key ──
POLICE_DASHBOARD_MISSING_EN = {
  "failedToLoad": "Failed to load dashboard",
}


def main():
  for fname in FILES:
    path = f"{LOCALE_DIR}/{fname}"
    with open(path, "r", encoding="utf-8") as f:
      data = json.load(f)

    # Replace entire providers namespace with correct keys
    if fname == "en.json":
      data["providers"] = PROVIDERS_EN
    else:
      # am.json and om.json: use English values as placeholders
      data["providers"] = {k: v for k, v in PROVIDERS_EN.items()}

    # Add missing notifications keys
    if "notifications" not in data:
      data["notifications"] = {}
    for k, v in NOTIFICATIONS_MISSING_EN.items():
      data["notifications"][k] = v

    # Add missing policeDashboard key
    if "policeDashboard" not in data:
      data["policeDashboard"] = {}
    for k, v in POLICE_DASHBOARD_MISSING_EN.items():
      data["policeDashboard"][k] = v

    with open(path, "w", encoding="utf-8") as f:
      json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"Updated {fname}: providers={len(data['providers'])} keys, notifications added 6 keys, policeDashboard added 1 key")


if __name__ == "__main__":
  main()
