import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { gamificationAPI } from '../../utils/api'
import useAuthStore from '../../context/authStore'
import CitizenLayout from '../../components/shared/CitizenLayout'
import { SectionCard, StatCard } from '../../components/ui'
import { useRouter } from 'next/router'
import toast from 'react-hot-toast'

const LEVEL_NAMES   = ['', 'Eco Beginner', 'Green Citizen', 'Eco Warrior', 'Waste Champion', 'Eco Hero', 'Planet Guardian']
const LEVEL_THRESH  = [0, 100, 300, 600, 1000, 1500, 2500]
const BADGE_LABELS  = {
  first_report: 'First Report 📸', reporter_5: 'Active Reporter 🌿', reporter_25: 'Waste Warrior ⚔️',
  quiz_master: 'Quiz Master 🧠', eco_learner: 'Eco Learner 📚', streak_7: '7-Day Streak 🔥',
  streak_30: 'Monthly Hero 🏅', level_5: 'Eco Champion 🏆',
}

export default function ProfilePage() {
  const router = useRouter()
  const { user, logout } = useAuthStore()

  const { data: g } = useQuery({
    queryKey: ['gamification-me'],
    queryFn:  () => gamificationAPI.me(),
    select: d => d.data,
  })

  const level          = g?.level || 1
  const points         = g?.totalPoints || 0
  const nextThreshold  = LEVEL_THRESH[level] || 2500
  const prevThreshold  = LEVEL_THRESH[level - 1] || 0
  const progress       = nextThreshold > prevThreshold
    ? Math.min(100, Math.round(((points - prevThreshold) / (nextThreshold - prevThreshold)) * 100))
    : 100

  const handleLogout = async () => {
    await logout()
    toast.success('Signed out')
    router.push('/login')
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">My Profile</h1>
          <p className="page-sub">Your eco journey and achievements</p>
        </div>
        <button onClick={handleLogout} className="btn-secondary text-red-500 border-red-200 hover:bg-red-50">
          🚪 Sign Out
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile card */}
        <div className="lg:col-span-1 space-y-5">
          <div className="card p-6 text-center">
            <div className="w-20 h-20 rounded-full bg-green-100 border-4 border-green-200 flex items-center justify-center text-3xl font-bold text-green-700 mx-auto mb-4">
              {user?.name?.[0] || 'U'}
            </div>
            <h2 className="text-xl font-bold text-slate-900">{user?.name}</h2>
            <p className="text-sm text-slate-500 mt-1">{user?.phone}</p>
            {user?.email && <p className="text-sm text-slate-400">{user?.email}</p>}
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-sm font-semibold border border-green-100">
              🌿 Level {level} — {LEVEL_NAMES[level] || 'Master'}
            </div>
            {user?.wardName && (
              <p className="text-xs text-slate-400 mt-2">📍 {user.wardName}, {user.city}</p>
            )}
          </div>

          {/* Level progress */}
          <div className="card p-5 bg-gradient-to-br from-green-50 to-emerald-50 border-green-100">
            <div className="flex justify-between text-sm mb-2">
              <span className="font-semibold text-green-800">Eco Points</span>
              <span className="font-bold text-green-700">{points.toLocaleString()} / {nextThreshold.toLocaleString()}</span>
            </div>
            <div className="w-full bg-green-200 rounded-full h-3 mb-3 overflow-hidden">
              <div className="h-3 bg-green-600 rounded-full transition-all duration-700" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-xs text-green-600">{progress}% to Level {level + 1}</p>
            {(g?.streakDays || 0) > 0 && (
              <div className="mt-3 flex items-center gap-2 text-sm font-semibold text-amber-600">
                🔥 {g.streakDays}-day active streak!
              </div>
            )}
          </div>
        </div>

        {/* Stats + badges */}
        <div className="lg:col-span-2 space-y-5">
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <StatCard label="Reports Submitted" value={g?.reportsCount  || 0} icon="📸" color="blue"   />
            <StatCard label="Quizzes Passed"    value={g?.quizzesPassed || 0} icon="🧠" color="purple" />
            <StatCard label="Streak Days"        value={g?.streakDays   || 0} icon="🔥" color="amber"  />
          </div>

          {/* Badges */}
          <SectionCard title="🏅 Earned Badges" subtitle="Badges you've unlocked through your eco journey">
            <div className="p-5">
              {(g?.badges || []).length === 0 ? (
                <div className="text-center py-6 text-slate-400">
                  <div className="text-4xl mb-2">🌱</div>
                  <p className="text-sm">No badges yet — start reporting waste to earn your first badge!</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {(g?.badges || []).map(b => (
                    <div key={b} className="p-3 bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100 rounded-xl text-center">
                      <div className="text-2xl mb-1.5">{BADGE_LABELS[b]?.split(' ').slice(-1)[0] || '🏅'}</div>
                      <div className="text-xs font-semibold text-green-800">{BADGE_LABELS[b]?.replace(/[^\w\s]/gi, '').trim() || b.replace(/_/g,' ')}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </SectionCard>

          {/* All possible badges — locked state */}
          <SectionCard title="🔒 Locked Badges" subtitle="Badges you can still earn">
            <div className="p-5">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {Object.entries(BADGE_LABELS)
                  .filter(([key]) => !(g?.badges || []).includes(key))
                  .map(([key, label]) => (
                    <div key={key} className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-center opacity-50 grayscale">
                      <div className="text-2xl mb-1.5">🔒</div>
                      <div className="text-xs font-medium text-slate-500">{label.replace(/[^\w\s]/gi, '').trim()}</div>
                    </div>
                  ))
                }
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  )
}

ProfilePage.getLayout = page => <CitizenLayout>{page}</CitizenLayout>
