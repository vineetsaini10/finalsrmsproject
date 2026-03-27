import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { trainingAPI } from '../../utils/api'
import CitizenLayout from '../../components/shared/CitizenLayout'
import toast from 'react-hot-toast'

const CATEGORIES = [
  { value: '', label: 'All' },
  { value: 'segregation', label: 'Segregation' },
  { value: 'composting', label: 'Composting' },
  { value: 'recycling', label: 'Recycling' },
  { value: 'awareness', label: 'Awareness' },
]

function QuizModal({ module: mod, onClose, onSubmit, submitting }) {
  const questions = mod?.quiz_questions || []
  const [answers, setAnswers] = useState({})

  const handleSubmit = () => {
    onSubmit({ module_id: mod.id, answers })
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Quiz: {mod.title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">x</button>
        </div>

        <div className="p-5 space-y-6">
          {questions.map((q, qi) => (
            <div key={`${mod.id}-${qi}`}>
              <p className="text-sm font-medium text-gray-800 mb-3">{qi + 1}. {q.question}</p>
              <div className="space-y-2">
                {(q.options || []).map((opt, oi) => (
                  <button
                    key={oi}
                    onClick={() => setAnswers({ ...answers, [qi]: oi })}
                    className={`w-full text-left text-sm px-3 py-2.5 rounded-lg border transition-all ${
                      answers[qi] === oi
                        ? 'border-primary-400 bg-primary-50 text-primary-700 font-medium'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <button
            onClick={handleSubmit}
            disabled={submitting || Object.keys(answers).length < questions.length}
            className="btn-primary w-full py-3"
          >
            {submitting ? 'Submitting...' : 'Submit Answers'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function LearnPage() {
  const qc = useQueryClient()
  const [category, setCategory] = useState('')
  const [activeQuiz, setActiveQuiz] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['training-modules', category],
    queryFn: () => trainingAPI.modules(category || undefined),
    select: (d) => d.data,
  })

  const refreshLearning = () => {
    qc.invalidateQueries({ queryKey: ['training-modules'] })
    qc.invalidateQueries({ queryKey: ['gamification-me'] })
  }

  const submitMutation = useMutation({
    mutationFn: trainingAPI.submitQuiz,
    onSuccess: (res) => {
      const { passed, points_earned, already_rewarded } = res.data || {}
      if (!passed) {
        toast.error('Quiz failed. Try again.')
      } else if (already_rewarded) {
        toast('Quiz already completed. No extra points awarded.')
      } else {
        toast.success(`Quiz passed! +${points_earned} points`)
      }
      setActiveQuiz(null)
      refreshLearning()
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Failed to submit quiz'),
  })

  const completeMutation = useMutation({
    mutationFn: (moduleId) => trainingAPI.completeModule(moduleId),
    onSuccess: (res) => {
      if (res.data?.already_rewarded) toast('Module already completed. No extra points awarded.')
      else toast.success(`Module completed! +${res.data?.points_earned || 0} points`)
      refreshLearning()
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Failed to complete module'),
  })

  const modules = data?.modules || []

  return (
    <div className="p-4 max-w-lg mx-auto pb-20">
      <div className="pt-2 mb-5">
        <h1 className="text-xl font-bold text-gray-900">Learn and Earn</h1>
        <p className="text-sm text-gray-500 mt-0.5">Complete modules and quizzes to earn eco points</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 mb-4">
        {CATEGORIES.map((c) => (
          <button
            key={c.value}
            onClick={() => setCategory(c.value)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              category === c.value ? 'bg-primary-400 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="card p-4 animate-pulse h-24" />)}</div>
      ) : modules.length === 0 ? (
        <div className="card p-5 text-sm text-slate-500">No learning modules found for this category.</div>
      ) : (
        <div className="space-y-3">
          {modules.map((mod) => {
            const isQuiz = mod.content_type === 'quiz'
            const canOpenQuiz = isQuiz && (mod.quiz_questions || []).length > 0 && !mod.completed
            return (
              <div
                key={mod.id}
                className={`card p-4 transition-all ${canOpenQuiz ? 'cursor-pointer hover:shadow-md' : ''} ${mod.completed ? 'border-primary-100 bg-primary-50/30' : ''}`}
                onClick={() => canOpenQuiz && setActiveQuiz(mod)}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-sm flex-shrink-0">
                    {mod.content_type?.toUpperCase() || 'DOC'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900">{mod.title}</span>
                      {mod.completed && <span className="text-xs text-primary-600">Done</span>}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{mod.description}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs text-gray-400">{mod.duration_mins || 0} min</span>
                      <span className="text-xs text-warning-400 font-medium">+{mod.points_reward || 0} pts</span>
                      <span className="text-xs text-gray-400 capitalize px-2 py-0.5 bg-gray-100 rounded-full">{mod.category}</span>
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      {isQuiz ? (
                        <button
                          disabled={mod.completed}
                          onClick={(e) => {
                            e.stopPropagation()
                            if (!mod.completed) setActiveQuiz(mod)
                          }}
                          className={`btn-sm ${mod.completed ? 'btn-secondary cursor-not-allowed opacity-60' : 'btn-primary'}`}
                        >
                          {mod.completed ? 'Quiz Completed' : 'Start Quiz'}
                        </button>
                      ) : (
                        <>
                          {mod.content_url && (
                            <a href={mod.content_url} target="_blank" rel="noreferrer" className="btn-secondary btn-sm" onClick={(e) => e.stopPropagation()}>
                              Open Content
                            </a>
                          )}
                          <button
                            disabled={mod.completed || completeMutation.isPending}
                            onClick={(e) => {
                              e.stopPropagation()
                              if (!mod.completed) completeMutation.mutate(mod.id)
                            }}
                            className={`btn-sm ${mod.completed ? 'btn-secondary cursor-not-allowed opacity-60' : 'btn-primary'}`}
                          >
                            {mod.completed ? 'Completed' : 'Mark Complete'}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {activeQuiz && (
        <QuizModal
          module={activeQuiz}
          submitting={submitMutation.isPending}
          onClose={() => setActiveQuiz(null)}
          onSubmit={(payload) => submitMutation.mutate(payload)}
        />
      )}
    </div>
  )
}

LearnPage.getLayout = (page) => <CitizenLayout>{page}</CitizenLayout>
