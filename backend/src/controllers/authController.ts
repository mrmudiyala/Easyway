import { Request, Response } from 'express';
import { z } from 'zod';
import { env } from '../config/env.js';
import { SpatialRepository } from '../db/spatialRepo.js';
import { signToken } from '../middlewares/authMiddleware.js';

const requestOtpSchema = z.object({
  phone: z.string().min(10).max(15),
  role: z.enum(['RIDER', 'DRIVER', 'BOTH']).default('RIDER'),
});

const verifyOtpSchema = z.object({
  phone: z.string().min(10).max(15),
  otp: z.string().length(6),
  name: z.string().optional(),
  role: z.enum(['RIDER', 'DRIVER', 'BOTH']).default('RIDER'),
});

export class AuthController {
  static async requestOtp(req: Request, res: Response) {
    const parseResult = requestOtpSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: 'Invalid phone number format', details: parseResult.error.errors });
    }

    const { phone } = parseResult.data;
    const testOtp = env.TEST_OTP; // 123456

    console.log(`[Auth] OTP requested for ${phone}. Dev Test OTP is: ${testOtp}`);

    return res.json({
      success: true,
      message: 'OTP sent successfully',
      phone,
      // We expose devOtp in development so testing is effortless
      devOtp: env.NODE_ENV === 'development' ? testOtp : undefined,
    });
  }

  static async verifyOtp(req: Request, res: Response) {
    const parseResult = verifyOtpSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: 'Invalid verification payload', details: parseResult.error.errors });
    }

    const { phone, otp, name, role } = parseResult.data;

    // Verify OTP against test OTP
    if (otp !== env.TEST_OTP) {
      return res.status(400).json({ error: 'Invalid OTP. For development, use 123456' });
    }

    const user = await SpatialRepository.findOrCreateUser(phone, role, name || 'EasyWay User');
    const token = signToken({
      userId: user.id,
      phone: user.phone,
      role: user.role,
    });

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        role: user.role,
        rating: user.rating,
      },
    });
  }

  static async getMe(req: Request, res: Response) {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await SpatialRepository.getUserById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        role: user.role,
        rating: user.rating,
      },
    });
  }
}
