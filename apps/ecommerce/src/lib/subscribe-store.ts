import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const EXPIRY_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

export function isDismissedRecently(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const raw = localStorage.getItem('jhb-subscribe-state')
    if (!raw) return false
    const parsed = JSON.parse(raw)
    const dismissedAt: number | null = parsed?.state?.dismissedAt ?? null
    if (!dismissedAt) return false
    return Date.now() - dismissedAt < EXPIRY_MS
  } catch {
    return false
  }
}

interface SubscribeStore {
  isSubscribed: boolean
  popupDismissed: boolean
  dismissedAt: number | null
  subscribe: () => void
  dismissPopup: () => void
}

export const useSubscribeStore = create<SubscribeStore>()(
  persist(
    (set) => ({
      isSubscribed: false,
      popupDismissed: false,
      dismissedAt: null,

      subscribe: () => set({ isSubscribed: true }),

      dismissPopup: () =>
        set({ popupDismissed: true, dismissedAt: Date.now() }),
    }),
    {
      name: 'jhb-subscribe-state',
      skipHydration: true,
    }
  )
)
