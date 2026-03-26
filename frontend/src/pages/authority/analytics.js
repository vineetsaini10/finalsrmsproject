import { useQuery } from '@tanstack/react-query'
import dynamic from 'next/dynamic'
import { reportsAPI, aiAPI } from '../../utils/api'
import useAuthStore from '../../context/authStore'
import AuthorityLayout from '../../components/authority/AuthorityLayout'
import { StatCard, SectionCard } from '../../components/ui'
import TrendChart from '../../components/authority/TrendChart'

export default function AnalyticsPage() {
  const { user } = useAuthStore()

  const { data: dash } = useQuery({
    queryKey: ['analytics-dashboard'],
    queryFn:  () => reportsAPI.dashboard({ period: 'month', ward_id: user?.wardId }),
    select: d => d.data,
  })

  const { data: hotData } = useQuery({
    queryKey: ['analytics-hotspots', user?.wardId],
    queryFn:  () => aiAPI.hotspots({ ward_id: user?.wardId, days: 30 }),
    select: d => d.data?.data || d.data,
  })

  const { data: participation } = useQuery({
    queryKey: ['analytics-participation', user?.wardId],
    queryFn:  () => reportsAPI.participation(user?.wardId),
    select: d => d.data,
  })

  const s    = dash?.summary    || {}
  const byType = dash?.by_type  || []
  const hotspots = hotData?.hotspots || []
  const totalComplaints = byType.reduce((a, b) => a + (b.count || 0), 0)

  return (
    <AuthorityLayout>
      <div className="space-y-6">
        <div className="page-header">
          <div>
            <h1 className="page-title">Analytics</h1>
            <p className="page-sub">Deep insights — last 30 days · {user?.wardName}</p>
          </div>
        </div>

        {/* Overview KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Complaints"  value={totalComplaints.toLocaleString()} icon="📋" color="blue"   />
          <StatCard label="Resolved"          value={`${s.resolution_rate || 0}%`}     icon="✅" color="green"  />
          <StatCard label="Active Reporters"  value={participation?.active_reporters || 0} icon="👤" color="purple" />
          <StatCard label="Avg Resolve Time"  value={s.avg_resolution_hours ? `${Number(s.avg_resolution_hours).toFixed(1)}h` : '—'} icon="⏱" color="amber" />
        </div>

        {/* 7-day trend */}
        <SectionCard title="Complaint Trend — Last 7 Days" subtitle="Total complaints filed vs resolved each day">
          <div className="p-5">
            <TrendChart data={dash?.trend || []} />
          </div>
        </SectionCard>

        {/* Two-column analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Issue type donut-style breakdown */}
          <SectionCard title="Issue Type Distribution">
            <div className="p-5 space-y-3">
              {byType.map(t => {
                const pct = totalComplaints > 0 ? Math.round((t.count / totalComplaints) * 100) : 0
                const resolvedPct = t.count > 0 ? Math.round((t.resolved / t.count) * 100) : 0
                return (
                  <div key={t.issue_type} className="p-3 bg-slate-50 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-slate-800 capitalize">
                        {t.issue_type.replace(/_/g, ' ')}
                      </span>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-slate-500">{pct}% of total</span>
                        <span className="font-bold text-slate-800">{t.count}</span>
                      </div>
                    </div>
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden mb-1.5">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-green-600">{t.resolved} resolved ({resolvedPct}%)</span>
                      <span className="text-red-500">{t.count - t.resolved} open</span>
                    </div>
                  </div>
                )
              })}
              {!byType.length && <p className="text-slate-400 text-sm text-center py-4">No data available</p>}
            </div>
          </SectionCard>

          {/* Status funnel */}
          <SectionCard title="Resolution Funnel">
            <div className="p-5 space-y-3">
              {(dash?.by_status || []).map(s => {
                const max = Math.max(...(dash?.by_status?.map(x => x.count) || [1]))
                const colors = {
                  pending:     { bar: 'bg-amber-400', label: 'bg-amber-50 text-amber-700 border-amber-200' },
                  assigned:    { bar: 'bg-purple-400', label: 'bg-purple-50 text-purple-700 border-purple-200' },
                  in_progress: { bar: 'bg-blue-400',   label: 'bg-blue-50 text-blue-700 border-blue-200' },
                  resolved:    { bar: 'bg-green-500',  label: 'bg-green-50 text-green-700 border-green-200' },
                  rejected:    { bar: 'bg-slate-400',  label: 'bg-slate-50 text-slate-600 border-slate-200' },
                }
                const c = colors[s.status] || colors.rejected
                return (
                  <div key={s.status} className="flex items-center gap-4">
                    <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border w-28 justify-center flex-shrink-0 ${c.label}`}>
                      {s.status.replace('_', ' ')}
                    </div>
                    <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full ${c.bar} rounded-full transition-all duration-500`}
                        style={{ width: `${(s.count / max) * 100}%` }} />
                    </div>
                    <span className="text-sm font-bold text-slate-700 w-10 text-right">{s.count}</span>
                  </div>
                )
              })}
            </div>
          </SectionCard>
        </div>

        {/* Hotspot summary */}
        <SectionCard
          title="Top Waste Hotspots (Last 30 Days)"
          subtitle="AI-detected high-density complaint clusters"
        >
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Rank</th><th>Location</th><th>Complaints</th><th>Dominant Issue</th><th>Severity</th><th>Trend</th></tr>
              </thead>
              <tbody>
                {hotspots.slice(0, 8).map((h, i) => {
                  const score = h.severityScore || h.severity_score || 0
                  const sev   = score >= 2.5 ? 'High' : score >= 1.5 ? 'Medium' : 'Low'
                  const sevColor = score >= 2.5 ? 'text-red-600 bg-red-50 border-red-100' : score >= 1.5 ? 'text-amber-600 bg-amber-50 border-amber-100' : 'text-slate-500 bg-slate-50 border-slate-100'
                  return (
                    <tr key={i}>
                      <td className="font-bold text-slate-400">#{i + 1}</td>
                      <td className="font-mono text-xs text-slate-600">
                        {(h.centroid_lat || h.centroidLat || 0).toFixed(4)}, {(h.centroid_lng || h.centroidLng || 0).toFixed(4)}
                      </td>
                      <td>
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-50 text-blue-700 font-bold text-sm border border-blue-100">
                          {h.complaintCount || h.complaint_count || 0}
                        </span>
                      </td>
                      <td className="text-sm text-slate-700 capitalize">
                        {(h.dominantType || h.dominant_type || '—').replace(/_/g, ' ')}
                      </td>
                      <td>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${sevColor}`}>{sev}</span>
                      </td>
                      <td>
                        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${score >= 2.5 ? 'bg-red-500' : score >= 1.5 ? 'bg-amber-400' : 'bg-slate-400'}`}
                            style={{ width: `${Math.min(100, (score / 3) * 100)}%` }} />
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {!hotspots.length && (
                  <tr><td colSpan={6} className="text-center py-8 text-slate-400">No hotspot data for this period</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>
    </AuthorityLayout>
  )
}
