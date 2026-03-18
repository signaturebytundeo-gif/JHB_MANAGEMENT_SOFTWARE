import React from 'react'

// ============================================================================
// WelcomeEmail — JHB subscriber welcome with WELCOME10 discount code
// ============================================================================
// Dark #1A1A1A header with gold JH monogram, cream #FAF8F5 body, dark green
// #2D5016 footer. All styles are inline — email clients strip CSS classes.
// ============================================================================

interface WelcomeEmailProps {
  discountCode?: string
}

export function WelcomeEmail({ discountCode = 'WELCOME10' }: WelcomeEmailProps) {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body
        style={{
          margin: 0,
          padding: 0,
          fontFamily: "'Plus Jakarta Sans', Arial, sans-serif",
          backgroundColor: '#FAF8F5',
        }}
      >
        <table
          role="presentation"
          style={{ width: '100%', borderCollapse: 'collapse' }}
        >
          <tbody>
            <tr>
              <td align="center" style={{ padding: '40px 16px' }}>
                <table
                  role="presentation"
                  style={{
                    width: '600px',
                    maxWidth: '100%',
                    borderCollapse: 'collapse',
                    backgroundColor: '#FFFFFF',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  }}
                >
                  <tbody>
                    {/* Header */}
                    <tr>
                      <td
                        style={{
                          backgroundColor: '#1A1A1A',
                          padding: '32px',
                          textAlign: 'center',
                        }}
                      >
                        <span
                          style={{
                            display: 'inline-block',
                            width: '48px',
                            height: '48px',
                            backgroundColor: '#D4A843',
                            borderRadius: '50%',
                            lineHeight: '48px',
                            fontFamily: "'Plus Jakarta Sans', Arial, sans-serif",
                            fontSize: '20px',
                            fontWeight: 700,
                            color: '#1A1A1A',
                          }}
                        >
                          JH
                        </span>
                        <h1
                          style={{
                            margin: '16px 0 0',
                            color: '#FFFFFF',
                            fontSize: '22px',
                            fontWeight: 600,
                            fontFamily: "'Plus Jakarta Sans', Arial, sans-serif",
                          }}
                        >
                          Welcome to Jamaica House Brand
                        </h1>
                      </td>
                    </tr>

                    {/* Body */}
                    <tr>
                      <td
                        style={{
                          padding: '40px 32px',
                          backgroundColor: '#FAF8F5',
                        }}
                      >
                        {/* Greeting */}
                        <p
                          style={{
                            margin: '0 0 16px',
                            fontSize: '18px',
                            fontWeight: 600,
                            color: '#1A1A1A',
                            fontFamily: "'Plus Jakarta Sans', Arial, sans-serif",
                          }}
                        >
                          Hey there!
                        </p>

                        {/* Welcome message */}
                        <p
                          style={{
                            margin: '0 0 32px',
                            fontSize: '15px',
                            lineHeight: '1.6',
                            color: '#3D3D3D',
                            fontFamily: "'Plus Jakarta Sans', Arial, sans-serif",
                          }}
                        >
                          Thanks for joining the Jamaica House Brand family! As a thank you,
                          here&apos;s 10% off your first order.
                        </p>

                        {/* Discount code box */}
                        <table
                          role="presentation"
                          style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '32px' }}
                        >
                          <tbody>
                            <tr>
                              <td
                                style={{
                                  border: '2px solid #D4A843',
                                  borderRadius: '8px',
                                  padding: '24px',
                                  textAlign: 'center',
                                  backgroundColor: '#FFFDF5',
                                }}
                              >
                                <p
                                  style={{
                                    margin: '0 0 8px',
                                    fontSize: '13px',
                                    color: '#6B6B6B',
                                    letterSpacing: '0.05em',
                                    textTransform: 'uppercase',
                                    fontFamily: "'Plus Jakarta Sans', Arial, sans-serif",
                                  }}
                                >
                                  Your exclusive discount code
                                </p>
                                <p
                                  style={{
                                    margin: '0 0 8px',
                                    fontSize: '32px',
                                    fontWeight: 700,
                                    color: '#1A1A1A',
                                    letterSpacing: '0.1em',
                                    fontFamily: "'Plus Jakarta Sans', Arial, sans-serif",
                                  }}
                                >
                                  {discountCode}
                                </p>
                                <p
                                  style={{
                                    margin: 0,
                                    fontSize: '14px',
                                    color: '#D4A843',
                                    fontWeight: 600,
                                    fontFamily: "'Plus Jakarta Sans', Arial, sans-serif",
                                  }}
                                >
                                  10% off your first order
                                </p>
                              </td>
                            </tr>
                          </tbody>
                        </table>

                        {/* Shop Now CTA button */}
                        <table
                          role="presentation"
                          style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '32px' }}
                        >
                          <tbody>
                            <tr>
                              <td align="center">
                                <a
                                  href="https://jamaicahousebrand.com/shop"
                                  style={{
                                    display: 'inline-block',
                                    backgroundColor: '#D4A843',
                                    color: '#1A1A1A',
                                    fontFamily: "'Plus Jakarta Sans', Arial, sans-serif",
                                    fontSize: '16px',
                                    fontWeight: 700,
                                    textDecoration: 'none',
                                    padding: '14px 40px',
                                    borderRadius: '6px',
                                    letterSpacing: '0.02em',
                                  }}
                                >
                                  Shop Now
                                </a>
                              </td>
                            </tr>
                          </tbody>
                        </table>

                        {/* Small print */}
                        <p
                          style={{
                            margin: 0,
                            fontSize: '12px',
                            color: '#9B9B9B',
                            textAlign: 'center',
                            fontFamily: "'Plus Jakarta Sans', Arial, sans-serif",
                          }}
                        >
                          Use code {discountCode} at checkout. Valid for first-time orders.
                        </p>
                      </td>
                    </tr>

                    {/* Footer */}
                    <tr>
                      <td
                        style={{
                          backgroundColor: '#2D5016',
                          padding: '24px 32px',
                          textAlign: 'center',
                        }}
                      >
                        <p
                          style={{
                            margin: '0 0 4px',
                            color: '#FFFFFF',
                            fontSize: '14px',
                            fontWeight: 600,
                            fontFamily: "'Plus Jakarta Sans', Arial, sans-serif",
                          }}
                        >
                          Jamaica House Brand
                        </p>
                        <p
                          style={{
                            margin: 0,
                            color: '#A8C896',
                            fontSize: '12px',
                            fontFamily: "'Plus Jakarta Sans', Arial, sans-serif",
                          }}
                        >
                          Questions? Reach us at hello@jamaicahousebrand.com
                        </p>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  )
}
