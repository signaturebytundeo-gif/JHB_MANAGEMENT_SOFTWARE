import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Test payload that simulates an ecommerce order
    const testPayload = {
      orderId: `TEST-${Date.now()}`,
      customerEmail: 'test@example.com',
      firstName: 'Test',
      lastName: 'Customer',
      phone: '+1234567890',
      items: JSON.stringify([
        { name: '12oz Jerk Sauce', quantity: 2, price: 18.00 },
        { name: '4oz Jerk Sauce', quantity: 1, price: 12.00 }
      ]),
      shippingCost: 5.99,
      orderTotal: 53.99,
      orderDate: new Date().toISOString()
    };

    // Call the incoming-order webhook with the test payload
    const webhookUrl = `${request.nextUrl.origin}/api/incoming-order`;
    const webhookKey = process.env.WEBHOOK_API_KEY;

    if (!webhookKey) {
      return NextResponse.json({
        error: 'WEBHOOK_API_KEY not configured',
        suggestion: 'Add WEBHOOK_API_KEY to environment variables'
      }, { status: 500 });
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${webhookKey}`
      },
      body: JSON.stringify(testPayload)
    });

    const result = await response.json();

    return NextResponse.json({
      success: response.ok,
      status: response.status,
      testPayload,
      webhookResponse: result,
      message: response.ok
        ? 'Test order processed successfully! Check Slack for notification.'
        : 'Test order failed to process'
    });

  } catch (error: any) {
    console.error('Test webhook error:', error);
    return NextResponse.json({
      error: 'Test failed',
      details: error.message
    }, { status: 500 });
  }
}