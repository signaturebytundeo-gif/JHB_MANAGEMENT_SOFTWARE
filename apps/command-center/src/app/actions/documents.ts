'use server';

import { put } from '@vercel/blob';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { verifySession } from '@/lib/dal';
import { uploadDocumentSchema, type DocumentUploadFormState } from '@/lib/validators/documents';
import { DocumentCategory } from '@prisma/client';

// ── Upload Document ──────────────────────────────────────────────────────────

export async function uploadDocument(
  prevState: DocumentUploadFormState,
  formData: FormData
): Promise<DocumentUploadFormState> {
  try {
    const session = await verifySession();

    // Validate file presence
    const file = formData.get('file') as File | null;
    if (!file || file.size === 0) {
      return { message: 'A file is required' };
    }

    // Validate form fields
    const validatedFields = uploadDocumentSchema.safeParse({
      name: formData.get('name'),
      category: formData.get('category'),
      linkedTo: formData.get('linkedTo') || 'none',
      linkedId: formData.get('linkedId') || undefined,
    });

    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    const data = validatedFields.data;

    // Guard: require BLOB_READ_WRITE_TOKEN
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.warn('[documents] BLOB_READ_WRITE_TOKEN not set — cannot upload document');
      return { message: 'File storage is not configured. Please set BLOB_READ_WRITE_TOKEN.' };
    }

    // Upload to Vercel Blob
    const blob = await put(`documents/${Date.now()}-${file.name}`, file, {
      access: 'public',
      addRandomSuffix: true,
    });

    // Determine polymorphic FK
    const customerId = data.linkedTo === 'customer' ? (data.linkedId ?? null) : null;
    const orderId = data.linkedTo === 'order' ? (data.linkedId ?? null) : null;
    const batchId = data.linkedTo === 'batch' ? (data.linkedId ?? null) : null;

    // Atomic create: Document + first DocumentVersion
    await db.$transaction(async (tx) => {
      const document = await tx.document.create({
        data: {
          name: data.name,
          category: data.category as DocumentCategory,
          currentBlobUrl: blob.url,
          isTemplate: false,
          customerId,
          orderId,
          batchId,
          uploadedById: session.userId,
        },
      });

      await tx.documentVersion.create({
        data: {
          documentId: document.id,
          versionNumber: 1,
          blobUrl: blob.url,
          fileName: file.name,
          fileSize: file.size,
          uploadedById: session.userId,
        },
      });
    });

    revalidatePath('/dashboard/documents');

    return { success: true, message: 'Document uploaded successfully' };
  } catch (error) {
    console.error('Error uploading document:', error);
    return { message: 'Failed to upload document' };
  }
}

// ── Upload New Version ───────────────────────────────────────────────────────

export type UploadNewVersionFormState = {
  errors?: Record<string, string[]>;
  message?: string;
  success?: boolean;
};

export async function uploadNewVersion(
  prevState: UploadNewVersionFormState,
  formData: FormData
): Promise<UploadNewVersionFormState> {
  try {
    const session = await verifySession();

    const documentId = formData.get('documentId') as string | null;
    if (!documentId) {
      return { message: 'Document ID is required' };
    }

    const file = formData.get('file') as File | null;
    if (!file || file.size === 0) {
      return { message: 'A file is required' };
    }

    // Guard: require BLOB_READ_WRITE_TOKEN
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.warn('[documents] BLOB_READ_WRITE_TOKEN not set — cannot upload document version');
      return { message: 'File storage is not configured. Please set BLOB_READ_WRITE_TOKEN.' };
    }

    // Get current max version number
    const aggregate = await db.documentVersion.aggregate({
      where: { documentId },
      _max: { versionNumber: true },
    });

    const nextVersion = (aggregate._max.versionNumber ?? 0) + 1;

    // Upload to Vercel Blob
    const blob = await put(`documents/${Date.now()}-${file.name}`, file, {
      access: 'public',
      addRandomSuffix: true,
    });

    // Atomic create: new DocumentVersion + update Document.currentBlobUrl
    await db.$transaction(async (tx) => {
      await tx.documentVersion.create({
        data: {
          documentId,
          versionNumber: nextVersion,
          blobUrl: blob.url,
          fileName: file.name,
          fileSize: file.size,
          uploadedById: session.userId,
        },
      });

      await tx.document.update({
        where: { id: documentId },
        data: { currentBlobUrl: blob.url },
      });
    });

    revalidatePath('/dashboard/documents');
    revalidatePath(`/dashboard/documents/${documentId}`);

    return { success: true, message: `Version ${nextVersion} uploaded successfully` };
  } catch (error) {
    console.error('Error uploading new version:', error);
    return { message: 'Failed to upload new version' };
  }
}

