import 'server-only'

// Jamaica House Brand LLC — Order Completion Handler
// Ties together: shipping calculation + Mailchimp sync + Command Center webhook

import { calculateShipping, type ShippingItem } from './shipping-calc'
import { onOrderComplete as mailchimpSync } from './mailchimp-sync'

export interface OrderInput {
  id: string
  customerEmail: string
  customerName: string
  customerPhone?: string
  billing?: {
    firstName?: string
    lastName?: string
    phone?: string
    city?: string
    state?: string
  }
  items: OrderItem[]
  shippingCost: number
  total: number
}

export interface OrderItem {
  name: string
  productId?: string
  quantity: number
  price: number
}

interface CommandCenterPayload {
  orderId: string
  customerEmail: string
  firstName: string
  lastName: string
  phone?: string
  items: { name: string; quantity: number; price: number }[]
  shippingCost: number
  orderTotal: number
  orderDate: string
}

async function postToCommandCenter(payload: CommandCenterPayload): Promise<boolean> {
  const webhookUrl = process.env.COMMAND_CENTER_WEBHOOK_URL
  const webhookKey = process.env.COMMAND_CENTER_WEBHOOK_API_KEY

  if (!webhookUrl) {
    console.log('COMMAND_CENTER_WEBHOOK_URL not set — skipping webhook')
    return false
  }

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (webhookKey) {
      headers['Authorization'] = `Bearer ${webhookKey}`
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    })

    if (response.ok) {
      const data = await response.json()
      console.log('Command Center webhook success:', data)
      return true
    } else {
      const errorText = await response.text()
      console.error('Command Center webhook error:', response.status, errorText)
      return false
    }
  } catch (err: any) {
    console.error('Command Center webhook network error:', err.message)
    return false
  }
}

export async function handleOrderComplete(order: OrderInput) {
  console.log(`Jamaica House Brand — Processing Order ${order.id}`)

  // 1. Shipping summary (for records/confirmation)
  const shippingItems: ShippingItem[] = order.items.map((item) => ({
    productId: item.productId || item.name.toLowerCase().replace(/[^a-z0-9]/g, ''),
    qty: item.quantity,
  }))
  const shippingInfo = calculateShipping(shippingItems)
  console.log(`Box: ${shippingInfo.boxSize} | Carrier: ${shippingInfo.carrier}`)

  // 2. Mailchimp sync (non-blocking — won't fail the order)
  const nameParts = (order.customerName || '').split(' ')
  const firstName = order.billing?.firstName || nameParts[0] || ''
  const lastName  = order.billing?.lastName  || nameParts.slice(1).join(' ') || ''

  const mailchimpResult = await mailchimpSync({
    customerEmail: order.customerEmail,
    billing: {
      firstName,
      lastName,
      phone: order.billing?.phone || order.customerPhone || '',
      city:  order.billing?.city  || '',
      state: order.billing?.state || '',
    },
    items: shippingItems.map((si) => ({ productId: si.productId, qty: si.qty })),
  })

  if (mailchimpResult?.success) {
    console.log(`Mailchimp: ${order.customerEmail} synced`)
  }

  // 3. Command Center webhook POST
  const webhookPayload: CommandCenterPayload = {
    orderId:       order.id,
    customerEmail: order.customerEmail,
    firstName,
    lastName,
    phone:         order.customerPhone || order.billing?.phone || '',
    items:         order.items.map((item) => ({
      name:     item.name,
      quantity: item.quantity,
      price:    item.price,
    })),
    shippingCost:  order.shippingCost,
    orderTotal:    order.total,
    orderDate:     new Date().toISOString(),
  }

  const webhookSuccess = await postToCommandCenter(webhookPayload)

  return {
    orderId:       order.id,
    shipping:      shippingInfo,
    mailchimpSync: mailchimpResult,
    commandCenter: webhookSuccess,
    confirmation: {
      email:          order.customerEmail,
      shippingCharge: shippingInfo.freeShipping ? 'FREE' : shippingInfo.customerCharge,
      boxSize:        shippingInfo.boxSize,
      carrier:        shippingInfo.carrier,
      packingNotes:   shippingInfo.packingNotes,
    },
  }
}
