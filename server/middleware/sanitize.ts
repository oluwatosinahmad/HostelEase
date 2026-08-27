import { Request, Response, NextFunction } from 'express';

// Clean unsafe HTML and dangerous characters from strings
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') return input;

  return input
    // Remove script tags and contents
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove iframe tags
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    // Remove inline event handlers (onload, onclick, onerror, etc.)
    .replace(/on\w+\s*=\s*(['"]).*?\1/gi, '')
    .replace(/on\w+\s*=\s*[^>\s]+/gi, '')
    // Remove javascript: and data: pseudo-protocols
    .replace(/javascript\s*:/gi, '')
    .replace(/data\s*:\s*text\/html/gi, '')
    // Strip null bytes
    .replace(/\0/g, '')
    .trim();
}

function sanitizeObject(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return typeof obj === 'string' ? sanitizeString(obj) : obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  const cleanObj: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    cleanObj[key] = sanitizeObject(value);
  }
  return cleanObj;
}

export function sanitizeInputs(req: Request, res: Response, next: NextFunction) {
  try {
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body);
    }
    if (req.query && typeof req.query === 'object') {
      for (const key of Object.keys(req.query)) {
        try {
          (req.query as any)[key] = sanitizeObject((req.query as any)[key]);
        } catch {
          // ignore read-only query properties in Express 5
        }
      }
    }
    if (req.params && typeof req.params === 'object') {
      for (const key of Object.keys(req.params)) {
        try {
          (req.params as any)[key] = sanitizeObject((req.params as any)[key]);
        } catch {
          // ignore read-only params
        }
      }
    }
  } catch (err) {
    console.warn('Input sanitization skipped property:', err);
  }
  next();
}
