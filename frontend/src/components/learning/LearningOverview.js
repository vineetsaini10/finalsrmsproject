import GamificationBar from '../gamification/GamificationBar'

export default function LearningOverview({ progress }) {
  const totalModules = progress?.totalModules || 0
  const completedModules = progress?.completedModules || 0
  const completionPercentage = progress?.completionPercentage || 0
  const quizzesCompleted = progress?.quizzesCompleted || 0

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
      <div className="card p-5 xl:col-span-2 bg-gradient-to-r from-green-700 to-emerald-600 text-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-green-100">Learning Progress</p>
            <h2 className="mt-1 text-2xl font-bold">Build better waste habits one lesson at a time</h2>
            <p className="mt-2 max-w-2xl text-sm text-green-100">
              Finish short modules, take quizzes, and unlock badges as you improve your recycling, reuse, segregation, and composting skills.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 min-w-[240px]">
            <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
              <div className="text-xs uppercase tracking-wide text-green-100">Modules</div>
              <div className="mt-1 text-2xl font-bold">{completedModules}/{totalModules}</div>
            </div>
            <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
              <div className="text-xs uppercase tracking-wide text-green-100">Quizzes</div>
              <div className="mt-1 text-2xl font-bold">{quizzesCompleted}</div>
            </div>
          </div>
        </div>
        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between text-sm text-green-100">
            <span>Completion</span>
            <span>{completionPercentage}%</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-white/20">
            <div
              className="h-full rounded-full bg-white transition-all duration-500"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>
      </div>

      <GamificationBar gamification={progress || {}} />
    </div>
  )
}
