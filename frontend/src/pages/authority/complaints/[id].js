import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/router'
import { complaintsAPI, workersAPI } from '../../../utils/api'
import useAuthStore from '../../../context/authStore'
import AuthorityLayout from '../../../components/authority/AuthorityLayout'
import { Badge, PriorityBadge, SectionCard, Modal } from '../../../components/ui'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

export default function AuthComplaintDetailPage() {
  const router = useRouter()
  const { id } = router.query
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const [assignModal, setAssignModal] = useState(false)
  const [workerId, setWorkerId] = useState("")
  const [notes, setNotes] = useState("")

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["complaint-detail", id],
    queryFn: () => complaintsAPI.get(id),
    select: d => d.data,
    enabled: !!id,
  })

  const { data: workersData } = useQuery({
    queryKey: ["workers", user?.wardId],
    queryFn: () => workersAPI.list({ ward_id: user?.wardId }),
    select: d => d.data,
    enabled: Boolean(user?.role && ['authority', 'admin'].includes(user.role)),
  })

  const assignMut = useMutation({
    mutationFn: () => complaintsAPI.assign(id, workerId, notes),
    onSuccess: () => { toast.success("Assigned successfully"); refetch(); setAssignModal(false) },
    onError: (err) => toast.error(err?.response?.data?.message || "Assignment failed"),
  })
  const demoWorkerMut = useMutation({
    mutationFn: () => workersAPI.createDemo(),
    onSuccess: (resp) => {
      const demoWorker = resp?.data?.worker
      if (demoWorker?._id) {
        setWorkerId(demoWorker._id)
        toast.success('Demo worker is ready')
      }
      qc.invalidateQueries(["workers", user?.wardId])
    },
    onError: () => toast.error('Failed to create demo worker'),
  })

  const statusMut = useMutation({
    mutationFn: (status) => complaintsAPI.updateStatus(id, status),
    onSuccess: () => { toast.success("Status updated"); refetch() },
  })

  if (isLoading) return <AuthorityLayout><div className="flex items-center justify-center min-h-[400px]"><p className="text-slate-400">Loading...</p></div></AuthorityLayout>
  if (!data) return <AuthorityLayout><div className="flex items-center justify-center min-h-[400px]"><p className="text-slate-400">Not found</p></div></AuthorityLayout>

  const c = data

  return (
    <AuthorityLayout>
      <div className="space-y-6">
        <div className="page-header">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="btn-ghost btn-sm p-2">←</button>
            <div>
              <h1 className="page-title capitalize">{c.issueType?.replace(/_/g," ")}</h1>
              <p className="page-sub">ID: {id?.slice(-8)?.toUpperCase()}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <PriorityBadge priority={c.priority} />
            <Badge status={c.status} />
            <button onClick={() => setAssignModal(true)} className="btn-blue">Assign Worker</button>
            {c.status !== "resolved" && (
              <button onClick={() => statusMut.mutate("resolved")} className="btn-primary">✓ Resolve</button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">
            {c.imageUrl && (
              <SectionCard title="Complaint Photo">
                <div className="p-4"><img src={c.imageUrl} alt="Complaint" className="w-full rounded-xl object-cover max-h-96" /></div>
              </SectionCard>
            )}
            {c.aiResult?.wasteType && (
              <div className="card p-5 bg-green-50 border-green-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center text-2xl">🤖</div>
                  <div>
                    <p className="text-sm font-bold text-green-800">AI Detection</p>
                    <p className="text-xl font-bold text-green-700 capitalize">{c.aiResult.wasteType} Waste</p>
                    <p className="text-xs text-green-600">Confidence: {Math.round(c.aiResult.confidence * 100)}%</p>
                  </div>
                </div>
              </div>
            )}
            {c.description && (
              <SectionCard title="Description"><div className="p-5"><p className="text-slate-700">{c.description}</p></div></SectionCard>
            )}
            <SectionCard title="Assignment History">
              <div className="divide-y divide-slate-50">
                {!(c.assignments?.length) ? (
                  <div className="p-6 text-center text-slate-400 text-sm">No assignments yet</div>
                ) : c.assignments.map((a, i) => (
                  <div key={i} className="px-5 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                        {a.workerId?.name?.[0] || "W"}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{a.workerId?.name || "Worker"}</p>
                        <p className="text-xs text-slate-400">{a.assignedAt ? format(new Date(a.assignedAt), "dd MMM, hh:mm a") : "—"}</p>
                        {a.notes && <p className="text-xs text-slate-500 mt-0.5">{a.notes}</p>}
                      </div>
                    </div>
                    <Badge status={a.status} />
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>

          <div className="space-y-5">
            <SectionCard title="Details">
              <div className="p-5">
                {[
                  { label: "Issue",    value: c.issueType?.replace(/_/g," "), cap: true },
                  { label: "Reporter", value: c.userId?.name || "Anonymous" },
                  { label: "Phone",    value: c.userId?.phone || "—" },
                  { label: "Ward",     value: c.wardId?.name || "—" },
                  { label: "Address",  value: c.address || "GPS only" },
                  { label: "Upvotes",  value: c.upvotes || 0 },
                  { label: "Filed",    value: c.createdAt ? format(new Date(c.createdAt), "dd MMM yyyy") : "—" },
                ].map(r => (
                  <div key={r.label} className="flex justify-between py-2.5 border-b border-slate-50 last:border-0">
                    <span className="text-sm text-slate-500">{r.label}</span>
                    <span className={`text-sm font-medium text-slate-800 text-right ${r.cap ? "capitalize" : ""}`}>{r.value}</span>
                  </div>
                ))}
              </div>
            </SectionCard>
            {c.location?.coordinates && (
              <SectionCard title="Location">
                <div className="p-5">
                  <div className="p-3 bg-slate-50 rounded-xl font-mono text-xs text-slate-600 text-center mb-3">
                    {c.location.coordinates[1].toFixed(6)}, {c.location.coordinates[0].toFixed(6)}
                  </div>
                  <a href={`https://maps.google.com/?q=${c.location.coordinates[1]},${c.location.coordinates[0]}`}
                    target="_blank" rel="noopener noreferrer"
                    className="btn-secondary w-full text-xs flex justify-center">
                    🗺️ Open in Google Maps
                  </a>
                </div>
              </SectionCard>
            )}
            <SectionCard title="Update Status">
              <div className="p-5 space-y-2">
                {["pending","assigned","in_progress","resolved","rejected"].map(s => (
                  <button key={s} onClick={() => statusMut.mutate(s)}
                    disabled={c.status === s || statusMut.isPending}
                    className={`w-full py-2 rounded-lg text-sm font-medium border transition-all capitalize
                      ${c.status === s ? "bg-slate-100 text-slate-400 border-slate-100 cursor-not-allowed"
                        : "bg-white text-slate-700 border-slate-200 hover:border-blue-400 hover:bg-blue-50"}`}>
                    {s.replace(/_/g," ")} {c.status === s && "← Current"}
                  </button>
                ))}
              </div>
            </SectionCard>
          </div>
        </div>
      </div>

      <Modal open={assignModal} onClose={() => setAssignModal(false)} title="Assign Worker" width="max-w-md">
        <div className="space-y-4">
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
              {(workersData?.workers || []).filter(w => w.status === "available").map(w => (
                <option key={w._id} value={w._id}>{w.name} — {w.zone}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Notes (optional)</label>
            <textarea className="input resize-none h-20" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Instructions..." />
          </div>
          <div className="flex gap-3">
            <button onClick={() => {
              if (!id || String(id).length < 12) {
                toast.error('Invalid complaint id')
                return
              }
              assignMut.mutate()
            }} disabled={!workerId || assignMut.isPending} className="btn-primary flex-1">
              {assignMut.isPending ? "Assigning..." : "Confirm Assignment"}
            </button>
            <button onClick={() => setAssignModal(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      </Modal>
    </AuthorityLayout>
  )
}
