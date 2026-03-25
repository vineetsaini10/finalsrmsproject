const LEVEL_NAMES = [
  '', 'Eco Beginner', 'Green Citizen', 'Eco Warrior',
  'Waste Champion', 'Eco Hero', 'Planet Guardian', 'Sustainability Star',
]
const LEVEL_THRESHOLDS = [0, 100, 300, 600, 1000, 1500, 2500, 4000]

export default function GamificationBar({ gamification }) {
  const level = gamification.level || 1
  const points = gamification.total_points || 0
  const nextThreshold = LEVEL_THRESHOLDS[level] || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1]
  const prevThreshold = LEVEL_THRESHOLDS[level - 1] || 0
  const progress = nextThreshold > prevThreshold
    ? Math.min(100, Math.round(((points - prevThreshold) / (nextThreshold - prevThreshold)) * 100))
    : 100

  return (
    <div className="card p-4 border border-primary-100 bg-gradient-to-r from-primary-50 to-white">
      <div className="flex items-center justify-between mb-2">
        <div>
          <span className="text-sm font-semibold text-primary-700">
            Level {level} — {LEVEL_NAMES[level] || 'Master'}
          </span>
        </div>
        <span className="text-sm font-bold text-primary-600">{points.toLocaleString()} pts</span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-primary-100 rounded-full h-2 mb-3 overflow-hidden">
        <div
          className="h-full bg-primary-400 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-primary-500 mb-3">
        <span>{prevThreshold.toLocaleString()} pts</span>
        <span>{progress}% to Level {level + 1}</span>
        <span>{nextThreshold.toLocaleString()} pts</span>
      </div>

      {/* Badges */}
      {gamification.badges?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {gamification.badges.slice(0, 5).map(badge => (
            <span
              key={badge}
              className="text-xs px-2 py-0.5 rounded-full bg-primary-100 text-primary-700 font-medium"
            >
              {badge.replace(/_/g, ' ')}
            </span>
          ))}
          {gamification.badges.length > 5 && (
            <span className="text-xs text-primary-400">+{gamification.badges.length - 5} more</span>
          )}
        </div>
      )}

      {/* Streak */}
      {gamification.streak_days > 0 && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-warning-400 font-medium">
          <span>🔥</span>
          <span>{gamification.streak_days}-day streak</span>
        </div>
      )}
    </div>
  )
}
