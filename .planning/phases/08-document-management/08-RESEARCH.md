# Phase 8: Document Management - Research

**Researched:** 2026-03-12
**Domain:** File storage (Vercel Blob), Prisma schema design, document versioning, Next.js server actions with FormData
**Confidence:** HIGH

---

## Summary

Phase 8 extends the already-established Vercel Blob + Server Action file upload pattern from Phase 6 (expenses/receipts) to a full document management system. The core infrastructure — `@vercel/blob` v2.3.1 installed, `BLOB_READ_WRITE_TOKEN` configured, and the `put()` + FormData pattern working — is already in place. No new libraries are needed.

The primary design challenge is the Prisma schema: a single `Document` model with an optional polymorphic link pattern (nullable `customerId`, `orderId`, `batchId` foreign keys) plus a separate `DocumentVersion` model to track file history. This is a well-established pattern in this codebase — see how `Order` uses optional `customerId` and how `Expense` has optional `receiptUrl`. The template library (DOC-04) is static — pre-seeded rows with `isTemplate: true` flag and pre-uploaded Blob URLs pointing to downloadable files, not a dynamic upload flow.

One critical infrastructure concern: Next.js server actions have a **1MB default body size limit**. Document uploads will exceed this. The `next.config.ts` must be updated to add `experimental.serverActions.bodySizeLimit: '10mb'` before any large file upload server actions will work. This is NOT set in the current config.

**Primary recommendation:** Extend the established expenses upload pattern to a `Document` model, add `DocumentVersion` for history, use polymorphic nullable FKs for record linking, and configure `bodySizeLimit` in next.config.ts before writing any upload server actions.

---

## Standard Stack

### Core (already installed — no new packages needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@vercel/blob` | 2.3.1 | File storage and retrieval | Already installed, token configured, pattern established in expenses.ts |
| `prisma` | 7.4.0 | Document + version records in PostgreSQL | Already in use across entire app |
| `zod` | 4.3.6 | Form validation for upload metadata | Already in use — same Zod v4 pattern as expenses validator |
| `next` | 16.1.6 | Server Actions for upload, App Router pages | Already in use |
| `lucide-react` | 0.564.0 | File/document icons in UI | Already installed |
| `sonner` | 2.0.7 | Toast notifications on upload success/error | Already installed |

### Supporting (already installed)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `shadcn/ui` components | via radix-ui | Card, Badge, Table, Select, Input, Button | All document list/upload UI |
| `date-fns` | 4.1.0 | Format upload dates in version history table | Already used throughout |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Vercel Blob | AWS S3 / Cloudflare R2 | Token already configured, SDK already installed — no reason to switch |
| Polymorphic nullable FKs | Separate junction tables | Simpler for 3 link targets; junction tables only needed if many-to-many required |
| DB-tracked versions | Blob folder convention only | DB rows enable UI version history list without Blob list() API calls |

**Installation:** No new packages needed. All dependencies are already installed.

**One config change required:**

```bash
# next.config.ts — must add before any large file upload server actions will work
```

---

## Architecture Patterns

### Recommended Project Structure

```
apps/command-center/src/
├── app/
│   ├── actions/
│   │   └── documents.ts           # Server actions: uploadDocument, deleteDocument, getDocuments
│   └── (dashboard)/dashboard/
│       └── documents/
│           ├── page.tsx            # Server component: loads docs, passes to client
│           └── [id]/
│               └── page.tsx        # Version history detail page
├── components/
│   └── documents/
│       ├── DocumentUploadForm.tsx  # Client form: file input + category + link fields
│       ├── DocumentList.tsx        # Filtered table of documents
│       ├── DocumentVersionHistory.tsx  # Version list for a single document
│       └── TemplateLibrary.tsx     # Static grid of downloadable templates
├── lib/
│   └── validators/
│       └── documents.ts            # Zod schemas for upload form
└── prisma/
    └── schema.prisma               # Add Document + DocumentVersion models
```

### Pattern 1: Vercel Blob Upload in Server Action (established pattern)

**What:** Server action receives FormData, extracts File object, calls `put()`, saves URL to DB.
**When to use:** All document uploads — same as receipts in expenses.ts.

```typescript
// Source: apps/command-center/src/app/actions/expenses.ts (established pattern)
// Extended for documents:
'use server';

import { put } from '@vercel/blob';
import { db } from '@/lib/db';
import { verifySession } from '@/lib/dal';

export async function uploadDocument(
  prevState: DocumentUploadFormState,
  formData: FormData
): Promise<DocumentUploadFormState> {
  const session = await verifySession();

  const file = formData.get('file') as File | null;
  if (!file || file.size === 0) {
    return { message: 'File is required' };
  }

  // Skip gracefully in dev if token not set
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.warn('[documents] BLOB_READ_WRITE_TOKEN not set — skipping upload in development');
    return { message: 'Blob token not configured' };
  }

  const blob = await put(
    `documents/${Date.now()}-${file.name}`,
    file,
    { access: 'public', addRandomSuffix: true }
  );

  // ... create Document + DocumentVersion records
}
```

