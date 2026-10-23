import { env } from '../../config/env.js';
import { IMapService } from './IMapService.js';
import { GoogleMapService } from './googleMaps.js';
import { MockMapService } from './mockMaps.js';

let mapServiceInstance: IMapService | null = null;

export function getMapService(): IMapService {
  if (!mapServiceInstance) {
    if (env.MAP_PROVIDER === 'google' && env.GOOGLE_MAPS_API_KEY) {
      console.log('[MapService] Initialized Google Maps Platform provider');
      mapServiceInstance = new GoogleMapService(env.GOOGLE_MAPS_API_KEY);
    } else {
      console.log('[MapService] Initialized Offline/Mock Maps provider (Zero API key needed)');
      mapServiceInstance = new MockMapService();
    }
  }
  return mapServiceInstance;
}
