import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import Cookies from 'js-cookie'
import { authAPI } from '../utils/api'

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (phone, password) => {
        set({ isLoading: true })
        try {
          const { data } = await authAPI.login(phone, password)
          Cookies.set('accessToken', data.accessToken, { expires: 1 / 96 })
          Cookies.set('refreshToken', data.refreshToken, { expires: 7 })
          set({ user: data.user, isAuthenticated: true, isLoading: false })
          return { success: true, role: data.user.role }
        } catch (err) {
          set({ isLoading: false })
          throw err
        }
      },

      logout: async () => {
        try {
          const refreshToken = Cookies.get('refreshToken')
          await authAPI.logout(refreshToken)
        } catch {}
        Cookies.remove('accessToken')
        Cookies.remove('refreshToken')
        set({ user: null, isAuthenticated: false })
      },

      fetchMe: async () => {
        try {
          const { data } = await authAPI.me()
          set({ user: data, isAuthenticated: true })
        } catch {
          Cookies.remove('accessToken')
          Cookies.remove('refreshToken')
          set({ user: null, isAuthenticated: false })
        }
      },

      updateUser: (updates) => set(state => ({
        user: { ...state.user, ...updates }
      })),
    }),
    {
      name: 'swachhanet-auth',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
)

export default useAuthStore
