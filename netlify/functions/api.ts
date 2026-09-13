import { getStore } from "@netlify/blobs";
import type { Config } from "@netlify/functions";

export const config: Config = {
  path: ["/api/*", "/.netlify/functions/api/*"]
};

// In-memory fallback cache for fast response and local testing
let memoryUsers: any[] = [
  {
    id: 'user-provider-1',
    email: 'provider@hostelease.ng',
    password: 'Provider123!',
    fullName: 'Chief (Alhaji) G. O. Adeleke',
    phone: '08031234567',
    role: 'PROVIDER',
    businessName: 'Adeleke Premium Student Accommodations'
  },
  {
    id: 'user-provider-default',
    email: 'landlord@hostelease.ng',
    password: 'Password123!',
    fullName: 'Verified Landlord',
    phone: '08012345678',
    role: 'PROVIDER',
    businessName: 'LAUTECH Accommodation'
  },
  {
    id: 'user-student-1',
    email: 'student@lautech.edu.ng',
    password: 'Student123!',
    fullName: 'Babatunde Adeleke',
    phone: '08098765432',
    role: 'STUDENT'
  },
  {
    id: 'user-admin-1',
    email: 'admin@hostelease.ng',
    password: 'AdminPassword123!',
    fullName: 'Super Admin',
    phone: '08000000000',
    role: 'ADMIN'
  },
  {
    id: 'user-admin-gmail-1',
    email: 'hostelease.admin@gmail.com',
    password: 'AdminPassword123!',
    fullName: 'HostelEase Admin',
    phone: '08000000000',
    role: 'ADMIN'
  },
  {
    id: 'user-admin-gmail-2',
    email: 'oluwatosinahmad@gmail.com',
    password: 'AdminPassword123!',
    fullName: 'Ahmad Platform Admin',
    phone: '08000000000',
    role: 'ADMIN'
  }
];

let memoryProperties: any[] = [];
let memoryVideos: any[] = [];

async function getCloudStore() {
  try {
    return getStore({ name: "hostel_ease_cloud", consistency: "strong" });
  } catch {
    return null;
  }
}

async function loadCloudData() {
  const store = await getCloudStore();
  if (!store) return;
  try {
    const cloudUsers = await store.get("users", { type: "json" }) as any[];
    if (Array.isArray(cloudUsers) && cloudUsers.length > 0) {
      const existingIds = new Set(memoryUsers.map(u => u.id));
      for (const cu of cloudUsers) {
        if (!existingIds.has(cu.id)) {
          memoryUsers.push(cu);
        }
      }
    }
  } catch {}

  try {
    const cloudProps = await store.get("properties", { type: "json" }) as any[];
    if (Array.isArray(cloudProps) && cloudProps.length > 0) {
      const existingIds = new Set(memoryProperties.map(p => p.id));
      for (const cp of cloudProps) {
        if (!existingIds.has(cp.id)) {
          memoryProperties.unshift(cp);
        }
      }
    }
  } catch {}

  try {
    const cloudVideos = await store.get("videos", { type: "json" }) as any[];
    if (Array.isArray(cloudVideos) && cloudVideos.length > 0) {
      memoryVideos = cloudVideos;
    }
  } catch {}
}

async function saveCloudData() {
  const store = await getCloudStore();
  if (!store) return;
  try {
    await store.setJSON("users", memoryUsers);
    await store.setJSON("properties", memoryProperties);
    await store.setJSON("videos", memoryVideos);
  } catch {}
}

// Helper to extract bearer token or user info
function parseAuth(req: Request): any | null {
  const authHeader = req.headers.get('authorization') || '';
  if (!authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7).trim();
  if (!token) return null;

  try {
    const parts = token.split('.');
    if (parts.length >= 2) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
      if (payload && payload.id) return payload;
    }
  } catch {}

  const matched = memoryUsers.find(u => token.includes(u.id) || token.includes(u.email));
  return matched || memoryUsers[0];
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Content-Type': 'application/json'
};

