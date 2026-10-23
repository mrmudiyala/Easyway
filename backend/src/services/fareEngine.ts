export interface FareCalculationResult {
  baseFare: number;
  distanceKm: number;
  durationMins: number;
  distanceFare: number;
  timeFare: number;
  platformFee: number;
  totalFare: number;
  currency: string;
  breakdownSummary: string;
}

export const FARE_CONFIG: Record<
  string,
  { baseFare: number; perKmRate: number; perMinRate: number; platformFee: number }
> = {
  two_wheeler: {
    baseFare: 15.0,
    perKmRate: 5.5,
    perMinRate: 0.5,
    platformFee: 0.0,
  },
  four_wheeler: {
    baseFare: 35.0,
    perKmRate: 11.0,
    perMinRate: 1.0,
    platformFee: 2.0,
  },
  BIKE: {
    baseFare: 15.0,
    perKmRate: 5.5,
    perMinRate: 0.5,
    platformFee: 0.0,
  },
  AUTO: {
    baseFare: 22.0,
    perKmRate: 7.5,
    perMinRate: 0.75,
    platformFee: 1.0,
  },
  CAB: {
    baseFare: 35.0,
    perKmRate: 11.0,
    perMinRate: 1.0,
    platformFee: 2.0,
  },
};

/**
 * Deterministic Symmetrical Fare Engine
 * Guarantees that Fare(A -> B) === Fare(B -> A) with no directional surge asymmetry.
 */
export class FareEngine {
  static calculateSymmetricalFare(
    distanceKm: number,
    durationMins: number,
    vehicleType: string = 'two_wheeler'
  ): FareCalculationResult {
    const config = FARE_CONFIG[vehicleType] || FARE_CONFIG['two_wheeler'];

    const distanceFare = distanceKm * config.perKmRate;
    const timeFare = durationMins * config.perMinRate;
    const rawTotal = config.baseFare + distanceFare + timeFare + config.platformFee;
    const totalFare = Math.round(rawTotal);

    return {
      baseFare: config.baseFare,
      distanceKm,
      durationMins,
      distanceFare: parseFloat(distanceFare.toFixed(2)),
      timeFare: parseFloat(timeFare.toFixed(2)),
      platformFee: config.platformFee,
      totalFare,
      currency: 'INR',
      breakdownSummary: `Base ₹${config.baseFare} + (${distanceKm}km × ₹${config.perKmRate}) + (${durationMins}m × ₹${config.perMinRate}) + Fee ₹${config.platformFee}`,
    };
  }
}
