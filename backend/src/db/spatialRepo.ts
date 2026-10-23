import { pool, isPostgisConnected } from '../config/db.js';
import { LocationPoint, VehicleType, RideStatus, UserRole } from '../types/contracts.js';

export interface UserRecord {
  id: string;
  phone: string;
  name: string;
  role: UserRole;
  rating: number;
  created_at: Date;
}

export interface DriverRecord {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  vehicle_type: VehicleType;
  vehicle_number: string;
  is_online: boolean;
  is_busy: boolean;
  lat: number;
  lng: number;
  heading: number;
  rating: number;
  distance_meters?: number;
}

export interface RideRecord {
  id: string;
  rider_id: string;
  driver_id: string | null;
  vehicle_type: VehicleType;
  status: RideStatus;
  pickup_lat: number;
  pickup_lng: number;
  pickup_address: string;
  drop_lat: number;
  drop_lng: number;
  drop_address: string;
  canonical_distance_km: number;
  canonical_duration_mins: number;
  locked_fare: number;
  ride_otp: string;
  payment_mode: 'CASH' | 'UPI' | 'ONLINE';
  payment_status: 'PENDING' | 'PAID';
  cancellation_reason?: string | null;
  created_at: Date;
}

// In-Memory store for when PostgreSQL is not running
const memUsers = new Map<string, UserRecord>();
const memDrivers = new Map<string, DriverRecord>();
const memRides = new Map<string, RideRecord>();

