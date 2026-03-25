import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { reportsAPI, complaintsAPI, workersAPI } from '../../utils/api'
import useAuthStore from '../../context/authStore'
import AuthorityLayout from '../../components/authority/AuthorityLayout'
import { StatCard, SectionCard, Badge, PriorityBadge, Tabs } from '../../components/ui'
import TrendChart from '../../components/authority/TrendChart'
import { formatDistanceToNow } from 'date-fns'

const HeatMap = dynamic(() => import('../../components/authority/HeatMap'), { ssr: false })

const ISSUE_EMOJI = { full_dustbin:'🗑️', illegal_dumping:'⚠️', burning_waste:'🔥', missed_collection:'🚛', overflowing_bin:'💧', other:'📍' }

const WORKER_STATUS = {
  available: { dot: 'dot-green', label: 'Available',  cls: 'badge-resolved' },
  busy:      { dot: 'dot-amber', label: 'On Task',    cls: 'badge-pending'  },
  break:     { dot: 'dot-gray',  label: 'Break',      cls: 'badge-gray'     },
  offline:   { dot: 'dot-gray',  label: 'Offline',    cls: 'badge-gray'     },
}

export default function AuthorityDashboard() {
  const { user } = useAuthStore()
  const [period, setPeriod] = useState('today')

  const { data: dash, isLoading } = useQuery({
    queryKey: ['authority-dashboard', period],
    queryFn: () => reportsAPI.dashboard({ period, ward_id: user?.wardId }),
    select: d => d.data,
    refetchInterval: 30_000,
  })

  const { data: urgent } = useQuery({
    queryKey: ['urgent-complaints'],
    queryFn: () => complaintsAPI.list({ status: 'pending', priority: 3, limit: 8 }),
    select: d => d.data,
    refetchInterval: 60_000,
  })

  const { data: workers } = useQuery({
    queryKey: ['workers-dashboard'],
    queryFn: () => workersAPI.list({ ward_id: user?.wardId }),
    select: d => d.data,
  })

  const s = dash?.summary || {}

  const PERIOD_TABS = [
    { value: 'today', label: 'Today' },
    { value: 'week',  label: 'This Week' },
    { value: 'month', label: 'This Month' },
  ]

  return (
    <AuthorityLayout urgentCount={s.urgent_open || 0}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="page-title">Command Overview</h1>
            <p className="page-sub">{user?.wardName} · {user?.city} · Real-time monitoring</p>
          </div>
          <Tabs tabs={PERIOD_TABS} active={period} onChange={setPeriod} />
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Urgent Open"      value={s.urgent_open    || 0} icon="🔴" color="red"    loading={isLoading} />
          <StatCard label="In Progress"      value={s.in_progress    || 0} icon="🔄" color="amber"  loading={isLoading} />
          <StatCard label="Resolved Today"   value={s.resolved_today || 0} icon="✅" color="green"  loading={isLoading} />
          <StatCard label="Resolution Rate"  value={`${s.resolution_rate || 0}%`} icon="📊" color="blue" loading={isLoading} />
        </div>

        {/* Main grid: map + workers */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Live map */}
          <div className="xl:col-span-2">
            <SectionCard
              title="Live Complaint Heatmap"
              subtitle="Real-time geographic distribution of complaints"
              action={
                <Link href="/authority/complaints">
                  <button className="btn-secondary btn-sm">All Complaints →</button>
                </Link>
              }
            >
              <div className="h-[340px] rounded-b-xl overflow-hidden">
                <HeatMap wardId={user?.wardId} />
              </div>
            </SectionCard>
          </div>

          {/* Workforce panel */}
          <div>
            <SectionCard
              title="Workforce Status"
              subtitle="Workers on duty right now"
              action={<Link href="/authority/workforce"><button className="btn-secondary btn-sm">Manage →</button></Link>}
            >
              <div className="divide-y divide-slate-50">
                {(workers?.workers || []).slice(0, 8).map(w => {
                  const sc = WORKER_STATUS[w.status] || WORKER_STATUS.offline
                  return (
                    <div key={w._id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50/80 transition-colors">
                      <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-semibold text-sm flex-shrink-0">
                        {w.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-800 truncate">{w.name}</div>
                        <div className="text-xs text-slate-400">{w.zone || 'Unassigned'}</div>
                      </div>
                      <span className={sc.cls}><span className={`${sc.dot} inline-block mr-1`} />{sc.label}</span>
                    </div>
                  )
                })}
                {!(workers?.workers?.length) && (
                  <div className="p-6 text-center text-sm text-slate-400">No workers found</div>
                )}
              </div>
            </SectionCard>
          </div>
        </div>

        {/* Second row: chart + by-type */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            <SectionCard title="7-Day Complaint Trend">
              <div className="p-5">
                <TrendChart data={dash?.trend || []} />
              </div>
            </SectionCard>
          </div>
          <div>
            <SectionCard title="By Issue Type">
              <div className="p-5 space-y-3">
                {(dash?.by_type || []).map(t => {
                  const max = Math.max(...(dash?.by_type?.map(x => x.count) || [1]))
                  return (
                    <div key={t.issue_type}>
                      <div className="flex items-center justify-between text-sm mb-1.5">
                        <div className="flex items-center gap-2">
                          <span>{ISSUE_EMOJI[t.issue_type] || '📍'}</span>
                          <span className="text-slate-700 capitalize">{t.issue_type.replace(/_/g,' ')}</span>
                        </div>
                        <span className="font-semibold text-slate-900">{t.count}</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full transition-all duration-500"
                          style={{ width: `${(t.count / max) * 100}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </SectionCard>
          </div>
        </div>

        {/* Urgent complaints table */}
        <SectionCard
          title="Urgent Complaints — Action Required"
          subtitle="Priority 3 complaints needing immediate attention"
          action={<Link href="/authority/complaints"><button className="btn-secondary btn-sm">View All →</button></Link>}
        >
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Issue</th>
                  <th>Location</th>
                  <th>AI Type</th>
                  <th>Upvotes</th>
                  <th>Time</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {(urgent?.data || []).map(c => (
                  <tr key={c._id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <span>{ISSUE_EMOJI[c.issueType] || '📍'}</span>
                        <span className="font-medium capitalize">{c.issueType.replace(/_/g,' ')}</span>
                      </div>
                    </td>
                    <td className="text-xs text-slate-500 max-w-[180px]">
                      <span className="truncate block">{c.address || 'Location captured'}</span>
                    </td>
                    <td>
                      {c.aiResult?.wasteType
                        ? <span className="text-xs text-green-700 font-medium capitalize">{c.aiResult.wasteType}</span>
                        : <span className="text-slate-300 text-xs">—</span>}
                    </td>
                    <td className="text-slate-600 text-sm">{c.upvotes || 0}</td>
                    <td className="text-slate-400 text-xs whitespace-nowrap">
                      {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                    </td>
                    <td><Badge status={c.status} /></td>
                    <td>
                      <Link href={`/authority/complaints/${c._id}`}>
                        <button className="btn-blue btn-sm text-xs">Assign →</button>
                      </Link>
                    </td>
                  </tr>
                ))}
                {!urgent?.data?.length && (
                  <tr><td colSpan={7} className="text-center py-8 text-slate-400">🎉 No urgent complaints right now</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>
    </AuthorityLayout>
  )
}
