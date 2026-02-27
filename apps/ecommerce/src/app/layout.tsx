import type { Metadata } from "next";
import { Suspense } from "react";
import { plusJakarta } from "@/lib/fonts";
import Navigation from "@/components/navigation/Navigation";
import Footer from "@/components/layout/Footer";
import CartDrawer from "@/components/CartDrawer";
import FreeSamplePopup from "@/components/FreeSamplePopup";
import UpsellModal from "@/components/UpsellModal";
import GoogleAnalytics from "@/components/analytics/GoogleAnalytics";
import MetaPixel from "@/components/analytics/MetaPixel";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL('https://jamaicahousebrand.com'),
  title: {
    template: '%s | Jamaica House Brand',
    default: 'Jamaica House Brand - Authentic Jamaican Jerk Sauce',
  },
  description: 'Authentic Jamaican jerk sauce with 30+ years of restaurant heritage. Shop our collection of all-natural, zero-calorie sauces.',
  keywords: ['jerk sauce', 'jamaican sauce', 'authentic jerk', 'caribbean sauce', 'jamaica house brand', 'all natural sauce'],
  authors: [{ name: 'Jamaica House Brand' }],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'Jamaica House Brand',
  },
  twitter: {
    card: 'summary_large_image',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large' as const,
      'max-snippet': -1,
    },
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
        <div className="flex flex-col min-h-screen">
          <Navigation />
          <main className="flex-1">
            {children}
          </main>
          <Footer />
        </div>
        <CartDrawer />
        <FreeSamplePopup />
        <UpsellModal />
        <Suspense fallback={null}>
          <MetaPixel />
        </Suspense>
      </body>
      <GoogleAnalytics />
    </html>
  );
}
