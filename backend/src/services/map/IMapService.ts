import { LocationPoint } from '../../types/contracts.js';

export interface ReverseGeocodeResult {
  formattedAddress: string;
  roadName: string;
  drivablePoint: LocationPoint;
  isSnappedToRoad: boolean;
}

export interface PlaceSuggestion {
  placeId: string;
  title: string;
  subtitle: string;
  description: string;
}

export interface RouteOption {
  id: string;
  summary: string;
  distanceMeters: number;
  durationSeconds: number;
  durationTypicalSeconds: number;
  isLeastTraffic: boolean;
  polylinePoints: string; // Encoded polyline
  trafficConditions: 'LOW' | 'MODERATE' | 'HEAVY';
}

export interface IMapService {
  reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult>;
  placesAutocomplete(query: string, proximity?: LocationPoint): Promise<PlaceSuggestion[]>;
  getPlaceDetails(placeId: string): Promise<{ location: LocationPoint; address: string }>;
  getRoutes(origin: LocationPoint, destination: LocationPoint): Promise<RouteOption[]>;
}
