// Shared data contracts and enums for RideGo

export type UserRole = 'RIDER' | 'DRIVER' | 'BOTH';

export type VehicleType = 'BIKE' | 'AUTO' | 'CAB';

export enum RideStatus {
  REQUESTED = 'REQUESTED',
  MATCHING = 'MATCHING',
  DRIVER_ASSIGNED = 'DRIVER_ASSIGNED',
  DRIVER_ARRIVING = 'DRIVER_ARRIVING',
  ARRIVED_PICKUP = 'ARRIVED_PICKUP',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export type PaymentMode = 'CASH' | 'UPI' | 'ONLINE';
export type PaymentStatus = 'PENDING' | 'PAID';

export interface LocationPoint {
  lat: number;
  lng: number;
  address?: string;
  heading?: number;
}

export interface UserProfile {
  id: string;
  phone: string;
  name: string;
  role: UserRole;
  rating: number;
  createdAt: string;
}

export interface DriverProfile {
  id: string;
  userId: string;
  vehicleType: VehicleType;
  vehicleNumber: string;
  isOnline: boolean;
  isBusy: boolean;
  currentLocation?: LocationPoint;
  rating: number;
}

export interface FareBreakdown {
  vehicleType: VehicleType;
  displayName: string;
  baseFare: number;
  distanceKm: number;
  durationMins: number;
  distanceFare: number;
  timeFare: number;
  totalFare: number; // Rounded to nearest rupee
  currency: string;
  canonicalDistanceKm: number;
  canonicalDurationMins: number;
}

export interface RideRequestPayload {
  riderId: string;
  vehicleType: VehicleType;
  pickup: LocationPoint;
  drop: LocationPoint;
  lockedFare: number;
  paymentMode: PaymentMode;
}

export interface RideDispatchOffer {
  rideId: string;
  vehicleType: VehicleType;
  pickup: LocationPoint;
  drop: LocationPoint;
  fare: number;
  expiresInSeconds: number;
  canonicalDistanceKm: number;
}
