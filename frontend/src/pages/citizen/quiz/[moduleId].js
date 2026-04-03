import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import CitizenLayout from '../../../components/shared/CitizenLayout'
import { EmptyState, PageLoader, SectionCard } from '../../../components/ui'
import { quizAPI } from '../../../utils/api'

const RESULT_STORAGE_KEY = 'learning-quiz-result'

export default function QuizPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const moduleId = router.query.moduleId
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState({})

  const { data: quiz, isLoading } = useQuery({
    queryKey: ['quiz-module', moduleId],
    queryFn: () => quizAPI.getByModule(moduleId),
    select: (res) => res.data,
    enabled: Boolean(moduleId),
  })

  const submitMutation = useMutation({
    mutationFn: quizAPI.submit,
    onSuccess: (res) => {
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem(RESULT_STORAGE_KEY, JSON.stringify(res.data))
      }

      queryClient.invalidateQueries({ queryKey: ['user-progress'] })
      queryClient.invalidateQueries({ queryKey: ['learning-modules'] })
      queryClient.invalidateQueries({ queryKey: ['learning-module', moduleId] })
      queryClient.invalidateQueries({ queryKey: ['gamification-me'] })

      router.push(`/citizen/quiz/${moduleId}/result`)
    },
    onError: (error) => {
      const status = error?.response?.status
      const serverData = error?.response?.data?.data
      const message = error?.response?.data?.message || 'Failed to submit quiz'

      if (status === 409 && serverData) {
        if (typeof window !== 'undefined') {
          window.sessionStorage.setItem(RESULT_STORAGE_KEY, JSON.stringify(serverData))
        }
        toast(message)
        router.push(`/citizen/quiz/${moduleId}/result`)
        return
      }

      toast.error(message)
    },
  })

  const questions = quiz?.questions || []
  const totalQuestions = questions.length
  const current = questions[currentQuestion]
  const progress = totalQuestions ? Math.round(((currentQuestion + 1) / totalQuestions) * 100) : 0
  const answeredCount = useMemo(() => Object.keys(answers).length, [answers])

  if (isLoading) return <PageLoader />

  if (!quiz || !questions.length) {
    return (
      <EmptyState
        icon="🧠"
        title="Quiz unavailable"
        subtitle="This module does not have an active quiz yet."
        action={<Link href="/citizen/learn" className="btn-primary mt-4">Back to Learn</Link>}
      />
    )
  }

  if (quiz.latestAttempt) {
    return (
      <EmptyState
        icon="✅"
        title="Quiz already completed"
        subtitle="Your answers are already saved for this module."
        action={<Link href={`/citizen/quiz/${moduleId}/result`} className="btn-primary mt-4">View Result</Link>}
      />
    )
  }

  const selectAnswer = (optionIndex) => {
    setAnswers((prev) => ({ ...prev, [currentQuestion]: optionIndex }))
  }

  const handleNext = () => {
    if (answers[currentQuestion] === undefined) {
      toast.error('Select an answer before continuing')
      return
    }

    if (currentQuestion === totalQuestions - 1) {
      submitMutation.mutate({ moduleId, answers })
      return
    }

    setCurrentQuestion((prev) => prev + 1)
  }

  const handleBack = () => {
    setCurrentQuestion((prev) => Math.max(prev - 1, 0))
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <Link href={`/citizen/learn/${moduleId}`} className="text-sm font-medium text-green-600 hover:text-green-700">
            ← Back to Module
          </Link>
          <h1 className="page-title mt-2">{quiz.title}</h1>
          <p className="page-sub">Answer one question at a time and submit once when you are done.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <SectionCard title="Quiz Progress" subtitle={`${answeredCount}/${totalQuestions} answered`} className="xl:col-span-1">
          <div className="p-5 space-y-4">
            <div>
              <div className="mb-2 flex items-center justify-between text-sm text-slate-500">
                <span>Question {currentQuestion + 1}</span>
                <span>{progress}%</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-green-600 transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
            </div>

            <div className="grid grid-cols-5 gap-2">
              {questions.map((_, index) => {
                const answered = answers[index] !== undefined
                const active = index === currentQuestion
                return (
                  <button
                    key={index}
                    onClick={() => setCurrentQuestion(index)}
                    className={`rounded-xl border px-0 py-2 text-sm font-semibold transition ${
                      active
                        ? 'border-green-600 bg-green-600 text-white'
                        : answered
                          ? 'border-green-200 bg-green-50 text-green-700'
                          : 'border-slate-200 bg-white text-slate-500'
                    }`}
                  >
                    {index + 1}
                  </button>
                )
              })}
            </div>

            <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
              Complete the quiz to earn <span className="font-semibold text-green-700">10 points</span> plus a bonus for a high score.
            </div>
          </div>
        </SectionCard>

        <SectionCard title={`Question ${currentQuestion + 1}`} subtitle={`${totalQuestions} total`} className="xl:col-span-2">
          <div className="p-5 space-y-5">
            <h2 className="text-xl font-semibold text-slate-900">{current.question}</h2>

            <div className="space-y-3">
              {current.options.map((option, optionIndex) => {
                const selected = answers[currentQuestion] === optionIndex
                return (
                  <button
                    key={`${option}-${optionIndex}`}
                    onClick={() => selectAnswer(optionIndex)}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      selected
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                        selected ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {String.fromCharCode(65 + optionIndex)}
                      </span>
                      <span className="text-sm font-medium">{option}</span>
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                onClick={handleBack}
                disabled={currentQuestion === 0}
                className="btn-secondary disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>

              <button
                onClick={handleNext}
                disabled={submitMutation.isPending}
                className="btn-primary min-w-[140px]"
              >
                {currentQuestion === totalQuestions - 1
                  ? (submitMutation.isPending ? 'Submitting...' : 'Submit Quiz')
                  : 'Next Question'}
              </button>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  )
}

QuizPage.getLayout = (page) => <CitizenLayout>{page}</CitizenLayout>
