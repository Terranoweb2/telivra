import { point, polygon } from "@turf/helpers";
import { distance } from "@turf/distance";
import { booleanPointInPolygon } from "@turf/boolean-point-in-polygon";

export function isPointInGeofence(
  lat: number,
  lng: number,
  geofence: {
    type: string;
    centerLat: number | null;
    centerLng: number | null;
    radiusMeters: number | null;
    coordinates: any;
  }
): boolean {
  const pt = point([lng, lat]);

  if (geofence.type === "CIRCLE" && geofence.centerLat && geofence.centerLng && geofence.radiusMeters) {
    const center = point([geofence.centerLng, geofence.centerLat]);
    const dist = distance(pt, center, { units: "meters" });
    return dist <= geofence.radiusMeters;
  }

  if (geofence.type === "POLYGON" && geofence.coordinates) {
    const coords = geofence.coordinates as number[][];
    if (coords.length < 3) return false;
    const closed = [...coords.map((c: number[]) => [c[1], c[0]])];
    if (closed[0][0] !== closed[closed.length - 1][0] || closed[0][1] !== closed[closed.length - 1][1]) {
      closed.push(closed[0]);
    }
    const poly = polygon([closed]);
    return booleanPointInPolygon(pt, poly);
  }

  return false;
}
