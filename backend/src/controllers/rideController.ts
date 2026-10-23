import { Request, Response } from 'express';
import { z } from 'zod';
import { SpatialRepository } from '../db/spatialRepo.js';
import { FareService } from '../services/fareService.js';
import { MatchingService } from '../services/matchingService.js';
import { broadcastToRide } from '../sockets/socketServer.js';
import { RideStatus, VehicleType } from '../types/contracts.js';

const requestRideSchema = z.object({
  vehicleType: z.enum(['BIKE', 'AUTO', 'CAB']),
  pickup: z.object({
    lat: z.number(),
    lng: z.number(),
    address: z.string().optional(),
  }),
  drop: z.object({
    lat: z.number(),
    lng: z.number(),
    address: z.string().optional(),
  }),
  lockedFare: z.number().positive(),
  paymentMode: z.enum(['CASH', 'UPI']).default('CASH'),
});

export class RideController {
  static async requestRide(req: Request, res: Response) {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const parseResult = requestRideSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: 'Invalid ride request payload', details: parseResult.error.errors });
    }

    const { vehicleType, pickup, drop, lockedFare, paymentMode } = parseResult.data;

    // 1. Calculate canonical metrics
    const { canonicalDistanceKm, canonicalDurationMins } = FareService.getCanonicalMetrics(pickup, drop);

    // 2. Generate 4-digit Start OTP
    const rideOtp = String(Math.floor(1000 + Math.random() * 9000));

    // 3. Persist ride
    const ride = await SpatialRepository.createRide({
      riderId: req.user.userId,
      vehicleType: vehicleType as VehicleType,
      pickup,
      drop,
      canonicalDistanceKm,
      canonicalDurationMins,
      lockedFare,
      otp: rideOtp,
      paymentMode,
    });

    console.log(`[Ride] New ride requested: ${ride.id} (${vehicleType}, ₹${lockedFare}, OTP: ${rideOtp})`);

    // 4. Asynchronously launch matching ring
    setImmediate(() => {
      MatchingService.startMatching(ride.id);
    });

    return res.json({
      success: true,
      data: ride,
    });
  }

  static async getRide(req: Request, res: Response) {
    const { rideId } = req.params;
    const ride = await SpatialRepository.getRideById(rideId);
    if (!ride) return res.status(404).json({ error: 'Ride not found' });

    let driver = null;
    if (ride.driver_id) {
      const driverUser = await SpatialRepository.getUserById(ride.driver_id);
      // Fetch current driver location from nearest query or profile
      const onlineDrivers = await SpatialRepository.findNearestDrivers(ride.pickup_lat, ride.pickup_lng, ride.vehicle_type, 10000, 10);
      const activeDriver = onlineDrivers.find(d => d.user_id === ride.driver_id);

      driver = {
        id: ride.driver_id,
        name: driverUser?.name || 'Captain',
        phone: driverUser?.phone || '',
        vehicle_type: ride.vehicle_type,
        vehicle_number: activeDriver?.vehicle_number || 'KA-01-AB-1234',
        rating: driverUser?.rating || 4.9,
        lat: activeDriver?.lat || ride.pickup_lat,
        lng: activeDriver?.lng || ride.pickup_lng,
        heading: activeDriver?.heading || 0,
      };
    }

    return res.json({
      success: true,
      data: {
        ...ride,
        driver,
      },
    });
  }

  static async acceptRide(req: Request, res: Response) {
    const { rideId } = req.params;
    const driverId = req.user?.userId || req.body.driverId || '00000000-0000-0000-0000-000000000002';

    const ride = await SpatialRepository.getRideById(rideId);
    if (!ride) return res.status(404).json({ error: 'Ride not found' });

    await SpatialRepository.updateRideStatus(rideId, RideStatus.DRIVER_ASSIGNED, driverId);
    await SpatialRepository.setDriverBusyStatus(driverId, true);

    const driverUser = await SpatialRepository.getUserById(driverId);
    const driverPayload = {
      id: driverId,
      name: driverUser?.name || 'Captain Ramesh',
      phone: driverUser?.phone || '9876543211',
      vehicle_type: ride.vehicle_type,
      vehicle_number: 'KA-01-AB-1234',
      rating: driverUser?.rating || 4.9,
    };

    broadcastToRide(rideId, 'ride:status_update', {
      rideId,
      status: 'ACCEPTED',
      driver: driverPayload,
      lockPolicyActive: true,
      message: 'Driver has accepted your ride. Rider is now locked in per anti-cancellation policy.',
    });

    return res.json({
      success: true,
      status: 'ACCEPTED',
      driver: driverPayload,
      lockPolicy: 'Rides cannot be cancelled once accepted by a driver.',
    });
  }

  static async startTripWithOtp(req: Request, res: Response) {
    const { rideId } = req.params;
    const { otp } = req.body;

    if (!otp) {
      return res.status(400).json({ error: 'Start Trip 4-digit OTP is required' });
    }

    try {
      const updatedRide = await SpatialRepository.startRideWithOtp(rideId, String(otp).trim());

      broadcastToRide(rideId, 'ride:status_update', {
        rideId,
        status: RideStatus.IN_PROGRESS,
        startedAt: new Date().toISOString(),
        message: 'Trip started! Heading towards destination.',
      });

      return res.json({
        success: true,
        status: RideStatus.IN_PROGRESS,
        ride: updatedRide,
      });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  static async completeTrip(req: Request, res: Response) {
    const { rideId } = req.params;
    const { paymentMode = 'CASH' } = req.body; // 'CASH' | 'ONLINE' | 'UPI'

    try {
      const completedRide = await SpatialRepository.completeRide(rideId, paymentMode);

      broadcastToRide(rideId, 'ride:status_update', {
        rideId,
        status: RideStatus.COMPLETED,
        paymentStatus: 'PAID',
        paymentMode,
        totalFare: completedRide.locked_fare,
        completedAt: new Date().toISOString(),
        message: `Ride completed! Payment of ₹${completedRide.locked_fare} received via ${paymentMode}.`,
      });

      return res.json({
        success: true,
        status: RideStatus.COMPLETED,
        paymentStatus: 'PAID',
        paymentMode,
        totalFare: completedRide.locked_fare,
        ride: completedRide,
      });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  static async cancelRide(req: Request, res: Response) {
    const { rideId } = req.params;
    const reason = req.body.reason || 'Cancelled by user';

    const ride = await SpatialRepository.getRideById(rideId);
    if (!ride) return res.status(404).json({ error: 'Ride not found' });

    // Anti-cancellation database trigger / enforcement check
    if (ride.status === RideStatus.DRIVER_ASSIGNED || ride.status === RideStatus.IN_PROGRESS || (ride.status as any) === 'ACCEPTED') {
      return res.status(400).json({
        error: 'Anti-Cancellation Lock Active: Rides cannot be cancelled once accepted by a driver.',
      });
    }

    await SpatialRepository.cancelRide(rideId, reason);

    if (ride.driver_id) {
      await SpatialRepository.setDriverBusyStatus(ride.driver_id, false);
    }

    broadcastToRide(rideId, 'ride:status_update', {
      rideId,
      status: RideStatus.CANCELLED,
      reason,
    });

    return res.json({ success: true, message: 'Ride cancelled successfully' });
  }
}
