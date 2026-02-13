const BASE_PRICE = 5.0;
const PRICE_PER_KM = 2.5;

export const calculatePricing = (distanceKm: number): {
  basePrice: number;
  distancePrice: number;
  totalPrice: number;
  currency: string;
} => {
  const distancePrice = distanceKm * PRICE_PER_KM;
  const totalPrice = BASE_PRICE + distancePrice;

  return {
    basePrice: BASE_PRICE,
    distancePrice: Math.round(distancePrice * 100) / 100,
    totalPrice: Math.round(totalPrice * 100) / 100,
    currency: 'USD',
  };
};
