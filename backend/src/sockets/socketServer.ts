import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { verifyToken, AuthPayload } from '../middlewares/authMiddleware.js';
import { SpatialRepository } from '../db/spatialRepo.js';

interface AuthenticatedSocket extends Socket {
  user?: AuthPayload;
}

let ioInstance: Server | null = null;

export function initSocketServer(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  ioInstance = io;

  // Socket Authentication Middleware
  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
    if (!token) {
      console.warn(`[Socket] Unauthenticated client connection rejected: ${socket.id}`);
      return next(new Error('Authentication token required'));
    }

    const payload = verifyToken(token);
    if (!payload) {
      return next(new Error('Invalid token'));
    }

    socket.user = payload;
    next();
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    const user = socket.user!;
    console.log(`[Socket] Client connected: user=${user.phone} (${user.role}), socket=${socket.id}`);

    // If driver, join driver room for direct dispatch offers
    if (user.role === 'DRIVER' || user.role === 'BOTH') {
      socket.join(`driver:${user.userId}`);
      console.log(`[Socket] Driver joined private dispatch room: driver:${user.userId}`);
    }

    // Join ride room
    socket.on('ride:join', ({ rideId }: { rideId: string }) => {
      socket.join(`ride:${rideId}`);
      console.log(`[Socket] User ${user.phone} joined ride room: ride:${rideId}`);
    });

    // Leave ride room
    socket.on('ride:leave', ({ rideId }: { rideId: string }) => {
      socket.leave(`ride:${rideId}`);
    });

    // Driver live GPS ping (emitted every 3-5 seconds by Captain mobile app or simulator)
    socket.on('driver:update_location', async (data: { lat: number; lng: number; heading?: number; rideId?: string }) => {
      try {
        await SpatialRepository.updateDriverLocation(user.userId, {
          lat: data.lat,
          lng: data.lng,
          heading: data.heading || 0,
        });

        // If driver is in an active ride, broadcast smooth live movement to the rider
        if (data.rideId) {
          io.to(`ride:${data.rideId}`).emit('driver:location_changed', {
            driverId: user.userId,
            lat: data.lat,
            lng: data.lng,
            heading: data.heading || 0,
            timestamp: Date.now(),
          });
        }
      } catch (err: any) {
        console.error('[Socket] Failed to process driver location update:', err.message);
      }
    });

    // Driver online / offline status toggle
    socket.on('driver:toggle_online', async ({ isOnline }: { isOnline: boolean }) => {
      await SpatialRepository.setDriverOnlineStatus(user.userId, isOnline);
      console.log(`[Socket] Driver ${user.phone} online status changed to: ${isOnline}`);
      socket.emit('driver:online_status_confirmed', { isOnline });
    });

    // Driver dispatch response (accept or decline)
    socket.on('ride:respond_dispatch', async ({ rideId, accept }: { rideId: string; accept: boolean }) => {
      const { MatchingService } = await import('../services/matchingService.js');
      MatchingService.handleDriverResponse(rideId, user.userId, accept);
      console.log(`[Socket] Driver ${user.phone} responded to ride ${rideId}: accept=${accept}`);
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] Client disconnected: ${user.phone} (${socket.id})`);
    });
  });

  return io;
}

export function getIO(): Server {
  if (!ioInstance) {
    throw new Error('Socket.io has not been initialized yet');
  }
  return ioInstance;
}

export function broadcastToRide(rideId: string, event: string, payload: any) {
  if (ioInstance) {
    ioInstance.to(`ride:${rideId}`).emit(event, payload);
  }
}

export function sendToDriver(driverId: string, event: string, payload: any) {
  if (ioInstance) {
    ioInstance.to(`driver:${driverId}`).emit(event, payload);
  }
}
