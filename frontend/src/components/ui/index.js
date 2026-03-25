// Reusable UI primitives

export function Spinner({ size = 'sm' }) {
  const s = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' }[size]
  return (
    <div className={`${s} border-2 border-slate-200 border-t-green-600 rounded-full animate-spin`} />
  )
}

export function EmptyState({ icon = '📭', title, subtitle, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="text-5xl mb-4">{icon}</div>
      <h3 className="text-base font-semibold text-slate-700 mb-1">{title}</h3>
      {subtitle && <p className="text-sm text-slate-400 mb-4">{subtitle}</p>}
      {action}
    </div>
  )
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-3">
        <Spinner size="lg" />
        <p className="text-sm text-slate-400">Loading...</p>
      </div>
    </div>
  )
}

export function SectionCard({ title, subtitle, action, children, className = '' }) {
  return (
    <div className={`card ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
            {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div>{children}</div>
    </div>
  )
}

export function StatCard({ label, value, icon, change, changeLabel, color = 'green', loading }) {
  const colors = {
    green:  { bg: 'bg-green-50',  icon: 'bg-green-100 text-green-600',  val: 'text-green-700' },
    blue:   { bg: 'bg-blue-50',   icon: 'bg-blue-100 text-blue-600',    val: 'text-blue-700'  },
    red:    { bg: 'bg-red-50',    icon: 'bg-red-100 text-red-600',      val: 'text-red-700'   },
    amber:  { bg: 'bg-amber-50',  icon: 'bg-amber-100 text-amber-600',  val: 'text-amber-700' },
    purple: { bg: 'bg-purple-50', icon: 'bg-purple-100 text-purple-600',val: 'text-purple-700'},
    slate:  { bg: 'bg-slate-50',  icon: 'bg-slate-100 text-slate-600',  val: 'text-slate-700' },
  }
  const c = colors[color] || colors.green

  if (loading) {
    return (
      <div className="stat-card animate-pulse">
        <div className="h-4 bg-slate-100 rounded w-24 mb-3" />
        <div className="h-8 bg-slate-100 rounded w-16" />
      </div>
    )
  }

  return (
    <div className={`stat-card ${c.bg} border-0`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="stat-label text-slate-600">{label}</p>
          <p className={`stat-value ${c.val} mt-1`}>{value}</p>
          {changeLabel && (
            <p className={`stat-change ${change >= 0 ? 'stat-up' : 'stat-down'}`}>
              {change >= 0 ? '↑' : '↓'} {Math.abs(change)}% {changeLabel}
            </p>
          )}
        </div>
        {icon && (
          <div className={`w-10 h-10 rounded-xl ${c.icon} flex items-center justify-center text-lg flex-shrink-0`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}

export function Badge({ status }) {
  const map = {
    pending:     <span className="badge-pending">⏳ Pending</span>,
    assigned:    <span className="badge-assigned">👷 Assigned</span>,
    in_progress: <span className="badge-progress">🔄 In Progress</span>,
    resolved:    <span className="badge-resolved">✅ Resolved</span>,
    rejected:    <span className="badge-gray">✗ Rejected</span>,
  }
  return map[status] || <span className="badge-gray">{status}</span>
}

export function PriorityBadge({ priority }) {
  const map = {
    3: <span className="badge-urgent">🔴 Urgent</span>,
    2: <span className="badge-pending">🟡 Moderate</span>,
    1: <span className="badge-gray">⚪ Low</span>,
  }
  return map[priority] || null
}

export function Avatar({ name, size = 'md', color = 'green' }) {
  const sizes = { sm: 'w-7 h-7 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-12 h-12 text-base', xl: 'w-16 h-16 text-xl' }
  const colors = {
    green: 'bg-green-100 text-green-700',
    blue:  'bg-blue-100 text-blue-700',
    slate: 'bg-slate-100 text-slate-600',
  }
  return (
    <div className={`${sizes[size]} ${colors[color]} rounded-full flex items-center justify-center font-semibold flex-shrink-0`}>
      {(name || '?')[0].toUpperCase()}
    </div>
  )
}

export function Divider({ label }) {
  return (
    <div className="relative my-5">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-slate-200" />
      </div>
      {label && (
        <div className="relative flex justify-center text-xs">
          <span className="bg-white px-3 text-slate-400">{label}</span>
        </div>
      )}
    </div>
  )
}

export function Modal({ open, onClose, title, children, width = 'max-w-lg' }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-white rounded-2xl shadow-2xl w-full ${width} max-h-[90vh] overflow-y-auto`}>
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-800">{title}</h2>
            <button onClick={onClose} className="btn-ghost btn-sm rounded-lg p-1.5 text-slate-400 hover:text-slate-600">✕</button>
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
      {tabs.map(t => (
        <button
          key={t.value}
          onClick={() => onChange(t.value)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap
            ${active === t.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          {t.label} {t.count !== undefined && (
            <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${active === t.value ? 'bg-slate-100 text-slate-600' : 'bg-slate-200 text-slate-500'}`}>
              {t.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

export function SearchInput({ value, onChange, placeholder = 'Search...' }) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="input pl-9 w-64"
      />
    </div>
  )
}
