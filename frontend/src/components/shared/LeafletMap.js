'use client'
import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Type-based styling configuration
const TYPE_CONFIG = {
  recycling: { color: '#10b981', icon: '♻️', bg: 'bg-green-500' },
  ewaste:    { color: '#3b82f6', icon: '💻', bg: 'bg-blue-500' },
  scrap:     { color: '#64748b', icon: '🔧', bg: 'bg-slate-500' },
  organic:   { color: '#059669', icon: '🌱', bg: 'bg-emerald-500' },
  default:   { color: '#6366f1', icon: '📍', bg: 'bg-indigo-500' }
}

// Fix for default marker icons in Leaflet with Webpack/Next.js
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
})

L.Marker.prototype.options.icon = DefaultIcon

// Helper to update map center when userLoc or zoom changes
function ChangeView({ center, zoom }) {
  const map = useMap()
  useEffect(() => {
    map.setView(center, zoom)
  }, [center, zoom, map])
  return null
}

export default function LeafletMap({ center, zoom, markers = [], userLoc, hoveredId }) {
  const markerRefs = useRef({})

  useEffect(() => {
    if (hoveredId && markerRefs.current[hoveredId]) {
      markerRefs.current[hoveredId].openPopup()
    }
  }, [hoveredId])

  return (
    <MapContainer center={center} zoom={zoom} style={{ height: '100%', width: '100%' }} zoomControl={false}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      {userLoc && (
        <Marker 
          position={[userLoc.lat, userLoc.lng]}
          icon={L.divIcon({
            className: 'custom-div-icon',
            html: `
              <div class="relative flex items-center justify-center">
                <div class="absolute w-8 h-8 bg-green-500 rounded-full opacity-20 animate-ping"></div>
                <div class="w-4 h-4 rounded-full bg-green-600 border-2 border-white shadow-xl z-10"></div>
              </div>
            `,
            iconSize: [32, 32],
            iconAnchor: [16, 16]
          })}
        >
          <Popup className="custom-popup">You are here</Popup>
        </Marker>
      )}

      {markers.map((c) => {
        const config = TYPE_CONFIG[c.type] || TYPE_CONFIG.default
        const isHovered = hoveredId === c.id

        return (
          <Marker 
            key={c.id} 
            ref={el => { if(el) markerRefs.current[c.id] = el }}
            position={[c.lat, c.lng]}
            icon={L.divIcon({
              className: 'custom-div-icon',
              html: `
                <div class="transition-all duration-300 transform ${isHovered ? 'scale-125 z-50' : 'scale-100'}">
                  <div class="w-10 h-10 rounded-2xl ${config.bg} border-2 border-white shadow-lg flex items-center justify-center text-white text-lg ring-2 ring-transparent group-hover:ring-white">
                    ${config.icon}
                  </div>
                  <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 ${config.bg} rotate-45 border-r border-b border-white"></div>
                </div>
              `,
              iconSize: [40, 40],
              iconAnchor: [20, 40],
              popupAnchor: [0, -40]
            })}
          >
            <Popup className="custom-popup">
              <div className="w-64 p-1">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm leading-tight">{c.name}</h4>
                    <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 text-[10px] uppercase font-black mt-1">
                      {c.type}
                    </span>
                  </div>
                  {c.rating && <div className="text-amber-500 font-bold text-xs flex items-center">★{c.rating}</div>}
                </div>
                
                <div className="space-y-1.5 text-xs text-slate-600">
                  <div className="flex gap-1.5 items-start">
                    <span className="grayscale opacity-60">📍</span>
                    <span className="leading-tight">{c.address}</span>
                  </div>
                  {c.timings && (
                    <div className="flex gap-1.5 items-center">
                      <span className="grayscale opacity-60">🕒</span>
                      <span>{c.timings}</span>
                    </div>
                  )}
                  {c.contact && (
                    <div className="flex gap-1.5 items-center">
                      <span className="grayscale opacity-60">📞</span>
                      <span>{c.contact}</span>
                    </div>
                  )}
                </div>

                <a 
                  href={`https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 block w-full py-2 bg-green-600 hover:bg-green-700 text-white text-center rounded-lg font-bold text-[10px] uppercase tracking-wider transition-colors no-underline"
                >
                  Get Directions
                </a>
              </div>
            </Popup>
          </Marker>
        )
      })}

      {userLoc && <ChangeView center={[userLoc.lat, userLoc.lng]} zoom={zoom} />}

      <style jsx global>{`
        .leaflet-popup-content-wrapper {
          border-radius: 16px;
          padding: 4px;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
        }
        .leaflet-popup-content {
          margin: 12px;
        }
        .leaflet-popup-tip {
          box-shadow: none;
        }
        .custom-popup .leaflet-popup-close-button {
          top: 8px;
          right: 8px;
        }
      `}</style>
    </MapContainer>
  )
}

