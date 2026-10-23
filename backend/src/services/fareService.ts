import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { LocationPoint, VehicleType, FareBreakdown } from '../types/contracts.js';
import { haversineDistanceMeters } from '../db/spatialRepo.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface VehicleConfig {
  displayName: string;
  baseFare: number;
  perKmRate: number;
  perMinuteRate: number;
  minFare: number;
  capacity: number;
  description: string;
}

interface FareRules {
  currency: string;
  chargePickupApproach: boolean;
  vehicles: Record<VehicleType, VehicleConfig>;
}

export class FareService {
  private static fareRules: FareRules;

  static init() {
    const configPath = path.resolve(__dirname, '../config/fareRules.json');
    const raw = fs.readFileSync(configPath, 'utf-8');
    this.fareRules = JSON.parse(raw);
  }

  /**
   * CANONICAL METRIC CALCULATION:
   * To guarantee Fare(A -> B) === Fare(B -> A) unconditionally:
   * 1. Points are canonicalized by ordering coordinates (smaller lat/lng first).
   * 2. Direct geodesic road-calibrated distance is computed on the canonical pair.
   * 3. Typical (non-live, non-surge) duration is computed using standardized city travel speed.
   */
  static getCanonicalMetrics(pointA: LocationPoint, pointB: LocationPoint): {
    canonicalDistanceKm: number;
    canonicalDurationMins: number;
  } {
    // 1. Sort points to eliminate directional bias
    const [p1, p2] = this.canonicalSortPoints(pointA, pointB);

    // 2. Compute canonical great-circle distance
    const geodesicMeters = haversineDistanceMeters(p1.lat, p1.lng, p2.lat, p2.lng);

    // City road network factor (roads are rarely a straight line, average tortuosity is ~1.28)
    const roadDistanceMeters = Math.max(500, Math.round(geodesicMeters * 1.28));
    const canonicalDistanceKm = parseFloat((roadDistanceMeters / 1000).toFixed(2));

    // 3. Typical city driving speed: 25 km/h = ~416.6 meters per minute
    // Plus 3 minutes baseline traffic buffer for intersections
    const calculatedMinutes = Math.round(roadDistanceMeters / 416.6) + 3;
    const canonicalDurationMins = Math.max(5, calculatedMinutes);

    return {
      canonicalDistanceKm,
      canonicalDurationMins,
    };
  }

  /**
   * Canonical coordinate sort: orders two points consistently regardless of order passed
   */
  private static canonicalSortPoints(a: LocationPoint, b: LocationPoint): [LocationPoint, LocationPoint] {
    if (a.lat < b.lat || (a.lat === b.lat && a.lng < b.lng)) {
      return [a, b];
    }
    return [b, a];
  }

  /**
   * Computes locked symmetrical fares for all vehicle types
   */
  static calculateFares(pickup: LocationPoint, drop: LocationPoint): {
    canonicalDistanceKm: number;
    canonicalDurationMins: number;
    fares: FareBreakdown[];
  } {
    this.init();
    const { canonicalDistanceKm, canonicalDurationMins } = this.getCanonicalMetrics(pickup, drop);

    const vehicleKeys: VehicleType[] = ['BIKE', 'AUTO', 'CAB'];
    const breakdowns: FareBreakdown[] = vehicleKeys.map((type) => {
      const rule = this.fareRules.vehicles[type];

      const distanceFare = canonicalDistanceKm * rule.perKmRate;
      const timeFare = canonicalDurationMins * rule.perMinuteRate;
      const rawTotal = rule.baseFare + distanceFare + timeFare;

      // Ensure minimum fare and round to nearest whole rupee (₹)
      const totalFare = Math.round(Math.max(rule.minFare, rawTotal));

      return {
        vehicleType: type,
        displayName: rule.displayName,
        baseFare: rule.baseFare,
        distanceKm: canonicalDistanceKm,
        durationMins: canonicalDurationMins,
        distanceFare: parseFloat(distanceFare.toFixed(2)),
        timeFare: parseFloat(timeFare.toFixed(2)),
        totalFare,
        currency: this.fareRules.currency,
        canonicalDistanceKm,
        canonicalDurationMins,
      };
    });

    return {
      canonicalDistanceKm,
      canonicalDurationMins,
      fares: breakdowns,
    };
  }
}
