import React from 'react'
import { BaseLayout } from './BaseLayout'

// ============================================================================
// DeliveryConfirmationEmail — JHB delivery confirmation React Email component
// ============================================================================
// Congratulates customer on delivery, shows optional tracking details,
// and provides a "View Delivery Details" CTA when carrier + tracking present.
// ============================================================================

interface DeliveryConfirmationEmailProps {
  customerFirstName: string
  orderId: string
  carrier?: string
  trackingNumber?: string
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

export function DeliveryConfirmationEmail({
  customerFirstName,
  orderId,
  carrier,
  trackingNumber,
}: DeliveryConfirmationEmailProps) {
  const hasTracking = carrier && trackingNumber
  const trackingUrl = hasTracking ? getTrackingUrl(carrier, trackingNumber) : null

  return (
    <BaseLayout title="Your Order Has Been Delivered!">
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
        Great news! Your Jamaica House Brand order has been delivered. We hope you enjoy every drop!
      </p>

      {/* Order ID Reference */}
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
                Order ID
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: '16px',
                  color: '#1A1A1A',
                  fontWeight: 600,
                }}
              >
                {orderId}
              </p>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Optional: View Delivery Details CTA */}
      {hasTracking && trackingUrl && (
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
                  View Delivery Details
                </a>
              </td>
            </tr>
          </tbody>
        </table>
      )}

      {/* Need help section */}
      <p
        style={{
          margin: '24px 0 0',
          fontSize: '14px',
          color: '#4A4A4A',
          lineHeight: 1.5,
        }}
      >
        <strong>Need help?</strong> Reach us at{' '}
        <a
          href="mailto:orders@jamaicahousebrand.com"
          style={{ color: '#D4A843', textDecoration: 'none' }}
        >
          orders@jamaicahousebrand.com
        </a>{' '}
        and we&apos;ll take care of you.
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
