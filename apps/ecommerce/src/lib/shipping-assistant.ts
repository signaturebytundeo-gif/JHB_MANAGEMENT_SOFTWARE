import 'server-only'

// Jamaica House Brand LLC — AI Shipping Assistant
// Powered by Cloudflare Workers AI — on-brand, Caribbean-authentic

const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID
const CF_API_TOKEN  = process.env.CLOUDFLARE_API_TOKEN

const SHIPPING_ASSISTANT_SYSTEM_PROMPT = `You are a shipping cost assistant for Jamaica House Brand LLC, an authentic Caribbean sauce company based in South Florida with 30+ years of family heritage. Your job is to help customers understand shipping costs and packing details for their order.

PRODUCT LINE:
- 2 oz woozy bottle (glass) — lead product, FREE shipping
- 5 oz woozy bottle (glass)
- 10 oz woozy bottle (glass)
- 12 oz bottle (glass)

PACKAGING RULES:
- Each bottle wrapped in mesh sleeve or kraft paper before boxing
- Kraft paper crumple for void fill (no peanuts)
- Box sizes: 6x6x6 (1-2 bottles), 9x6x6 (3-4 bottles), 12x9x6 (5+ bottles)
- FRAGILE and LIQUID labels on all shipped boxes

SHIPPING CARRIER: Pirateship USPS Ground Advantage (nationwide)
Large/wholesale orders: UPS/FedEx Ground, quoted separately

WHAT TO CHARGE CUSTOMERS:
- 2oz sample bottle only: FREE SHIPPING (we absorb the cost)
- 2-bottle combos: $4.99-$6.99
- 3-bottle combos: $7.99-$9.99
- Larger orders: $8.99-$10.99

RESPONSE FORMAT — always tell the customer:
1. Recommended box size
2. Estimated shipping charge (what they pay)
3. Friendly packing note
4. A warm, on-brand closing line

TONE: Warm, authentic, Caribbean-proud. Reference the family heritage and "From Our Family to Yours" spirit naturally when it fits. Keep responses concise and helpful.`

interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export async function askShippingAssistant(
  userMessage: string,
  conversationHistory: ChatMessage[] = []
): Promise<string> {
  if (!CF_ACCOUNT_ID || !CF_API_TOKEN) {
    return 'Shipping assistant is currently unavailable. Please contact us at jamaicahousebrand.com for shipping help!'
  }

  const messages: ChatMessage[] = [
    { role: 'system', content: SHIPPING_ASSISTANT_SYSTEM_PROMPT },
    ...conversationHistory,
    { role: 'user', content: userMessage },
  ]

  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai/run/@cf/meta/llama-3.1-8b-instruct`,
      {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${CF_API_TOKEN}`,
        },
        body: JSON.stringify({ messages, max_tokens: 500 }),
      }
    )

    const data = await response.json()

    if (!response.ok) {
      console.error('Cloudflare AI error:', data.errors)
      return "I'm having a little trouble right now. Please reach out to us directly and we'll sort out your shipping right away!"
    }

    return data.result?.response || "Let me check on that for you — please contact us directly!"
  } catch (err: any) {
    console.error('Shipping assistant error:', err.message)
    return "Something went sideways on my end! Reach out to us at jamaicahousebrand.com and we'll take care of you."
  }
}