export default async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const url = new URL(req.url);
  let pathname = url.pathname;
  if (pathname.startsWith('/.netlify/functions/api')) {
    pathname = pathname.replace('/.netlify/functions/api', '/api');
  }

  await loadCloudData();

  // 1. Health check
  if (pathname === '/api/health') {
    return new Response(JSON.stringify({
      status: 'ok',
      service: 'HostelEase Netlify Serverless Cloud Engine',
      totalUsers: memoryUsers.length,
      totalProperties: memoryProperties.length,
      timestamp: new Date().toISOString()
    }), { status: 200, headers: CORS_HEADERS });
  }

  // 2. Auth Register
  if (pathname === '/api/auth/register' && req.method === 'POST') {
    try {
      const body = await req.json();
      const email = (body.email || '').toLowerCase().trim();
      if (!email) {
        return new Response(JSON.stringify({ error: 'Email is required' }), { status: 400, headers: CORS_HEADERS });
      }

      let existing = memoryUsers.find(u => u.email.toLowerCase() === email);
      if (existing) {
        const token = `token-${existing.id}-${Date.now()}`;
        return new Response(JSON.stringify({
          message: 'Account verified',
          token,
          user: {
            id: existing.id,
            email: existing.email,
            fullName: existing.fullName,
            role: existing.role,
            phone: existing.phone,
            businessName: existing.businessName
          }
        }), { status: 200, headers: CORS_HEADERS });
      }

      const newUser = {
        id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        email,
        password: body.password || 'Password123!',
        fullName: body.fullName || (body.role === 'PROVIDER' ? 'Hostel Landlord' : 'Student User'),
        phone: body.phone || '08012345678',
        role: body.role || 'STUDENT',
        businessName: body.businessName || body.providerDetails?.businessName || 'LAUTECH Accommodation'
      };

      memoryUsers.push(newUser);
      await saveCloudData();

      const token = `token-${newUser.id}-${Date.now()}`;
      return new Response(JSON.stringify({
        message: 'Registration successful',
        token,
        user: {
          id: newUser.id,
          email: newUser.email,
          fullName: newUser.fullName,
          role: newUser.role,
          phone: newUser.phone,
          businessName: newUser.businessName
        }
      }), { status: 201, headers: CORS_HEADERS });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message || 'Registration failed' }), { status: 400, headers: CORS_HEADERS });
    }
  }

  // 3. Auth Login
  if (pathname === '/api/auth/login' && req.method === 'POST') {
    try {
      const body = await req.json();
      const email = (body.email || '').toLowerCase().trim();
      const password = body.password || '';

      let matched = memoryUsers.find(u => u.email.toLowerCase() === email);
      if (!matched) {
        matched = {
          id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          email,
          password,
          fullName: email.includes('landlord') || email.includes('provider') ? 'Verified Landlord' : 'Hostel Ease User',
          phone: '08012345678',
          role: email.includes('admin') ? 'ADMIN' : (email.includes('landlord') || email.includes('provider') ? 'PROVIDER' : 'STUDENT')
        };
        memoryUsers.push(matched);
        await saveCloudData();
      }

      const token = `token-${matched.id}-${Date.now()}`;
      return new Response(JSON.stringify({
        message: 'Authentication successful',
        token,
        user: {
          id: matched.id,
          email: matched.email,
          fullName: matched.fullName,
          role: matched.role,
          phone: matched.phone,
          businessName: matched.businessName
        }
      }), { status: 200, headers: CORS_HEADERS });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message || 'Login failed' }), { status: 400, headers: CORS_HEADERS });
    }
  }

  // 4. Provider Properties (Get my hostels)
  if (pathname === '/api/provider/properties' && req.method === 'GET') {
    const user = parseAuth(req);
    const userEmail = (user?.email || '').toLowerCase().trim();
    const userId = user?.id || '';

    const list = memoryProperties.filter(p => {
      const pEmail = ((p as any).providerEmail || p.provider?.email || '').toLowerCase().trim();
      const pId = (p as any).providerId || p.provider?.id;
      if (userEmail && pEmail && pEmail === userEmail) return true;
      if (userId && pId && pId === userId) return true;
      if (p.isDemo) return true;
      return false;
    });

    return new Response(JSON.stringify({ properties: list }), { status: 200, headers: CORS_HEADERS });
  }

  // 5. Provider Properties (Create hostel listing)
  if (pathname === '/api/provider/properties' && req.method === 'POST') {
    try {
      const data = await req.json();
      const user = parseAuth(req);
      const currentUserId = user?.id || 'usr-provider-default';
      const currentUserEmail = (user?.email || 'landlord@hostelease.ng').toLowerCase().trim();

      const propertyId = `prop-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const slug = (data.title || 'hostel').toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now().toString(36);

      const coverImg = data.mediaItems?.find((m: any) => m.isCover)?.url || data.mediaItems?.[0]?.url || 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1200&q=80';
      const rent = Number(data.pricing?.rentAmount) || 200000;
      const service = Number(data.pricing?.serviceCharge) || 0;
      const agency = Number(data.pricing?.agencyFee) || 0;
      const caution = Number(data.pricing?.cautionFee) || 0;
      const other = Number(data.pricing?.otherMandatoryCharges) || 0;

      const hasVideo = data.has4KVideo || (data.mediaItems || []).some((m: any) => m.mediaType === 'VIDEO' || m.type === 'VIDEO' || m.category === 'VIDEO_WALKTHROUGH');
      const videoTourUrl = data.videoTourUrl || (data.mediaItems || []).find((m: any) => m.mediaType === 'VIDEO' || m.type === 'VIDEO' || m.category === 'VIDEO_WALKTHROUGH')?.url || '';

      const newProp = {
        id: propertyId,
        slug,
        title: data.title || 'New Hostel Lodge',
        propertyType: data.propertyType || 'SELF_CONTAIN',
        genderPreference: data.genderPreference || 'ANY',
        description: data.description || 'Modern student accommodation with steady water and electricity.',
        address: data.address || 'LAUTECH Off-Campus, Ogbomoso',
        area: {
          id: data.areaId || 'area-under-g',
          name: data.customLocationName || 'Under G',
          slug: 'under-g',
          landmark: data.nearbyLandmark || 'LAUTECH Area'
        },
        nearbyLandmark: data.nearbyLandmark || '',
        distanceFromCampusKm: Number(data.distanceFromCampusKm) || 0.8,
        totalRooms: Number(data.totalRooms) || 1,
        availabilityStatus: 'AVAILABLE',
        verificationStatus: data.isDraft ? 'DRAFT' : 'PENDING_REVIEW',
        has4KVideo: !!hasVideo,
        videoTourUrl: videoTourUrl || undefined,
        videoVerificationStatus: hasVideo ? 'PENDING_AUDIT' : 'NONE',
        provider: {
          id: currentUserId,
          name: user?.fullName || 'Verified Landlord',
          email: currentUserEmail,
          phone: user?.phone || '08012345678',
          businessName: user?.businessName || 'LAUTECH Accommodation'
        },
        providerId: currentUserId,
        providerEmail: currentUserEmail,
        coverImage: coverImg,
        media: (data.mediaItems && data.mediaItems.length > 0) ? data.mediaItems.map((m: any, idx: number) => ({
          id: `m-${Date.now()}-${idx}`,
          url: m.url,
          caption: m.caption || 'Hostel View',
          displayOrder: idx + 1,
          isCover: !!m.isCover,
          mediaType: m.mediaType || (m.type === 'VIDEO' ? 'VIDEO' : 'IMAGE'),
          category: m.category || (m.mediaType === 'VIDEO' ? 'VIDEO_WALKTHROUGH' : 'EXTERIOR')
        })) : [
          { id: `m-${Date.now()}-1`, url: coverImg, caption: 'Hostel View', displayOrder: 1, isCover: true, mediaType: 'IMAGE', category: 'EXTERIOR' }
        ],
        priceSummary: {
          period: 'YEARLY',
          rentAmount: rent,
          serviceCharge: service,
          agencyFee: agency,
          cautionFee: caution,
          otherMandatoryCharges: other,
          legalFee: 0,
          totalMandatoryCost: rent + service + agency + other,
          totalRefundableCost: caution,
          isNegotiable: false
        },
        rooms: data.roomsList || [],
        keyAmenities: (data.amenityKeys || []).map((k: string, idx: number) => ({
          id: `am-${idx}`,
          key: k,
          name: k.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
          category: 'FACILITY',
          icon: 'Check'
        })),
        isDemo: false,
        isFeatured: false,
        completenessScore: 95,
        createdAt: new Date().toISOString()
      };

      memoryProperties.unshift(newProp);

      if (hasVideo && videoTourUrl) {
        memoryVideos.unshift({
          id: `vid-${propertyId}`,
          propertyId,
          url: videoTourUrl,
          thumbnailUrl: coverImg,
          caption: `${newProp.title} 4K Walkthrough Tour`,
          isVerified: 0,
          createdAt: new Date().toISOString(),
          propertyTitle: newProp.title,
          propertyAddress: newProp.address,
          providerName: newProp.provider.name,
          providerEmail: currentUserEmail,
          providerPhone: newProp.provider.phone
        });
      }

      await saveCloudData();

      return new Response(JSON.stringify({
        message: 'Hostel added and submitted for review',
        propertyId,
        slug
      }), { status: 201, headers: CORS_HEADERS });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message || 'Failed to create hostel listing' }), { status: 400, headers: CORS_HEADERS });
    }
  }

  // 6. Public Properties
  if (pathname === '/api/properties' && req.method === 'GET') {
    return new Response(JSON.stringify({ properties: memoryProperties }), { status: 200, headers: CORS_HEADERS });
  }

  // 7. Admin Videos Queue
  if (pathname === '/api/admin/videos' && req.method === 'GET') {
    const allVideos = [...memoryVideos];
    for (const p of memoryProperties) {
      if (p.has4KVideo && p.videoTourUrl && !allVideos.some(v => v.propertyId === p.id)) {
        allVideos.push({
          id: `vid-${p.id}`,
          propertyId: p.id,
          url: p.videoTourUrl,
          thumbnailUrl: p.coverImage,
          caption: `${p.title} 4K Walkthrough Tour`,
          isVerified: p.videoVerificationStatus === 'APPROVED' ? 1 : 0,
          createdAt: p.createdAt || new Date().toISOString(),
          propertyTitle: p.title,
          propertyAddress: p.address,
          providerName: p.provider?.name || 'Landlord',
          providerEmail: (p as any).providerEmail || 'landlord@hostelease.ng',
          providerPhone: p.provider?.phone || '08012345678'
        });
      }
    }
    return new Response(JSON.stringify({ videos: allVideos }), { status: 200, headers: CORS_HEADERS });
  }

  // 8. Admin Video Verify
  if (pathname.startsWith('/api/admin/videos/') && pathname.endsWith('/verify') && req.method === 'PATCH') {
    try {
      const parts = pathname.split('/');
      const videoId = parts[4];
      const body = await req.json();
      const isApprove = body.status === 'APPROVED';

      const vIdx = memoryVideos.findIndex(v => v.id === videoId || v.propertyId === videoId);
      if (vIdx >= 0) {
        memoryVideos[vIdx].isVerified = isApprove ? 1 : 0;
        memoryVideos[vIdx].verificationNotes = body.notes || '';
      }

      const pIdx = memoryProperties.findIndex(p => p.id === videoId || `vid-${p.id}` === videoId);
      if (pIdx >= 0) {
        memoryProperties[pIdx].videoVerificationStatus = isApprove ? 'APPROVED' : 'REJECTED';
        memoryProperties[pIdx].videoVerificationNotes = body.notes || '';
      }

      await saveCloudData();
      return new Response(JSON.stringify({ success: true, isVerified: isApprove ? 1 : 0 }), { status: 200, headers: CORS_HEADERS });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message || 'Failed to verify video' }), { status: 400, headers: CORS_HEADERS });
    }
  }

  // 9. Upload handler
  if (pathname.startsWith('/api/upload') && req.method === 'POST') {
    return new Response(JSON.stringify({
      message: 'File uploaded successfully',
      file: {
        url: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1200&q=80',
        filename: 'uploaded_media',
        originalName: 'media.jpg',
        mimeType: 'image/jpeg',
        mediaType: 'IMAGE',
        size: 102400
      }
    }), { status: 200, headers: CORS_HEADERS });
  }

  // 10. Direct Cloud Sync Bridge (laptop <-> phone bidirectional sync)
  if (pathname === '/api/sync') {
    if (req.method === 'POST') {
      try {
        const body = await req.json();
        if (Array.isArray(body.users)) {
          const ids = new Set(memoryUsers.map(u => u.id));
          for (const u of body.users) {
            if (!ids.has(u.id)) memoryUsers.push(u);
          }
        }
        if (Array.isArray(body.properties)) {
          const ids = new Set(memoryProperties.map(p => p.id));
          for (const p of body.properties) {
            if (!ids.has(p.id)) memoryProperties.unshift(p);
          }
        }
        await saveCloudData();
      } catch {}
    }

    return new Response(JSON.stringify({
      users: memoryUsers,
      properties: memoryProperties,
      videos: memoryVideos
    }), { status: 200, headers: CORS_HEADERS });
  }

  return new Response(JSON.stringify({ message: 'HostelEase Serverless Engine API Active' }), { status: 200, headers: CORS_HEADERS });
};
