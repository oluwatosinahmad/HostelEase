import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import db from '../db';

const JWT_SECRET = process.env.AUTH_JWT_SECRET || 'hostel-ease-jwt-secure-secret-key-2026';

export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  role: 'STUDENT' | 'PROVIDER' | 'ADMIN';
  phone?: string;
  isActive: number;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export function generateToken(user: AuthenticatedUser): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication token required' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedUser;
    
    // Check if user still exists and is active
    const user = db.prepare('SELECT id, email, full_name as fullName, role, phone, is_active as isActive FROM users WHERE id = ?').get(decoded.id) as AuthenticatedUser | undefined;
    
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'User account not found or disabled' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired authentication token' });
  }
}

export const requireAuth = authenticate;

export function optionalAuthenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedUser;
    const user = db.prepare('SELECT id, email, full_name as fullName, role, phone, is_active as isActive FROM users WHERE id = ?').get(decoded.id) as AuthenticatedUser | undefined;
    if (user && user.isActive) {
      req.user = user;
    }
  } catch (err) {
    // Ignore optional auth failure
  }
  next();
}

export function requireRole(...roles: any[]) {
  const flattenedRoles = roles.flat();
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!flattenedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: `Access denied. Requires one of: ${flattenedRoles.join(', ')}` });
    }
    next();
  };
}

export const ROLE_DEFAULT_PERMISSIONS: Record<string, string[]> = {
  SUPER_ADMIN: ['*'],
  ADMIN: [
    'users.view', 'users.manage', 'providers.view', 'providers.manage',
    'hostels.view', 'hostels.manage', 'verification.review',
    'bookings.view', 'bookings.manage', 'payments.view', 'refunds.manage',
    'reports.manage', 'reviews.moderate', 'inspections.view', 'analytics.view',
    'settings.manage', 'audit_logs.view', 'announcements.manage', 'support.manage',
    'system_health.view'
  ],
  VERIFICATION_ADMIN: [
    'verification.review', 'hostels.view', 'hostels.manage', 'providers.view',
    'inspections.view', 'audit_logs.view'
  ],
  SUPPORT_ADMIN: [
    'support.manage', 'reports.manage', 'users.view', 'bookings.view',
    'inspections.view', 'audit_logs.view'
  ],
  FINANCE_ADMIN: [
    'payments.view', 'refunds.manage', 'analytics.view', 'audit_logs.view', 'bookings.view'
  ],
  MODERATION_ADMIN: [
    'reviews.moderate', 'reports.manage', 'hostels.view', 'hostels.manage', 'audit_logs.view'
  ]
};

export function requirePermission(permission: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied: Requires administrator privileges' });
    }

    try {
      const profile = db.prepare('SELECT * FROM admin_profiles WHERE user_id = ?').get(req.user.id) as any;
      
      let effectiveRole = profile?.admin_role || 'ADMIN';
      let customPermissions: string[] = [];
      try {
        if (profile?.permissions_json) {
          customPermissions = JSON.parse(profile.permissions_json);
        }
      } catch (e) {
        customPermissions = [];
      }

      if (profile?.is_super_admin || effectiveRole === 'SUPER_ADMIN') {
        return next();
      }

      const rolePerms = ROLE_DEFAULT_PERMISSIONS[effectiveRole] || [];
      const combined = new Set([...rolePerms, ...customPermissions]);

      if (combined.has('*') || combined.has(permission)) {
        return next();
      }

      return res.status(403).json({ 
        error: `Access denied: Requires permission '${permission}'. Role '${effectiveRole}' lacks this capability.` 
      });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to verify admin permission: ' + err.message });
    }
  };
}

