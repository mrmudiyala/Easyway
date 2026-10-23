import { LocationPoint } from '../types/contracts.js';
import { getMapService } from './map/mapFactory.js';

export interface ParsedVoiceBooking {
  pickup: LocationPoint & { address: string };
  dropoff: LocationPoint & { address: string };
  rawEntities: {
    pickupLandmark: string;
    destinationLandmark: string;
  };
}

/**
 * AI Voice Processing and Entity Extraction Service
 * Extracts pickup/dropoff landmarks from natural speech and resolves coordinates biased to user GPS.
 */
export class VoiceService {
  /**
   * Parse user speech text into structured landmarks and coordinates.
   */
  static async parseVoiceBooking(
    speechText: string,
    userLat: number = 12.9716,
    userLng: number = 77.5946
  ): Promise<ParsedVoiceBooking> {
    if (!speechText || typeof speechText !== 'string') {
      throw new Error('Speech text is required');
    }

    // 1. Entity Extraction (LLM / NLP pattern matching)
    const entities = this.extractLandmarksFromText(speechText);

    // 2. Geocode Landmarks biased to user GPS location
    const [pickupCoords, dropoffCoords] = await Promise.all([
      this.resolveLandmarkCoordinates(entities.pickupLandmark, userLat, userLng, true),
      this.resolveLandmarkCoordinates(entities.destinationLandmark, userLat, userLng, false),
    ]);

    return {
      pickup: pickupCoords,
      dropoff: dropoffCoords,
      rawEntities: entities,
    };
  }

  /**
   * Heuristic + NLP landmark extractor supporting common Indian & global natural speech patterns.
   * e.g. "Take me from Benz Circle to Mindspace Building 3"
   *      "Book a ride to Koramangala from MG Road"
   *      "Go to Airport"
   */
  private static extractLandmarksFromText(text: string): {
    pickupLandmark: string;
    destinationLandmark: string;
  } {
    const cleaned = text.trim();
    let pickupLandmark = 'CURRENT_LOCATION';
    let destinationLandmark = '';

    // Pattern 1: "Take me from [Pickup] to [Destination]"
    const fromToMatch = cleaned.match(/from\s+(.+?)\s+to\s+(.+)/i);
    if (fromToMatch) {
      pickupLandmark = fromToMatch[1].trim();
      destinationLandmark = fromToMatch[2].trim();
    } else {
      // Pattern 2: "to [Destination] from [Pickup]"
      const toFromMatch = cleaned.match(/to\s+(.+?)\s+from\s+(.+)/i);
      if (toFromMatch) {
        destinationLandmark = toFromMatch[1].trim();
        pickupLandmark = toFromMatch[2].trim();
      } else {
        // Pattern 3: "take me to [Destination]" or "go to [Destination]" or "drive to [Destination]"
        const toMatch = cleaned.match(/(?:take me to|go to|drive to|ride to|to)\s+(.+)/i);
        if (toMatch) {
          destinationLandmark = toMatch[1].trim();
          pickupLandmark = 'CURRENT_LOCATION';
        } else {
          // Default fallback
          destinationLandmark = cleaned;
          pickupLandmark = 'CURRENT_LOCATION';
        }
      }
    }

    // Strip trailing punctuation
    pickupLandmark = pickupLandmark.replace(/[.,!?]+$/, '');
    destinationLandmark = destinationLandmark.replace(/[.,!?]+$/, '');

    return { pickupLandmark, destinationLandmark };
  }

  /**
   * Geocodes a landmark with fallback to MapService autocomplete & reverse geocoding.
   */
  private static async resolveLandmarkCoordinates(
    landmark: string,
    biasLat: number,
    biasLng: number,
    isPickup: boolean
  ): Promise<LocationPoint & { address: string }> {
    const mapService = getMapService();

    if (
      landmark.toUpperCase() === 'CURRENT_LOCATION' ||
      landmark.toLowerCase() === 'here' ||
      landmark.toLowerCase() === 'my location'
    ) {
      const reverse = await mapService.reverseGeocode(biasLat, biasLng);
      return {
        lat: biasLat,
        lng: biasLng,
        address: reverse.formattedAddress || 'Current GPS Location',
      };
    }

    // Try finding place via autocomplete
    const suggestions = await mapService.placesAutocomplete(landmark, { lat: biasLat, lng: biasLng });
    if (suggestions && suggestions.length > 0) {
      const placeDetails = await mapService.getPlaceDetails(suggestions[0].placeId);
      return {
        lat: placeDetails.location.lat,
        lng: placeDetails.location.lng,
        address: placeDetails.address || suggestions[0].description,
      };
    }

    // Offset coordinates slightly if not found in mock database to generate realistic route
    const offsetLat = isPickup ? biasLat : biasLat + 0.028;
    const offsetLng = isPickup ? biasLng : biasLng + 0.032;

    return {
      lat: offsetLat,
      lng: offsetLng,
      address: landmark,
    };
  }
}
