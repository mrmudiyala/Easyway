import { IMapService, ReverseGeocodeResult, PlaceSuggestion, RouteOption } from './IMapService.js';
import { LocationPoint } from '../../types/contracts.js';
import { haversineDistanceMeters } from '../../db/spatialRepo.js';

const KNOWN_PLACES: Array<{ id: string; title: string; subtitle: string; lat: number; lng: number }> = [
  { id: 'p1', title: 'City Railway Station', subtitle: 'Kempegowda Station, Majestic, Bangalore', lat: 12.9781, lng: 77.5694 },
  { id: 'p2', title: 'City Centre Mall', subtitle: 'MG Road, Ashok Nagar, Bangalore', lat: 12.9733, lng: 77.6111 },
  { id: 'p3', title: 'International Airport', subtitle: 'Devanahalli, Bangalore', lat: 13.1986, lng: 77.7066 },
  { id: 'p4', title: 'Indiranagar 100ft Road', subtitle: 'Indiranagar, Bangalore', lat: 12.9719, lng: 77.6412 },
  { id: 'p5', title: 'Koramangala 5th Block', subtitle: 'Koramangala, Bangalore', lat: 12.9345, lng: 77.6190 },
  { id: 'p6', title: 'Whitefield IT Park', subtitle: 'ITPL Main Road, Bangalore', lat: 12.9856, lng: 77.7314 },
];

export class MockMapService implements IMapService {
  async reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult> {
    // Check if close to a known place
    for (const place of KNOWN_PLACES) {
      if (haversineDistanceMeters(lat, lng, place.lat, place.lng) < 400) {
        return {
          formattedAddress: place.subtitle,
          roadName: place.title,
          drivablePoint: { lat: place.lat, lng: place.lng },
          isSnappedToRoad: true,
        };
      }
    }

    return {
      formattedAddress: `Near Main Road, Coordinate (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
      roadName: 'Main Arterial Road',
      drivablePoint: { lat, lng },
      isSnappedToRoad: true,
    };
  }

  async placesAutocomplete(query: string, proximity?: LocationPoint): Promise<PlaceSuggestion[]> {
    const q = query.toLowerCase().trim();
    if (!q) return [];

    const matches = KNOWN_PLACES.filter(
      (p) => p.title.toLowerCase().includes(q) || p.subtitle.toLowerCase().includes(q)
    );

    return matches.map((m) => ({
      placeId: m.id,
      title: m.title,
      subtitle: m.subtitle,
      description: `${m.title}, ${m.subtitle}`,
    }));
  }

  async getPlaceDetails(placeId: string): Promise<{ location: LocationPoint; address: string }> {
    const place = KNOWN_PLACES.find((p) => p.id === placeId);
    if (place) {
      return {
        location: { lat: place.lat, lng: place.lng, address: place.subtitle },
        address: place.subtitle,
      };
    }

    // Default fallback
    return {
      location: { lat: 12.9716, lng: 77.5946, address: 'Central Point' },
      address: 'Central Point, Bangalore',
    };
  }

  async getRoutes(origin: LocationPoint, destination: LocationPoint): Promise<RouteOption[]> {
    const directDist = haversineDistanceMeters(origin.lat, origin.lng, destination.lat, destination.lng);
    // Typical driving distance on city roads is ~1.25x the straight line distance
    const roadDistanceMeters = Math.round(directDist * 1.25);
    // Average city speed ~25 km/h -> 416 meters/min
    const typicalDurationSeconds = Math.round((roadDistanceMeters / 416) * 60);

    return [
      {
        id: 'route_least_traffic',
        summary: 'via Main Arterial Road (Least Traffic)',
        distanceMeters: roadDistanceMeters,
        durationSeconds: typicalDurationSeconds,
        durationTypicalSeconds: typicalDurationSeconds,
        isLeastTraffic: true,
        polylinePoints: `${origin.lat},${origin.lng};${destination.lat},${destination.lng}`,
        trafficConditions: 'LOW',
      },
      {
        id: 'route_alternative',
        summary: 'via Inner Ring Road',
        distanceMeters: Math.round(roadDistanceMeters * 1.1),
        durationSeconds: Math.round(typicalDurationSeconds * 1.2),
        durationTypicalSeconds: typicalDurationSeconds,
        isLeastTraffic: false,
        polylinePoints: `${origin.lat},${origin.lng};${destination.lat},${destination.lng}`,
        trafficConditions: 'MODERATE',
      },
    ];
  }
}
