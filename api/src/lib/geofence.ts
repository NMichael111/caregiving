const EARTH_RADIUS_M = 6_371_000;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(x));
}

// EVV geofence radius: industry typical is 50-200m. We pick 150m as a balance
// between strictness and caregiver UX (e.g., parked across the street).
export const GEOFENCE_METERS = 150;

export function isOutsideGeofence(
  caregiver: { lat: number; lng: number },
  client: { lat: number; lng: number },
): boolean {
  return haversineMeters(caregiver, client) > GEOFENCE_METERS;
}
