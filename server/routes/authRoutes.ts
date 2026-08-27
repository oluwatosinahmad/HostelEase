import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import db from '../db';
import { authenticate, generateToken, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// 1. Register User (Student or Provider only - No Public Admin Registration)
router.post('/register', (req, res: Response) => {
  const { email, password, fullName, phone, role, studentDetails, providerDetails } = req.body;

  if (!email || !password || !fullName || !role) {
    return res.status(400).json({ error: 'Email, password, full name, and role are required' });
  }

  // Security Rule: Public Admin Registration is STRICTLY FORBIDDEN
  if (role === 'ADMIN' || role === 'OWNER') {
    return res.status(403).json({ 
      error: 'PUBLIC_ADMIN_REGISTRATION_FORBIDDEN',
      message: 'Admin accounts cannot be registered publicly. Only an authorized Super Admin can provision administrative accounts.' 
    });
  }

  if (!['STUDENT', 'PROVIDER'].includes(role)) {
    return res.status(400).json({ error: 'Role must be STUDENT or PROVIDER' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?)').get(email.trim());
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists' });
  }

  const userId = `user-${crypto.randomUUID()}`;
  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(password, salt);

  try {
    db.transaction(() => {
      // Insert user with verified role
      db.prepare(`
        INSERT INTO users (id, email, password_hash, full_name, phone, role, is_active)
        VALUES (?, ?, ?, ?, ?, ?, 1)
      `).run(userId, email.toLowerCase().trim(), passwordHash, fullName.trim(), phone || null, role);

      // Create role profile
      if (role === 'STUDENT') {
        const profileId = `profile-${crypto.randomUUID()}`;
        const defaultUni = db.prepare('SELECT id FROM universities LIMIT 1').get() as any;
        db.prepare(`
          INSERT INTO student_profiles (id, user_id, university_id, matric_no, department, level, gender)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
          profileId,
          userId,
          studentDetails?.universityId || defaultUni?.id || 'uni-lautech-ogbomoso',
          studentDetails?.matricNo || null,
          studentDetails?.department || null,
          studentDetails?.level || null,
          studentDetails?.gender || null
        );
      } else if (role === 'PROVIDER') {
        const profileId = `profile-${crypto.randomUUID()}`;
        db.prepare(`
          INSERT INTO provider_profiles (id, user_id, business_name, address, id_type, verification_status)
          VALUES (?, ?, ?, ?, ?, 'PENDING')
        `).run(
          profileId,
          userId,
          providerDetails?.businessName || null,
          providerDetails?.address || null,
          providerDetails?.idType || 'NIN'
        );
      }
    })();

    const userRecord = {
      id: userId,
      email: email.toLowerCase().trim(),
      fullName: fullName.trim(),
      phone: phone || undefined,
      role: role as 'STUDENT' | 'PROVIDER',
      isActive: 1
    };

    const token = generateToken(userRecord as any);

    return res.status(201).json({
      message: 'Registration successful',
      token,
      user: userRecord
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: 'Failed to create account. Please try again.' });
  }
});

// 2. Login User with Strict Role Verification (Database is Source of Truth)
router.post('/login', (req, res: Response) => {
  const { email, password, role, requestedRole } = req.body;
  const targetRole = requestedRole || role;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = db.prepare(`
    SELECT id, email, password_hash as passwordHash, full_name as fullName, phone, role, is_active as isActive
    FROM users
    WHERE LOWER(email) = LOWER(?)
  `).get(email.trim()) as any;

  if (!user) {
    return res.status(401).json({ 
      error: 'INVALID_CREDENTIALS',
      message: 'Invalid email or password' 
    });
  }

  if (!user.isActive) {
    return res.status(403).json({ 
      error: 'ACCOUNT_DEACTIVATED',
      message: 'Your account has been deactivated. Please contact support.' 
    });
  }

  const passwordValid = bcrypt.compareSync(password, user.passwordHash);
  if (!passwordValid) {
    return res.status(401).json({ 
      error: 'INVALID_CREDENTIALS',
      message: 'Invalid email or password' 
    });
  }

  // =========================================================================
  // STRICT ROLE & PERMISSION AUTHORIZATION CHECK
  // The database role is the single source of truth.
  // =========================================================================
  if (targetRole) {
    const requested = (targetRole as string).toUpperCase();
    if (requested === 'ADMIN') {
      // Must be an authorized ADMIN or OWNER in database
      if (user.role !== 'ADMIN' && user.role !== 'OWNER') {
        return res.status(403).json({
          error: 'ACCESS_RESTRICTED',
          code: 'UNAUTHORIZED_ADMIN_ACCESS',
          message: 'This account is not authorized to access the Admin Portal.'
        });
      }
    } else if (requested === 'PROVIDER') {
      if (user.role !== 'PROVIDER') {
        return res.status(403).json({
          error: 'ACCESS_RESTRICTED',
          code: 'UNAUTHORIZED_PROVIDER_ACCESS',
          message: 'This account is not authorized to access the Landlord Dashboard.'
        });
      }
    } else if (requested === 'STUDENT') {
      if (user.role !== 'STUDENT') {
        return res.status(403).json({
          error: 'ACCESS_RESTRICTED',
          code: 'UNAUTHORIZED_STUDENT_ACCESS',
          message: 'This account is not registered as a Student.'
        });
      }
    }
  }

  // Build authenticated user payload strictly with the database role (user.role)
  const userPayload = {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    phone: user.phone,
    role: user.role,
    isActive: user.isActive
  };

  const token = generateToken(userPayload);

  // Fetch role-specific details
  let profile = null;
  if (user.role === 'STUDENT') {
    profile = db.prepare('SELECT * FROM student_profiles WHERE user_id = ?').get(user.id);
  } else if (user.role === 'PROVIDER') {
    profile = db.prepare('SELECT * FROM provider_profiles WHERE user_id = ?').get(user.id);
  } else if (user.role === 'ADMIN' || user.role === 'OWNER') {
    profile = db.prepare('SELECT * FROM admin_profiles WHERE user_id = ?').get(user.id);
  }

  return res.json({
    message: 'Login successful',
    token,
    user: {
      ...userPayload,
      profile
    }
  });
});

// Demo Login Shortcut
router.post('/login-demo', (req, res: Response) => {
  const { role = 'STUDENT' } = req.body;
  const user = db.prepare('SELECT id, email, full_name as fullName, phone, role, is_active as isActive FROM users WHERE role = ? LIMIT 1').get(role) as any;
  if (!user) {
    return res.status(404).json({ error: `Demo user for role ${role} not found` });
  }

  const token = generateToken(user);
  let profile = null;
  if (user.role === 'STUDENT') {
    profile = db.prepare('SELECT * FROM student_profiles WHERE user_id = ?').get(user.id);
  } else if (user.role === 'PROVIDER') {
    profile = db.prepare('SELECT * FROM provider_profiles WHERE user_id = ?').get(user.id);
  }

  return res.json({
    message: 'Demo login successful',
    token,
    user: {
      ...user,
      profile
    }
  });
});

// 3. Get Current User Info
router.get('/me', authenticate, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  let profile = null;
  if (req.user.role === 'STUDENT') {
    profile = db.prepare(`
      SELECT sp.*, u.name as university_name
      FROM student_profiles sp
      LEFT JOIN universities u ON sp.university_id = u.id
      WHERE sp.user_id = ?
    `).get(req.user.id);
  } else if (req.user.role === 'PROVIDER') {
    profile = db.prepare('SELECT * FROM provider_profiles WHERE user_id = ?').get(req.user.id);
  }

  return res.json({
    user: {
      ...req.user,
      profile
    }
  });
});

// 4. Update Profile
router.put('/profile', authenticate, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  const { fullName, phone, studentDetails, providerDetails } = req.body;

  try {
    db.transaction(() => {
      if (fullName || phone !== undefined) {
        db.prepare(`
          UPDATE users 
          SET full_name = COALESCE(?, full_name),
              phone = COALESCE(?, phone),
              updated_at = datetime('now')
          WHERE id = ?
        `).run(fullName?.trim() || null, phone || null, req.user!.id);
      }

      if (req.user!.role === 'STUDENT' && studentDetails) {
        db.prepare(`
          UPDATE student_profiles
          SET matric_no = COALESCE(?, matric_no),
              department = COALESCE(?, department),
              level = COALESCE(?, level),
              gender = COALESCE(?, gender),
              updated_at = datetime('now')
          WHERE user_id = ?
        `).run(
          studentDetails.matricNo || null,
          studentDetails.department || null,
          studentDetails.level || null,
          studentDetails.gender || null,
          req.user!.id
        );
      }

      if (req.user!.role === 'PROVIDER' && providerDetails) {
        db.prepare(`
          UPDATE provider_profiles
          SET business_name = COALESCE(?, business_name),
              address = COALESCE(?, address),
              updated_at = datetime('now')
          WHERE user_id = ?
        `).run(
          providerDetails.businessName || null,
          providerDetails.address || null,
          req.user!.id
        );
      }
    })();

    return res.json({ message: 'Profile updated successfully' });
  } catch (err) {
    console.error('Update profile error:', err);
    return res.status(500).json({ error: 'Failed to update profile' });
  }
});

export default router;
