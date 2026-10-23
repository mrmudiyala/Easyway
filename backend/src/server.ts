import http from 'http';
import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from './config/env.js';
import { initDatabase, isPostgisConnected } from './config/db.js';
import { seedInitialData } from './db/seeds/seedData.js';
import { initSocketServer } from './sockets/socketServer.js';
import { AuthController } from './controllers/authController.js';
import { MapController } from './controllers/mapController.js';
import { FareController } from './controllers/fareController.js';
import { RideController } from './controllers/rideController.js';
import { RidePipelineController } from './controllers/ridePipelineController.js';
import { requireAuth } from './middlewares/authMiddleware.js';
import { SpatialRepository } from './db/spatialRepo.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// --- Health Check ---
app.get('/api/v1/health', (req: Request, res: Response) => {
  res.json({
    status: 'ONLINE',
    service: 'EasyWay API',
    version: '1.0.0',
    postgisActive: isPostgisConnected,
    mapProvider: env.MAP_PROVIDER,
    timestamp: new Date().toISOString(),
  });
});

// --- Auth Routes ---
app.post('/api/v1/auth/request-otp', AuthController.requestOtp);
app.post('/api/v1/auth/verify-otp', AuthController.verifyOtp);
app.get('/api/v1/auth/me', requireAuth, AuthController.getMe);

// --- Map & Location Routes ---
app.get('/api/v1/maps/reverse-geocode', MapController.reverseGeocode);
app.get('/api/v1/maps/places-autocomplete', MapController.placesAutocomplete);
app.get('/api/v1/maps/place-details/:placeId', MapController.getPlaceDetails);
app.post('/api/v1/maps/routes', MapController.getRoutes);

// --- Fare Routes (Feature 4: Symmetrical Canonical Fares) ---
app.post('/api/v1/fare/calculate', FareController.calculate);

// --- End-to-End Voice Ride Pipeline ---
app.post('/api/v1/rides/voice-book', RidePipelineController.processVoiceRideBooking);

// --- Ride & Matching Routes (Milestone 3 & Lifecycle State Machine) ---
app.post('/api/v1/rides/request', requireAuth, RideController.requestRide);
app.get('/api/v1/rides/:rideId', requireAuth, RideController.getRide);
app.post('/api/v1/rides/:rideId/accept', RideController.acceptRide);
app.post('/api/v1/rides/:rideId/start', RideController.startTripWithOtp);
app.post('/api/v1/rides/:rideId/complete', RideController.completeTrip);
app.post('/api/v1/rides/:rideId/cancel', requireAuth, RideController.cancelRide);

