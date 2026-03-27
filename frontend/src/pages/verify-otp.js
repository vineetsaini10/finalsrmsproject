import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import toast from 'react-hot-toast'
import Cookies from 'js-cookie'
import { authAPI } from '../utils/api'
import useAuthStore from '../context/authStore'

export default function VerifyOtpPage() {
  const router = useRouter()
  const { phone = '' } = router.query
  const updateUser = useAuthStore(s => s.updateUser)
  const [otp, setOtp] = useState('')
  const [demoOTP, setDemoOTP] = useState('')
  const [sending, setSending] = useState(false)
  const [verifying, setVerifying] = useState(false)

  const sendOtp = async () => {
    if (!phone) return
    setSending(true)
    try {
      const resp = await authAPI.sendOTP(phone)
      if (resp?.data?.otp) setDemoOTP(resp.data.otp)
      toast.success('OTP sent')
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.error || 'Failed to send OTP')
    } finally {
      setSending(false)
    }
  }

  useEffect(() => {
    if (!router.isReady || !phone) return
    sendOtp()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, phone])

  const verifyOtp = async (e) => {
    e.preventDefault()
    setVerifying(true)
    try {
      const resp = await authAPI.verifyOTP(phone, otp)
      const data = resp?.data || {}
      Cookies.set('accessToken', data.accessToken, { expires: 1 / 96 })
      Cookies.set('refreshToken', data.refreshToken, { expires: 7 })
      try {
        const me = await authAPI.me()
        updateUser(me?.data || {})
      } catch {}
      toast.success('Phone verified successfully')
      router.push('/login')
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.error || 'OTP verification failed')
    } finally {
      setVerifying(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-green-950 to-slate-900 flex items-center justify-center p-6">
      <div className="auth-card w-full max-w-md">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Verify OTP</h1>
        <p className="text-sm text-slate-500 mb-6">
          Enter OTP for <strong>{phone || 'your number'}</strong>
        </p>

        {!!demoOTP && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-xs text-amber-700 font-semibold">Demo OTP</p>
            <p className="text-lg font-bold tracking-[0.3em] text-amber-900 mt-1">{demoOTP}</p>
          </div>
        )}

        <form onSubmit={verifyOtp} className="space-y-4">
          <div>
            <label className="label">One-Time Password</label>
            <input
              className="input text-center text-2xl font-bold tracking-[0.5em]"
              placeholder="• • • • • •"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              maxLength={6}
              required
            />
          </div>
          <button type="submit" disabled={verifying || !phone} className="btn-primary w-full py-2.5">
            {verifying ? 'Verifying...' : 'Verify OTP'}
          </button>
          <button type="button" onClick={sendOtp} disabled={sending || !phone} className="w-full text-sm text-green-600 hover:underline text-center">
            {sending ? 'Sending...' : 'Resend OTP'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-500">
          Back to <Link href="/login" className="text-green-600 hover:underline">Login</Link>
        </p>
      </div>
    </div>
  )
}
