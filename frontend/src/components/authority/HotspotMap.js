'use client'
import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { aiAPI } from '../../utils/api'

function buildFeatureCollection(points = []) {
  return {
    type: 'FeatureCollection',
    features: points
      .filter((point) => Number.isFinite(Number(point?.lat)) && Number.isFinite(Number(point?.lng)))
      .map((point) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [Number(point.lng), Number(point.lat)],
        },
        properties: {
          weight: Number(point.weight || 1),
        },
      })),
  }
}

export default function HotspotMap({ wardId, days, hotspots = [] }) {
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const markersRef = useRef([])
  const [mapReady, setMapReady] = useState(false)

  const { data: heatmapData } = useQuery({
    queryKey: ['hotspot-heatmap', wardId || 'all', days],
    queryFn: () => aiAPI.heatmap({ ward_id: wardId, days }),
    select: (d) => d.data,
  })

  useEffect(() => {
    if (!mapRef.current || mapInstance.current || !process.env.NEXT_PUBLIC_MAPBOX_TOKEN) return

    let cancelled = false

    import('mapbox-gl').then((mapboxgl) => {
      if (cancelled || mapInstance.current) return

      const lib = mapboxgl.default
      lib.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

      const map = new lib.Map({
        container: mapRef.current,
        style: 'mapbox://styles/mapbox/light-v11',
        center: [73.8567, 18.5204],
        zoom: 12,
      })

      map.on('load', () => {
        if (cancelled) return
        map.addSource('hotspot-heat', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        })
        map.addLayer({
          id: 'hotspot-heat-layer',
          type: 'heatmap',
          source: 'hotspot-heat',
          paint: {
            'heatmap-weight': ['interpolate', ['linear'], ['get', 'weight'], 1, 0.25, 3, 1],
            'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 9, 0.5, 15, 1.8],
            'heatmap-color': [
              'interpolate', ['linear'], ['heatmap-density'],
              0, 'rgba(0,0,0,0)',
              0.2, 'rgba(16,185,129,0.3)',
              0.45, 'rgba(245,158,11,0.55)',
              0.7, 'rgba(249,115,22,0.8)',
              1, 'rgba(220,38,38,0.95)',
            ],
            'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 9, 18, 15, 34],
            'heatmap-opacity': 0.7,
          },
        })

        mapInstance.current = map
        setMapReady(true)
      })
    })

    return () => {
      cancelled = true
      markersRef.current.forEach((marker) => marker.remove())
      markersRef.current = []
      if (mapInstance.current) {
        mapInstance.current.remove()
        mapInstance.current = null
      }
      setMapReady(false)
    }
  }, [])

  useEffect(() => {
    if (!mapReady || !mapInstance.current) return

    const source = mapInstance.current.getSource('hotspot-heat')
    if (source) {
      source.setData(buildFeatureCollection(heatmapData?.points || []))
    }
  }, [heatmapData, mapReady])

  useEffect(() => {
    if (!mapReady || !mapInstance.current) return

    markersRef.current.forEach((marker) => marker.remove())
    markersRef.current = []

    const bounds = []

    import('mapbox-gl').then((mapboxgl) => {
      const lib = mapboxgl.default

      hotspots.forEach((hotspot, index) => {
        const lat = Number(hotspot?.centroid_lat)
        const lng = Number(hotspot?.centroid_lng)
        const score = Number(hotspot?.severity_score || 0)

        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return

        bounds.push([lng, lat])

        const markerEl = document.createElement('button')
        markerEl.type = 'button'
        markerEl.className = `w-4 h-4 rounded-full border-2 border-white shadow ${
          score >= 2.5 ? 'bg-red-500' : score >= 1.5 ? 'bg-amber-400' : 'bg-slate-500'
        }`

        const popup = new lib.Popup({ offset: 18 }).setHTML(`
          <div style="min-width: 180px; font-family: sans-serif;">
            <div style="font-weight: 700; margin-bottom: 6px;">Hotspot #${index + 1}</div>
            <div style="font-size: 12px; color: #475569;">${hotspot.ward_name || 'Ward unavailable'}</div>
            <div style="font-size: 12px; margin-top: 6px;">Complaints: ${Number(hotspot.complaint_count || 0)}</div>
            <div style="font-size: 12px;">Issue: ${String(hotspot.dominant_type || 'other').replace(/_/g, ' ')}</div>
            <div style="font-size: 12px;">Score: ${score.toFixed(2)}</div>
          </div>
        `)

        const marker = new lib.Marker({ element: markerEl })
          .setLngLat([lng, lat])
          .setPopup(popup)
          .addTo(mapInstance.current)

        markersRef.current.push(marker)
      })

      if (bounds.length === 1) {
        mapInstance.current.flyTo({ center: bounds[0], zoom: 14, essential: true })
        return
      }

      if (bounds.length > 1) {
        const fitBounds = bounds.reduce(
          (acc, coord) => acc.extend(coord),
          new lib.LngLatBounds(bounds[0], bounds[0]),
        )
        mapInstance.current.fitBounds(fitBounds, { padding: 48, maxZoom: 15, duration: 800 })
      }
    })
  }, [hotspots, mapReady])

  if (!process.env.NEXT_PUBLIC_MAPBOX_TOKEN) {
    return (
      <div className="h-full min-h-[320px] flex items-center justify-center bg-slate-50 text-center text-sm text-slate-500 px-6">
        Add `NEXT_PUBLIC_MAPBOX_TOKEN` to enable the live hotspot map.
      </div>
    )
  }

  return <div ref={mapRef} className="w-full h-full min-h-[320px]" />
}
