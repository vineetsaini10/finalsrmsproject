import { useQuery } from '@tanstack/react-query'
import { gamificationAPI } from '../../utils/api'
import useAuthStore from '../../context/authStore'
import CitizenLayout from '../../components/shared/CitizenLayout'
import { SectionCard } from '../../components/ui'

const MEDAL = ['🥇', '🥈', '🥉']

export default function LeaderboardPage() {
  const { user } = useAuthStore()
  const { data, isLoading } = useQuery({
    queryKey: ['leaderboard', user?.wardId],
    queryFn:  () => gamificationAPI.leaderboard(user?.wardId),
    select: d => d.data,
  })
  const lb = data?.leaderboard || []

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">🏆 Leaderboard</h1><p className="page-sub">{user?.wardName} · Top eco citizens this month</p></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top 3 podium */}
        {lb.length >= 3 && (
          <div className="lg:col-span-1">
            <SectionCard title="Top 3 Champions">
              <div className="p-6">
                <div className="flex items-end justify-center gap-4">
                  {[1, 0, 2].map(i => {
                    const entry = lb[i]; if (!entry) return null
                    const heights = { 0: 'h-28', 1: 'h-20', 2: 'h-16' }
                    return (
                      <div key={i} className="flex flex-col items-center gap-2">
                        <div className="w-12 h-12 rounded-full bg-green-100 border-2 border-green-300 flex items-center justify-center text-lg font-bold text-green-700">
                          {entry.name?.[0]}
                        </div>
                        <span className="text-xl">{MEDAL[i === 0 ? 1 : i === 1 ? 0 : 2]}</span>
                        <div className={`w-full ${heights[i === 0 ? 1 : i === 1 ? 0 : 2]} rounded-t-xl flex flex-col items-center justify-end pb-2 ${i===1?'bg-amber-100':'i'===0?'bg-slate-100':'bg-orange-50'}`} style={{ background: i===1?'#fef3c7':i===0?'#f1f5f9':'#fff7ed' }}>
                          <span className="text-xs font-bold text-slate-800 text-center px-1 truncate w-full text-center">{entry.name?.split(' ')[0]}</span>
                          <span className="text-xs text-green-600 font-semibold">{entry.totalPoints} pts</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </SectionCard>
          </div>
        )}

        {/* Full leaderboard */}
        <div className={lb.length >= 3 ? 'lg:col-span-2' : 'lg:col-span-3'}>
          <SectionCard title="Full Rankings">
            {isLoading ? (
              <div className="p-10 text-center text-slate-400">Loading...</div>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr><th>#</th><th>Citizen</th><th>Level</th><th>Reports</th><th>Streak</th><th>Points</th></tr>
                  </thead>
                  <tbody>
                    {lb.map((e, i) => {
                      const isMe = e.name === user?.name
                      return (
                        <tr key={i} className={isMe ? 'bg-green-50' : ''}>
                          <td className="font-bold text-slate-500">{i < 3 ? MEDAL[i] : `${i+1}`}</td>
                          <td>
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${isMe ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                                {e.name?.[0]}
                              </div>
                              <span className={`font-medium ${isMe ? 'text-green-700' : 'text-slate-800'}`}>
                                {e.name} {isMe && <span className="text-xs text-green-500">(You)</span>}
                              </span>
                            </div>
                          </td>
                          <td><span className="badge-gray">Lv. {e.level}</span></td>
                          <td className="text-slate-700 font-medium">{e.reportsCount || 0}</td>
                          <td>{(e.streakDays || 0) > 0 ? <span className="text-amber-500 font-medium">🔥 {e.streakDays}d</span> : <span className="text-slate-300">—</span>}</td>
                          <td><span className={`text-base font-bold ${isMe ? 'text-green-600' : 'text-slate-800'}`}>{(e.totalPoints||0).toLocaleString()}</span></td>
                        </tr>
                      )
                    })}
                    {!lb.length && <tr><td colSpan={6} className="text-center py-10 text-slate-400">No data yet — be the first to report!</td></tr>}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  )
}

LeaderboardPage.getLayout = page => <CitizenLayout>{page}</CitizenLayout>
