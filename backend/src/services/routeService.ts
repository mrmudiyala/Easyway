import { getMapService } from './map/mapFactory.js';
import { LocationPoint } from '../types/contracts.js';
import { RouteOption } from './map/IMapService.js';

export interface EvaluatedRoute extends RouteOption {
  trafficColor: string; // Hex color for polyline rendering
  timeSavedMinutes: number;
  badge?: string;
  isRecommended: boolean;
}

export class RouteService {
  static async getAnalyzedRoutes(origin: LocationPoint, destination: LocationPoint): Promise<EvaluatedRoute[]> {
    const mapService = getMapService();
    const rawRoutes = await mapService.getRoutes(origin, destination);

    if (rawRoutes.length === 0) return [];

    // Find the maximum duration among alternatives to calculate time saved
    const maxDurationSec = Math.max(...rawRoutes.map((r) => r.durationSeconds));
    const minDurationSec = Math.min(...rawRoutes.map((r) => r.durationSeconds));

    // Rule: Default to lowest traffic-aware ETA. If two routes are within 3 mins (180s),
    // choose the simpler one (shorter distance / fewer complex turns)
    const sorted = [...rawRoutes].sort((a, b) => {
      const timeDiff = Math.abs(a.durationSeconds - b.durationSeconds);
      if (timeDiff <= 180) {
        // Within 3 minutes -> prefer simpler/shorter distance route
        return a.distanceMeters - b.distanceMeters;
      }
      return a.durationSeconds - b.durationSeconds;
    });

    const recommendedId = sorted[0].id;

    return rawRoutes.map((r) => {
      const isRecommended = r.id === recommendedId;
      const timeSavedSec = maxDurationSec - r.durationSeconds;
      const timeSavedMins = Math.max(0, Math.round(timeSavedSec / 60));

      let trafficColor = '#00C853'; // Default Green (Low traffic)
      if (r.trafficConditions === 'MODERATE') {
        trafficColor = '#FFA000'; // Amber
      } else if (r.trafficConditions === 'HEAVY') {
        trafficColor = '#D32F2F'; // Red
      }

      let badge: string | undefined;
      if (isRecommended && timeSavedMins > 0) {
        badge = `Least Traffic • Saves ${timeSavedMins} mins`;
      } else if (isRecommended) {
        badge = 'Recommended Route';
      }

      return {
        ...r,
        trafficColor,
        timeSavedMinutes: timeSavedMins,
        badge,
        isRecommended,
      };
    });
  }
}
