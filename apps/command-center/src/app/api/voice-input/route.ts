import { NextResponse } from 'next/server';
import { resolveFields } from '@/lib/voice/resolvers';
import { verifySession } from '@/lib/dal';

export const runtime = 'nodejs';

const SYSTEM_PROMPT = `You are a voice assistant for Jamaica House Brand Command Center, a Caribbean condiment business management app. The user is speaking to fill out forms hands-free while working.

You will receive:
- transcript: what the user said
- page: the current module (events, sales, production, finance, etc.)
- today: today's ISO date for resolving relative dates

Return ONLY valid JSON in this exact shape:
{
  "filledFields": { "fieldName": "value" },
  "missingFields": ["fieldName"],
  "followUpQuestion": null,
  "action": null,
  "confidence": "high"
}

Field mapping by page:

events (MarketEvent):
  name (string, required), eventDate (YYYY-MM-DD, required), location (string),
  channel_name (string — will be resolved to channelId),
  boothFee (number), travelCost (number), supplyCost (number),
  laborCost (number), otherCost (number), notes (string)

sales (Sale):
  saleDate (YYYY-MM-DD, required), product_name (string — resolved to productId),
  channel_name (string — resolved to channelId), quantity (integer, required),
  unitPrice (number, required), paymentMethod (enum: CASH, CREDIT_CARD, SQUARE, STRIPE, ZELLE, CHECK, NET_30, AMAZON_PAY, OTHER),
  referenceNumber (string), notes (string), isPromo (boolean, default false)

production (Batch):
  productionDate (YYYY-MM-DD, required), product_name (string — resolved to productId),
  productionSource (enum: IN_HOUSE or CO_PACKER, default IN_HOUSE),
  totalUnits (integer, required), notes (string)
  DO NOT generate batchCode — the system assigns it automatically.

finance (Expense):
  description (string, required), amount (number, required),
  category (enum: INGREDIENTS, PACKAGING, LABOR, EQUIPMENT, MARKETING, SHIPPING, UTILITIES, RENT, INSURANCE, OVERHEAD, OTHER),
  expenseDate (YYYY-MM-DD, required), vendorName (string), notes (string)

inventory (New Product):
  name (string, required — product name like "Mango Lime"),
  sku (string, required — format JHB-XX-ABBREV, e.g. JHB-JC-MAN-LIM for juice, JHB-OJS-5OZ for sauce),
  size (string, required — e.g. "bottle", "5oz", "10oz"),
  retailPrice (number, required — default 7.99 for juices, varies for sauces),
  unitsPerCase (integer, optional),
  startingStock (integer, optional — number of units to add),
  description (string, optional)
  When user says "juice" or mentions a juice flavor, use JHB-JC- prefix for SKU.
  When user says "sauce", use JHB-OJS- or JHB-EP- prefix.

Rules:
- Numbers must be actual numbers, not strings.
- Dates: convert "today", "yesterday", "last Friday", "this Saturday" etc. to ISO YYYY-MM-DD.
- followUpQuestion: set to ONE short question only if a critical required field is missing; otherwise null.
- action: "submit" if the user said save/submit/done; "clear" if they said clear/start over; otherwise null.
- confidence: "high" | "medium" | "low".
- For product/channel references, return the SPOKEN name in product_name/channel_name — the server resolves to IDs.
- paymentMethod defaults to CASH if not mentioned.
- Never include markdown or commentary. Return JSON only.`;

// --- In-memory rate limit ---
const lastCallAt = new Map<string, number>();
const MIN_INTERVAL_MS = 2000;

function rateLimit(key: string): boolean {
  const now = Date.now();
  const prev = lastCallAt.get(key) ?? 0;
  if (now - prev < MIN_INTERVAL_MS) return false;
  lastCallAt.set(key, now);
  return true;
}

function safeParse(raw: string) {
  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {}
    }
    return null;
  }
}

function fallback(reason: string) {
  return {
    filledFields: {},
    missingFields: [],
    followUpQuestion: null,
    action: null,
    confidence: 'low' as const,
    _error: reason,
  };
}

async function callGroq(system: string, user: string): Promise<string> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error('GROQ_API_KEY missing');
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile',
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Groq ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

export async function POST(req: Request) {
  // Auth check — only logged-in users can use voice
  try {
    await verifySession();
  } catch {
    return NextResponse.json(fallback('unauthorized'), { status: 401 });
  }

  const ip = req.headers.get('x-forwarded-for') ?? 'local';
  if (!rateLimit(ip)) {
    return NextResponse.json(fallback('rate_limited'), { status: 429 });
  }

  let body: {
    transcript?: string;
    page?: string;
    existingFields?: Record<string, unknown>;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(fallback('bad_json'), { status: 400 });
  }

  const transcript = (body.transcript ?? '').trim();
  const page = (body.page ?? 'dashboard').toLowerCase();
  const existingFields = body.existingFields ?? {};

  if (!transcript) {
    return NextResponse.json(fallback('empty_transcript'), { status: 400 });
  }

  const today = new Date().toISOString().slice(0, 10);
  const userMessage = JSON.stringify({ transcript, page, existingFields, today });

  try {
    const raw = await callGroq(SYSTEM_PROMPT, userMessage);
    console.log('[voice-input] groq raw:', raw);
    const parsed = safeParse(raw);
    if (!parsed || typeof parsed !== 'object') {
      console.error('[voice-input] parse failed, raw:', raw);
      return NextResponse.json(fallback('parse_failed'));
    }
    console.log('[voice-input] parsed filledFields:', JSON.stringify(parsed.filledFields));

    // Resolve names → Prisma IDs
    const filledFields = await resolveFields(
      page,
      parsed.filledFields ?? {}
    );

    return NextResponse.json({
      filledFields,
      missingFields: Array.isArray(parsed.missingFields)
        ? parsed.missingFields
        : [],
      followUpQuestion: parsed.followUpQuestion ?? null,
      action: parsed.action ?? null,
      confidence: parsed.confidence ?? 'medium',
    });
  } catch (err) {
    console.error('voice-input provider error:', err);
    return NextResponse.json(fallback('provider_error'));
  }
}