// Haversine distance calculator for spherical distance (meters)
export function haversineDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export class SpatialRepository {
  // --- USERS ---
  static async findOrCreateUser(phone: string, role: UserRole = 'RIDER', name = 'EasyWay User'): Promise<UserRecord> {
    if (isPostgisConnected && pool) {
      const existing = await pool.query('SELECT * FROM users WHERE phone = $1', [phone]);
      if (existing.rows.length > 0) return existing.rows[0];

      const created = await pool.query(
        'INSERT INTO users (phone, name, role) VALUES ($1, $2, $3) RETURNING *',
        [phone, name, role]
      );
      return created.rows[0];
    } else {
      // Memory fallback
      for (const u of memUsers.values()) {
        if (u.phone === phone) return u;
      }
      const newUser: UserRecord = {
        id: `usr_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        phone,
        name,
        role,
        rating: 5.0,
        created_at: new Date(),
      };
      memUsers.set(newUser.id, newUser);
      return newUser;
    }
  }

  static async getUserById(userId: string): Promise<UserRecord | null> {
    if (isPostgisConnected && pool) {
      const res = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
      return res.rows[0] || null;
    }
    return memUsers.get(userId) || null;
  }

  // --- DRIVERS ---
  static async registerDriverProfile(
    userId: string,
    vehicleType: VehicleType,
    vehicleNumber: string,
    initialLoc: LocationPoint
  ): Promise<DriverRecord> {
    if (isPostgisConnected && pool) {
      const query = `
        INSERT INTO driver_profiles (user_id, vehicle_type, vehicle_number, is_online, current_location, heading)
        VALUES ($1, $2, $3, true, ST_SetSRID(ST_MakePoint($4, $5), 4326), $6)
        ON CONFLICT (user_id) DO UPDATE 
        SET vehicle_type = EXCLUDED.vehicle_type,
            vehicle_number = EXCLUDED.vehicle_number,
            current_location = EXCLUDED.current_location,
            heading = EXCLUDED.heading,
            is_online = true
        RETURNING *;
      `;
      const res = await pool.query(query, [
        userId,
        vehicleType,
        vehicleNumber,
        initialLoc.lng,
        initialLoc.lat,
        initialLoc.heading || 0,
      ]);
      const user = await this.getUserById(userId);
      return {
        id: res.rows[0].id,
        user_id: userId,
        name: user?.name || 'Driver',
        phone: user?.phone || '',
        vehicle_type: vehicleType,
        vehicle_number: vehicleNumber,
        is_online: true,
        is_busy: false,
        lat: initialLoc.lat,
        lng: initialLoc.lng,
        heading: initialLoc.heading || 0,
        rating: 4.9,
      };
    } else {
      const user = await this.getUserById(userId);
      const driver: DriverRecord = {
        id: `drv_${userId}`,
        user_id: userId,
        name: user?.name || 'Driver',
        phone: user?.phone || '',
        vehicle_type: vehicleType,
        vehicle_number: vehicleNumber,
        is_online: true,
        is_busy: false,
        lat: initialLoc.lat,
        lng: initialLoc.lng,
        heading: initialLoc.heading || 0,
        rating: 4.9,
      };
      memDrivers.set(driver.user_id, driver);
      return driver;
    }
  }

  static async updateDriverLocation(
    userId: string,
    loc: LocationPoint
  ): Promise<void> {
    if (isPostgisConnected && pool) {
      await pool.query(
        `UPDATE driver_profiles 
         SET current_location = ST_SetSRID(ST_MakePoint($1, $2), 4326),
             heading = $3,
             last_location_update = NOW()
         WHERE user_id = $4`,
        [loc.lng, loc.lat, loc.heading || 0, userId]
      );
    } else {
      const driver = memDrivers.get(userId);
      if (driver) {
        driver.lat = loc.lat;
        driver.lng = loc.lng;
        driver.heading = loc.heading || 0;
      }
    }
  }

  static async setDriverOnlineStatus(userId: string, isOnline: boolean): Promise<void> {
    if (isPostgisConnected && pool) {
      await pool.query('UPDATE driver_profiles SET is_online = $1 WHERE user_id = $2', [isOnline, userId]);
    } else {
      const driver = memDrivers.get(userId);
      if (driver) driver.is_online = isOnline;
    }
  }

  static async setDriverBusyStatus(userId: string, isBusy: boolean): Promise<void> {
    if (isPostgisConnected && pool) {
      await pool.query('UPDATE driver_profiles SET is_busy = $1 WHERE user_id = $2', [isBusy, userId]);
    } else {
      const driver = memDrivers.get(userId);
      if (driver) driver.is_busy = isBusy;
    }
  }

  /**
   * PostGIS Radial Nearest-Driver Query:
   * Finds online, non-busy drivers matching the vehicle type within maxRadiusMeters,
   * sorted ascending by exact geodesic distance using ST_Distance.
   */
  static async findNearestDrivers(
    lat: number,
    lng: number,
    vehicleType: VehicleType,
    maxRadiusMeters = 5000,
    limit = 5
  ): Promise<DriverRecord[]> {
    if (isPostgisConnected && pool) {
      const query = `
        SELECT 
          dp.id,
          dp.user_id,
          u.name,
          u.phone,
          dp.vehicle_type,
          dp.vehicle_number,
          dp.is_online,
          dp.is_busy,
          ST_Y(dp.current_location::geometry) AS lat,
          ST_X(dp.current_location::geometry) AS lng,
          dp.heading,
          u.rating,
          ST_Distance(dp.current_location, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) AS distance_meters
        FROM driver_profiles dp
        JOIN users u ON u.id = dp.user_id
        WHERE dp.is_online = true 
          AND dp.is_busy = false
          AND dp.vehicle_type = $3
          AND ST_DWithin(dp.current_location, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $4)
        ORDER BY distance_meters ASC
        LIMIT $5;
      `;
      const res = await pool.query(query, [lng, lat, vehicleType, maxRadiusMeters, limit]);
      return res.rows;
    } else {
      // In-Memory Haversine evaluation
      const candidates: DriverRecord[] = [];
      for (const d of memDrivers.values()) {
        if (d.is_online && !d.is_busy && d.vehicle_type === vehicleType) {
          const dist = haversineDistanceMeters(lat, lng, d.lat, d.lng);
          if (dist <= maxRadiusMeters) {
            candidates.push({ ...d, distance_meters: Math.round(dist) });
          }
        }
      }
      candidates.sort((a, b) => (a.distance_meters || 0) - (b.distance_meters || 0));
      return candidates.slice(0, limit);
    }
  }

  // --- RIDES ---
  static async createRide(rideData: {
    riderId: string;
    vehicleType: VehicleType;
    pickup: LocationPoint;
    drop: LocationPoint;
    canonicalDistanceKm: number;
    canonicalDurationMins: number;
    lockedFare: number;
    otp: string;
    paymentMode: 'CASH' | 'UPI' | 'ONLINE';
  }): Promise<RideRecord> {
    const rideId = `ride_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    if (isPostgisConnected && pool) {
      const query = `
        INSERT INTO rides (
          rider_id, vehicle_type, status,
          pickup_location, pickup_address,
          drop_location, drop_address,
          canonical_distance_km, canonical_duration_mins,
          locked_fare, ride_otp, payment_mode
        ) VALUES (
          $1, $2, 'REQUESTED',
          ST_SetSRID(ST_MakePoint($3, $4), 4326), $5,
          ST_SetSRID(ST_MakePoint($6, $7), 4326), $8,
          $9, $10, $11, $12, $13
        ) RETURNING 
          id, rider_id, driver_id, vehicle_type, status,
          ST_Y(pickup_location::geometry) AS pickup_lat,
          ST_X(pickup_location::geometry) AS pickup_lng,
          pickup_address,
          ST_Y(drop_location::geometry) AS drop_lat,
          ST_X(drop_location::geometry) AS drop_lng,
          drop_address,
          canonical_distance_km, canonical_duration_mins,
          locked_fare, ride_otp, payment_mode, payment_status,
          created_at;
      `;
      const res = await pool.query(query, [
        rideData.riderId,
        rideData.vehicleType,
        rideData.pickup.lng,
        rideData.pickup.lat,
        rideData.pickup.address || 'Pickup Point',
        rideData.drop.lng,
        rideData.drop.lat,
        rideData.drop.address || 'Drop Point',
        rideData.canonicalDistanceKm,
        rideData.canonicalDurationMins,
        rideData.lockedFare,
        rideData.otp,
        rideData.paymentMode,
      ]);
      return res.rows[0];
    } else {
      const record: RideRecord = {
        id: rideId,
        rider_id: rideData.riderId,
        driver_id: null,
        vehicle_type: rideData.vehicleType,
        status: RideStatus.REQUESTED,
        pickup_lat: rideData.pickup.lat,
        pickup_lng: rideData.pickup.lng,
        pickup_address: rideData.pickup.address || 'Pickup Point',
        drop_lat: rideData.drop.lat,
        drop_lng: rideData.drop.lng,
        drop_address: rideData.drop.address || 'Drop Point',
        canonical_distance_km: rideData.canonicalDistanceKm,
        canonical_duration_mins: rideData.canonicalDurationMins,
        locked_fare: rideData.lockedFare,
        ride_otp: rideData.otp,
        payment_mode: rideData.paymentMode,
        payment_status: 'PENDING',
        cancellation_reason: null,
        created_at: new Date(),
      };
      memRides.set(rideId, record);
      return record;
    }
  }

  static async getRideById(rideId: string): Promise<RideRecord | null> {
    if (isPostgisConnected && pool) {
      const query = `
        SELECT 
          id, rider_id, driver_id, vehicle_type, status,
          ST_Y(pickup_location::geometry) AS pickup_lat,
          ST_X(pickup_location::geometry) AS pickup_lng,
          pickup_address,
          ST_Y(drop_location::geometry) AS drop_lat,
          ST_X(drop_location::geometry) AS drop_lng,
          drop_address,
          canonical_distance_km, canonical_duration_mins,
          locked_fare, ride_otp, payment_mode, payment_status,
          cancellation_reason, created_at
        FROM rides WHERE id = $1;
      `;
      const res = await pool.query(query, [rideId]);
      return res.rows[0] || null;
    }
    return memRides.get(rideId) || null;
  }

  static async updateRideStatus(
    rideId: string,
    status: RideStatus,
    driverId?: string | null
  ): Promise<void> {
    if (isPostgisConnected && pool) {
      if (driverId !== undefined) {
        await pool.query('UPDATE rides SET status = $1, driver_id = $2 WHERE id = $3', [status, driverId, rideId]);
      } else {
        await pool.query('UPDATE rides SET status = $1 WHERE id = $2', [status, rideId]);
      }
    } else {
      const r = memRides.get(rideId);
      if (r) {
        r.status = status;
        if (driverId !== undefined) r.driver_id = driverId;
      }
    }
  }

  static async startRideWithOtp(rideId: string, inputOtp: string): Promise<RideRecord> {
    const ride = await this.getRideById(rideId);
    if (!ride) throw new Error('Ride not found');

    if (ride.ride_otp !== inputOtp) {
      throw new Error(`Invalid Start Trip OTP "${inputOtp}". Please enter the 4-digit OTP shown on the rider app.`);
    }

    if (isPostgisConnected && pool) {
      const res = await pool.query(
        "UPDATE rides SET status = 'IN_PROGRESS', started_at = NOW() WHERE id = $1 RETURNING *",
        [rideId]
      );
      return res.rows[0];
    } else {
      const r = memRides.get(rideId);
      if (r) {
        r.status = RideStatus.IN_PROGRESS;
      }
      return r || ride;
    }
  }

  static async completeRide(
    rideId: string,
    paymentMode?: 'CASH' | 'UPI' | 'ONLINE'
  ): Promise<RideRecord> {
    const ride = await this.getRideById(rideId);
    if (!ride) throw new Error('Ride not found');

    const chosenMode = paymentMode || ride.payment_mode || 'CASH';

    if (isPostgisConnected && pool) {
      const res = await pool.query(
        "UPDATE rides SET status = 'COMPLETED', payment_status = 'PAID', payment_mode = $1, completed_at = NOW() WHERE id = $2 RETURNING *",
        [chosenMode, rideId]
      );
      if (ride.driver_id) {
        await this.setDriverBusyStatus(ride.driver_id, false);
      }
      return res.rows[0];
    } else {
      const r = memRides.get(rideId);
      if (r) {
        r.status = RideStatus.COMPLETED;
        r.payment_status = 'PAID';
        r.payment_mode = chosenMode;
      }
      if (ride.driver_id) {
        await this.setDriverBusyStatus(ride.driver_id, false);
      }
      return r || ride;
    }
  }

  static async cancelRide(rideId: string, reason: string): Promise<void> {
    if (isPostgisConnected && pool) {
      await pool.query('UPDATE rides SET status = $1, cancellation_reason = $2 WHERE id = $3', [
        RideStatus.CANCELLED,
        reason,
        rideId,
      ]);
    } else {
      const r = memRides.get(rideId);
      if (r) {
        r.status = RideStatus.CANCELLED;
        r.cancellation_reason = reason;
      }
    }
  }

  static async getAllDrivers(): Promise<DriverRecord[]> {
    if (isPostgisConnected && pool) {
      const res = await pool.query(`
        SELECT 
          dp.id, dp.user_id, u.name, u.phone, dp.vehicle_type, dp.vehicle_number,
          dp.is_online, dp.is_busy, ST_Y(dp.current_location::geometry) AS lat,
          ST_X(dp.current_location::geometry) AS lng, dp.heading, u.rating
        FROM driver_profiles dp
        JOIN users u ON u.id = dp.user_id
      `);
      return res.rows;
    } else {
      return Array.from(memDrivers.values());
    }
  }

  static async getAllRides(): Promise<RideRecord[]> {
    if (isPostgisConnected && pool) {
      const res = await pool.query(`SELECT * FROM rides ORDER BY created_at DESC LIMIT 50`);
      return res.rows;
    } else {
      return Array.from(memRides.values()).reverse();
    }
  }
}

