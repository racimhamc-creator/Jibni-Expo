# Admin Dashboard Access

## Secret Path Protection

The admin dashboard is protected by a secret path instead of authentication.

## Access URL

To access the admin dashboard, use this URL format:

```
http://your-domain.com/4648494fd8f9dsf4sgfgdsfsdsdf/dashboard
```

## Available Routes

All admin routes require the secret path prefix:

- Dashboard: `/4648494fd8f9dsf4sgfgdsfsdsdf/dashboard`
- Users: `/4648494fd8f9dsf4sgfgdsfsdsdf/users`
- Sponsors: `/4648494fd8f9dsf4sgfgdsfsdsdf/sponsors`
- Events: `/4648494fd8f9dsf4sgfgdsfsdsdf/events`
- Tickets: `/4648494fd8f9dsf4sgfgdsfsdsdf/tickets`
- Casting: `/4648494fd8f9dsf4sgfgdsfsdsdf/casting`
- Advertisements: `/4648494fd8f9dsf4sgfgdsfsdsdf/advertisements`
- Reels: `/4648494fd8f9dsf4sgfgdsfsdsdf/reels`
- Settings: `/4648494fd8f9dsf4sgfgdsfsdsdf/settings`

## Public Routes (No Secret Required)

- Landing Page: `/landing` or `/download`

## Changing the Secret Path

To change the secret path, edit `src/config/routes.js`:

```javascript
export const ADMIN_SECRET_PATH = 'your-new-secret-code-here';
```

After changing, rebuild the app for changes to take effect.

## Security Note

⚠️ **This is NOT a secure authentication method.** It's only obscurity-based security. Anyone who knows the secret path can access the dashboard. Use this only for temporary access or in combination with other security measures (IP whitelisting, VPN, etc.).

