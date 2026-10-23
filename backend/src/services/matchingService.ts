import { SpatialRepository, DriverRecord } from '../db/spatialRepo.js';
import { broadcastToRide, sendToDriver } from '../sockets/socketServer.js';
import { RideStatus, VehicleType } from '../types/contracts.js';

interface PendingDispatch {
  rideId: string;
  driverId: string;
  resolve: (accepted: boolean) => void;
  timer: NodeJS.Timeout;
}

export class MatchingService {
  private static activeDispatches = new Map<string, PendingDispatch>(); // key: `${rideId}:${driverId}`

  /**
   * Start sequential 15-second matching ring for a ride
   */
  static async startMatching(rideId: string) {
    const ride = await SpatialRepository.getRideById(rideId);
    if (!ride) return;

    console.log(`[Matching] Starting search for ride ${rideId} (${ride.vehicle_type})...`);
    await SpatialRepository.updateRideStatus(rideId, RideStatus.MATCHING);
    broadcastToRide(rideId, 'ride:status_update', {
      rideId,
      status: RideStatus.MATCHING,
    });

    // 1. Find nearest online available drivers (within 5 km radius, up to 5 drivers)
    const drivers = await SpatialRepository.findNearestDrivers(
      ride.pickup_lat,
      ride.pickup_lng,
      ride.vehicle_type,
      5000,
      5
    );

    if (drivers.length === 0) {
      console.log(`[Matching] No nearby drivers available for ride ${rideId}`);
      await SpatialRepository.updateRideStatus(rideId, RideStatus.CANCELLED);
      broadcastToRide(rideId, 'ride:no_drivers_available', {
        rideId,
        message: 'No drivers available in your area. Please try again shortly.',
      });
      return;
    }

    console.log(`[Matching] Found ${drivers.length} candidate drivers nearby for ride ${rideId}`);

    // 2. Sequential 15-second offer loop
    for (let i = 0; i < drivers.length; i++) {
      const candidate = drivers[i];

      // Verify ride hasn't been cancelled by rider while searching
      const currentRideState = await SpatialRepository.getRideById(rideId);
      if (currentRideState?.status === RideStatus.CANCELLED) {
        console.log(`[Matching] Ride ${rideId} was cancelled by user. Halting dispatch.`);
        return;
      }

      console.log(`[Matching] Offering ride ${rideId} to Captain #${i + 1}: ${candidate.name} (${candidate.phone}) - Distance: ${candidate.distance_meters}m`);

      const accepted = await this.offerToDriverWithTimeout(rideId, candidate, 15);

      if (accepted) {
        console.log(`[Matching] ✅ Captain ${candidate.name} ACCEPTED ride ${rideId}!`);
        await SpatialRepository.updateRideStatus(rideId, RideStatus.DRIVER_ASSIGNED, candidate.user_id);
        await SpatialRepository.setDriverBusyStatus(candidate.user_id, true);

        // Notify rider and active ride room
        broadcastToRide(rideId, 'ride:status_update', {
          rideId,
          status: RideStatus.DRIVER_ASSIGNED,
          driver: {
            id: candidate.user_id,
            name: candidate.name,
            phone: candidate.phone,
            vehicle_type: candidate.vehicle_type,
            vehicle_number: candidate.vehicle_number,
            rating: candidate.rating,
            lat: candidate.lat,
            lng: candidate.lng,
            heading: candidate.heading,
          },
        });
        return; // Ride assigned successfully!
      } else {
        console.log(`[Matching] ⏳ Captain ${candidate.name} declined or timed out (15s). Trying next nearest driver...`);
      }
    }

    // 3. All 5 candidates rejected or timed out
    console.log(`[Matching] All candidate drivers exhausted for ride ${rideId}`);
    await SpatialRepository.updateRideStatus(rideId, RideStatus.CANCELLED);
    broadcastToRide(rideId, 'ride:no_drivers_available', {
      rideId,
      message: 'All nearby captains are currently busy. Please try again in a moment.',
    });
  }

  /**
   * Offers ride to a single driver and waits up to timeoutSeconds
   */
  private static offerToDriverWithTimeout(
    rideId: string,
    driver: DriverRecord,
    timeoutSeconds: number
  ): Promise<boolean> {
    return new Promise((resolve) => {
      const dispatchKey = `${rideId}:${driver.user_id}`;

      // 15-second timeout
      const timer = setTimeout(() => {
        if (this.activeDispatches.has(dispatchKey)) {
          this.activeDispatches.delete(dispatchKey);
          resolve(false);
        }
      }, timeoutSeconds * 1000);

      this.activeDispatches.set(dispatchKey, {
        rideId,
        driverId: driver.user_id,
        resolve,
        timer,
      });

      // Emit private dispatch offer to driver's personal room
      sendToDriver(driver.user_id, 'ride:dispatch_offer', {
        rideId,
        vehicleType: driver.vehicle_type,
        pickupLat: driver.lat, // For distance preview
        pickupLng: driver.lng,
        expiresInSeconds: timeoutSeconds,
      });
    });
  }

  /**
   * Called when driver responds (accept or decline) via socket or REST
   */
  static handleDriverResponse(rideId: string, driverId: string, accept: boolean) {
    const dispatchKey = `${rideId}:${driverId}`;
    const pending = this.activeDispatches.get(dispatchKey);

    if (pending) {
      clearTimeout(pending.timer);
      this.activeDispatches.delete(dispatchKey);
      pending.resolve(accept);
    }
  }
}
