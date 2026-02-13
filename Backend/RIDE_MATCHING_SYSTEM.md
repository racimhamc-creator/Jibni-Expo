# 🚗 Real-Time Ride Matching System

Complete backend implementation for Uber/Yassir-style ride matching with sequential driver assignment.

## 📁 Architecture Overview

```
src/
├── models/
│   └── Ride.ts              # Ride model with full lifecycle
├── services/
│   ├── driverPool.service.ts     # In-memory driver pool manager
│   ├── rideMatching.service.ts   # Sequential matching algorithm
│   ├── pushNotification.service.ts # Expo push notifications
│   ├── socketManager.service.ts  # Socket.io instance manager
│   └── socketHandlers.service.ts # All socket event handlers
└── routes/
    └── rides.routes.ts      # REST API for rides
```

## 🔌 Socket Events

### Client → Server Events

| Event | Payload | Description |
|-------|---------|-------------|
| `request_ride` | `{ pickupLocation, destinationLocation, vehicleType, pricing, distance, eta }` | Client requests a ride |
| `client_cancel_ride` | `{ rideId, reason? }` | Client cancels ride |
| `join_ride_room` | `{ rideId }` | Join ride-specific room |
| `leave_ride_room` | `{ rideId }` | Leave ride room |
| `update_fcm_token` | `{ token }` | Update push token |
| `get_active_ride` | - | Get current active ride |

### Driver → Server Events

| Event | Payload | Description |
|-------|---------|-------------|
| `driver_online` | `{ location, vehicleType?, fcmToken? }` | Driver comes online |
| `location_update` | `{ lat, lng, heading? }` | Driver location heartbeat |
| `accept_ride` | `{ rideId }` | Driver accepts ride |
| `reject_ride` | `{ rideId }` | Driver rejects ride |
| `driver_cancel_ride` | `{ rideId, reason? }` | Driver cancels accepted ride |
| `driver_arrived` | `{ rideId }` | Driver at pickup location |
| `start_ride` | `{ rideId }` | Driver starts the ride |
| `complete_ride` | `{ rideId }` | Driver completes ride |

### Server → Client Events

| Event | Payload | Description |
|-------|---------|-------------|
| `ride_searching` | `{ rideId, status }` | Ride search started |
| `driver_found` | `{ rideId, driverId }` | Driver assigned |
| `driver_location_update` | `{ rideId, location }` | Real-time driver location |
| `no_driver_found` | `{ rideId }` | No drivers available |
| `ride_cancelled_by_driver` | `{ rideId }` | Driver cancelled |

### Server → Driver Events

| Event | Payload | Description |
|-------|---------|-------------|
| `ride_request` | `{ rideId, pickupLocation, destinationLocation, distance, eta, pricing, timeout }` | New ride request |
| `ride_accepted_confirmed` | `{ rideId, status }` | Accept confirmed |
| `ride_rejected_confirmed` | `{ rideId }` | Reject confirmed |
| `ride_timeout` | `{ rideId }` | Request timed out |
| `ride_cancelled_by_client` | `{ rideId }` | Client cancelled |

## 🔄 Ride Lifecycle

```
searching → assigned → accepted → driver_arrived → in_progress → completed
    ↓           ↓           ↓            ↓              ↓            ↓
   cancel      timeout    cancel      cancel         cancel       cancel
no_driver
```

## 🎯 Matching Algorithm

1. **Client requests ride** → Status: `searching`
2. **Find available drivers** sorted by distance to pickup
3. **Send to closest driver** (15 second timeout)
4. **If timeout/reject** → Move to next closest driver
5. **If accept** → Atomically assign, mark driver busy
6. **If no driver** → Status: `no_driver_found`

## 🔔 Push Notifications

### Driver Notifications
- **New Ride Request** - When offline/app backgrounded

### Client Notifications
- **Driver Found** - When assigned
- **No Drivers** - When matching fails
- **Driver Arrived** - At pickup location
- **Ride Cancelled** - By driver

## 🔐 Authentication

All socket connections require JWT token in `socket.handshake.auth.token`.

## 📊 Driver Pool

In-memory Map structure:
```typescript
{
  driverId: {
    driverId: string,
    socketId: string,
    location: { lat, lng, heading, timestamp },
    isOnline: boolean,
    isBusy: boolean,
    vehicleType: string,
    fcmToken?: string
  }
}
```

## 🚀 Usage

### Driver Coming Online
```javascript
socket.emit('driver_online', {
  location: { lat: 36.7538, lng: 3.0588 },
  vehicleType: 'truck',
  fcmToken: 'ExponentPushToken[xxx]'
});
```

### Client Requesting Ride
```javascript
socket.emit('request_ride', {
  pickupLocation: { lat, lng, address },
  destinationLocation: { lat, lng, address },
  vehicleType: 'truck',
  pricing: { basePrice, distancePrice, totalPrice },
  distance: { clientToDestination },
  eta: { clientToDestination }
});
```

### Driver Accepting Ride
```javascript
socket.emit('accept_ride', { rideId: 'RIDE-XXX' });
```

## 📝 REST API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/rides/active` | Get current active ride |
| GET | `/api/rides/:rideId` | Get ride by ID |
| GET | `/api/rides/history` | Get ride history |

## ⚡ Performance Features

- **In-memory driver pool** - O(1) lookups
- **Sequential matching** - No broadcast storms
- **Atomic assignment** - Prevents double booking
- **Redis persistence** - Survives restarts
- **Async push notifications** - Non-blocking
- **Socket room isolation** - Efficient broadcasting

## 🔧 Environment Variables

```env
PORT=8000
MONGO_URI=mongodb://...
REDIS_URL=redis://...
JWT_SECRET=...
JWT_REFRESH_SECRET=...
```

## 🧪 Testing

Run the development server:
```bash
npm run dev
```

Socket connection test:
```javascript
const socket = io('http://localhost:8000', {
  auth: { token: 'JWT_TOKEN_HERE' }
});
```
