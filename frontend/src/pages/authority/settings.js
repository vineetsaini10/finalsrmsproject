import { useEffect, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import useAuthStore from '../../context/authStore'
import AuthorityLayout from '../../components/authority/AuthorityLayout'
import { SectionCard } from '../../components/ui'
import toast from 'react-hot-toast'
import { useRouter } from 'next/router'
import { authAPI } from '../../utils/api'

export default function SettingsPage() {
  const { user, logout } = useAuthStore()
  const router = useRouter()

  const [notifications, setNotifications] = useState({
    urgentComplaints: true,
    dailyReport: true,
    hotspotAlert: true,
    weeklyDigest: false,
    complaintUpdates: true,
  })

  const { data: settingsData } = useQuery({
    queryKey: ['auth-settings'],
    queryFn: () => authAPI.getSettings(),
    select: (res) => res.data,
  })

  useEffect(() => {
    if (!settingsData?.notificationPrefs) return
    setNotifications((prev) => ({ ...prev, ...settingsData.notificationPrefs }))
  }, [settingsData])

  const saveMutation = useMutation({
    mutationFn: authAPI.updateSettings,
    onSuccess: () => toast.success('Settings saved'),
    onError: (err) => toast.error(err?.response?.data?.message || 'Failed to save settings'),
  })

  const handleLogout = async () => {
    await logout()
    toast.success('Signed out')
    router.push('/login')
  }

  const togglePreference = (key, label) => {
    const updated = { ...notifications, [key]: !notifications[key] }
    setNotifications(updated)
    saveMutation.mutate({ notificationPrefs: updated })
    toast.success(`${label} ${updated[key] ? 'enabled' : 'disabled'}`)
  }

  return (
    <AuthorityLayout>
      <div className="space-y-6 max-w-3xl">
        <div className="page-header">
          <div>
            <h1 className="page-title">Settings</h1>
            <p className="page-sub">Manage your account and dashboard preferences</p>
          </div>
        </div>

        <SectionCard title="Account Information">
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
              <div className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center text-2xl font-bold text-white flex-shrink-0">
                {user?.name?.[0] || 'A'}
              </div>
              <div>
                <div className="text-base font-bold text-slate-900">{user?.name}</div>
                <div className="text-sm text-slate-500">{user?.phone}</div>
                {user?.email && <div className="text-sm text-slate-400">{user?.email}</div>}
                <div className="mt-1">
                  <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full border border-blue-100 font-semibold capitalize">
                    {user?.role}
                  </span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Ward</label>
                <input className="input" value={user?.wardName || 'Not assigned'} disabled />
              </div>
              <div>
                <label className="label">City</label>
                <input className="input" value={user?.city || 'Not set'} disabled />
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Notification Preferences" subtitle="Choose what updates you want to receive">
          <div className="p-5 space-y-4">
            {[
              { key: 'urgentComplaints', label: 'Urgent Complaint Alerts', desc: 'Get notified immediately when Priority 3 complaints arrive' },
              { key: 'dailyReport', label: 'Daily Summary Report', desc: 'Receive a daily digest of complaints and resolutions' },
              { key: 'hotspotAlert', label: 'Hotspot Detection Alerts', desc: 'Alert when AI detects a new high-severity waste hotspot' },
              { key: 'weeklyDigest', label: 'Weekly Performance Digest', desc: 'Weekly summary of ward performance and citizen participation' },
              { key: 'complaintUpdates', label: 'Citizen Complaint Updates', desc: 'Notify citizens when complaint status changes' },
            ].map((pref) => (
              <div key={pref.key} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                <div>
                  <div className="text-sm font-semibold text-slate-800">{pref.label}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{pref.desc}</div>
                </div>
                <button
                  onClick={() => togglePreference(pref.key, pref.label)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${notifications[pref.key] ? 'bg-blue-600' : 'bg-slate-300'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow ${notifications[pref.key] ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Session">
          <div className="p-5">
            <div className="flex items-center justify-between p-4 border border-red-100 bg-red-50 rounded-xl">
              <div>
                <div className="text-sm font-semibold text-red-800">Sign out of SwachhaNet</div>
                <div className="text-xs text-red-500 mt-0.5">You will be redirected to the login page</div>
              </div>
              <button onClick={handleLogout} className="btn-danger btn-sm">Sign Out</button>
            </div>
          </div>
        </SectionCard>
      </div>
    </AuthorityLayout>
  )
}
