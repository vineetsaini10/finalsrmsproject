import { useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { aiAPI } from '../../utils/api'
import useAuthStore from '../../context/authStore'
import AuthorityLayout from '../../components/authority/AuthorityLayout'
import { EmptyState, SectionCard, StatCard } from '../../components/ui'

const HotspotMap = dynamic(() => import('../../components/authority/HotspotMap'), { ssr: false })

const severityBand = (score) => (score >= 2.5 ? 'high' : score >= 1.5 ? 'medium' : 'low')
const severityConfig = {
  high: { text: 'text-red-700', dot: 'bg-red-500', bar: 'bg-red-500', chip: 'bg-red-50 border-red-100' },
  medium: { text: 'text-amber-700', dot: 'bg-amber-400', bar: 'bg-amber-400', chip: 'bg-amber-50 border-amber-100' },
  low: { text: 'text-slate-600', dot: 'bg-slate-400', bar: 'bg-slate-400', chip: 'bg-slate-50 border-slate-100' },
}

export default function HotspotsPage() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [days, setDays] = useState(7)

  const canAccess = Boolean(user?.role && ['authority', 'admin'].includes(user.role))
  const wardId = user?.role === 'authority' ? user?.wardId : user?.wardId || undefined
  const wardLabel = user?.role === 'authority' ? (user?.wardName || 'Assigned ward') : (user?.wardName || 'All wards')

  const {
    data,
    isLoading,
    isFetching,
    isError,
    error,
  } = useQuery({
    queryKey: ['hotspots', wardId || 'all', days],
    queryFn: () => aiAPI.hotspots({ ward_id: wardId, days }),
    select: (response) => response.data,
    enabled: canAccess,
    retry: false,
  })

  const refreshMutation = useMutation({
    mutationFn: () => aiAPI.refreshHotspots(wardId, days),
    onSuccess: () => {
      toast.success('Hotspot detection refreshed')
      queryClient.invalidateQueries({ queryKey: ['hotspots'] })
      queryClient.invalidateQueries({ queryKey: ['hotspot-heatmap'] })
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to refresh hotspots')
    },
  })

  const hotspots = data?.hotspots || []
  const stats = useMemo(() => {
    const high = hotspots.filter((hotspot) => severityBand(Number(hotspot.severity_score || 0)) === 'high').length
    const medium = hotspots.filter((hotspot) => severityBand(Number(hotspot.severity_score || 0)) === 'medium').length
    const totalComplaints = hotspots.reduce((sum, hotspot) => sum + Number(hotspot.complaint_count || 0), 0)
    const avgSeverity = hotspots.length
      ? hotspots.reduce((sum, hotspot) => sum + Number(hotspot.severity_score || 0), 0) / hotspots.length
      : 0

    return {
      total: hotspots.length,
      high,
      medium,
      totalComplaints,
      avgSeverity: avgSeverity.toFixed(2),
    }
  }, [hotspots])

  const fetchError = error?.response?.data?.message || 'Unable to load hotspot data right now.'

  return (
    <AuthorityLayout>
      <div className="space-y-6">
        <div className="page-header">
          <div>
            <h1 className="page-title">Waste Hotspots</h1>
            <p className="page-sub">Active waste clusters detected from unresolved complaints in {wardLabel}</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              className="select w-auto text-sm"
              value={days}
              onChange={(event) => setDays(Number(event.target.value))}
            >
              <option value={3}>Last 3 days</option>
              <option value={7}>Last 7 days</option>
              <option value={14}>Last 14 days</option>
              <option value={30}>Last 30 days</option>
            </select>
            <button
              onClick={() => refreshMutation.mutate()}
              disabled={!canAccess || refreshMutation.isPending}
              className="btn-secondary"
            >
              {refreshMutation.isPending ? 'Refreshing...' : 'Run Detection'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Hotspots" value={stats.total} color="red" loading={isLoading} />
          <StatCard label="High Severity" value={stats.high} color="red" loading={isLoading} />
          <StatCard label="Medium Severity" value={stats.medium} color="amber" loading={isLoading} />
          <StatCard label="Avg Severity" value={stats.avgSeverity} color="blue" loading={isLoading} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            <SectionCard
              title="Hotspot Map"
              subtitle={`Window: last ${days} day(s)`}
              action={<span className="text-xs text-slate-400">{isFetching ? 'Updating map...' : `${stats.totalComplaints} active complaints clustered`}</span>}
            >
              {!canAccess ? (
                <EmptyState title="Access restricted" subtitle="Only authority and admin users can access hotspots." />
              ) : isLoading ? (
                <div className="h-[360px] flex items-center justify-center text-sm text-slate-400">Loading hotspot map...</div>
              ) : isError ? (
                <EmptyState title="Hotspot map unavailable" subtitle={fetchError} />
              ) : hotspots.length === 0 ? (
                <EmptyState title="No significant hotspots detected" subtitle="No dense unresolved complaint clusters were found in the selected time window." />
              ) : (
                <div className="h-[360px] rounded-b-2xl overflow-hidden">
                  <HotspotMap wardId={wardId} days={days} hotspots={hotspots} />
                </div>
              )}
            </SectionCard>
          </div>

          <SectionCard title="Detection Summary" subtitle="How the current hotspot set breaks down">
            <div className="p-5 space-y-4">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Coverage</div>
                <div className="mt-2 text-2xl font-semibold text-slate-900">{wardLabel}</div>
                <div className="mt-1 text-sm text-slate-500">Only unresolved complaints are used for hotspot generation.</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-slate-100 p-4">
                  <div className="text-xs text-slate-400">Complaints in clusters</div>
                  <div className="mt-2 text-xl font-semibold text-slate-900">{stats.totalComplaints}</div>
                </div>
                <div className="rounded-2xl border border-slate-100 p-4">
                  <div className="text-xs text-slate-400">Window</div>
                  <div className="mt-2 text-xl font-semibold text-slate-900">{days} days</div>
                </div>
              </div>
              <div className="space-y-3">
                {['high', 'medium', 'low'].map((level) => {
                  const count = hotspots.filter((hotspot) => severityBand(Number(hotspot.severity_score || 0)) === level).length
                  const pct = hotspots.length ? Math.round((count / hotspots.length) * 100) : 0
                  const config = severityConfig[level]
                  return (
                    <div key={level}>
                      <div className="flex items-center justify-between text-sm mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${config.dot}`} />
                          <span className={`capitalize font-medium ${config.text}`}>{level}</span>
                        </div>
                        <span className="text-slate-500">{count} hotspot(s)</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${config.bar}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </SectionCard>
        </div>

        <SectionCard
          title="Detected Hotspot Clusters"
          subtitle="Ranked by severity score"
          action={<span className="text-xs text-slate-400">{isFetching ? 'Refreshing...' : `${hotspots.length} clusters found`}</span>}
        >
          {!canAccess ? (
            <EmptyState title="Access restricted" subtitle="Only authority and admin users can access hotspots." />
          ) : isLoading ? (
            <div className="p-10 text-center text-slate-400">Running hotspot detection...</div>
          ) : isError ? (
            <EmptyState title="Unable to load hotspots" subtitle={fetchError} />
          ) : hotspots.length === 0 ? (
            <EmptyState title="No significant hotspots detected" subtitle="No dense unresolved complaint clusters were found in the selected time window." />
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Location</th>
                    <th>Ward</th>
                    <th>Severity</th>
                    <th>Complaints</th>
                    <th>Dominant Issue</th>
                    <th>Score</th>
                    <th>Map</th>
                  </tr>
                </thead>
                <tbody>
                  {hotspots.map((hotspot, index) => {
                    const score = Number(hotspot.severity_score || 0)
                    const level = severityBand(score)
                    const config = severityConfig[level]
                    const lat = Number(hotspot.centroid_lat)
                    const lng = Number(hotspot.centroid_lng)
                    const complaintCount = Number(hotspot.complaint_count || 0)

                    return (
                      <tr key={hotspot.id || index}>
                        <td className="text-slate-400 font-mono text-xs">#{index + 1}</td>
                        <td className="font-mono text-xs text-slate-600">
                          {Number.isFinite(lat) ? lat.toFixed(5) : '-'}, {Number.isFinite(lng) ? lng.toFixed(5) : '-'}
                        </td>
                        <td className="text-sm text-slate-700">{hotspot.ward_name || '-'}</td>
                        <td>
                          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${config.text} ${config.chip}`}>
                            <span className={`w-2 h-2 rounded-full ${config.dot}`} />
                            {level}
                          </span>
                        </td>
                        <td className="text-sm font-semibold text-slate-700">{complaintCount}</td>
                        <td className="text-sm text-slate-700 capitalize">
                          {String(hotspot.dominant_type || 'other').replace(/_/g, ' ')}
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${config.bar}`} style={{ width: `${Math.min(100, (score / 3) * 100)}%` }} />
                            </div>
                            <span className={`text-sm font-bold ${config.text}`}>{score.toFixed(2)}</span>
                          </div>
                        </td>
                        <td>
                          {Number.isFinite(lat) && Number.isFinite(lng) ? (
                            <a
                              href={`https://maps.google.com/?q=${lat},${lng}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline"
                            >
                              Open
                            </a>
                          ) : (
                            <span className="text-xs text-slate-400">-</span>
                          )}
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
