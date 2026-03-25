import { useEffect } from 'react'
import { useRouter } from 'next/router'
export default function OldLeaderboard() {
  const router = useRouter()
  useEffect(() => { router.replace('/citizen/leaderboard') }, [])
  return null
}
