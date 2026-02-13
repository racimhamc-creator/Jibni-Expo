# Jibni - Ride-Sharing/Delivery App

A full-stack ride-sharing and delivery application similar to Uber/Yassir, built with React Native Expo and Node.js.

## Features

- **Dual User Roles**: Clients (passengers) and Drivers (servers)
- **Real-time Location Tracking**: Drivers share location via WebSocket
- **Mission/Ride Requests**: Clients request rides, drivers accept/reject
- **Nearby Driver Search**: Find available drivers within 100km radius
- **ETA & Pricing**: Calculated using Google Maps API
- **Driver Availability Toggle**: Drivers can go online/offline
- **Mission Lifecycle**: Request → Accept → In Progress → Complete
- **OTP Authentication**: Phone number + SMS verification
- **Driver Registration**: Upload driving license and vehicle documents
- **Push Notifications**: FCM for mission updates

## Tech Stack

### Frontend
- React Native Expo (managed workflow)
- TypeScript
- Expo Router (file-based routing)
- React Query / TanStack Query
- Zustand (state management)
- Socket.io-client
- React Native Maps
- Expo Location
- Expo Notifications

### Backend
- Node.js + Express.js
- TypeScript
- MongoDB + Mongoose
- Socket.io (WebSocket)
- Redis (caching + real-time location)
- JWT (authentication)
- Google Maps API
- Twilio / AWS SNS (SMS)

## Project Structure

```
jibni-app/
├── Frontend/          # React Native Expo App
│   ├── app/          # Expo Router (file-based routing)
│   ├── components/   # Reusable components
│   ├── hooks/        # Custom React hooks
│   ├── services/     # API client, Socket client, storage
│   ├── stores/       # Zustand stores
│   └── types/        # TypeScript types
│
└── Backend/          # Express.js Backend
    ├── src/
    │   ├── config/   # Database, Redis, Socket setup
    │   ├── models/   # MongoDB models
    │   ├── routes/   # API routes
    │   ├── controllers/ # Route controllers
    │   ├── services/ # Business logic
    │   ├── middleware/ # Auth, error handling
    │   └── utils/    # Helper functions
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- MongoDB Atlas account or local MongoDB
- Redis (local or cloud)
- Google Maps API key
- Twilio account (for SMS) - optional for development
- Expo CLI (`npm install -g expo-cli`)

### Backend Setup

1. Navigate to the backend directory:
```bash
cd Backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

4. Fill in your environment variables in `.env`

5. Start the development server:
```bash
npm run dev
```

The backend will run on `http://localhost:8000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd Frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file (or use Expo's environment variables):
```bash
EXPO_PUBLIC_API_URL=http://localhost:8000
EXPO_PUBLIC_SOCKET_URL=http://localhost:8000
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your-api-key
```

4. Start the Expo development server:
```bash
npm start
```

5. Scan the QR code with Expo Go app (iOS/Android) or press `i` for iOS simulator / `a` for Android emulator

## API Endpoints

### Authentication
- `POST /api/auth/send-otp` - Send OTP to phone
- `POST /api/auth/verify-otp` - Verify OTP & login
- `POST /api/auth/refresh-token` - Refresh JWT token
- `POST /api/auth/logout` - Logout

### Drivers
- `GET /api/drivers/nearby` - Find nearby drivers
- `POST /api/drivers/toggle-availability` - Toggle online/offline
- `POST /api/drivers/register` - Register as driver
- `GET /api/drivers/status` - Check driver status

### Missions
- `POST /api/missions/request` - Request a ride
- `POST /api/missions/:id/accept` - Driver accepts mission
- `POST /api/missions/:id/reject` - Driver rejects mission
- `POST /api/missions/:id/complete` - Complete mission
- `POST /api/missions/:id/cancel` - Cancel mission
- `GET /api/missions/active` - Get active mission
- `GET /api/missions/history` - Mission history

### Users
- `GET /api/users/me` - Get current user
- `PUT /api/users/me` - Update profile
- `POST /api/users/fcm-token` - Update FCM token

## Socket.io Events

### Server Namespace (`/server`)
- `heartbeat` - Driver sends location update
- `connection_established` - Server confirms connection

### Missions Namespace (`/missions`)
- `mission_request` - Client requests a ride
- `new_mission` - Driver receives new mission request
- `mission_response` - Driver accepts/rejects mission
- `mission_accepted` - Client receives acceptance
- `mission_rejected` - Client receives rejection
- `mission_completed` - Mission completed notification

## Database Schema

See the architecture document for detailed schema information.

## Development

### Backend
- Uses ES modules (`"type": "module"` in package.json)
- TypeScript with strict mode
- Hot reload with `tsx watch`

### Frontend
- Expo Router for navigation
- TypeScript throughout
- React Query for data fetching
- Zustand for state management

## Environment Variables

See `.env.example` files in both Frontend and Backend directories for required environment variables.

## License

MIT
