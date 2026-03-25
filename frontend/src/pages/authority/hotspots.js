import { useQuery } from '@tanstack/react-query'
import { aiAPI } from '../../utils/api'
import useAuthStore from '../../context/authStore'
import AuthorityLayout from '../../components/authority/AuthorityLayout'
import { StatCard, SectionCard, EmptyState } from '../../components/ui'

const SEV = score => score >= 2.5 ? 'high' : score >= 1.5 ? 'medium' : 'low'
const SEV_CONFIG = {
  high:   { bg: 'bg-red-50',   border: 'border-red-200',   text: 'text-red-700',   dot: 'bg-red-500',   badge: 'badge-urgent'   },
  medium: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', dot: 'bg-amber-400', badge: 'badge-pending'  },
  low:    { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-600', dot: 'bg-slate-400', badge: 'badge-gray'     },
}

export default function HotspotsPage() {
  const { user } = useAuthStore()

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['hotspots', user?.wardId],
    queryFn:  () => aiAPI.hotspots({ ward_id: user?.wardId, days: 7 }),
    select: d => d.data,
  })

  const hotspots = data?.hotspots || []

  return (
    <AuthorityLayout>
      <div className="space-y-6">
        <div className="page-header">
          <div>
            <h1 className="page-title">Waste Hotspots</h1>
            <p className="page-sub">AI-detected high-density waste zones · Last 7 days</p>
          </div>
          <button onClick={() => refetch()} className="btn-secondary">🔄 Refresh Detection</button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Hotspots"    value={hotspots.length}                                                               icon="🔥" color="red"   loading={isLoading} />
          <StatCard label="High Severity"     value={hotspots.filter(h => SEV(h.severityScore) === 'high').length}                  icon="🚨" color="red"   loading={isLoading} />
          <StatCard label="Medium Severity"   value={hotspots.filter(h => SEV(h.severityScore) === 'medium').length}                icon="⚠️" color="amber" loading={isLoading} />
          <StatCard label="Total Complaints"  value={hotspots.reduce((s,h) => s + (h.complaintCount || 0), 0).toLocaleString()}     icon="📋" color="blue"  loading={isLoading} />
        </div>

        {/* Hotspot list */}
        <SectionCard title="Detected Hotspot Clusters" subtitle="Sorted by severity score — highest first">
          {isLoading ? (
            <div className="p-10 text-center text-slate-400">Running AI hotspot detection...</div>
          ) : hotspots.length === 0 ? (
            <EmptyState icon="✅" title="No significant hotspots detected" subtitle="Great job keeping the ward clean!" />
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Location (Centroid)</th>
                    <th>Ward</th>
                    <th>Severity</th>
                    <th>Complaints</th>
                    <th>Dominant Issue</th>
                    <th>Severity Score</th>
                    <th>Detected</th>
                  </tr>
                </thead>
                <tbody>
                  {hotspots.map((h, i) => {
                    const sev = SEV(h.severityScore)
                    const sc  = SEV_CONFIG[sev]
                    return (
                      <tr key={i}>
                        <td className="text-slate-400 font-mono text-xs">#{i + 1}</td>
                        <td>
                          <span className="font-mono text-xs text-slate-600">
                            {h.centroid_lat?.toFixed(4) || h.centroidLat?.toFixed(4)},&nbsp;
                            {h.centroid_lng?.toFixed(4) || h.centroidLng?.toFixed(4)}
                          </span>
                        </td>
                        <td className="text-sm text-slate-700">{h.wardName || h.ward_name || '—'}</td>
                        <td>
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${sc.dot}`} />
                            <span className={`text-xs font-semibold capitalize ${sc.text}`}>{sev}</span>
                          </div>
                        </td>
                        <td>
                          <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${sc.bg} ${sc.text} border ${sc.border}`}>
                            {h.complaintCount || h.complaint_count}
                          </span>
                        </td>
                        <td>
                          <span className="text-sm text-slate-700 capitalize">
                            {(h.dominantType || h.dominant_type || '—').replace(/_/g,' ')}
                          </span>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${sev === 'high' ? 'bg-red-500' : sev === 'medium' ? 'bg-amber-400' : 'bg-slate-400'}`}
                                style={{ width: `${Math.min(100, ((h.severityScore || 0) / 3) * 100)}%` }} />
                            </div>
                            <span className={`text-sm font-bold ${sc.text}`}>{(h.severityScore || h.severity_score || 0).toFixed(1)}</span>
                          </div>
                        </td>
                        <td className="text-xs text-slate-400 whitespace-nowrap">
                          {h.createdAt ? new Date(h.createdAt).toLocaleDateString() : 'Today'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </div>
    </AuthorityLayout>
  )
}
