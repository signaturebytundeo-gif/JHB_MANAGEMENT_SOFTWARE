import Link from 'next/link'
import Image from 'next/image'

export default function Footer() {
  return (
    <footer className="bg-brand-dark border-t border-brand-gold/20">
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Main Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Column 1 - Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Image
                src="/images/hummingbird-logo.png"
                alt="Jamaica House Brand"
                width={48}
                height={48}
              />
              <span className="font-semibold text-white text-lg">Jamaica House Brand</span>
            </div>
            <p className="text-gray-400 text-sm">30 Years of Flavor</p>
          </div>

          {/* Column 2 - Quick Links */}
          <div>
            <h4 className="font-semibold text-white mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/shop" className="text-gray-400 hover:text-brand-gold transition-colors">
                  Shop
                </Link>
              </li>
              <li>
                <Link href="/our-story" className="text-gray-400 hover:text-brand-gold transition-colors">
                  Our Story
                </Link>
              </li>
              <li>
                <Link href="/recipes" className="text-gray-400 hover:text-brand-gold transition-colors">
                  Recipes
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3 - Contact */}
          <div>
            <h4 className="font-semibold text-white mb-4">Contact</h4>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li>
                <a href="mailto:info@jamaicahousebrand.com" className="hover:text-brand-gold transition-colors">
                  info@jamaicahousebrand.com
                </a>
              </li>
              <li className="mt-4 pt-4 border-t border-brand-gold/10">
                <div className="font-semibold text-white mb-2">Restaurant Locations</div>
                <a href="https://www.google.com/maps/search/?api=1&query=19555+NW+2nd+Ave+Miami+FL+33169" target="_blank" rel="noopener noreferrer" className="block hover:text-brand-gold transition-colors">Miami (The Original)</a>
                <a href="https://www.google.com/maps/search/?api=1&query=3351+W+Broward+Blvd+Fort+Lauderdale+FL+33312" target="_blank" rel="noopener noreferrer" className="block hover:text-brand-gold transition-colors">Fort Lauderdale</a>
                <div>Miramar (Coming Soon)</div>
              </li>
            </ul>
          </div>

          {/* Column 4 - Follow Us */}
          <div>
            <h4 className="font-semibold text-white mb-4">Follow Us</h4>
            <ul className="space-y-3 mb-6">
              <li>
                <a href="#" className="text-gray-400 hover:text-brand-gold transition-colors flex items-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                  Instagram
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-brand-gold transition-colors flex items-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  Facebook
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-brand-gold transition-colors flex items-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
                  </svg>
                  TikTok
                </a>
              </li>
            </ul>

            <div className="pt-4 border-t border-brand-gold/10">
              <h5 className="font-semibold text-white mb-2 text-sm">Payment Methods</h5>
              <div className="text-gray-400 text-xs space-y-1">
                <div>Visa, Mastercard, Amex</div>
                <div>Apple Pay, Google Pay</div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-brand-gold/10 flex flex-col md:flex-row justify-between items-center gap-4 text-gray-400 text-sm">
          <p>&copy; 2024 Jamaica House Brand. All rights reserved.</p>
          <p>Made with love in South Florida</p>
        </div>
      </div>
    </footer>
  )
}
