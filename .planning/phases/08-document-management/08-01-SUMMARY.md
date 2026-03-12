---
phase: 08-document-management
plan: 01
subsystem: document-management
tags: [prisma, server-actions, vercel-blob, zod, permissions]
dependency_graph:
  requires: []
  provides: [document-schema, document-actions, document-validators]
  affects: [prisma-client, permissions]
tech_stack:
  added: ["@vercel/blob (put)", "DocumentCategory enum", "Document model", "DocumentVersion model"]
  patterns: ["polymorphic FK pattern", "atomic db.$transaction for upload+version", "named Prisma relations for disambiguation"]
key_files:
  created:
    - apps/command-center/src/app/actions/documents.ts
    - apps/command-center/src/lib/validators/documents.ts
  modified:
    - apps/command-center/prisma/schema.prisma
    - apps/command-center/next.config.ts
    - apps/command-center/src/lib/auth/permissions.ts
decisions:
  - "Named Prisma relations DocumentUploader/VersionUploader on User — avoids ambiguous relation error with multiple User→Document paths"
  - "Named backrelations CustomerDocuments/OrderDocuments/BatchDocuments — consistent with existing CustomerOperatorOrders pattern"
  - "Polymorphic nullable FKs (customerId/orderId/batchId) with at-most-one constraint enforced in application layer"
  - "BLOB_READ_WRITE_TOKEN guard returns error (not silent skip) for document uploads — files are required unlike optional receipts"
  - "prisma generate required after db push — Prisma client did not auto-regenerate, blocking type resolution"
metrics:
  duration: "3 minutes"
  completed: "2026-03-12"
  tasks_completed: 2
  files_created: 2
  files_modified: 3
---

# Phase 08 Plan 01: Document Management Data Layer Summary

Document and DocumentVersion Prisma models with polymorphic record linking, Zod v4 validators, Vercel Blob server actions for upload/versioning/listing/deletion, 10MB body size limit, and permissions update for ADMIN and MANAGER roles.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Prisma schema, Zod validators, next.config.ts, permissions | eb80ae8 | schema.prisma, documents.ts (validators), next.config.ts, permissions.ts |
| 2 | Document server actions (upload, version, list, detail, delete) | 29b984c | actions/documents.ts |

## What Was Built

### Prisma Schema
- `DocumentCategory` enum: AGREEMENT, INVOICE, CERTIFICATION, SOP, MARKETING, TEMPLATE, OTHER (7 values)
- `Document` model: polymorphic FK linking to Customer/Order/Batch (at most one non-null), `isTemplate` flag, `currentBlobUrl` for quick access
- `DocumentVersion` model: sequential versioning with `versionNumber`, `blobUrl`, `fileName`, `fileSize`
- Named relations on all sides: prevents Prisma validation errors throughout the multi-relation schema
- Backrelations added to User (documentsUploaded, versionsUploaded), Customer (documents), Order (documents), Batch (documents)

### Server Actions (6 exported functions)
- `uploadDocument` — validates file + form, guards for BLOB token, uploads to Vercel Blob, atomically creates Document + DocumentVersion(1)
- `uploadNewVersion` — aggregates max version number, uploads new blob, atomically creates DocumentVersion(n+1) + updates Document.currentBlobUrl
- `getDocuments` — filters by category, linked record type, and name search; excludes templates; includes related names and version count
- `getDocumentById` — full document with all versions ordered desc, all relations included
- `deleteDocument` — cascade delete versions then document in transaction; does not call blob del() (per established pattern)
- `getTemplates` — fetches isTemplate=true documents with latest version preloaded

### Config & Permissions
- `next.config.ts`: `experimental.serverActions.bodySizeLimit: '10mb'` — required for file uploads exceeding 1MB default
- `permissions.ts`: 'documents' added to ADMIN and MANAGER; SALES_REP and INVESTOR excluded

## Verification Results

1. `prisma db push` — succeeded, Document and DocumentVersion tables created in Neon PostgreSQL
2. `tsc --noEmit` — passes with zero type errors
3. DocumentCategory enum has 7 values — confirmed
4. `next.config.ts` has `bodySizeLimit: '10mb'` — confirmed
5. ADMIN and MANAGER have 'documents' permission — confirmed
6. All 6 server actions exported and type-checking — confirmed

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Prisma client not regenerated after db push**
- **Found during:** Task 2 verification (tsc --noEmit)
- **Issue:** `npx prisma db push` applies schema to DB but does not regenerate the TypeScript client — `document` and `documentVersion` were not recognized on `db`, and `DocumentCategory` was not exported from `@prisma/client`
- **Fix:** Ran `npx prisma generate` after `db push` to regenerate the client with new models
- **Files modified:** node_modules/@prisma/client (generated, not committed)
- **Commit:** Task 2 commit (29b984c) notes this fix

## Self-Check: PASSED

Files created:
- FOUND: apps/command-center/src/app/actions/documents.ts
- FOUND: apps/command-center/src/lib/validators/documents.ts

Files modified:
- FOUND: apps/command-center/prisma/schema.prisma
- FOUND: apps/command-center/next.config.ts
- FOUND: apps/command-center/src/lib/auth/permissions.ts

Commits:
- FOUND: eb80ae8
- FOUND: 29b984c
