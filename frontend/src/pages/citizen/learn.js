import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { trainingAPI, gamificationAPI } from '../../utils/api'
import CitizenLayout from '../../components/shared/CitizenLayout'
import toast from 'react-hot-toast'
import { 
  BookOpen, 
  Video, 
  FileText, 
  CheckCircle2, 
  Award, 
  Shapes, 
  Clock, 
  Tent, 
  Recycle, 
  Lightbulb,
  Search,
  ChevronRight,
  PlayCircle,
  HelpCircle,
  Flame,
  Star,
  Trophy,
  Zap,
  ArrowRight,
  Target
} from 'lucide-react'
import ModuleStory from '../../components/citizen/ModuleStory'

const CATEGORIES = [
  { value: '', label: 'All', icon: <Shapes className="w-4 h-4" /> },
  { value: 'segregation', label: 'Segregation', icon: <Recycle className="w-4 h-4" /> },
  { value: 'composting', label: 'Composting', icon: <Tent className="w-4 h-4" /> },
  { value: 'recycling', label: 'Recycling', icon: <Recycle className="w-4 h-4" /> },
  { value: 'awareness', label: 'Awareness', icon: <Lightbulb className="w-4 h-4" /> },
]

function ProgressHeader({ userPoints }) {
  const points = userPoints?.totalPoints || 0
  const level = userPoints?.level || 1
  const streak = userPoints?.streakDays || 0
  
  const levels = [0, 100, 300, 600, 1000, 1500, 2500, 4000, 6000, 10000]
  const nextLevelPoints = levels[level] || 10000
  const prevLevelPoints = levels[level - 1] || 0
  const progress = Math.min(((points - prevLevelPoints) / (nextLevelPoints - prevLevelPoints)) * 100, 100)

  return (
    <div className="relative mb-12">
      <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-slate-200 overflow-hidden">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-emerald-500/20 rounded-full blur-[100px]" />
        
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
          <div className="md:col-span-2 space-y-6">
            <div className="flex items-center gap-4">
               <div className="w-16 h-16 bg-white/10 backdrop-blur-xl rounded-3xl flex items-center justify-center border border-white/10 shadow-inner">
                  <Star className="w-8 h-8 text-yellow-400 fill-yellow-400" />
               </div>
               <div>
                  <h2 className="text-3xl font-black tracking-tight">Level {level} <span className="text-emerald-400 ml-2">Eco Master</span></h2>
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-1">Global Citizen Rank</p>
               </div>
            </div>

            <div className="space-y-3 max-w-md">
              <div className="flex justify-between text-xs font-black uppercase tracking-widest text-slate-400">
                <span>Next Milestone</span>
                <span className="text-white">{points} / {nextLevelPoints} XP</span>
              </div>
              <div className="h-4 w-full bg-white/5 rounded-full overflow-hidden border border-white/10 p-1">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 to-green-400 rounded-full shadow-[0_0_20px_rgba(16,185,129,0.5)] transition-all duration-1000"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-center md:justify-end gap-4">
             <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-5 rounded-[2rem] text-center w-32 group hover:bg-white/10 transition-all hover:scale-105">
                <Flame className={`w-8 h-8 mx-auto mb-2 ${streak > 0 ? 'text-orange-500 fill-orange-500 animate-pulse' : 'text-slate-600'}`} />
                <div className="text-2xl font-black">{streak}</div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Day Streak</div>
             </div>
             <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-5 rounded-[2rem] text-center w-32 group hover:bg-white/10 transition-all hover:scale-105">
                <Zap className="w-8 h-8 text-yellow-400 fill-yellow-400 mx-auto mb-2" />
                <div className="text-2xl font-black">{points}</div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Total XP</div>
             </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function QuizModal({ module: mod, onClose, onSubmit, submitting }) {
  const questions = mod?.quiz_questions || []
  const [answers, setAnswers] = useState({})

  const handleSubmit = () => {
    onSubmit({ module_id: mod.id, answers })
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="font-bold text-gray-900 text-lg">Quiz: {mod.title}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{questions.length} Questions • Score 60% to pass</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-xl text-gray-400 hover:text-gray-600 transition-colors">
            ✕
          </button>
        </div>

        <div className="p-6 space-y-8 overflow-y-auto flex-1">
          {questions.map((q, qi) => (
            <div key={`${mod.id}-${qi}`} className="space-y-4">
              <div className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-bold">
                  {qi + 1}
                </span>
                <p className="text-sm font-semibold text-gray-800 leading-relaxed">{q.question}</p>
              </div>
              <div className="grid grid-cols-1 gap-2.5 pl-9">
                {(q.options || []).map((opt, oi) => (
                  <button
                    key={oi}
                    onClick={() => setAnswers({ ...answers, [qi]: oi })}
                    className={`w-full text-left text-sm px-4 py-3 rounded-2xl border-2 transition-all duration-200 group ${
                      answers[qi] === oi
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-4 ring-emerald-500/10'
                        : 'border-slate-100 hover:border-emerald-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{opt}</span>
                      {answers[qi] === oi && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="p-6 border-t border-gray-100 bg-slate-50">
          <button
            onClick={handleSubmit}
            disabled={submitting || Object.keys(answers).length < questions.length}
            className={`w-full py-4 rounded-2xl font-bold shadow-lg shadow-emerald-200 flex items-center justify-center gap-3 transition-all ${
              submitting || Object.keys(answers).length < questions.length
                ? 'bg-slate-300 text-white cursor-not-allowed shadow-none'
                : 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-[0.98]'
            }`}
          >
            {submitting ? 'Submitting...' : 'Finish and Claim Rewards'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ModuleIcon({ type }) {
  switch (type) {
    case 'video': return <PlayCircle className="w-5 h-5" />
    case 'quiz': return <HelpCircle className="w-5 h-5" />
    case 'article': return <FileText className="w-5 h-5" />
    case 'infographic': return <Shapes className="w-5 h-5" />
    default: return <BookOpen className="w-5 h-5" />
  }
}

export default function LearnPage() {
  const qc = useQueryClient()
  const [activeModule, setActiveModule] = useState(null)

  const { data: userPoints } = useQuery({
    queryKey: ['gamification-me'],
    queryFn: () => gamificationAPI.me().then(res => res.data),
  })

  const { data, isLoading } = useQuery({
    queryKey: ['training-modules'],
    queryFn: () => trainingAPI.modules(),
    select: (d) => d.data,
  })

  const refreshLearning = () => {
    qc.invalidateQueries({ queryKey: ['training-modules'] })
    qc.invalidateQueries({ queryKey: ['gamification-me'] })
  }

  const submitMutation = useMutation({
    mutationFn: trainingAPI.submitQuiz,
    onSuccess: (res, variables) => {
      const { passed, points_earned, already_rewarded } = res.data || {}
      if (!passed) {
        toast.error('Quiz failed. Review the content and try again.')
      } else if (already_rewarded) {
        toast('Quiz already passed! Points already collected.')
        if (variables.onNext) variables.onNext()
      } else {
        toast.success(`Quiz passed! +${points_earned} points`, { icon: '✨' })
        if (variables.onNext) variables.onNext()
      }
      refreshLearning()
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Failed to submit quiz'),
  })

  const taskMutation = useMutation({
    mutationFn: trainingAPI.completeTask,
    onSuccess: (res) => {
       toast.success(`Task complete! +${res.data?.points_earned || 20} points`, { icon: '🚀' })
       refreshLearning()
    }
  })

  const completeMutation = useMutation({
    mutationFn: (moduleId) => trainingAPI.completeModule(moduleId),
    onSuccess: (res) => {
      if (res.data?.already_rewarded) toast('Module already completed.')
      else toast.success(`Module completed! +${res.data?.points_earned || 0} points`, { icon: '✅' })
      refreshLearning()
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Failed to complete module'),
  })

  const modules = data?.modules || []
  const currentModule = modules.find(m => !m.completed) || modules[0]

  return (
    <div className="pb-32 bg-slate-50 -mx-6 px-6 sm:-mx-10 sm:px-10 -mt-10 pt-10 min-h-screen">
      <div className="max-w-3xl mx-auto">
        <div className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Learning Path</h1>
            <p className="text-slate-500 font-bold mt-1 uppercase tracking-widest text-[10px]">Your journey to Green Master</p>
          </div>
          <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3">
             <Trophy className="w-6 h-6 text-yellow-500" />
             <div className="text-right">
                <div className="text-[10px] font-black uppercase text-slate-400 leading-none">Badges</div>
                <div className="font-black text-slate-800 leading-none mt-1">{(userPoints?.badges || []).length} Collected</div>
             </div>
          </div>
        </div>

        <ProgressHeader userPoints={userPoints} />

        {/* The Path */}
        <div className="relative">
           {/* Connecting Line */}
           <div className="absolute left-1/2 top-0 bottom-0 w-2.5 bg-slate-200 -translate-x-1/2 rounded-full hidden sm:block" />

           <div className="relative z-10 flex flex-col gap-12 sm:gap-24 py-8">
              {isLoading ? (
                [1,2,3].map(i => <div key={i} className="w-16 h-16 bg-slate-200 rounded-full animate-pulse mx-auto" />)
              ) : (
                modules.map((mod, i) => {
                  const isCurrent = currentModule?.id === mod.id && !mod.completed
                  const isLocked = !mod.completed && !isCurrent
                   // Alternating alignment for Duolingo feel
                  const alignmentClass = i % 2 === 0 ? 'sm:-translate-x-16' : 'sm:translate-x-16'

                  return (
                    <div key={mod.id} className="flex flex-col items-center">
                       <div className={`relative ${alignmentClass} group`}>
                          {isCurrent && (
                            <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest whitespace-nowrap animate-bounce shadow-xl">
                               Start Here! ✨
                               <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-900 rotate-45" />
                            </div>
                          )}
                          
                          <button
                            disabled={isLocked}
                            onClick={() => setActiveModule(mod)}
                            className={`w-24 h-24 sm:w-32 sm:h-32 rounded-[2.5rem] border-b-[8px] flex flex-col items-center justify-center transition-all relative ${
                              mod.completed 
                                ? 'bg-emerald-500 border-emerald-700 text-white shadow-[0_10px_0_rgba(16,185,129,1)]' 
                                : isCurrent 
                                  ? 'bg-emerald-600 border-emerald-800 text-white animate-pulse shadow-xl active:scale-95 active:border-b-[2px] active:translate-y-[6px]' 
                                  : 'bg-slate-200 border-slate-300 text-slate-400 cursor-not-allowed border-b-[6px]'
                            }`}
                          >
                             {mod.completed ? <CheckCircle2 className="w-10 h-10 sm:w-14 sm:h-14 stroke-[3]" /> : <ModuleIcon type={mod.content_type} />}
                             <span className="text-[10px] font-black uppercase tracking-tighter mt-1">{mod.category}</span>
                          </button>

                          <div className={`absolute top-1/2 -translate-y-1/2 whitespace-nowrap hidden sm:block ${
                            i % 2 === 0 ? 'left-40 text-left' : 'right-40 text-right'
                          }`}>
                             <h3 className={`text-lg font-black tracking-tight ${isLocked ? 'text-slate-300' : 'text-slate-800'}`}>{mod.title}</h3>
                             <p className="text-[10px] font-bold text-slate-400 flex items-center gap-2 justify-start sm:justify-end">
                                <Clock className="w-3 h-3" /> {mod.duration_mins} min • {mod.points_reward} XP
                             </p>
                          </div>
                       </div>
                    </div>
                  )
                })
              )}
           </div>

           {/* Next Milestones Suggestion */}
           {!isLoading && (
              <div className="mt-20 p-8 bg-white border-4 border-slate-100 rounded-[3rem] text-center shadow-sm">
                  <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-[1.5rem] flex items-center justify-center mx-auto mb-4 border border-indigo-100">
                     <Target className="w-8 h-8" />
                  </div>
                  <h4 className="text-2xl font-black text-slate-900">Keep it up!</h4>
                  <p className="text-slate-500 font-bold mb-6">Complete more modules to unlock the &quot;Green Warrior&quot; badge.</p>
                  <button 
                    onClick={() => currentModule && setActiveModule(currentModule)}
                    className="px-8 py-4 bg-emerald-600 text-white rounded-[1.5rem] font-black flex items-center gap-3 mx-auto hover:bg-emerald-700 transition-all active:scale-95 shadow-xl shadow-emerald-100"
                  >
                    Continue Path <ArrowRight className="w-5 h-5" />
                  </button>
              </div>
           )}
        </div>
      </div>

      {activeModule && (
        <ModuleStory
          module={activeModule}
          submitting={submitMutation.isPending}
          onClose={() => setActiveModule(null)}
          onQuizSubmit={submitMutation.mutate}
          onTaskComplete={(mid) => taskMutation.mutate(mid)}
        />
      )}
    </div>
  )
}

LearnPage.getLayout = (page) => <CitizenLayout>{page}</CitizenLayout>