// --- Admin & Fleet Routes ---
app.get('/api/v1/admin/drivers', async (req: Request, res: Response) => {
  try {
    const drivers = await SpatialRepository.getAllDrivers();
    res.json({ success: true, count: drivers.length, drivers });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/v1/admin/rides', async (req: Request, res: Response) => {
  try {
    const rides = await SpatialRepository.getAllRides();
    res.json({ success: true, count: rides.length, rides });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/v1/admin/stats', async (req: Request, res: Response) => {
  try {
    const drivers = await SpatialRepository.getAllDrivers();
    const rides = await SpatialRepository.getAllRides();
    const onlineDrivers = drivers.filter(d => d.is_online).length;
    const busyDrivers = drivers.filter(d => d.is_busy).length;
    const completedRides = rides.filter(r => r.status === 'COMPLETED');
    const totalRevenue = completedRides.reduce((acc, r) => acc + (r.locked_fare || 0), 0);

    res.json({
      success: true,
      stats: {
        totalDrivers: drivers.length,
        onlineDrivers,
        busyDrivers,
        totalRides: rides.length,
        completedRides: completedRides.length,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        activeSurgeMultiplier: 1.0,
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/v1/admin/drivers/relocate-near', async (req: Request, res: Response) => {
  try {
    const { lat, lng } = req.body;
    if (!lat || !lng) return res.status(400).json({ error: 'lat and lng required' });
    const drivers = await SpatialRepository.getAllDrivers();
    
    // Position drivers in a small realistic cluster near the rider (0.3 to 1.2km away)
    const offsets = [
      { dlat: 0.0035, dlng: 0.0028, heading: 45 },
      { dlat: -0.0042, dlng: 0.0031, heading: 135 },
      { dlat: 0.0021, dlng: -0.0050, heading: 225 },
      { dlat: -0.0030, dlng: -0.0038, heading: 315 },
    ];

    for (let i = 0; i < drivers.length; i++) {
      const offset = offsets[i % offsets.length];
      await SpatialRepository.updateDriverLocation(drivers[i].user_id, {
        lat: lat + offset.dlat,
        lng: lng + offset.dlng,
        heading: offset.heading,
      });
      await SpatialRepository.setDriverOnlineStatus(drivers[i].user_id, true);
      await SpatialRepository.setDriverBusyStatus(drivers[i].user_id, false);
    }

    const updatedDrivers = await SpatialRepository.getAllDrivers();
    res.json({ success: true, message: 'Drivers relocated near target coordinates', drivers: updatedDrivers });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- Food Delivery API Routes (Zomato-Style Architecture) ---
import { foodService } from './services/foodService.js';

app.get('/api/v1/food/restaurants', (req: Request, res: Response) => {
  const search = req.query.search as string;
  const cuisine = req.query.cuisine as string;
  const list = foodService.getAllRestaurants(search, cuisine);
  res.json({ success: true, count: list.length, restaurants: list });
});

app.get('/api/v1/food/restaurants/:id', (req: Request, res: Response) => {
  const restaurant = foodService.getRestaurantById(req.params.id);
  if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });
  res.json({ success: true, restaurant });
});

app.post('/api/v1/food/orders', (req: Request, res: Response) => {
  try {
    const order = foodService.createOrder(req.body);
    res.json({ success: true, order });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/v1/food/orders/:id', (req: Request, res: Response) => {
  const order = foodService.getOrderById(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json({ success: true, order });
});

app.patch('/api/v1/food/orders/:id/status', (req: Request, res: Response) => {
  try {
    const { status, photoProofUrl } = req.body;
    const order = foodService.updateOrderStatus(req.params.id, status, photoProofUrl);
    res.json({ success: true, order });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/v1/food/admin/stats', (req: Request, res: Response) => {
  res.json({ success: true, stats: foodService.getStats(), orders: foodService.getAllOrders() });
});



// --- Dev Web Test Console (Runs in browser for immediate verification) ---
app.get('/test-console', (req: Request, res: Response) => {
  const googleApiKey = env.GOOGLE_MAPS_API_KEY || '';
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>EasyWay — Google Maps & AI Voice Assistant Console</title>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <style>
        * { box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0b1329; color: #f8fafc; padding: 1.5rem; max-width: 1100px; margin: 0 auto; }
        .card { background: #152238; border-radius: 12px; padding: 1.25rem; margin-bottom: 1.25rem; border: 1px solid #283e60; box-shadow: 0 4px 20px rgba(0,0,0,0.25); }
        h1, h2, h3 { color: #38bdf8; margin-top: 0; }
        button { background: #0284c7; color: white; border: none; padding: 0.6rem 1rem; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 13px; transition: all 0.2s; }
        button:hover { background: #0369a1; transform: translateY(-1px); }
        button.active { outline: 2px solid #38bdf8; background: #0369a1; }
        input, select { background: #09101f; border: 1px solid #334155; color: white; padding: 0.65rem; border-radius: 6px; font-size: 13px; }
        input:focus { outline: 2px solid #38bdf8; border-color: #38bdf8; }
        pre { background: #050a14; padding: 0.75rem; border-radius: 8px; overflow-x: auto; font-size: 12px; color: #4ade80; border: 1px solid #1e293b; max-height: 180px; }
        .badge { display: inline-block; padding: 0.25rem 0.6rem; border-radius: 9999px; font-size: 12px; font-weight: 600; background: #059669; }
        #map-container { height: 420px; width: 100%; border-radius: 10px; border: 1px solid #334155; position: relative; overflow: hidden; }
        #leaflet-map, #google-map { height: 100%; width: 100%; }
        .map-controls { display: flex; gap: 8px; margin-bottom: 10px; flex-wrap: wrap; }
        .search-container { position: relative; flex: 1; min-width: 240px; }
        .suggestions { position: absolute; top: 100%; left: 0; right: 0; background: #1e293b; border: 1px solid #475569; border-radius: 6px; max-height: 180px; overflow-y: auto; z-index: 1000; list-style: none; padding: 0; margin: 4px 0 0 0; }
        .suggestions li { padding: 8px 12px; cursor: pointer; border-bottom: 1px solid #334155; font-size: 12px; }
        .suggestions li:hover { background: #0284c7; }
        .fare-pill { background: #02382f; padding: 10px 14px; border-radius: 8px; border: 1px solid #059669; font-size: 13px; }
        
        /* Voice Assistant Orb Animation */
        .voice-orb-container { display: flex; align-items: center; gap: 15px; padding: 12px; background: #082f4944; border-radius: 10px; border: 1px solid #0284c7; margin-bottom: 12px; }
        .voice-orb { width: 52px; height: 52px; border-radius: 50%; background: radial-gradient(circle, #38bdf8 0%, #0284c7 70%); display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 24px; transition: all 0.3s ease; box-shadow: 0 0 15px rgba(56, 189, 248, 0.4); flex-shrink: 0; }
        .voice-orb.listening { animation: pulse 1.2s infinite ease-in-out; background: radial-gradient(circle, #ef4444 0%, #b91c1c 70%); box-shadow: 0 0 25px rgba(239, 68, 68, 0.8); }
        .voice-orb.speaking { animation: wave 0.8s infinite alternate ease-in-out; background: radial-gradient(circle, #10b981 0%, #047857 70%); box-shadow: 0 0 25px rgba(16, 185, 129, 0.8); }
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.18); }
          100% { transform: scale(1); }
        }
        @keyframes wave {
          0% { transform: scale(1); box-shadow: 0 0 15px rgba(16, 185, 129, 0.5); }
          100% { transform: scale(1.12); box-shadow: 0 0 30px rgba(16, 185, 129, 0.9); }
        }
      </style>
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <script src="/socket.io/socket.io.js"></script>
    </head>
    <body>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
        <div>
          <h1 style="margin-bottom: 4px;">🚖 EasyWay — Google Maps & AI Voice Assistant</h1>
          <p style="color: #94a3b8; font-size: 14px; margin: 0;">Interactive Google Maps selection, 2-way conversational voice assistant with audio feedback & symmetrical fare dispatch.</p>
        </div>
        <div style="display: flex; gap: 8px; align-items: center;">
          <label style="font-size: 12px; color: #94a3b8;">Map Engine:</label>
          <select id="mapEngineSelect" onchange="switchMapEngine(this.value)">
            <option value="google" selected>Google Maps (Official)</option>
            <option value="leaflet">OpenStreetMap (Offline/Zero-Key)</option>
          </select>
        </div>
      </div>

      <!-- Section: Conversational AI Voice Assistant -->
      <div class="card" style="border: 1px solid #38bdf8; background: #0c2d4822;">
        <h2>🎙️ AI Conversational Voice Assistant</h2>
        <div class="voice-orb-container">
          <div id="voiceOrb" class="voice-orb" onclick="toggleVoiceAssistant()">🎤</div>
          <div style="flex: 1;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <strong id="voiceStatusText" style="color: #38bdf8; font-size: 14px;">Tap mic or speak: "Take me from Benz Circle to Mindspace Building 3"</strong>
              <span id="voiceBadge" class="badge" style="background: #334155;">Assistant: Idle</span>
            </div>
            <div id="voiceTranscriptText" style="font-size: 13px; color: #e2e8f0; margin-top: 4px; min-height: 20px;">
              Try: <em>"Set pickup to Benz Circle"</em>, <em>"Take me to Airport"</em>, or <em>"Switch to cab"</em>
            </div>
          </div>
        </div>

        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <input id="voiceInput" value="Take me from Benz Circle to Mindspace Building 3" style="flex: 1; min-width: 260px;" placeholder="Or type voice command manually..." />
          <button onclick="processVoiceAssistantCommand(document.getElementById('voiceInput').value)" style="background: #0284c7;">⚡ Send to Assistant</button>
          <button onclick="speakVoiceFeedback('Voice Assistant is active. Speak your destination or click on the map to set pickup.')" style="background: #475569;">🔊 Test Voice Audio</button>
        </div>
        <div id="voicePipelineResult" style="margin-top: 8px;"></div>
      </div>

      <!-- Section: Interactive Map Address Selector (Google Maps + Leaflet Dual Engine) -->
      <div class="card" style="border: 1px solid #0284c7;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; flex-wrap: wrap; gap: 8px;">
          <h2>🗺️ Interactive Map Location Selector</h2>
          <div class="map-controls">
            <button id="btnSetPickup" class="active" onclick="setMapMode('pickup')" style="background: #15803d;">🟢 Click Map: Set Pickup</button>
            <button id="btnSetDrop" onclick="setMapMode('drop')" style="background: #b91c1c;">🔴 Click Map: Set Dropoff</button>
            <button onclick="locateUserGPS()" style="background: #475569;">📡 Locate Me</button>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;">
          <div class="search-container">
            <label style="font-size: 12px; color: #4ade80; font-weight: bold;">🟢 Pickup Address (Drag pin or search):</label>
            <input id="pickupInput" style="width: 100%;" placeholder="Search pickup place or click on map..." oninput="searchPlaces('pickup', this.value)" />
            <ul id="pickupSuggestions" class="suggestions" style="display: none;"></ul>
          </div>
          <div class="search-container">
            <label style="font-size: 12px; color: #f87171; font-weight: bold;">🔴 Dropoff Address (Drag pin or search):</label>
            <input id="dropInput" style="width: 100%;" placeholder="Search destination or click on map..." oninput="searchPlaces('drop', this.value)" />
            <ul id="dropSuggestions" class="suggestions" style="display: none;"></ul>
          </div>
        </div>

        <!-- Dual Map Container -->
        <div id="map-container">
          <div id="google-map"></div>
          <div id="leaflet-map" style="display: none;"></div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px; flex-wrap: wrap; gap: 10px;">
          <div id="routeMetrics" style="font-size: 13px; color: #38bdf8;">
            🛣️ Route: <strong>4.8 km (~12 mins)</strong>
          </div>
          <div style="display: flex; gap: 8px; align-items: center;">
            <select id="mapVehicleType" onchange="calculateMapRouteAndFare()">
              <option value="BIKE">🏍️ Two-Wheeler (Bike) — ₹9/km</option>
              <option value="CAB">🚗 Four-Wheeler (Car / Cab) — ₹16/km</option>
            </select>
            <button onclick="calculateMapRouteAndFare()" style="background: #0284c7;">⚡ Refresh Route</button>
            <button onclick="bookRideFromMap()" style="background: #059669; font-weight: bold;">🚖 Confirm & Book Ride</button>
          </div>
        </div>

        <div id="fareDisplayBox" style="margin-top: 10px;"></div>
      </div>

      <!-- Section: Symmetrical Fare Invariant Verification -->
      <div class="card">
        <h2>3. Symmetrical Fare Invariant (A&rarr;B == B&rarr;A)</h2>
        <p style="font-size: 13px; color: #94a3b8;">Verifies that swapping pickup and drop produces identical canonical distance and locked ₹ fare.</p>
        <button onclick="testSymmetricalFare()">Test Invariant (A &rarr; B vs B &rarr; A)</button>
        <div id="fareComparison" style="margin-top: 10px;"></div>
      </div>

      <!-- Section: 4-Step Ride Lifecycle State Machine & Driver Dispatch -->
      <div class="card" style="border: 1px solid #38bdf8;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
          <h2>4. Real-time Ride Lifecycle State Machine & Payment</h2>
          <div id="socketStatus" style="font-size: 13px;"><span class="badge" style="background: #475569;">Socket: Connecting...</span></div>
        </div>
        <p style="font-size: 13px; color: #94a3b8; margin-top: 4px;">
          Step through the entire 4-stage lifecycle: <strong>REQUESTED &rarr; ACCEPTED &rarr; OTP IN_PROGRESS &rarr; COMPLETED (Paid via Cash / Online UPI)</strong>
        </p>

        <!-- Visual State Flow Diagram -->
        <div style="display: flex; gap: 8px; margin: 12px 0; overflow-x: auto; padding-bottom: 4px;">
          <div id="step-badge-1" style="padding: 8px 12px; border-radius: 8px; background: #1e3a8a; border: 1px solid #3b82f6; font-size: 12px; font-weight: 700;">
            1. REQUESTED
          </div>
          <div style="color: #64748b; align-self: center;">&rarr;</div>
          <div id="step-badge-2" style="padding: 8px 12px; border-radius: 8px; background: #1e293b; border: 1px solid #475569; font-size: 12px; font-weight: 700; color: #94a3b8;">
            2. ACCEPTED (Locked)
          </div>
          <div style="color: #64748b; align-self: center;">&rarr;</div>
          <div id="step-badge-3" style="padding: 8px 12px; border-radius: 8px; background: #1e293b; border: 1px solid #475569; font-size: 12px; font-weight: 700; color: #94a3b8;">
            3. IN_PROGRESS (OTP)
          </div>
          <div style="color: #64748b; align-self: center;">&rarr;</div>
          <div id="step-badge-4" style="padding: 8px 12px; border-radius: 8px; background: #1e293b; border: 1px solid #475569; font-size: 12px; font-weight: 700; color: #94a3b8;">
            4. COMPLETED (Paid)
          </div>
        </div>

        <div id="bookingResult" style="margin-bottom: 12px;"></div>

        <!-- Interactive Lifecycle Step Controls -->
        <div id="lifecycleControls" style="display: none; background: #081a30; border: 1px solid #1e3a8a; padding: 14px; border-radius: 10px; margin-bottom: 12px;">
          <h3 style="font-size: 14px; margin-bottom: 10px; color: #38bdf8;">Driver & Rider Action Controls:</h3>
          <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center;">
            <button id="btnDriverAccept" onclick="driverAcceptCurrentRide()" style="background: #0284c7;">
              👨‍✈️ 1. Driver Accepts (Lock-in)
            </button>
            <div style="display: flex; gap: 6px; align-items: center;">
              <input id="inputOtp" placeholder="4-digit OTP" style="width: 110px;" />
              <button id="btnStartTrip" onclick="startTripWithEnteredOtp()" style="background: #eab308; color: #000; font-weight: 700;">
                🚀 2. Start Trip (Verify OTP)
              </button>
            </div>
            <div style="display: flex; gap: 6px; align-items: center;">
              <select id="paymentModeSelect">
                <option value="ONLINE">💳 Online (UPI / Card)</option>
                <option value="CASH">💵 Cash</option>
              </select>
              <button id="btnCompleteTrip" onclick="completeTripWithPayment()" style="background: #059669; font-weight: 700;">
                🏁 3. Complete Trip & Pay
              </button>
            </div>
          </div>
        </div>

        <!-- Fastest Alternative Routes Box -->
        <div id="alternativeRoutesBox" style="margin-top: 10px;"></div>
      </div>

      <script>
        let currentEngine = 'google';
        let googleMap, googlePickupMarker, googleDropMarker, googleDirectionsRenderer, googleDirectionsService, googleGeocoder;
        let leafletMap, leafletPickupMarker, leafletDropMarker, leafletRoutePolyline;
        
        let mapMode = 'pickup'; // 'pickup' | 'drop'
        let pickupCoords = { lat: 16.4975, lng: 80.6534, address: 'Benz Circle, Vijayawada' };
        let dropCoords = { lat: 16.5186, lng: 80.6200, address: 'Vijayawada Railway Station, Vijayawada' };
        
        let token = '';
        let socket = null;
        let isRecording = false;
        let recognition = null;
        const GOOGLE_API_KEY = '${googleApiKey}';

        function log(data) {
          document.getElementById('output').textContent = typeof data === 'object' ? JSON.stringify(data, null, 2) : data;
        }

        // --- Text-to-Speech (Audio Voice Output) ---
        function speakVoiceFeedback(text) {
          if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'en-IN';
            utterance.rate = 1.05;
            utterance.pitch = 1.0;

            const orb = document.getElementById('voiceOrb');
            utterance.onstart = () => {
              orb.classList.add('speaking');
              document.getElementById('voiceBadge').innerHTML = '<span class="badge" style="background: #10b981;">Assistant: Speaking</span>';
            };
            utterance.onend = () => {
              orb.classList.remove('speaking');
              document.getElementById('voiceBadge').innerHTML = '<span class="badge" style="background: #334155;">Assistant: Idle</span>';
            };
            window.speechSynthesis.speak(utterance);
          }
        }

        // --- Conversational AI Voice Assistant ---
        function toggleVoiceAssistant() {
          const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
          if (!SpeechRec) {
            alert('Web Speech Recognition is not supported in this browser. Please type commands in the box.');
            return;
          }

          const orb = document.getElementById('voiceOrb');
          if (isRecording && recognition) {
            recognition.stop();
            isRecording = false;
            orb.classList.remove('listening');
            document.getElementById('voiceBadge').innerHTML = '<span class="badge" style="background: #334155;">Assistant: Idle</span>';
            return;
          }

          recognition = new SpeechRec();
          recognition.lang = 'en-IN';
          recognition.continuous = false;
          recognition.interimResults = false;

          recognition.onstart = () => {
            isRecording = true;
            orb.classList.add('listening');
            document.getElementById('voiceStatusText').innerText = 'Listening... Speak your ride request';
            document.getElementById('voiceBadge').innerHTML = '<span class="badge" style="background: #ef4444;">Assistant: Listening</span>';
          };

          recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            document.getElementById('voiceInput').value = transcript;
            document.getElementById('voiceTranscriptText').innerHTML = '🗣️ You said: <strong>"' + transcript + '"</strong>';
            log({ recognizedSpeech: transcript });
            processVoiceAssistantCommand(transcript);
          };

          recognition.onerror = (event) => {
            console.error('Speech error:', event.error);
            isRecording = false;
            orb.classList.remove('listening');
            document.getElementById('voiceBadge').innerHTML = '<span class="badge" style="background: #ef4444;">Mic Error</span>';
          };

          recognition.onend = () => {
            isRecording = false;
            orb.classList.remove('listening');
            document.getElementById('voiceBadge').innerHTML = '<span class="badge" style="background: #334155;">Assistant: Idle</span>';
          };

          recognition.start();
        }

        async function processVoiceAssistantCommand(commandText) {
          if (!commandText) return;
          const statusDiv = document.getElementById('voicePipelineResult');
          statusDiv.innerHTML = '<div style="color: #38bdf8;">⏳ AI Voice Engine is resolving landmarks and calculating fare...</div>';

          // Check for vehicle switch commands
          if (/switch to cab|select cab|car/i.test(commandText)) {
            document.getElementById('mapVehicleType').value = 'CAB';
            speakVoiceFeedback('Switched to Four-Wheeler Cab.');
            calculateMapRouteAndFare();
            return;
          }
          if (/switch to bike|select bike|motorcycle|two wheeler/i.test(commandText)) {
            document.getElementById('mapVehicleType').value = 'BIKE';
            speakVoiceFeedback('Switched to Two-Wheeler Bike.');
            calculateMapRouteAndFare();
            return;
          }
          if (/switch to auto|select auto|rickshaw/i.test(commandText)) {
            document.getElementById('mapVehicleType').value = 'AUTO';
            speakVoiceFeedback('Switched to Auto Rickshaw.');
            calculateMapRouteAndFare();
            return;
          }

          try {
            const res = await fetch('/api/v1/rides/voice-book', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                speechText: commandText,
                userLat: pickupCoords.lat,
                userLng: pickupCoords.lng,
                vehicleType: document.getElementById('mapVehicleType').value,
                userId: '00000000-0000-0000-0000-000000000001'
              })
            });

            const data = await res.json();
            log({ voicePipelineResponse: data });

            if (data.success) {
              pickupCoords = data.pickup;
              dropCoords = data.dropoff;
              document.getElementById('pickupInput').value = pickupCoords.address;
              document.getElementById('dropInput').value = dropCoords.address;

              syncMapMarkers();
              calculateMapRouteAndFare();

              statusDiv.innerHTML = \`
                <div style="background: #0f2b48; border: 1px solid #0284c7; padding: 10px; border-radius: 8px; margin-top: 8px; font-size: 13px;">
                  <div>🟢 <strong>Pickup:</strong> \${data.pickup.address}</div>
                  <div>🔴 <strong>Dropoff:</strong> \${data.dropoff.address}</div>
                  <div style="margin-top: 4px; color: #4ade80;">💰 <strong>Symmetrical Fare: ₹\${data.fare.totalFare}</strong> (\${data.fare.breakdownSummary})</div>
                </div>
              \`;

              speakVoiceFeedback(\`Pickup set to \${data.pickup.address.split(',')[0]} and dropoff to \${data.dropoff.address.split(',')[0]}. Symmetrical fare is \${data.fare.totalFare} rupees.\`);
            } else {
              statusDiv.innerHTML = \`<div style="color: #f87171;">❌ \${data.error}</div>\`;
              speakVoiceFeedback('Could not find those locations. Please try again or tap on the map.');
            }
          } catch (err) {
            statusDiv.innerHTML = \`<div style="color: #f87171;">❌ \${err.message}</div>\`;
          }
        }

        // --- Google Maps Initialization ---
        function initGoogleMap() {
          const center = { lat: pickupCoords.lat, lng: pickupCoords.lng };
          googleMap = new google.maps.Map(document.getElementById('google-map'), {
            center,
            zoom: 13,
            styles: [
              { elementType: 'geometry', stylers: [{ color: '#1d2c4d' }] },
              { elementType: 'labels.text.fill', stylers: [{ color: '#8ec3b9' }] },
              { elementType: 'labels.text.stroke', stylers: [{ color: '#1a3646' }] },
              { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#304a7d' }] },
              { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e1626' }] }
            ]
          });

          googleGeocoder = new google.maps.Geocoder();
          googleDirectionsService = new google.maps.DirectionsService();
          googleDirectionsRenderer = new google.maps.DirectionsRenderer({
            map: googleMap,
            suppressMarkers: true,
            polylineOptions: { strokeColor: '#38bdf8', strokeWeight: 5 }
          });

          // Google Green Pickup Pin
          googlePickupMarker = new google.maps.Marker({
            position: center,
            map: googleMap,
            draggable: true,
            title: '🟢 Pickup Location',
            icon: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png'
          });

          // Google Red Dropoff Pin
          googleDropMarker = new google.maps.Marker({
            position: { lat: dropCoords.lat, lng: dropCoords.lng },
            map: googleMap,
            draggable: true,
            title: '🔴 Dropoff Location',
            icon: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png'
          });

          // Google Drag Events
          googlePickupMarker.addListener('dragend', (e) => {
            pickupCoords.lat = e.latLng.lat();
            pickupCoords.lng = e.latLng.lng();
            reverseGeocodePoint('pickup', pickupCoords.lat, pickupCoords.lng);
            calculateMapRouteAndFare();
          });

          googleDropMarker.addListener('dragend', (e) => {
            dropCoords.lat = e.latLng.lat();
            dropCoords.lng = e.latLng.lng();
            reverseGeocodePoint('drop', dropCoords.lat, dropCoords.lng);
            calculateMapRouteAndFare();
          });

          // Google Click on Map
          googleMap.addListener('click', (e) => {
            const lat = e.latLng.lat();
            const lng = e.latLng.lng();
            if (mapMode === 'pickup') {
              pickupCoords.lat = lat;
              pickupCoords.lng = lng;
              googlePickupMarker.setPosition({ lat, lng });
              reverseGeocodePoint('pickup', lat, lng);
              setMapMode('drop');
            } else {
              dropCoords.lat = lat;
              dropCoords.lng = lng;
              googleDropMarker.setPosition({ lat, lng });
              reverseGeocodePoint('drop', lat, lng);
            }
            calculateMapRouteAndFare();
          });

          calculateMapRouteAndFare();
        }

        // --- Leaflet (OSM Fallback) Initialization ---
        function initLeafletMap() {
          leafletMap = L.map('leaflet-map').setView([pickupCoords.lat, pickupCoords.lng], 13);
          L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap &copy; CARTO',
            maxZoom: 19
          }).addTo(leafletMap);

          const greenIcon = L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
            iconSize: [25, 41], iconAnchor: [12, 41]
          });

          const redIcon = L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
            iconSize: [25, 41], iconAnchor: [12, 41]
          });

          leafletPickupMarker = L.marker([pickupCoords.lat, pickupCoords.lng], { icon: greenIcon, draggable: true }).addTo(leafletMap);
          leafletDropMarker = L.marker([dropCoords.lat, dropCoords.lng], { icon: redIcon, draggable: true }).addTo(leafletMap);

          leafletPickupMarker.on('dragend', (e) => {
            const pos = e.target.getLatLng();
            pickupCoords.lat = pos.lat;
            pickupCoords.lng = pos.lng;
            reverseGeocodePoint('pickup', pos.lat, pos.lng);
            calculateMapRouteAndFare();
          });

          leafletDropMarker.on('dragend', (e) => {
            const pos = e.target.getLatLng();
            dropCoords.lat = pos.lat;
            dropCoords.lng = pos.lng;
            reverseGeocodePoint('drop', pos.lat, pos.lng);
            calculateMapRouteAndFare();
          });

          leafletMap.on('click', (e) => {
            const { lat, lng } = e.latlng;
            if (mapMode === 'pickup') {
              pickupCoords.lat = lat;
              pickupCoords.lng = lng;
              leafletPickupMarker.setLatLng([lat, lng]);
              reverseGeocodePoint('pickup', lat, lng);
              setMapMode('drop');
            } else {
              dropCoords.lat = lat;
              dropCoords.lng = lng;
              leafletDropMarker.setLatLng([lat, lng]);
              reverseGeocodePoint('drop', lat, lng);
            }
            calculateMapRouteAndFare();
          });
        }

        function switchMapEngine(engine) {
          currentEngine = engine;
          if (engine === 'google') {
            document.getElementById('google-map').style.display = 'block';
            document.getElementById('leaflet-map').style.display = 'none';
            if (googleMap) {
              google.maps.event.trigger(googleMap, 'resize');
              syncMapMarkers();
            }
          } else {
            document.getElementById('google-map').style.display = 'none';
            document.getElementById('leaflet-map').style.display = 'block';
            if (!leafletMap) initLeafletMap();
            leafletMap.invalidateSize();
            syncMapMarkers();
          }
        }

        function syncMapMarkers() {
          if (googlePickupMarker && googleDropMarker) {
            googlePickupMarker.setPosition({ lat: pickupCoords.lat, lng: pickupCoords.lng });
            googleDropMarker.setPosition({ lat: dropCoords.lat, lng: dropCoords.lng });
            const bounds = new google.maps.LatLngBounds();
            bounds.extend({ lat: pickupCoords.lat, lng: pickupCoords.lng });
            bounds.extend({ lat: dropCoords.lat, lng: dropCoords.lng });
            googleMap.fitBounds(bounds, 50);
          }
          if (leafletPickupMarker && leafletDropMarker) {
            leafletPickupMarker.setLatLng([pickupCoords.lat, pickupCoords.lng]);
            leafletDropMarker.setLatLng([dropCoords.lat, dropCoords.lng]);
            if (leafletRoutePolyline) leafletMap.removeLayer(leafletRoutePolyline);
            leafletRoutePolyline = L.polyline([
              [pickupCoords.lat, pickupCoords.lng],
              [dropCoords.lat, dropCoords.lng]
            ], { color: '#38bdf8', weight: 4, dashArray: '6, 6' }).addTo(leafletMap);
            leafletMap.fitBounds(leafletRoutePolyline.getBounds(), { padding: [40, 40] });
          }
        }

        function setMapMode(mode) {
          mapMode = mode;
          document.getElementById('btnSetPickup').classList.toggle('active', mode === 'pickup');
          document.getElementById('btnSetDrop').classList.toggle('active', mode === 'drop');
        }

        async function reverseGeocodePoint(type, lat, lng) {
          try {
            const res = await fetch(\`/api/v1/maps/reverse-geocode?lat=\${lat}&lng=\${lng}\`);
            const data = await res.json();
            if (data.data && data.data.formattedAddress) {
              const address = data.data.formattedAddress;
              if (type === 'pickup') {
                pickupCoords.address = address;
                document.getElementById('pickupInput').value = address;
              } else {
                dropCoords.address = address;
                document.getElementById('dropInput').value = address;
              }
            }
          } catch (e) {
            console.warn('Geocode error:', e);
          }
        }

        async function searchPlaces(type, query) {
          const sugUl = document.getElementById(type + 'Suggestions');
          if (!query || query.length < 2) {
            sugUl.style.display = 'none';
            return;
          }

          try {
            const res = await fetch(\`/api/v1/maps/places-autocomplete?query=\${encodeURIComponent(query)}\`);
            const json = await res.json();
            if (json.data && json.data.length > 0) {
              sugUl.innerHTML = json.data.map(p => 
                \`<li onclick="selectPlace('\${type}', '\${p.placeId}', '\${p.title.replace(/'/g, "\\\\'")}')">
                  <strong>\${p.title}</strong><br><span style="color: #94a3b8; font-size: 11px;">\${p.subtitle}</span>
                </li>\`
              ).join('');
              sugUl.style.display = 'block';
            } else {
              sugUl.style.display = 'none';
            }
          } catch (e) {
            sugUl.style.display = 'none';
          }
        }

        async function selectPlace(type, placeId, title) {
          document.getElementById(type + 'Suggestions').style.display = 'none';
          try {
            const res = await fetch(\`/api/v1/maps/place-details/\${placeId}\`);
            const json = await res.json();
            if (json.data) {
              const loc = json.data.location;
              if (type === 'pickup') {
                pickupCoords = { lat: loc.lat, lng: loc.lng, address: json.data.address || title };
                document.getElementById('pickupInput').value = pickupCoords.address;
              } else {
                dropCoords = { lat: loc.lat, lng: loc.lng, address: json.data.address || title };
                document.getElementById('dropInput').value = dropCoords.address;
              }
              syncMapMarkers();
              calculateMapRouteAndFare();
            }
          } catch (e) {
            console.error('Place details error:', e);
          }
        }

        function locateUserGPS() {
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(async (pos) => {
              const { latitude, longitude } = pos.coords;
              pickupCoords.lat = latitude;
              pickupCoords.lng = longitude;
              syncMapMarkers();
              await reverseGeocodePoint('pickup', latitude, longitude);
              calculateMapRouteAndFare();
              speakVoiceFeedback('Located your position on the map.');
            }, () => alert('Unable to fetch GPS position.'));
          } else {
            alert('Geolocation is not supported in this browser.');
          }
        }

        async function calculateMapRouteAndFare() {
          const vehicle = document.getElementById('mapVehicleType').value;
          syncMapMarkers();

          // If Google Maps is loaded, render native directions
          if (googleDirectionsService && googleDirectionsRenderer) {
            googleDirectionsService.route({
              origin: { lat: pickupCoords.lat, lng: pickupCoords.lng },
              destination: { lat: dropCoords.lat, lng: dropCoords.lng },
              travelMode: google.maps.TravelMode.DRIVING
            }, (result, status) => {
              if (status === 'OK') {
                googleDirectionsRenderer.setDirections(result);
              }
            });
          }

          // Compute Symmetrical Invariant Fare & Fetch Alternative Fast Routes
          try {
            const [fareRes, routeRes] = await Promise.all([
              fetch('/api/v1/fare/calculate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pickup: pickupCoords, drop: dropCoords })
              }),
              fetch('/api/v1/maps/routes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ origin: pickupCoords, destination: dropCoords })
              })
            ]);

            const data = await fareRes.json();
            const routeData = await routeRes.json();

            if (data.data) {
              const selectedFare = data.data.fares.find(f => f.vehicleType === vehicle) || data.data.fares[0];
              document.getElementById('routeMetrics').innerHTML = 
                \`🛣️ Distance: <strong>\${data.data.canonicalDistanceKm} km</strong> (~<strong>\${data.data.canonicalDurationMins} mins</strong>)\`;

              document.getElementById('fareDisplayBox').innerHTML = \`
                <div class="fare-pill" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                  <div>
                    <strong>\${selectedFare.displayName}: ₹\${selectedFare.totalFare}</strong>
                    <span style="color: #94a3b8; font-size: 11px; margin-left: 8px;">(Base ₹\${selectedFare.baseFare} + ₹\${selectedFare.distanceFare} km + ₹\${selectedFare.timeFare} time)</span>
                  </div>
                  <div style="color: #4ade80; font-weight: bold; font-size: 12px;">✅ Symmetrical Guarantee: Return Trip will be the exact same ₹\${selectedFare.totalFare}</div>
                </div>
              \`;
            }

            // Render Fastest Alternative Routes
            if (routeData.data && routeData.data.length > 0) {
              const routeItems = routeData.data.map((r, i) => \`
                <div style="background: #091326; border: 1px solid \${r.isRecommended ? '#0284c7' : '#334155'}; padding: 10px 14px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                  <div>
                    <strong style="color: \${r.trafficColor}; font-size: 13px;">\${r.summary}</strong>
                    <div style="color: #94a3b8; font-size: 11px;">\${(r.distanceMeters / 1000).toFixed(1)} km • \${Math.round(r.durationSeconds / 60)} mins</div>
                  </div>
                  <div>
                    \${r.badge ? \`<span class="badge" style="background: #059669;">⚡ \${r.badge}</span>\` : \`<span class="badge" style="background: #475569;">Alternative Route</span>\`}
                  </div>
                </div>
              \`).join('');

              document.getElementById('alternativeRoutesBox').innerHTML = \`
                <div style="background: #0d1e38; border: 1px solid #1e3a8a; padding: 12px; border-radius: 10px; margin-top: 10px;">
                  <div style="color: #38bdf8; font-weight: 700; font-size: 13px; margin-bottom: 8px;">🚀 Fast Ways to Reach Destination:</div>
                  \${routeItems}
                </div>
              \`;
            }
          } catch (e) {
            console.error('Route calculation error:', e);
          }
        }

        let currentRideId = null;
        let currentRideOtp = null;

        function updateStepBadges(stepNum) {
          for (let i = 1; i <= 4; i++) {
            const badge = document.getElementById('step-badge-' + i);
            if (!badge) continue;
            if (i < stepNum) {
              badge.style.background = '#065f46';
              badge.style.borderColor = '#10b981';
              badge.style.color = '#6ee7b7';
            } else if (i === stepNum) {
              badge.style.background = '#1e3a8a';
              badge.style.borderColor = '#38bdf8';
              badge.style.color = '#ffffff';
            } else {
              badge.style.background = '#1e293b';
              badge.style.borderColor = '#475569';
              badge.style.color = '#94a3b8';
            }
          }
        }

        async function bookRideFromMap() {
          const vehicle = document.getElementById('mapVehicleType').value;
          
          if (!token) {
            const authRes = await fetch('/api/v1/auth/verify-otp', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ phone: '9876543210', otp: '123456' })
            });
            const authJson = await authRes.json();
            if (authJson.token) token = authJson.token;
          }

          if (!socket) autoConnectSocketWithAuth();

          const payload = {
            vehicleType: vehicle,
            pickup: pickupCoords,
            drop: dropCoords,
            lockedFare: 120,
            paymentMode: 'CASH'
          };

          const res = await fetch('/api/v1/rides/request', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify(payload)
          });
          const json = await res.json();

          if (json.data) {
            const ride = json.data;
            currentRideId = ride.id;
            currentRideOtp = ride.ride_otp;
            
            document.getElementById('inputOtp').value = ride.ride_otp;
            document.getElementById('lifecycleControls').style.display = 'block';
            updateStepBadges(1);

            document.getElementById('bookingResult').innerHTML = \`
              <div style="background: #0f2b48; border: 1px solid #0284c7; padding: 14px; border-radius: 10px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <strong style="color: #38bdf8; font-size: 15px;">✅ [ Step 1: RIDE CREATED ] Status: "REQUESTED"</strong>
                  <span class="badge" style="background: #059669; font-size: 13px;">Start OTP: \${ride.ride_otp}</span>
                </div>
                <!-- SMS Style OTP Banner -->
                <div style="background: #064e3b44; border: 1px dashed #10b981; padding: 10px; border-radius: 8px; margin-top: 8px; display: flex; align-items: center; gap: 8px;">
                  <span style="font-size: 18px;">📲</span>
                  <div>
                    <strong style="color: #4ade80;">SMS Sent to Rider:</strong>
                    <span style="color: #ffffff; font-size: 13px;">Your RideGo Start OTP is <strong>\${ride.ride_otp}</strong>. Share with Captain when boarding.</span>
                  </div>
                </div>
                <div style="margin-top: 8px; color: #94a3b8; font-size: 12px;" id="liveMatchingStatus">
                  ⏳ Ride ID: \${ride.id} | Locked Fare: ₹\${ride.locked_fare} (Searching for nearest captain...)
                </div>
              </div>
            \`;

            // Voice Assistant Speech Confirmation
            speakVoiceFeedback("Your ride is confirmed and waiting for Captain.");

            if (socket) {
              socket.emit('ride:join', { rideId: ride.id });
              socket.on('ride:status_update', (st) => {
                if (st.rideId === ride.id) {
                  if (st.status === 'ACCEPTED' || st.status === 'DRIVER_ASSIGNED') {
                    updateStepBadges(2);
                    document.getElementById('liveMatchingStatus').innerHTML = 
                      '✅ <strong style="color: #4ade80;">[ Step 2: ACCEPTED ]</strong> Captain ' + (st.driver?.name || 'Ramesh') + ' (' + (st.driver?.vehicle_number || 'KA-01-AB-1234') + ') accepted! 🔒 Rider locked in per policy.';
                  } else if (st.status === 'IN_PROGRESS') {
                    updateStepBadges(3);
                    document.getElementById('liveMatchingStatus').innerHTML = 
                      '🚀 <strong style="color: #eab308;">[ Step 3: IN_PROGRESS ]</strong> Trip is live with OTP verified! Navigating to destination.';
                  } else if (st.status === 'COMPLETED') {
                    updateStepBadges(4);
                    document.getElementById('liveMatchingStatus').innerHTML = 
                      '🏁 <strong style="color: #4ade80;">[ Step 4: COMPLETED ]</strong> Ride finished! Payment: <span class="badge" style="background: #059669;">PAID (' + (st.paymentMode || 'CASH') + ')</span> • Total: ₹' + (st.totalFare || ride.locked_fare) +
                      '<br><span style="color: #38bdf8; font-size: 12px; margin-top: 4px; display: inline-block;">🔄 Return Trip Guarantee: Dropoff ➔ Pickup will cost the exact same ₹' + (st.totalFare || ride.locked_fare) + '</span>';
                  }
                }
              });
            }
          }
        }

        // --- Step 2: Driver Accepts ---
        async function driverAcceptCurrentRide() {
          if (!currentRideId) {
            alert('Please request a ride first in Step 1!');
            return;
          }
          const res = await fetch(\`/api/v1/rides/\${currentRideId}/accept\`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ driverId: '00000000-0000-0000-0000-000000000002' })
          });
          const json = await res.json();
          updateStepBadges(2);
          speakVoiceFeedback('Captain Ramesh has accepted your ride. Rider is now locked in per anti-cancellation policy.');
        }

        // --- Step 3: Start Trip with OTP ---
        async function startTripWithEnteredOtp() {
          if (!currentRideId) {
            alert('Please request a ride first in Step 1!');
            return;
          }
          const otp = document.getElementById('inputOtp').value;
          const res = await fetch(\`/api/v1/rides/\${currentRideId}/start\`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ otp })
          });
          const json = await res.json();

          if (json.success) {
            updateStepBadges(3);
            speakVoiceFeedback('Start OTP verified. Trip is now in progress.');
          } else {
            alert('OTP Error: ' + json.error);
          }
        }

        // --- Step 4: Complete Trip with Payment ---
        async function completeTripWithPayment() {
          if (!currentRideId) {
            alert('Please request a ride first in Step 1!');
            return;
          }
          const paymentMode = document.getElementById('paymentModeSelect').value;
          const res = await fetch(\`/api/v1/rides/\${currentRideId}/complete\`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paymentMode })
          });
          const json = await res.json();

          if (json.success) {
            updateStepBadges(4);
            speakVoiceFeedback(\`Trip completed! Payment of \${json.totalFare} rupees received via \${paymentMode}. Return trip back to pickup point is guaranteed the exact same price.\`);
          }
        }

        async function testSymmetricalFare() {
          const compDiv = document.getElementById('fareComparison');
          compDiv.innerHTML = '<div style="color: #38bdf8; margin-top: 8px;">⏳ Testing 100% Symmetrical Equality (A &rarr; B vs B &rarr; A)...</div>';

          const pA = { lat: 16.4975, lng: 80.6534, address: 'Benz Circle, Vijayawada' };
          const pB = { lat: 16.5186, lng: 80.6200, address: 'Vijayawada Railway Station, Vijayawada' };

          try {
            const [resA, resB] = await Promise.all([
              fetch('/api/v1/fare/calculate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pickup: pA, drop: pB })
              }),
              fetch('/api/v1/fare/calculate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pickup: pB, drop: pA })
              })
            ]);

            const jsonA = await resA.json();
            const jsonB = await resB.json();

            const distA = jsonA.data.canonicalDistanceKm;
            const distB = jsonB.data.canonicalDistanceKm;
            const durA = jsonA.data.canonicalDurationMins;
            const durB = jsonB.data.canonicalDurationMins;

            let rowsHtml = '';
            let allMatch = distA === distB && durA === durB;

            jsonA.data.fares.forEach((fA, idx) => {
              const fB = jsonB.data.fares[idx];
              const match = fA.totalFare === fB.totalFare;
              if (!match) allMatch = false;

              rowsHtml += \`
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.08);">
                  <td style="padding: 8px; font-weight: 600;">\${fA.displayName}</td>
                  <td style="padding: 8px; color: #38bdf8;">₹\${fA.totalFare}</td>
                  <td style="padding: 8px; color: #38bdf8;">₹\${fB.totalFare}</td>
                  <td style="padding: 8px; color: \${match ? '#4ade80' : '#f87171'}; font-weight: bold;">
                    \${match ? '✅ Identical (₹' + fA.totalFare + ')' : '❌ Mismatch'}
                  </td>
                </tr>
              \`;
            });

            compDiv.innerHTML = \`
              <div style="background: \${allMatch ? '#064e3b33' : '#7f1d1d33'}; border: 1px solid \${allMatch ? '#059669' : '#dc2626'}; border-radius: 10px; padding: 14px; margin-top: 10px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                  <strong style="color: \${allMatch ? '#4ade80' : '#f87171'}; font-size: 15px;">
                    \${allMatch ? '✅ Symmetrical Fare Invariant Verified!' : '❌ Asymmetry Detected!'}
                  </strong>
                  <span class="badge" style="background: #059669;">Canonical: \${distA} km (\${durA} mins)</span>
                </div>
                <table style="width: 100%; text-align: left; font-size: 13px; border-collapse: collapse; margin-top: 6px;">
                  <thead>
                    <tr style="color: #94a3b8; border-bottom: 1px solid rgba(255,255,255,0.15);">
                      <th style="padding: 6px 8px;">Vehicle Tier</th>
                      <th style="padding: 6px 8px;">A &rarr; B (Forward)</th>
                      <th style="padding: 6px 8px;">B &rarr; A (Reverse)</th>
                      <th style="padding: 6px 8px;">Invariant Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    \${rowsHtml}
                  </tbody>
                </table>
              </div>
            \`;

            log({ 
              forwardJourney: { from: pA.address, to: pB.address, distanceKm: distA, durationMins: durA, fares: jsonA.data.fares },
              reverseJourney: { from: pB.address, to: pA.address, distanceKm: distB, durationMins: durB, fares: jsonB.data.fares },
              invariantSatisfied: allMatch
            });

          } catch (err) {
            compDiv.innerHTML = \`<div style="color: #f87171; margin-top: 8px;">❌ Calculation Error: \${err.message}</div>\`;
          }
        }

        async function autoConnectSocketWithAuth() {
          const statusEl = document.getElementById('socketStatus');
          statusEl.innerHTML = '<span class="badge" style="background: #f59e0b;">Socket: Authenticating...</span>';

          try {
            // Auto login with default developer credentials
            const authRes = await fetch('/api/v1/auth/verify-otp', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ phone: '9876543210', otp: '123456' })
            });
            const authData = await authRes.json();
            
            if (authData.token) {
              token = authData.token;
              
              if (socket) socket.disconnect();
              socket = io({ auth: { token } });

              socket.on('connect', () => {
                statusEl.innerHTML = '<span class="badge" style="background: #059669;">🟢 Socket: Connected (' + socket.id.slice(0, 6) + '...)</span>';
                log({ event: 'SOCKET_CONNECTED', socketId: socket.id, user: authData.user });
              });

              socket.on('disconnect', () => {
                statusEl.innerHTML = '<span class="badge" style="background: #dc2626;">🔴 Socket: Disconnected</span>';
              });

              socket.on('connect_error', (err) => {
                statusEl.innerHTML = '<span class="badge" style="background: #dc2626;">Socket Error: ' + err.message + '</span>';
                log({ socketError: err.message });
              });
            } else {
              statusEl.innerHTML = '<span class="badge" style="background: #dc2626;">Auth Failed</span>';
            }
          } catch (e) {
            statusEl.innerHTML = '<span class="badge" style="background: #dc2626;">Socket Connection Failed</span>';
            console.error('Socket auth failed:', e);
          }
        }

        // --- Load Google Maps API Dynamically ---
        function loadGoogleMapsScript() {
          const apiKeyParam = GOOGLE_API_KEY ? \`&key=\${GOOGLE_API_KEY}\` : '';
          const script = document.createElement('script');
          script.src = \`https://maps.googleapis.com/maps/api/js?libraries=places,geometry\${apiKeyParam}&callback=initGoogleMap\`;
          script.async = true;
          script.defer = true;
          script.onerror = () => {
            console.warn('Google Maps script failed to load. Falling back to OpenStreetMap (Leaflet).');
            document.getElementById('mapEngineSelect').value = 'leaflet';
            switchMapEngine('leaflet');
          };
          document.head.appendChild(script);
        }

        window.onload = () => {
          autoConnectSocketWithAuth();
          loadGoogleMapsScript();
        };
      </script>
    </body>
    </html>
  `);
});

const server = http.createServer(app);
initSocketServer(server);

export async function startServer() {
  await initDatabase();
  await seedInitialData();

  server.listen(env.PORT, () => {
    console.log(`=======================================================`);
    console.log(`🚖 EasyWay Backend running on: http://localhost:${env.PORT}`);
    console.log(`🧪 Interactive Test Console: http://localhost:${env.PORT}/test-console`);
    console.log(`🌐 Health Endpoint:         http://localhost:${env.PORT}/api/v1/health`);
    console.log(`=======================================================`);
  });
}

// Start server if this is the main module
startServer();
