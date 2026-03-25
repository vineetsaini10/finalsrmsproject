import { useEffect } from 'react'
import { useRouter } from 'next/router'
export default function OldReport() {
  const router = useRouter()
  useEffect(() => { router.replace('/citizen/report') }, [])
  return null
}
