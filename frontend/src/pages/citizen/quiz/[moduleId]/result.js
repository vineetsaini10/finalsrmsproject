import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import CitizenLayout from '../../../../components/shared/CitizenLayout'
import { EmptyState, PageLoader, SectionCard } from '../../../../components/ui'
import { quizAPI, userAPI } from '../../../../utils/api'

const RESULT_STORAGE_KEY = 'learning-quiz-result'

export default function QuizResultPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const moduleId = router.query.moduleId
  const [cachedResult, setCachedResult] = useState(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const stored = window.sessionStorage.getItem(RESULT_STORAGE_KEY)
    if (!stored) return

    try {
      const parsed = JSON.parse(stored)
      if (parsed?.moduleId === moduleId) setCachedResult(parsed)
    } catch {}
  }, [moduleId])

  const { data: result, isLoading } = useQuery({
    queryKey: ['quiz-result', moduleId],
    queryFn: () => quizAPI.result(moduleId),
    select: (res) => res.data,
    enabled: Boolean(moduleId) && !cachedResult,
  })

  const { data: progress } = useQuery({
    queryKey: ['user-progress'],
    queryFn: () => userAPI.progress(),
    select: (res) => res.data,
  })

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['user-progress'] })
    queryClient.invalidateQueries({ queryKey: ['learning-modules'] })
    queryClient.invalidateQueries({ queryKey: ['learning-module', moduleId] })
  }, [moduleId, queryClient])

  const data = cachedResult || result

  if (isLoading && !data) return <PageLoader />

  if (!data) {
    return (
      <EmptyState
        icon="📊"
        title="Result unavailable"
        subtitle="Finish the quiz first to see your score and reward summary."
        action={<Link href="/citizen/learn" className="btn-primary mt-4">Back to Learn</Link>}
      />
    )
  }

  const percentage = data.totalQuestions ? Math.round((data.score / data.totalQuestions) * 100) : 0

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Quiz Result</h1>
          <p className="page-sub">{data.moduleTitle}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-1 space-y-5">
          <div className={`card p-6 ${data.passed ? 'bg-green-50 border-green-100' : 'bg-amber-50 border-amber-100'}`}>
            <div className="text-4xl">{data.passed ? '🏆' : '📘'}</div>
            <h2 className="mt-3 text-2xl font-bold text-slate-900">{data.score}/{data.totalQuestions}</h2>
            <p className="mt-1 text-sm text-slate-600">{percentage}% score</p>
            <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-white/70">
              <div
                className={`h-full rounded-full ${data.passed ? 'bg-green-600' : 'bg-amber-500'}`}
                style={{ width: `${percentage}%` }}
              />
            </div>
            <div className="mt-4 rounded-2xl bg-white/80 p-4 text-sm text-slate-600">
              <div className="flex items-center justify-between">
                <span>Points earned</span>
                <span className="font-bold text-green-700">+{data.pointsAwarded || 0}</span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span>Current level</span>
                <span className="font-bold text-slate-800">Level {progress?.level || 1}</span>
              </div>
            </div>
            {data.alreadySubmitted && (
              <p className="mt-4 text-xs font-medium text-slate-500">
                This quiz had already been submitted earlier. The saved result is shown here.
              </p>
            )}
          </div>

          <SectionCard title="Next Steps">
            <div className="p-5 space-y-3">
              <Link href={`/citizen/learn/${data.moduleId}`} className="btn-secondary w-full text-center">
                Review Module
              </Link>
              <Link href="/citizen/learn" className="btn-primary w-full text-center">
                Explore More Modules
              </Link>
            </div>
          </SectionCard>
        </div>

        <SectionCard title="Answer Review" subtitle="Check what you got right and wrong." className="xl:col-span-2">
          <div className="p-5 space-y-4">
            {data.review?.map((item, index) => (
              <div key={`${item.question}-${index}`} className="rounded-2xl border border-slate-100 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Question {index + 1}</div>
                    <h3 className="mt-1 text-base font-semibold text-slate-900">{item.question}</h3>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    item.isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {item.isCorrect ? 'Correct' : 'Incorrect'}
                  </span>
                </div>

                <div className="mt-4 space-y-2">
                  {item.options.map((option, optionIndex) => {
                    const isCorrect = item.correctAnswer === optionIndex
                    const isSelected = item.selectedAnswer === optionIndex
                    let optionClass = 'border-slate-200 bg-white text-slate-600'

                    if (isCorrect) optionClass = 'border-green-200 bg-green-50 text-green-700'
                    if (isSelected && !isCorrect) optionClass = 'border-red-200 bg-red-50 text-red-700'

                    return (
                      <div key={`${option}-${optionIndex}`} className={`rounded-xl border p-3 text-sm ${optionClass}`}>
                        <div className="flex items-center justify-between gap-3">
                          <span>{option}</span>
                          <span className="text-xs font-semibold">
                            {isCorrect ? 'Correct answer' : isSelected ? 'Your answer' : ''}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  )
}

QuizResultPage.getLayout = (page) => <CitizenLayout>{page}</CitizenLayout>
