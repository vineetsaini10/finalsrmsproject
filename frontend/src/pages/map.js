import { useEffect } from 'react'
import { useRouter } from 'next/router'
export default function OldMap() {
  const router = useRouter()
  useEffect(() => { router.replace('/citizen/map') }, [])
  return null
}
