'use client'
import dynamic from 'next/dynamic'
import { useQuery } from '@tanstack/react-query'
import { aiAPI } from '../../utils/api'

const LeafletHotspotMap = dynamic(() => import('./LeafletHotspotMap'), {
  ssr: false,
  loading: () => <div className="w-full h-full flex items-center justify-center bg-slate-50 text-slate-400">Loading map...</div>
})

export default function HotspotMap({ wardId, days, hotspots = [] }) {
  const { data: heatmapData } = useQuery({
    queryKey: ['hotspot-heatmap', wardId || 'all', days],
    queryFn: () => aiAPI.heatmap({ ward_id: wardId, days }),
    select: (d) => d.data,
  })

  // Normalize heatmap points from aiAPI
  const heatmapPoints = (heatmapData?.points || [])
    .filter(p => p.lat && p.lng)
    .map(p => ({ lat: Number(p.lat), lng: Number(p.lng), weight: Number(p.weight || 1) }))

  return (
    <div className="w-full h-full min-h-[320px]">
      <LeafletHotspotMap 
        center={[18.5204, 73.8567]} 
        zoom={12} 
        heatmapPoints={heatmapPoints} 
        hotspots={hotspots}
      />
    </div>
  )
}
