interface ProductCalloutsProps {
  callouts: string[]
}

// Icon mapping for different callout types
const getCalloutIcon = (callout: string) => {
  const lowerCallout = callout.toLowerCase()

  if (lowerCallout.includes('natural')) {
    // Leaf icon for "All Natural"
    return (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
      </svg>
    )
  }

  if (lowerCallout.includes('year') || lowerCallout.includes('recipe')) {
    // Clock icon for "30-Year Recipe"
    return (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  }

  // Default checkmark for everything else (including "Zero Calories")
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  )
}

export default function ProductCallouts({ callouts }: ProductCalloutsProps) {
  return (
    <div className="flex flex-wrap gap-3 my-6">
      {callouts.map((callout) => (
        <div
          key={callout}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-gold/10 border border-brand-gold/30 text-brand-gold text-sm font-medium"
        >
          {getCalloutIcon(callout)}
          <span>{callout}</span>
        </div>
      ))}
    </div>
  )
}
