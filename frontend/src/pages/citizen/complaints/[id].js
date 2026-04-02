import { useQuery, useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/router'
import { complaintsAPI } from '../../../utils/api'
import CitizenLayout from '../../../components/shared/CitizenLayout'
import { Badge, PriorityBadge, SectionCard } from '../../../components/ui'
import { format, formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'

export default function ComplaintDetailPage() {
  const router = useRouter()
  const { id } = router.query

  const { data, isLoading } = useQuery({
    queryKey: ['complaint', id],
    queryFn:  () => complaintsAPI.get(id),
    select: d => d.data,
    enabled: !!id,
  })

  const upvoteMut = useMutation({
    mutationFn: () => complaintsAPI.upvote(id),
    onSuccess: () => toast.success('Upvoted! Helps authorities prioritise.'),
  })

  if (isLoading) return <div className="flex items-center justify-center min-h-[400px]"><div className="text-center"><div className="text-4xl mb-3 animate-spin">⏳</div><p className="text-slate-500 text-sm">Loading...</p></div></div>
  if (!data) return <div className="flex items-center justify-center min-h-[400px]"><div className="text-center"><div className="text-4xl mb-3">❌</div><p className="text-slate-500">Complaint not found</p></div></div>

  const c = data
  const TIMELINE = [
    { label: 'Submitted',   date: c.createdAt,                     done: true },
    { label: 'Assigned',    date: c.assignments?.[0]?.assignedAt,  done: !!c.assignments?.length },
    { label: 'In Progress', date: null,                            done: ['in_progress','resolved'].includes(c.status) },
    { label: 'Resolved',    date: c.resolvedAt,                    done: c.status === 'resolved' },
  ]

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="btn-ghost btn-sm p-2">←</button>
          <div>
            <h1 className="page-title capitalize">{c.issueType?.replace(/_/g,' ')}</h1>
            <p className="page-sub">Report ID: {id?.slice(-8)?.toUpperCase()}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <PriorityBadge priority={c.priority} />
          <Badge status={c.status} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          {c.imageUrl && (
            <SectionCard title="Submitted Photo">
              <div className="p-4"><img src={c.imageUrl} alt="Complaint" className="w-full rounded-xl object-cover max-h-96" /></div>
            </SectionCard>
          )}
          {c.aiResult?.wasteType && (
            <div className="card p-5 bg-gradient-to-r from-green-50 to-emerald-50 border-green-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center text-2xl flex-shrink-0">🤖</div>
                <div>
                  <p className="text-sm font-bold text-green-800">AI Waste Classification</p>
                  <p className="text-xl font-bold text-green-700 capitalize">{c.aiResult.wasteType} Waste</p>
                  <p className="text-xs text-green-600">Confidence: {Math.round(c.aiResult.confidence * 100)}%</p>
                </div>
              </div>
            </div>
          )}
          {c.description && (
            <SectionCard title="Description">
              <div className="p-5"><p className="text-slate-700 leading-relaxed">{c.description}</p></div>
            </SectionCard>
          )}
          <SectionCard title="Status Timeline">
            <div className="p-5 relative">
              <div className="absolute left-9 top-5 bottom-5 w-px bg-slate-200" />
              <div className="space-y-6">
                {TIMELINE.map((step, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10 border-2 text-sm font-bold
                      ${step.done ? 'bg-green-600 border-green-600 text-white' : 'bg-white border-slate-200 text-slate-300'}`}>
                      {step.done ? '✓' : i + 1}
                    </div>
                    <div className="pt-1">
                      <p className={`text-sm font-semibold ${step.done ? 'text-slate-800' : 'text-slate-400'}`}>{step.label}</p>
                      {step.date && <p className="text-xs text-slate-400 mt-0.5">{format(new Date(step.date), 'dd MMM yyyy, hh:mm a')}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </SectionCard>
        </div>

        <div className="space-y-5">
          <SectionCard title="Details">
            <div className="p-5 space-y-0">
              {[
                { label: 'Issue',    value: c.issueType?.replace(/_/g,' '), cap: true },
                { label: 'Address',  value: c.address || 'Location captured' },
                { label: 'Ward',     value: c.wardId?.name || '—' },
                { label: 'City',     value: c.wardId?.city || '—' },
                { label: 'Filed',    value: c.createdAt ? format(new Date(c.createdAt),'dd MMM yyyy') : '—' },
                { label: 'Upvotes',  value: c.upvotes || 0 },
              ].map(r => (
                <div key={r.label} className="flex justify-between items-start py-2.5 border-b border-slate-50 last:border-0">
                  <span className="text-sm text-slate-500">{r.label}</span>
                  <span className={`text-sm font-medium text-slate-800 text-right ${r.cap ? 'capitalize' : ''}`}>{r.value}</span>
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
          {c.status !== 'resolved' && (
            <SectionCard title="Community Actions">
              <div className="p-5">
                <button onClick={() => upvoteMut.mutate()} disabled={upvoteMut.isPending} className="btn-secondary w-full text-sm">
                  👍 Same issue near me ({c.upvotes || 0} upvotes)
                </button>
                <p className="text-xs text-slate-400 text-center mt-2">Upvoting increases this complaint&apos;s priority</p>
              </div>
            </SectionCard>
          )}
          {c.status === 'rejected' && c.rejectionNote && (
            <div className="card p-4 border-red-100 bg-red-50">
              <p className="text-sm font-semibold text-red-700 mb-1">Rejection Reason</p>
              <p className="text-sm text-red-600">{c.rejectionNote}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
ComplaintDetailPage.getLayout = page => <CitizenLayout>{page}</CitizenLayout>
