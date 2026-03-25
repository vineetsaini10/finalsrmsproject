// ComplaintCard.js — Citizen complaint list item
import Link from 'next/link'

const STATUS_CONFIG = {
  pending:     { label: 'Pending',     cls: 'badge-pending',  dot: 'status-dot-red' },
  assigned:    { label: 'Assigned',    cls: 'badge-progress', dot: 'status-dot-amber' },
  in_progress: { label: 'In Progress', cls: 'badge-progress', dot: 'status-dot-amber' },
  resolved:    { label: 'Resolved',    cls: 'badge-resolved', dot: 'status-dot-green' },
  rejected:    { label: 'Rejected',    cls: 'badge-pending',  dot: 'status-dot-red' },
}

const ISSUE_EMOJI = {
  full_dustbin: '🗑️', illegal_dumping: '⚠️', burning_waste: '🔥',
  missed_collection: '🚛', overflowing_bin: '💧', other: '📍',
}

export default function ComplaintCard({ complaint }) {
  const sc = STATUS_CONFIG[complaint.status] || STATUS_CONFIG.pending
  const timeAgo = (date) => {
    const diff = (Date.now() - new Date(date)) / 1000
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
  }

  return (
    <Link href={`/complaints/${complaint.id}`}>
      <div className="card p-4 hover:shadow-md transition-all cursor-pointer">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center text-xl flex-shrink-0">
            {ISSUE_EMOJI[complaint.issue_type] || '📍'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-gray-900 capitalize">
                {complaint.issue_type.replace(/_/g, ' ')}
              </span>
              <span className={sc.cls}>{sc.label}</span>
            </div>
            {complaint.address && (
              <p className="text-xs text-gray-500 mt-0.5 truncate">{complaint.address}</p>
            )}
            <div className="flex items-center gap-3 mt-1.5">
              <span className="text-xs text-gray-400">{timeAgo(complaint.created_at)}</span>
              {complaint.waste_type && (
                <span className="text-xs text-primary-600 font-medium">
                  AI: {complaint.waste_type}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
