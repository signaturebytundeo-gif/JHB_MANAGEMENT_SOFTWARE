import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * Incoming lead webhook — receives restaurant partner form submissions
 * from jamaicahousebrand.com/restaurant-partners.
 * Authenticated via WEBHOOK_API_KEY (same key used for incoming-order).
 */
export async function POST(request: NextRequest) {
  try {
    // Auth check
    const authHeader = request.headers.get('authorization');
    const expectedKey = process.env.WEBHOOK_API_KEY;

    if (!expectedKey || !authHeader || authHeader !== `Bearer ${expectedKey}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Basic validation
    if (!body.businessName || !body.contactName || !body.phone || !body.email) {
      return NextResponse.json(
        { error: 'Missing required fields: businessName, contactName, phone, email' },
        { status: 400 }
      );
    }

    // Calculate order total from quantities (pricing: $50 gallon, $60 case, $72 escovitch)
    const qtyGallon = Number(body.qtyGallon || 0);
    const qtyCase = Number(body.qtyCase || 0);
    const qtyEscovitch = Number(body.qtyEscovitch || 0);
    const orderTotal = qtyGallon * 50 + qtyCase * 60 + qtyEscovitch * 72;

    // Create the lead
    const lead = await db.restaurantLead.create({
      data: {
        businessName: String(body.businessName).trim(),
        contactName: String(body.contactName).trim(),
        phone: String(body.phone).trim(),
        email: String(body.email).trim().toLowerCase(),
        deliveryAddress: body.deliveryAddress || null,
        requestedDate: body.requestedDate || null,
        qtyGallon,
        qtyCase,
        qtyEscovitch,
        orderTotal,
        paymentMethod: body.paymentMethod || null,
        notes: body.notes || null,
        taxCertFileName: body.taxCertFileName || null,
        status: 'NEW',
      },
    });

    return NextResponse.json({ success: true, leadId: lead.id });
  } catch (error: any) {
    console.error('[incoming-lead] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
