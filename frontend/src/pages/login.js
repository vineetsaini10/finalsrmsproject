import { useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import toast from 'react-hot-toast'
import useAuthStore from '../context/authStore'

export default function LoginPage() {
  const router  = useRouter()
  const login   = useAuthStore(s => s.login)
  const [form, setForm]     = useState({ phone: '', password: '' })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { role } = await login(form.phone, form.password)
      toast.success('Welcome back!')
      router.push(role === 'authority' || role === 'admin' ? '/authority/dashboard' : '/citizen/dashboard')
    } catch (err) {
      const msg = err.response?.data?.error || 'Invalid credentials'
      if (err.response?.data?.code === 'UNVERIFIED') {
        toast.error('Phone not verified')
        router.push(`/verify-otp?phone=${form.phone}`)
      } else {
        toast.error(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-green-950 to-slate-900 flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center px-16 text-white">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-12 h-12 rounded-2xl bg-green-500 flex items-center justify-center text-2xl shadow-lg">🌿</div>
          <div>
            <div className="text-2xl font-bold">SwachhaNet</div>
            <div className="text-green-400 text-sm">Digital Brain for Waste Management</div>
          </div>
        </div>
        <h1 className="text-4xl font-bold leading-tight mb-4">
          Cleaner Cities,<br/>Smarter Management
        </h1>
        <p className="text-slate-400 text-lg mb-10 leading-relaxed">
          AI-powered waste management platform for Indian Urban Local Bodies.
          Report, track, and resolve waste issues in real time.
        </p>
        <div className="grid grid-cols-2 gap-4">
          {[
            { icon: '📸', title: 'AI Detection',     desc: 'Classify waste from photos instantly' },
            { icon: '🗺️', title: 'Live Heatmaps',    desc: 'Visualize complaint clusters on maps' },
            { icon: '🏆', title: 'Gamification',      desc: 'Earn points and badges for reporting' },
            { icon: '📊', title: 'Smart Analytics',   desc: 'Predictive insights for authorities' },
          ].map(f => (
            <div key={f.title} className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="text-2xl mb-2">{f.icon}</div>
              <div className="font-semibold text-sm mb-1">{f.title}</div>
              <div className="text-slate-400 text-xs">{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="auth-card w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-6">
            <div className="w-9 h-9 rounded-xl bg-green-600 flex items-center justify-center text-xl">🌿</div>
            <div className="font-bold text-slate-800">SwachhaNet</div>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 mb-1">Welcome back</h2>
          <p className="text-sm text-slate-500 mb-6">Sign in to your account</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Mobile Number</label>
              <input type="tel" placeholder="+919876543210" className="input"
                value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} required />
            </div>
            <div>
              <label className="label">Password</label>
              <input type="password" placeholder="Enter your password" className="input"
                value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 mt-2">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-4">
            New to SwachhaNet?{' '}
            <Link href="/register" className="text-green-600 font-medium hover:underline">Create account</Link>
          </p>

          {/* Demo credentials */}
          <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
            <p className="text-xs font-semibold text-blue-700 mb-2">Demo Credentials</p>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600">Citizen</span>
                <code className="bg-white px-2 py-0.5 rounded text-slate-700 border border-slate-200">+919876543210 / citizen123</code>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600">Authority</span>
                <code className="bg-white px-2 py-0.5 rounded text-slate-700 border border-slate-200">+919876543211 / authority123</code>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
