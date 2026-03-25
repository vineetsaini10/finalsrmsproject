'use client'
import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { aiAPI } from '../../utils/api'

export default function HeatMap({ wardId }) {
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const [mapLoaded, setMapLoaded] = useState(false)

  const { data: heatmapData } = useQuery({
    queryKey: ['heatmap', wardId],
    queryFn: () => aiAPI.heatmap({ ward_id: wardId, days: 14 }),
    select: d => d.data,
    refetchInterval: 120_000,
  })

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return

    // Dynamically import mapbox-gl to avoid SSR issues
    import('mapbox-gl').then(mapboxgl => {
      mapboxgl.default.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''

      const map = new mapboxgl.default.Map({
        container: mapRef.current,
        style: 'mapbox://styles/mapbox/light-v11',
        center: [73.8567, 18.5204], // Pune default
        zoom: 12,
      })

      map.on('load', () => {
        setMapLoaded(true)
        mapInstance.current = map

        // Add heatmap layer
        map.addSource('complaints-heat', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        })

        map.addLayer({
          id: 'complaints-heatmap',
          type: 'heatmap',
          source: 'complaints-heat',
          paint: {
            'heatmap-weight': ['interpolate', ['linear'], ['get', 'weight'], 1, 0.3, 3, 1],
            'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 10, 0.5, 15, 2],
            'heatmap-color': [
              'interpolate', ['linear'], ['heatmap-density'],
              0,   'rgba(0,0,0,0)',
              0.2, 'rgba(29,158,117,0.4)',
              0.5, 'rgba(239,159,39,0.7)',
              0.8, 'rgba(226,75,74,0.85)',
              1,   'rgba(160,45,45,1)',
            ],
            'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 10, 15, 15, 30],
            'heatmap-opacity': 0.85,
          },
        })
      })
    })

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove()
        mapInstance.current = null
      }
    }
  }, [])

  // Update heatmap data when query refreshes
  useEffect(() => {
    if (!mapLoaded || !mapInstance.current || !heatmapData?.points) return

    const features = heatmapData.points
      .filter(p => p.lat && p.lng)
      .map(p => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
        properties: { weight: p.weight || 1 },
      }))

    const source = mapInstance.current.getSource('complaints-heat')
    if (source) {
      source.setData({ type: 'FeatureCollection', features })
    }
  }, [mapLoaded, heatmapData])

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full" />
      {!process.env.NEXT_PUBLIC_MAPBOX_TOKEN && (
        <div className="absolute inset-0 flex items-center justify-center bg-authority-50 text-authority-600 text-sm font-medium">
          Add NEXT_PUBLIC_MAPBOX_TOKEN to enable live map
        </div>
      )}
    </div>
  )
}
