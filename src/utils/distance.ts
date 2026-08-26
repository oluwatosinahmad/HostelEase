// ==========================================
// CAMPUS PROXIMITY & DISTANCE UTILITY
// ==========================================

export const LAUTECH_GATE_COORDS = {
  lat: 8.1432,
  lng: 4.2645,
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
 * Returns formatted distance string from university gate.
 */
export function formatProximityText(
  distanceKm: number,
  campusShortName: string = 'LAUTECH'
): string {
  if (distanceKm < 1) {
    const meters = Math.round(distanceKm * 1000);
    return `${meters}m from ${campusShortName} Gate`;
  }
  return `${distanceKm.toFixed(1)} km from ${campusShortName} Gate`;
}
