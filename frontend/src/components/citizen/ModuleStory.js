import { useState, useMemo } from 'react'
import { CheckCircle2, ChevronRight, ChevronLeft, Target, Award, Lightbulb, Zap, HelpCircle, BookOpen, AlertCircle } from 'lucide-react'

export default function ModuleStory({ module, onClose, onQuizSubmit, onTaskComplete, submitting }) {
  const [step, setStep] = useState(0) // 0: Read, 1: Visual/Steps, 2: Quiz, 3: Task
  const [lang, setLang] = useState('en')
  const [quizAnswers, setQuizAnswers] = useState({})
  const [taskStarted, setTaskStarted] = useState(false)
  const [taskCompleted, setTaskCompleted] = useState(false)

  const isHindi = lang === 'hi'
  const title = isHindi && module.title_hi ? module.title_hi : module.title
  const desc = isHindi && module.description_hi ? module.description_hi : module.description

  const totalSteps = 4

  const nextStep = () => setStep(s => Math.min(s + 1, totalSteps - 1))
  const prevStep = () => setStep(s => Math.max(s - 1, 0))

  return (
    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[100] flex items-center justify-center p-0 sm:p-4 overflow-hidden">
      <div className="bg-white w-full max-w-2xl h-full sm:h-auto sm:max-h-[90vh] sm:rounded-[2.5rem] shadow-2xl flex flex-col relative animate-in zoom-in-95 duration-300">
        
        {/* Header Navigation */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100 bg-white sm:rounded-t-[2.5rem] sticky top-0 z-10">
          <div className="flex gap-2">
            {[0, 1, 2, 3].map((s) => (
              <div 
                key={s} 
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  s <= step ? 'w-8 bg-emerald-500' : 'w-4 bg-slate-100'
                }`} 
              />
            ))}
          </div>
          <div className="flex items-center gap-3">
             <button 
              onClick={() => setLang(lang === 'en' ? 'hi' : 'en')}
              className="text-[10px] font-black uppercase tracking-tighter px-2 py-1 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
            >
              {lang === 'en' ? 'हिन्दी' : 'English'}
            </button>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600">✕</button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-10">
          
          {step === 0 && (
            <div className="space-y-6 animate-in slide-in-from-right-8 duration-300">
              <div className="flex items-center gap-4 mb-2">
                <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 shadow-inner">
                  <BookOpen className="w-8 h-8" />
                </div>
                <div>
                   <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase tracking-widest leading-none">AI Mentor Recommendations</span>
                   <h2 className="text-3xl font-black text-slate-900 leading-tight">{title}</h2>
                </div>
              </div>
              
              <div className="bg-slate-50 border-2 border-slate-100 p-6 rounded-3xl relative">
                <p className="text-lg text-slate-700 leading-relaxed font-medium italic">
                  &ldquo;{desc}&rdquo;
                </p>
                <div className="absolute -bottom-3 right-8 px-4 py-1 bg-white border-2 border-slate-100 rounded-full text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  🤖 Swachha Mentor
                </div>
              </div>

              <div className="space-y-4 pt-4">
                 <h4 className="flex items-center gap-2 font-black text-slate-800 uppercase tracking-tighter text-sm">
                   <AlertCircle className="w-4 h-4 text-emerald-500" />
                   The Do&apos;s & Don&apos;ts
                 </h4>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
                       <span className="text-[10px] font-black text-emerald-600 uppercase">Do</span>
                       <ul className="mt-2 space-y-1.5">
                          {(module.dos || []).map((d, i) => <li key={i} className="text-xs font-bold text-emerald-800 flex items-start gap-2"><span>✅</span> {d}</li>)}
                       </ul>
                    </div>
                    <div className="bg-rose-50/50 p-4 rounded-2xl border border-rose-100">
                       <span className="text-[10px] font-black text-rose-600 uppercase">Don&apos;t</span>
                       <ul className="mt-2 space-y-1.5">
                          {(module.donts || []).map((d, i) => <li key={i} className="text-xs font-bold text-rose-800 flex items-start gap-2"><span>❌</span> {d}</li>)}
                       </ul>
                    </div>
                 </div>
              </div>

              {(module.real_life_examples || []).length > 0 && (
                <div className="bg-amber-50 p-5 rounded-3xl border border-amber-100">
                  <div className="flex items-center gap-2 text-amber-700 mb-2">
                    <Lightbulb className="w-4 h-4 fill-amber-300" />
                    <span className="text-xs font-black uppercase tracking-wider">Local Examples</span>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {(module.real_life_examples || []).map((ex, i) => (
                      <span key={i} className="bg-white px-3 py-1.5 rounded-xl border border-amber-200 text-xs font-bold text-amber-800">
                        {ex}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-8 animate-in slide-in-from-right-8 duration-300">
               <div className="text-center space-y-2">
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">Step-by-Step Guide</h3>
                  <p className="text-sm text-slate-500 font-medium">Visualization: How to {module.title}</p>
               </div>
               
               <div className="space-y-4">
                  {(module.visual_steps || []).map((vs, i) => (
                    <div key={i} className="flex gap-4 group">
                       <div className="flex-shrink-0 w-10 h-10 rounded-2xl bg-white border-2 border-slate-100 group-hover:border-emerald-500 group-hover:bg-emerald-50 transition-all flex items-center justify-center font-black text-slate-400 group-hover:text-emerald-600 shadow-sm">
                         {i + 1}
                       </div>
                       <div className="flex-1 bg-white border-2 border-slate-100 rounded-3xl p-5 group-hover:border-emerald-200 transition-all shadow-sm">
                          <h4 className="font-black text-slate-800 text-lg mb-1">{vs.title}</h4>
                          <p className="text-sm text-slate-500 leading-relaxed">{vs.text}</p>
                          {vs.illustration && (
                            <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center italic">
                               Ref: {vs.illustration}
                            </div>
                          )}
                       </div>
                    </div>
                  ))}
               </div>

               <div className="bg-indigo-600 rounded-[2rem] p-6 text-white overflow-hidden relative shadow-xl shadow-indigo-100">
                  <Zap className="absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 opacity-20" />
                  <div className="relative z-10 flex items-start gap-4">
                     <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl">
                       <Zap className="w-5 h-5 text-yellow-300 fill-yellow-300" />
                     </div>
                     <div>
                       <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Pro Tip</span>
                       <p className="text-sm font-bold mt-1 leading-relaxed">
                          {module.quick_tips?.[0] || 'Keep practicing to earn more reward points!'}
                       </p>
                     </div>
                  </div>
               </div>
                      {step === 2 && (
            <div className="space-y-8 animate-in slide-in-from-right-8 duration-300">
               <div className="text-center space-y-2">
                  <h3 className="text-3xl font-black text-slate-900 tracking-tight">Mini Quiz ❓</h3>
                  <p className="text-sm text-slate-500 font-medium">Verify your knowledge to claim {module.points_reward} points</p>
                  
                  {/* Quiz Progress Bar */}
                  <div className="w-full h-2 bg-slate-100 rounded-full mt-4 overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 transition-all duration-500" 
                      style={{ width: `${(Object.keys(quizAnswers).length / (module.quiz_questions?.length || 1)) * 100}%` }}
                    />
                  </div>
               </div>

               <div className="space-y-10 py-4">
                  {(!module.quiz_questions || module.quiz_questions.length === 0) ? (
                    <div className="text-center p-10 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200">
                      <div className="animate-pulse text-4xl mb-4">⏳</div>
                      <p className="text-slate-500 font-bold">Synchronizing quiz data...</p>
                      <p className="text-[10px] text-slate-400 mt-2 uppercase tracking-widest font-black">AI Mentor is fetching fallback questions</p>
                    </div>
                  ) : module.quiz_questions.map((q, qi) => (
                    <div key={qi} className="space-y-4">
                       <div className="flex items-center justify-between">
                         <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md uppercase">Question {qi + 1} of {module.quiz_questions.length}</span>
                         {quizAnswers[qi] !== undefined && <span className="text-[10px] font-bold text-slate-400">Answered ✅</span>}
                       </div>
                       <p className="font-extrabold text-slate-800 text-lg flex gap-3">
                          <span className="text-emerald-500">Q.</span>
                          {q.question}
                       </p>
                       <div className="grid grid-cols-1 gap-2.5">
                          {(q.options || []).map((opt, oi) => (
                            <button
                              key={oi}
                              onClick={() => setQuizAnswers({ ...quizAnswers, [qi]: oi })}
                              className={`w-full text-left text-sm px-6 py-4 rounded-2xl border-2 transition-all duration-200 font-bold ${
                                quizAnswers[qi] === oi
                                  ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-4 ring-emerald-500/10 scale-[1.02]'
                                  : 'border-slate-100 hover:border-emerald-200 hover:bg-slate-50 text-slate-600'
                              }`}
                            >
                               <div className="flex items-center justify-between">
                                  <span>{opt}</span>
                                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                                    quizAnswers[qi] === oi ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-200'
                                  }`}>
                                    {quizAnswers[qi] === oi && <CheckCircle2 className="w-3.5 h-3.5" />}
                                  </div>
                               </div>
                            </button>
                          ))}
                       </div>
                    </div>
                  ))}
               </div>
            </div>
          )}
    </div>
          )}

          {step === 3 && (
            <div className="space-y-8 animate-in slide-in-from-right-8 duration-300 flex flex-col items-center">
               <div className="text-center space-y-2 mb-4">
                  <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-lg">
                    <Target className="w-10 h-10 text-yellow-600" />
                  </div>
                  <h3 className="text-3xl font-black text-slate-900 tracking-tight">Real-World Task! 🎯</h3>
                  <p className="text-sm text-slate-500 font-bold uppercase tracking-wider">Action-Based Learning</p>
               </div>

               <div className={`w-full bg-white border-4 p-8 rounded-[3rem] transition-all duration-500 ${
                 taskCompleted ? 'border-emerald-500 bg-emerald-50/30' : 'border-slate-100'
               }`}>
                  <div className="flex justify-between items-start mb-6">
                     <div>
                       <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                         module.task?.difficulty === 'hard' ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'
                       }`}>
                         Difficulty: {module.task?.difficulty || 'easy'}
                       </span>
                       <h4 className="text-2xl font-black text-slate-800 mt-2">{module.task?.title}</h4>
                     </div>
                     <div className="flex flex-col items-end">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">REWARD</span>
                        <div className="bg-yellow-400 px-4 py-1 rounded-full text-white font-black flex items-center gap-1.5 shadow-lg shadow-yellow-100">
                           <Zap className="w-4 h-4 fill-yellow-200" />
                           {module.task?.reward || 20} pts
                        </div>
                     </div>
                  </div>

                  <div className="space-y-4">
                     {(module.task?.steps || []).map((ts, i) => (
                       <div key={i} className="flex items-center gap-4">
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                            taskCompleted ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-200 text-slate-300'
                          }`}>
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                          <span className={`text-sm font-bold ${taskCompleted ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                            {ts}
                          </span>
                       </div>
                     ))}
                  </div>

                  {!taskCompleted && (
                    <button
                      onClick={() => setTaskStarted(true)}
                      className={`w-full mt-10 py-5 rounded-[2rem] font-black text-lg transition-all shadow-xl ${
                        taskStarted 
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none' 
                          : 'bg-slate-900 text-white hover:bg-black hover:scale-105 active:scale-95 shadow-slate-200'
                      }`}
                    >
                      {taskStarted ? 'Working on it... 🔨' : 'I am in! Start Task'}
                    </button>
                  )}

                  {taskStarted && !taskCompleted && (
                    <button
                      onClick={() => {
                        setTaskCompleted(true)
                        onTaskComplete(module.id)
                      }}
                      className="w-full mt-4 py-5 rounded-[2rem] font-black text-lg bg-emerald-600 text-white hover:bg-emerald-700 hover:scale-105 shadow-xl shadow-emerald-100 animate-bounce"
                    >
                      Click to Confirm Completion! ✅
                    </button>
                  )}

                  {taskCompleted && (
                    <div className="mt-8 text-center animate-in zoom-in-50 duration-500">
                       <Award className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
                       <p className="text-emerald-600 font-black text-xl">Task Completed! Awesome!</p>
                    </div>
                  )}
               </div>
            </div>
          )}

        </div>

        {/* Footer Navigation */}
        <div className="p-6 border-t border-slate-100 bg-slate-50/50 sm:rounded-b-[2.5rem] flex gap-3">
          {step > 0 && (
            <button 
              onClick={prevStep}
              className="flex-1 py-4 bg-white border-2 border-slate-200 rounded-2xl font-black text-slate-600 flex items-center justify-center gap-2 hover:bg-slate-50 transition-all active:scale-95"
            >
              <ChevronLeft className="w-5 h-5" />
              Back
            </button>
          )}
          
          {step < 2 ? (
            <button 
              onClick={nextStep}
              className="flex-[2] py-4 bg-emerald-600 text-white rounded-2xl font-black text-lg flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all active:scale-95 shadow-lg shadow-emerald-100"
            >
              Next
              <ChevronRight className="w-5 h-5" />
            </button>
          ) : step === 2 ? (
            <button 
              disabled={submitting || Object.keys(quizAnswers).length < (module.quiz_questions?.length || 0)}
              onClick={() => onQuizSubmit({ module_id: module.id, answers: quizAnswers, onNext: nextStep })}
              className={`flex-[2] py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-2 transition-all shadow-lg ${
                submitting || Object.keys(quizAnswers).length < (module.quiz_questions?.length || 0)
                  ? 'bg-slate-300 text-white cursor-not-allowed'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95 shadow-emerald-100'
              }`}
            >
              {submitting ? 'Verifying...' : 'Finish Quiz'}
              <Target className="w-5 h-5" />
            </button>
          ) : (
            <button 
              disabled={!taskCompleted}
              onClick={onClose}
              className={`flex-[2] py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-2 transition-all shadow-lg ${
                !taskCompleted 
                  ? 'bg-slate-300 text-white cursor-not-allowed'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95 shadow-emerald-100'
              }`}
            >
              Finalize & Exit
              <Award className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
