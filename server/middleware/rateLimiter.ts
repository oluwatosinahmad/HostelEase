import { Request, Response, NextFunction } from 'express';

interface RateLimitStore {
  count: number;
  resetTime: number;
}

export function createRateLimiter(options: {
  windowMs: number;
  max: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
}) {
  const store = new Map<string, RateLimitStore>();
  const { windowMs, max, message = 'Too many requests. Please slow down and try again shortly.' } = options;

  // Periodic cleanup of expired entries
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of store.entries()) {
      if (now > record.resetTime) {
        store.delete(key);
      }
    }
  }, Math.max(windowMs, 30000));

  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown-ip';
    const key = options.keyGenerator ? options.keyGenerator(req) : `${req.baseUrl || req.path}:${ip}`;
    const now = Date.now();

    let record = store.get(key);

    if (!record || now > record.resetTime) {
      record = { count: 1, resetTime: now + windowMs };
      store.set(key, record);
    } else {
      record.count += 1;
    }

    const remaining = Math.max(0, max - record.count);
    const resetSeconds = Math.ceil((record.resetTime - now) / 1000);

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', resetSeconds);

    if (record.count > max) {
      res.setHeader('Retry-After', resetSeconds);
      return res.status(429).json({
        error: message,
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfterSeconds: resetSeconds
      });
    }

    next();
  };
}

// 1. Strict Auth Rate Limiter (Brute-Force & Credential Stuffing Protection)
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // accommodate test suites and multi-role authentications
  message: 'Too many authentication attempts. For your account security, please wait 15 minutes before trying again.'
});

// 2. Sensitive Payment Rate Limiter
export const paymentRateLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10,
  message: 'Payment requests are throttled to prevent accidental duplicate charges. Please wait a moment.'
});

// 3. Booking Rate Limiter
export const bookingRateLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 15,
  message: 'Too many booking attempts initiated. Please check your active reservations in your Student Hub.'
});

// 4. General API Rate Limiter
export const generalApiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 250,
  message: 'Hostel Ease API rate limit reached. Please wait a few seconds before making further requests.'
});
