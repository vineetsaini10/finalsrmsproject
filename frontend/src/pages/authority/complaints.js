import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { complaintsAPI, workersAPI, workforceAPI } from '../../utils/api'
import useAuthStore from '../../context/authStore'
import AuthorityLayout from '../../components/authority/AuthorityLayout'
import { Badge, PriorityBadge, Tabs, SearchInput, SectionCard, Modal, StatCard } from '../../components/ui'
import { formatDistanceToNow } from 'date-fns'

const ISSUE_EMOJI = { full_dustbin:'🗑️', illegal_dumping:'⚠️', burning_waste:'🔥', missed_collection:'🚛', overflowing_bin:'💧', other:'📍' }
const ISSUE_TYPES = ['full_dustbin','illegal_dumping','burning_waste','missed_collection','overflowing_bin','stray_animal_waste','other']

export default function AuthorityComplaints() {
  const { user } = useAuthStore()
  const qc       = useQueryClient()
  const [status,    setStatus]    = useState('all')
  const [issueType, setIssueType] = useState('')
  const [search,    setSearch]    = useState('')
  const [page,      setPage]      = useState(1)
  const [selected,  setSelected]  = useState(null)
  const [assignModal, setAssignModal] = useState(null)
  const [workerId,  setWorkerId]  = useState('')
  const [notes,     setNotes]     = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['auth-complaints', status, issueType, page],
    queryFn:  () => complaintsAPI.list({
      status:     status === 'all' ? undefined : status,
      issue_type: issueType || undefined,
      ward_id:    user?.wardId,
      page, limit: 20,
    }),
    select: d => d.data,
    keepPreviousData: true,
    refetchInterval: 30000, // Real-time sync every 30s
    enabled: Boolean(user?.role && ['authority', 'admin'].includes(user.role)),
  })

  const { data: workersData } = useQuery({
    queryKey: ['workers', user?.wardId],
    queryFn:  () => workersAPI.list({ ward_id: user?.wardId }),
    select: d => d.data,
    enabled: Boolean(user?.role && ['authority', 'admin'].includes(user.role)),
  })

  const assignMut = useMutation({
    mutationFn: ({ id, wid }) => complaintsAPI.assign(id, wid, notes),
    onSuccess: () => {
      toast.success('Assigned successfully')
      qc.invalidateQueries(['auth-complaints'])
      qc.invalidateQueries(['authority-dashboard'])
      setAssignModal(null); setWorkerId(''); setNotes('')
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Assignment failed'),
  })
  const demoWorkerMut = useMutation({
    mutationFn: () => workersAPI.createDemo(),
    onSuccess: (resp) => {
      const demoWorker = resp?.data?.worker
      if (demoWorker?._id) {
        setWorkerId(demoWorker._id)
        toast.success('Demo worker is ready')
      }
      qc.invalidateQueries(['workers', user?.wardId])
    },
    onError: () => toast.error('Failed to create demo worker'),
  })

  const statusMut = useMutation({
    mutationFn: ({ id, status }) => complaintsAPI.updateStatus(id, status),
    onSuccess: () => { toast.success('Status updated'); qc.invalidateQueries(['auth-complaints']) },
  })
  
  const smartAssignMut = useMutation({
    mutationFn: (id) => workforceAPI.assign(id),
    onSuccess: (resp) => {
      toast.success(`Smart-assigned to ${resp.worker?.name || 'nearest worker'}`)
      qc.invalidateQueries(['auth-complaints'])
      qc.invalidateQueries(['all-workers-v2'])
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Smart assignment failed'),
  })

  const complaints = data?.data || []

  const STATUS_TABS = [
    { value: 'all',         label: 'All',         count: data?.meta?.total },
    { value: 'pending',     label: 'Pending'    },
    { value: 'assigned',    label: 'Assigned'   },
    { value: 'in_progress', label: 'In Progress'},
    { value: 'resolved',    label: 'Resolved'   },
  ]

  return (
    <AuthorityLayout>
      <div className="space-y-6">
        <div className="page-header">
          <div>
            <h1 className="page-title">Complaint Management</h1>
            <p className="page-sub">Review, assign, and resolve waste complaints</p>
          </div>
          <button onClick={() => window.location.href='/authority/reports'} className="btn-secondary">
            ⬇ Export CSV
          </button>
        </div>

        <SectionCard>
          {/* Filters bar */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 p-4 border-b border-slate-100">
            <Tabs tabs={STATUS_TABS} active={status} onChange={v => { setStatus(v); setPage(1) }} />
            <div className="flex items-center gap-2 flex-wrap">
              <select className="select w-auto text-sm"
                value={issueType} onChange={e => { setIssueType(e.target.value); setPage(1) }}>
                <option value="">All issue types</option>
                {ISSUE_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g,' ')}</option>)}
              </select>
              <SearchInput value={search} onChange={setSearch} placeholder="Search location..." />
            </div>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="p-10 text-center text-slate-400">Loading complaints...</div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Issue</th>
                    <th>Location</th>
                    <th>Priority</th>
                    <th>AI Detection</th>
                    <th>Reporter</th>
                    <th>Time</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {complaints.filter(c => !search || c.address?.toLowerCase().includes(search.toLowerCase())).map(c => (
                    <tr key={c._id}>
                      <td>
                        <div className="flex items-center gap-2">
                          <span>{ISSUE_EMOJI[c.issueType]||'📍'}</span>
                          <span className="font-medium capitalize">{c.issueType.replace(/_/g,' ')}</span>
                        </div>
                      </td>
                      <td className="text-xs text-slate-500 max-w-[160px]">
                        <span className="truncate block">{c.address || 'Location captured'}</span>
                      </td>
                      <td><PriorityBadge priority={c.priority} /></td>
                      <td>
                        {c.aiResult?.wasteType
                          ? <span className="text-xs text-green-700 font-medium capitalize">{c.aiResult.wasteType} · {Math.round(c.aiResult.confidence*100)}%</span>
                          : <span className="text-slate-300 text-xs">—</span>}
                      </td>
                      <td className="text-sm text-slate-600">{c.userId?.name || 'Citizen'}</td>
                      <td className="text-xs text-slate-400 whitespace-nowrap">
                        {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                      </td>
                      <td><Badge status={c.status} /></td>
                      <td>
                        <div className="flex flex-col sm:flex-row items-center gap-1">
                          {c.status === 'pending' && (
                            <button onClick={() => smartAssignMut.mutate(c._id)}
                              disabled={smartAssignMut.isPending}
                              className="btn-primary btn-sm text-[10px] px-2 py-1">
                              {smartAssignMut.isPending ? '...' : '🤖 Smart Assign'}
                            </button>
                          )}
                          <button onClick={() => setAssignModal(c)}
                            className="bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 px-2 py-1 rounded text-[10px] font-medium transition-colors">
                            Manual
                          </button>
                          {c.status !== 'resolved' && (
                            <button onClick={() => statusMut.mutate({ id: c._id, status: 'resolved' })}
                              className="btn-secondary btn-sm text-[10px] px-2 py-1">Resolve</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!complaints.length && (
                    <tr><td colSpan={8} className="text-center py-10 text-slate-400">No complaints found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {data?.meta && data.meta.pages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 text-sm">
              <span className="text-slate-500">Page {data.meta.page} of {data.meta.pages} · {data.meta.total} total</span>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1} className="btn-secondary btn-sm">← Prev</button>
                <button onClick={() => setPage(p => Math.min(data.meta.pages,p+1))} disabled={page===data.meta.pages} className="btn-secondary btn-sm">Next →</button>
              </div>
            </div>
          )}
        </SectionCard>
      </div>

      {/* Assign modal */}
      <Modal open={!!assignModal} onClose={() => setAssignModal(null)} title="Assign Complaint to Worker" width="max-w-md">
        {assignModal && (
          <div className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-xl text-sm">
              <div className="font-medium text-slate-800 capitalize">{assignModal.issueType?.replace(/_/g,' ')}</div>
              <div className="text-slate-500 text-xs mt-1">{assignModal.address}</div>
            </div>
            <div>
              <label className="label">Select Worker</label>
              <button
                type="button"
                onClick={() => demoWorkerMut.mutate()}
                disabled={demoWorkerMut.isPending}
                className="mb-2 text-xs text-blue-600 hover:underline"
              >
                {demoWorkerMut.isPending ? 'Preparing demo worker...' : 'Use demo worker'}
              </button>
              <select className="select" value={workerId} onChange={e => setWorkerId(e.target.value)}>
                <option value="">Choose available worker...</option>
                {(workersData?.workers || []).filter(w => w.status === 'available').map(w => (
                  <option key={w._id} value={w._id}>{w.name} — {w.zone}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Notes (optional)</label>
              <textarea className="input resize-none h-20" placeholder="Instructions for the worker..."
                value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => {
                if (!assignModal?._id || String(assignModal._id).length < 12) {
                  toast.error('Invalid complaint id')
                  return
                }
                assignMut.mutate({ id: assignModal._id, wid: workerId })
              }}
                disabled={!workerId || assignMut.isPending}
                className="btn-primary flex-1">
                {assignMut.isPending ? 'Assigning...' : 'Assign Worker'}
              </button>
              <button onClick={() => setAssignModal(null)} className="btn-secondary">Cancel</button>
            </div>
          </div>
        )}
      </Modal>
    </AuthorityLayout>
  )
}
