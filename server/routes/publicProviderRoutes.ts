import { Router, Request, Response } from 'express';
import db from '../db.js';

const router = Router();

// Public Landlord Profile (Privacy-Safe: Zero disclosure of NIN or verification docs)
router.get('/:id', (req: Request, res: Response) => {
  const { id } = req.params;

  const user = db.prepare(`
    SELECT u.id, u.full_name, u.avatar_url, u.created_at,
           pp.business_name, pp.provider_type, pp.bio, pp.verification_status, pp.phone_verified, pp.preferred_contact_method
    FROM users u
    LEFT JOIN provider_profiles pp ON pp.user_id = u.id
    WHERE u.id = ? AND u.role = 'PROVIDER' AND u.is_active = 1
  `).get(id) as any;

  if (!user) {
    return res.status(404).json({ error: 'Accommodation provider not found' });
  }

  // Get active approved properties belonging to this provider
  const properties = db.prepare(`
    SELECT p.id, p.title, p.slug, p.address, p.distance_from_campus_km, p.property_type,
           p.availability_status, p.verification_status, p.is_demo,
           a.name as area_name,
           pr.rent_amount, pr.total_mandatory_cost,
           (SELECT url FROM property_media WHERE property_id = p.id AND is_cover = 1 LIMIT 1) as cover_image
    FROM properties p
    JOIN areas a ON a.id = p.area_id
    LEFT JOIN prices pr ON pr.property_id = p.id
    WHERE p.provider_id = ? AND p.verification_status = 'APPROVED'
    ORDER BY p.created_at DESC
  `).all(id) as any[];

  res.json({
    provider: {
      id: user.id,
      fullName: user.full_name,
      businessName: user.business_name || user.full_name,
      avatarUrl: user.avatar_url,
      providerType: user.provider_type || 'HOSTEL_OWNER',
      bio: user.bio || 'Verified accommodation provider for LAUTECH students in Ogbomoso.',
      verificationStatus: user.verification_status || 'PENDING',
      phoneVerified: Boolean(user.phone_verified),
      preferredContactMethod: user.preferred_contact_method || 'ANY',
      joinedDate: user.created_at,
      activeHostelsCount: properties.length,
      properties: properties.map(p => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        areaName: p.area_name,
        distanceFromCampusKm: p.distance_from_campus_km,
        propertyType: p.property_type,
        availabilityStatus: p.availability_status,
        verificationStatus: p.verification_status,
        isDemo: Boolean(p.is_demo),
        rentAmount: p.rent_amount,
        totalMandatoryCost: p.total_mandatory_cost,
        coverImage: p.cover_image || 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80'
      }))
    }
  });
});

export default router;
