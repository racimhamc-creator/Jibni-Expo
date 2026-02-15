/**
 * Sanitize user input to prevent XSS attacks and injection
 * @param {string} input - The input string to sanitize
 * @param {string} type - The type of input (text, email, phone, etc.)
 * @returns {string} - Sanitized string
 */
export const sanitizeInput = (input, type = 'text') => {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Remove HTML tags and scripts
  let sanitized = input.replace(/<[^>]*>/g, '');
  
  // Remove script tags and event handlers
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/javascript:/gi, '');
  sanitized = sanitized.replace(/data:text\/html/gi, '');
  
  // Remove null bytes and control characters (except newlines and tabs for some fields)
  sanitized = sanitized.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');
  
  // Trim whitespace
  sanitized = sanitized.trim();
  
  // Type-specific sanitization
  switch (type) {
    case 'email':
      // Keep only valid email characters
      sanitized = sanitized.replace(/[^a-zA-Z0-9@._-]/g, '');
      break;
      
    case 'phone':
      // Keep only digits, +, -, spaces, and parentheses
      sanitized = sanitized.replace(/[^\d+\-()\s]/g, '');
      break;
      
    case 'username':
      // Keep only alphanumeric, underscore, dot, and hyphen
      sanitized = sanitized.replace(/[^a-zA-Z0-9._-]/g, '');
      break;
      
    case 'password':
      // Allow most characters for passwords, but remove HTML/script tags
      // Passwords should allow special characters for strength
      break;
      
    case 'text':
    default:
      // Remove potentially dangerous characters but keep most text
      sanitized = sanitized.replace(/[<>]/g, '');
      break;
  }
  
  return sanitized;
};

/**
 * Sanitize and validate email format
 * @param {string} email - Email to sanitize
 * @returns {string} - Sanitized email
 */
export const sanitizeEmail = (email) => {
  return sanitizeInput(email, 'email');
};

/**
 * Sanitize phone number
 * @param {string} phone - Phone number to sanitize
 * @returns {string} - Sanitized phone number
 */
export const sanitizePhone = (phone) => {
  return sanitizeInput(phone, 'phone');
};

/**
 * Sanitize username
 * @param {string} username - Username to sanitize
 * @returns {string} - Sanitized username
 */
export const sanitizeUsername = (username) => {
  return sanitizeInput(username, 'username');
};

/**
 * Sanitize text input (names, etc.)
 * @param {string} text - Text to sanitize
 * @returns {string} - Sanitized text
 */
export const sanitizeText = (text) => {
  return sanitizeInput(text, 'text');
};

/**
 * Escape HTML entities to prevent XSS
 * @param {string} str - String to escape
 * @returns {string} - Escaped string
 */
export const escapeHtml = (str) => {
  if (!str || typeof str !== 'string') {
    return '';
  }
  
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  
  return str.replace(/[&<>"']/g, (m) => map[m]);
};

