import { useEffect } from 'react'
import { useRouter } from 'next/router'
export default function OldDashboard() {
  const router = useRouter()
  useEffect(() => { router.replace('/citizen/dashboard') }, [])
  return null
}
