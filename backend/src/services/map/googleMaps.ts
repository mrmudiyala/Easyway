import { IMapService, ReverseGeocodeResult, PlaceSuggestion, RouteOption } from './IMapService.js';
import { LocationPoint } from '../../types/contracts.js';
import { env } from '../../config/env.js';
import { MockMapService } from './mockMaps.js';

export class GoogleMapService implements IMapService {
  private apiKey: string;
  private fallback: MockMapService;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.fallback = new MockMapService();
  }

  async reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult> {
    if (!this.apiKey) return this.fallback.reverseGeocode(lat, lng);

    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${this.apiKey}`;
      const res = await fetch(url);
      const data = (await res.json()) as any;

      if (data.status === 'OK' && data.results.length > 0) {
        const topResult = data.results[0];
        const routeComp = topResult.address_components?.find((c: any) => c.types.includes('route'));
        return {
          formattedAddress: topResult.formatted_address,
          roadName: routeComp ? routeComp.long_name : 'Current Road',
          drivablePoint: {
            lat: topResult.geometry.location.lat,
            lng: topResult.geometry.location.lng,
          },
          isSnappedToRoad: true,
        };
      }
      return this.fallback.reverseGeocode(lat, lng);
    } catch (err) {
      console.warn('[GoogleMaps] Reverse geocode error, using fallback:', err);
      return this.fallback.reverseGeocode(lat, lng);
    }
  }

  async placesAutocomplete(query: string, proximity?: LocationPoint): Promise<PlaceSuggestion[]> {
    if (!this.apiKey) return this.fallback.placesAutocomplete(query, proximity);

    try {
      let url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
        query
      )}&key=${this.apiKey}&components=country:in`;

      if (proximity) {
        url += `&location=${proximity.lat},${proximity.lng}&radius=50000`;
      }

      const res = await fetch(url);
      const data = (await res.json()) as any;

      if (data.status === 'OK') {
        return data.predictions.map((p: any) => ({
          placeId: p.place_id,
          title: p.structured_formatting?.main_text || p.description,
          subtitle: p.structured_formatting?.secondary_text || '',
          description: p.description,
        }));
      }
      return this.fallback.placesAutocomplete(query, proximity);
    } catch (err) {
      console.warn('[GoogleMaps] Autocomplete error, using fallback:', err);
      return this.fallback.placesAutocomplete(query, proximity);
    }
  }

  async getPlaceDetails(placeId: string): Promise<{ location: LocationPoint; address: string }> {
    if (!this.apiKey) return this.fallback.getPlaceDetails(placeId);

    try {
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry,formatted_address&key=${this.apiKey}`;
      const res = await fetch(url);
      const data = (await res.json()) as any;

      if (data.status === 'OK' && data.result?.geometry?.location) {
        return {
          location: {
            lat: data.result.geometry.location.lat,
            lng: data.result.geometry.location.lng,
          },
          address: data.result.formatted_address,
        };
      }
      return this.fallback.getPlaceDetails(placeId);
    } catch (err) {
      console.warn('[GoogleMaps] Place details error, using fallback:', err);
      return this.fallback.getPlaceDetails(placeId);
    }
  }

  async getRoutes(origin: LocationPoint, destination: LocationPoint): Promise<RouteOption[]> {
    if (!this.apiKey) return this.fallback.getRoutes(origin, destination);

    try {
      // Routes API (Directions V2) with live traffic
      const url = 'https://routes.googleapis.com/directions/v2:computeRoutes';
      const body = {
        origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
        destination: { location: { latLng: { latitude: destination.lat, longitude: destination.lng } } },
        travelMode: 'DRIVE',
        routingPreference: 'TRAFFIC_AWARE',
        computeAlternativeRoutes: true,
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': this.apiKey,
          'X-Goog-FieldMask': 'routes.duration,routes.staticDuration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.description',
        },
        body: JSON.stringify(body),
      });

      const data = (await res.json()) as any;

      if (data.routes && data.routes.length > 0) {
        // Find route with least duration
        let lowestDuration = Infinity;
        data.routes.forEach((r: any) => {
          const sec = parseInt(r.duration?.replace('s', '') || '0', 10);
          if (sec < lowestDuration) lowestDuration = sec;
        });

        return data.routes.map((r: any, idx: number) => {
          const durSec = parseInt(r.duration?.replace('s', '') || '0', 10);
          const staticDurSec = parseInt(r.staticDuration?.replace('s', '') || durSec.toString(), 10);
          const isLeast = durSec === lowestDuration;
          const trafficDelay = durSec - staticDurSec;
          const trafficCondition = trafficDelay > 300 ? 'HEAVY' : trafficDelay > 90 ? 'MODERATE' : 'LOW';

          return {
            id: `google_route_${idx}`,
            summary: r.description || `Route ${idx + 1}`,
            distanceMeters: r.distanceMeters || 1000,
            durationSeconds: durSec,
            durationTypicalSeconds: staticDurSec,
            isLeastTraffic: isLeast,
            polylinePoints: r.polyline?.encodedPolyline || '',
            trafficConditions: trafficCondition,
          };
        });
      }

      return this.fallback.getRoutes(origin, destination);
    } catch (err) {
      console.warn('[GoogleMaps] Routes API error, using fallback:', err);
      return this.fallback.getRoutes(origin, destination);
    }
  }
}
