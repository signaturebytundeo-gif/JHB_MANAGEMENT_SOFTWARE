import Link from 'next/link'

export default function StoryCTA() {
  return (
    <section className="py-24 px-4 bg-gradient-to-b from-brand-dark to-black">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-4xl font-bold text-white mb-6">
          Ready to Taste the Authentic Flavor?
        </h2>
        <p className="text-xl text-gray-300 mb-8">
          Bring Chef Anthony&apos;s restaurant recipes to your kitchen
        </p>
        <Link
          href="/shop"
          className="inline-block bg-brand-gold text-brand-dark font-bold py-4 px-8 rounded-lg text-lg hover:bg-brand-gold-light transition-colors"
        >
          Shop Our Sauces
        </Link>
      </div>
    </section>
  )
}
