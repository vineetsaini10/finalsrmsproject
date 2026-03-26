import { useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { authAPI, gamificationAPI } from '../../utils/api'
import useAuthStore from '../../context/authStore'
import CitizenLayout from '../../components/shared/CitizenLayout'
import { SectionCard, StatCard } from '../../components/ui'
import toast from 'react-hot-toast'
import { useRouter } from 'next/router'

const LEVEL_THRESH = [0, 100, 300, 600, 1000, 1500, 2500]

export default function ProfilePage() {
  const router = useRouter()
  const { user, updateUser, logout } = useAuthStore()
  const [editMode, setEditMode] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', bio: '', address: '' })

  const { data: me } = useQuery({
    queryKey: ['auth-me'],
    queryFn: () => authAPI.me(),
    select: (res) => res.data,
    onSuccess: (data) => {
      setForm({
        name: data?.name || '',
        email: data?.email || '',
        bio: data?.profile?.bio || '',
        address: data?.profile?.address || '',
      })
      updateUser(data)
    },
  })

  const { data: g } = useQuery({
    queryKey: ['gamification-me'],
    queryFn: () => gamificationAPI.me(),
    select: (res) => res.data,
  })

  const updateMutation = useMutation({
    mutationFn: authAPI.updateMe,
    onSuccess: (res) => {
      updateUser(res.data)
      toast.success('Profile updated')
      setEditMode(false)
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Failed to update profile'),
  })

  const level = g?.level || 1
  const points = g?.totalPoints || 0
  const nextThreshold = LEVEL_THRESH[level] || 2500
  const prevThreshold = LEVEL_THRESH[level - 1] || 0
  const progress = useMemo(() => {
    if (nextThreshold <= prevThreshold) return 100
    return Math.min(100, Math.round(((points - prevThreshold) / (nextThreshold - prevThreshold)) * 100))
  }, [points, nextThreshold, prevThreshold])

  const handleLogout = async () => {
    await logout()
    toast.success('Signed out')
    router.push('/login')
  }

  const handleSave = () => {
    updateMutation.mutate({
      name: form.name,
      email: form.email || undefined,
      profile: {
        bio: form.bio,
        address: form.address,
      },
    })
  }

  const profile = me || user || {}

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">My Profile</h1>
          <p className="page-sub">Manage your account and eco progress</p>
        </div>
        <button onClick={handleLogout} className="btn-secondary text-red-500 border-red-200 hover:bg-red-50">
          Sign Out
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-5">
          <div className="card p-6 text-center">
            <div className="w-20 h-20 rounded-full bg-green-100 border-4 border-green-200 flex items-center justify-center text-3xl font-bold text-green-700 mx-auto mb-4">
              {profile?.name?.[0] || 'U'}
            </div>
            <h2 className="text-xl font-bold text-slate-900">{profile?.name}</h2>
            <p className="text-sm text-slate-500 mt-1">{profile?.phone}</p>
            {profile?.email && <p className="text-sm text-slate-400">{profile.email}</p>}
            {profile?.wardName && (
              <p className="text-xs text-slate-400 mt-2">{profile.wardName}, {profile.city}</p>
            )}
          </div>

          <div className="card p-5 bg-gradient-to-br from-green-50 to-emerald-50 border-green-100">
            <div className="flex justify-between text-sm mb-2">
              <span className="font-semibold text-green-800">Eco Points</span>
              <span className="font-bold text-green-700">{points.toLocaleString()} / {nextThreshold.toLocaleString()}</span>
            </div>
            <div className="w-full bg-green-200 rounded-full h-3 mb-3 overflow-hidden">
              <div className="h-3 bg-green-600 rounded-full transition-all duration-700" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-xs text-green-600">{progress}% to Level {level + 1}</p>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <StatCard label="Reports Submitted" value={g?.reportsCount || 0} icon="R" color="blue" />
            <StatCard label="Quizzes Passed" value={g?.quizzesPassed || 0} icon="Q" color="purple" />
            <StatCard label="Streak Days" value={g?.streakDays || 0} icon="S" color="amber" />
          </div>

          <SectionCard title="Profile Details">
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Name</label>
                  <input
                    className="input"
                    value={form.name}
                    disabled={!editMode}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input
                    className="input"
                    value={form.email}
                    disabled={!editMode}
                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <label className="label">Address</label>
                <input
                  className="input"
                  value={form.address}
                  disabled={!editMode}
                  onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">Bio</label>
                <textarea
                  className="input h-24 resize-none"
                  value={form.bio}
                  disabled={!editMode}
                  onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
                />
              </div>
              <div className="flex items-center gap-3">
                {!editMode && <button className="btn-primary" onClick={() => setEditMode(true)}>Edit Profile</button>}
                {editMode && (
                  <>
                    <button className="btn-primary" onClick={handleSave} disabled={updateMutation.isPending}>Save</button>
                    <button className="btn-secondary" onClick={() => setEditMode(false)}>Cancel</button>
                  </>
                )}
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  )
}

ProfilePage.getLayout = page => <CitizenLayout>{page}</CitizenLayout>