// ── Get Documents ────────────────────────────────────────────────────────────

export type DocumentFilters = {
  category?: DocumentCategory;
  linkedTo?: 'customer' | 'order' | 'batch';
  search?: string;
};

export async function getDocuments(filters?: DocumentFilters) {
  try {
    await verifySession();

    const where: Record<string, unknown> = {
      isTemplate: false,
    };

    if (filters?.category) where.category = filters.category;
    if (filters?.linkedTo === 'customer') {
      where.customerId = { not: null };
    } else if (filters?.linkedTo === 'order') {
      where.orderId = { not: null };
    } else if (filters?.linkedTo === 'batch') {
      where.batchId = { not: null };
    }
    if (filters?.search) {
      where.name = { contains: filters.search, mode: 'insensitive' };
    }

    const documents = await db.document.findMany({
      where,
      include: {
        uploadedBy: { select: { name: true } },
        customer: { select: { firstName: true, lastName: true } },
        order: { select: { orderNumber: true } },
        batch: { select: { batchCode: true } },
        _count: { select: { versions: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return documents;
  } catch (error) {
    console.error('Error fetching documents:', error);
    return [];
  }
}

export type DocumentListItem = Awaited<ReturnType<typeof getDocuments>>[number];

// ── Get Document By ID ───────────────────────────────────────────────────────

export async function getDocumentById(id: string) {
  try {
    await verifySession();

    const document = await db.document.findUnique({
      where: { id },
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
          include: {
            uploadedBy: { select: { name: true } },
          },
        },
        uploadedBy: { select: { name: true } },
        customer: true,
        order: true,
        batch: true,
      },
    });

    return document;
  } catch (error) {
    console.error('Error fetching document:', error);
    return null;
  }
}

export type DocumentDetail = Awaited<ReturnType<typeof getDocumentById>>;

// ── Delete Document ──────────────────────────────────────────────────────────

export type DeleteDocumentFormState = {
  message?: string;
  success?: boolean;
};

export async function deleteDocument(id: string): Promise<DeleteDocumentFormState> {
  try {
    await verifySession();

    const document = await db.document.findUnique({ where: { id } });
    if (!document) {
      return { message: 'Document not found' };
    }

    // Delete all versions first, then the document
    // Note: Do NOT delete blob URLs — cached objects; avoid immediate blob deletion
    await db.$transaction(async (tx) => {
      await tx.documentVersion.deleteMany({ where: { documentId: id } });
      await tx.document.delete({ where: { id } });
    });

    revalidatePath('/dashboard/documents');

    return { success: true, message: 'Document deleted successfully' };
  } catch (error) {
    console.error('Error deleting document:', error);
    return { message: 'Failed to delete document' };
  }
}

// ── Get Templates ────────────────────────────────────────────────────────────

export async function getTemplates() {
  try {
    await verifySession();

    const templates = await db.document.findMany({
      where: { isTemplate: true },
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return templates;
  } catch (error) {
    console.error('Error fetching templates:', error);
    return [];
  }
}

export type TemplateListItem = Awaited<ReturnType<typeof getTemplates>>[number];
