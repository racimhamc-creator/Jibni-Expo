/**
 * Phone number utility functions for Algerian phone numbers
 * Normalizes all phone numbers to +213 international format
 */

/**
 * Normalizes an Algerian phone number to +213 international format
 * 
 * @param phone - The phone number string (with or without prefix)
 * @returns The normalized phone number in +213XXXXXXXXX format
 * 
 * Examples:
 * - "0777551777" → "+213777551777"
 * - "555777719" → "+213555777719"
 * - "+213777551777" → "+213777551777"
 * - "+213 777 551 777" → "+213777551777"
 * - "00213777551777" → "+213777551777"
 */
export function normalizeAlgerianPhoneNumber(phone: string): string {
  if (!phone) return '';
  
  // Remove all non-digit characters
  let digits = phone.replace(/\D/g, '');
  
  // Handle different prefix formats
  if (digits.startsWith('213')) {
    // Already has 213 prefix (e.g., "213777551777")
    digits = digits.substring(3);
  } else if (digits.startsWith('00213')) {
    // Has 00213 prefix (e.g., "00213777551777")
    digits = digits.substring(5);
  } else if (digits.startsWith('0')) {
    // Has leading 0 (e.g., "0777551777")
    digits = digits.substring(1);
  }
  
  // Ensure we have exactly 9 digits for Algerian mobile numbers
  if (digits.length !== 9) {
    console.warn(`⚠️ Phone number has ${digits.length} digits, expected 9: ${phone}`);
  }
  
  // Return in +213 format
  return `+213${digits}`;
}

/**
 * Checks if a phone number is a valid Algerian mobile number
 * @param phone - The phone number to validate
 * @returns true if valid Algerian mobile number
 */
export function isValidAlgerianPhoneNumber(phone: string): boolean {
  const normalized = normalizeAlgerianPhoneNumber(phone);
  // Algerian mobile numbers are 9 digits starting with 5, 6, or 7
  return /^\+213[567]\d{8}$/.test(normalized);
}

/**
 * Formats a phone number for display (adds spaces every 3 digits)
 * @param phone - The phone number (normalized or not)
 * @returns Formatted phone number for display
 */
export function formatPhoneNumberForDisplay(phone: string): string {
  const normalized = normalizeAlgerianPhoneNumber(phone);
  // Remove + for formatting
  const digits = normalized.replace('+213', '');
  // Add spaces every 3 digits: XXX XXX XXX
  return digits.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3');
}

export default {
  normalizeAlgerianPhoneNumber,
  isValidAlgerianPhoneNumber,
  formatPhoneNumberForDisplay,
};
