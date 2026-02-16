# Admin Account Setup Guide

## Creating an Admin Account

### Option 1: Using npm script (Recommended)

```bash
cd Backend
npm run create-admin +213XXXXXXXXX
```

Example:
```bash
npm run create-admin +213555123456
```

### Option 2: Using shell script

```bash
cd Backend
./create-admin.sh +213XXXXXXXXX
```

### Option 3: Direct with tsx

```bash
cd Backend
npx tsx src/scripts/createAdmin.ts +213XXXXXXXXX
```

---

## Admin Login

Once the admin account is created:

1. Open the Jibni-Admin dashboard: `http://localhost:3000`
2. Go to `/login`
3. Enter the admin phone number
4. You'll receive an OTP (check your SMS or console logs in development)
5. Enter the OTP to login

---

## Making an Existing User an Admin

If you want to promote an existing user to admin:

```bash
npm run create-admin +213XXXXXXXXX
```

The script will automatically update the user's role to admin.

---

## Admin Features

The admin dashboard includes:

- **Servers (Drivers)**: Manage drivers, ban/unban, view stats
- **Clients**: Manage clients, view beneficiaire status
- **Driver Requests**: Approve/reject driver applications
- **Missions**: View all missions, track status
- **Reports**: Handle user reports
- **Fraud Alerts**: Monitor fraud detection
- **Statistics**: Analytics and charts
- **Server Status**: System monitoring

---

## API Endpoints

All admin endpoints are under `/api/v1/dashboard/` and require authentication:

| Endpoint | Description |
|----------|-------------|
| `GET /servers/` | List drivers |
| `GET /clients/` | List clients |
| `GET /requests/` | Driver requests |
| `GET /missions/` | List missions |
| `GET /stats/` | Dashboard stats |
| `POST /ban-user/` | Ban/unban users |

---

## Security Notes

- Admin tokens are stored in `localStorage` (for development)
- In production, consider using httpOnly cookies
- Admin routes check for `role === 'admin'`
- Always verify OTP for admin login
