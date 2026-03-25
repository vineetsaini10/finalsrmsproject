// StatsCard.js
export default function StatsCard({ label, value, color, bg, loading }) {
  return (
    <div className={`card p-4 ${bg}`}>
      {loading ? (
        <div className="animate-pulse">
          <div className="h-8 bg-white/60 rounded w-16 mb-1" />
          <div className="h-3 bg-white/40 rounded w-24" />
        </div>
      ) : (
        <>
          <div className={`text-3xl font-bold ${color}`}>{value}</div>
          <div className="text-xs text-gray-500 mt-1 font-medium">{label}</div>
        </>
      )}
    </div>
  )
}
