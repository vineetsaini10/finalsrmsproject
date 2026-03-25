'use client'
import { useEffect, useRef, useState } from 'react'
import { mapAPI } from '../../utils/api'
import CitizenLayout from '../../components/shared/CitizenLayout'
import { SectionCard } from '../../components/ui'
import toast from 'react-hot-toast'

const FILTERS = [
  { value: '',          label: 'All Centers',   emoji: '♻️' },
  { value: 'recycling', label: 'Recycling',      emoji: '♻️' },
  { value: 'scrap',     label: 'Scrap Dealers',  emoji: '🔧' },
  { value: 'ewaste',    label: 'E-Waste',         emoji: '💻' },
  { value: 'organic',   label: 'Compost/Organic', emoji: '🌱' },
]

export default function MapPage() {
  const mapRef      = useRef(null)
  const mapInstance = useRef(null)
  const markersRef  = useRef([])
  const [filter,    setFilter]    = useState('')
  const [centers,   setCenters]   = useState([])
  const [loading,   setLoading]   = useState(false)
  const [userLoc,   setUserLoc]   = useState(null)

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      pos => setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      ()  => setUserLoc({ lat: 18.5204, lng: 73.8567 })
    )
  }, [])

  useEffect(() => {
    if (!userLoc || !mapRef.current) return
    import('mapbox-gl').then(mgl => {
      mgl.default.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''
      if (mapInstance.current) return
      const map = new mgl.default.Map({
        container: mapRef.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [userLoc.lng, userLoc.lat], zoom: 13,
      })
      new mgl.default.Marker({ color: '#16a34a' })
        .setLngLat([userLoc.lng, userLoc.lat])
        .setPopup(new mgl.default.Popup().setText('Your Location'))
        .addTo(map)
      mapInstance.current = map
      fetchCenters(userLoc.lat, userLoc.lng, filter)
    })
  }, [userLoc])

  useEffect(() => { if (userLoc) fetchCenters(userLoc.lat, userLoc.lng, filter) }, [filter])

  const fetchCenters = async (lat, lng, type) => {
    setLoading(true)
    try {
      const { data } = await mapAPI.centers(lat, lng, 5000, type)
      setCenters(data.centers || [])
      updateMarkers(data.centers || [])
    } catch { toast.error('Could not load centers') } finally { setLoading(false) }
  }

  const updateMarkers = async (list) => {
    if (!mapInstance.current) return
    const mgl = (await import('mapbox-gl')).default
    markersRef.current.forEach(m => m.remove()); markersRef.current = []
    list.forEach(c => {
      const el = document.createElement('div')
      el.className = 'w-8 h-8 rounded-full bg-blue-600 border-2 border-white shadow-lg flex items-center justify-center text-white text-xs cursor-pointer font-bold'
      el.textContent = '♻'
      const marker = new mgl.Marker({ element: el })
        .setLngLat([c.lng, c.lat])
        .setPopup(new mgl.Popup({ offset: 25 }).setHTML(
          `<div class="p-2"><div class="font-semibold text-sm">${c.name}</div><div class="text-xs text-gray-500">${c.address||''}</div>${c.rating?`<div class="text-xs text-yellow-500">★ ${c.rating}</div>`:''}</div>`
        ))
        .addTo(mapInstance.current)
      markersRef.current.push(marker)
    })
  }

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Map & Recycling Centers</h1><p className="page-sub">Find nearby recycling centers, scrap dealers, and drop-off points</p></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map */}
        <div className="lg:col-span-2">
          {/* Filter pills */}
          <div className="flex gap-2 flex-wrap mb-3">
            {FILTERS.map(f => (
              <button key={f.value} onClick={() => setFilter(f.value)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all
                  ${filter === f.value ? 'bg-green-600 text-white border-green-600' : 'bg-white text-slate-600 border-slate-200 hover:border-green-400'}`}>
                {f.emoji} {f.label}
              </button>
            ))}
          </div>
          <div className="card overflow-hidden">
            <div ref={mapRef} className="w-full h-[480px]">
              {!process.env.NEXT_PUBLIC_MAPBOX_TOKEN && (
                <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-500 text-sm font-medium">
                  Add NEXT_PUBLIC_MAPBOX_TOKEN to .env.local to enable maps
                </div>
              )}
            </div>
          </div>
          {loading && <p className="text-xs text-slate-400 text-center mt-2">Loading centers...</p>}
        </div>

        {/* Centers list */}
        <div>
          <SectionCard title={`Nearby Centers (${centers.length})`}>
            <div className="divide-y divide-slate-50 max-h-[540px] overflow-y-auto">
              {centers.length === 0 && !loading ? (
                <div className="p-6 text-center text-sm text-slate-400">No centers found nearby</div>
              ) : centers.map(c => (
                <div key={c.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-lg flex-shrink-0">♻️</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-800 truncate">{c.name}</div>
                    <div className="text-xs text-slate-400 truncate">{c.address}</div>
                    {c.rating && <div className="text-xs text-amber-500 mt-0.5">★ {c.rating}</div>}
                  </div>
                  {c.open_now !== undefined && (
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${c.open_now ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-400'}`}>
                      {c.open_now ? 'Open' : 'Closed'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  )
}

MapPage.getLayout = page => <CitizenLayout>{page}</CitizenLayout>
