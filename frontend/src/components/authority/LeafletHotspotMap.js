'use client'
import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.heat'

// HeatmapLayer component
function HeatmapLayer({ points }) {
  const map = useMap()
  useEffect(() => {
    if (!points || points.length === 0) return
    const heatPoints = points.map(p => [p.lat, p.lng, p.weight || 1])
    const heatLayer = L.heatLayer(heatPoints, {
      radius: 20,
      blur: 15,
      maxZoom: 17,
      gradient: { 0.2: 'blue', 0.4: 'cyan', 0.6: 'lime', 0.8: 'yellow', 1.0: 'red' }
    }).addTo(map)
    return () => { map.removeLayer(heatLayer) }
  }, [map, points])
  return null
}

// FitBounds component
function FitBounds({ hotspots }) {
  const map = useMap()
  useEffect(() => {
    if (!hotspots || hotspots.length === 0) return
    const bounds = L.latLngBounds(hotspots.map(h => [h.centroid_lat, h.centroid_lng]))
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 })
  }, [map, hotspots])
  return null
}

export default function LeafletHotspotMap({ center = [18.5204, 73.8567], zoom = 12, heatmapPoints = [], hotspots = [] }) {
  return (
    <MapContainer center={center} zoom={zoom} style={{ height: '100%', width: '100%' }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      <HeatmapLayer points={heatmapPoints} />
      
      {hotspots.map((h, idx) => {
        const score = Number(h.severity_score || 0)
        const level = h.level || (score >= 2.5 ? 'critical' : score >= 2.0 ? 'high' : score >= 1.2 ? 'medium' : 'low')
        const trendIcon = h.trend === 'increasing' ? '↑' : h.trend === 'decreasing' ? '↓' : '→'
        const color = level === 'critical' ? 'bg-red-600 animate-pulse' : level === 'high' ? 'bg-orange-500' : level === 'medium' ? 'bg-amber-400' : 'bg-slate-400'
        
        return (
          <Marker 
            key={idx}
            position={[h.centroid_lat, h.centroid_lng]}
            icon={L.divIcon({
              className: 'custom-hotspot-icon',
              html: `<div class="w-5 h-5 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-[10px] text-white font-bold ${color}">${trendIcon}</div>`,
              iconSize: [20, 20],
              iconAnchor: [10, 10]
            })}
          >
            <Popup>
              <div style={{ minWidth: '220px', fontFamily: 'Inter, sans-serif', padding: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 800, fontSize: '14px', color: '#1e293b' }}>Hotspot Analysis</span>
                  <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: '#f1f5f9', color: '#64748b', fontWeight: 600 }}>{h.trend?.toUpperCase()}</span>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                   <div style={{ background: '#fff1f2', padding: '6px', borderRadius: '8px', border: '1px solid #fecdd3' }}>
                      <div style={{ fontSize: '9px', color: '#e11d48', fontWeight: 700, textTransform: 'uppercase' }}>Severity</div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#9f1239', textTransform: 'capitalize' }}>{h.level || 'Low'}</div>
                   </div>
                   <div style={{ background: '#f0f9ff', padding: '6px', borderRadius: '8px', border: '1px solid #bae6fd' }}>
                      <div style={{ fontSize: '9px', color: '#0284c7', fontWeight: 700, textTransform: 'uppercase' }}>Peak Time</div>
                      <div style={{ fontSize: '10px', fontWeight: 700, color: '#075985' }}>{h.peak_time || 'General'}</div>
                   </div>
                </div>

                <div style={{ fontSize: '11px', color: '#475569', marginBottom: '4px' }}>
                   <b>Current:</b> {h.complaint_count} reports
                </div>
                <div style={{ fontSize: '11px', color: '#475569', marginBottom: '10px' }}>
                   <b>Forecast:</b> ~{h.predicted_count} next week
                </div>

                <div style={{ background: '#f8fafc', padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                   <div style={{ fontSize: '9px', color: '#6366f1', fontWeight: 800, marginBottom: '2px' }}>🤖 SMART RECOMMENDATION</div>
                   <div style={{ fontSize: '11px', color: '#334155', fontWeight: 500, lineHeight: '1.4' }}>{h.recommended_action}</div>
                </div>
              </div>
            </Popup>
          </Marker>
        )
      })}

      <FitBounds hotspots={hotspots} />
    </MapContainer>
  )
}
