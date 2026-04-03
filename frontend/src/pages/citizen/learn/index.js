import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import CitizenLayout from '../../../components/shared/CitizenLayout'
import LearningModuleCard from '../../../components/learning/LearningModuleCard'
import LearningOverview from '../../../components/learning/LearningOverview'
import { EmptyState, PageLoader, SectionCard } from '../../../components/ui'
import { learningAPI, userAPI } from '../../../utils/api'

const FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'Segregation', value: 'segregation' },
  { label: 'Recycle', value: 'recycling' },
  { label: 'Reuse', value: 'awareness' },
  { label: 'Composting', value: 'composting' },
  { label: 'Plastic', value: 'plastic' },
]

export default function LearningPage() {
  const [category, setCategory] = useState('all')

  const { data: progress } = useQuery({
    queryKey: ['user-progress'],
    queryFn: () => userAPI.progress(),
    select: (res) => res.data,
  })

  const { data: modulesData, isLoading } = useQuery({
    queryKey: ['learning-modules', category],
    queryFn: () => learningAPI.modules(category === 'all' ? undefined : category),
    select: (res) => res.data,
  })

  const modules = useMemo(() => modulesData?.modules || [], [modulesData])

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Learn</h1>
          <p className="page-sub">Short lessons and quizzes to help you recycle smarter and reduce waste every day.</p>
        </div>
      </div>

      <LearningOverview progress={progress} />

      <SectionCard
        title="Learning Modules"
        subtitle="Pick a topic and complete the quiz to earn points and badges."
      >
        <div className="border-b border-slate-100 px-5 py-4">
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((filter) => (
              <button
                key={filter.value}
                onClick={() => setCategory(filter.value)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  category === filter.value
                    ? 'bg-green-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <PageLoader />
        ) : modules.length ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 p-5">
            {modules.map((module) => (
              <LearningModuleCard key={module.id} module={module} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon="📘"
            title="No modules found"
            subtitle="Try a different category filter."
          />
        )}
      </SectionCard>
    </div>
  )
}

LearningPage.getLayout = (page) => <CitizenLayout>{page}</CitizenLayout>