### Pattern 2: Document Versioning via DocumentVersion Table

**What:** Every upload creates a new `DocumentVersion` row. The `Document` row tracks `currentVersionId` (or computed as latest version). Version history is a simple `db.documentVersion.findMany({ where: { documentId } })`.
**When to use:** DOC-03 requirement — version history must be visible per document.

```typescript
// Prisma write pattern for new version
await db.$transaction(async (tx) => {
  // Create version record
  const version = await tx.documentVersion.create({
    data: {
      documentId,
      versionNumber,
      blobUrl,
      fileSize,
      uploadedById: session.userId,
    },
  });

  // Update document to point to latest version
  await tx.document.update({
    where: { id: documentId },
    data: { currentBlobUrl: blobUrl, updatedAt: new Date() },
  });
});
```

### Pattern 3: Polymorphic Record Linking (nullable FK pattern)

**What:** `Document` has three nullable FK fields: `customerId`, `orderId`, `batchId`. At most one is set per document. This mirrors how `Order` already uses `customerId String?`.
**When to use:** DOC-02 — linking documents to customers, orders, or batches.

```typescript
// Prisma model — polymorphic nullable FK approach
model Document {
  id               String   @id @default(cuid())
  name             String
  category         DocumentCategory
  currentBlobUrl   String
  currentVersionId String?
  isTemplate       Boolean  @default(false)

  // Polymorphic links — at most one is non-null
  customerId String?
  orderId    String?
  batchId    String?

  uploadedById String
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  customer  Customer? @relation(fields: [customerId], references: [id])
  order     Order?    @relation(fields: [orderId], references: [id])
  batch     Batch?    @relation(fields: [batchId], references: [id])
  uploadedBy User     @relation(fields: [uploadedById], references: [id])
  versions  DocumentVersion[]
}

enum DocumentCategory {
  AGREEMENT
  INVOICE
  CERTIFICATION
  SOP
  MARKETING
  TEMPLATE
  OTHER
}
```

### Pattern 4: Template Library as Seeded Blobs

**What:** Templates (invoice, purchase order, wholesale agreement) are pre-uploaded blobs. `isTemplate: true` rows in the `Document` table with no linked record. The template page fetches `db.document.findMany({ where: { isTemplate: true } })` and renders download links.
**When to use:** DOC-04 — avoids any upload flow for templates; just seed data + download links.

### Anti-Patterns to Avoid

- **Storing file content in the DB:** Never store file bytes in PostgreSQL. Only store the Vercel Blob URL string.
- **Using `list()` from Vercel Blob API to drive version history UI:** `list()` is slow, costs operations, and doesn't hold metadata. Use DB rows for version history.
- **Calling `del()` on blob when document is deleted:** Blob URLs are cached for up to 1 month — deleting from Blob store takes up to 60 seconds to propagate. Soft-delete the DB record instead; optionally clean up blob asynchronously.
- **Uploading templates from the UI:** Templates are seeded documents, not user-uploaded. Seed them with a prisma seed script.
- **Server action without `bodySizeLimit` config:** Default 1MB limit will silently fail for any document > 1MB. Must configure in next.config.ts first.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| File storage | Custom S3 integration or local disk writes | `@vercel/blob` (already installed) | Already configured, pattern already proven in expenses.ts |
| Version number sequencing | Custom counter logic | Query `MAX(versionNumber)` from DocumentVersion and increment | Simple, atomic within transaction |
| File type validation | Custom MIME parser | `file.type` check in server action + Zod refinement | Browser-set MIME is sufficient for business docs; not a security boundary |
| Download of private blobs | Custom proxy route | Keep blobs `access: 'public'` for documents | Documents in this system aren't sensitive enough to need private blob authentication flow |
| Template file hosting | Separate CDN or static files | Vercel Blob with `isTemplate: true` DB flag | Same infrastructure, no additional setup |

**Key insight:** This phase is nearly pure data modeling + UI work. Vercel Blob is already wired. The risk is schema design (get it right once) and the body size config (easy to miss, hard to debug silently).

---

## Common Pitfalls

### Pitfall 1: Missing bodySizeLimit in next.config.ts

