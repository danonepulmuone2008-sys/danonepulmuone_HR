import { create } from "zustand"

export type PendingItem = {
  id: string
  item_name: string
  price: number
  receipt_id: string
  store_name: string
  paid_at: string
  uploader_name: string
}

export type PendingTransfer = {
  id: string
  from_name: string
  amount: number
  note: string | null
  created_at: string
}

interface MealState {
  // 한도/사용/잔여
  monthlyLimit: number
  totalUsed: number
  remaining: number
  // 승인 대기
  pendingItems: PendingItem[]
  pendingTransfers: PendingTransfer[]
  // 로드 여부
  loaded: boolean
  loading: boolean

  // 전체 fetch (홈 진입 시 1회)
  fetchAll: (token: string) => Promise<void>
  // 이벤트 업데이트
  removePendingItem: (itemId: string) => void
  removePendingTransfer: (id: string) => void
  adjustRemaining: (delta: number) => void
}

export const useMealStore = create<MealState>((set, get) => ({
  monthlyLimit: 0,
  totalUsed: 0,
  remaining: 0,
  pendingItems: [],
  pendingTransfers: [],
  loaded: false,
  loading: false,

  fetchAll: async (token: string) => {
    if (get().loading) return
    set({ loading: true })

    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1

    try {
      const [historyRes, pendingItemsRes, pendingTransfersRes] = await Promise.all([
        fetch(`/api/meals/history?year=${year}&month=${month}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/meals/pending-items", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/meals/transfers", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ])

      const [historyData, pendingItemsData, pendingTransfersData] = await Promise.all([
        historyRes.ok ? historyRes.json() : null,
        pendingItemsRes.ok ? pendingItemsRes.json() : [],
        pendingTransfersRes.ok ? pendingTransfersRes.json() : [],
      ])

      set({
        monthlyLimit: historyData?.monthlyLimit ?? 0,
        totalUsed: historyData?.totalUsed ?? 0,
        remaining: historyData?.remaining ?? 0,
        pendingItems: Array.isArray(pendingItemsData) ? pendingItemsData : [],
        pendingTransfers: Array.isArray(pendingTransfersData) ? pendingTransfersData : [],
        loaded: true,
        loading: false,
      })
    } catch {
      set({ loading: false })
    }
  },

  removePendingItem: (itemId: string) => {
    set((s) => ({ pendingItems: s.pendingItems.filter((i) => i.id !== itemId) }))
  },

  removePendingTransfer: (id: string) => {
    set((s) => ({ pendingTransfers: s.pendingTransfers.filter((t) => t.id !== id) }))
  },

  adjustRemaining: (delta: number) => {
    set((s) => ({ remaining: s.remaining + delta }))
  },
}))
