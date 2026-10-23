import { Request, Response } from 'express';
import { VoiceService } from '../services/voiceService.js';
import { RouteService } from '../services/routeService.js';
import { FareEngine } from '../services/fareEngine.js';
import { SpatialRepository } from '../db/spatialRepo.js';
import { MatchingService } from '../services/matchingService.js';
import { VehicleType } from '../types/contracts.js';

export class RidePipelineController {
  /**
   * Full End-to-End Voice Ride Booking Pipeline
   * 1. AI Voice Extraction & Biased Geocoding
   * 2. Vehicle-Aware Navigation Routing (Two-Wheeler vs Four-Wheeler)
   * 3. Deterministic Symmetrical Fare Calculation
   * 4. Persist in PostGIS DB with status 'REQUESTED'
   * 5. Dispatch to Nearby Drivers via Socket.io
   */
  static async processVoiceRideBooking(req: Request, res: Response) {
    try {
      const { speechText, userLat, userLng, vehicleType = 'two_wheeler', userId } = req.body;

      if (!speechText) {
        return res.status(400).json({
          success: false,
          error: 'speechText is required for voice booking pipeline',
        });
      }

      const activeUserId = userId || (req as any).user?.userId || '00000000-0000-0000-0000-000000000001';
      const parsedLat = typeof userLat === 'number' ? userLat : 16.5062;
      const parsedLng = typeof userLng === 'number' ? userLng : 80.6480;

      // Step 1: AI Voice Extraction & Geocoding
      const locations = await VoiceService.parseVoiceBooking(speechText, parsedLat, parsedLng);

      // Step 2: Vehicle-Aware Navigation Routing
      const routes = await RouteService.getAnalyzedRoutes(locations.pickup, locations.dropoff);
      const chosenRoute = routes[0] || {
        distanceMeters: 4800,
        durationSeconds: 720,
        polyline: '',
        coordinates: [
          [locations.pickup.lng, locations.pickup.lat],
          [locations.dropoff.lng, locations.dropoff.lat],
        ],
      };

      const distanceKm = parseFloat((chosenRoute.distanceMeters / 1000).toFixed(2));
      const durationMins = Math.ceil(chosenRoute.durationSeconds / 60);

      // Map vehicle type to standard enum
      let standardVehicle: VehicleType = 'BIKE';
      if (vehicleType === 'four_wheeler' || vehicleType === 'CAB') {
        standardVehicle = 'CAB';
      } else if (vehicleType === 'AUTO') {
        standardVehicle = 'AUTO';
      }

      // Step 3: Symmetrical Fare Calculation
      const fareDetails = FareEngine.calculateSymmetricalFare(distanceKm, durationMins, vehicleType);

      // Step 4: Persist Ride Request in Database
      const rideOtp = String(Math.floor(1000 + Math.random() * 9000));
      const ride = await SpatialRepository.createRide({
        riderId: activeUserId,
        vehicleType: standardVehicle,
        pickup: locations.pickup,
        drop: locations.dropoff,
        canonicalDistanceKm: distanceKm,
        canonicalDurationMins: durationMins,
        lockedFare: fareDetails.totalFare,
        otp: rideOtp,
        paymentMode: 'CASH',
      });

      console.log(
        `[Voice Pipeline] Ride ${ride.id} booked from "${locations.pickup.address}" to "${locations.dropoff.address}" | Fare: ₹${fareDetails.totalFare}`
      );

      // Step 5: Asynchronously Trigger Socket.io Driver Dispatch Ring
      setImmediate(() => {
        MatchingService.startMatching(ride.id);
      });

      // Step 6: Return Payload to Client
      return res.status(200).json({
        success: true,
        rideId: ride.id,
        status: ride.status,
        otp: rideOtp,
        extractedLandmarks: locations.rawEntities,
        pickup: locations.pickup,
        dropoff: locations.dropoff,
        route: {
          distanceKm,
          durationMins,
          polyline: (chosenRoute as any).polylinePoints || (chosenRoute as any).polyline || '',
          trafficLevel: (chosenRoute as any).trafficConditions || 'LOW',
        },
        fare: fareDetails,
        lockPolicy: 'Rides cannot be cancelled once accepted by a driver (anti-cancellation lock active).',
      });
    } catch (error: any) {
      console.error('[Voice Pipeline Error]:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to process voice ride booking',
      });
    }
  }
}
