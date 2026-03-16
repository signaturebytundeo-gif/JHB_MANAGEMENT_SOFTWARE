import React from 'react'
import { BaseLayout } from './BaseLayout'

// ============================================================================
// ShippingConfirmationEmail — JHB shipping confirmation React Email component
// ============================================================================
// Shows carrier tracking card, gold CTA button "Track Your Package",
// and optional estimated delivery line.
// ============================================================================

interface ShippingConfirmationEmailProps {
  customerFirstName: string
  orderId: string
  carrier: string
  trackingNumber: string
  estimatedDelivery?: string
}

function getTrackingUrl(carrier: string, trackingNumber: string): string {
  switch (carrier.toUpperCase()) {
    case 'UPS':
      return `https://www.ups.com/track?tracknum=${encodeURIComponent(trackingNumber)}`
    case 'USPS':
      return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${encodeURIComponent(trackingNumber)}`
    case 'FEDEX':
      return `https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(trackingNumber)}`
    case 'DHL':
      return `https://www.dhl.com/us-en/home/tracking/tracking-global-forwarding.html?submit=1&tracking-id=${encodeURIComponent(trackingNumber)}`
    default:
      return `https://www.google.com/search?q=${encodeURIComponent(carrier + ' tracking ' + trackingNumber)}`
  }
}

export function ShippingConfirmationEmail({
  customerFirstName,
  orderId: _orderId,
  carrier,
  trackingNumber,
  estimatedDelivery,
}: ShippingConfirmationEmailProps) {
  const trackingUrl = getTrackingUrl(carrier, trackingNumber)

  return (
    <BaseLayout title="Your Order is On Its Way!">
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
        Great news! Your order has shipped and is on its way to you.
      </p>

      {/* Tracking Info Card */}
      <table
        role="presentation"
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          marginBottom: '24px',
          backgroundColor: '#FFFFFF',
          border: '1px solid #E8E4DF',
          borderRadius: '6px',
        }}
      >
        <tbody>
          <tr>
            <td style={{ padding: '16px' }}>
              <p
                style={{
                  margin: '0 0 8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#6A6A6A',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                Carrier
              </p>
              <p
                style={{
                  margin: '0 0 16px',
                  fontSize: '16px',
                  color: '#1A1A1A',
                  fontWeight: 600,
                }}
              >
                {carrier}
              </p>
              <p
                style={{
                  margin: '0 0 8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#6A6A6A',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                Tracking Number
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: '16px',
                  color: '#1A1A1A',
                  fontWeight: 600,
                }}
              >
                {trackingNumber}
              </p>
            </td>
          </tr>
        </tbody>
      </table>

      {/* CTA Button */}
      <table
        role="presentation"
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          marginBottom: '24px',
        }}
      >
        <tbody>
          <tr>
            <td align="center">
              <a
                href={trackingUrl}
                style={{
                  display: 'inline-block',
                  backgroundColor: '#D4A843',
                  color: '#1A1A1A',
                  fontSize: '16px',
                  fontWeight: 700,
                  textDecoration: 'none',
                  padding: '14px 32px',
                  borderRadius: '6px',
                }}
              >
                Track Your Package
              </a>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Optional Estimated Delivery */}
      {estimatedDelivery && (
        <p
          style={{
            margin: '16px 0 0',
            fontSize: '14px',
            color: '#4A4A4A',
            lineHeight: 1.5,
          }}
        >
          <strong>Estimated Delivery:</strong> {estimatedDelivery}
        </p>
      )}

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
