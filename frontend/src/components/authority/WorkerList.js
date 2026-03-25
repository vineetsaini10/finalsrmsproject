const STATUS_CONFIG = {
  available: { dot: 'bg-primary-400',  label: 'Available',  text: 'text-primary-600',  bg: 'bg-primary-50' },
  busy:      { dot: 'bg-warning-200',  label: 'On Task',    text: 'text-warning-400',  bg: 'bg-warning-50' },
  break:     { dot: 'bg-gray-300',     label: 'Break',      text: 'text-gray-500',     bg: 'bg-gray-50' },
  offline:   { dot: 'bg-gray-200',     label: 'Offline',    text: 'text-gray-400',     bg: 'bg-gray-50' },
}

export default function WorkerList({ workers }) {
  if (!workers.length) {
    return <div className="p-6 text-center text-sm text-gray-400">No workers found</div>
  }

  return (
    <div className="divide-y divide-gray-50">
      {workers.map(w => {
        const sc = STATUS_CONFIG[w.status] || STATUS_CONFIG.offline
        return (
          <div key={w.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
            <div className="w-8 h-8 rounded-full bg-authority-50 flex items-center justify-center text-sm font-medium text-authority-600 flex-shrink-0">
              {w.name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-800 truncate">{w.name}</div>
              <div className="text-xs text-gray-400">{w.zone || 'Unassigned'}</div>
            </div>
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${sc.dot}`} />
              <span className={`text-xs font-medium ${sc.text}`}>{sc.label}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
