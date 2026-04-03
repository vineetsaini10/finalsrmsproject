import Link from 'next/link'

const CATEGORY_STYLES = {
  segregation: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  recycle: 'bg-blue-50 text-blue-700 border-blue-100',
  recycling: 'bg-blue-50 text-blue-700 border-blue-100',
  reuse: 'bg-amber-50 text-amber-700 border-amber-100',
  composting: 'bg-orange-50 text-orange-700 border-orange-100',
  plastic: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-100',
  ewaste: 'bg-slate-100 text-slate-700 border-slate-200',
}

function formatCategory(category) {
  return (category || 'awareness').replace(/_/g, ' ')
}

export default function LearningModuleCard({ module }) {
  const categoryStyle = CATEGORY_STYLES[module.category] || 'bg-slate-50 text-slate-700 border-slate-100'

  return (
    <div className="card overflow-hidden border border-slate-100">
      <div className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${categoryStyle}`}>
              {formatCategory(module.category)}
            </span>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{module.title}</h3>
              <p className="mt-1 text-sm text-slate-500 line-clamp-3">{module.description || 'Practical waste management lessons for daily life.'}</p>
            </div>
          </div>
          <div className="rounded-2xl bg-green-50 px-3 py-2 text-right">
            <div className="text-xs font-medium text-green-600">Reward</div>
            <div className="text-sm font-bold text-green-700">+{module.pointsReward || 10} pts</div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span className="rounded-full bg-slate-100 px-2.5 py-1 capitalize">{module.contentType}</span>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 capitalize">{module.difficulty || 'beginner'}</span>
          <span className="rounded-full bg-slate-100 px-2.5 py-1">{module.durationMins || 3} min</span>
          {module.completed && (
            <span className="rounded-full bg-green-100 px-2.5 py-1 font-semibold text-green-700">
              Completed
            </span>
          )}
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="text-sm text-slate-500">
            {module.completed
              ? `Last score: ${module.score ?? 0}/${module.quiz_questions?.length || 0}`
              : 'Includes a short quiz and progress tracking.'}
          </div>
          <Link href={`/citizen/learn/${module.id}`} className="btn-primary whitespace-nowrap">
            {module.completed ? 'Review Module' : 'Open Module'}
          </Link>
        </div>
      </div>
    </div>
  )
}
