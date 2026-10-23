import { Request, Response } from 'express';
import { getMapService } from '../services/map/mapFactory.js';

export class MapController {
  static async reverseGeocode(req: Request, res: Response) {
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ error: 'Valid lat and lng query parameters are required' });
    }

    try {
      const mapService = getMapService();
      const result = await mapService.reverseGeocode(lat, lng);
      return res.json({ success: true, data: result });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to reverse geocode', message: err.message });
    }
  }

  static async placesAutocomplete(req: Request, res: Response) {
    const query = req.query.query as string;
    if (!query) {
      return res.json({ success: true, data: [] });
    }

    const lat = req.query.lat ? parseFloat(req.query.lat as string) : undefined;
    const lng = req.query.lng ? parseFloat(req.query.lng as string) : undefined;
    const proximity = lat && lng && !isNaN(lat) && !isNaN(lng) ? { lat, lng } : undefined;

    try {
      const mapService = getMapService();
      const suggestions = await mapService.placesAutocomplete(query, proximity);
      return res.json({ success: true, data: suggestions });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to autocomplete places', message: err.message });
    }
  }

  static async getPlaceDetails(req: Request, res: Response) {
    const { placeId } = req.params;
    if (!placeId) {
      return res.status(400).json({ error: 'placeId is required' });
    }

    try {
      const mapService = getMapService();
      const details = await mapService.getPlaceDetails(placeId);
      return res.json({ success: true, data: details });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to get place details', message: err.message });
    }
  }

  static async getRoutes(req: Request, res: Response) {
    const { origin, destination } = req.body;
    if (!origin || !destination || origin.lat === undefined || destination.lat === undefined) {
      return res.status(400).json({ error: 'origin and destination with lat and lng are required' });
    }

    try {
      const { RouteService } = await import('../services/routeService.js');
      const routes = await RouteService.getAnalyzedRoutes(origin, destination);
      return res.json({ success: true, data: routes });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to compute routes', message: err.message });
    }
  }
}
