import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface CartItem {
  id: string
  name: string
  price: number // in cents
  quantity: number
  image: string
  size: string
  isFreeSample?: boolean
  isBundle?: boolean
}

interface CartStore {
  items: CartItem[]
  isOpen: boolean
  addItem: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void
  updateQuantity: (id: string, quantity: number) => void
  removeItem: (id: string) => void
  clearCart: () => void
  openCart: () => void
  closeCart: () => void
  totalItems: number
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      addItem: (item, quantity = 1) => {
        set((state) => {
          const existingItem = state.items.find((i) => i.id === item.id)

          if (existingItem) {
            // Free samples should not stack via addItem (use +/- controls instead)
            if (item.isFreeSample) return state

            // Item already exists, increment quantity
            return {
              items: state.items.map((i) =>
                i.id === item.id
                  ? { ...i, quantity: i.quantity + quantity }
                  : i
              ),
            }
          } else {
            // If adding the regular 2oz jerk sauce while a free sample exists,
            // merge into the free sample item by incrementing its quantity.
            // The checkout route handles pricing: 1st unit free, rest at $5.24.
            if (item.id === 'jerk-sauce-2oz') {
              const freeSample = state.items.find((i) => i.id === 'free-sample-2oz')
              if (freeSample) {
                return {
                  items: state.items.map((i) =>
                    i.id === 'free-sample-2oz'
                      ? { ...i, quantity: i.quantity + quantity }
                      : i
                  ),
                }
              }
            }

            // Add new item
            return {
              items: [...state.items, { ...item, quantity }],
            }
          }
        })
      },

      updateQuantity: (id, quantity) => {
        set((state) => {
          if (quantity <= 0) {
            // Remove item if quantity is 0 or less
            return {
              items: state.items.filter((item) => item.id !== id),
            }
          }

          return {
            items: state.items.map((item) =>
              item.id === id ? { ...item, quantity } : item
            ),
          }
        })
      },

      removeItem: (id) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        }))
      },

      clearCart: () => {
        set({ items: [] })
      },

      openCart: () => {
        set({ isOpen: true })
      },

      closeCart: () => {
        set({ isOpen: false })
      },

      get totalItems() {
        return get().items.reduce((sum, item) => sum + item.quantity, 0)
      },
    }),
    {
      name: 'jamaica-house-cart',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items }),
      skipHydration: true,
    }
  )
)
