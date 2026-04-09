import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { verifySession } from '@/lib/dal';

// Allowed Prisma ExpenseCategory enum values — Claude must pick one of these.
const ALLOWED_CATEGORIES = [
  'INGREDIENTS',
  'PACKAGING',
  'LABOR',
  'EQUIPMENT',
  'MARKETING',
  'SHIPPING',
  'UTILITIES',
  'RENT',
  'INSURANCE',
  'OVERHEAD',
  'OTHER',
] as const;

const SYSTEM_PROMPT = `You are a receipt scanner for Jamaica House Brand, a Caribbean condiment business.

Extract data from this receipt, invoice, or packing slip and return ONLY a single valid JSON object — no markdown, no commentary, no code fences.

Schema:
{
  "description": string,        // Short summary of items purchased
  "amount": number | null,      // Total amount paid (numeric only, no currency symbol)
  "vendor": string | null,      // Store or supplier name
  "date": string | null,        // YYYY-MM-DD format
  "category": string,           // MUST be one of: ${ALLOWED_CATEGORIES.join(', ')}
  "notes": string | null,       // Relevant line items or extra detail
  "line_items": [               // Individual items if visible (empty array if not)
    { "name": string, "qty": number, "unit_price": number }
  ],
  "document_type": string,      // "receipt" | "invoice" | "packing_slip" | "other"
  "confidence": string          // "high" | "medium" | "low" — your confidence in the extraction
}

Category mapping rules (Caribbean condiment business context):
- Scotch bonnets, peppers, garlic, onions, vinegar, spices, fruit → INGREDIENTS
- Bottles, jars, labels, shrink wrap, boxes, caps → PACKAGING
- Booth fees, market fees, vendor permits, table rental → OVERHEAD
- Pots, blenders, stoves, scales, kitchen tools → EQUIPMENT
- Wages, contract help → LABOR
- Postage, freight, USPS, UPS, FedEx, EasyPost → SHIPPING
- Ads, social media, flyers, print marketing → MARKETING
- Power, water, gas, internet → UTILITIES
- Rent, lease, kitchen rental → RENT
- Liability, business insurance → INSURANCE
- Anything else uncategorizable → OTHER

Document type rules:
- A retail receipt (customer-facing, prices visible, has totals) → "receipt"
- A wholesale invoice from a supplier billing the business → "invoice"
- A packing slip with quantities but no prices → "packing_slip"
- Anything else → "other"

If a field cannot be determined from the image, use null (except category and document_type, which must always be set — use "OTHER" / "other" when unsure). Never wrap your output in markdown code fences.`;

type Extracted = {
  description: string | null;
  amount: number | null;
  vendor: string | null;
  date: string | null;
  category: string;
  notes: string | null;
  line_items: Array<{ name: string; qty: number; unit_price: number }>;
  document_type: 'receipt' | 'invoice' | 'packing_slip' | 'other';
  confidence: 'high' | 'medium' | 'low';
};

export async function POST(req: Request) {
  try {
    // Auth — same gate as the rest of the dashboard
    const session = await verifySession();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is not configured on the server.' },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file || file.size === 0) {
      return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
    }

    // Reject anything we can't send to Gemini vision
    const mediaType = file.type;
    const isPdf = mediaType === 'application/pdf';
    if (!mediaType.startsWith('image/') && !isPdf) {
      return NextResponse.json(
        { error: `Unsupported file type: ${mediaType}. Use JPG, PNG, or PDF.` },
        { status: 400 }
      );
    }

    // 1. Upload to Vercel Blob (so we get a permanent URL to attach to the expense).
    //    File naming: receipts/{user_id}/{timestamp}-{random}.{ext}
    const ext = file.name.includes('.') ? file.name.split('.').pop() : isPdf ? 'pdf' : 'jpg';
    const blobPath = `receipts/${session.userId}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;

    let receiptUrl: string | null = null;
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const blob = await put(blobPath, file, { access: 'public', contentType: mediaType });
      receiptUrl = blob.url;
    } else {
      console.warn('[scan-receipt] BLOB_READ_WRITE_TOKEN not set — proceeding without upload');
    }

    // 2. Send to Gemini vision. Raw fetch — no SDK dependency.
    //    Free tier: gemini-2.5-flash, generous limits, supports image + PDF inline_data,
    //    and JSON mode via responseMimeType.
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString('base64');

    const geminiUrl =
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;

    const geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [
          {
            role: 'user',
            parts: [
              { inline_data: { mime_type: mediaType, data: base64 } },
              { text: 'Extract the receipt data as JSON now.' },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1,
          maxOutputTokens: 1024,
        },
      }),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error('[scan-receipt] Gemini API error:', geminiRes.status, errText);
      return NextResponse.json(
        { error: `Vision API failed (${geminiRes.status})`, receiptUrl },
        { status: 502 }
      );
    }

    const geminiData = (await geminiRes.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
    };

    const textBlock =
      geminiData.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';

    // Defensive — even with responseMimeType=application/json, strip fences if any.
    const cleaned = textBlock
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '');

    let extracted: Extracted;
    try {
      extracted = JSON.parse(cleaned);
    } catch (err) {
      console.error('[scan-receipt] Failed to parse Gemini JSON output:', cleaned, err);
      return NextResponse.json(
        { error: 'Could not parse receipt data from AI response.', raw: cleaned, receiptUrl },
        { status: 502 }
      );
    }

    // Coerce category to a valid enum value, defaulting to OTHER if Claude returned junk.
    const category = (ALLOWED_CATEGORIES as readonly string[]).includes(extracted.category)
      ? extracted.category
      : 'OTHER';

    return NextResponse.json({
      receiptUrl,
      extracted: { ...extracted, category },
    });
  } catch (error) {
    console.error('[scan-receipt] Unhandled error:', error);
    return NextResponse.json({ error: 'Receipt scan failed' }, { status: 500 });
  }
}
