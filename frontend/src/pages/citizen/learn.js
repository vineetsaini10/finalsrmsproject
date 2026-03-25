import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { trainingAPI } from '../../utils/api'
import CitizenLayout from '../../components/shared/CitizenLayout'
import toast from 'react-hot-toast'

const CATEGORIES = [
  { value: '',             label: 'All',         emoji: '📚' },
  { value: 'segregation',  label: 'Segregation', emoji: '🗂️' },
  { value: 'composting',   label: 'Composting',  emoji: '🌱' },
  { value: 'recycling',    label: 'Recycling',   emoji: '♻️' },
  { value: 'awareness',    label: 'Awareness',   emoji: '💡' },
]

const SAMPLE_QUIZ = [
  { q: 'Which bin should you use for vegetable peels?', opts: ['Blue bin', 'Green bin', 'Red bin', 'Yellow bin'], ans: 1 },
  { q: 'What is the correct way to dispose of batteries?', opts: ['Regular dustbin', 'Flush them', 'E-waste center', 'Burn them'], ans: 2 },
  { q: 'Composting helps in reducing what kind of waste?', opts: ['Plastic', 'Organic/Wet', 'Metal', 'Glass'], ans: 1 },
]

function QuizModal({ module: mod, onClose, onSubmit }) {
  const [answers, setAnswers] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore] = useState(0)

  const handleSubmit = () => {
    let correct = 0
    SAMPLE_QUIZ.forEach((q, i) => { if (answers[i] === q.ans) correct++ })
    setScore(correct)
    setSubmitted(true)
    onSubmit({ module_id: mod.id, answers, score: correct, total_questions: SAMPLE_QUIZ.length })
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Quiz: {mod.title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>

        {submitted ? (
          <div className="p-6 text-center">
            <div className="text-5xl mb-3">{score >= 2 ? '🏆' : '📖'}</div>
            <h3 className="text-xl font-bold text-gray-900 mb-1">
              {score}/{SAMPLE_QUIZ.length} Correct!
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {score >= 2 ? `Great job! You earned ${mod.points_reward} points!` : 'Keep learning and try again!'}
            </p>
            <button onClick={onClose} className="btn-primary px-8">Done</button>
          </div>
        ) : (
          <div className="p-5 space-y-6">
            {SAMPLE_QUIZ.map((q, qi) => (
              <div key={qi}>
                <p className="text-sm font-medium text-gray-800 mb-3">
                  {qi + 1}. {q.q}
                </p>
                <div className="space-y-2">
                  {q.opts.map((opt, oi) => (
                    <button
                      key={oi}
                      onClick={() => setAnswers({ ...answers, [qi]: oi })}
                      className={`w-full text-left text-sm px-3 py-2.5 rounded-lg border transition-all
                        ${answers[qi] === oi
                          ? 'border-primary-400 bg-primary-50 text-primary-700 font-medium'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'}`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <button
              onClick={handleSubmit}
              disabled={Object.keys(answers).length < SAMPLE_QUIZ.length}
              className="btn-primary w-full py-3"
            >
              Submit Answers
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function LearnPage() {
  const [category, setCategory] = useState('')
  const [activeQuiz, setActiveQuiz] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['training-modules', category],
    queryFn: () => trainingAPI.modules(category || undefined),
    select: d => d.data,
  })

  const submitMutation = useMutation({
    mutationFn: trainingAPI.submitQuiz,
    onSuccess: (res) => {
      const { passed, points_earned } = res.data
      if (passed) toast.success(`Quiz passed! +${points_earned} points 🎉`)
      else toast('Keep practicing! You can retake the quiz.', { icon: '📖' })
    },
  })

  const CONTENT_ICON = { video: '▶️', infographic: '🖼️', quiz: '❓', article: '📄' }

  const sampleModules = [
    { id: '1', title: 'Waste Segregation Basics', category: 'segregation', content_type: 'video', duration_mins: 5, points_reward: 30, completed: false, description: 'Learn the 3-bin system for effective waste separation at source.' },
    { id: '2', title: 'Home Composting Guide', category: 'composting', content_type: 'article', duration_mins: 8, points_reward: 25, completed: true, description: 'Turn your kitchen waste into rich compost in 3 simple steps.' },
    { id: '3', title: 'Plastic Recycling Quiz', category: 'recycling', content_type: 'quiz', duration_mins: 3, points_reward: 100, completed: false, description: 'Test your knowledge on plastic recycling categories and codes.' },
    { id: '4', title: 'E-Waste Disposal Rules', category: 'awareness', content_type: 'infographic', duration_mins: 4, points_reward: 20, completed: false, description: 'Understand how to safely dispose of electronics and batteries.' },
    { id: '5', title: 'Dry Waste & Recycling', category: 'recycling', content_type: 'video', duration_mins: 6, points_reward: 30, completed: false, description: 'A complete guide to sorting paper, glass, metal, and plastic.' },
  ]

  const modules = data?.modules?.length ? data.modules : sampleModules.filter(m => !category || m.category === category)

  return (
    <div className="p-4 max-w-lg mx-auto pb-20">
      <div className="pt-2 mb-5">
        <h1 className="text-xl font-bold text-gray-900">Learn & Earn</h1>
        <p className="text-sm text-gray-500 mt-0.5">Complete modules, take quizzes, earn eco points</p>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-4">
        {CATEGORIES.map(c => (
          <button
            key={c.value}
            onClick={() => setCategory(c.value)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all
              ${category === c.value
                ? 'bg-primary-400 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {c.emoji} {c.label}
          </button>
        ))}
      </div>

      {/* Modules grid */}
      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="card p-4 animate-pulse h-24" />)}
        </div>
      ) : (
        <div className="space-y-3">
          {modules.map(mod => (
            <div
              key={mod.id}
              className={`card p-4 cursor-pointer hover:shadow-md transition-all
                ${mod.completed ? 'border-primary-100 bg-primary-50/30' : ''}`}
              onClick={() => mod.content_type === 'quiz' && setActiveQuiz(mod)}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-xl flex-shrink-0">
                  {CONTENT_ICON[mod.content_type] || '📄'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">{mod.title}</span>
                    {mod.completed && <span className="text-xs text-primary-600">✓ Done</span>}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{mod.description}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs text-gray-400">⏱ {mod.duration_mins} min</span>
                    <span className="text-xs text-warning-400 font-medium">+{mod.points_reward} pts</span>
                    <span className="text-xs text-gray-400 capitalize px-2 py-0.5 bg-gray-100 rounded-full">
                      {mod.category}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeQuiz && (
        <QuizModal
          module={activeQuiz}
          onClose={() => setActiveQuiz(null)}
          onSubmit={(data) => submitMutation.mutate(data)}
        />
      )}
    </div>
  )
}

LearnPage.getLayout = page => <CitizenLayout>{page}</CitizenLayout>
