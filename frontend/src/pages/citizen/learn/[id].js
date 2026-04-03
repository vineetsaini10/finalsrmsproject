import Link from 'next/link'
import { useRouter } from 'next/router'
import { useQuery } from '@tanstack/react-query'
import CitizenLayout from '../../../components/shared/CitizenLayout'
import { EmptyState, PageLoader, SectionCard } from '../../../components/ui'
import { learningAPI } from '../../../utils/api'

function BulletList({ items, emptyLabel }) {
  if (!items?.length) return <div className="text-sm text-slate-400">{emptyLabel}</div>

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={`${item}-${index}`} className="flex gap-3 rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">
          <span className="text-green-600">•</span>
          <span>{item}</span>
        </div>
      ))}
    </div>
  )
}

export default function LearningModuleDetailPage() {
  const router = useRouter()
  const moduleId = router.query.id

  const { data: module, isLoading } = useQuery({
    queryKey: ['learning-module', moduleId],
    queryFn: () => learningAPI.module(moduleId),
    select: (res) => res.data,
    enabled: Boolean(moduleId),
  })

  if (isLoading) return <PageLoader />

  if (!module) {
    return (
      <EmptyState
        icon="📕"
        title="Module not found"
        subtitle="The lesson you tried to open does not exist or is no longer available."
        action={<Link href="/citizen/learn" className="btn-primary mt-4">Back to Learn</Link>}
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <Link href="/citizen/learn" className="text-sm font-medium text-green-600 hover:text-green-700">
            ← Back to Learn
          </Link>
          <h1 className="page-title mt-2">{module.title}</h1>
          <p className="page-sub">{module.description || 'Practical guidance to improve daily waste management habits.'}</p>
        </div>
        <Link href={module.completed ? `/citizen/quiz/${module.id}/result` : `/citizen/quiz/${module.id}`} className="btn-primary">
          {module.completed ? 'View Result' : 'Start Quiz'}
        </Link>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <SectionCard title="Lesson Content" subtitle={`${module.contentType} • ${module.durationMins || 3} min`}>
            <div className="p-5 space-y-4">
              {module.contentUrl && module.contentType === 'video' && (
                <div className="overflow-hidden rounded-2xl border border-slate-100">
                  <iframe
                    title={module.title}
                    src={module.contentUrl}
                    className="h-72 w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              )}

              {module.contentUrl && module.contentType !== 'video' && (
                <a
                  href={module.contentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex rounded-xl bg-slate-100 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-200"
                >
                  Open learning material
                </a>
              )}

              {module.visualSteps?.length ? (
                <div className="space-y-3">
                  {module.visualSteps.map((step, index) => (
                    <div key={`${step.title}-${index}`} className="rounded-2xl border border-slate-100 p-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-green-600">Step {index + 1}</div>
                      <h3 className="mt-1 text-base font-semibold text-slate-900">{step.title}</h3>
                      <p className="mt-2 text-sm text-slate-600">{step.text}</p>
                      {step.illustration && (
                        <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
                          {step.illustration}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                  Review the guidance below, then take the quiz to complete this module.
                </div>
              )}
            </div>
          </SectionCard>

          <SectionCard title="Real-Life Examples">
            <div className="p-5">
              <BulletList items={module.realLifeExamples} emptyLabel="No examples added for this module yet." />
            </div>
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard title="Do This">
            <div className="p-5">
              <BulletList items={module.dos} emptyLabel="No recommended actions yet." />
            </div>
          </SectionCard>

          <SectionCard title="Avoid This">
            <div className="p-5">
              <BulletList items={module.donts} emptyLabel="No avoid-list for this module yet." />
            </div>
          </SectionCard>

          <SectionCard title="Quick Tips">
            <div className="p-5">
              <BulletList items={module.quickTips} emptyLabel="No quick tips available yet." />
            </div>
          </SectionCard>

          <SectionCard title="Quiz" subtitle={`${module.quiz_questions?.length || 0} questions`}>
            <div className="p-5 space-y-4">
              <div className="rounded-2xl bg-green-50 p-4 text-sm text-green-700">
                Earn <span className="font-semibold">+{module.pointsReward || 10} points</span> plus a high-score bonus when you finish the quiz.
              </div>
              <Link
                href={module.completed ? `/citizen/quiz/${module.id}/result` : `/citizen/quiz/${module.id}`}
                className="btn-primary w-full text-center"
              >
                {module.completed ? 'View Result' : 'Start Quiz'}
              </Link>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  )
}

LearningModuleDetailPage.getLayout = (page) => <CitizenLayout>{page}</CitizenLayout>
