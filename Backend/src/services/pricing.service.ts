/**
 * Algeria Towing Pricing Service
 * MVP Pricing Rules:
 * - Base fare: 1500 DA
 * - Price per km: 50 DA
 * - Minimum fare: 1500 DA
 * 
 * Formula:
 *   calculated_price = base_fare + (distance_km * price_per_km)
 *   final_price = max(calculated_price, minimum_fare)
 *   Round to nearest integer
 */

// Algeria Towing Pricing Configuration
// Easy to adjust later for surge, vehicle type, time, etc.
const PRICING_CONFIG = {
  baseFare: 4000,        // DA - Base fare for any towing service
  pricePerKm: 120,        // DA per km
  minimumFare: 4000,     // DA - Minimum charge
  currency: 'DZD',
};

export interface PricingResult {
  basePrice: number;
  distancePrice: number;
  totalPrice: number;
  currency: string;
  distanceKm: number;
}

/**
 * Calculate haversine distance between two coordinates
 * Returns distance in kilometers
 */
const calculateDistanceKm = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Calculate towing price based on distance between pickup and destination
 * 
 * @param pickupLat - Pickup location latitude
 * @param pickupLng - Pickup location longitude
 * @param destLat - Destination latitude
 * @param destLng - Destination longitude
 * @returns PricingResult with basePrice, distancePrice, totalPrice
 */
export const calculatePricing = (
  pickupLat: number,
  pickupLng: number,
  destLat: number,
  destLng: number
): PricingResult => {
  // Calculate distance in km
  const distanceKm = calculateDistanceKm(pickupLat, pickupLng, destLat, destLng);

  // Apply pricing formula
  const distancePrice = distanceKm * PRICING_CONFIG.pricePerKm;
  const calculatedPrice = PRICING_CONFIG.baseFare + distancePrice;
  const finalPrice = Math.max(calculatedPrice, PRICING_CONFIG.minimumFare);

  return {
    basePrice: Math.round(PRICING_CONFIG.baseFare),
    distancePrice: Math.round(distancePrice),
    totalPrice: Math.round(finalPrice),
    currency: PRICING_CONFIG.currency,
    distanceKm: Math.round(distanceKm * 100) / 100, // 2 decimal places
  };
};

/**
 * Calculate price from distance in meters (for when distance is already known)
 * 
 * @param distanceMeters - Distance in meters
 * @returns PricingResult
 */
export const calculatePricingFromDistance = (
  distanceMeters: number
): Omit<PricingResult, 'distanceKm'> => {
  const distanceKm = distanceMeters / 1000;
  
  const distancePrice = distanceKm * PRICING_CONFIG.pricePerKm;
  const calculatedPrice = PRICING_CONFIG.baseFare + distancePrice;
  const finalPrice = Math.max(calculatedPrice, PRICING_CONFIG.minimumFare);

  return {
    basePrice: Math.round(PRICING_CONFIG.baseFare),
    distancePrice: Math.round(distancePrice),
    totalPrice: Math.round(finalPrice),
    currency: PRICING_CONFIG.currency,
  };
};

/**
 * Update pricing configuration (for surge pricing, vehicle types, etc.)
 * This can be called from an admin endpoint to adjust prices dynamically
 */
export const updatePricingConfig = (config: Partial<typeof PRICING_CONFIG>): void => {
  Object.assign(PRICING_CONFIG, config);
};

/**
 * Get current pricing configuration
 */
export const getPricingConfig = () => ({ ...PRICING_CONFIG });

export default {
  calculatePricing,
  calculatePricingFromDistance,
  updatePricingConfig,
  getPricingConfig,
};
