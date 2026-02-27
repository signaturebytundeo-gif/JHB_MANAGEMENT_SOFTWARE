import { create } from 'zustand'

const STORAGE_KEY = 'jhb-free-sample-dismissed'
const EXPIRY_DAYS = 7

function isDismissedRecently(): boolean {
  if (typeof window === 'undefined') return false
  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) return false
  const dismissedAt = parseInt(stored, 10)
  const expiryMs = EXPIRY_DAYS * 24 * 60 * 60 * 1000
  return Date.now() - dismissedAt < expiryMs
}

interface SampleStore {
  popupShown: boolean
  popupDismissed: boolean
  showUpsell: boolean
  setPopupShown: () => void
  dismissPopup: () => void
  openUpsell: () => void
  closeUpsell: () => void
}

export const useSampleStore = create<SampleStore>((set) => ({
  popupShown: false,
  popupDismissed: false,
  showUpsell: false,

  setPopupShown: () => set({ popupShown: true }),

  dismissPopup: () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, Date.now().toString())
    }
    set({ popupDismissed: true })
  },

  openUpsell: () => set({ showUpsell: true }),

  closeUpsell: () => set({ showUpsell: false }),
}))

export { isDismissedRecently }
