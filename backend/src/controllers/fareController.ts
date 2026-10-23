import { Request, Response } from 'express';
import { z } from 'zod';
import { FareService } from '../services/fareService.js';

const fareQuerySchema = z.object({
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
});

export class FareController {
  static async calculate(req: Request, res: Response) {
    const parseResult = fareQuerySchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Invalid pickup or drop coordinates',
        details: parseResult.error.errors,
      });
    }

    const { pickup, drop } = parseResult.data;
    try {
      const result = FareService.calculateFares(pickup, drop);
      return res.json({
        success: true,
        data: result,
      });
    } catch (err: any) {
      return res.status(500).json({
        error: 'Failed to calculate fares',
        message: err.message,
      });
    }
  }
}
