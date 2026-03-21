/**
 * Simple in-memory rate limiter for development and moderate loads.
 * For high production loads, use Redis.
 */

const rateLimits = new Map();

/**
 * Checks if a request should be rate limited.
 * @param {string} identifier - unique key (IP or Shop domain)
 * @param {number} limit - max requests in the window
 * @param {number} windowMs - window duration in ms
 * @returns {boolean} - true if allowed, false if limited
 */
export function checkRateLimit(identifier, limit = 10, windowMs = 60000) {
  const now = Date.now();
  const userData = rateLimits.get(identifier) || { count: 0, startTime: now };

  // Reset window if expired
  if (now - userData.startTime > windowMs) {
    userData.count = 1;
    userData.startTime = now;
  } else {
    userData.count++;
  }

  rateLimits.set(identifier, userData);

  if (userData.count > limit) {
    return false;
  }

  return true;
}

// Optional: Automatic cleanup of old entries every hour
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of rateLimits.entries()) {
        if (now - value.startTime > 3600000) { // 1 hour
            rateLimits.delete(key);
        }
    }
}, 3600000);
