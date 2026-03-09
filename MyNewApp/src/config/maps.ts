export const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

if (!GOOGLE_MAPS_API_KEY) {
  console.warn('[maps] Missing EXPO_PUBLIC_GOOGLE_MAPS_API_KEY – Google services will fall back to straight-line calculations.');
}
