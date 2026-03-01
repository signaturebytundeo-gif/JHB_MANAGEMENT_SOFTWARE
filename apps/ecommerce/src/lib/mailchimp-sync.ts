import 'server-only'
import { createHash } from 'crypto'

// Jamaica House Brand LLC — Mailchimp Integration
// Syncs purchase data to Mailchimp audience automatically

const MAILCHIMP_API_KEY  = process.env.MAILCHIMP_API_KEY
const MAILCHIMP_LIST_ID  = process.env.MAILCHIMP_LIST_ID
const MAILCHIMP_SERVER   = process.env.MAILCHIMP_SERVER // e.g. "us14"

if (!MAILCHIMP_API_KEY || !MAILCHIMP_LIST_ID || !MAILCHIMP_SERVER) {
  console.warn('Mailchimp env vars not set. Email sync will be skipped.')
}

interface CustomerData {
  email: string
  firstName: string
  lastName: string
  phone?: string
  city?: string
  state?: string
  tags?: string[]
}

interface MailchimpResult {
  success: boolean
  email: string
  status?: string
  error?: string
}

interface CartItem {
  productId: string
  qty?: number
  quantity?: number
}

export interface OrderData {
  customerEmail: string
  billing?: {
    firstName?: string
    lastName?: string
    phone?: string
    city?: string
    state?: string
  }
  firstName?: string
  lastName?: string
  phone?: string
  items?: CartItem[]
}

export async function syncCustomerToMailchimp(customerData: CustomerData): Promise<MailchimpResult | null> {
  if (!MAILCHIMP_API_KEY) {
    console.log('Mailchimp not configured — skipping sync for:', customerData.email)
    return null
  }

  const { email, firstName, lastName, phone, city, state, tags = [] } = customerData

  const baseUrl = `https://${MAILCHIMP_SERVER}.api.mailchimp.com/3.0`
  const authHeader = 'Basic ' + Buffer.from(`anystring:${MAILCHIMP_API_KEY}`).toString('base64')

  const memberPayload = {
    email_address: email.toLowerCase().trim(),
    status_if_new: 'subscribed',
    status: 'subscribed',
    merge_fields: {
      FNAME: firstName || '',
      LNAME: lastName  || '',
      PHONE: phone     || '',
      CITY:  city      || '',
      STATE: state     || '',
    },
    tags: ['jhb-customer', 'website-purchase', ...tags],
  }

  const subscriberHash = createHash('md5')
    .update(email.toLowerCase().trim())
    .digest('hex')

  try {
    const response = await fetch(
      `${baseUrl}/lists/${MAILCHIMP_LIST_ID}/members/${subscriberHash}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': authHeader,
        },
        body: JSON.stringify(memberPayload),
      }
    )

    const data = await response.json()

    if (response.ok) {
      console.log(`Mailchimp synced: ${email} (${data.status})`)
      return { success: true, email, status: data.status }
    } else {
      console.error(`Mailchimp error for ${email}:`, data.detail || data.title)
      return { success: false, email, error: data.detail }
    }
  } catch (err: any) {
    console.error('Mailchimp network error:', err.message)
    return { success: false, email, error: err.message }
  }
}

export function buildProductTags(cartItems: CartItem[]): string[] {
  const tags: string[] = []
  for (const item of cartItems) {
    tags.push(`purchased-${item.productId}`)
    if (item.productId === '2oz') tags.push('sample-bottle-customer')
  }
  return tags
}

export async function onOrderComplete(order: OrderData): Promise<MailchimpResult | null> {
  const productTags = buildProductTags(order.items || [])

  const result = await syncCustomerToMailchimp({
    email:     order.customerEmail,
    firstName: order.billing?.firstName || order.firstName || '',
    lastName:  order.billing?.lastName  || order.lastName  || '',
    phone:     order.billing?.phone     || order.phone     || '',
    city:      order.billing?.city      || '',
    state:     order.billing?.state     || '',
    tags:      productTags,
  })

  return result
}
