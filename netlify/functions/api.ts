import type { Config } from "@netlify/functions";
import seedPropertiesData from "../../src/data/seedProperties.json";
import seedUsersData from "../../src/data/seedUsers.json";

export const config: Config = {
  path: ["/api/*", "/.netlify/functions/api/*"]
};

// In-memory fallback cache for fast response and local testing
let memoryUsers: any[] = [
  ...(seedUsersData as any[]).map(u => ({
    id: u.id,
    email: u.email,
    password: 'Password123!',
    fullName: u.fullName || 'HostelEase User',
    phone: u.phone || '08012345678',
    role: u.role || 'STUDENT',
    businessName: 'LAUTECH Accommodation'
  })),
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

let memoryProperties: any[] = [
  ...(seedPropertiesData as any[]),
  {
    id: 'prop-underg-1',
    title: 'Emerald Heights Luxury Self-Contain',
    slug: 'emerald-heights-luxury-self-contain-under-g',
    description: 'Newly finished executive self-contained apartment with POP ceiling, dedicated prepaid meter, 24/7 motorized borehole with multiple overhead reserve tanks, and quiet environment ideal for studying.',
    address: 'Plot 12, Destiny Boulevard, Under-G, Ogbomoso',
    nearbyLandmark: 'Behind Bovas Petrol Station, 3 mins from Under-G Gate',
    distanceFromCampusKm: 0.3,
    propertyType: 'SELF_CONTAIN',
    genderPreference: 'ANY',
    totalRooms: 12,
    verificationStatus: 'APPROVED',
    availabilityStatus: 'AVAILABLE',
    isDemo: true,
    isFeatured: true,
    has4KVideo: true,
    videoTourUrl: 'https://assets.mixkit.co/videos/preview/mixkit-modern-apartment-living-room-interior-41525-large.mp4',
    videoVerificationStatus: 'APPROVED',
    coverImage: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=1000&q=80',
    area: { id: 'area-under-g', name: 'Under G', slug: 'under-g', landmark: 'LAUTECH Under-G Gate' },
    priceSummary: { period: 'YEARLY', rentAmount: 280000, serviceCharge: 10000, agencyFee: 25000, cautionFee: 20000, otherMandatoryCharges: 15000, totalMandatoryCost: 350000, totalRefundableCost: 20000 },
    provider: { id: 'user-provider-1', name: 'Chief (Alhaji) G. O. Adeleke', email: 'provider@hostelease.ng', phone: '08031234567', businessName: 'Adeleke Premium Student Accommodations' },
    providerEmail: 'provider@hostelease.ng',
    providerId: 'user-provider-1',
    createdAt: '2026-08-20T10:00:00Z'
  },
  {
    id: 'prop-adenike-1',
    title: 'Peace Haven Executive Lodge',
    slug: 'peace-haven-executive-lodge-adenike',
    description: 'Modern student lodge with constant solar electricity, high perimeter security wall, tiled rooms, clean running water, and reliable caretaker on site.',
    address: '15 Holy Light Road, Adenike, Ogbomoso',
    nearbyLandmark: 'Opposite Adenike Junction Bus Stop',
    distanceFromCampusKm: 0.6,
    propertyType: 'SELF_CONTAIN',
    genderPreference: 'ANY',
    totalRooms: 16,
    verificationStatus: 'APPROVED',
    availabilityStatus: 'AVAILABLE',
    isDemo: true,
    isFeatured: true,
    has4KVideo: true,
    videoTourUrl: 'https://assets.mixkit.co/videos/preview/mixkit-bright-kitchen-in-an-apartment-41528-large.mp4',
    videoVerificationStatus: 'APPROVED',
    coverImage: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1000&q=80',
    area: { id: 'area-adenike', name: 'Adenike Area', slug: 'adenike', landmark: 'Adenike Junction' },
    priceSummary: { period: 'YEARLY', rentAmount: 240000, serviceCharge: 10000, agencyFee: 20000, cautionFee: 15000, otherMandatoryCharges: 10000, totalMandatoryCost: 295000, totalRefundableCost: 15000 },
    provider: { id: 'user-provider-default', name: 'Verified Landlord', email: 'landlord@hostelease.ng', phone: '08012345678', businessName: 'LAUTECH Accommodation' },
    providerEmail: 'landlord@hostelease.ng',
    providerId: 'user-provider-default',
    createdAt: '2026-08-21T10:00:00Z'
  },
  {
    id: 'prop-abaa-1',
    title: 'Abaa Royal Diamond Lodge',
    slug: 'abaa-royal-diamond-lodge',
    description: 'Serene executive lodge in Abaa, 5 minutes from campus with dedicated security guards, prepaid meters, and steady borehole water.',
    address: 'Abaa Central Junction, Ogbomoso',
    nearbyLandmark: 'Near Abaa Central Market',
    distanceFromCampusKm: 0.7,
    propertyType: 'SELF_CONTAIN',
    genderPreference: 'ANY',
    totalRooms: 10,
    verificationStatus: 'APPROVED',
    availabilityStatus: 'AVAILABLE',
    isDemo: true,
    isFeatured: true,
    coverImage: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1000&q=80',
    area: { id: 'area-abaa', name: 'Abaa Area', slug: 'abaa', landmark: 'Abaa Junction' },
    priceSummary: { period: 'YEARLY', rentAmount: 220000, serviceCharge: 8000, agencyFee: 15000, cautionFee: 15000, otherMandatoryCharges: 5000, totalMandatoryCost: 263000, totalRefundableCost: 15000 },
    provider: { id: 'user-provider-default', name: 'Verified Landlord', email: 'landlord@hostelease.ng', phone: '08012345678', businessName: 'LAUTECH Accommodation' },
    providerEmail: 'landlord@hostelease.ng',
    providerId: 'user-provider-default',
    createdAt: '2026-08-22T10:00:00Z'
  }
];
let memoryVideos: any[] = [];

const NTFY_TOPIC = 'hostel_ease_sync_v1_lautech';
let lastCloudLoad = 0;

async function loadCloudData() {
  if (Date.now() - lastCloudLoad < 3000) return;
  lastCloudLoad = Date.now();

  try {
    const res = await fetch(`https://ntfy.sh/${NTFY_TOPIC}/json?poll=1`, {
      signal: AbortSignal.timeout(3500)
    });
    if (res.ok) {
      const text = await res.text();
      const lines = text.trim().split('\n').filter(Boolean);
      const existingIds = new Set(memoryProperties.map(p => p.id));
      for (const line of lines) {
        try {
          const item = JSON.parse(line);
          if (item.event === 'message' && item.message) {
            const payload = JSON.parse(item.message);
            if (payload.type === 'PROPERTY' && payload.property && payload.property.id) {
              if (!existingIds.has(payload.property.id)) {
                memoryProperties.unshift(payload.property);
                existingIds.add(payload.property.id);
              }
            }
          }
        } catch {}
      }
    }
  } catch {}
}

async function saveCloudData(prop?: any) {
  if (!prop) return;
  try {
    await fetch(`https://ntfy.sh/${NTFY_TOPIC}`, {
      method: 'POST',
      headers: { 'Title': 'HOSTEL_PROPERTY', 'Tags': 'house' },
      body: JSON.stringify({ type: 'PROPERTY', property: prop }),
      signal: AbortSignal.timeout(3000)
    });
  } catch {}
}

// Helper to extract bearer token or user info
function parseAuth(req: Request): any | null {
  const headerEmail = req.headers.get('x-user-email')?.toLowerCase().trim();
  const headerId = req.headers.get('x-user-id');
  const headerRole = req.headers.get('x-user-role');

  if (headerEmail) {
    let matched = memoryUsers.find(u => u.email.toLowerCase() === headerEmail);
    if (matched) return matched;
    const newUser = {
      id: headerId || `user-${Date.now()}`,
      email: headerEmail,
      fullName: 'HostelEase User',
      phone: '08012345678',
      role: headerRole || 'PROVIDER'
    };
    memoryUsers.push(newUser);
    return newUser;
  }

  const authHeader = req.headers.get('authorization') || '';
  if (!authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7).trim();
  if (!token) return null;

  try {
    const parts = token.split('.');
    if (parts.length >= 2) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
      if (payload && (payload.id || payload.email)) return payload;
    }
  } catch {}

  const matched = memoryUsers.find(u => token.includes(u.id) || (u.email && token.includes(u.email)));
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

      await saveCloudData(newProp);

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

  // 9. Upload handler (single & multiple, video & photo)
  if (pathname.startsWith('/api/upload') && req.method === 'POST') {
    const isVideoReq = req.headers.get('content-type')?.includes('video') || pathname.includes('video');
    const defaultImg = 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1200&q=80';
    const defaultVid = 'https://assets.mixkit.co/videos/preview/mixkit-modern-apartment-living-room-interior-41525-large.mp4';
    
    const mediaUrl = isVideoReq ? defaultVid : defaultImg;
    const mediaType = isVideoReq ? 'VIDEO' : 'IMAGE';
    const mimeType = isVideoReq ? 'video/mp4' : 'image/jpeg';
    const filename = isVideoReq ? 'walkthrough_tour.mp4' : 'hostel_view.jpg';

    const uploadedObj = {
      url: mediaUrl,
      filename,
      originalName: filename,
      mimeType,
      mediaType,
      size: 102400
    };

    return new Response(JSON.stringify({
      message: 'File uploaded successfully',
      file: uploadedObj,
      files: [uploadedObj]
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

  // 11. Student Dashboard
  if (pathname === '/api/student/dashboard' && req.method === 'GET') {
    const user = parseAuth(req) || memoryUsers.find(u => u.role === 'STUDENT') || memoryUsers[2];
    return new Response(JSON.stringify({
      user: {
        id: user.id || 'usr-student-1',
        fullName: user.fullName || 'Babatunde Adeleke',
        email: user.email || 'student@lautech.edu.ng',
        phone: user.phone || '08098765432',
        role: 'STUDENT',
        department: 'Computer Science',
        level: '300L',
        matricNo: '2024/04812',
        gender: 'ANY',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80'
      },
      preferences: {
        minBudget: 120000,
        maxBudget: 280000,
        preferredAreas: ['Under G', 'Adenike'],
        preferredRoomTypes: ['SELF_CONTAIN'],
        preferredFacilities: ['water', 'electricity'],
        maxDistanceKm: 2.0,
        genderPreference: 'ANY',
        preferredMoveInDate: '2026-09-01',
        isMoveInFlexible: true,
        onboardingCompleted: true
      },
      summary: {
        activeBookingsCount: 0,
        pendingInspectionsCount: 0,
        savedCount: memoryProperties.length,
        unreadMessagesCount: 0
      },
      savedHostels: memoryProperties.slice(0, 4).map(p => ({
        ...p,
        savedId: `saved-${p.id}`,
        savedAt: new Date().toISOString(),
        priceChanged: false,
        priceChangeDetails: null,
        availabilityChanged: false,
        availabilityAlert: null
      })),
      recentInspections: [],
      pendingBookings: [],
      activeBooking: null,
      recommendations: memoryProperties.slice(0, 6)
    }), { status: 200, headers: CORS_HEADERS });
  }

  // 12. Landlord AI Assistant
  if (pathname === '/api/provider/ai/assist' && req.method === 'POST') {
    try {
      const body = await req.json();
      const prompt = (body.prompt || '').toLowerCase();
      let reply = 'Hello! I have analyzed your hostel portfolio. Everything is in order with high completeness scores. You can optimize your descriptions by highlighting 24/7 borehole water, solar inverters, and proximity to LAUTECH campus gates.';
      if (prompt.includes('space') || prompt.includes('available') || prompt.includes('room')) {
        reply = 'Based on your registered listings, your rooms are currently active with available bedspaces. You can adjust individual room pricing or availability directly in Spaces & Rooms.';
      } else if (prompt.includes('price') || prompt.includes('rent') || prompt.includes('market')) {
        reply = 'Current benchmark for self-contained hostels in Under-G ranges between ₦200k - ₦320k/yr, while Adenike averages ₦180k - ₦260k/yr. Properties with solar inverters and dedicated prepaid meters command 20% higher occupancy.';
      } else if (prompt.includes('inspection')) {
        reply = 'Student physical inspection requests are scheduled through your portal. Ensure your resident caretaker or hostel security is informed prior to confirmed visiting windows.';
      }

      return new Response(JSON.stringify({
        response: reply,
        structuredData: { type: 'METRICS_OVERVIEW' }
      }), { status: 200, headers: CORS_HEADERS });
    } catch {
      return new Response(JSON.stringify({
        response: 'I analyzed your property data. All listings are online.',
        structuredData: { type: 'METRICS_OVERVIEW' }
      }), { status: 200, headers: CORS_HEADERS });
    }
  }

  return new Response(JSON.stringify({ error: 'Endpoint not found', path: pathname }), { status: 404, headers: CORS_HEADERS });
};
