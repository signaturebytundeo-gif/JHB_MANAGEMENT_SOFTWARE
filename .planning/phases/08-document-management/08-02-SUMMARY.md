---
phase: 08-document-management
plan: 02
subsystem: document-management
tags: [next.js, server-actions, client-components, useActionState, vercel-blob, date-fns, responsive-ui]
dependency_graph:
  requires: ["08-01"]
  provides: [documents-ui, document-upload-form, document-list, document-detail, version-history]
  affects: [sidebar-nav, dashboard-navigation]
tech_stack:
  added: []
  patterns: ["useActionState with server action for file uploads", "parallel Promise.all server data fetch", "responsive table-to-cards transform", "client-side category filter tabs", "formatFileSize helper"]
key_files:
  created:
    - apps/command-center/src/app/(dashboard)/dashboard/documents/page.tsx
    - apps/command-center/src/app/(dashboard)/dashboard/documents/[id]/page.tsx
    - apps/command-center/src/components/documents/DocumentUploadForm.tsx
    - apps/command-center/src/components/documents/DocumentList.tsx
    - apps/command-center/src/components/documents/DocumentVersionHistory.tsx
    - apps/command-center/src/components/documents/TemplateLibrary.tsx
  modified:
    - apps/command-center/src/components/layout/Sidebar.tsx
decisions:
  - "TemplateLibrary added to documents/page.tsx to surface isTemplate=true documents — uses getTemplates action already built in Plan 01, no extra cost"
  - "formatFileSize helper inlined in DocumentVersionHistory — avoids utility file proliferation for single-use formatter"
  - "deleteDocument called directly (not via useActionState) in DocumentList — confirm dialog + per-row optimistic state without cross-row pollution"
  - "version-history and new-version upload co-located in DocumentVersionHistory component — reduces prop drilling on detail page"
metrics:
  duration: "7 minutes"
  completed: "2026-03-12"
  tasks_completed: 2
  files_created: 6
  files_modified: 1
---

# Phase 08 Plan 02: Document Management UI Summary

Full-stack document management UI with filterable document list, file upload form with category selection and record linking (customer/order/batch), document detail page with version history table and new-version upload, and sidebar navigation entry.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Documents list page, upload form, document list, sidebar entry | ebd3eb7 | page.tsx, DocumentUploadForm.tsx, DocumentList.tsx, Sidebar.tsx |
| 2 | Document detail page with version history and new version upload | f4ccaa9 | [id]/page.tsx, DocumentVersionHistory.tsx, TemplateLibrary.tsx |

## What Was Built

### Documents List Page (`/dashboard/documents`)
- Server component fetches documents, customers, orders, batches in a single `Promise.all`
- Renders `DocumentUploadForm` (left column, sticky on desktop) + `DocumentList` (right column)
- Template Library section below using `getTemplates` from Plan 01
- Suspense with animated skeleton loading

### DocumentUploadForm
- `useActionState` wired to `uploadDocument` server action
- File input accepting PDF/DOC/DOCX/XLS/XLSX/CSV/JPG/PNG/TXT
- Category select: Agreement, Invoice, Certification, SOP, Marketing, Other
- Conditional linked record select: shows Customer/Order/Batch dropdown when a link type is chosen
- Sonner toast on success/error; form key reset on success

### DocumentList
- Client component with category filter tab buttons (All + 6 categories)
- Client-side filtering — small dataset, instant response
- Desktop: data table with name link, category badge, linked record, version count, uploader, date, download+delete actions
- Mobile: card layout with same data, touch-friendly delete/download
- `deleteDocument` called directly with `window.confirm` guard; per-row `deletingId` state prevents double-delete

### Document Detail Page (`/dashboard/documents/[id]`)
- Server component; calls `getDocumentById`, falls through to `notFound()` if missing
- Header with document name, category badge, linked record link (with navigation to record page)
- "Download Latest" button prominently displayed
- Metadata grid: uploaded by, created date, last updated

### DocumentVersionHistory
- Versions table (desktop) / cards (mobile) with v1/v2... numbering
- Latest version highlighted with "Latest" badge
- `formatFileSize` helper: B / KB / MB thresholds
- Dates formatted with `date-fns format()`
- Download anchor with `download` attribute on each version
- "Upload New Version" form using `useActionState` with `uploadNewVersion` action; toast on success/error

### TemplateLibrary
- Grid of cards for `isTemplate=true` documents
- Conditional download link vs "pending upload" notice based on `currentBlobUrl` presence
- Created by linter auto-completion using the `getTemplates` action from Plan 01

### Sidebar
- `FileText` icon added to lucide-react import
- Documents nav item added before Settings: `{ label: 'Documents', href: '/dashboard/documents', icon: FileText, permission: 'documents' }`

## Verification Results

1. `/dashboard/documents` page — server component renders without errors, tsc passes
2. Sidebar Documents link — visible for ADMIN and MANAGER roles (permission: 'documents')
3. Upload form — file input + name + category + optional record link fields all present
4. DocumentList — category filter tabs present, responsive table + card layout
5. Document name links to `/dashboard/documents/[id]`
6. Detail page — version history table, metadata, download latest button
7. Upload New Version — `useActionState` with `uploadNewVersion` action, toast feedback
8. Download links — anchor with `href={version.blobUrl}` and `download` attribute

## Deviations from Plan

### Auto-added Features

**1. [Rule 2 - Missing Functionality] TemplateLibrary component added to documents page**
- **Found during:** Task 2 (linter auto-completed TemplateLibrary import)
- **Issue:** `getTemplates` action exists from Plan 01 but had no UI consumer
- **Fix:** Created `TemplateLibrary.tsx` and wired it into `documents/page.tsx`
- **Files modified:** TemplateLibrary.tsx (created), documents/page.tsx (template section added)
- **Commit:** f4ccaa9

## Self-Check: PASSED

Files created:
- FOUND: apps/command-center/src/app/(dashboard)/dashboard/documents/page.tsx
- FOUND: apps/command-center/src/app/(dashboard)/dashboard/documents/[id]/page.tsx
- FOUND: apps/command-center/src/components/documents/DocumentUploadForm.tsx
- FOUND: apps/command-center/src/components/documents/DocumentList.tsx
- FOUND: apps/command-center/src/components/documents/DocumentVersionHistory.tsx
- FOUND: apps/command-center/src/components/documents/TemplateLibrary.tsx

Files modified:
- FOUND: apps/command-center/src/components/layout/Sidebar.tsx

Commits:
- FOUND: ebd3eb7
- FOUND: f4ccaa9
