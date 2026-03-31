'use client'
import { useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.heat'

// Custom HeatmapLayer component
function HeatmapLayer({ points }) {
  const map = useMap()

  useEffect(() => {
    if (!points || points.length === 0) return

    const heatPoints = points.map(p => [p.lat, p.lng, p.weight || 1])
    const heatLayer = L.heatLayer(heatPoints, {
      radius: 25,
      blur: 15,
      maxZoom: 17,
      gradient: {
        0.2: 'rgba(29,158,117,0.4)',
        0.5: 'rgba(239,159,39,0.7)',
        0.8: 'rgba(226,75,74,0.85)',
        1.0: 'rgba(160,45,45,1)'
      }
    }).addTo(map)

    return () => {
      map.removeLayer(heatLayer)
    }
  }, [map, points])

  return null
}

export default function LeafletHeatMap({ center = [18.5204, 73.8567], zoom = 12, points = [] }) {
  return (
    <MapContainer center={center} zoom={zoom} style={{ height: '100%', width: '100%' }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <HeatmapLayer points={points} />
    </MapContainer>
  )
}
