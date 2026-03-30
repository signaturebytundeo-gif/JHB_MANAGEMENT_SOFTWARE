import type { Metadata } from "next";
import { Suspense } from "react";
import { plusJakarta } from "@/lib/fonts";
import Navigation from "@/components/navigation/Navigation";
import Footer from "@/components/layout/Footer";
import FreeShippingBar from "@/components/layout/FreeShippingBar";
import CartDrawer from "@/components/CartDrawer";
import FreeSamplePopup from "@/components/FreeSamplePopup";
import UpsellModal from "@/components/UpsellModal";
import ExitIntentPopup from "@/components/ExitIntentPopup";
import GoogleAnalytics from "@/components/analytics/GoogleAnalytics";
import MetaPixel from "@/components/analytics/MetaPixel";
import { generateOrganizationJsonLd, generateWebSiteJsonLd, sanitizeJsonLd } from "@/lib/seo";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL('https://jamaicahousebrand.com'),
  title: {
    template: '%s | Jamaica House Brand',
    default: 'Jamaica House Brand - Authentic Jamaican Jerk Sauce | Shop Online',
  },
  description: 'Authentic Jamaican jerk sauce with 30+ years of restaurant heritage. Shop our collection of all-natural, zero-calorie sauces. Free shipping on orders over $50.',
  keywords: [
    'jerk sauce', 'jamaican jerk sauce', 'authentic jerk sauce', 'caribbean sauce',
    'jamaica house brand', 'all natural sauce', 'zero calorie sauce', 'scotch bonnet sauce',
    'jamaican hot sauce', 'jerk marinade', 'caribbean seasoning', 'jamaican condiment',
    'escovitch pikliz', 'buy jerk sauce online', 'best jerk sauce',
  ],
  authors: [{ name: 'Jamaica House Brand' }],
  creator: 'Jamaica House Brand',
  publisher: 'Jamaica House Brand',
  category: 'Food & Beverages',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'Jamaica House Brand',
    images: [{
      url: '/images/og-default.jpg',
      width: 1200,
      height: 630,
      alt: 'Jamaica House Brand - Authentic Jamaican Jerk Sauce',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@jamaicahousebrand',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large' as const,
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  alternates: {
    canonical: 'https://jamaicahousebrand.com',
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${plusJakarta.variable} dark`}>
      <body className="bg-brand-dark text-white antialiased">
        {/* Organization + WebSite structured data for Google Knowledge Panel */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: sanitizeJsonLd(generateOrganizationJsonLd()) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: sanitizeJsonLd(generateWebSiteJsonLd()) }}
        />
        <div className="flex flex-col min-h-screen">
          <FreeShippingBar />
          <Navigation />
          <main className="flex-1">
            {children}
          </main>
          <Footer />
        </div>
        <CartDrawer />
        <FreeSamplePopup />
        <UpsellModal />
        <ExitIntentPopup />
        <Suspense fallback={null}>
          <MetaPixel />
        </Suspense>
      </body>
      <GoogleAnalytics />
    </html>
  );
}
