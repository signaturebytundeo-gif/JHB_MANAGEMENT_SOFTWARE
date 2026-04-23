import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { verifySession } from '@/lib/dal';

// Updated categories per requirements (matching database enum values)
const ALLOWED_CATEGORIES = [
  'COGS_INGREDIENTS',
  'COGS_PACKAGING',
  'MARKET_FEES_OVERHEAD',
  'TRAVEL_TRANSPORT',
  'MARKETING_PROMO',
  'STORAGE_RENT',
  'OTHER',
] as const;

// Payment methods per requirements (matching database enum values)
const ALLOWED_PAYMENT_METHODS = [
  'CASH',
  'MASTERCARD_6842',
  'BUSINESS_CARD',
  'OTHER',
] as const;

const SYSTEM_PROMPT = `You are a receipt scanner for Jamaica House Brand, a Caribbean condiment business.

Extract data from this receipt, invoice, or packing slip and return ONLY a single valid JSON object — no markdown, no commentary, no code fences.

Required JSON schema:
{
  "vendor": string | null,           // Store or supplier name
  "date": string | null,             // YYYY-MM-DD format, or null if unclear
  "total": number | null,            // Total amount paid (numeric only, no currency symbol)
  "line_items": [                    // Array of individual items
    {
      "description": string,         // Item name/description
      "amount": number               // Item cost
    }
  ],
  "category_suggestion": string,     // MUST be one of: ${ALLOWED_CATEGORIES.join(', ')}
  "payment_method": string,          // MUST be one of: ${ALLOWED_PAYMENT_METHODS.join(', ')}
  "notes": string | null             // Any additional relevant information
}

Category mapping rules (Caribbean condiment business context):
- Scotch bonnets, peppers, garlic, onions, vinegar, spices, fruit → "COGS_INGREDIENTS"
- Bottles, jars, labels, shrink wrap, boxes, caps → "COGS_PACKAGING"
- Booth fees, vendor permits, table rental → "MARKET_FEES_OVERHEAD"
- Storage units, warehouse rent, kitchen rental → "STORAGE_RENT"
- Travel, gas, parking, mileage → "TRAVEL_TRANSPORT"
- Ads, social media, flyers, print marketing → "MARKETING_PROMO"
- Anything else uncategorizable → "OTHER"

Payment method mapping:
- Cash transactions → "CASH"
- Mastercard ending in 6842 → "MASTERCARD_6842"
- Company credit card → "BUSINESS_CARD"
- Any other payment → "OTHER"

If a field cannot be determined from the image, use null (except category_suggestion and payment_method, which should use "OTHER" when unsure). Never wrap your output in markdown code fences.`;

type Extracted = {
  vendor: string | null;
  date: string | null;
  total: number | null;
  line_items: Array<{ description: string; amount: number }>;
  category_suggestion: string;
  payment_method: string;
  notes: string | null;
};

export async function POST(req: Request) {
  try {
    // Auth — same gate as the rest of the dashboard
    const session = await verifySession();

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY is not configured on the server.' },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file || file.size === 0) {
      return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
    }

    // Reject anything we can't send to Claude vision (images only)
    const mediaType = file.type;
    if (!mediaType.startsWith('image/')) {
      return NextResponse.json(
        { error: `Unsupported file type: ${mediaType}. Use JPG, PNG, or similar image formats.` },
        { status: 400 }
      );
    }

    // 1. Upload to Vercel Blob (so we get a permanent URL to attach to the expense).
    //    File naming: receipts/{user_id}/{timestamp}-{random}.{ext}
    const ext = file.name.includes('.') ? file.name.split('.').pop() : 'jpg';
    const blobPath = `receipts/${session.userId}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;

    let receiptUrl: string | null = null;
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const blob = await put(blobPath, file, { access: 'public', contentType: mediaType });
      receiptUrl = blob.url;
    } else {
      console.warn('[scan-receipt] BLOB_READ_WRITE_TOKEN not set — proceeding without upload');
    }

    // 2. Send to Claude vision for receipt extraction
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString('base64');

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        temperature: 0.1,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mediaType,
                  data: base64,
                },
              },
              {
                type: 'text',
                text: 'Extract the receipt data as JSON now.',
              },
            ],
          },
        ],
      }),
    });

    if (!claudeRes.ok) {
      const errText = await claudeRes.text();
      console.error('[scan-receipt] Claude API error:', claudeRes.status, errText);
      return NextResponse.json(
        { error: `Claude API failed (${claudeRes.status})`, receiptUrl },
        { status: 502 }
      );
    }

    const claudeData = (await claudeRes.json()) as {
      content?: Array<{
        type: 'text';
        text: string;
      }>;
    };

    const textBlock = claudeData.content?.[0]?.text ?? '';

    // Defensive — even with responseMimeType=application/json, strip fences if any.
    const cleaned = textBlock
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '');

    let extracted: Extracted;
    try {
      extracted = JSON.parse(cleaned);
    } catch (err) {
      console.error('[scan-receipt] Failed to parse Claude JSON output:', cleaned, err);
      return NextResponse.json(
        { error: 'Could not parse receipt data from AI response.', raw: cleaned, receiptUrl },
        { status: 502 }
      );
    }

    // Validate category_suggestion and payment_method, default to "OTHER" if invalid
    const category_suggestion = (ALLOWED_CATEGORIES as readonly string[]).includes(extracted.category_suggestion)
      ? extracted.category_suggestion
      : 'OTHER';

    const payment_method = (ALLOWED_PAYMENT_METHODS as readonly string[]).includes(extracted.payment_method)
      ? extracted.payment_method
      : 'OTHER';

    return NextResponse.json({
      receiptUrl,
      extracted: {
        vendor: extracted.vendor,
        date: extracted.date,
        total: extracted.total,
        line_items: extracted.line_items || [],
        category_suggestion,
        payment_method,
        notes: extracted.notes,
      },
    });
  } catch (error) {
    console.error('[scan-receipt] Unhandled error:', error);
    return NextResponse.json({ error: 'Receipt scan failed' }, { status: 500 });
  }
}
