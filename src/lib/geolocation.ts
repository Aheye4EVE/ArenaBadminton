export type GeoCoordinates = {
  latitude: number;
  longitude: number;
};

function finiteCoordinate(value: unknown) {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  if (typeof value !== "number" && typeof value !== "string") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeCoordinates(latitude: unknown, longitude: unknown): GeoCoordinates | null {
  const parsedLatitude = finiteCoordinate(latitude);
  const parsedLongitude = finiteCoordinate(longitude);
  if (parsedLatitude === null || parsedLongitude === null) return null;
  if (parsedLatitude < -90 || parsedLatitude > 90 || parsedLongitude < -180 || parsedLongitude > 180) return null;
  if (parsedLatitude === 0 && parsedLongitude === 0) return null;
  return { latitude: parsedLatitude, longitude: parsedLongitude };
}

export function haversineDistanceKm(from: GeoCoordinates, to: GeoCoordinates) {
  const earthRadiusKm = 6371;
  const latitudeDelta = (to.latitude - from.latitude) * (Math.PI / 180);
  const longitudeDelta = (to.longitude - from.longitude) * (Math.PI / 180);
  const latitude1 = from.latitude * (Math.PI / 180);
  const latitude2 = to.latitude * (Math.PI / 180);
  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(latitude1) * Math.cos(latitude2) * Math.sin(longitudeDelta / 2) ** 2;
  return earthRadiusKm * 2 * Math.asin(Math.min(1, Math.sqrt(Math.max(0, haversine))));
}

export function formatDistanceKm(value: unknown) {
  const distanceKm = finiteCoordinate(value);
  if (distanceKm === null || distanceKm < 0) return null;
  if (distanceKm < 1) return `${Math.round(distanceKm * 1000)} ม.`;
  return `${distanceKm < 10 ? distanceKm.toFixed(1) : distanceKm.toFixed(0)} กม.`;
}
