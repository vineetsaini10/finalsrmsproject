import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { notificationsAPI } from '../../utils/api'
import CitizenLayout from '../../components/shared/CitizenLayout'
import { SectionCard, EmptyState } from '../../components/ui'
import { formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'

const TYPE_CONFIG = {
  complaint_update: { icon: '📋', color: 'bg-blue-50 border-blue-100',   iconBg: 'bg-blue-100 text-blue-600'   },
  awareness:        { icon: '💡', color: 'bg-amber-50 border-amber-100', iconBg: 'bg-amber-100 text-amber-600' },
  announcement:     { icon: '📢', color: 'bg-purple-50 border-purple-100', iconBg: 'bg-purple-100 text-purple-600' },
  reward:           { icon: '🏆', color: 'bg-green-50 border-green-100', iconBg: 'bg-green-100 text-green-600'  },
}

export default function NotificationsPage() {
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn:  () => notificationsAPI.list({ limit: 30 }),
    select: d => d.data,
  })

  const markAllMut = useMutation({
    mutationFn: notificationsAPI.markAllRead,
    onSuccess: () => { toast.success('All marked as read'); qc.invalidateQueries(['notifications']); qc.invalidateQueries(['notif-count']) },
  })

  const markMut = useMutation({
    mutationFn: (id) => notificationsAPI.markRead(id),
    onSuccess: () => { qc.invalidateQueries(['notifications']); qc.invalidateQueries(['notif-count']) },
  })

  const notifications = data?.notifications || []
  const unread        = data?.unread_count   || 0

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-sub">{unread > 0 ? `${unread} unread` : 'All caught up!'}</p>
        </div>
        {unread > 0 && (
          <button onClick={() => markAllMut.mutate()} disabled={markAllMut.isPending}
            className="btn-secondary">
            ✓ Mark all as read
          </button>
        )}
      </div>

      <SectionCard>
        {isLoading ? (
          <div className="p-10 text-center text-slate-400">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <EmptyState icon="🔔" title="No notifications yet" subtitle="You'll receive updates about your complaints and eco rewards here" />
        ) : (
          <div className="divide-y divide-slate-50">
            {notifications.map(n => {
              const tc = TYPE_CONFIG[n.type] || TYPE_CONFIG.announcement
              return (
                <div
                  key={n._id}
                  onClick={() => !n.isRead && markMut.mutate(n._id)}
                  className={`flex items-start gap-4 px-5 py-4 transition-colors cursor-pointer
                    ${!n.isRead ? 'bg-blue-50/40 hover:bg-blue-50' : 'hover:bg-slate-50'}`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${tc.iconBg}`}>
                    {tc.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm font-semibold ${!n.isRead ? 'text-slate-900' : 'text-slate-700'}`}>
                        {n.title}
                      </p>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-slate-400 whitespace-nowrap">
                          {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                        </span>
                        {!n.isRead && <span className="w-2.5 h-2.5 rounded-full bg-blue-500 flex-shrink-0" />}
                      </div>
                    </div>
                    {n.body && <p className="text-sm text-slate-500 mt-0.5 leading-relaxed">{n.body}</p>}
                    <div className="mt-1.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${tc.color}`}>
                        {n.type?.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </SectionCard>
    </div>
  )
}

NotificationsPage.getLayout = page => <CitizenLayout>{page}</CitizenLayout>
