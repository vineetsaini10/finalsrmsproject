import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { complaintsAPI } from '../../utils/api'
import CitizenLayout from '../../components/shared/CitizenLayout'
import { Badge, PriorityBadge, Tabs, SearchInput, SectionCard, EmptyState } from '../../components/ui'
import { formatDistanceToNow } from 'date-fns'

const ISSUE_EMOJI = { full_dustbin:'🗑️', illegal_dumping:'⚠️', burning_waste:'🔥', missed_collection:'🚛', overflowing_bin:'💧', other:'📍' }

export default function CitizenComplaintsPage() {
  const [status, setStatus] = useState('all')
  const [search, setSearch] = useState('')
  const [page,   setPage]   = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['my-complaints', status, page],
    queryFn: () => complaintsAPI.list({ status: status === 'all' ? undefined : status, page, limit: 15 }),
    select: d => d.data,
  })

  const complaints = (data?.data || []).filter(c =>
    !search || c.issueType.includes(search.toLowerCase()) || c.address?.toLowerCase().includes(search.toLowerCase())
  )

  const STATUS_TABS = [
    { value: 'all',         label: 'All' },
    { value: 'pending',     label: 'Pending' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'resolved',    label: 'Resolved' },
  ]

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">My Reports</h1>
          <p className="page-sub">Track all your submitted waste complaints</p>
        </div>
        <Link href="/citizen/report">
          <button className="btn-primary">+ New Report</button>
        </Link>
      </div>

      <SectionCard>
        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 border-b border-slate-100">
          <Tabs tabs={STATUS_TABS} active={status} onChange={v => { setStatus(v); setPage(1) }} />
          <SearchInput value={search} onChange={setSearch} placeholder="Search by issue or location..." />
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="p-10 text-center text-slate-400">Loading...</div>
        ) : complaints.length === 0 ? (
          <EmptyState icon="📭" title="No complaints found" subtitle="Try adjusting filters or submit a new report" />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Issue</th>
                  <th>Address</th>
                  <th>Priority</th>
                  <th>AI Detection</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {complaints.map(c => (
                  <tr key={c._id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <span>{ISSUE_EMOJI[c.issueType] || '📍'}</span>
                        <span className="font-medium text-slate-800 capitalize">{c.issueType.replace(/_/g,' ')}</span>
                      </div>
                    </td>
                    <td className="text-slate-500 max-w-[200px]">
                      <span className="truncate block text-xs">{c.address || 'Location captured'}</span>
                    </td>
                    <td><PriorityBadge priority={c.priority} /></td>
                    <td>
                      {c.aiResult?.wasteType
                        ? <span className="text-xs text-green-700 font-medium capitalize">{c.aiResult.wasteType} ({Math.round(c.aiResult.confidence*100)}%)</span>
                        : <span className="text-slate-300 text-xs">Processing...</span>}
                    </td>
                    <td><Badge status={c.status} /></td>
                    <td className="text-slate-400 text-xs whitespace-nowrap">
                      {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                    </td>
                    <td>
                      <Link href={`/citizen/complaints/${c._id}`}>
                        <button className="btn-ghost btn-sm text-xs">View →</button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {data?.meta && data.meta.pages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 text-sm">
            <span className="text-slate-500">Page {data.meta.page} of {data.meta.pages} · {data.meta.total} total</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1} className="btn-secondary btn-sm">← Prev</button>
              <button onClick={() => setPage(p => Math.min(data.meta.pages, p+1))} disabled={page === data.meta.pages} className="btn-secondary btn-sm">Next →</button>
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  )
}

CitizenComplaintsPage.getLayout = page => <CitizenLayout>{page}</CitizenLayout>
