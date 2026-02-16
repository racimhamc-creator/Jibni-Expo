import axios from 'axios';

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

// Algeria Towing Pricing Configuration
const PRICING_CONFIG = {
  basePrice: 2500,              // DZD - Base price for any service
  pickupSurchargeRate: 40,      // DZD per km if pickup > trip distance
  currency: 'DZD',
};

// Distance tiers (progressive pricing)
const DISTANCE_TIERS = [
  { limit: 20, rate: 110 },    // 0-20 km: 110 DZD/km
  { limit: 50, rate: 90 },     // 20-50 km: 90 DZD/km
  { limit: 110, rate: 75 },    // 50-110 km: 75 DZD/km
  { limit: 200, rate: 50 },    // 110-200 km: 50 DZD/km
  { limit: Infinity, rate: 35 }, // 200+ km: 35 DZD/km
];

// Paid holidays (MM-DD format)
const PAID_HOLIDAYS = [
  '01-01', // New Year
  '05-01', // Labor Day
  '11-01', // Revolution Day
  '07-05', // Independence Day
];

export interface PricingResult {
  basePrice: number;
  distancePrice: number;
  weekendSurcharge: number;
  nightSurcharge: number;
  totalPrice: number;
  currency: string;
  distanceKm: number;
  pickupDistanceKm: number;
  tripDistanceKm: number;
}

export interface DistanceResult {
  distance: number; // in meters
  duration: number; // in seconds
}

/**
 * Get distance and duration using Google Maps API with Haversine fallback
 */
export async function getDistanceDuration(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number
): Promise<DistanceResult> {
  try {
    // Try Google Maps Directions API first
    if (GOOGLE_MAPS_API_KEY) {
      const response = await axios.get(
        'https://maps.googleapis.com/maps/api/directions/json',
        {
          params: {
            origin: `${originLat},${originLng}`,
            destination: `${destLat},${destLng}`,
            mode: 'driving',
            key: GOOGLE_MAPS_API_KEY,
          },
          timeout: 5000,
        }
      );

      if (response.data.routes && response.data.routes.length > 0) {
        const leg = response.data.routes[0].legs[0];
        return {
          distance: leg.distance.value, // in meters
          duration: leg.duration.value, // in seconds
        };
      }
    }
  } catch (error) {
    console.log('Google Maps API failed, using Haversine fallback');
  }

  // Fallback: Haversine formula
  const distance = haversineDistance(originLat, originLng, destLat, destLng);
  // Estimate duration at 50km/h average speed
  const duration = (distance / 50000) * 3600; // seconds

  return { distance, duration };
}

/**
 * Haversine formula to calculate straight-line distance between two points
 */
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in meters
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Calculate distance price using progressive tier pricing
 */
function calculateDistancePrice(distanceKm: number): number {
  let price = 0;
  let remainingDistance = distanceKm;
  let previousLimit = 0;

  for (const tier of DISTANCE_TIERS) {
    if (remainingDistance <= 0) break;

    const tierDistance = Math.min(remainingDistance, tier.limit - previousLimit);
    price += tierDistance * tier.rate;
    remainingDistance -= tierDistance;
    previousLimit = tier.limit;
  }

  return price;
}

/**
 * Check if today is a weekend or holiday (for surcharge)
 */
function isWeekendOrHoliday(date: Date = new Date()): boolean {
  const weekday = date.getDay();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const today = `${month}-${day}`;

  // Friday (5) or Saturday (6) or Paid holiday
  return weekday === 5 || weekday === 6 || PAID_HOLIDAYS.includes(today);
}

/**
 * Check if current time is night (for surcharge)
 * Summer (June-November): Night = 21:00 - 06:00
 * Winter (December-May): Night = 19:00 - 07:00
 */
function isNightTime(date: Date = new Date()): boolean {
  const hour = date.getHours();
  const month = date.getMonth() + 1; // 1-12

  // Summer (June-November): Night = 21:00 - 06:00
  if (month >= 6 && month <= 11) {
    return hour >= 21 || hour < 6;
  }

  // Winter (December-May): Night = 19:00 - 07:00
  return hour >= 19 || hour < 7;
}

/**
 * Calculate comprehensive towing price with all rules
 * 
 * @param pickupDistance - Distance from driver to pickup (in meters)
 * @param tripDistance - Distance from pickup to destination (in meters)
 * @param date - Date for weekend/holiday/night calculations (default: now)
 * @returns PricingResult with breakdown
 */
