# Jibni Admin Dashboard

A modern dark-themed React admin dashboard for managing users and driver requests.

## Features

- 👥 **Users Management**: View all users with their status and activity
- 🚗 **Driver Requests**: Approve or reject driver upgrade requests
- 🎨 **Modern Dark UI**: Beautiful gradient-based dark theme
- 📱 **Responsive Design**: Works on all screen sizes

## Setup

1. Install dependencies:
```bash
npm install
```

2. Update the API URL in `src/services/api.ts` if needed (currently set to `http://10.163.203.202:8000`)

3. Start the development server:
```bash
npm start
```

The dashboard will open at `http://localhost:3000`

## API Endpoints

The dashboard uses the following backend endpoints:
- `GET /api/v1/dashboard/clients/` - Get all users
- `GET /api/v1/dashboard/requests/` - Get all driver requests
- `PATCH /api/v1/dashboard/requests/<id>/` - Approve/reject requests

## Note

Currently, there's no authentication. Make sure to add authentication before deploying to production.
