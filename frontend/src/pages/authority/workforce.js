import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { workersAPI } from '../../utils/api'
import useAuthStore from '../../context/authStore'
import AuthorityLayout from '../../components/authority/AuthorityLayout'
import { StatCard, SectionCard, EmptyState } from '../../components/ui'

const STATUS_CONFIG = {
  available: { label: 'Available',  bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200',  dot: 'bg-green-500'  },
  busy:      { label: 'On Task',    bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200',   dot: 'bg-blue-500'   },
  break:     { label: 'On Break',   bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200',  dot: 'bg-amber-400'  },
  offline:   { label: 'Offline',    bg: 'bg-slate-50',  text: 'text-slate-500',  border: 'border-slate-200',  dot: 'bg-slate-300'  },
}

export default function WorkforcePage() {
  const { user } = useAuthStore()
  const qc       = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['all-workers', user?.wardId],
    queryFn:  () => workersAPI.list({ ward_id: user?.wardId }),
    select: d => d.data,
    refetchInterval: 30_000,
  })

  const statusMut = useMutation({
    mutationFn: ({ id, status }) => workersAPI.updateStatus(id, status),
    onSuccess: () => { toast.success('Status updated'); qc.invalidateQueries(['all-workers']) },
  })

  const workers   = data?.workers || []
  const available = workers.filter(w => w.status === 'available').length
  const busy      = workers.filter(w => w.status === 'busy').length
  const offline   = workers.filter(w => w.status === 'offline' || w.status === 'break').length

  return (
    <AuthorityLayout>
      <div className="space-y-6">
        <div className="page-header">
          <div>
            <h1 className="page-title">Workforce Management</h1>
            <p className="page-sub">Monitor and manage waste collection workers</p>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Workers"  value={workers.length} icon="👷" color="slate" loading={isLoading} />
          <StatCard label="Available"      value={available}      icon="✅" color="green" loading={isLoading} />
          <StatCard label="On Task"        value={busy}           icon="🔄" color="blue"  loading={isLoading} />
          <StatCard label="Offline/Break"  value={offline}        icon="⏸" color="amber" loading={isLoading} />
        </div>

        {/* Workers table */}
        <SectionCard title="All Workers" subtitle={`${workers.length} workers across all zones`}>
          {isLoading ? (
            <div className="p-10 text-center text-slate-400">Loading workers...</div>
          ) : workers.length === 0 ? (
            <EmptyState icon="👷" title="No workers found" subtitle="Workers will appear here once added to the system" />
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Worker</th>
                    <th>Employee ID</th>
                    <th>Zone</th>
                    <th>Ward</th>
                    <th>Phone</th>
                    <th>Tasks Done</th>
                    <th>Status</th>
                    <th>Update Status</th>
                  </tr>
                </thead>
                <tbody>
                  {workers.map(w => {
                    const sc = STATUS_CONFIG[w.status] || STATUS_CONFIG.offline
                    return (
                      <tr key={w._id}>
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-semibold text-sm flex-shrink-0">
                              {w.name[0]}
                            </div>
                            <span className="font-medium text-slate-800">{w.name}</span>
                          </div>
                        </td>
                        <td className="text-slate-500 text-sm font-mono">{w.employeeId || '—'}</td>
                        <td className="text-slate-700">{w.zone || '—'}</td>
                        <td className="text-slate-500 text-sm">{w.wardId?.name || '—'}</td>
                        <td className="text-slate-600 text-sm">{w.phone || '—'}</td>
                        <td>
                          <span className="font-semibold text-slate-800">{w.tasksCompleted || 0}</span>
                        </td>
                        <td>
                          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${sc.bg} ${sc.text} border ${sc.border}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                            {sc.label}
                          </div>
                        </td>
                        <td>
                          <select className="select text-xs w-32 py-1.5"
                            value={w.status}
                            onChange={e => statusMut.mutate({ id: w._id, status: e.target.value })}>
                            <option value="available">Available</option>
                            <option value="busy">On Task</option>
                            <option value="break">Break</option>
                            <option value="offline">Offline</option>
                          </select>
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
