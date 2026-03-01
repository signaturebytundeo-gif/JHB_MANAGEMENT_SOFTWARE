import { NextRequest, NextResponse } from 'next/server'
import { askShippingAssistant } from '@/lib/shipping-assistant'

export async function POST(request: NextRequest) {
  try {
    const { message, history } = await request.json()

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    const reply = await askShippingAssistant(message, history || [])

    return NextResponse.json({ reply })
  } catch (error) {
    console.error('Shipping assistant route error:', error)
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}