export function calculateComprehensivePricing(
  pickupDistance: number,
  tripDistance: number,
  date: Date = new Date()
): PricingResult {
  // Convert to kilometers
  const pickupDistanceKm = pickupDistance / 1000;
  const tripDistanceKm = tripDistance / 1000;

  // Start with base price
  let price = PRICING_CONFIG.basePrice;
  let distanceForPricing = tripDistanceKm;

  // Rule 1: Pickup distance adjustment
  let pickupSurcharge = 0;
  if (pickupDistanceKm > tripDistanceKm) {
    // +40 DZD per km for long pickup
    pickupSurcharge = pickupDistanceKm * PRICING_CONFIG.pickupSurchargeRate;
    price += pickupSurcharge;
    distanceForPricing -= pickupDistanceKm; // Don't double-count pickup km
  } else if (pickupDistanceKm < tripDistanceKm) {
    distanceForPricing -= pickupDistanceKm; // Remove pickup from trip distance
  }

  // Ensure distance for pricing is not negative
  distanceForPricing = Math.max(0, distanceForPricing);

  // Rule 2: Trip distance pricing (progressive tiers)
  const distancePrice = calculateDistancePrice(distanceForPricing);
  price += distancePrice;

  // Rule 3: Weekend/Holiday surcharge (+30% if distance < 80km)
  let weekendSurcharge = 0;
  const totalDistanceKm = pickupDistanceKm + tripDistanceKm;
  if (isWeekendOrHoliday(date) && totalDistanceKm < 80) {
    weekendSurcharge = price * 0.30;
    price += weekendSurcharge;
  }

  // Rule 4: Night surcharge (+20%)
  let nightSurcharge = 0;
  if (isNightTime(date)) {
    nightSurcharge = price * 0.20;
    price += nightSurcharge;
  }

  return {
    basePrice: PRICING_CONFIG.basePrice,
    distancePrice: Math.round(distancePrice + pickupSurcharge),
    weekendSurcharge: Math.round(weekendSurcharge),
    nightSurcharge: Math.round(nightSurcharge),
    totalPrice: Math.round(price),
    currency: PRICING_CONFIG.currency,
    distanceKm: Math.round(totalDistanceKm * 100) / 100,
    pickupDistanceKm: Math.round(pickupDistanceKm * 100) / 100,
    tripDistanceKm: Math.round(tripDistanceKm * 100) / 100,
  };
}

/**
 * Calculate pricing using driver location (full pricing)
 * This is the main function to use when creating a ride
 */
export async function calculatePricing(
  driverLat: number,
  driverLng: number,
  pickupLat: number,
  pickupLng: number,
  destLat: number,
  destLng: number,
  date: Date = new Date()
): Promise<PricingResult> {
  // Get distances
  const [pickupResult, tripResult] = await Promise.all([
    getDistanceDuration(driverLat, driverLng, pickupLat, pickupLng),
    getDistanceDuration(pickupLat, pickupLng, destLat, destLng),
  ]);

  return calculateComprehensivePricing(
    pickupResult.distance,
    tripResult.distance,
    date
  );
}

/**
 * Legacy: Calculate pricing from pickup to destination only (for backwards compatibility)
 * Uses simple pricing without pickup distance consideration
 */
export function calculateSimplePricing(
  pickupLat: number,
  pickupLng: number,
  destLat: number,
  destLng: number
): Omit<PricingResult, 'pickupDistanceKm'> {
  const tripDistanceKm = haversineDistance(pickupLat, pickupLng, destLat, destLng) / 1000;
  const distancePrice = tripDistanceKm * 110; // Simple rate: 110 DZD/km
  const totalPrice = PRICING_CONFIG.basePrice + distancePrice;

  return {
    basePrice: PRICING_CONFIG.basePrice,
    distancePrice: Math.round(distancePrice),
    weekendSurcharge: 0,
    nightSurcharge: 0,
    totalPrice: Math.round(totalPrice),
    currency: PRICING_CONFIG.currency,
    distanceKm: Math.round(tripDistanceKm * 100) / 100,
    tripDistanceKm: Math.round(tripDistanceKm * 100) / 100,
  };
}

/**
 * Calculate price from distance in meters (for when distance is already known)
 * Uses simple pricing without surcharges
 */
export function calculatePricingFromDistance(
  distanceMeters: number
): Pick<PricingResult, 'basePrice' | 'distancePrice' | 'totalPrice' | 'currency'> {
  const distanceKm = distanceMeters / 1000;
  const distancePrice = calculateDistancePrice(distanceKm);
  const totalPrice = PRICING_CONFIG.basePrice + distancePrice;

  return {
    basePrice: PRICING_CONFIG.basePrice,
    distancePrice: Math.round(distancePrice),
    totalPrice: Math.round(totalPrice),
    currency: PRICING_CONFIG.currency,
  };
}

/**
 * Update pricing configuration (for surge pricing, vehicle types, etc.)
 */
export function updatePricingConfig(config: Partial<typeof PRICING_CONFIG>): void {
  Object.assign(PRICING_CONFIG, config);
}

/**
 * Get current pricing configuration
 */
export function getPricingConfig() {
  return { ...PRICING_CONFIG };
}

export default {
  calculatePricing,
  calculateSimplePricing,
  calculatePricingFromDistance,
  calculateComprehensivePricing,
  getDistanceDuration,
  updatePricingConfig,
  getPricingConfig,
  isWeekendOrHoliday,
  isNightTime,
};
