import axios from 'axios';

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const BASE_PRICE = 2500; // DZD
const PAID_HOLIDAYS = ['01-01', '05-01', '11-01', '07-05']; // New Year, Labor Day, Revolution Day, Independence Day

interface DistanceResult {
  distance: number; // in meters
  duration: number; // in seconds
}

export class PriceService {
  private distanceServerClient: number; // in km
  private distanceClientDest: number; // in km
  private distance: number; // total km
  private price: number;
  private today: string; // MM-DD format
  private now: Date;

  constructor(distanceServerClient: number, distanceClientDest: number) {
    // Convert meters to kilometers
    this.distanceServerClient = distanceServerClient / 1000;
    this.distanceClientDest = distanceClientDest / 1000;
    
    // Total distance (will be modified by pricing logic)
    this.distance = this.distanceServerClient + this.distanceClientDest;
    
    // Current date for holiday check (MM-DD format)
    this.today = this.getFormattedDate(new Date());
    
    // Current time for day/night pricing
    this.now = new Date();
    
    // BASE PRICE: 2500 DZD
    this.price = BASE_PRICE;
  }

  private getFormattedDate(date: Date): string {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${month}-${day}`;
  }

  /**
   * Get distance and duration using Google Maps API with Haversine fallback
   */
  static async getDistanceDuration(
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
    const distance = this.haversineDistance(originLat, originLng, destLat, destLng);
    // Estimate duration at 50km/h average speed
    const duration = (distance / 50000) * 3600; // seconds
    
    return { distance, duration };
  }

  /**
   * Haversine formula to calculate straight-line distance between two points
   */
  private static haversineDistance(
    lat1: number, 
    lon1: number, 
    lat2: number, 
    lon2: number
  ): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in meters
  }

  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Rule 1: Distance-based pricing
   */
  private distancePrice(): void {
    // Pickup distance adjustment
    if (this.distanceServerClient > this.distanceClientDest) {
      this.price += this.distanceServerClient * 40; // +40 DZD per km for long pickup
      this.distance -= this.distanceServerClient; // Don't double-count pickup km
    } else if (this.distanceServerClient < this.distanceClientDest) {
      this.distance -= this.distanceServerClient; // Remove pickup from trip distance
    }

    // Trip distance tiers (progressive pricing)
    if (this.distance > 200) {
      this.price += ((20 * 110) + (30 * 90) + (60 * 75) + (90 * 50) + ((this.distance - 200) * 35));
    } else if (this.distance > 110) {
      this.price += ((20 * 110) + (30 * 90) + (60 * 75) + ((this.distance - 110) * 50));
    } else if (this.distance > 50) {
      this.price += ((20 * 110) + (30 * 90) + ((this.distance - 50) * 75));
    } else if (this.distance > 20) {
      this.price += ((20 * 110) + ((this.distance - 20) * 90));
    } else {
      this.price += this.distance * 110;
    }
  }

  /**
   * Rule 2: Weekend/Holiday surcharge (+30%)
   */
  private weekendPrice(): void {
    const weekday = this.now.getDay(); // 0 = Sunday, 4 = Thursday, 5 = Friday, 6 = Saturday
    
    // Friday (5) or Saturday (6) or Paid holiday, AND total distance < 80 km
    if ((weekday === 5 || weekday === 6 || PAID_HOLIDAYS.includes(this.today)) && this.distance < 80) {
      this.price = this.price + (this.price * 30 / 100);
    }
  }

  /**
   * Rule 3: Night surcharge (+20%)
   * Summer (June-November): Night = 21:00 - 06:00
   * Winter (December-May): Night = 19:00 - 07:00
   */
  private dayNightPrice(): void {
    const hour = this.now.getHours();
    const month = this.now.getMonth() + 1; // 1-12

    const isNight = 
      (month >= 6 && month <= 11 && (hour >= 21 || hour < 6)) || // Summer: 21:00 - 06:00
      ((month < 6 || month === 12) && (hour >= 19 || hour < 7));  // Winter: 19:00 - 07:00

    if (isNight) {
      this.price = this.price + (this.price * 20 / 100);
    }
  }

  /**
   * Calculate total price by applying all rules in order
   */
  public computeTotal(): number {
    this.distancePrice();
    this.weekendPrice();
    this.dayNightPrice();
    return Math.round(this.price * 100) / 100; // Round to 2 decimals
  }

  /**
   * Get price breakdown for transparency
   */
  public getPriceBreakdown(): {
    basePrice: number;
    distancePrice: number;
    weekendSurcharge: number;
    nightSurcharge: number;
    totalPrice: number;
    distanceKm: number;
    pickupDistanceKm: number;
    tripDistanceKm: number;
  } {
    const initialPrice = this.price;
    
    // Apply distance pricing
    this.distancePrice();
    const afterDistance = this.price;
    const distanceAmount = afterDistance - initialPrice;
    
    // Apply weekend pricing
    const beforeWeekend = this.price;
    this.weekendPrice();
    const weekendAmount = this.price - beforeWeekend;
    
    // Apply night pricing
    const beforeNight = this.price;
    this.dayNightPrice();
    const nightAmount = this.price - beforeNight;
    
    return {
      basePrice: BASE_PRICE,
      distancePrice: distanceAmount,
      weekendSurcharge: weekendAmount,
      nightSurcharge: nightAmount,
      totalPrice: Math.round(this.price * 100) / 100,
      distanceKm: Math.round((this.distanceServerClient + this.distanceClientDest) * 100) / 100,
      pickupDistanceKm: Math.round(this.distanceServerClient * 100) / 100,
      tripDistanceKm: Math.round(this.distanceClientDest * 100) / 100,
    };
  }

  /**
   * Static method to calculate price from coordinates
   */
  static async calculatePrice(
    driverLat: number,
    driverLng: number,
    pickupLat: number,
    pickupLng: number,
    destLat: number,
    destLng: number
  ): Promise<{
    price: number;
    breakdown: {
      basePrice: number;
      distancePrice: number;
      weekendSurcharge: number;
      nightSurcharge: number;
      totalPrice: number;
      distanceKm: number;
      pickupDistanceKm: number;
      tripDistanceKm: number;
    };
    distances: {
      pickup: number; // meters
      trip: number; // meters
      total: number; // meters
    };
  }> {
    // Get distances
    const pickupDistance = await this.getDistanceDuration(
      driverLat, driverLng,
      pickupLat, pickupLng
    );
    
    const tripDistance = await this.getDistanceDuration(
      pickupLat, pickupLng,
      destLat, destLng
    );

    // Calculate price
    const processor = new PriceService(pickupDistance.distance, tripDistance.distance);
    const price = processor.computeTotal();
    const breakdown = processor.getPriceBreakdown();

    return {
      price,
      breakdown,
      distances: {
        pickup: pickupDistance.distance,
        trip: tripDistance.distance,
        total: pickupDistance.distance + tripDistance.distance,
      },
    };
  }
}
