'use client'
import dynamic from 'next/dynamic'
import { useQuery } from '@tanstack/react-query'
import { aiAPI } from '../../utils/api'

const LeafletHeatMap = dynamic(() => import('./LeafletHeatMap'), {
  ssr: false,
  loading: () => <div className="w-full h-full flex items-center justify-center bg-slate-50 text-slate-400">Loading map...</div>
})

export default function HeatMap({ wardId }) {
  const { data: heatmapData } = useQuery({
    queryKey: ['heatmap', wardId],
    queryFn: () => aiAPI.heatmap({ ward_id: wardId, days: 14 }),
    select: d => d.data,
    refetchInterval: 120_000,
  })

  return (
    <div className="relative w-full h-full">
      <LeafletHeatMap 
        center={[18.5204, 73.8567]} 
        zoom={12} 
        points={heatmapData?.points || []} 
      />
    </div>
  )
}
