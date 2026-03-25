import { useEffect } from 'react'
import { useRouter } from 'next/router'
export default function OldLearn() {
  const router = useRouter()
  useEffect(() => { router.replace('/citizen/learn') }, [])
  return null
}
