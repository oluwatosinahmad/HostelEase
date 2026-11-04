// ==========================================
// CAMPUS PROXIMITY, ROUTING & TRAVEL TIME UTILITY
// ==========================================

export interface CampusGate {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export const LAUTECH_CAMPUS_GATES: CampusGate[] = [
  { id: 'main-gate', name: 'Main Campus Gate (Under-G)', lat: 8.1438, lng: 4.2638 },
  { id: 'second-gate', name: '2nd Gate (College Road / CHS)', lat: 8.1385, lng: 4.2695 },
  { id: 'senate-gate', name: 'Senate / Stadium Gate', lat: 8.1462, lng: 4.2670 },
];

export const LAUTECH_GATE_COORDS = {
  lat: 8.1438,
  lng: 4.2638,
};

/**
 * Calculates the great-circle distance between two coordinates in kilometers using Haversine formula.
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number = LAUTECH_GATE_COORDS.lat,
  lon2: number = LAUTECH_GATE_COORDS.lng
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return Number(distance.toFixed(2));
}

/**
 * Identifies the nearest campus gate from the hostel's map coordinates.
 */
export function findClosestCampusGate(
  lat: number,
  lng: number,
  gates: CampusGate[] = LAUTECH_CAMPUS_GATES
): { gate: CampusGate; distanceKm: number } {
  let closest = gates[0];
  let minStraightDistance = calculateDistanceKm(lat, lng, closest.lat, closest.lng);

  for (let i = 1; i < gates.length; i++) {
    const d = calculateDistanceKm(lat, lng, gates[i].lat, gates[i].lng);
    if (d < minStraightDistance) {
      minStraightDistance = d;
      closest = gates[i];
    }
  }

  // Real road networks average ~25% longer than straight-line distance
  const roadFactor = 1.25;
  const roadDistanceKm = Number((minStraightDistance * roadFactor).toFixed(1));
  return { gate: closest, distanceKm: roadDistanceKm };
}

export interface HostelTravelEstimate {
  minutes: number;
  travelMode: 'walking' | 'transit' | 'driving';
  primaryText: string; // e.g. "8 mins to LAUTECH", "12 mins to LAUTECH", "20 mins to LAUTECH"
  clarificationText: string; // "Estimated walking time from the hostel to LAUTECH."
  distanceKm: number;
  nearestGateName?: string;
}

/**
 * Calculates student-friendly travel time to LAUTECH using map coordinates or distance.
 * Returns simple primary text such as "8 mins to LAUTECH", "12 mins to LAUTECH", "20 mins to LAUTECH"
 * with the appropriate clarification underneath ("Estimated walking time from the hostel to LAUTECH.")
 */
export function calculateHostelTravelTime(
  distanceKmOrLocation: number | string | { lat: number; lng: number } | null | undefined
): HostelTravelEstimate {
  let distanceKm = 0.8;
  let nearestGateName: string | undefined = undefined;

  if (typeof distanceKmOrLocation === 'object' && distanceKmOrLocation !== null && 'lat' in distanceKmOrLocation) {
    const { lat, lng } = distanceKmOrLocation;
    if (typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng)) {
      const res = findClosestCampusGate(lat, lng);
      distanceKm = Math.max(0.1, res.distanceKm);
      nearestGateName = res.gate.name;
    }
  } else if (distanceKmOrLocation !== null && distanceKmOrLocation !== undefined && distanceKmOrLocation !== '') {
    const parsed = typeof distanceKmOrLocation === 'number' ? distanceKmOrLocation : parseFloat(String(distanceKmOrLocation));
    if (!isNaN(parsed) && parsed > 0) {
      distanceKm = parsed;
    }
  }

  let minutes: number;
  let travelMode: 'walking' | 'transit' | 'driving';
  let clarificationText: string;

  if (distanceKm <= 2.0) {
    travelMode = 'walking';
    // Walking speed: 4.5 km/h = ~13.33 mins per km
    // 0.3km -> 4 mins, 0.6km -> 8 mins, 0.9km -> 12 mins, 1.5km -> 20 mins
    minutes = Math.max(1, Math.round(distanceKm * 13.33));
    clarificationText = 'Estimated walking time from the hostel to LAUTECH.';
  } else {
    travelMode = 'transit';
    // Longer distance: bike / campus shuttle / keke (~3.5 mins/km + 2 mins wait)
    minutes = Math.max(5, Math.round(distanceKm * 3.5 + 2));
    clarificationText = 'Estimated commute time via campus shuttle/bike to LAUTECH.';
  }

  return {
    minutes,
    travelMode,
    primaryText: `${minutes} mins to LAUTECH`,
    clarificationText,
    distanceKm: Number(distanceKm.toFixed(1)),
    nearestGateName
  };
}

/**
 * Returns simple primary travel time text (e.g. "8 mins to LAUTECH").
 */
export function formatTravelTime(
  distanceKmOrLocation: number | string | { lat: number; lng: number } | null | undefined
): string {
  return calculateHostelTravelTime(distanceKmOrLocation).primaryText;
}

/**
 * Returns travel time clarification text underneath the primary text.
 */
export function formatTravelClarification(
  distanceKmOrLocation: number | string | { lat: number; lng: number } | null | undefined
): string {
  return calculateHostelTravelTime(distanceKmOrLocation).clarificationText;
}

/**
 * Returns clean distance formatting without confusing gate descriptions.
 */
export function formatProximityText(
  distanceKm: number | string | null | undefined,
  campusName: string = 'LAUTECH'
): string {
  if (distanceKm === null || distanceKm === undefined || distanceKm === '') return '';
  const num = typeof distanceKm === 'number' ? distanceKm : Number(distanceKm);
  if (isNaN(num)) return '';
  if (num < 1) {
    const meters = Math.round(num * 1000);
    return `${meters}m to ${campusName}`;
  }
  return `${num.toFixed(1)} km to ${campusName}`;
}
