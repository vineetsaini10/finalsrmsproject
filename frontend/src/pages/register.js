import { useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { authAPI } from '../utils/api'

export default function RegisterPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [demoOTP, setDemoOTP] = useState('')
  const [form, setForm] = useState({ name: '', phone: '', email: '', password: '', otp: '', role: 'citizen' })

  const handleRegister = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const resp = await authAPI.register({
        name: form.name, 
        phone: form.phone, 
        email: form.email, 
        password: form.password,
        role: form.role
      })
      toast.success('OTP sent to your phone!')
      if (resp?.data?.otp) {
        setDemoOTP(resp.data.otp)
      }
      setStep(2)
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.error || 'Registration failed')
    } finally { setLoading(false) }
  }

  const handleVerify = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await authAPI.verifyOTP(form.phone, form.otp)
      toast.success('Phone verified! Welcome to SwachhaNet 🌿')
      router.push('/login')
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.error || 'OTP verification failed')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-green-950 to-slate-900 flex">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center px-16 text-white">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-12 h-12 rounded-2xl bg-green-500 flex items-center justify-center text-2xl shadow-lg">🌿</div>
          <div>
            <div className="text-2xl font-bold">SwachhaNet</div>
            <div className="text-green-400 text-sm">Digital Brain for Waste Management</div>
          </div>
        </div>
        <h1 className="text-4xl font-bold leading-tight mb-4">
          Join the Movement<br/>for Cleaner Cities
        </h1>
        <p className="text-slate-400 text-lg mb-10 leading-relaxed">
          Register as a citizen to report waste, earn eco points, participate in quizzes,
          and help make your neighbourhood cleaner.
        </p>
        <div className="space-y-4">
          {[
            { icon: '🌱', title: 'Earn Eco Points', desc: 'Get rewarded for every waste report you submit' },
            { icon: '🏆', title: 'Climb the Leaderboard', desc: 'Compete with neighbours to be the top eco citizen' },
            { icon: '📚', title: 'Learn & Grow', desc: 'Take quizzes and learn about waste management' },
            { icon: '📍', title: 'Track Your Impact', desc: 'See how your reports are resolved in real time' },
          ].map(f => (
            <div key={f.title} className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-xl p-4">
              <span className="text-2xl flex-shrink-0">{f.icon}</span>
              <div>
                <div className="font-semibold text-sm">{f.title}</div>
                <div className="text-slate-400 text-xs mt-0.5">{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="auth-card w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-6">
            <div className="w-9 h-9 rounded-xl bg-green-600 flex items-center justify-center text-xl">🌿</div>
            <div className="font-bold text-slate-800">SwachhaNet</div>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-6">
            {[1, 2].map(s => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all
                  ${step >= s ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                  {step > s ? '✓' : s}
                </div>
                <span className={`text-xs font-medium ${step >= s ? 'text-green-600' : 'text-slate-400'}`}>
                  {s === 1 ? 'Your Details' : 'Verify OTP'}
                </span>
                {s < 2 && <div className={`flex-1 h-px ${step > s ? 'bg-green-400' : 'bg-slate-200'}`} />}
              </div>
            ))}
          </div>

          {step === 1 ? (
            <>
              <h2 className="text-2xl font-bold text-slate-900 mb-1">Create account</h2>
              <p className="text-sm text-slate-500 mb-6">Fill in your details to get started</p>
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="label">Full Name</label>
                  <input className="input" placeholder="Rahul Kumar" value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div>
                  <label className="label">Mobile Number</label>
                  <input className="input" type="tel" placeholder="+919876543210" value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })} required />
                </div>
                <div>
                  <label className="label">Email <span className="text-slate-400 font-normal">(optional)</span></label>
                  <input className="input" type="email" placeholder="rahul@example.com" value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })} />
                </div>
                <div>
                  <label className="label">Password</label>
                  <input className="input" type="password" placeholder="Minimum 6 characters" value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })} required minLength={6} />
                </div>
                <div>
                  <label className="label">Register as</label>
                  <div className="grid grid-cols-2 gap-3">
                    {['citizen', 'authority'].map(r => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setForm({ ...form, role: r })}
                        className={`py-2 px-4 rounded-xl border text-sm font-medium transition-all ${
                          form.role === r 
                            ? 'bg-green-600 border-green-600 text-white shadow-lg shadow-green-900/20' 
                            : 'bg-white border-slate-200 text-slate-600 hover:border-green-200 hover:bg-green-50'
                        }`}
                      >
                        {r.charAt(0).toUpperCase() + r.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 mt-2">
                  {loading ? 'Creating account...' : 'Create Account & Send OTP'}
                </button>
              </form>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-slate-900 mb-1">Verify your phone</h2>
              <p className="text-sm text-slate-500 mb-6">Enter the 6-digit OTP sent to <strong>{form.phone}</strong></p>
              {!!demoOTP && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <p className="text-xs text-amber-700 font-semibold">Demo OTP</p>
                  <p className="text-lg font-bold tracking-[0.3em] text-amber-900 mt-1">{demoOTP}</p>
                </div>
              )}
              <form onSubmit={handleVerify} className="space-y-4">
                <div>
                  <label className="label">One-Time Password</label>
                  <input className="input text-center text-2xl font-bold tracking-[0.5em]"
                    placeholder="• • • • • •" value={form.otp}
                    onChange={e => setForm({ ...form, otp: e.target.value })}
                    maxLength={6} required />
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
                  {loading ? 'Verifying...' : 'Verify & Continue'}
                </button>
                <button type="button"
                  onClick={() => authAPI.sendOTP(form.phone).then((resp) => {
                    if (resp?.data?.otp) setDemoOTP(resp.data.otp)
                    toast.success('OTP resent!')
                  })}
                  className="w-full text-sm text-green-600 hover:underline text-center">
                  Didn't receive it? Resend OTP
                </button>
              </form>
            </>
          )}

          <div className="mt-5 text-center text-sm text-slate-500">
            Already have an account?{' '}
            <Link href="/login" className="text-green-600 font-medium hover:underline">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