**What goes wrong:** Server action silently fails or returns a generic error when uploading files larger than 1MB. No helpful error message in dev.
**Why it happens:** Next.js server actions default to 1MB body limit. The current `next.config.ts` is empty (no config options set).
**How to avoid:** Add to `next.config.ts` before building any upload server action:
```typescript
const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};
```
**Warning signs:** Upload form submits, no error shown, but no document appears in DB. Check network tab for 413 status or "body exceeded" error.

### Pitfall 2: Blob URL collision without addRandomSuffix

**What goes wrong:** Two uploads of a file with the same name overwrite each other in Vercel Blob, corrupting version history.
**Why it happens:** Vercel Blob throws if same pathname is used twice unless `allowOverwrite: true`. The expenses.ts pattern uses `Date.now()` prefix but no `addRandomSuffix`.
**How to avoid:** Use `addRandomSuffix: true` on all document uploads:
```typescript
await put(`documents/${file.name}`, file, { access: 'public', addRandomSuffix: true });
```
**Warning signs:** BlobError thrown on second upload of same-named file.

### Pitfall 3: Missing User relation on Document model

**What goes wrong:** Prisma migration fails or User model is missing the backrelation to Document.
**Why it happens:** Adding `uploadedBy User @relation(...)` on Document requires adding `documentsUploaded Document[]` to the User model (or Prisma will complain about ambiguous/missing relations).
**How to avoid:** When adding Document model, simultaneously update User model to add `documentsUploaded Document[]`.

### Pitfall 4: Zod v4 error syntax (project uses v4, not v3)

**What goes wrong:** Using Zod v3 error syntax in validator (`message:` key in string constraints) causes type errors.
**Why it happens:** Zod v4 changed error options. See existing validators — they use `{ error: 'msg' }` not `{ message: 'msg' }`.
**How to avoid:** Follow the pattern in `src/lib/validators/expenses.ts`:
```typescript
// Correct Zod v4 syntax (as used in this codebase):
z.string().min(1, { error: 'Name is required' })
// NOT: z.string().min(1, { message: 'Name is required' })  ← Zod v3
```

### Pitfall 5: Template seeding requires actual blob URLs

**What goes wrong:** Seed script tries to insert template rows but the blob URLs don't exist yet.
**Why it happens:** Templates need real files uploaded to Vercel Blob before their URLs can be stored in the DB.
**How to avoid:** Either (a) upload template files manually to Vercel Blob first and hardcode their URLs in the seed script, or (b) create placeholder template records with a descriptive note field instead of a real blob URL for development. For production, upload real template files before running seed.

### Pitfall 6: Sidebar navigation — Documents not in nav

**What goes wrong:** Page works but users can't find it — the Sidebar.tsx has a static `navItems` array.
**Why it happens:** Sidebar requires manual addition; it doesn't auto-discover routes.
**How to avoid:** Add `{ label: 'Documents', href: '/dashboard/documents', icon: FileText, permission: 'documents' }` to `navItems` in Sidebar.tsx. Also add `'documents'` permission to `hasPermission()` in `src/lib/auth/permissions.ts`.

---

## Code Examples

Verified patterns from official sources and codebase:

### Vercel Blob put() with folder path and random suffix

```typescript
// Source: https://vercel.com/docs/storage/vercel-blob/using-blob-sdk
import { put } from '@vercel/blob';

const blob = await put(
  `documents/${Date.now()}-${file.name}`,
  file,
  {
    access: 'public',
    addRandomSuffix: true,
    // multipart: true  // use for files > 100MB — not needed for business docs
  }
);
// blob.url is the permanent public URL to store in DB
```

### Vercel Blob del() for cleanup

```typescript
// Source: https://vercel.com/docs/storage/vercel-blob/using-blob-sdk
import { del } from '@vercel/blob';

// Can delete single or multiple URLs
await del(blobUrl);
await del([blobUrl1, blobUrl2]);
// del() is free of charge, returns void, does not throw if URL not found
```

### Zod v4 document upload validator (matching codebase pattern)

```typescript
// Source: apps/command-center/src/lib/validators/expenses.ts (established pattern)
import { z } from 'zod';

export const uploadDocumentSchema = z.object({
  name: z.string().min(1, { error: 'Document name is required' }).max(200),
  category: z.enum(['AGREEMENT', 'INVOICE', 'CERTIFICATION', 'SOP', 'MARKETING', 'OTHER'], {
    error: 'Invalid category',
  }),
  linkedTo: z.enum(['none', 'customer', 'order', 'batch']).optional(),
  linkedId: z.string().optional(),
});

export type UploadDocumentFormState = {
  errors?: Record<string, string[]>;
  message?: string;
  success?: boolean;
};
```

### next.config.ts bodySizeLimit update

```typescript
// Source: https://nextjs.org/docs/app/api-reference/config/next-config-js/serverActions
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};

export default nextConfig;
```

