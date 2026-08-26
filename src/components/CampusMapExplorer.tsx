import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  MapPin, 
  ShieldCheck, 
  Navigation, 
  ExternalLink, 
  Sparkles, 
  Layers, 
  X, 
  Check, 
  ArrowRight,
  Eye,
  SlidersHorizontal,
  Home,
  CheckCircle2,
  Bookmark,
  MessageSquare
} from 'lucide-react';
import { MapMarker, CampusLandmark, Area } from '../types/hostelEase';
import { api } from '../services/api';
import { formatNaira, formatDistance } from '../utils/formatters';

interface CampusMapExplorerProps {
  filters: any;
  areas: Area[];
  onSelectProperty: (propertyId: string) => void;
  onToggleCompare?: (propertyId: string) => void;
  onOpenConversation?: (propertyId: string) => void;
  comparedIds?: string[];
  onShowToast: (message: string, type?: 'success' | 'info' | 'error') => void;
}

export const CampusMapExplorer: React.FC<CampusMapExplorerProps> = ({
  filters,
  areas,
  onSelectProperty,
  onToggleCompare,
  onOpenConversation,
  comparedIds = [],
  onShowToast
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);
  const landmarksGroupRef = useRef<L.LayerGroup | null>(null);

  const [markersData, setMarkersData] = useState<MapMarker[]>([]);
  const [landmarksData, setLandmarksData] = useState<CampusLandmark[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedMarker, setSelectedMarker] = useState<MapMarker | null>(null);
  const [activeAreaFocus, setActiveAreaFocus] = useState<string>('all');

  // Load Map Data
  useEffect(() => {
    setLoading(true);
    api.discovery.getMapMarkers(filters)
      .then(res => {
        setMarkersData(res.markers || []);
        setLandmarksData(res.campusLandmarks || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load map markers:', err);
        setLoading(false);
      });
  }, [filters]);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Create Leaflet Map centered on LAUTECH Campus
      const map = L.map(mapContainerRef.current, {
        center: [8.1438, 4.2638],
        zoom: 14,
        zoomControl: false
      });

      // OpenStreetMap Tiles (Fast, high-contrast, free)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors | LAUTECH Campus Edition',
        maxZoom: 19
      }).addTo(map);

      // Custom Zoom Controls
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Marker & Landmark Layer Groups
      const markersGroup = L.layerGroup().addTo(map);
      const landmarksGroup = L.layerGroup().addTo(map);

      markersGroupRef.current = markersGroup;
      landmarksGroupRef.current = landmarksGroup;
      mapInstanceRef.current = map;
    }

    return () => {
      // Keep map instance mounted across renders
    };
  }, []);

  // Update Markers & Landmarks on Map
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !markersGroupRef.current || !landmarksGroupRef.current) return;

    // Clear existing layers
    markersGroupRef.current.clearLayers();
    landmarksGroupRef.current.clearLayers();

    // 1. Add Campus Landmarks Reference Pins
    landmarksData.forEach(lm => {
      const landmarkIcon = L.divIcon({
        className: 'campus-landmark-pin',
        html: `
          <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/90 text-white border-2 border-amber-400 shadow-xl text-[10px] font-black uppercase tracking-wider backdrop-blur-sm transform -translate-x-1/2 -translate-y-1/2 hover:scale-110 transition-transform cursor-pointer">
            <span class="w-2 h-2 rounded-full bg-amber-400 animate-ping inline-block"></span>
            <span>🏛️ ${lm.name}</span>
          </div>
        `,
        iconSize: [140, 30],
        iconAnchor: [70, 15]
      });

      const lmMarker = L.marker([lm.lat, lm.lng], { icon: landmarkIcon });
      lmMarker.bindTooltip(`<strong>${lm.name}</strong><br><span class="text-xs text-slate-500">${lm.desc}</span>`, {
        direction: 'top',
        className: 'custom-leaflet-tooltip'
      });
      landmarksGroupRef.current?.addLayer(lmMarker);
    });

    // 2. Add Hostel Accommodation Custom Price Pills
    markersData.forEach(m => {
      const isSelected = selectedMarker?.id === m.id;
      const isCompared = comparedIds.includes(m.id);

      const priceShort = `₦${Math.round(m.rentAmount / 1000)}k`;
      const badgeColor = m.availabilityStatus === 'AVAILABLE' ? 'bg-emerald-600 border-white text-white' : 'bg-amber-600 border-white text-white';

      const customMarkerIcon = L.divIcon({
        className: 'hostel-price-marker',
        html: `
          <div class="group relative flex items-center justify-center cursor-pointer transform -translate-x-1/2 -translate-y-1/2 transition-transform duration-200 ${isSelected ? 'scale-125 z-50' : 'hover:scale-110'}">
            <div class="px-2.5 py-1 rounded-2xl shadow-xl font-black text-xs border-2 flex items-center gap-1 ${badgeColor} ${isSelected ? 'ring-4 ring-emerald-400 ring-offset-2' : ''}">
              <span class="tracking-tight">${priceShort}</span>
              ${m.verificationStatus === 'APPROVED' ? '<span class="text-[10px] text-amber-300 font-bold">✓</span>' : ''}
            </div>
            <div class="w-2 h-2 bg-slate-900 rotate-45 mx-auto -mt-1 shadow"></div>
          </div>
        `,
        iconSize: [60, 30],
        iconAnchor: [30, 15]
      });

      const marker = L.marker([m.lat, m.lng], { icon: customMarkerIcon });

      marker.on('click', () => {
        setSelectedMarker(m);
        map.panTo([m.lat, m.lng], { animate: true, duration: 0.6 });
      });

      markersGroupRef.current?.addLayer(marker);
    });
  }, [markersData, landmarksData, selectedMarker, comparedIds]);

  // Pan to specific LAUTECH area
  const handleAreaFocus = (area: Area | 'all') => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (area === 'all') {
      setActiveAreaFocus('all');
      map.setView([8.1438, 4.2638], 14, { animate: true });
    } else {
      setActiveAreaFocus(area.id);
      if (area.centerLat && area.centerLng) {
        map.setView([area.centerLat, area.centerLng], 15, { animate: true });
      } else {
        // Fallback matching markers
        const areaMarkers = markersData.filter(m => m.area.id === area.id);
        if (areaMarkers.length > 0) {
          map.setView([areaMarkers[0].lat, areaMarkers[0].lng], 15, { animate: true });
        }
      }
    }
  };

  return (
    <div className="relative w-full h-[650px] sm:h-[720px] rounded-3xl overflow-hidden border border-slate-200 shadow-xl bg-slate-100">
      {/* Map Container */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Top Floating Controls: Area Quick Focus Selector */}
      <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between gap-2 pointer-events-none">
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 px-2 bg-white/90 backdrop-blur-md rounded-2xl shadow-lg border border-slate-200/80 pointer-events-auto max-w-full">
          <button
            onClick={() => handleAreaFocus('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeAreaFocus === 'all'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            🏫 LAUTECH Campus
          </button>

          {areas.slice(0, 7).map(a => (
            <button
              key={a.id}
              onClick={() => handleAreaFocus(a)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                activeAreaFocus === a.id
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              📍 {a.name}
            </button>
          ))}
        </div>

        {/* Recenter Button */}
        <button
          onClick={() => handleAreaFocus('all')}
          className="p-2.5 bg-white/95 backdrop-blur-md text-slate-800 rounded-2xl shadow-lg border border-slate-200 pointer-events-auto hover:bg-slate-50 transition-colors flex items-center gap-1 font-bold text-xs"
          title="Re-center on LAUTECH Campus"
        >
          <Navigation className="w-4 h-4 text-emerald-600" />
          <span className="hidden sm:inline">Center</span>
        </button>
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 z-20 bg-white/60 backdrop-blur-xs flex items-center justify-center">
          <div className="bg-slate-900 text-white px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold animate-pulse">
            <Layers className="w-4 h-4 text-emerald-400 animate-spin" />
            Loading LAUTECH Accommodations Map...
          </div>
        </div>
      )}

      {/* Bottom Floating Legend / Quick Counter */}
      <div className="absolute bottom-4 left-4 z-10 hidden sm:flex items-center gap-3 px-3.5 py-2 bg-slate-950/85 backdrop-blur-md text-white rounded-2xl shadow-lg text-[11px] font-semibold border border-slate-800">
        <span className="flex items-center gap-1.5 text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          {markersData.length} Hostels Found
        </span>
        <span>•</span>
        <span className="text-slate-300">Tap any price pin for lodge preview</span>
      </div>

      {/* Selected Hostel Preview Card Modal / Floating Drawer */}
      {selectedMarker && (
        <div className="absolute bottom-4 right-4 left-4 sm:left-auto sm:w-96 z-30 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-2xl border-2 border-emerald-500/40 space-y-3 relative">
            <button
              onClick={() => setSelectedMarker(null)}
              className="absolute top-3 right-3 p-1 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex gap-3">
              <img
                src={selectedMarker.coverImage}
                alt={selectedMarker.title}
                className="w-24 h-24 rounded-2xl object-cover flex-shrink-0 bg-slate-100"
              />
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`px-2 py-0.5 rounded text-[9px] font-black ${
                    selectedMarker.availabilityStatus === 'AVAILABLE' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {selectedMarker.availabilityStatus.replace(/_/g, ' ')}
                  </span>
                  {selectedMarker.verificationStatus === 'APPROVED' && (
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-0.5">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      Verified
                    </span>
                  )}
                </div>

                <h4 className="font-bold text-xs text-slate-900 truncate">{selectedMarker.title}</h4>
                <p className="text-[11px] text-slate-500">📍 {selectedMarker.area.name} • {formatDistance(selectedMarker.distanceKm)}</p>
                <div className="pt-0.5">
                  <span className="text-sm font-black text-emerald-700">{formatNaira(selectedMarker.rentAmount)}</span>
                  <span className="text-[10px] text-slate-400 font-medium">/yr</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => onSelectProperty(selectedMarker.id)}
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition-colors flex items-center justify-center gap-1"
              >
                <Eye className="w-3.5 h-3.5" /> View Details
              </button>

              {onOpenConversation && (
                <button
                  onClick={() => onOpenConversation(selectedMarker.id)}
                  className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow transition-colors flex items-center gap-1"
                  title="Message Landlord"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                  Chat
                </button>
              )}

              {onToggleCompare && (
                <button
                  onClick={() => onToggleCompare(selectedMarker.id)}
                  className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all flex items-center gap-1 ${
                    comparedIds.includes(selectedMarker.id)
                      ? 'bg-purple-100 text-purple-900 border-purple-300'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  {comparedIds.includes(selectedMarker.id) ? 'Comparing' : 'Compare'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
