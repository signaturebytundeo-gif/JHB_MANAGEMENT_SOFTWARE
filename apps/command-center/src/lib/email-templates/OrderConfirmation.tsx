import React from 'react'
import { BaseLayout } from './BaseLayout'

// ============================================================================
// OrderConfirmationEmail — JHB order confirmation React Email component
// ============================================================================
// Renders the order summary table with gold borders, item rows, subtotal,
// shipping, and total. Wraps in BaseLayout (dark header, cream body, green footer).
// ============================================================================

interface OrderConfirmationEmailProps {
  customerFirstName: string
  orderId: string
  items: { name: string; quantity: number; price: number }[]
  shippingCost: number
  orderTotal: number
}

export function OrderConfirmationEmail({
  customerFirstName,
  orderId: _orderId,
  items,
  shippingCost,
  orderTotal,
}: OrderConfirmationEmailProps) {
  const subtotal = items.reduce((sum, item) => sum + item.price, 0)

  return (
    <BaseLayout title="Order Confirmed">
      <p
        style={{
          margin: '0 0 24px',
          fontSize: '16px',
          color: '#1A1A1A',
          lineHeight: 1.5,
        }}
      >
        Hi {customerFirstName},
      </p>
      <p
        style={{
          margin: '0 0 24px',
          fontSize: '16px',
          color: '#4A4A4A',
          lineHeight: 1.5,
        }}
      >
        Thank you for your order! We&#39;ve received it and will begin processing
        shortly.
      </p>

      {/* Order Summary Table */}
      <table
        role="presentation"
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          marginBottom: '24px',
        }}
      >
        <tbody>
          {/* Header row */}
          <tr style={{ borderBottom: '2px solid #D4A843' }}>
            <td
              style={{
                padding: '8px 0',
                fontSize: '12px',
                fontWeight: 600,
                color: '#6A6A6A',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              Item
            </td>
            <td
              style={{
                padding: '8px 0',
                fontSize: '12px',
                fontWeight: 600,
                color: '#6A6A6A',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                textAlign: 'center',
              }}
            >
              Qty
            </td>
            <td
              style={{
                padding: '8px 0',
                fontSize: '12px',
                fontWeight: 600,
                color: '#6A6A6A',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                textAlign: 'right',
              }}
            >
              Price
            </td>
          </tr>

          {/* Item rows */}
          {items.map((item, i) => (
            <tr key={i}>
              <td
                style={{
                  padding: '12px 0',
                  borderBottom: '1px solid #E8E4DF',
                  fontFamily: "'Plus Jakarta Sans', Arial, sans-serif",
                  fontSize: '14px',
                  color: '#1A1A1A',
                }}
              >
                {item.name}
              </td>
              <td
                style={{
                  padding: '12px 0',
                  borderBottom: '1px solid #E8E4DF',
                  fontFamily: "'Plus Jakarta Sans', Arial, sans-serif",
                  fontSize: '14px',
                  color: '#1A1A1A',
                  textAlign: 'center',
                }}
              >
                {item.quantity}
              </td>
              <td
                style={{
                  padding: '12px 0',
                  borderBottom: '1px solid #E8E4DF',
                  fontFamily: "'Plus Jakarta Sans', Arial, sans-serif",
                  fontSize: '14px',
                  color: '#1A1A1A',
                  textAlign: 'right',
                }}
              >
                ${item.price.toFixed(2)}
              </td>
            </tr>
          ))}

          {/* Subtotal row */}
          <tr>
            <td
              colSpan={2}
              style={{
                padding: '8px 0',
                fontSize: '14px',
                color: '#6A6A6A',
                textAlign: 'right',
              }}
            >
              Subtotal
            </td>
            <td
              style={{
                padding: '8px 0',
                fontSize: '14px',
                color: '#1A1A1A',
                textAlign: 'right',
              }}
            >
              ${subtotal.toFixed(2)}
            </td>
          </tr>

          {/* Shipping row */}
          <tr>
            <td
              colSpan={2}
              style={{
                padding: '8px 0',
                fontSize: '14px',
                color: '#6A6A6A',
                textAlign: 'right',
              }}
            >
              Shipping
            </td>
            <td
              style={{
                padding: '8px 0',
                fontSize: '14px',
                color: '#1A1A1A',
                textAlign: 'right',
              }}
            >
              {shippingCost === 0 ? 'Free' : `$${shippingCost.toFixed(2)}`}
            </td>
          </tr>

          {/* Total row */}
          <tr style={{ borderTop: '2px solid #D4A843' }}>
            <td
              colSpan={2}
              style={{
                padding: '12px 0',
                fontSize: '16px',
                fontWeight: 700,
                color: '#1A1A1A',
                textAlign: 'right',
              }}
            >
              Total
            </td>
            <td
              style={{
                padding: '12px 0',
                fontSize: '16px',
                fontWeight: 700,
                color: '#1A1A1A',
                textAlign: 'right',
              }}
            >
              ${orderTotal.toFixed(2)}
            </td>
          </tr>
        </tbody>
      </table>

      <p
        style={{
          margin: '0 0 8px',
          fontSize: '14px',
          color: '#4A4A4A',
          lineHeight: 1.5,
        }}
      >
        Please allow <strong>3-5 business days</strong> for processing. You&#39;ll
        receive a shipping confirmation email with tracking information once your
        order ships.
      </p>

      <p
        style={{
          margin: '24px 0 0',
          fontSize: '14px',
          color: '#6A6A6A',
          lineHeight: 1.5,
          fontStyle: 'italic',
        }}
      >
        Crafted with love from our family to yours.
      </p>
    </BaseLayout>
  )
}