### Prisma transaction: create document + first version

```typescript
// Pattern: atomic document + version creation
const result = await db.$transaction(async (tx) => {
  const doc = await tx.document.create({
    data: {
      name: data.name,
      category: data.category,
      currentBlobUrl: blobUrl,
      customerId: data.customerId ?? null,
      orderId: data.orderId ?? null,
      batchId: data.batchId ?? null,
      isTemplate: false,
      uploadedById: session.userId,
    },
  });

  await tx.documentVersion.create({
    data: {
      documentId: doc.id,
      versionNumber: 1,
      blobUrl,
      fileName: file.name,
      fileSize: file.size,
      uploadedById: session.userId,
    },
  });

  return doc;
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| API route for file upload | Server Action with FormData | Next.js App Router (v13+) | No separate route needed — action in `actions/documents.ts` |
| `message:` key in Zod errors | `error:` key in Zod v4 | Zod v4 release | Must use `{ error: 'msg' }` — this codebase already on v4 |
| Manual multipart for large files | `multipart: true` option in `put()` | @vercel/blob current | Use for files > 100MB; not needed for business documents |

**Deprecated/outdated:**
- Zod v3 `z.string().min(1, 'message')` string shorthand: use `{ error: 'message' }` in this codebase

---

## Open Questions

1. **Access mode: public vs. private for documents**
   - What we know: Expenses receipts use `access: 'public'`. Business documents (agreements, certifications, SOPs) may be sensitive.
   - What's unclear: Whether public blob URLs (accessible to anyone with the URL) are acceptable for business documents in this system.
   - Recommendation: Use `access: 'public'` for consistency with the established pattern. URLs are unguessable (with `addRandomSuffix: true`). If private blobs are later needed, they require a proxy route — scope that as a future enhancement.

2. **Template file seeding approach**
   - What we know: DOC-04 requires templates for invoices, purchase orders, wholesale agreements. Templates need real files.
   - What's unclear: Whether template files exist as actual assets ready to upload, or whether they'll be created during Phase 8.
   - Recommendation: Seed placeholder template records with `isTemplate: true` and a `templateNote` field pointing to a TBD URL. Add an admin upload action so the real files can be uploaded via the UI instead of requiring direct Vercel dashboard access.

3. **Version history UI: same page or separate route**
   - What we know: Success criteria says "shows version history" — not specified as separate page.
   - What's unclear: Whether version history is an inline expandable row, a modal, or a `/dashboard/documents/[id]` page.
   - Recommendation: Use a `/dashboard/documents/[id]` page matching the pattern used for `/dashboard/orders/[id]` and `/dashboard/production/[id]`. Simpler to implement, easier to deep-link.

---

## Sources

### Primary (HIGH confidence)
- Official Vercel Blob SDK docs: https://vercel.com/docs/storage/vercel-blob/using-blob-sdk — put(), del(), head(), list() API signatures
- Official Vercel Blob conceptual docs: https://vercel.com/docs/storage/vercel-blob — access modes, caching, file size limits, multipart
- Codebase: `apps/command-center/src/app/actions/expenses.ts` — established upload pattern (put, FormData, BLOB_READ_WRITE_TOKEN guard)
- Codebase: `apps/command-center/src/lib/validators/expenses.ts` — Zod v4 syntax pattern
- Codebase: `apps/command-center/prisma/schema.prisma` — existing model structure, nullable FK conventions
- Codebase: `apps/command-center/next.config.ts` — confirmed bodySizeLimit is NOT currently set

### Secondary (MEDIUM confidence)
- Next.js docs: https://nextjs.org/docs/app/api-reference/config/next-config-js/serverActions — `experimental.serverActions.bodySizeLimit` configuration
- Multiple Next.js GitHub discussions (#49891, #53989, #57973) confirming 1MB default limit behavior

### Tertiary (LOW confidence — noting for awareness)
- Reports that `bodySizeLimit` may not apply consistently in some production Vercel environments (GitHub discussion #77505) — flag for testing after deploy

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in project, versions confirmed from package.json
- Vercel Blob API: HIGH — verified from official docs
- Architecture patterns: HIGH — directly modeled on established codebase patterns
- Prisma schema design: HIGH — follows nullable FK conventions already used in schema
- bodySizeLimit pitfall: HIGH — confirmed via official Next.js docs + multiple community reports
- Template seeding approach: MEDIUM — practical recommendation, details TBD based on whether template files exist
- Access mode recommendation: MEDIUM — follows established pattern, security tradeoffs noted

**Research date:** 2026-03-12
**Valid until:** 2026-04-12 (stable libraries; Vercel Blob SDK rarely makes breaking changes)
