import { useEffect } from 'react'
import { useRouter } from 'next/router'
import useAuthStore from '../context/authStore'

export default function Index() {
  const router = useRouter()
  const { isAuthenticated, user } = useAuthStore()
  useEffect(() => {
    if (!isAuthenticated) router.replace('/login')
    else if (user?.role === 'authority' || user?.role === 'admin') router.replace('/authority/dashboard')
    else router.replace('/citizen/dashboard')
  }, [isAuthenticated, user])
  return (
    <div className="min-h-screen bg-green-50 flex items-center justify-center">
      <div className="text-center"><div className="text-5xl mb-3">🌿</div><p className="text-slate-500">Loading SwachhaNet...</p></div>
    </div>
  )
}
