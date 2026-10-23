import { test, describe } from 'node:test';
import assert from 'node:assert';
import { FareService } from '../src/services/fareService.js';
import { LocationPoint } from '../src/types/contracts.js';

describe('Feature 4: Same Fixed Symmetrical Fare (A->B == B->A)', () => {
  test('Fare calculation is identical when origin and destination are swapped (100 random pairs)', () => {
    // Generate 100 random pairs around a metropolitan area (lat: 12.8 - 13.2, lng: 77.4 - 77.8)
    for (let i = 0; i < 100; i++) {
      const pointA: LocationPoint = {
        lat: 12.8 + Math.random() * 0.4,
        lng: 77.4 + Math.random() * 0.4,
      };

      const pointB: LocationPoint = {
        lat: 12.8 + Math.random() * 0.4,
        lng: 77.4 + Math.random() * 0.4,
      };

      const fareForward = FareService.calculateFares(pointA, pointB);
      const fareReverse = FareService.calculateFares(pointB, pointA);

      // Verify canonical distance is identical
      assert.strictEqual(
        fareForward.canonicalDistanceKm,
        fareReverse.canonicalDistanceKm,
        `Distance mismatch for iteration ${i}`
      );

      // Verify canonical duration is identical
      assert.strictEqual(
        fareForward.canonicalDurationMins,
        fareReverse.canonicalDurationMins,
        `Duration mismatch for iteration ${i}`
      );

      // Verify each vehicle type's total fare is strictly identical
      for (let v = 0; v < fareForward.fares.length; v++) {
        const vForward = fareForward.fares[v];
        const vReverse = fareReverse.fares[v];

        assert.strictEqual(
          vForward.totalFare,
          vReverse.totalFare,
          `Fare mismatch for ${vForward.vehicleType} on pair iteration ${i}`
        );
        assert.strictEqual(vForward.vehicleType, vReverse.vehicleType);
        assert.strictEqual(vForward.distanceFare, vReverse.distanceFare);
        assert.strictEqual(vForward.timeFare, vReverse.timeFare);
      }
    }
    console.log('✅ 100 random coordinate pairs verified: fare(A->B) === fare(B->A) holds strictly!');
  });

  test('Minimum fare floor is respected', () => {
    // Two points very close to each other (e.g. 50 meters)
    const p1: LocationPoint = { lat: 12.9716, lng: 77.5946 };
    const p2: LocationPoint = { lat: 12.9717, lng: 77.5947 };

    const result = FareService.calculateFares(p1, p2);
    const bike = result.fares.find((f) => f.vehicleType === 'BIKE')!;
    const auto = result.fares.find((f) => f.vehicleType === 'AUTO')!;
    const cab = result.fares.find((f) => f.vehicleType === 'CAB')!;

    assert.ok(bike.totalFare >= 30, 'Bike minimum fare of ₹30 violated');
    assert.ok(auto.totalFare >= 45, 'Auto minimum fare of ₹45 violated');
    assert.ok(cab.totalFare >= 80, 'Cab minimum fare of ₹80 violated');
  });

  test('Fares round to the nearest whole rupee', () => {
    const p1: LocationPoint = { lat: 12.9716, lng: 77.5946 };
    const p2: LocationPoint = { lat: 12.9352, lng: 77.6245 };

    const result = FareService.calculateFares(p1, p2);
    result.fares.forEach((f) => {
      assert.strictEqual(Number.isInteger(f.totalFare), true, `${f.vehicleType} fare is not an integer: ${f.totalFare}`);
    });
  });
});

describe('Pipeline Voice & Fare Engine Components', () => {
  test('FareEngine calculates deterministic two-wheeler and four-wheeler fares', async () => {
    const { FareEngine } = await import('../src/services/fareEngine.js');
    const fare2W = FareEngine.calculateSymmetricalFare(10, 20, 'two_wheeler');
    // Base 25 + (10 * 9) + (20 * 1) + 5 = 25 + 90 + 20 + 5 = 140
    assert.strictEqual(fare2W.totalFare, 140);
    assert.strictEqual(fare2W.baseFare, 25);
    assert.strictEqual(fare2W.distanceFare, 90);
    assert.strictEqual(fare2W.timeFare, 20);

    const fare4W = FareEngine.calculateSymmetricalFare(10, 20, 'four_wheeler');
    // Base 50 + (10 * 16) + (20 * 2) + 10 = 50 + 160 + 40 + 10 = 260
    assert.strictEqual(fare4W.totalFare, 260);
  });

  test('VoiceService extracts landmarks from natural language queries', async () => {
    const { VoiceService } = await import('../src/services/voiceService.js');
    const res = await VoiceService.parseVoiceBooking('Take me from Benz Circle to Mindspace Building 3');
    assert.strictEqual(res.rawEntities.pickupLandmark, 'Benz Circle');
    assert.strictEqual(res.rawEntities.destinationLandmark, 'Mindspace Building 3');
    assert.ok(res.pickup.lat != null && res.pickup.lng != null);
    assert.ok(res.dropoff.lat != null && res.dropoff.lng != null);
  });
});
