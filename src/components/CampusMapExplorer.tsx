import React, { useEffect, useRef, useState, useMemo } from 'react';
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
  MessageSquare,
  Search,
  Compass,
  Car,
  Footprints,
  Clock,
  Locate,
  Share2,
  Copy,
  ChevronDown,
  ChevronUp,
  Building2
} from 'lucide-react';
import { MapMarker, CampusLandmark, Area } from '../types/hostelEase';
import { api } from '../services/api';
import { formatNaira, formatDistance } from '../utils/formatters';
import { 
  geocodeAddress, 
  computeRoute, 
  getCurrentUserLocation, 
  getGoogleMapsDirectionsUrl, 
  getGoogleMapsPlaceUrl,
  GeocodedPlace, 
  RouteResult 
} from '../services/mapService';

interface CampusMapExplorerProps {
  filters: any;
  areas: Area[];
  onSelectProperty: (propertyId: string) => void;
  onToggleCompare?: (propertyId: string) => void;
  onOpenConversation?: (propertyId: string) => void;
  comparedIds?: string[];
  onShowToast: (message: string, type?: 'success' | 'info' | 'error') => void;
  initialSearchQuery?: string;
  targetAddress?: string;
}

export const CampusMapExplorer: React.FC<CampusMapExplorerProps> = ({
  filters,
  areas,
  onSelectProperty,
  onToggleCompare,
  onOpenConversation,
  comparedIds = [],
  onShowToast,
  initialSearchQuery = '',
  targetAddress = ''
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);
  const landmarksGroupRef = useRef<L.LayerGroup | null>(null);
  const searchPinLayerRef = useRef<L.Marker | null>(null);
  const userLocationMarkerRef = useRef<L.LayerGroup | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);

  // Data & State
  const [markersData, setMarkersData] = useState<MapMarker[]>([]);
  const [landmarksData, setLandmarksData] = useState<CampusLandmark[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedMarker, setSelectedMarker] = useState<MapMarker | null>(null);
  const [activeAreaFocus, setActiveAreaFocus] = useState<string>('all');
  const [searchedAreaKeyword, setSearchedAreaKeyword] = useState<string | null>(null);
  const [mapLayerType, setMapLayerType] = useState<'streets' | 'satellite' | 'terrain'>('streets');

  // Google Maps Address Search & Location Pin State
  const [searchQuery, setSearchQuery] = useState<string>(initialSearchQuery || targetAddress || '');
  const [isSearchingAddress, setIsSearchingAddress] = useState<boolean>(false);
  const [activePlace, setActivePlace] = useState<GeocodedPlace | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locatingUser, setLocatingUser] = useState<boolean>(false);

  // Directions & Routing State
  const [showDirectionsPanel, setShowDirectionsPanel] = useState<boolean>(false);
  const [travelMode, setTravelMode] = useState<'driving' | 'walking'>('driving');
  const [activeRoute, setActiveRoute] = useState<RouteResult | null>(null);
  const [calculatingRoute, setCalculatingRoute] = useState<boolean>(false);
  const [showTurnSteps, setShowTurnSteps] = useState<boolean>(false);

  // Quick Suggestion Pills
  const POPULAR_SEARCH_SUGGESTIONS = [
    'Abaa Area, Ogbomoso',
    'No. 59, Olubere Avenue, Oluyole, Ibadan',
    'Under-G Road, Ogbomoso',
    'Adenike Street, Ogbomoso',
    'Stadium Area, Ogbomoso',
    'General Area, Ogbomoso',
    'LAUTECH Main Campus Gate'
  ];

  // Dynamically filter displayed hostel markers based on searched location or active area pill
  const displayedMarkers = useMemo(() => {
    let list = markersData;

    if (activeAreaFocus !== 'all') {
      const areaMatch = areas.find(a => a.id === activeAreaFocus || a.slug === activeAreaFocus);
      const nameToCheck = (areaMatch?.name || activeAreaFocus).toLowerCase();
      const slugToCheck = (areaMatch?.slug || '').toLowerCase();
      list = list.filter(m => 
        m.area.id === activeAreaFocus || 
        (slugToCheck && m.area.id.includes(slugToCheck)) ||
        m.area.name.toLowerCase().includes(nameToCheck) ||
        nameToCheck.includes(m.area.name.toLowerCase())
      );
    } else if (searchedAreaKeyword) {
      const kw = searchedAreaKeyword.toLowerCase().trim();
      const matched = list.filter(m => 
        m.area.name.toLowerCase().includes(kw) || 
        m.area.id.toLowerCase().includes(kw) ||
        m.title.toLowerCase().includes(kw) ||
        (m.address && m.address.toLowerCase().includes(kw)) ||
        (m.landmark && m.landmark.toLowerCase().includes(kw)) ||
        (kw.includes('aba') && (m.area.name.toLowerCase().includes('aba') || m.title.toLowerCase().includes('aba') || (m.address && m.address.toLowerCase().includes('aba'))))
      );
      if (matched.length > 0) {
        list = matched;
      }
    }

    return list;
  }, [markersData, activeAreaFocus, searchedAreaKeyword, areas]);

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

  // Google Maps Tile URLs
  const GOOGLE_TILE_URLS = {
    streets: 'https://mt1.google.com/vt/lyrs=m&hl=en&x={x}&y={y}&z={z}',
    satellite: 'https://mt1.google.com/vt/lyrs=y&hl=en&x={x}&y={y}&z={z}', // Google Hybrid with street names and highway labels
    terrain: 'https://mt1.google.com/vt/lyrs=p&hl=en&x={x}&y={y}&z={z}'
  };

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Default center: LAUTECH Campus
      const map = L.map(mapContainerRef.current, {
        center: [8.1438, 4.2638],
        zoom: 14,
        zoomControl: false,
        attributionControl: false
      });

      // Google Maps Tile Layer
      const tileLayer = L.tileLayer(GOOGLE_TILE_URLS.streets, {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
      }).addTo(map);

      tileLayerRef.current = tileLayer;

      // Custom Zoom Control placed top-right like Google Maps
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Layer Groups
      const markersGroup = L.layerGroup().addTo(map);
      const landmarksGroup = L.layerGroup().addTo(map);
      const userLocGroup = L.layerGroup().addTo(map);

      markersGroupRef.current = markersGroup;
      landmarksGroupRef.current = landmarksGroup;
      userLocationMarkerRef.current = userLocGroup;
      mapInstanceRef.current = map;

      // Trigger user location check on load
      getCurrentUserLocation().then(loc => {
        setUserLocation(loc);
        renderUserLocationDot(loc.lat, loc.lng, map, userLocGroup);
      });
    }

    return () => {
      // Clean cleanup on component unmount
    };
  }, []);

  // Update Tile Layer when Layer Type Changes (Streets / Satellite / Terrain)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const newTileLayer = L.tileLayer(GOOGLE_TILE_URLS[mapLayerType], {
      maxZoom: 20,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
    }).addTo(map);

    tileLayerRef.current = newTileLayer;
  }, [mapLayerType]);

  // Handle Initial Search Query or Target Address if provided
  useEffect(() => {
    const queryToRun = initialSearchQuery || targetAddress;
    if (queryToRun && mapInstanceRef.current) {
      setSearchQuery(queryToRun);
      handleSearchAddress(queryToRun);
    }
  }, [initialSearchQuery, targetAddress]);

  // Render User Current GPS Location Dot (Google Maps Blue Pulse Dot)
  const renderUserLocationDot = (lat: number, lng: number, map: L.Map, group: L.LayerGroup) => {
    group.clearLayers();

    // Pulse Circle + Blue Dot
    const userLocationIcon = L.divIcon({
      className: 'google-user-location-marker',
      html: `
        <div class="relative flex items-center justify-center w-8 h-8 -translate-x-1/2 -translate-y-1/2">
          <span class="absolute w-8 h-8 rounded-full bg-blue-500/25 animate-ping"></span>
          <span class="absolute w-5 h-5 rounded-full bg-blue-500/30 border border-blue-400"></span>
          <span class="relative w-3.5 h-3.5 rounded-full bg-blue-600 border-2 border-white shadow-lg"></span>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    const marker = L.marker([lat, lng], { icon: userLocationIcon });
    marker.bindTooltip('<strong>You Are Here</strong><br><span class="text-[10px] text-slate-500">Your Current GPS Location</span>', {
      direction: 'top',
      className: 'custom-leaflet-tooltip'
    });
    group.addLayer(marker);
  };

  // Re-center on User Current Location
  const handleLocateMe = async () => {
    const map = mapInstanceRef.current;
    if (!map) return;

    setLocatingUser(true);
    try {
      const loc = await getCurrentUserLocation();
      setUserLocation(loc);
      if (userLocationMarkerRef.current) {
        renderUserLocationDot(loc.lat, loc.lng, map, userLocationMarkerRef.current);
      }
      map.flyTo([loc.lat, loc.lng], 16, { duration: 1.2 });
      onShowToast('Centered on your current location', 'info');
    } catch {
      onShowToast('Could not retrieve GPS location', 'error');
    } finally {
      setLocatingUser(false);
    }
  };

  // Search Address / Paste Address (Google Maps Experience)
  const handleSearchAddress = async (customQuery?: string) => {
    const textToSearch = (customQuery || searchQuery).trim();
    if (!textToSearch) return;

    const map = mapInstanceRef.current;
    if (!map) return;

    setIsSearchingAddress(true);
    try {
      const place = await geocodeAddress(textToSearch);
      if (!place) {
        onShowToast(`Could not find location for "${textToSearch}"`, 'error');
        setIsSearchingAddress(false);
        return;
      }

      setActivePlace(place);
      setSelectedMarker(null); // Clear selected hostel marker

      // 1. Remove previous searched pin
      if (searchPinLayerRef.current) {
        map.removeLayer(searchPinLayerRef.current);
        searchPinLayerRef.current = null;
      }

      // 2. Drop authentic Google Maps Red Drop-Pin with House Symbol
      const googleRedPinIcon = L.divIcon({
        className: 'google-maps-red-pin',
        html: `
          <div class="relative flex flex-col items-center cursor-pointer group transform -translate-x-1/2 -translate-y-full hover:scale-110 transition-transform">
            <!-- Pin Head with House Icon -->
            <div class="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-rose-600 border-2 border-white shadow-2xl flex items-center justify-center text-white ring-4 ring-red-500/20">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
              </svg>
            </div>
            <!-- Pin Pointer Stem -->
            <div class="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-rose-600 -mt-0.5"></div>
            <!-- Pin Shadow -->
            <div class="w-4 h-1.5 bg-black/30 rounded-full blur-[1px] -mt-0.5"></div>
          </div>
        `,
        iconSize: [40, 48],
        iconAnchor: [20, 46]
      });

      const pinMarker = L.marker([place.lat, place.lng], { icon: googleRedPinIcon });
      pinMarker.bindTooltip(`
        <div class="p-1 space-y-0.5">
          <strong class="text-xs text-slate-900 font-black">🏠 ${place.streetName || place.displayName.split(',')[0]}</strong>
          <p class="text-[10px] text-slate-600">${place.formattedAddress}</p>
        </div>
      `, {
        direction: 'top',
        className: 'custom-leaflet-tooltip',
        offset: [0, -45]
      });

      pinMarker.addTo(map);
      searchPinLayerRef.current = pinMarker;

      // Match query with campus areas to filter and display all hostels in that location
      const lowerQuery = textToSearch.toLowerCase();
      const matchedArea = areas.find(a => 
        lowerQuery === a.slug ||
        lowerQuery === a.name.toLowerCase() ||
        lowerQuery.includes(a.name.toLowerCase()) ||
        a.name.toLowerCase().includes(lowerQuery) ||
        (lowerQuery.includes('aba') && (a.slug.includes('aba') || a.name.toLowerCase().includes('aba')))
      );

      if (matchedArea) {
        setSearchedAreaKeyword(matchedArea.name);
        setActiveAreaFocus(matchedArea.id);
      } else if (lowerQuery.includes('aba')) {
        setSearchedAreaKeyword('Abaa Area');
        setActiveAreaFocus('area-abaa');
      } else if (lowerQuery.includes('under-g') || lowerQuery.includes('under g')) {
        setSearchedAreaKeyword('Under G');
        setActiveAreaFocus('area-under-g');
      } else if (lowerQuery.includes('adenike')) {
        setSearchedAreaKeyword('Adenike Area');
        setActiveAreaFocus('area-adenike');
      } else if (lowerQuery.includes('stadium')) {
        setSearchedAreaKeyword('Stadium Road');
        setActiveAreaFocus('area-stadium-road');
      } else if (lowerQuery.includes('oluyole') || lowerQuery.includes('olubere')) {
        setSearchedAreaKeyword('Oluyole Estate, Ibadan');
        setActiveAreaFocus('area-oluyole');
      } else {
        setSearchedAreaKeyword(place.streetName || place.displayName.split(',')[0]);
      }

      // 3. Smooth animated flyTo zoom down to street level (Zoom 17-18 shows full street names)
      map.flyTo([place.lat, place.lng], 17, {
        duration: 1.5,
        easeLinearity: 0.25
      });

      onShowToast(`Located: ${place.streetName || place.displayName.slice(0, 45)}`, 'success');

      // 4. If directions panel is active or user location exists, compute route immediately
      if (userLocation) {
        handleComputeDirections(userLocation, { lat: place.lat, lng: place.lng });
      }
    } catch (err) {
      console.error('Search address error:', err);
      onShowToast('Failed to find address', 'error');
    } finally {
      setIsSearchingAddress(false);
    }
  };

  // Compute Live Driving or Walking Route from Origin to Destination
  const handleComputeDirections = async (
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number }
  ) => {
    const map = mapInstanceRef.current;
    if (!map) return;

    setCalculatingRoute(true);
    try {
      const route = await computeRoute(origin, destination, travelMode);
      setActiveRoute(route);
      setShowDirectionsPanel(true);

      // Remove existing route polyline
      if (routePolylineRef.current) {
        map.removeLayer(routePolylineRef.current);
        routePolylineRef.current = null;
      }

      // Render Google Maps Cobalt Blue Polyline
      const polyline = L.polyline(route.coordinates, {
        color: '#1a73e8', // Authentic Google Maps Blue
        weight: 6,
        opacity: 0.9,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);

      routePolylineRef.current = polyline;

      // Fit map bounds to show both origin ("Where I Am") and destination ("Where I Am Going")
      const bounds = L.latLngBounds(route.coordinates);
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 17 });
    } catch (err) {
      console.error('Failed to compute route:', err);
      onShowToast('Could not calculate route', 'error');
    } finally {
      setCalculatingRoute(false);
    }
  };

  // Recalculate route when travel mode changes
  useEffect(() => {
    if (activePlace && userLocation && showDirectionsPanel) {
      handleComputeDirections(userLocation, { lat: activePlace.lat, lng: activePlace.lng });
    } else if (selectedMarker && userLocation && showDirectionsPanel) {
      handleComputeDirections(userLocation, { lat: selectedMarker.lat, lng: selectedMarker.lng });
    }
  }, [travelMode]);

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

    // 2. Add Hostel Accommodation Custom Price Pills (Filtered to searched location or area)
    displayedMarkers.forEach(m => {
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
        setActivePlace(null);
        map.panTo([m.lat, m.lng], { animate: true, duration: 0.6 });

        // If user location is known, compute route to this hostel
        if (userLocation) {
          handleComputeDirections(userLocation, { lat: m.lat, lng: m.lng });
        }
      });

      markersGroupRef.current?.addLayer(marker);
    });
  }, [displayedMarkers, landmarksData, selectedMarker, comparedIds]);

  // Pan to specific area and filter hostels
  const handleAreaFocus = (area: Area | 'all') => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (area === 'all') {
      setActiveAreaFocus('all');
      setSearchedAreaKeyword(null);
      setSearchQuery('');
      if (searchPinLayerRef.current) {
        map.removeLayer(searchPinLayerRef.current);
        searchPinLayerRef.current = null;
      }
      setActivePlace(null);
      setSelectedMarker(null);
      map.setView([8.1438, 4.2638], 14, { animate: true });
    } else {
      setActiveAreaFocus(area.id);
      setSearchedAreaKeyword(area.name);
      setSearchQuery(area.name);

      const targetLat = area.centerLat || (area.slug.includes('aba') ? 8.1480 : 8.1438);
      const targetLng = area.centerLng || (area.slug.includes('aba') ? 4.2700 : 4.2638);

      map.flyTo([targetLat, targetLng], 15, { duration: 1.2 });
      onShowToast(`Displaying all hostels in ${area.name}`, 'info');
    }
  };

  // Clear current route and search pin, reset to all
  const handleClearRouteAndSearch = () => {
    const map = mapInstanceRef.current;
    if (map) {
      if (routePolylineRef.current) {
        map.removeLayer(routePolylineRef.current);
        routePolylineRef.current = null;
      }
      if (searchPinLayerRef.current) {
        map.removeLayer(searchPinLayerRef.current);
        searchPinLayerRef.current = null;
      }
    }
    setActivePlace(null);
    setSelectedMarker(null);
    setActiveRoute(null);
    setShowDirectionsPanel(false);
    setSearchQuery('');
    setSearchedAreaKeyword(null);
    setActiveAreaFocus('all');
    if (map) {
      map.setView([8.1438, 4.2638], 14, { animate: true });
    }
  };

  return (
    <div className="relative w-full h-[680px] sm:h-[750px] rounded-3xl overflow-hidden border border-slate-300 dark:border-slate-800 shadow-2xl bg-slate-100 font-sans">
      {/* Map Container */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* ========================================================================= */}
      {/* TOP FLOATING GOOGLE MAPS SEARCH BAR & CONTROLS                            */}
      {/* ========================================================================= */}
      <div className="absolute top-4 left-4 right-4 z-20 flex flex-col gap-2 max-w-xl pointer-events-auto">
        {/* Google Maps Search Box */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 flex items-center p-1.5 gap-2 transition-shadow focus-within:shadow-2xl focus-within:border-blue-500">
          <div className="pl-2.5 text-slate-400">
            <Search className="w-4 h-4 text-blue-600" />
          </div>

          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSearchAddress();
              }
            }}
            placeholder="Search house address or paste e.g. No. 59, Olubere Avenue, Oluyole, Ibadan..."
            className="flex-1 bg-transparent text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none py-1.5 font-medium"
          />

          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                handleClearRouteAndSearch();
              }}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-full transition-colors cursor-pointer"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={() => handleSearchAddress()}
            disabled={isSearchingAddress || !searchQuery.trim()}
            className="px-4 py-2 bg-[#1a73e8] hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            {isSearchingAddress ? (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Navigation className="w-3.5 h-3.5 rotate-45" />
            )}
            <span>Locate</span>
          </button>
        </div>

        {/* Active Location Filter Banner */}
        {(searchedAreaKeyword || activeAreaFocus !== 'all') && (
          <div className="flex items-center justify-between bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-3.5 py-2 rounded-2xl border-2 border-blue-500/50 shadow-xl text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping"></span>
              <span className="font-black text-slate-900 dark:text-white">
                🏠 {displayedMarkers.length} Hostel{displayedMarkers.length === 1 ? '' : 's'} in {searchedAreaKeyword || 'Selected Area'}
              </span>
            </div>
            <button
              type="button"
              onClick={handleClearRouteAndSearch}
              className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 flex items-center gap-1 cursor-pointer bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-xl transition-colors"
            >
              <span>Show All ({markersData.length})</span>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Area Quick Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 px-0.5 scrollbar-none">
          <button
            type="button"
            onClick={() => handleAreaFocus('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1 whitespace-nowrap shadow-sm cursor-pointer shrink-0 ${
              activeAreaFocus === 'all' && !searchedAreaKeyword
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md scale-105'
                : 'bg-white/90 dark:bg-slate-900/90 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700'
            }`}
          >
            <span>🌐 All Hostels</span>
            <span className="text-[10px] opacity-75 font-normal">({markersData.length})</span>
          </button>

          {areas.map(a => {
            const isAbaa = a.slug === 'abaa' || a.name.toLowerCase().includes('aba');
            const isCurrent = activeAreaFocus === a.id || (searchedAreaKeyword && searchedAreaKeyword.toLowerCase().includes(a.name.toLowerCase()));
            const count = markersData.filter(m => m.area.id === a.id || m.area.name.toLowerCase().includes(a.name.toLowerCase())).length;

            return (
              <button
                key={a.id}
                type="button"
                onClick={() => handleAreaFocus(a)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 whitespace-nowrap shadow-sm cursor-pointer shrink-0 ${
                  isCurrent
                    ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-400/40 scale-105'
                    : isAbaa
                    ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border-2 border-amber-400 dark:border-amber-600 hover:bg-amber-100 font-black'
                    : 'bg-white/90 dark:bg-slate-900/90 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700'
                }`}
              >
                <span>📍 {a.name}</span>
                {count > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isCurrent ? 'bg-white/25 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Quick Suggestion Pills (Address Samples) */}
        {!activePlace && !selectedMarker && (
          <div className="flex items-center gap-1.5 overflow-x-auto py-1 px-1 scrollbar-none">
            <span className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-300 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-2 py-1 rounded-lg shrink-0 shadow-sm">
              Quick:
            </span>
            {POPULAR_SEARCH_SUGGESTIONS.map((sug, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setSearchQuery(sug);
                  handleSearchAddress(sug);
                }}
                className="px-2.5 py-1 bg-white/95 dark:bg-slate-900/95 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-slate-700 dark:text-slate-200 hover:text-blue-600 border border-slate-200 dark:border-slate-700 rounded-xl text-[11px] font-medium whitespace-nowrap shadow-sm transition-colors cursor-pointer shrink-0"
              >
                📍 {sug}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* TOP-RIGHT MAP CONTROLS: LAYER TYPE & GPS LOCATE ME                        */}
      {/* ========================================================================= */}
      <div className="absolute top-4 right-4 z-10 hidden sm:flex flex-col gap-2 pointer-events-auto">
        {/* Google Maps Layer Switcher: Map vs Satellite */}
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-1 flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMapLayerType('streets')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              mapLayerType === 'streets'
                ? 'bg-[#1a73e8] text-white shadow-sm'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            🗺️ Map
          </button>
          <button
            type="button"
            onClick={() => setMapLayerType('satellite')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              mapLayerType === 'satellite'
                ? 'bg-[#1a73e8] text-white shadow-sm'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            🛰️ Satellite
          </button>
          <button
            type="button"
            onClick={() => setMapLayerType('terrain')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              mapLayerType === 'terrain'
                ? 'bg-[#1a73e8] text-white shadow-sm'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            🏔️ Terrain
          </button>
        </div>

        {/* GPS Locate Me Button */}
        <button
          type="button"
          onClick={handleLocateMe}
          disabled={locatingUser}
          className="self-end p-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md text-slate-800 dark:text-white rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 font-bold text-xs cursor-pointer"
          title="Zoom to My Current Location"
        >
          <Locate className={`w-4 h-4 text-blue-600 ${locatingUser ? 'animate-spin' : ''}`} />
          <span className="hidden md:inline">My Location</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* GOOGLE MAPS WATERMARK (Authentic Look & Terms Compliance)                 */}
      {/* ========================================================================= */}
      <div className="absolute bottom-2 left-3 z-10 pointer-events-none flex items-center gap-2">
        <div className="bg-white/85 dark:bg-slate-900/85 backdrop-blur-xs px-2.5 py-1 rounded-md shadow border border-slate-300 dark:border-slate-700 flex items-center gap-1.5">
          <span className="text-[11px] font-black tracking-tight text-slate-800 dark:text-slate-200">
            <span className="text-[#4285F4]">G</span>
            <span className="text-[#EA4335]">o</span>
            <span className="text-[#FBBC05]">o</span>
            <span className="text-[#4285F4]">g</span>
            <span className="text-[#34A853]">l</span>
            <span className="text-[#EA4335]">e</span> Maps Edition
          </span>
          <span className="text-[9px] text-slate-400">• Street & Satellite Data</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* GOOGLE MAPS DIRECTIONS & ROUTING DRAWER ("Where I Am" vs "Where I Go")     */}
      {/* ========================================================================= */}
      {showDirectionsPanel && (activePlace || selectedMarker) && (
        <div className="absolute top-20 right-4 left-4 sm:left-auto sm:w-[380px] z-30 animate-in slide-in-from-right-4 duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 shadow-2xl border-2 border-blue-500/40 space-y-3 relative">
            <button
              onClick={() => setShowDirectionsPanel(false)}
              className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white bg-slate-100 dark:bg-slate-800 rounded-full transition-colors cursor-pointer"
              title="Close Directions"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            {/* Travel Mode Toggle (Driving vs Walking) */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-blue-600">
                Route & Navigation:
              </span>
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setTravelMode('driving')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                    travelMode === 'driving' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <Car className="w-3.5 h-3.5" />
                  <span>Drive</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTravelMode('walking')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                    travelMode === 'walking' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <Footprints className="w-3.5 h-3.5" />
                  <span>Walk</span>
                </button>
              </div>
            </div>

            {/* Origin & Destination Addresses */}
            <div className="space-y-2 bg-slate-50 dark:bg-slate-850 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs">
              <div className="flex items-start gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-600 border-2 border-white ring-2 ring-blue-500/30 mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">From (Your Location):</span>
                  <p className="font-bold text-slate-900 dark:text-white truncate">
                    {userLocation ? '📍 Your Current GPS Location' : '🏫 LAUTECH Campus Gate'}
                  </p>
                </div>
              </div>

              <div className="border-l-2 border-dashed border-slate-300 dark:border-slate-700 ml-1.5 h-3 my-0.5" />

              <div className="flex items-start gap-2">
                <div className="w-3.5 h-3.5 text-red-600 mt-0.5 shrink-0">
                  <MapPin className="w-3.5 h-3.5 fill-current" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">To (Destination House):</span>
                  <p className="font-bold text-slate-900 dark:text-white truncate">
                    {activePlace ? activePlace.displayName : selectedMarker?.title}
                  </p>
                  <p className="text-[10px] text-slate-500 truncate">
                    {activePlace ? activePlace.formattedAddress : `${selectedMarker?.area.name}, Ogbomoso`}
                  </p>
                </div>
              </div>
            </div>

            {/* Distance & Travel Time Metric Card */}
            {activeRoute ? (
              <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/40 rounded-2xl border border-blue-200 dark:border-blue-900/50">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1 text-base font-black text-blue-700 dark:text-blue-300">
                    <Clock className="w-4 h-4" />
                    <span>{activeRoute.durationMinutes} mins</span>
                  </div>
                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                    {activeRoute.distanceKm} km via road network
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setShowTurnSteps(!showTurnSteps)}
                  className="px-2.5 py-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/60 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <span>Steps</span>
                  {showTurnSteps ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>
            ) : calculatingRoute ? (
              <div className="p-3 text-center text-xs font-bold text-blue-600 flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                Calculating fastest route...
              </div>
            ) : null}

            {/* Step-by-Step Directions */}
            {showTurnSteps && activeRoute && (
              <div className="max-h-36 overflow-y-auto space-y-1 p-2 bg-slate-50 dark:bg-slate-800/80 rounded-2xl text-[11px] border border-slate-200 dark:border-slate-700">
                {activeRoute.steps.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-2 py-0.5">
                    <span className="w-4 h-4 rounded-full bg-blue-600 text-white font-bold text-[9px] flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-800 dark:text-slate-200">{step.instruction}</p>
                      <span className="text-[9px] text-slate-400">{step.distanceKm} km</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Launch Turn-by-Turn in Official Google Maps App */}
            <div className="flex items-center gap-2 pt-1">
              <a
                href={getGoogleMapsDirectionsUrl(
                  userLocation || { lat: 8.1438, lng: 4.2638 },
                  activePlace ? { lat: activePlace.lat, lng: activePlace.lng } : { lat: selectedMarker?.lat || 8.1438, lng: selectedMarker?.lng || 4.2638 },
                  travelMode === 'walking' ? 'walking' : 'driving'
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2.5 bg-[#1a73e8] hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-1.5 text-center cursor-pointer"
              >
                <Compass className="w-4 h-4" />
                <span>Start Live in Google Maps</span>
              </a>

              <button
                type="button"
                onClick={() => {
                  const targetCoord = activePlace ? `${activePlace.lat},${activePlace.lng}` : `${selectedMarker?.lat},${selectedMarker?.lng}`;
                  navigator.clipboard.writeText(targetCoord);
                  onShowToast('GPS Coordinates copied to clipboard', 'success');
                }}
                className="p-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl transition-colors cursor-pointer"
                title="Copy Coordinates"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SEARCHED HOUSE / PLACE PREVIEW CARD (When address found)                  */}
      {/* ========================================================================= */}
      {activePlace && !showDirectionsPanel && (
        <div className="absolute bottom-4 right-4 left-4 sm:left-auto sm:w-[380px] z-30 animate-in slide-in-from-bottom-4 duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-2xl border-2 border-red-500/40 space-y-3 relative">
            <button
              onClick={() => setActivePlace(null)}
              className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white bg-slate-100 dark:bg-slate-800 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-100 dark:bg-red-950/80 text-red-600 flex items-center justify-center shrink-0 shadow-inner">
                <MapPin className="w-5 h-5 fill-current" />
              </div>
              <div className="min-w-0 space-y-0.5">
                <span className="text-[10px] font-black uppercase text-red-600 bg-red-50 dark:bg-red-950/60 px-2 py-0.5 rounded-md">
                  House / Street Location
                </span>
                <h4 className="font-black text-sm text-slate-900 dark:text-white truncate pt-0.5">
                  {activePlace.streetName || activePlace.displayName.split(',')[0]}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                  {activePlace.formattedAddress}
                </p>
                <p className="text-[10px] font-mono text-slate-400">
                  📍 {activePlace.lat.toFixed(5)}° N, {activePlace.lng.toFixed(5)}° E
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  if (userLocation) {
                    handleComputeDirections(userLocation, { lat: activePlace.lat, lng: activePlace.lng });
                  } else {
                    getCurrentUserLocation().then(loc => {
                      setUserLocation(loc);
                      handleComputeDirections(loc, { lat: activePlace.lat, lng: activePlace.lng });
                    });
                  }
                }}
                className="flex-1 py-2.5 bg-[#1a73e8] hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>Get Directions</span>
              </button>

              <a
                href={getGoogleMapsPlaceUrl({ lat: activePlace.lat, lng: activePlace.lng }, activePlace.displayName)}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                title="Open in Google Maps"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Google Maps</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SEARCHED / FILTERED AREA HOSTELS DRAWER (Shows list of hostels in area)   */}
      {/* ========================================================================= */}
      {(searchedAreaKeyword || activeAreaFocus !== 'all') && displayedMarkers.length > 0 && !selectedMarker && !showDirectionsPanel && (
        <div className="absolute bottom-4 left-4 right-4 sm:right-auto sm:max-w-lg z-20 animate-in fade-in slide-in-from-bottom-4 duration-200 pointer-events-auto">
          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-3xl p-3.5 sm:p-4 shadow-2xl border-2 border-blue-500/30 space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600">
                  <Building2 className="w-4 h-4" />
                </span>
                <div>
                  <h4 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>Hostels in {searchedAreaKeyword || 'Selected Area'}</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-600 text-white font-black">
                      {displayedMarkers.length}
                    </span>
                  </h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Click any hostel below or its pin on the map</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClearRouteAndSearch}
                className="text-[11px] text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-bold p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                title="Reset to all hostels"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex gap-3 overflow-x-auto pb-1 pt-0.5 scrollbar-thin">
              {displayedMarkers.map(marker => (
                <div
                  key={marker.id}
                  onClick={() => {
                    setSelectedMarker(marker);
                    const map = mapInstanceRef.current;
                    if (map) map.panTo([marker.lat, marker.lng], { animate: true });
                  }}
                  className="w-56 shrink-0 bg-slate-50 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-800 rounded-2xl p-2.5 border border-slate-200 dark:border-slate-700 hover:border-blue-500 shadow-sm hover:shadow-md cursor-pointer transition-all hover:-translate-y-0.5"
                >
                  <div className="relative rounded-xl overflow-hidden mb-2 aspect-video bg-slate-200">
                    <img src={marker.coverImage} alt={marker.title} className="w-full h-full object-cover" />
                    <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9px] font-black bg-slate-950/80 text-white backdrop-blur-xs">
                      {marker.propertyType.replace(/_/g, ' ')}
                    </span>
                    {marker.verificationStatus === 'APPROVED' && (
                      <span className="absolute top-1.5 right-1.5 p-1 rounded-full bg-emerald-500 text-white shadow-xs">
                        <ShieldCheck className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </div>
                  <h5 className="font-bold text-xs text-slate-900 dark:text-white truncate" title={marker.title}>{marker.title}</h5>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">📍 {marker.area.name} • {formatDistance(marker.distanceKm)}</p>
                  <div className="flex items-center justify-between pt-2 mt-1.5 border-t border-slate-200/80 dark:border-slate-700">
                    <span className="font-black text-xs text-emerald-700 dark:text-emerald-400">
                      {formatNaira(marker.rentAmount)}
                      <span className="text-[9px] font-normal text-slate-400">/yr</span>
                    </span>
                    <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 flex items-center gap-0.5">
                      Select <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SELECTED HOSTEL PREVIEW DRAWER (When hostel pin clicked)                  */}
      {/* ========================================================================= */}
      {selectedMarker && !showDirectionsPanel && (
        <div className="absolute bottom-4 right-4 left-4 sm:left-auto sm:w-96 z-30 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 shadow-2xl border-2 border-emerald-500/40 space-y-3 relative">
            <button
              onClick={() => setSelectedMarker(null)}
              className="absolute top-3 right-3 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white bg-slate-100 dark:bg-slate-800 rounded-full transition-colors cursor-pointer"
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

                <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate">{selectedMarker.title}</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">📍 {selectedMarker.area.name} • {formatDistance(selectedMarker.distanceKm)} from Campus</p>
                <div className="pt-1 flex items-baseline gap-1">
                  <span className="text-sm font-black text-emerald-700 dark:text-emerald-400">{formatNaira(selectedMarker.rentAmount)}</span>
                  <span className="text-[10px] text-slate-400 font-medium">/yr</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  if (userLocation) {
                    handleComputeDirections(userLocation, { lat: selectedMarker.lat, lng: selectedMarker.lng });
                  } else {
                    getCurrentUserLocation().then(loc => {
                      setUserLocation(loc);
                      handleComputeDirections(loc, { lat: selectedMarker.lat, lng: selectedMarker.lng });
                    });
                  }
                }}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow transition-colors flex items-center gap-1 cursor-pointer"
                title="Get Directions from My Location"
              >
                <Navigation className="w-3.5 h-3.5" />
                Directions
              </button>

              <button
                onClick={() => onSelectProperty(selectedMarker.id)}
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition-colors flex items-center justify-center gap-1 cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" /> View & Book
              </button>

              {onOpenConversation && (
                <button
                  onClick={() => onOpenConversation(selectedMarker.id)}
                  className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow transition-colors flex items-center gap-1 cursor-pointer"
                  title="Message Landlord"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                  Chat
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
