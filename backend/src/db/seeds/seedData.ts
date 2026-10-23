import { SpatialRepository } from '../spatialRepo.js';

export async function seedInitialData() {
  console.log('[Seed] Seeding initial test riders and captains...');

  // 1. Rider
  const rider = await SpatialRepository.findOrCreateUser('8520079100', 'RIDER', 'Harsha Reddy');

  // 2. Bike Captain (MG Road, Bangalore: 12.9750, 77.6090)
  const bikeUser = await SpatialRepository.findOrCreateUser('9876543211', 'DRIVER', 'Ramesh Kumar (Bike)');
  await SpatialRepository.registerDriverProfile(bikeUser.id, 'BIKE', 'KA-01-AB-1234', {
    lat: 12.975,
    lng: 77.609,
    heading: 90,
  });

  // 3. Auto Captain (Indiranagar, Bangalore: 12.9784, 77.6408)
  const autoUser = await SpatialRepository.findOrCreateUser('9876543212', 'DRIVER', 'Suresh Gowda (Auto)');
  await SpatialRepository.registerDriverProfile(autoUser.id, 'AUTO', 'KA-03-TR-5678', {
    lat: 12.9784,
    lng: 77.6408,
    heading: 180,
  });

  // 4. Cab Captain (Koramangala, Bangalore: 12.9352, 77.6245)
  const cabUser = await SpatialRepository.findOrCreateUser('9876543213', 'DRIVER', 'Vikram Singh (Cab)');
  await SpatialRepository.registerDriverProfile(cabUser.id, 'CAB', 'KA-05-MN-9999', {
    lat: 12.9352,
    lng: 77.6245,
    heading: 270,
  });

  console.log('[Seed] Seed complete! Test users ready:');
  console.log(' - Rider: Phone 9876543210 (Rahul)');
  console.log(' - Bike Captain: Phone 9876543211 (Ramesh)');
  console.log(' - Auto Captain: Phone 9876543212 (Suresh)');
  console.log(' - Cab Captain: Phone 9876543213 (Vikram)');
  console.log(' - Dev OTP: 123456');
}
