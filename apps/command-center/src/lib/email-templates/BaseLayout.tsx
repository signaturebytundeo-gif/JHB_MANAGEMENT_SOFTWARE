import React from 'react'

// ============================================================================
// BaseLayout — Shared JHB email wrapper
// ============================================================================
// Dark #1A1A1A header with gold monogram, cream #FAF8F5 body, dark green
// #2D5016 footer. All styles are inline — email clients strip CSS classes.
// ============================================================================

interface BaseLayoutProps {
  title: string
  children: React.ReactNode
}

export function BaseLayout({ title, children }: BaseLayoutProps) {
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
                          {title}
                        </h1>
                      </td>
                    </tr>

                    {/* Body */}
                    <tr>
                      <td
                        style={{
                          padding: '32px',
                          backgroundColor: '#FAF8F5',
                        }}
                      >
                        {children}
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
                          Questions? Reach us at info@jamaicahousebrand.com
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
