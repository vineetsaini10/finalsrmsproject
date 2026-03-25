import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { reportsAPI } from '../../utils/api'
import useAuthStore from '../../context/authStore'
import AuthorityLayout from '../../components/authority/AuthorityLayout'
import { StatCard, SectionCard, Tabs } from '../../components/ui'
import TrendChart from '../../components/authority/TrendChart'
import toast from 'react-hot-toast'

export default function AuthorityReports() {
  const { user }    = useAuthStore()
  const [period, setPeriod] = useState('week')
  const [exporting, setExporting] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['reports-dashboard', period],
    queryFn:  () => reportsAPI.dashboard({ period, ward_id: user?.wardId }),
    select: d => d.data,
  })

  const { data: participation } = useQuery({
    queryKey: ['participation', user?.wardId],
    queryFn:  () => reportsAPI.participation(user?.wardId),
    select: d => d.data,
  })

  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await reportsAPI.export({ ward_id: user?.wardId })
      const url = URL.createObjectURL(new Blob([res.data]))
      const a   = document.createElement('a'); a.href = url
      a.download = `complaints_${new Date().toISOString().slice(0,10)}.csv`
      a.click(); URL.revokeObjectURL(url)
      toast.success('Export downloaded!')
    } catch { toast.error('Export failed') } finally { setExporting(false) }
  }

  const s = data?.summary || {}
  const PERIOD_TABS = [
    { value: 'today', label: 'Today' },
    { value: 'week',  label: 'This Week' },
    { value: 'month', label: 'This Month' },
  ]

  return (
    <AuthorityLayout>
      <div className="space-y-6">
        <div className="page-header">
          <div>
            <h1 className="page-title">Reports & Analytics</h1>
            <p className="page-sub">Performance metrics, trends, and citizen participation</p>
          </div>
          <div className="flex items-center gap-3">
            <Tabs tabs={PERIOD_TABS} active={period} onChange={setPeriod} />
            <button onClick={handleExport} disabled={exporting} className="btn-secondary">
              {exporting ? '...' : '⬇ Export CSV'}
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="New Complaints"    value={s.new_complaints   || 0}  icon="📋" color="blue"   loading={isLoading} />
          <StatCard label="Resolved"          value={s.resolved_today   || 0}  icon="✅" color="green"  loading={isLoading} />
          <StatCard label="Resolution Rate"   value={`${s.resolution_rate||0}%`} icon="📊" color="purple" loading={isLoading} />
          <StatCard label="Avg Resolution"    value={s.avg_resolution_hours ? `${Number(s.avg_resolution_hours).toFixed(1)}h` : '—'} icon="⏱" color="amber" loading={isLoading} />
        </div>

        {/* Trend chart */}
        <SectionCard title="Weekly Complaint Trend" subtitle="Total vs resolved complaints over 7 days">
          <div className="p-5"><TrendChart data={data?.trend || []} /></div>
        </SectionCard>

        {/* Two columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* By type */}
          <SectionCard title="Complaints by Issue Type">
            <div className="p-5 space-y-4">
              {(data?.by_type || []).map(t => {
                const max = Math.max(...(data?.by_type?.map(x => x.count) || [1]))
                const pct = Math.round((t.count / max) * 100)
                return (
                  <div key={t.issue_type}>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="text-slate-700 capitalize">{t.issue_type.replace(/_/g,' ')}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-green-600">{t.resolved} resolved</span>
                        <span className="font-bold text-slate-900 w-8 text-right">{t.count}</span>
                      </div>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
              {!data?.by_type?.length && <p className="text-slate-400 text-sm text-center py-4">No data available</p>}
            </div>
          </SectionCard>

          {/* Citizen participation */}
          <SectionCard title="Citizen Participation (Last 30 Days)">
            <div className="p-5">
              {participation ? (
                <div className="space-y-0">
                  {[
                    { label: 'Active Reporters',    value: participation.active_reporters,  icon: '👤', color: 'text-blue-600' },
                    { label: 'Total Complaints',     value: participation.total_complaints,  icon: '📋', color: 'text-slate-700' },
                    { label: 'Avg Citizen Points',   value: Math.round(participation.avg_citizen_points || 0), icon: '⭐', color: 'text-amber-600' },
                    { label: 'Engaged Users (Lv3+)', value: participation.engaged_users,    icon: '🏆', color: 'text-green-600' },
                  ].map(row => (
                    <div key={row.label} className="flex items-center justify-between py-4 border-b border-slate-50 last:border-0">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{row.icon}</span>
                        <span className="text-sm text-slate-600">{row.label}</span>
                      </div>
                      <span className={`text-2xl font-bold ${row.color}`}>{(row.value || 0).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-slate-400 text-sm text-center py-8">Loading participation data...</div>
              )}
            </div>
          </SectionCard>
        </div>

        {/* By status */}
        <SectionCard title="Status Breakdown">
          <div className="p-5">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {(data?.by_status || []).map(s => {
                const colors = {
                  pending:     'bg-amber-50  text-amber-700  border-amber-100',
                  assigned:    'bg-purple-50 text-purple-700 border-purple-100',
                  in_progress: 'bg-blue-50   text-blue-700   border-blue-100',
                  resolved:    'bg-green-50  text-green-700  border-green-100',
                  rejected:    'bg-slate-50  text-slate-600  border-slate-100',
                }
                return (
                  <div key={s.status} className={`p-4 rounded-xl border text-center ${colors[s.status] || 'bg-slate-50 text-slate-600 border-slate-100'}`}>
                    <div className="text-3xl font-bold">{s.count}</div>
                    <div className="text-sm font-medium mt-1 capitalize">{s.status.replace('_',' ')}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </SectionCard>
      </div>
    </AuthorityLayout>
  )
}
