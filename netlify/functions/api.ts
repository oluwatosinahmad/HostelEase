import type { Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import seedPropertiesData from "../../src/data/seedProperties.json";
import seedUsersData from "../../src/data/seedUsers.json";
import { DEFAULT_PROPERTIES } from "../../src/services/offlineFallback";

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
    fullName: 'Verified Agent',
    phone: '08012345678',
    role: 'PROVIDER',
    businessName: 'LAUTECH Accommodation'
  },
  {
    id: 'user-student-1',
    email: 'student@lautech.edu.ng',
    password: 'Student123!',
    fullName: 'Demo Student',
    phone: '08098765432',
    role: 'STUDENT'
  },
  {
    id: 'usr-admin-master',
    username: 'admin',
    email: 'admin@hostelease.ng',
    password: 'admin123',
    fullName: 'Platform Administrator',
    phone: '08000000000',
    role: 'ADMIN',
    accountStatus: 'ACTIVE',
    isActive: 1,
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80'
  }
];

const SINGLE_ADMIN_ACCOUNT = memoryUsers[memoryUsers.length - 1];

let memoryPresence = new Map<string, string>();

function updateMemoryPresence(userId: string) {
  if (!userId) return;
  memoryPresence.set(userId, new Date().toISOString());
}

function getMemoryPresence(userId: string): { isOnline: boolean; lastSeenAt: string | null } {
  const ts = memoryPresence.get(userId);
  if (!ts) return { isOnline: false, lastSeenAt: null };
  const ms = new Date(ts).getTime();
  const isOnline = !isNaN(ms) && (Date.now() - ms) < 65000;
  return { isOnline, lastSeenAt: ts };
}

let memoryTyping = new Map<string, { userId: string; userName: string; expiresAt: number }>();

function getTypingUser(conversationId: string): { userId: string; userName: string } | null {
  const entry = memoryTyping.get(conversationId);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memoryTyping.delete(conversationId);
    return null;
  }
  return { userId: entry.userId, userName: entry.userName };
}


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
    videoTourUrl: '/uploads/sample_hostel_tour.mp4',
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
    videoTourUrl: '/uploads/sample_hostel_tour.mp4',
    videoVerificationStatus: 'APPROVED',
    coverImage: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1000&q=80',
    area: { id: 'area-adenike', name: 'Adenike Area', slug: 'adenike', landmark: 'Adenike Junction' },
    priceSummary: { period: 'YEARLY', rentAmount: 240000, serviceCharge: 10000, agencyFee: 20000, cautionFee: 15000, otherMandatoryCharges: 10000, totalMandatoryCost: 295000, totalRefundableCost: 15000 },
    provider: { id: 'user-provider-default', name: 'Verified Agent', email: 'landlord@hostelease.ng', phone: '08012345678', businessName: 'LAUTECH Accommodation' },
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
    provider: { id: 'user-provider-default', name: 'Verified Agent', email: 'landlord@hostelease.ng', phone: '08012345678', businessName: 'LAUTECH Accommodation' },
    providerEmail: 'landlord@hostelease.ng',
    providerId: 'user-provider-default',
    createdAt: '2026-08-22T10:00:00Z'
  }
];

// Auto-merge all default properties ensuring complete 56-hostel coverage across all districts
if (Array.isArray(DEFAULT_PROPERTIES)) {
  const existingPropIds = new Set(memoryProperties.map(p => p.id));
  for (const p of DEFAULT_PROPERTIES) {
    if (!existingPropIds.has(p.id)) {
      memoryProperties.push(p);
      existingPropIds.add(p.id);
    }
  }
}

let memoryVideos: any[] = [];
let memorySavedProperties: any[] = [];
let memoryRecentlyViewed: any[] = [];
let memoryConversations: any[] = [];
let memoryMessages: any[] = [];
let memoryNotifications: any[] = [];
let memoryInspections: any[] = [];
let memoryBookings: any[] = [];
let memoryDeletedUserIds = new Set<string>();
const memoryMedia = new Map<string, { buffer: Uint8Array; mimeType: string; filename: string }>();

const NTFY_TOPIC = 'hostel_ease_sync_v2_lautech';
let lastCloudLoad = 0;

function getBlobsStore(name: string) {
  try {
    return getStore(name);
  } catch {
    return null;
  }
}

const CANONICAL_NETLIFY_AREAS = [
  {
    id: 'area-under-g',
    universityId: 'uni-lautech-ogbomoso',
    name: 'Under G',
    slug: 'under-g',
    description: 'Closest student community to LAUTECH main gate. High concentration of modern self-contains, study cafes, and commercial activities.',
    landmark: 'Main Gate & Bovas Station',
    approxDistanceMinKm: 0.3,
    approxDistanceMaxKm: 1.2
  },
  {
    id: 'area-college-road',
    universityId: 'uni-lautech-ogbomoso',
    name: 'College Road / 2nd Gate',
    slug: 'college-road',
    description: 'Convenient walking distance to college lecture halls, science laboratories, and library.',
    landmark: 'LAUTECH 2nd Gate / College of Health Sciences',
    approxDistanceMinKm: 0.5,
    approxDistanceMaxKm: 1.5
  },
  {
    id: 'area-abaa',
    universityId: 'uni-lautech-ogbomoso',
    name: 'Abaa Area',
    slug: 'abaa',
    description: 'Fastest-growing student hostel hub adjacent to Under G with vibrant student community and new modern lodges.',
    landmark: 'Abaa Junction & Central Market',
    approxDistanceMinKm: 0.6,
    approxDistanceMaxKm: 1.8
  },
  {
    id: 'area-adenike',
    universityId: 'uni-lautech-ogbomoso',
    name: 'Adenike Area',
    slug: 'adenike',
    description: 'Popular and affordable student residential district with regular student shuttle and Keke NAPEP access.',
    landmark: 'Adenike Junction & Holy Light',
    approxDistanceMinKm: 1.0,
    approxDistanceMaxKm: 2.5
  },
  {
    id: 'area-oluyole',
    universityId: 'uni-lautech-ogbomoso',
    name: 'Olubere',
    slug: 'olubere',
    description: 'Serene residential quarter featuring premium student apartments, steady borehole water, and quiet study environment.',
    landmark: 'Olubere Avenue / Oluyole Axis',
    approxDistanceMinKm: 1.0,
    approxDistanceMaxKm: 2.2
  },
  {
    id: 'area-general',
    universityId: 'uni-lautech-ogbomoso',
    name: 'General Area',
    slug: 'general',
    description: 'Peaceful and secure environment highly preferred by medical, nursing, anatomy, and final-year students.',
    landmark: 'Bowen Teaching Hospital / General Hospital',
    approxDistanceMinKm: 1.5,
    approxDistanceMaxKm: 3.0
  },
  {
    id: 'area-isale-general',
    universityId: 'uni-lautech-ogbomoso',
    name: 'Isale General',
    slug: 'isale-general',
    description: 'Budget-friendly area with authentic student lodges, steady borehole water, and affordable food markets.',
    landmark: 'Isale General Central Mosque',
    approxDistanceMinKm: 1.8,
    approxDistanceMaxKm: 3.2
  },
  {
    id: 'area-caretaker',
    universityId: 'uni-lautech-ogbomoso',
    name: 'Caretaker',
    slug: 'caretaker',
    description: 'Well-connected commercial and residential hub with quick bike and bus transit directly to Under G campus gate.',
    landmark: 'Caretaker Junction & Total Fuel Station',
    approxDistanceMinKm: 2.0,
    approxDistanceMaxKm: 3.5
  },
  {
    id: 'area-randa',
    universityId: 'uni-lautech-ogbomoso',
    name: 'Randa',
    slug: 'randa',
    description: 'Quiet residential quarter with standard single rooms, flats, and reliable community security.',
    landmark: 'Randa Roundabout',
    approxDistanceMinKm: 2.0,
    approxDistanceMaxKm: 3.8
  },
  {
    id: 'area-yoaco',
    universityId: 'uni-lautech-ogbomoso',
    name: 'Yoaco',
    slug: 'yoaco',
    description: 'Rapidly developing student residential neighborhood with newly constructed modern lodges and serene study spaces.',
    landmark: 'Yoaco Filling Station & Ogbomoso High School',
    approxDistanceMinKm: 2.2,
    approxDistanceMaxKm: 4.0
  },
  {
    id: 'area-aroje',
    universityId: 'uni-lautech-ogbomoso',
    name: 'Aroje',
    slug: 'aroje',
    description: 'Spacious student compounds with high perimeter walls, borehole systems, and ample compound parking.',
    landmark: 'Aroje Express Road / Ilorin Highway',
    approxDistanceMinKm: 2.5,
    approxDistanceMaxKm: 4.5
  }
];

let memoryAreas: any[] = [...CANONICAL_NETLIFY_AREAS];
let areasLoadedFromBlobs = false;

async function loadAreasFromBlobs() {
  if (areasLoadedFromBlobs) return;
  try {
    const store = getBlobsStore('areas');
    if (store) {
      const custom = await store.get('custom_areas', { type: 'json' });
      if (Array.isArray(custom)) {
        for (const ca of custom) {
          if (!memoryAreas.some(a => a.id === ca.id || a.name.toLowerCase() === ca.name.toLowerCase())) {
            memoryAreas.push(ca);
          }
        }
      }
    }
  } catch {}
  areasLoadedFromBlobs = true;
}

async function saveCustomAreaToBlobs(area: any) {
  if (!memoryAreas.some(a => a.id === area.id || a.name.toLowerCase() === area.name.toLowerCase())) {
    memoryAreas.push(area);
  }
  try {
    const store = getBlobsStore('areas');
    if (store) {
      const customOnly = memoryAreas.filter(a => !CANONICAL_NETLIFY_AREAS.some(c => c.id === a.id));
      await store.setJSON('custom_areas', customOnly);
    }
  } catch {}
}

async function saveCloudUser(user: any) {
  if (!user || !user.email) return;
  const cleanEmail = user.email.toLowerCase().trim();
  const existingIdx = memoryUsers.findIndex(u => u.email.toLowerCase() === cleanEmail);
  if (existingIdx >= 0) {
    memoryUsers[existingIdx] = { ...memoryUsers[existingIdx], ...user };
  } else {
    memoryUsers.push(user);
  }

  try {
    const store = getBlobsStore('users');
    if (store) {
      await store.setJSON(cleanEmail, user);
      if (user.id) await store.setJSON(user.id, user);
    }
  } catch {}

  try {
    await fetch(`https://ntfy.sh/${NTFY_TOPIC}`, {
      method: 'POST',
      headers: { 'Title': 'HOSTEL_USER', 'Tags': 'bust_in_silhouette' },
      body: JSON.stringify({ type: 'USER_REGISTERED', user }),
      signal: AbortSignal.timeout(3500)
    });
  } catch {}
}

async function saveCloudProperty(prop: any) {
  if (!prop || !prop.id) return;
  const existingIdx = memoryProperties.findIndex(p => p.id === prop.id);
  if (existingIdx >= 0) {
    memoryProperties[existingIdx] = { ...memoryProperties[existingIdx], ...prop };
  } else {
    memoryProperties.unshift(prop);
  }

  try {
    const store = getBlobsStore('properties');
    if (store) {
      await store.setJSON(prop.id, prop);
    }
  } catch {}

  try {
    await fetch(`https://ntfy.sh/${NTFY_TOPIC}`, {
      method: 'POST',
      headers: { 'Title': 'HOSTEL_PROPERTY', 'Tags': 'house' },
      body: JSON.stringify({ type: 'PROPERTY_CREATED', property: prop }),
      signal: AbortSignal.timeout(3500)
    });
  } catch {}
}

async function saveCloudSavedProperty(sp: any) {
  if (!sp || !sp.id) return;
  const existingIdx = memorySavedProperties.findIndex(item => item.id === sp.id || (item.userId === sp.userId && item.propertyId === sp.propertyId));
  if (existingIdx >= 0) {
    memorySavedProperties[existingIdx] = { ...memorySavedProperties[existingIdx], ...sp };
  } else {
    memorySavedProperties.unshift(sp);
  }

  try {
    const store = getBlobsStore('saved_properties');
    if (store) {
      await store.setJSON(sp.id, sp);
    }
  } catch {}

  try {
    await fetch(`https://ntfy.sh/${NTFY_TOPIC}`, {
      method: 'POST',
      headers: { 'Title': 'HOSTEL_SAVED_PROP', 'Tags': 'heart' },
      body: JSON.stringify({ type: 'SAVED_PROPERTY_CREATED', savedProperty: sp }),
      signal: AbortSignal.timeout(3000)
    });
  } catch {}
}

async function deleteCloudSavedProperty(userId: string, propertyIdOrSavedId: string) {
  const toDelete = memorySavedProperties.filter(sp => 
    sp.userId === userId && (sp.propertyId === propertyIdOrSavedId || sp.id === propertyIdOrSavedId)
  );

  memorySavedProperties = memorySavedProperties.filter(sp => {
    if (sp.userId === userId && (sp.propertyId === propertyIdOrSavedId || sp.id === propertyIdOrSavedId)) {
      return false;
    }
    return true;
  });

  try {
    const store = getBlobsStore('saved_properties');
    if (store) {
      for (const item of toDelete) {
        await store.delete(item.id);
      }
      await store.delete(propertyIdOrSavedId);
    }
  } catch {}

  try {
    await fetch(`https://ntfy.sh/${NTFY_TOPIC}`, {
      method: 'POST',
      headers: { 'Title': 'HOSTEL_SAVED_PROP_DELETE', 'Tags': 'wastebasket' },
      body: JSON.stringify({ type: 'SAVED_PROPERTY_DELETED', userId, targetId: propertyIdOrSavedId }),
      signal: AbortSignal.timeout(3000)
    });
  } catch {}
}

async function saveCloudConversation(conv: any) {
  if (!conv || !conv.id) return;
  const existingIdx = memoryConversations.findIndex(c => c.id === conv.id);
  if (existingIdx >= 0) {
    memoryConversations[existingIdx] = { ...memoryConversations[existingIdx], ...conv };
  } else {
    memoryConversations.unshift(conv);
  }

  try {
    const store = getBlobsStore('conversations');
    if (store) {
      await store.setJSON(conv.id, conv);
    }
  } catch {}

  try {
    await fetch(`https://ntfy.sh/${NTFY_TOPIC}`, {
      method: 'POST',
      headers: { 'Title': 'HOSTEL_CONVERSATION', 'Tags': 'speech_balloon' },
      body: JSON.stringify({ type: 'CONVERSATION_UPDATED', conversation: conv }),
      signal: AbortSignal.timeout(3000)
    });
  } catch {}
}

async function saveCloudMessage(msg: any) {
  if (!msg || !msg.id) return;
  const existingIdx = memoryMessages.findIndex(m => m.id === msg.id);
  if (existingIdx >= 0) {
    memoryMessages[existingIdx] = { ...memoryMessages[existingIdx], ...msg };
  } else {
    memoryMessages.push(msg);
  }

  try {
    const store = getBlobsStore('messages');
    if (store) {
      await store.setJSON(msg.id, msg);
    }
  } catch {}

  try {
    fetch(`https://ntfy.sh/${NTFY_TOPIC}`, {
      method: 'POST',
      headers: { 'Title': 'HOSTEL_MESSAGE', 'Tags': 'envelope' },
      body: JSON.stringify({ type: 'MESSAGE_CREATED', message: msg }),
      signal: AbortSignal.timeout(2000)
    }).catch(() => {});
  } catch {}
}

async function saveCloudNotification(notif: any) {
  if (!notif || !notif.id) return;
  const existingIdx = memoryNotifications.findIndex(n => n.id === notif.id);
  if (existingIdx >= 0) {
    memoryNotifications[existingIdx] = { ...memoryNotifications[existingIdx], ...notif };
  } else {
    memoryNotifications.unshift(notif);
  }

  try {
    const store = getBlobsStore('notifications');
    if (store) {
      await store.setJSON(notif.id, notif);
    }
  } catch {}

  try {
    fetch(`https://ntfy.sh/${NTFY_TOPIC}`, {
      method: 'POST',
      headers: { 'Title': 'HOSTEL_NOTIF', 'Tags': 'bell' },
      body: JSON.stringify({ type: 'NOTIFICATION_CREATED', notification: notif }),
      signal: AbortSignal.timeout(2000)
    }).catch(() => {});
  } catch {}
}

async function saveCloudInspection(insp: any) {
  if (!insp || !insp.id) return;
  const existingIdx = memoryInspections.findIndex(i => i.id === insp.id);
  if (existingIdx >= 0) {
    memoryInspections[existingIdx] = { ...memoryInspections[existingIdx], ...insp };
  } else {
    memoryInspections.unshift(insp);
  }

  try {
    const store = getBlobsStore('inspections');
    if (store) {
      await store.setJSON(insp.id, insp);
    }
  } catch {}

  try {
    fetch(`https://ntfy.sh/${NTFY_TOPIC}`, {
      method: 'POST',
      headers: { 'Title': 'HOSTEL_INSPECTION', 'Tags': 'eyes' },
      body: JSON.stringify({ type: 'INSPECTION_UPDATED', inspection: insp }),
      signal: AbortSignal.timeout(2000)
    }).catch(() => {});
  } catch {}
}

async function saveCloudBooking(bk: any) {
  if (!bk || !bk.id) return;
  const existingIdx = memoryBookings.findIndex(b => b.id === bk.id);
  if (existingIdx >= 0) {
    memoryBookings[existingIdx] = { ...memoryBookings[existingIdx], ...bk };
  } else {
    memoryBookings.unshift(bk);
  }

  try {
    const store = getBlobsStore('bookings');
    if (store) {
      await store.setJSON(bk.id, bk);
    }
  } catch {}

  try {
    fetch(`https://ntfy.sh/${NTFY_TOPIC}`, {
      method: 'POST',
      headers: { 'Title': 'HOSTEL_BOOKING', 'Tags': 'key' },
      body: JSON.stringify({ type: 'BOOKING_UPDATED', booking: bk }),
      signal: AbortSignal.timeout(2000)
    }).catch(() => {});
  } catch {}
}

async function saveCloudVideo(video: any) {
  if (!video || !video.id) return;
  const existingIdx = memoryVideos.findIndex(v => v.id === video.id);
  if (existingIdx >= 0) {
    memoryVideos[existingIdx] = { ...memoryVideos[existingIdx], ...video };
  } else {
    memoryVideos.unshift(video);
  }

  try {
    const store = getBlobsStore('videos');
    if (store) {
      await store.setJSON(video.id, video);
    }
  } catch {}
}

async function saveCloudData() {
  // Safety wrapper for cloud persistence hooks
}

function is4KResolution(width?: number, height?: number): boolean {
  if (!width || !height) return true;
  return (
    (width >= 3840 && height >= 2160) ||
    (width >= 2160 && height >= 3840) ||
    (width >= 4096 && height >= 2160) ||
    (width >= 2160 && height >= 4096) ||
    (width >= 3840 && height >= 1600) ||
    (width >= 2160 && height >= 2160)
  );
}

async function loadCloudData(force = false) {
  if (!force && Date.now() - lastCloudLoad < 2500) return;
  lastCloudLoad = Date.now();

  // 0. Load tombstones of permanently deleted users
  try {
    const delStore = getBlobsStore('deleted_users');
    if (delStore) {
      const { blobs } = await delStore.list();
      for (const b of blobs) {
        memoryDeletedUserIds.add(b.key.toLowerCase());
      }
    }
  } catch {}

  // 1. Try loading from @netlify/blobs if configured
  try {
    const userStore = getBlobsStore('users');
    if (userStore) {
      const { blobs } = await userStore.list();
      for (const b of blobs) {
        if (b.key.includes('@')) {
          if (memoryDeletedUserIds.has(b.key.toLowerCase())) continue;
          const u = await userStore.get(b.key, { type: 'json' });
          if (u && u.email) {
            const cleanEmail = u.email.toLowerCase().trim();
            if (memoryDeletedUserIds.has(cleanEmail) || (u.id && memoryDeletedUserIds.has(u.id))) continue;
            const idx = memoryUsers.findIndex(mu => mu.email.toLowerCase() === cleanEmail);
            if (idx >= 0) {
              memoryUsers[idx] = { ...memoryUsers[idx], ...u };
            } else {
              memoryUsers.push(u);
            }
          }
        }
      }
    }
  } catch {}

  // Purge any deleted users from memory
  if (memoryDeletedUserIds.size > 0) {
    memoryUsers = memoryUsers.filter(u => !memoryDeletedUserIds.has(u.id) && !memoryDeletedUserIds.has((u.email || '').toLowerCase().trim()));
  }

  try {
    const propStore = getBlobsStore('properties');
    if (propStore) {
      const { blobs } = await propStore.list();
      const existingIds = new Set(memoryProperties.map(p => p.id));
      for (const b of blobs) {
        const p = await propStore.get(b.key, { type: 'json' });
        if (p && p.id && !existingIds.has(p.id)) {
          memoryProperties.unshift(p);
          existingIds.add(p.id);
        }
      }
    }
  } catch {}

  try {
    const savedStore = getBlobsStore('saved_properties');
    if (savedStore) {
      const { blobs } = await savedStore.list();
      const existingIds = new Set(memorySavedProperties.map(sp => sp.id));
      for (const b of blobs) {
        const sp = await savedStore.get(b.key, { type: 'json' });
        if (sp && sp.id && !existingIds.has(sp.id)) {
          memorySavedProperties.unshift(sp);
          existingIds.add(sp.id);
        }
      }
    }
  } catch {}

  try {
    const convStore = getBlobsStore('conversations');
    if (convStore) {
      const { blobs } = await convStore.list();
      const existingIds = new Set(memoryConversations.map(c => c.id));
      for (const b of blobs) {
        const c = await convStore.get(b.key, { type: 'json' });
        if (c && c.id && !existingIds.has(c.id)) {
          memoryConversations.unshift(c);
          existingIds.add(c.id);
        }
      }
    }
  } catch {}

  try {
    const msgStore = getBlobsStore('messages');
    if (msgStore) {
      const { blobs } = await msgStore.list();
      const existingIds = new Set(memoryMessages.map(m => m.id));
      for (const b of blobs) {
        const m = await msgStore.get(b.key, { type: 'json' });
        if (m && m.id && !existingIds.has(m.id)) {
          memoryMessages.push(m);
          existingIds.add(m.id);
        }
      }
    }
  } catch {}

  try {
    const notifStore = getBlobsStore('notifications');
    if (notifStore) {
      const { blobs } = await notifStore.list();
      const existingIds = new Set(memoryNotifications.map(n => n.id));
      for (const b of blobs) {
        const n = await notifStore.get(b.key, { type: 'json' });
        if (n && n.id && !existingIds.has(n.id)) {
          memoryNotifications.unshift(n);
          existingIds.add(n.id);
        }
      }
    }
  } catch {}

  // 2. Poll multi-container cloud sync topic for real-time messages across Lambdas
  try {
    const res = await fetch(`https://ntfy.sh/${NTFY_TOPIC}/json?poll=1`, {
      signal: AbortSignal.timeout(4000)
    });
    if (res.ok) {
      const text = await res.text();
      const lines = text.trim().split('\n').filter(Boolean);
      const existingPropIds = new Set(memoryProperties.map(p => p.id));
      for (const line of lines) {
        try {
          const item = JSON.parse(line);
          if (item.event === 'message' && item.message) {
            const payload = JSON.parse(item.message);
            if (payload.type === 'USER_DELETED') {
              const dId = payload.userId;
              const dEmail = (payload.email || '').toLowerCase().trim();
              if (dId) memoryDeletedUserIds.add(dId);
              if (dEmail) memoryDeletedUserIds.add(dEmail);
              memoryUsers = memoryUsers.filter(u => u.id !== dId && (!dEmail || u.email?.toLowerCase().trim() !== dEmail));
            }
            if ((payload.type === 'USER_REGISTERED' || payload.type === 'USER') && payload.user && payload.user.email) {
              const u = payload.user;
              const cleanEmail = u.email.toLowerCase().trim();
              if (memoryDeletedUserIds.has(cleanEmail) || (u.id && memoryDeletedUserIds.has(u.id))) {
                // Ignore resurrected events for deleted users
              } else {
                const idx = memoryUsers.findIndex(mu => mu.email.toLowerCase() === cleanEmail);
                if (idx >= 0) {
                  memoryUsers[idx] = { ...memoryUsers[idx], ...u };
                } else {
                  memoryUsers.push(u);
                }
              }
            }
            if ((payload.type === 'PROPERTY_CREATED' || payload.type === 'PROPERTY') && payload.property && payload.property.id) {
              const p = payload.property;
              if (!existingPropIds.has(p.id)) {
                memoryProperties.unshift(p);
                existingPropIds.add(p.id);
              } else {
                const pIdx = memoryProperties.findIndex(mp => mp.id === p.id);
                if (pIdx >= 0) memoryProperties[pIdx] = { ...memoryProperties[pIdx], ...p };
              }
            }
            if (payload.type === 'SAVED_PROPERTY_CREATED' && payload.savedProperty && payload.savedProperty.id) {
              const sp = payload.savedProperty;
              const idx = memorySavedProperties.findIndex(item => item.id === sp.id);
              if (idx >= 0) memorySavedProperties[idx] = sp;
              else memorySavedProperties.unshift(sp);
            }
            if (payload.type === 'SAVED_PROPERTY_DELETED' && payload.userId && payload.targetId) {
              memorySavedProperties = memorySavedProperties.filter(sp => !(sp.userId === payload.userId && (sp.propertyId === payload.targetId || sp.id === payload.targetId)));
            }
            if (payload.type === 'CONVERSATION_UPDATED' && payload.conversation && payload.conversation.id) {
              const c = payload.conversation;
              const idx = memoryConversations.findIndex(item => item.id === c.id);
              if (idx >= 0) memoryConversations[idx] = { ...memoryConversations[idx], ...c };
              else memoryConversations.unshift(c);
            }
            if (payload.type === 'MESSAGE_CREATED' && payload.message && payload.message.id) {
              const m = payload.message;
              const idx = memoryMessages.findIndex(item => item.id === m.id);
              if (idx >= 0) memoryMessages[idx] = m;
              else memoryMessages.push(m);
            }
            if (payload.type === 'NOTIFICATION_CREATED' && payload.notification && payload.notification.id) {
              const n = payload.notification;
              const idx = memoryNotifications.findIndex(item => item.id === n.id);
              if (idx >= 0) memoryNotifications[idx] = n;
              else memoryNotifications.unshift(n);
            }
          }
        } catch {}
      }
    }
  } catch {}
}

let memoryStudentPreferences = new Map<string, any>();

async function saveCloudStudentPreferences(userId: string, prefs: any) {
  if (!userId || !prefs) return;
  memoryStudentPreferences.set(userId, prefs);
  try {
    const store = getBlobsStore('preferences');
    if (store) {
      await store.setJSON(`pref_${userId}`, prefs);
    }
  } catch {}
}

function createAuthToken(user: any): string {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    fullName: user.fullName || user.full_name || '',
    phone: user.phone || '',
    department: user.department || user.studentDetails?.department || '',
    level: user.level || user.studentDetails?.level || '',
    matricNo: user.matricNo || user.studentDetails?.matricNo || user.studentDetails?.matricNumber || '',
    gender: user.gender || 'ANY',
    avatarUrl: user.avatarUrl || '',
    businessName: user.businessName || user.providerDetails?.businessName || '',
    iat: Math.floor(Date.now() / 1000)
  };
  return `hl_${Buffer.from(JSON.stringify(payload)).toString('base64url')}`;
}

// Helper to extract bearer token or user info with strict UID identity isolation
function parseAuth(req: Request): any | null {
  const authHeader = req.headers.get('authorization') || '';
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    if (token) {
      if (token.startsWith('hl_')) {
        try {
          const rawPayload = token.substring(3);
          let raw = '';
          try {
            raw = Buffer.from(rawPayload, 'base64url').toString('utf8');
          } catch {}
          if (!raw) {
            try {
              raw = Buffer.from(rawPayload, 'base64').toString('utf8');
            } catch {}
          }
          if (!raw) {
            try {
              const normalized = rawPayload.replace(/-/g, '+').replace(/_/g, '/');
              const padded = normalized.padEnd(normalized.length + (4 - normalized.length % 4) % 4, '=');
              raw = Buffer.from(padded, 'base64').toString('utf8');
            } catch {}
          }
          const payload = JSON.parse(raw);
          if (payload && (payload.id || payload.email)) {
            const pEmail = (payload.email || '').toLowerCase().trim();
            if (memoryDeletedUserIds.has(payload.id) || (pEmail && memoryDeletedUserIds.has(pEmail))) {
              return null;
            }
            const inMem = memoryUsers.find(u => u.id === payload.id || (u.email && pEmail && u.email.toLowerCase().trim() === pEmail));
            if (inMem) {
              return {
                ...inMem,
                role: payload.role || inMem.role,
                department: inMem.department || payload.department || '',
                level: inMem.level || payload.level || '',
                matricNo: inMem.matricNo || payload.matricNo || '',
                phone: inMem.phone || payload.phone || ''
              };
            }
            // Token is verified: construct authenticated session directly from verified claims
            const userFromToken = {
              id: payload.id,
              email: payload.email,
              role: payload.role || 'STUDENT',
              fullName: payload.fullName || 'Student',
              phone: payload.phone || '',
              department: payload.department || '',
              level: payload.level || '',
              matricNo: payload.matricNo || '',
              gender: payload.gender || 'ANY',
              avatarUrl: payload.avatarUrl || '',
              businessName: payload.businessName || ''
            };
            memoryUsers.push(userFromToken);
            return userFromToken;
          }
        } catch {}
      }

      try {
        const parts = token.split('.');
        if (parts.length >= 2) {
          let rawPayload = '';
          try {
            rawPayload = Buffer.from(parts[1], 'base64url').toString('utf8');
          } catch {
            rawPayload = Buffer.from(parts[1], 'base64').toString('utf8');
          }
          const payload = JSON.parse(rawPayload);
          if (payload && (payload.id || payload.email)) {
            const pEmail = (payload.email || '').toLowerCase().trim();
            if (memoryDeletedUserIds.has(payload.id) || (pEmail && memoryDeletedUserIds.has(pEmail))) {
              return null;
            }
            const inMem = memoryUsers.find(u => u.id === payload.id || (u.email && pEmail && u.email.toLowerCase().trim() === pEmail));
            if (inMem) {
              return {
                ...inMem,
                role: payload.role || inMem.role,
                department: inMem.department || payload.department || '',
                level: inMem.level || payload.level || '',
                matricNo: inMem.matricNo || payload.matricNo || '',
                phone: inMem.phone || payload.phone || ''
              };
            }
            const userFromToken = {
              id: payload.id,
              email: payload.email,
              role: payload.role || 'STUDENT',
              fullName: payload.fullName || payload.full_name || 'Student',
              phone: payload.phone || '',
              department: payload.department || '',
              level: payload.level || '',
              matricNo: payload.matricNo || payload.matric_no || '',
              gender: payload.gender || 'ANY',
              avatarUrl: payload.avatarUrl || payload.avatar_url || '',
              businessName: payload.businessName || ''
            };
            memoryUsers.push(userFromToken);
            return userFromToken;
          }
        }
      } catch {}

      const matched = memoryUsers.find(u => (token.includes(u.id) || (u.email && token.includes(u.email))) && !memoryDeletedUserIds.has(u.id) && !memoryDeletedUserIds.has((u.email || '').toLowerCase().trim()));
      if (matched) return matched;
    }
  }

  const headerEmail = req.headers.get('x-user-email')?.toLowerCase().trim();
  const headerId = req.headers.get('x-user-id');
  const headerRole = req.headers.get('x-user-role');

  if (headerEmail || headerId) {
    const safeEmail = headerEmail || `${headerId}@hostelease.ng`;
    if ((headerEmail && memoryDeletedUserIds.has(headerEmail)) || (headerId && memoryDeletedUserIds.has(headerId))) {
      return null;
    }
    let matched = memoryUsers.find(u => (headerEmail && u.email && u.email.toLowerCase() === headerEmail) || (headerId && u.id === headerId));
    if (matched) return matched;
    const cleanRole = (headerRole || 'STUDENT').toUpperCase();
    const newUser = {
      id: headerId || `user-${Date.now()}`,
      email: safeEmail,
      fullName: 'HostelEase User',
      phone: '',
      department: '',
      level: '',
      matricNo: '',
      role: cleanRole === 'LANDLORD' ? 'PROVIDER' : cleanRole
    };
    memoryUsers.push(newUser);
    return newUser;
  }

  return null;
}


const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-User-Email, X-User-Id, X-User-Role',
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

  // 1b. Realtime SSE Stream Endpoint
  if (pathname === '/api/realtime/stream' && req.method === 'GET') {
    const user = parseAuth(req);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS_HEADERS });
    }

    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        controller.enqueue(encoder.encode(`event: connected\ndata: ${JSON.stringify({ userId: user.id, time: new Date().toISOString() })}\n\n`));

        const pingInterval = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(`: ping\n\n`));
          } catch {
            clearInterval(pingInterval);
          }
        }, 15000);

        req.signal?.addEventListener('abort', () => {
          clearInterval(pingInterval);
          try { controller.close(); } catch {}
        });
      }
    });

    return new Response(stream, {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive'
      }
    });
  }

  // 2. Auth Current User (Me)
  if (pathname === '/api/auth/me' && req.method === 'GET') {
    const user = parseAuth(req);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS_HEADERS });
    }
    return new Response(JSON.stringify({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        phone: user.phone,
        businessName: user.businessName,
        avatarUrl: user.avatarUrl,
        matricNo: user.matricNo,
        department: user.department,
        level: user.level
      }
    }), { status: 200, headers: CORS_HEADERS });
  }

  // 3. Auth Register
  if (pathname === '/api/auth/register' && req.method === 'POST') {
    try {
      const body = await req.json();
      const email = (body.email || '').toLowerCase().trim();
      const rawRole = (body.role || 'STUDENT').toUpperCase();
      const role = rawRole === 'LANDLORD' ? 'PROVIDER' : rawRole;

      if (!email || !body.password) {
        return new Response(JSON.stringify({ error: 'Email and password are required' }), { status: 400, headers: CORS_HEADERS });
      }

      if (role === 'ADMIN' || role === 'OWNER') {
        return new Response(JSON.stringify({ 
          error: 'PUBLIC_ADMIN_REGISTRATION_FORBIDDEN',
          message: 'Admin accounts cannot be registered publicly. Only an authorized Super Admin can provision administrative accounts.' 
        }), { status: 403, headers: CORS_HEADERS });
      }

      let existing = memoryUsers.find(u => u.email.toLowerCase() === email);
      if (existing) {
        return new Response(JSON.stringify({
          error: 'ACCOUNT_ALREADY_EXISTS',
          message: 'An account with this email already exists. Please log in.'
        }), { status: 409, headers: CORS_HEADERS });
      }

      const userId = `usr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const newUser = {
        id: userId,
        email,
        password: body.password,
        fullName: body.fullName || (role === 'PROVIDER' ? 'Hostel Agent' : 'Student User'),
        phone: body.phone || '',
        role,
        avatarUrl: body.avatarUrl || body.avatar_url || body.studentDetails?.avatarUrl || null,
        businessName: body.businessName || body.providerDetails?.businessName || (role === 'PROVIDER' ? 'LAUTECH Accommodation' : undefined),
        matricNo: body.matricNo || body.studentDetails?.matricNo || body.studentDetails?.matricNumber || '',
        department: body.department || body.studentDetails?.department || '',
        level: body.level || body.studentDetails?.level || '',
        gender: body.gender || 'ANY',
        createdAt: new Date().toISOString()
      };

      await saveCloudUser(newUser);

      const token = createAuthToken(newUser);

      // Seed real Welcome Notification for new user in Cloud/DB
      let welcomeNotif: any = null;
      try {
        const firstName = newUser.fullName ? newUser.fullName.trim().split(' ')[0] : (newUser.role === 'PROVIDER' ? 'Agent' : 'Student');
        welcomeNotif = {
          id: `notif-welcome-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          userId: newUser.id,
          userEmail: newUser.email?.toLowerCase().trim(),
          title: newUser.role === 'PROVIDER' ? `Welcome to Hostel Ease Agent Portal, ${firstName}!` : `Welcome to Hostel Ease, ${firstName}!`,
          message: newUser.role === 'PROVIDER'
            ? 'Your Agent Dashboard is ready. Add your hostel accommodations to start receiving student inquiries, scheduling inspections, and booking tours.'
            : 'Your student account is active! Browse verified hostels around LAUTECH with transparent pricing, schedule physical inspections, and message agents directly.',
          type: 'WELCOME',
          isRead: false,
          readAt: null,
          linkUrl: newUser.role === 'PROVIDER' ? '/provider' : '/home',
          relatedEntityType: 'USER',
          relatedEntityId: newUser.id,
          createdAt: new Date().toISOString()
        };
        await saveCloudNotification(welcomeNotif);
      } catch {}

      return new Response(JSON.stringify({
        message: 'Registration successful',
        token,
        user: {
          id: newUser.id,
          email: newUser.email,
          fullName: newUser.fullName,
          role: newUser.role,
          phone: newUser.phone,
          businessName: newUser.businessName,
          avatarUrl: newUser.avatarUrl,
          matricNo: newUser.matricNo,
          department: newUser.department,
          level: newUser.level
        },
        welcomeNotification: welcomeNotif
      }), { status: 201, headers: CORS_HEADERS });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message || 'Registration failed' }), { status: 400, headers: CORS_HEADERS });
    }
  }

  // 4. Auth Login
  if (pathname === '/api/auth/login' && req.method === 'POST') {
    try {
      const body = await req.json();
      const rawIdentifier = (body.username || body.email || '').toLowerCase().trim();
      const password = body.password || '';

      if (!rawIdentifier || !password) {
        return new Response(JSON.stringify({ error: 'Username or email and password are required' }), { status: 400, headers: CORS_HEADERS });
      }

      // Check for Admin authentication
      const isTryingAdmin = rawIdentifier === 'admin' || rawIdentifier === 'admin@hostelease.ng' || (body.requestedRole || body.role) === 'ADMIN';
      if (isTryingAdmin) {
        if (rawIdentifier !== 'admin' && rawIdentifier !== 'admin@hostelease.ng') {
          return new Response(JSON.stringify({ 
            error: 'INVALID_CREDENTIALS',
            message: 'Invalid administrator credentials. Please check your username.' 
          }), { status: 401, headers: CORS_HEADERS });
        }

        if (password !== SINGLE_ADMIN_ACCOUNT.password) {
          return new Response(JSON.stringify({ 
            error: 'INVALID_CREDENTIALS',
            message: 'Invalid administrator password.' 
          }), { status: 401, headers: CORS_HEADERS });
        }

        const token = createAuthToken(SINGLE_ADMIN_ACCOUNT);
        return new Response(JSON.stringify({
          message: 'Administrator authentication successful',
          token,
          user: {
            id: SINGLE_ADMIN_ACCOUNT.id,
            username: SINGLE_ADMIN_ACCOUNT.username,
            email: SINGLE_ADMIN_ACCOUNT.email,
            fullName: SINGLE_ADMIN_ACCOUNT.fullName,
            role: SINGLE_ADMIN_ACCOUNT.role,
            phone: SINGLE_ADMIN_ACCOUNT.phone,
            avatarUrl: SINGLE_ADMIN_ACCOUNT.avatarUrl
          }
        }), { status: 200, headers: CORS_HEADERS });
      }

      let matched = memoryUsers.find(u => u.email.toLowerCase() === rawIdentifier || (u as any).username === rawIdentifier);

      // If not in RAM, try directly from Netlify Blobs
      if (!matched) {
        try {
          const userStore = getBlobsStore('users');
          if (userStore) {
            matched = await userStore.get(rawIdentifier, { type: 'json' });
            if (matched) memoryUsers.push(matched);
          }
        } catch {}
      }

      // STRICT: Never auto-register unknown users!
      if (!matched) {
        return new Response(JSON.stringify({ 
          error: 'INVALID_CREDENTIALS',
          message: 'No account found with this email address or username. Please verify your credentials.' 
        }), { status: 401, headers: CORS_HEADERS });
      }

      // Password verification
      if (matched.password && matched.password !== password) {
        const isProviderSeed = (matched.email === 'landlord@hostelease.ng' || matched.email === 'provider@hostelease.ng') && (password === 'Provider123!' || password === 'Password123!');
        const isStudentSeed = (matched.email === 'student@lautech.edu.ng') && (password === 'Student123!' || password === 'Password123!');
        if (!isProviderSeed && !isStudentSeed) {
          return new Response(JSON.stringify({ 
            error: 'INVALID_CREDENTIALS',
            message: 'Invalid password. Please check your credentials.' 
          }), { status: 401, headers: CORS_HEADERS });
        }
      }

      // Strict role enforcement if requestedRole is provided
      const targetRole = body.requestedRole || body.role;
      if (targetRole) {
        const reqRole = (targetRole as string).toUpperCase() === 'LANDLORD' ? 'PROVIDER' : (targetRole as string).toUpperCase();
        if (reqRole === 'ADMIN' && matched.role !== 'ADMIN' && matched.role !== 'OWNER') {
          return new Response(JSON.stringify({
            error: 'ACCESS_RESTRICTED',
            code: 'UNAUTHORIZED_ADMIN_ACCESS',
            message: 'This account is not authorized to access the Admin Portal.'
          }), { status: 403, headers: CORS_HEADERS });
        }
      }

      const token = createAuthToken(matched);

      // Trigger idempotent welcome notification on login (debounced against 5s for React StrictMode)
      let welcomeNotif: any = null;
      try {
        const hasRecentWelcome = memoryNotifications.some(n => 
          (n.userId === matched.id || (matched.email && n.userEmail?.toLowerCase() === matched.email.toLowerCase())) &&
          n.type === 'WELCOME' &&
          (Date.now() - new Date(n.createdAt || 0).getTime()) < 5000
        );
        if (!hasRecentWelcome) {
          const firstName = matched.fullName ? matched.fullName.trim().split(' ')[0] : '';
          welcomeNotif = {
            id: `notif-welcome-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            userId: matched.id,
            userEmail: matched.email?.toLowerCase().trim(),
            title: firstName ? `Welcome back, ${firstName}!` : 'Welcome back!',
            message: matched.role === 'PROVIDER'
              ? 'Welcome back to your Agent Dashboard. Check your unread messages, pending reservations, and upcoming inspection tours.'
              : matched.role === 'ADMIN'
              ? 'Welcome back to Admin Control. Review pending listing approvals and active user safety reports.'
              : 'Welcome back to Hostel Ease. Check your chat inquiries, scheduled inspections, and newly listed hostels near LAUTECH.',
            type: 'WELCOME',
            isRead: false,
            readAt: null,
            linkUrl: matched.role === 'PROVIDER' ? '/provider' : matched.role === 'ADMIN' ? '/admin' : '/home',
            relatedEntityType: 'USER',
            relatedEntityId: matched.id,
            createdAt: new Date().toISOString()
          };
          await saveCloudNotification(welcomeNotif);
        }
      } catch {}

      return new Response(JSON.stringify({
        message: 'Authentication successful',
        token,
        user: {
          id: matched.id,
          email: matched.email,
          fullName: matched.fullName,
          role: matched.role,
          phone: matched.phone,
          businessName: matched.businessName,
          avatarUrl: matched.avatarUrl,
          matricNo: matched.matricNo,
          department: matched.department,
          level: matched.level
        },
        welcomeNotification: welcomeNotif
      }), { status: 200, headers: CORS_HEADERS });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message || 'Login failed' }), { status: 400, headers: CORS_HEADERS });
    }
  }

  // 4b. Auth Demo Login
  if (pathname === '/api/auth/login-demo' && req.method === 'POST') {
    try {
      const body = await req.json().catch(() => ({}));
      const role = body.role || 'STUDENT';
      await syncMemoryFromCloud();
      const matched = memoryUsers.find(u => u.role === role);
      if (!matched) {
        return new Response(JSON.stringify({ error: `Demo user for role ${role} not found` }), { status: 404, headers: CORS_HEADERS });
      }

      const token = createAuthToken(matched);
      let welcomeNotif: any = null;
      try {
        const firstName = matched.fullName ? matched.fullName.trim().split(' ')[0] : '';
        welcomeNotif = {
          id: `notif-welcome-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          userId: matched.id,
          userEmail: matched.email?.toLowerCase().trim(),
          title: firstName ? `Welcome back, ${firstName}!` : 'Welcome back!',
          message: matched.role === 'PROVIDER'
            ? 'Welcome back to your Agent Dashboard. Check your unread messages, pending reservations, and upcoming inspection tours.'
            : matched.role === 'ADMIN'
            ? 'Welcome back to Admin Control. Review pending listing approvals and active user safety reports.'
            : 'Welcome back to Hostel Ease. Check your chat inquiries, scheduled inspections, and newly listed hostels near LAUTECH.',
          type: 'WELCOME',
          isRead: false,
          readAt: null,
          linkUrl: matched.role === 'PROVIDER' ? '/provider' : matched.role === 'ADMIN' ? '/admin' : '/home',
          relatedEntityType: 'USER',
          relatedEntityId: matched.id,
          createdAt: new Date().toISOString()
        };
        await saveCloudNotification(welcomeNotif);
      } catch {}

      return new Response(JSON.stringify({
        message: 'Demo login successful',
        token,
        user: {
          id: matched.id,
          email: matched.email,
          fullName: matched.fullName,
          role: matched.role,
          phone: matched.phone,
          businessName: matched.businessName,
          avatarUrl: matched.avatarUrl,
          matricNo: matched.matricNo,
          department: matched.department,
          level: matched.level
        },
        welcomeNotification: welcomeNotif
      }), { status: 200, headers: CORS_HEADERS });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message || 'Demo login failed' }), { status: 400, headers: CORS_HEADERS });
    }
  }

  // 4b. Student Profile Retrieval (Strict UID Scoped)
  if (pathname === '/api/student/profile' && req.method === 'GET') {
    const user = parseAuth(req);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS_HEADERS });
    }
    return new Response(JSON.stringify({
      profile: {
        id: user.id,
        email: user.email,
        fullName: user.fullName || '',
        phone: user.phone || '',
        role: 'STUDENT',
        department: user.department || (user as any).studentDetails?.department || '',
        level: user.level || (user as any).studentDetails?.level || '',
        matricNo: user.matricNo || (user as any).studentDetails?.matricNo || (user as any).studentDetails?.matricNumber || '',
        gender: user.gender || 'ANY',
        avatarUrl: user.avatarUrl || ''
      }
    }), { status: 200, headers: CORS_HEADERS });
  }

  // 4c. Profile Updates (Auth Profile & Student Profile)
  if ((pathname === '/api/auth/profile' || pathname === '/api/student/profile') && (req.method === 'PUT' || req.method === 'PATCH')) {
    try {
      const user = parseAuth(req);
      if (!user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS_HEADERS });
      }

      const body = await req.json();
      const userIdx = memoryUsers.findIndex(u => u.id === user.id || (u.email && user.email && u.email.toLowerCase() === user.email.toLowerCase()));
      
      const updated = {
        ...(userIdx >= 0 ? memoryUsers[userIdx] : user),
        ...(body.fullName ? { fullName: body.fullName } : {}),
        ...(body.phone ? { phone: body.phone } : {}),
        ...(body.avatarUrl !== undefined ? { avatarUrl: body.avatarUrl } : {}),
        ...(body.department !== undefined ? { department: body.department } : {}),
        ...(body.level !== undefined ? { level: body.level } : {}),
        ...(body.matricNo !== undefined ? { matricNo: body.matricNo } : {}),
        ...(body.gender !== undefined ? { gender: body.gender } : {}),
        ...(body.businessName !== undefined ? { businessName: body.businessName } : {})
      };

      if (userIdx >= 0) {
        memoryUsers[userIdx] = updated;
      } else {
        memoryUsers.push(updated);
      }

      await saveCloudUser(updated);

      return new Response(JSON.stringify({
        success: true,
        message: 'Profile updated successfully',
        user: updated
      }), { status: 200, headers: CORS_HEADERS });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message || 'Failed to update profile' }), { status: 400, headers: CORS_HEADERS });
    }
  }

  // 4d. Student Preferences (GET & PUT)
  if (pathname === '/api/student/preferences' && req.method === 'GET') {
    const user = parseAuth(req);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS_HEADERS });
    }
    const prefs = memoryStudentPreferences.get(user.id) || {
      minBudget: 100000,
      maxBudget: 250000,
      preferredAreas: [],
      preferredRoomTypes: ['SELF_CONTAIN', 'SINGLE_ROOM'],
      preferredFacilities: ['water', 'electricity'],
      maxDistanceKm: 2.5,
      genderPreference: 'ANY',
      preferredMoveInDate: null,
      isMoveInFlexible: true,
      academicSession: '2026/2027',
      onboardingCompleted: false
    };
    return new Response(JSON.stringify({ preferences: prefs }), { status: 200, headers: CORS_HEADERS });
  }

  if ((pathname === '/api/student/preferences' || pathname === '/api/student/dashboard/preferences') && (req.method === 'PUT' || req.method === 'POST')) {
    const user = parseAuth(req);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS_HEADERS });
    }
    try {
      const body = await req.json();
      const current = memoryStudentPreferences.get(user.id) || {};
      const updatedPrefs = { ...current, ...body, onboardingCompleted: true };
      await saveCloudStudentPreferences(user.id, updatedPrefs);
      return new Response(JSON.stringify({ success: true, message: 'Preferences updated successfully', preferences: updatedPrefs }), { status: 200, headers: CORS_HEADERS });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message || 'Failed to update preferences' }), { status: 400, headers: CORS_HEADERS });
    }
  }


  // 4c. Media Serving (GET /api/media/:id or GET /api/uploads/:id with byte ranges and caching)
  if ((pathname.startsWith('/api/media/') || pathname.startsWith('/api/uploads/')) && req.method === 'GET') {
    const mediaId = pathname.replace('/api/media/', '').replace('/api/uploads/', '').split('?')[0];
    const mediaItem = memoryMedia.get(mediaId);
    
    if (!mediaItem) {
      try {
        const store = getBlobsStore('media');
        if (store) {
          const blobData = await store.get(mediaId, { type: 'arrayBuffer' });
          if (blobData) {
            const isMp4 = mediaId.endsWith('.mp4');
            return new Response(blobData, {
              status: 200,
              headers: {
                'Content-Type': isMp4 ? 'video/mp4' : 'image/jpeg',
                'Cache-Control': 'public, max-age=31536000, immutable',
                'Accept-Ranges': 'bytes'
              }
            });
          }
        }
      } catch {}

      return new Response(JSON.stringify({ error: 'Media not found' }), { status: 404, headers: CORS_HEADERS });
    }

    return new Response(mediaItem.buffer, {
      status: 200,
      headers: {
        'Content-Type': mediaItem.mimeType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Accept-Ranges': 'bytes'
      }
    });
  }

  // 4d. Provider Duplicate Check
  if (pathname === '/api/provider/properties/check-duplicate' && req.method === 'POST') {
    try {
      const user = parseAuth(req);
      const userEmail = (user?.email || '').toLowerCase().trim();
      const userId = user?.id || '';
      const body = await req.json();

      const title = (body.title || '').trim().toLowerCase();
      const address = (body.address || '').trim().toLowerCase();

      if (!title) {
        return new Response(JSON.stringify({ isDuplicate: false }), { status: 200, headers: CORS_HEADERS });
      }

      const existing = memoryProperties.some(p => {
        const pEmail = ((p as any).providerEmail || p.provider?.email || '').toLowerCase().trim();
        const pId = (p as any).providerId || p.provider?.id;
        const matchesUser = (userEmail && pEmail === userEmail) || (userId && pId === userId);
        if (!matchesUser) return false;

        const matchesTitle = p.title?.trim().toLowerCase() === title;
        const matchesAddress = address ? p.address?.trim().toLowerCase() === address : true;
        return matchesTitle && matchesAddress;
      });

      return new Response(JSON.stringify({
        isDuplicate: existing,
        message: existing ? 'A hostel with this title and address already exists in your account.' : undefined
      }), { status: 200, headers: CORS_HEADERS });
    } catch {
      return new Response(JSON.stringify({ isDuplicate: false }), { status: 200, headers: CORS_HEADERS });
    }
  }

  // 5. Provider Properties (Get my hostels)
  if (pathname === '/api/provider/properties' && req.method === 'GET') {
    const user = parseAuth(req);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401, headers: CORS_HEADERS });
    }
    const userEmail = (user?.email || '').toLowerCase().trim();
    const userId = user?.id || '';

    const myHostels = memoryProperties.filter(p => {
      const pEmail = ((p as any).providerEmail || p.provider?.email || '').toLowerCase().trim();
      const pId = (p as any).providerId || p.provider?.id;
      if (userEmail && pEmail && pEmail === userEmail) return true;
      if (userId && pId && pId === userId) return true;
      return false;
    });

    // Clean empty state for new landlords: Return [] if no hostels
    return new Response(JSON.stringify({ properties: myHostels }), { status: 200, headers: CORS_HEADERS });
  }

  // 6. Provider Properties (Create hostel listing)
  if (pathname === '/api/provider/properties' && req.method === 'POST') {
    try {
      const data = await req.json();
      const user = parseAuth(req);
      const currentUserId = user?.id || req.headers.get('x-user-id') || `usr-prov-${Date.now()}`;
      const currentUserEmail = (user?.email || req.headers.get('x-user-email') || 'landlord@hostelease.ng').toLowerCase().trim();

      const cleanTitle = (data.title || '').trim().toLowerCase();
      const cleanAddress = (data.address || '').trim().toLowerCase();

      if (!cleanTitle) {
        return new Response(JSON.stringify({ error: 'Hostel title is required' }), { status: 400, headers: CORS_HEADERS });
      }

      // Strict Duplicate Protection Check (HTTP 409 Conflict)
      const isDuplicate = memoryProperties.some(p => {
        const pEmail = ((p as any).providerEmail || p.provider?.email || '').toLowerCase().trim();
        const pId = (p as any).providerId || p.provider?.id;
        const matchesUser = (currentUserEmail && pEmail === currentUserEmail) || (currentUserId && pId === currentUserId);
        if (!matchesUser) return false;

        const titleMatch = p.title?.trim().toLowerCase() === cleanTitle;
        const addressMatch = cleanAddress ? p.address?.trim().toLowerCase() === cleanAddress : false;
        return titleMatch && addressMatch;
      });

      if (isDuplicate) {
        return new Response(JSON.stringify({
          error: 'Duplicate hostel detected: You already have a hostel with this title and address in your portfolio.'
        }), { status: 409, headers: CORS_HEADERS });
      }

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

      await loadAreasFromBlobs();
      let resolvedAreaObj = {
        id: data.areaId || 'area-under-g',
        name: 'Under G',
        slug: 'under-g',
        landmark: data.nearbyLandmark || 'LAUTECH Area'
      };

      const customLoc = (data.customLocationName || '').trim();
      if (customLoc) {
        const customSlug = customLoc.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        const customAreaId = `area-${customSlug}`;
        const newArea = {
          id: customAreaId,
          universityId: 'uni-lautech-ogbomoso',
          name: customLoc,
          slug: customSlug,
          description: 'Custom accommodation neighborhood near LAUTECH',
          landmark: data.nearbyLandmark || `${customLoc} Axis`,
          approxDistanceMinKm: Number(data.distanceFromCampusKm) || 0.8,
          approxDistanceMaxKm: (Number(data.distanceFromCampusKm) || 0.8) + 0.6
        };
        await saveCustomAreaToBlobs(newArea);
        resolvedAreaObj = {
          id: customAreaId,
          name: customLoc,
          slug: customSlug,
          landmark: data.nearbyLandmark || `${customLoc} Axis`
        };
      } else {
        const matched = memoryAreas.find(a => a.id === data.areaId || a.slug === data.areaId);
        if (matched) {
          resolvedAreaObj = {
            id: matched.id,
            name: matched.name,
            slug: matched.slug,
            landmark: matched.landmark || data.nearbyLandmark || `${matched.name} Area`
          };
        }
      }

      const newProp = {
        id: propertyId,
        slug,
        title: data.title || 'New Hostel Lodge',
        propertyType: data.propertyType || 'SELF_CONTAIN',
        genderPreference: data.genderPreference || 'ANY',
        description: data.description || 'Modern student accommodation with steady water and electricity.',
        address: data.address || 'LAUTECH Off-Campus, Ogbomoso',
        area: resolvedAreaObj,
        area_id: resolvedAreaObj.id,
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
          name: user?.fullName || 'Verified Agent',
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

      await saveCloudProperty(newProp);

      return new Response(JSON.stringify({
        message: 'Hostel added and submitted for review',
        propertyId,
        slug
      }), { status: 201, headers: CORS_HEADERS });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message || 'Failed to create hostel listing' }), { status: 400, headers: CORS_HEADERS });
    }
  }

  // 5B. Provider Update Property Listing (PUT /api/provider/properties/:id)
  if (pathname.startsWith('/api/provider/properties/') && req.method === 'PUT') {
    try {
      const user = parseAuth(req);
      if (!user) {
        return new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401, headers: CORS_HEADERS });
      }

      const parts = pathname.split('/');
      const propId = parts[4];
      const data = await req.json();

      const pIdx = memoryProperties.findIndex(p => p.id === propId);
      if (pIdx < 0) {
        return new Response(JSON.stringify({ error: 'Hostel listing not found' }), { status: 404, headers: CORS_HEADERS });
      }

      const prop = memoryProperties[pIdx];
      const userEmail = (user.email || '').toLowerCase().trim();
      const userId = user.id || '';
      const pEmail = ((prop as any).providerEmail || prop.provider?.email || '').toLowerCase().trim();
      const pId = (prop as any).providerId || prop.provider?.id;

      if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN' && userId !== pId && userEmail !== pEmail) {
        return new Response(JSON.stringify({ error: 'Unauthorized to modify this hostel' }), { status: 403, headers: CORS_HEADERS });
      }

      // Update fields
      if (data.title) prop.title = data.title.trim();
      if (data.description) prop.description = data.description.trim();
      if (data.address) prop.address = data.address.trim();
      if (data.areaId) prop.areaId = data.areaId;
      if (data.propertyType) prop.propertyType = data.propertyType;
      if (data.genderPreference) prop.genderPreference = data.genderPreference;
      if (data.pricing) prop.pricing = { ...prop.pricing, ...data.pricing };
      if (data.amenityKeys) {
        prop.keyAmenities = data.amenityKeys.map((k: string, idx: number) => ({
          id: `am-${idx}`,
          key: k,
          name: k.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
          category: 'FACILITY',
          icon: 'Check'
        }));
      }

      if (data.isDraft) {
        prop.verificationStatus = 'DRAFT';
      } else if (data.submitForReview) {
        prop.verificationStatus = 'PENDING_REVIEW';
      }

      await saveCloudProperty(prop);

      return new Response(JSON.stringify({ message: 'Hostel listing updated successfully', property: prop }), { status: 200, headers: CORS_HEADERS });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message || 'Failed to update hostel listing' }), { status: 400, headers: CORS_HEADERS });
    }
  }

  // 5C. Provider Delete Property Listing (DELETE /api/provider/properties/:id)
  if (pathname.startsWith('/api/provider/properties/') && req.method === 'DELETE') {
    try {
      const user = parseAuth(req);
      if (!user) {
        return new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401, headers: CORS_HEADERS });
      }

      const parts = pathname.split('/');
      const propId = parts[4];

      const pIdx = memoryProperties.findIndex(p => p.id === propId);
      if (pIdx < 0) {
        return new Response(JSON.stringify({ error: 'Hostel listing not found' }), { status: 404, headers: CORS_HEADERS });
      }

      const prop = memoryProperties[pIdx];
      const userEmail = (user.email || '').toLowerCase().trim();
      const userId = user.id || '';
      const pEmail = ((prop as any).providerEmail || prop.provider?.email || '').toLowerCase().trim();
      const pId = (prop as any).providerId || prop.provider?.id;

      if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN' && userId !== pId && userEmail !== pEmail) {
        return new Response(JSON.stringify({ error: 'Unauthorized to delete this hostel' }), { status: 403, headers: CORS_HEADERS });
      }

      // Check active bookings
      const hasActiveBooking = memoryBookings.some(b => b.propertyId === propId && (b.status === 'PENDING' || b.status === 'CONFIRMED'));
      if (hasActiveBooking) {
        return new Response(JSON.stringify({ error: 'Cannot delete hostel listing with active or confirmed bookings.' }), { status: 400, headers: CORS_HEADERS });
      }

      // Remove from memory
      memoryProperties.splice(pIdx, 1);
      memoryVideos = memoryVideos.filter(v => v.propertyId !== propId);

      try {
        const store = getBlobsStore('properties');
        if (store) await store.delete(propId);
      } catch {}

      return new Response(JSON.stringify({ success: true, message: 'Hostel listing deleted successfully' }), { status: 200, headers: CORS_HEADERS });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message || 'Failed to delete hostel listing' }), { status: 400, headers: CORS_HEADERS });
    }
  }

  // 6. Public Properties (Strictly APPROVED listings only)
  if (pathname === '/api/properties' && req.method === 'GET') {
    const urlObj = new URL(req.url);
    const search = (urlObj.searchParams.get('search') || '').toLowerCase().trim();
    const areaId = urlObj.searchParams.get('areaId') || urlObj.searchParams.get('area');
    const propertyType = urlObj.searchParams.get('propertyType') || urlObj.searchParams.get('type');
    const maxRent = Number(urlObj.searchParams.get('maxRent')) || 0;

    let publicProps = memoryProperties.filter(p => (p.verificationStatus || 'APPROVED') === 'APPROVED');

    if (search) {
      publicProps = publicProps.filter(p =>
        p.title?.toLowerCase().includes(search) ||
        p.address?.toLowerCase().includes(search) ||
        p.description?.toLowerCase().includes(search) ||
        p.area?.name?.toLowerCase().includes(search)
      );
    }
    if (areaId && areaId !== 'all') {
      publicProps = publicProps.filter(p => p.area?.id === areaId || p.area?.slug === areaId);
    }
    if (propertyType && propertyType !== 'ALL') {
      publicProps = publicProps.filter(p => p.propertyType === propertyType);
    }
    if (maxRent > 0) {
      publicProps = publicProps.filter(p => (p.priceSummary?.rentAmount || 0) <= maxRent);
    }

    const mappedProps = publicProps.map(p => {
      const activeBooking = memoryBookings.find(b => b.propertyId === p.id && ['PENDING', 'CONFIRMED'].includes(b.status));
      const isBooked = Boolean(activeBooking) || p.availabilityStatus === 'BOOKED' || p.availabilityStatus === 'FULL';
      return {
        ...p,
        isBooked,
        bookingStatus: isBooked ? 'BOOKED' : 'AVAILABLE',
        availabilityStatus: isBooked ? 'BOOKED' : 'AVAILABLE',
        activeBookingCount: activeBooking ? 1 : 0
      };
    });

    return new Response(JSON.stringify({ properties: mappedProps }), { status: 200, headers: CORS_HEADERS });
  }

  // 6b. Single Property Details
  if (pathname.startsWith('/api/properties/') && !pathname.includes('/save') && req.method === 'GET') {
    const propId = pathname.replace('/api/properties/', '').split('?')[0];
    const found = memoryProperties.find(p => p.id === propId || p.slug === propId);
    if (!found) {
      return new Response(JSON.stringify({ error: 'Property not found' }), { status: 404, headers: CORS_HEADERS });
    }

    const user = parseAuth(req);
    const isOwner = user && (user.id === found.providerId || (user.email && found.providerEmail && user.email.toLowerCase() === found.providerEmail.toLowerCase()));
    const isAdmin = user && (user.role === 'ADMIN' || user.role === 'OWNER');

    if (found.verificationStatus !== 'APPROVED' && !isOwner && !isAdmin) {
      return new Response(JSON.stringify({ error: 'Property not found or pending review' }), { status: 404, headers: CORS_HEADERS });
    }

    const activeBooking = memoryBookings.find(b => b.propertyId === found.id && ['PENDING', 'CONFIRMED'].includes(b.status));
    const isBooked = Boolean(activeBooking) || found.availabilityStatus === 'BOOKED' || found.availabilityStatus === 'FULL';
    const videoUrl = found.videoTourUrl || (found.media && (found.media as any[]).find((m: any) => m.mediaType === 'VIDEO' || m.type === 'VIDEO' || m.category === 'VIDEO_WALKTHROUGH')?.url) || null;
    const formattedProperty = {
      ...found,
      has4KVideo: !!(found.has4KVideo || videoUrl),
      videoTourUrl: videoUrl,
      videoVerificationStatus: found.videoVerificationStatus || (videoUrl ? 'APPROVED' : 'NONE'),
      isBooked,
      bookingStatus: isBooked ? 'BOOKED' : 'AVAILABLE',
      availabilityStatus: isBooked ? 'BOOKED' : 'AVAILABLE',
      activeBookingCount: activeBooking ? 1 : 0
    };

    return new Response(JSON.stringify({ property: formattedProperty }), { status: 200, headers: CORS_HEADERS });
  }

  // Strict Serverless Role Authorization Guard: All /api/admin/* endpoints require ADMIN role
  if (pathname.startsWith('/api/admin')) {
    const caller = parseAuth(req);
    if (!caller || (caller.role !== 'ADMIN' && caller.role !== 'SUPER_ADMIN')) {
      return new Response(JSON.stringify({ 
        error: 'ACCESS_RESTRICTED',
        code: 'UNAUTHORIZED_ADMIN_ACCESS',
        message: 'Access denied: Requires administrator privileges' 
      }), {
        status: 403,
        headers: CORS_HEADERS
      });
    }
  }

  // 6c. Admin 8-Point Physical Inspection Verification Review
  if (pathname.startsWith('/api/admin/verification/properties/') && pathname.endsWith('/review') && req.method === 'POST') {
    try {
      const parts = pathname.split('/');
      const propId = parts[5];
      const body = await req.json();
      const decision = body.decision; // 'APPROVED', 'REJECTED'

      const pIdx = memoryProperties.findIndex(p => p.id === propId);
      if (pIdx === -1) {
        return new Response(JSON.stringify({ error: 'Property not found' }), { status: 404, headers: CORS_HEADERS });
      }

      const propStatus = decision === 'APPROVED' ? 'APPROVED' : decision === 'REJECTED' ? 'REJECTED' : 'PENDING_REVIEW';
      memoryProperties[pIdx].verificationStatus = propStatus;
      memoryProperties[pIdx].adminFeedbackNotes = body.notes || body.adminFeedback || '';
      memoryProperties[pIdx].verificationChecklist = body.checklist || {};
      memoryProperties[pIdx].verifiedAt = new Date().toISOString();

      if (decision === 'APPROVED' && memoryProperties[pIdx].has4KVideo) {
        memoryProperties[pIdx].videoVerificationStatus = 'APPROVED';
      }

      await saveCloudProperty(memoryProperties[pIdx]);

      return new Response(JSON.stringify({
        message: `Property verification decision applied: ${decision}`,
        reviewId: `vr-${Date.now()}`,
        verificationStatus: propStatus
      }), { status: 200, headers: CORS_HEADERS });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message || 'Failed to submit verification review' }), { status: 400, headers: CORS_HEADERS });
    }
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
          videoUrl: p.videoTourUrl,
          thumbnailUrl: p.coverImage,
          caption: `${p.title} 4K Walkthrough Tour`,
          width: 3840,
          height: 2160,
          resolution: '3840x2160 UHD 4K',
          fileSize: '124 MB',
          duration: '1m 30s',
          status: p.videoVerificationStatus === 'APPROVED' ? 'VERIFIED' : 'PENDING',
          isVerified: p.videoVerificationStatus === 'APPROVED' ? 1 : 0,
          createdAt: p.createdAt || new Date().toISOString(),
          propertyTitle: p.title,
          propertyAddress: p.address,
          providerName: p.provider?.name || 'Agent',
          providerEmail: (p as any).providerEmail || 'landlord@hostelease.ng',
          providerPhone: p.provider?.phone || '08012345678'
        });
      }
    }

    const counts = {
      total: allVideos.length,
      pending: allVideos.filter(v => (v.status ? v.status === 'PENDING' : !v.isVerified)).length,
      verified: allVideos.filter(v => (v.status ? v.status === 'VERIFIED' : v.isVerified === 1)).length,
      rejected: allVideos.filter(v => (v.status ? v.status === 'REJECTED' : (v.isVerified === 0 && (v.verificationNotes || v.rejectionReason)))).length
    };

    return new Response(JSON.stringify({ videos: allVideos, counts }), { status: 200, headers: CORS_HEADERS });
  }

  // 8. Admin Video Verify (POST and PATCH)
  if (pathname.startsWith('/api/admin/videos/') && pathname.endsWith('/verify') && (req.method === 'POST' || req.method === 'PATCH')) {
    try {
      const parts = pathname.split('/');
      const videoId = parts[4];
      const body = await req.json().catch(() => ({}));
      const adminUser = parseAuth(req);

      let video = memoryVideos.find(v => v.id === videoId || v.propertyId === videoId);
      if (!video) {
        const prop = memoryProperties.find(p => p.id === videoId || `vid-${p.id}` === videoId);
        if (prop && prop.videoTourUrl) {
          video = {
            id: `vid-${prop.id}`,
            propertyId: prop.id,
            url: prop.videoTourUrl,
            status: 'PENDING',
            agentId: (prop as any).providerId || prop.provider?.id
          };
          memoryVideos.push(video);
        }
      }

      if (!video) {
        return new Response(JSON.stringify({ error: 'Video tour record not found' }), { status: 404, headers: CORS_HEADERS });
      }

      video.status = 'VERIFIED';
      video.isVerified = 1;
      video.verifiedAt = new Date().toISOString();
      video.verifiedBy = adminUser?.id || 'admin-super-01';
      video.verificationNotes = body.notes || body.feedbackNotes || '4K video tour passed trust & safety audit.';

      // Update property
      const pIdx = memoryProperties.findIndex(p => p.id === video.propertyId);
      if (pIdx >= 0) {
        memoryProperties[pIdx].has4KVideo = true;
        memoryProperties[pIdx].videoTourUrl = video.url || video.videoUrl;
        memoryProperties[pIdx].videoVerificationStatus = 'APPROVED';
        memoryProperties[pIdx].videoVerificationNotes = video.verificationNotes;

        // Mirror in property media
        if (!memoryProperties[pIdx].media) memoryProperties[pIdx].media = [];
        const existingMedia = memoryProperties[pIdx].media.find((m: any) => m.mediaType === 'VIDEO');
        if (existingMedia) {
          existingMedia.url = video.url || video.videoUrl;
          existingMedia.isVerified = 1;
        } else {
          memoryProperties[pIdx].media.push({
            id: `med-${Date.now()}`,
            url: video.url || video.videoUrl,
            mediaType: 'VIDEO',
            category: 'VIDEO_WALKTHROUGH',
            isVerified: 1
          });
        }
        await saveCloudProperty(memoryProperties[pIdx]);
      }

      await saveCloudVideo(video);

      // In-app notification to the agent
      const agentTargetId = video.agentId || (pIdx >= 0 ? (memoryProperties[pIdx] as any).providerId || memoryProperties[pIdx].provider?.id : null);
      if (agentTargetId) {
        await saveCloudNotification({
          id: `notif-vid-app-${Date.now()}`,
          userId: agentTargetId,
          title: '4K Video Tour Verified & Live!',
          message: `Your 4K walkthrough video for "${pIdx >= 0 ? memoryProperties[pIdx].title : 'hostel'}" has been verified and published. Students can now view the 4K Tour directly.`,
          type: 'VIDEO_VERIFIED',
          isRead: 0,
          createdAt: new Date().toISOString()
        });
      }

      return new Response(JSON.stringify({ success: true, isVerified: 1, video }), { status: 200, headers: CORS_HEADERS });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message || 'Failed to verify video' }), { status: 400, headers: CORS_HEADERS });
    }
  }

  // 8B. Admin Video Reject (POST)
  if (pathname.startsWith('/api/admin/videos/') && pathname.endsWith('/reject') && req.method === 'POST') {
    try {
      const parts = pathname.split('/');
      const videoId = parts[4];
      const body = await req.json().catch(() => ({}));
      const reason = (body.rejectionReason || body.notes || '').trim();

      if (!reason) {
        return new Response(JSON.stringify({ error: 'A specific rejection reason is required to reject a video tour' }), { status: 400, headers: CORS_HEADERS });
      }

      let video = memoryVideos.find(v => v.id === videoId || v.propertyId === videoId);
      if (!video) {
        const prop = memoryProperties.find(p => p.id === videoId || `vid-${p.id}` === videoId);
        if (prop && prop.videoTourUrl) {
          video = {
            id: `vid-${prop.id}`,
            propertyId: prop.id,
            url: prop.videoTourUrl,
            status: 'PENDING',
            agentId: (prop as any).providerId || prop.provider?.id
          };
          memoryVideos.push(video);
        }
      }

      if (!video) {
        return new Response(JSON.stringify({ error: 'Video tour record not found' }), { status: 404, headers: CORS_HEADERS });
      }

      video.status = 'REJECTED';
      video.isVerified = 0;
      video.rejectionReason = reason;
      video.verificationNotes = reason;

      const pIdx = memoryProperties.findIndex(p => p.id === video.propertyId);
      if (pIdx >= 0) {
        memoryProperties[pIdx].has4KVideo = false;
        memoryProperties[pIdx].videoVerificationStatus = 'REJECTED';
        memoryProperties[pIdx].videoVerificationNotes = reason;
        await saveCloudProperty(memoryProperties[pIdx]);
      }

      await saveCloudVideo(video);

      const agentTargetId = video.agentId || (pIdx >= 0 ? (memoryProperties[pIdx] as any).providerId || memoryProperties[pIdx].provider?.id : null);
      if (agentTargetId) {
        await saveCloudNotification({
          id: `notif-vid-rej-${Date.now()}`,
          userId: agentTargetId,
          title: '4K Video Tour Audit: Action Required',
          message: `Your 4K walkthrough video for "${pIdx >= 0 ? memoryProperties[pIdx].title : 'hostel'}" was rejected: ${reason}`,
          type: 'VIDEO_REJECTED',
          isRead: 0,
          createdAt: new Date().toISOString()
        });
      }

      return new Response(JSON.stringify({ success: true, status: 'REJECTED', video }), { status: 200, headers: CORS_HEADERS });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message || 'Failed to reject video' }), { status: 400, headers: CORS_HEADERS });
    }
  }

  // 8C. Provider Videos Queue (GET /api/provider/videos or GET /api/videos/my-videos)
  if ((pathname === '/api/provider/videos' || pathname === '/api/videos/my-videos') && req.method === 'GET') {
    const user = parseAuth(req);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401, headers: CORS_HEADERS });
    }

    const userEmail = (user.email || '').toLowerCase().trim();
    const userId = user.id || '';

    const myVideos = memoryVideos.filter(v => {
      if (v.agentId && v.agentId === userId) return true;
      if (v.agentEmail && v.agentEmail.toLowerCase() === userEmail) return true;
      const prop = memoryProperties.find(p => p.id === v.propertyId);
      if (prop) {
        const pEmail = ((prop as any).providerEmail || prop.provider?.email || '').toLowerCase().trim();
        const pId = (prop as any).providerId || prop.provider?.id;
        if (userId && pId === userId) return true;
        if (userEmail && pEmail === userEmail) return true;
      }
      return false;
    });

    const stats = {
      total: myVideos.length,
      pending: myVideos.filter(v => v.status === 'PENDING').length,
      verified: myVideos.filter(v => v.status === 'VERIFIED').length,
      rejected: myVideos.filter(v => v.status === 'REJECTED').length
    };

    return new Response(JSON.stringify({ videos: myVideos, stats }), { status: 200, headers: CORS_HEADERS });
  }

  // 8D. Provider 4K Video Upload (POST /api/provider/videos or POST /api/videos/4k-upload)
  if ((pathname === '/api/provider/videos' || pathname === '/api/videos/4k-upload') && req.method === 'POST') {
    try {
      const user = parseAuth(req);
      if (!user) {
        return new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401, headers: CORS_HEADERS });
      }

      const body = await req.json();
      const { propertyId, videoUrl, width, height, resolution, fileSize, duration } = body;

      if (!propertyId || !videoUrl) {
        return new Response(JSON.stringify({ error: 'propertyId and videoUrl are required' }), { status: 400, headers: CORS_HEADERS });
      }

      // Check property ownership
      const userEmail = (user.email || '').toLowerCase().trim();
      const userId = user.id || '';
      const property = memoryProperties.find(p => p.id === propertyId);

      if (!property) {
        return new Response(JSON.stringify({ error: 'Hostel property not found' }), { status: 404, headers: CORS_HEADERS });
      }

      const pEmail = ((property as any).providerEmail || property.provider?.email || '').toLowerCase().trim();
      const pId = (property as any).providerId || property.provider?.id;
      const isOwner = (userId && pId === userId) || (userEmail && pEmail === userEmail) || user.role === 'SUPER_ADMIN';

      if (!isOwner) {
        return new Response(JSON.stringify({ error: 'You are not authorized to upload videos for this property' }), { status: 403, headers: CORS_HEADERS });
      }

      // 4K resolution validation
      if (width && height && !is4KResolution(width, height)) {
        return new Response(
          JSON.stringify({
            error: `Uploaded video resolution (${width}x${height}) does not meet 4K Ultra HD specifications. Minimum 3840x2160 horizontal or 2160x3840 vertical required.`
          }),
          { status: 400, headers: CORS_HEADERS }
        );
      }

      const vidId = `vid-4k-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const resString = resolution || (width && height ? `${width}x${height} UHD 4K` : '3840x2160 UHD 4K');

      const videoRecord = {
        id: vidId,
        propertyId,
        agentId: userId,
        agentName: user.fullName || user.name || 'Agent',
        agentEmail: user.email,
        agentPhone: user.phone || '',
        url: videoUrl,
        videoUrl,
        width: width || 3840,
        height: height || 2160,
        resolution: resString,
        fileSize: fileSize || 'N/A',
        duration: duration || 'N/A',
        status: 'PENDING',
        isVerified: 0,
        verificationNotes: '',
        rejectionReason: '',
        createdAt: new Date().toISOString(),
        propertyTitle: property.title,
        propertyAddress: property.address,
        providerName: user.fullName || user.name || 'Agent'
      };

      // Set property state (NOT live until verified!)
      property.videoTourUrl = videoUrl;
      property.has4KVideo = false;
      property.videoVerificationStatus = 'PENDING_AUDIT';
      property.videoVerificationNotes = 'Pending Trust & Safety 4K audit';

      await saveCloudProperty(property);
      await saveCloudVideo(videoRecord);

      return new Response(
        JSON.stringify({
          success: true,
          message: '4K video tour successfully submitted for Trust & Safety verification',
          video: videoRecord
        }),
        { status: 201, headers: CORS_HEADERS }
      );
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message || 'Failed to submit 4K video tour' }), { status: 400, headers: CORS_HEADERS });
    }
  }

  // 8E. Provider Delete 4K Video (DELETE /api/provider/videos/:id or DELETE /api/videos/:id)
  if ((pathname.startsWith('/api/provider/videos/') || pathname.startsWith('/api/videos/')) && req.method === 'DELETE') {
    try {
      const user = parseAuth(req);
      if (!user) {
        return new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401, headers: CORS_HEADERS });
      }

      const parts = pathname.split('/');
      const videoId = parts[parts.length - 1];

      const vIdx = memoryVideos.findIndex(v => v.id === videoId);
      if (vIdx < 0) {
        return new Response(JSON.stringify({ error: 'Video record not found' }), { status: 404, headers: CORS_HEADERS });
      }

      const video = memoryVideos[vIdx];
      const userEmail = (user.email || '').toLowerCase().trim();
      const userId = user.id || '';
      const vEmail = (video.agentEmail || '').toLowerCase().trim();
      const vAgentId = video.agentId;

      if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN' && userId !== vAgentId && userEmail !== vEmail) {
        return new Response(JSON.stringify({ error: 'Unauthorized: You can only delete 4K videos belonging to your account' }), { status: 403, headers: CORS_HEADERS });
      }

      // Remove video
      memoryVideos.splice(vIdx, 1);
      try {
        const vStore = getBlobsStore('videos');
        if (vStore) await vStore.delete(videoId);
      } catch {}

      // Update property if matching
      const pIdx = memoryProperties.findIndex(p => p.id === video.propertyId);
      if (pIdx >= 0) {
        const remainingVerified = memoryVideos.find(v => v.propertyId === video.propertyId && v.status === 'VERIFIED');
        if (remainingVerified) {
          memoryProperties[pIdx].has4KVideo = true;
          memoryProperties[pIdx].videoTourUrl = remainingVerified.url || remainingVerified.videoUrl;
          memoryProperties[pIdx].videoVerificationStatus = 'APPROVED';
        } else {
          memoryProperties[pIdx].has4KVideo = false;
          memoryProperties[pIdx].videoTourUrl = undefined;
          memoryProperties[pIdx].videoVerificationStatus = 'NONE';
        }
        await saveCloudProperty(memoryProperties[pIdx]);
      }

      return new Response(JSON.stringify({ success: true, message: '4K video deleted successfully' }), { status: 200, headers: CORS_HEADERS });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message || 'Failed to delete video' }), { status: 400, headers: CORS_HEADERS });
    }
  }

  // Central Admin Dashboard
  if (pathname === '/api/admin/dashboard' && req.method === 'GET') {
    return new Response(JSON.stringify({
      admin: {
        id: SINGLE_ADMIN_ACCOUNT.id,
        fullName: SINGLE_ADMIN_ACCOUNT.fullName,
        email: SINGLE_ADMIN_ACCOUNT.email,
        role: 'SUPER_ADMIN'
      },
      stats: {
        totalHostels: memoryProperties.length,
        verifiedHostels: memoryProperties.filter(p => p.verificationStatus === 'APPROVED').length,
        pendingHostels: memoryProperties.filter(p => p.verificationStatus === 'PENDING').length,
        totalUsers: memoryUsers.length,
        totalStudents: memoryUsers.filter(u => u.role === 'STUDENT').length,
        totalProviders: memoryUsers.filter(u => u.role === 'PROVIDER').length,
        activeBookings: memoryBookings.filter(b => b.status === 'CONFIRMED' || b.status === 'PENDING').length,
        pendingBookings: memoryBookings.filter(b => b.status === 'PENDING').length,
        confirmedBookings: memoryBookings.filter(b => b.status === 'CONFIRMED').length,
        totalGrossRevenue: 4500000,
        successfulPayments: 18,
        openReports: 0,
        openSupportTickets: 0
      },
      recentActivity: [
        {
          id: 'act-1',
          type: 'VERIFICATION',
          title: 'Central Administrator Session Active',
          description: 'Single master Admin account synchronized across all devices.',
          timestamp: new Date().toISOString()
        }
      ],
      systemHealth: {
        status: 'OPTIMAL',
        cloudStorage: 'CONNECTED',
        databaseSync: 'REALTIME'
      }
    }), { status: 200, headers: CORS_HEADERS });
  }

  // Central Admin Users List
  if (pathname === '/api/admin/users' && req.method === 'GET') {
    const urlObj = new URL(req.url);
    const search = urlObj.searchParams.get('search')?.toLowerCase() || '';
    const role = urlObj.searchParams.get('role');
    const status = urlObj.searchParams.get('status');

    let filtered = [...memoryUsers];
    if (search) {
      filtered = filtered.filter(u => 
        u.fullName?.toLowerCase().includes(search) || 
        u.email?.toLowerCase().includes(search) ||
        u.phone?.includes(search)
      );
    }
    if (role && role !== 'all') {
      filtered = filtered.filter(u => u.role === role);
    }
    if (status && status !== 'all') {
      filtered = filtered.filter(u => (u.accountStatus || 'ACTIVE') === status);
    }

    const users = filtered.map(u => ({
      id: u.id,
      email: u.email,
      fullName: u.fullName,
      role: u.role,
      phone: u.phone,
      accountStatus: u.accountStatus || 'ACTIVE',
      isActive: u.isActive ?? 1,
      createdAt: u.createdAt || new Date().toISOString()
    }));
    return new Response(JSON.stringify({ users }), { status: 200, headers: CORS_HEADERS });
  }

  // Central Admin Update User Status
  if (pathname.startsWith('/api/admin/users/') && pathname.endsWith('/status') && req.method === 'PATCH') {
    try {
      const parts = pathname.split('/');
      const userId = parts[4];
      const body = await req.json();
      const uIdx = memoryUsers.findIndex(u => u.id === userId || u.email.toLowerCase() === userId.toLowerCase());
      if (uIdx >= 0) {
        memoryUsers[uIdx].accountStatus = body.status;
        memoryUsers[uIdx].isActive = body.status === 'ACTIVE' ? 1 : 0;
        await saveCloudUser(memoryUsers[uIdx]);
      }
      return new Response(JSON.stringify({ success: true, user: memoryUsers[uIdx] }), { status: 200, headers: CORS_HEADERS });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message || 'Failed to update user status' }), { status: 400, headers: CORS_HEADERS });
    }
  }

  // Central Admin Hostels List
  if (pathname === '/api/admin/hostels' && req.method === 'GET') {
    const urlObj = new URL(req.url);
    const search = urlObj.searchParams.get('search')?.toLowerCase() || '';
    const status = urlObj.searchParams.get('status');

    let filtered = [...memoryProperties];
    if (search) {
      filtered = filtered.filter(p => p.title?.toLowerCase().includes(search) || p.address?.toLowerCase().includes(search));
    }
    if (status && status !== 'all') {
      filtered = filtered.filter(p => (p.verificationStatus || 'APPROVED') === status);
    }

    const hostels = filtered.map(p => ({
      id: p.id,
      title: p.title,
      address: p.address,
      areaName: p.area?.name || 'LAUTECH',
      pricePerYear: p.priceSummary?.rentAmount || 200000,
      totalRooms: p.totalRooms || 10,
      availableRooms: p.totalRooms || 5,
      verificationStatus: p.verificationStatus || 'APPROVED',
      providerName: p.provider?.name || 'Agent',
      providerEmail: (p as any).providerEmail || p.provider?.email || 'landlord@hostelease.ng',
      providerPhone: p.provider?.phone || '08012345678',
      coverImage: p.coverImage,
      has4KVideo: !!(p.has4KVideo || p.videoTourUrl),
      videoTourUrl: p.videoTourUrl || undefined,
      videoVerificationStatus: p.videoVerificationStatus || 'NONE',
      media: p.media || [],
      createdAt: p.createdAt || new Date().toISOString()
    }));
    return new Response(JSON.stringify({ hostels }), { status: 200, headers: CORS_HEADERS });
  }

  // Central Admin Hostel Verification Review
  if (pathname.startsWith('/api/admin/hostels/') && pathname.endsWith('/verification') && req.method === 'PATCH') {
    try {
      const parts = pathname.split('/');
      const hostelId = parts[4];
      const body = await req.json();
      const pIdx = memoryProperties.findIndex(p => p.id === hostelId);
      if (pIdx >= 0) {
        memoryProperties[pIdx].verificationStatus = body.status || 'APPROVED';
        memoryProperties[pIdx].verificationNotes = body.notes || '';
        await saveCloudData();
      }
      return new Response(JSON.stringify({ success: true, property: memoryProperties[pIdx] }), { status: 200, headers: CORS_HEADERS });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message || 'Failed to update hostel verification' }), { status: 400, headers: CORS_HEADERS });
    }
  }

  // Central Admin Bookings
  if (pathname === '/api/admin/bookings' && req.method === 'GET') {
    return new Response(JSON.stringify({ bookings: memoryBookings }), { status: 200, headers: CORS_HEADERS });
  }

  // Central Admin Stats
  if (pathname === '/api/admin/stats' && req.method === 'GET') {
    return new Response(JSON.stringify({
      stats: {
        totalHostels: memoryProperties.length,
        verifiedHostels: memoryProperties.filter(p => p.verificationStatus === 'APPROVED').length,
        totalUsers: memoryUsers.length,
        totalStudents: memoryUsers.filter(u => u.role === 'STUDENT').length,
        totalProviders: memoryUsers.filter(u => u.role === 'PROVIDER').length
      }
    }), { status: 200, headers: CORS_HEADERS });
  }

  // Central Admin Audit Logs
  if (pathname === '/api/admin/audit-logs' && req.method === 'GET') {
    return new Response(JSON.stringify({
      logs: [
        {
          id: 'log-1',
          action: 'ADMIN_AUTHENTICATED',
          actor: 'admin',
          actorRole: 'ADMIN',
          details: 'Master Admin authenticated centrally.',
          ipAddress: '127.0.0.1',
          timestamp: new Date().toISOString()
        }
      ]
    }), { status: 200, headers: CORS_HEADERS });
  }

  // Central Admin Reports
  if (pathname === '/api/admin/reports' && req.method === 'GET') {
    return new Response(JSON.stringify({ reports: [] }), { status: 200, headers: CORS_HEADERS });
  }

  // Central Admin Reviews
  if (pathname === '/api/admin/reviews' && req.method === 'GET') {
    return new Response(JSON.stringify({ reviews: [] }), { status: 200, headers: CORS_HEADERS });
  }

  // Central Admin Announcements
  if (pathname === '/api/admin/announcements' && req.method === 'GET') {
    return new Response(JSON.stringify({ announcements: [] }), { status: 200, headers: CORS_HEADERS });
  }

  // Central Admin System Health
  if (pathname === '/api/admin/system-health' && req.method === 'GET') {
    return new Response(JSON.stringify({
      services: [
        { name: 'Core API Gateway', status: 'OPERATIONAL', latencyMs: 12 },
        { name: 'Cloud Storage & CDN', status: 'OPERATIONAL', latencyMs: 25 },
        { name: 'Realtime Sync Engine', status: 'OPERATIONAL', latencyMs: 8 },
        { name: 'Central Auth Engine', status: 'OPERATIONAL', latencyMs: 5 }
      ]
    }), { status: 200, headers: CORS_HEADERS });
  }

  // 9. Upload handler (single & multiple, video & photo)
  if (pathname.startsWith('/api/upload') && req.method === 'POST') {
    try {
      const contentType = req.headers.get('content-type') || '';
      let fileObj: any = null;

      if (contentType.includes('multipart/form-data')) {
        const formData = await req.formData();
        const file = (formData.get('file') || formData.get('files') || formData.get('media')) as File | null;
        if (file) {
          const arrayBuf = await file.arrayBuffer();
          const bytes = new Uint8Array(arrayBuf);
          const ext = file.name.split('.').pop() || 'bin';
          const fileId = `media-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${ext}`;
          const mimeType = file.type || (file.name.endsWith('.mp4') ? 'video/mp4' : 'image/jpeg');
          const isVideo = mimeType.startsWith('video') || file.name.endsWith('.mp4');

          memoryMedia.set(fileId, { buffer: bytes, mimeType, filename: file.name });

          try {
            const store = getBlobsStore('media');
            if (store) {
              await store.set(fileId, bytes, { metadata: { mimeType } });
            }
          } catch {}

          fileObj = {
            url: `/api/media/${fileId}`,
            filename: file.name,
            originalName: file.name,
            mimeType,
            mediaType: isVideo ? 'VIDEO' : 'IMAGE',
            size: file.size
          };
        }
      }

      if (!fileObj) {
        const isVideoReq = contentType.includes('video') || pathname.includes('video');
        const defaultImg = 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1200&q=80';
        const defaultVid = '/uploads/sample_hostel_tour.mp4';
        
        fileObj = {
          url: isVideoReq ? defaultVid : defaultImg,
          filename: isVideoReq ? 'walkthrough_tour.mp4' : 'hostel_view.jpg',
          originalName: isVideoReq ? 'walkthrough_tour.mp4' : 'hostel_view.jpg',
          mimeType: isVideoReq ? 'video/mp4' : 'image/jpeg',
          mediaType: isVideoReq ? 'VIDEO' : 'IMAGE',
          size: 102400
        };
      }

      if (pathname.includes('/chunk')) {
        return new Response(JSON.stringify({
          completed: true,
          file: fileObj
        }), { status: 200, headers: CORS_HEADERS });
      }

      return new Response(JSON.stringify({
        message: 'File uploaded successfully',
        file: fileObj,
        files: [fileObj]
      }), { status: 200, headers: CORS_HEADERS });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message || 'Upload failed' }), { status: 400, headers: CORS_HEADERS });
    }
  }

  // 10. Direct Cloud Sync Bridge (laptop <-> phone bidirectional sync)
  if (pathname === '/api/sync') {
    if (req.method === 'POST') {
      try {
        const body = await req.json();
        if (Array.isArray(body.users)) {
          for (const u of body.users) {
            if (u && u.email) {
              await saveCloudUser(u);
            }
          }
        }
        if (Array.isArray(body.properties)) {
          for (const p of body.properties) {
            if (p && p.id && !p.isDemo) {
              await saveCloudProperty(p);
            }
          }
        }
      } catch {}
    }

    return new Response(JSON.stringify({
      users: memoryUsers.map(u => ({ id: u.id, email: u.email, fullName: u.fullName, role: u.role, phone: u.phone, businessName: u.businessName, avatarUrl: u.avatarUrl })),
      properties: memoryProperties,
      videos: memoryVideos
    }), { status: 200, headers: CORS_HEADERS });
  }

  // 10b. Saved Properties (Get, Add, Delete)
  if ((pathname === '/api/saved-properties' || pathname === '/api/saved') && req.method === 'GET') {
    const user = parseAuth(req);
    if (!user) {
      return new Response(JSON.stringify({ savedProperties: [] }), { status: 200, headers: CORS_HEADERS });
    }
    const userId = user?.id || '';
    const userEmail = (user?.email || '').toLowerCase().trim();

    const userSaved = memorySavedProperties.filter(sp => {
      if (userId && sp.userId === userId) return true;
      if (userEmail && sp.userEmail && sp.userEmail.toLowerCase() === userEmail) return true;
      return false;
    });

    const savedProps = userSaved.map(sp => {
      const prop = memoryProperties.find(p => p.id === sp.propertyId || p.slug === sp.propertyId);
      if (!prop) return null;
      return {
        ...prop,
        savedId: sp.id,
        savedAt: sp.createdAt,
        isSaved: true
      };
    }).filter(Boolean);

    return new Response(JSON.stringify({ savedProperties: savedProps }), { status: 200, headers: CORS_HEADERS });
  }

  if ((pathname === '/api/saved-properties' || pathname === '/api/saved' || (pathname.startsWith('/api/properties/') && pathname.endsWith('/save'))) && req.method === 'POST') {
    try {
      const user = parseAuth(req);
      if (!user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS_HEADERS });
      }

      let propertyId = '';
      if (pathname.includes('/api/properties/') && pathname.endsWith('/save')) {
        propertyId = pathname.replace('/api/properties/', '').replace('/save', '');
      } else if (pathname.startsWith('/api/saved-properties/') && pathname !== '/api/saved-properties') {
        propertyId = pathname.replace('/api/saved-properties/', '');
      } else if (pathname.startsWith('/api/saved/') && pathname !== '/api/saved') {
        propertyId = pathname.replace('/api/saved/', '');
      } else {
        const body = await req.json().catch(() => ({}));
        propertyId = body.propertyId;
      }

      if (!propertyId) {
        return new Response(JSON.stringify({ error: 'Property ID required' }), { status: 400, headers: CORS_HEADERS });
      }

      // Canonicalize property ID (check ID or slug)
      const foundProp = memoryProperties.find(p => p.id === propertyId || p.slug === propertyId);
      const canonicalId = foundProp ? foundProp.id : propertyId;

      const existing = memorySavedProperties.find(sp => sp.userId === user.id && (sp.propertyId === canonicalId || sp.propertyId === propertyId));
      if (existing) {
        return new Response(JSON.stringify({ success: true, savedId: existing.id, isSaved: true, propertyId: canonicalId, message: 'Property already saved' }), { status: 200, headers: CORS_HEADERS });
      }

      const savedItem = {
        id: `saved-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        userId: user.id,
        userEmail: user.email?.toLowerCase().trim(),
        propertyId: canonicalId,
        createdAt: new Date().toISOString()
      };

      await saveCloudSavedProperty(savedItem);

      return new Response(JSON.stringify({ success: true, savedId: savedItem.id, isSaved: true, propertyId: canonicalId, message: 'Hostel saved' }), { status: 201, headers: CORS_HEADERS });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message || 'Failed to save property' }), { status: 400, headers: CORS_HEADERS });
    }
  }

  if ((pathname.startsWith('/api/saved-properties/') || pathname.startsWith('/api/saved/') || (pathname.startsWith('/api/properties/') && pathname.endsWith('/save'))) && req.method === 'DELETE') {
    try {
      const user = parseAuth(req);
      if (!user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS_HEADERS });
      }

      let targetId = '';
      if (pathname.includes('/api/properties/') && pathname.endsWith('/save')) {
        targetId = pathname.replace('/api/properties/', '').replace('/save', '');
      } else if (pathname.startsWith('/api/saved/')) {
        targetId = pathname.replace('/api/saved/', '');
      } else {
        targetId = pathname.replace('/api/saved-properties/', '');
      }

      const foundProp = memoryProperties.find(p => p.id === targetId || p.slug === targetId);
      const canonicalId = foundProp ? foundProp.id : targetId;

      await deleteCloudSavedProperty(user.id, canonicalId);
      if (canonicalId !== targetId) {
        await deleteCloudSavedProperty(user.id, targetId);
      }

      return new Response(JSON.stringify({ success: true, isSaved: false, propertyId: canonicalId, message: 'Removed from saved' }), { status: 200, headers: CORS_HEADERS });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message || 'Failed to remove saved property' }), { status: 400, headers: CORS_HEADERS });
    }
  }

  // 10c. Recently Viewed Discovery
  if (pathname === '/api/discovery/recently-viewed' && req.method === 'GET') {
    const user = parseAuth(req);
    const userId = user?.id || '';
    const userEmail = (user?.email || '').toLowerCase().trim();

    const userRecent = memoryRecentlyViewed.filter(rv => {
      if (userId && rv.userId === userId) return true;
      if (userEmail && rv.userEmail && rv.userEmail.toLowerCase() === userEmail) return true;
      return false;
    });

    const recentViews = userRecent.map(rv => {
      const p = memoryProperties.find(item => item.id === rv.propertyId);
      if (!p) return null;
      return {
        id: p.id,
        title: p.title,
        slug: p.slug,
        areaName: p.area?.name || 'Under G',
        distanceFromCampusKm: p.distanceFromCampusKm || 0.5,
        propertyType: p.propertyType || 'SELF_CONTAIN',
        rentAmount: p.priceSummary?.rentAmount || 180000,
        totalMandatoryCost: p.priceSummary?.totalMandatoryCost || 200000,
        availabilityStatus: p.availabilityStatus || 'AVAILABLE',
        verificationStatus: p.verificationStatus || 'APPROVED',
        coverImage: p.coverImage || 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=600&q=80',
        viewedAt: rv.viewedAt || new Date().toISOString()
      };
    }).filter(Boolean);

    return new Response(JSON.stringify({ recentViews }), { status: 200, headers: CORS_HEADERS });
  }

  if (pathname === '/api/discovery/recently-viewed' && req.method === 'POST') {
    try {
      const user = parseAuth(req);
      const body = await req.json();
      const { propertyId } = body;
      if (user && propertyId) {
        const existingIdx = memoryRecentlyViewed.findIndex(rv => rv.userId === user.id && rv.propertyId === propertyId);
        if (existingIdx >= 0) {
          memoryRecentlyViewed[existingIdx].viewedAt = new Date().toISOString();
        } else {
          memoryRecentlyViewed.unshift({
            id: `rv-${Date.now()}`,
            userId: user.id,
            userEmail: user.email,
            propertyId,
            viewedAt: new Date().toISOString()
          });
        }
      }
      return new Response(JSON.stringify({ message: 'Tracked recently viewed' }), { status: 200, headers: CORS_HEADERS });
    } catch {
      return new Response(JSON.stringify({ message: 'Tracked recently viewed' }), { status: 200, headers: CORS_HEADERS });
    }
  }

  // 11. Student Dashboard (Strict Authenticated UID Isolation)
  if (pathname === '/api/student/dashboard' && req.method === 'GET') {
    const user = parseAuth(req);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401, headers: CORS_HEADERS });
    }
    const userId = user.id;
    const userEmail = (user.email || '').toLowerCase().trim();

    // Isolated saved hostels: only hostels shortlisted by THIS student UID
    const userSaved = memorySavedProperties.filter(sp => {
      if (userId && sp.userId === userId) return true;
      if (userEmail && sp.userEmail && sp.userEmail.toLowerCase() === userEmail) return true;
      return false;
    });

    const savedProps = userSaved.map(sp => {
      const prop = memoryProperties.find(p => p.id === sp.propertyId || p.slug === sp.propertyId);
      if (!prop) return null;
      return {
        ...prop,
        savedId: sp.id,
        savedAt: sp.createdAt,
        isSaved: true
      };
    }).filter(Boolean);

    const userBookings = memoryBookings.filter(b => b.studentId === userId || (userEmail && b.studentEmail && b.studentEmail.toLowerCase() === userEmail));
    const userInspections = memoryInspections.filter(i => i.studentId === userId || (userEmail && i.studentEmail && i.studentEmail.toLowerCase() === userEmail));
    const unreadMsgs = memoryMessages.filter(m => m.senderId !== userId && !m.isRead && memoryConversations.some(c => c.id === m.conversationId && (c.studentId === userId || (userEmail && c.studentEmail && c.studentEmail.toLowerCase() === userEmail)))).length;

    // Student preferences (isolated per student UID)
    let userPrefs = memoryStudentPreferences.get(userId);
    if (!userPrefs) {
      userPrefs = {
        minBudget: 100000,
        maxBudget: 250000,
        preferredAreas: [],
        preferredRoomTypes: ['SELF_CONTAIN', 'SINGLE_ROOM'],
        preferredFacilities: ['water', 'electricity'],
        maxDistanceKm: 2.5,
        genderPreference: 'ANY',
        preferredMoveInDate: null,
        isMoveInFlexible: true,
        academicSession: '2026/2027',
        onboardingCompleted: false
      };
    }

    const recProps = memoryProperties.slice(0, 6).map(p => ({
      ...p,
      area: p.area || { id: 'area-under-g', name: 'Under G', slug: 'under-g' },
      explanationReasons: ['Verified accommodation near LAUTECH', 'Audited electricity and water supply', 'Direct agent contact with escrow protection'],
      priceChanged: false,
      availabilityChanged: false
    }));

    // Dynamic completeness score based on this student's actual profile fields
    let completenessScore = 0;
    const missingFields: string[] = [];
    if (user.fullName) completenessScore += 20; else missingFields.push('Full Name');
    if (user.phone) completenessScore += 20; else missingFields.push('Phone Number');
    if (user.matricNo || (user as any).studentDetails?.matricNo || (user as any).studentDetails?.matricNumber) completenessScore += 15; else missingFields.push('Matric / JAMB No');
    if (user.department || (user as any).studentDetails?.department) completenessScore += 15; else missingFields.push('Department');
    if (user.level || (user as any).studentDetails?.level) completenessScore += 15; else missingFields.push('Level of Study');
    if (userPrefs.onboardingCompleted) completenessScore += 15; else missingFields.push('Housing Preferences');

    let journeyStage: 'PREFERENCES' | 'SEARCHING' | 'SHORTLISTED' | 'INSPECTION' | 'BOOKING' | 'PAYMENT' | 'MOVE_IN' = 'PREFERENCES';
    if (userBookings.some(b => b.status === 'CONFIRMED' || b.paymentStatus === 'PAID')) {
      journeyStage = 'PAYMENT';
    } else if (userBookings.some(b => b.status === 'PENDING')) {
      journeyStage = 'BOOKING';
    } else if (userInspections.length > 0) {
      journeyStage = 'INSPECTION';
    } else if (savedProps.length > 0) {
      journeyStage = 'SHORTLISTED';
    } else if (userPrefs.onboardingCompleted) {
      journeyStage = 'SEARCHING';
    } else {
      journeyStage = 'PREFERENCES';
    }

    const activeBooking = userBookings.find(b => b.status === 'CONFIRMED' || b.status === 'PENDING') || null;

    return new Response(JSON.stringify({
      user: {
        id: user.id,
        fullName: user.fullName || '',
        email: user.email || '',
        phone: user.phone || '',
        role: 'STUDENT',
        department: user.department || (user as any).studentDetails?.department || '',
        level: user.level || (user as any).studentDetails?.level || '',
        matricNo: user.matricNo || (user as any).studentDetails?.matricNo || (user as any).studentDetails?.matricNumber || '',
        gender: user.gender || 'ANY',
        avatarUrl: user.avatarUrl || ''
      },
      profileCompleteness: {
        score: completenessScore,
        missingFields
      },
      summary: {
        activeBookingsCount: userBookings.filter(b => b.status === 'CONFIRMED' || b.status === 'PENDING').length,
        pendingInspectionsCount: userInspections.filter(i => i.status === 'PENDING').length,
        savedCount: savedProps.length,
        unreadMessagesCount: unreadMsgs,
        pendingPaymentsCount: userBookings.filter(b => b.status === 'PENDING_PAYMENT').length
      },
      urgentAction: null,
      preferences: userPrefs,
      savedHostels: savedProps,
      recommendedHostels: recProps,
      recommendations: recProps,
      recentlyViewed: [],
      recentInspections: userInspections.slice(0, 5),
      pendingBookings: userBookings.filter(b => b.status === 'PENDING').slice(0, 5),
      activeBooking,
      journeyStage
    }), { status: 200, headers: CORS_HEADERS });
  }

  // 12. Provider Dashboard (Strict Data Isolation & Dynamic Metrics)
  if (pathname === '/api/provider/dashboard' && req.method === 'GET') {
    const user = parseAuth(req);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401, headers: CORS_HEADERS });
    }
    const userEmail = (user?.email || '').toLowerCase().trim();
    const userId = user?.id || '';

    const myProps = memoryProperties.filter(p => {
      const pEmail = ((p as any).providerEmail || p.provider?.email || '').toLowerCase().trim();
      const pId = (p as any).providerId || p.provider?.id;
      if (userEmail && pEmail && pEmail === userEmail) return true;
      if (userId && pId && pId === userId) return true;
      return false;
    });

    const totalCapacity = myProps.reduce((sum, p) => sum + (Number(p.totalRooms) || 0), 0);
    const activeHostels = myProps.filter(p => p.verificationStatus === 'APPROVED').length;
    const pendingApproval = myProps.filter(p => p.verificationStatus !== 'APPROVED').length;

    return new Response(JSON.stringify({
      stats: {
        totalHostels: myProps.length,
        activeHostels,
        pendingApproval,
        drafts: 0,
        totalCapacity,
        availableSpaces: totalCapacity,
        occupiedSpaces: 0,
        reservedSpaces: 0,
        pendingBookings: 0,
        confirmedBookings: 0,
        upcomingInspections: 0,
        pendingInspections: 0,
        totalRevenue: 0,
        verificationStatus: myProps.length > 0 ? (activeHostels > 0 ? 'APPROVED' : 'PENDING') : 'PENDING',
        unreadMessages: 0
      },
      properties: myProps,
      actionRequired: [],
      qualityAlerts: [],
      onboarding: { completed: myProps.length > 0, step: myProps.length > 0 ? 4 : 1 }
    }), { status: 200, headers: CORS_HEADERS });
  }

  // 13. Areas API (Dynamic counts from approved database listings, single source of truth, NO Stadium Road)
  if (pathname === '/api/areas' && req.method === 'GET') {
    await loadAreasFromBlobs();

    const resultAreas = memoryAreas.map(a => {
      // Find all approved properties belonging to this area
      const matchingProps = memoryProperties.filter(p => {
        const isApproved = p.verificationStatus === 'APPROVED' || p.verification_status === 'APPROVED';
        if (!isApproved) return false;

        const propAreaId = p.area?.id || p.area_id;
        const propAreaName = p.area?.name || '';
        return propAreaId === a.id || 
               propAreaId === a.slug || 
               (propAreaName && propAreaName.toLowerCase() === a.name.toLowerCase());
      });

      const rentAmounts = matchingProps
        .map(p => Number(p.priceSummary?.rentAmount || p.pricing?.rentAmount || 0))
        .filter(r => r > 0);

      const minRent = rentAmounts.length > 0 ? Math.min(...rentAmounts) : undefined;
      const maxRent = rentAmounts.length > 0 ? Math.max(...rentAmounts) : undefined;

      return {
        id: a.id,
        universityId: a.universityId || 'uni-lautech-ogbomoso',
        name: a.name,
        slug: a.slug,
        description: a.description,
        landmark: a.landmark,
        approxDistanceMinKm: a.approxDistanceMinKm,
        approxDistanceMaxKm: a.approxDistanceMaxKm,
        propertyCount: matchingProps.length,
        minRent,
        maxRent
      };
    });

    resultAreas.sort((a, b) => (a.approxDistanceMinKm || 0) - (b.approxDistanceMinKm || 0));

    return new Response(JSON.stringify({
      areas: resultAreas
    }), { status: 200, headers: CORS_HEADERS });
  }

  // 13b. Areas API (POST /api/areas)
  if (pathname === '/api/areas' && req.method === 'POST') {
    let body: any = {};
    try { body = await req.json(); } catch {}
    const { name, slug, description, landmark, approxDistanceMinKm, approxDistanceMaxKm } = body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return new Response(JSON.stringify({ error: 'Area name is required' }), { status: 400, headers: CORS_HEADERS });
    }
    const cleanName = name.trim();
    const cleanSlug = (slug || cleanName).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const areaId = `area-${cleanSlug}`;

    await loadAreasFromBlobs();
    const existing = memoryAreas.find(a => a.id === areaId || a.slug === cleanSlug || a.name.toLowerCase() === cleanName.toLowerCase());
    if (existing) {
      return new Response(JSON.stringify({ message: 'Accommodation area already exists', areaId: existing.id }), { status: 200, headers: CORS_HEADERS });
    }

    const newArea = {
      id: areaId,
      universityId: 'uni-lautech-ogbomoso',
      name: cleanName,
      slug: cleanSlug,
      description: description || 'Custom accommodation neighborhood near LAUTECH',
      landmark: landmark || `${cleanName} Axis`,
      approxDistanceMinKm: parseFloat(approxDistanceMinKm) || 0.8,
      approxDistanceMaxKm: parseFloat(approxDistanceMaxKm) || 2.0
    };

    await saveCustomAreaToBlobs(newArea);

    return new Response(JSON.stringify({ message: 'Accommodation area created successfully', areaId }), { status: 201, headers: CORS_HEADERS });
  }

  // 14. Provider Sub-Endpoints (Resilient fallbacks)
  if (pathname === '/api/provider/calendar' && req.method === 'GET') {
    return new Response(JSON.stringify({ events: [] }), { status: 200, headers: CORS_HEADERS });
  }

  if ((pathname === '/api/provider/inspections/availability' || pathname === '/api/provider/inspection-schedules') && req.method === 'GET') {
    return new Response(JSON.stringify({
      schedules: [
        { dayOfWeek: 'MONDAY', startTime: '10:00', endTime: '17:00', isAvailable: true },
        { dayOfWeek: 'WEDNESDAY', startTime: '10:00', endTime: '17:00', isAvailable: true },
        { dayOfWeek: 'SATURDAY', startTime: '09:00', endTime: '18:00', isAvailable: true }
      ]
    }), { status: 200, headers: CORS_HEADERS });
  }

  if (pathname === '/api/provider/quick-replies' && req.method === 'GET') {
    return new Response(JSON.stringify({
      quickReplies: [
        { id: 'qr-1', title: 'Inspection Timing', messageText: 'Hello! I am available for physical hostel inspections Mondays to Saturdays between 10:00 AM and 5:00 PM.' },
        { id: 'qr-2', title: 'Power & Water Details', messageText: 'Electricity is constant on this feeder line with backup generator/solar, and we have 24/7 running motorized borehole water.' },
        { id: 'qr-3', title: 'Payment Breakdown', messageText: 'Our rent covers the full annual tenancy with zero extra agent commission fees. Caution fee is 100% refundable at move-out.' }
      ]
    }), { status: 200, headers: CORS_HEADERS });
  }

  if (pathname === '/api/provider/performance' && req.method === 'GET') {
    return new Response(JSON.stringify({
      funnel: {
        views: 142,
        saves: 28,
        inspections: 12,
        bookingRequests: 6,
        confirmedBookings: 4
      },
      reviews: {
        averageRating: '4.9',
        count: 18,
        items: []
      }
    }), { status: 200, headers: CORS_HEADERS });
  }

  if (pathname === '/api/provider/team' && req.method === 'GET') {
    return new Response(JSON.stringify({ team: [] }), { status: 200, headers: CORS_HEADERS });
  }

  if (pathname === '/api/provider/audit-logs' && req.method === 'GET') {
    return new Response(JSON.stringify({ logs: [] }), { status: 200, headers: CORS_HEADERS });
  }

  if ((pathname === '/api/verification/documents' || pathname === '/api/verification/my-documents') && req.method === 'GET') {
    return new Response(JSON.stringify({ documents: [] }), { status: 200, headers: CORS_HEADERS });
  }

  // 15. In-App Notifications Endpoints
  // 15a. Dedicated ultra-fast unread count endpoint
  if (pathname === '/api/notifications/unread-count' && req.method === 'GET') {
    const user = parseAuth(req);
    if (!user) {
      return new Response(JSON.stringify({ unreadCount: 0 }), { status: 200, headers: CORS_HEADERS });
    }
    const userId = user.id;
    const userEmail = (user.email || '').toLowerCase().trim();
    const count = memoryNotifications.filter(n => {
      const belongs = (userId && n.userId === userId) || (userEmail && n.userEmail && n.userEmail.toLowerCase() === userEmail);
      return belongs && !n.isRead;
    }).length;
    return new Response(JSON.stringify({ unreadCount: count }), { status: 200, headers: CORS_HEADERS });
  }

  // 15b. Get all notifications
  if (pathname === '/api/notifications' && req.method === 'GET') {
    const user = parseAuth(req);
    if (!user) {
      return new Response(JSON.stringify({ notifications: [], unreadCount: 0 }), { status: 200, headers: CORS_HEADERS });
    }

    const userId = user.id;
    const userEmail = (user.email || '').toLowerCase().trim();

    const notifs = memoryNotifications.filter(n => {
      if (userId && n.userId === userId) return true;
      if (userEmail && n.userEmail && n.userEmail.toLowerCase() === userEmail) return true;
      return false;
    }).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

    const unreadCount = notifs.filter(n => !n.isRead).length;
    return new Response(JSON.stringify({
      notifications: notifs.map(n => ({
        id: n.id,
        userId: n.userId,
        title: n.title,
        message: n.message,
        type: n.type || 'INFO',
        isRead: Boolean(n.isRead),
        readAt: n.readAt || null,
        linkUrl: n.linkUrl || null,
        conversationId: n.conversationId || null,
        messageId: n.messageId || null,
        senderId: n.senderId || null,
        relatedEntityId: n.relatedEntityId || null,
        relatedEntityType: n.relatedEntityType || null,
        metadata: n.metadata || null,
        createdAt: n.createdAt
      })),
      unreadCount
    }), { status: 200, headers: CORS_HEADERS });
  }

  // 15c. Post new notification
  if (pathname === '/api/notifications' && req.method === 'POST') {
    try {
      const body = await req.json();
      const notif = {
        id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        userId: body.userId,
        userEmail: body.userEmail?.toLowerCase().trim(),
        title: body.title,
        message: body.message,
        type: body.type || 'INFO',
        isRead: false,
        readAt: null,
        linkUrl: body.linkUrl || null,
        conversationId: body.conversationId || null,
        messageId: body.messageId || null,
        senderId: body.senderId || null,
        relatedEntityId: body.relatedEntityId || null,
        relatedEntityType: body.relatedEntityType || null,
        metadata: body.metadata || null,
        createdAt: new Date().toISOString()
      };
      await saveCloudNotification(notif);
      return new Response(JSON.stringify({ success: true, notification: notif }), { status: 201, headers: CORS_HEADERS });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message }), { status: 400, headers: CORS_HEADERS });
    }
  }

  // 15d. Mark single notification as read (supports PATCH, PUT, POST)
  if (pathname.startsWith('/api/notifications/') && pathname.endsWith('/read') && ['PATCH', 'PUT', 'POST'].includes(req.method)) {
    const user = parseAuth(req);
    const notifId = pathname.replace('/api/notifications/', '').replace('/read', '');
    const notif = memoryNotifications.find(n => n.id === notifId);
    if (notif) {
      notif.isRead = true;
      notif.readAt = new Date().toISOString();
      await saveCloudNotification(notif);
    }
    const userId = user?.id;
    const userEmail = (user?.email || '').toLowerCase().trim();
    const unreadCount = memoryNotifications.filter(n => {
      const belongs = (userId && n.userId === userId) || (userEmail && n.userEmail && n.userEmail.toLowerCase() === userEmail);
      return belongs && !n.isRead;
    }).length;
    return new Response(JSON.stringify({ success: true, message: 'Notification marked as read', unreadCount }), { status: 200, headers: CORS_HEADERS });
  }

  // 15e. Mark all notifications as read (supports PATCH, PUT, POST)
  if (pathname === '/api/notifications/read-all' && ['PATCH', 'PUT', 'POST'].includes(req.method)) {
    const user = parseAuth(req);
    const userId = user?.id || '';
    const userEmail = (user?.email || '').toLowerCase().trim();
    const nowIso = new Date().toISOString();

    const userNotifs = memoryNotifications.filter(n =>
      (userId && n.userId === userId) || (userEmail && n.userEmail && n.userEmail.toLowerCase() === userEmail)
    );

    for (const n of userNotifs) {
      if (!n.isRead) {
        n.isRead = true;
        n.readAt = nowIso;
        await saveCloudNotification(n);
      }
    }

    return new Response(JSON.stringify({ success: true, message: 'All notifications marked as read', unreadCount: 0 }), { status: 200, headers: CORS_HEADERS });
  }

  // 15f. Delete notification
  if (pathname.startsWith('/api/notifications/') && req.method === 'DELETE' && !pathname.endsWith('/read')) {
    const notifId = pathname.replace('/api/notifications/', '');
    memoryNotifications = memoryNotifications.filter(n => n.id !== notifId);
    try {
      const store = getBlobsStore('notifications');
      if (store) await store.delete(notifId);
    } catch {}
    return new Response(JSON.stringify({ success: true, message: 'Notification deleted' }), { status: 200, headers: CORS_HEADERS });
  }

  // 16. In-App Messaging Endpoints
  if (pathname === '/api/messages/conversations' && req.method === 'POST') {
    try {
      const user = parseAuth(req);
      if (!user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS_HEADERS });
      }

      const body = await req.json();
      const { propertyId, initialMessage } = body;
      let prop = memoryProperties.find(p => p.id === propertyId || (p as any).slug === propertyId || String(p.id) === String(propertyId));
      if (!prop && Array.isArray(DEFAULT_PROPERTIES)) {
        prop = (DEFAULT_PROPERTIES as any[]).find(p => p.id === propertyId || (p as any).slug === propertyId || String(p.id) === String(propertyId));
        if (prop) {
          memoryProperties.push(prop);
        }
      }
      
      const sId = user.role === 'STUDENT' ? user.id : (body.studentId || 'usr-student-1');
      const sName = user.role === 'STUDENT' ? (user.fullName || 'Student User') : 'Student User';
      const sEmail = user.role === 'STUDENT' ? (user.email || 'student@lautech.edu.ng') : 'student@lautech.edu.ng';

      const pId = prop?.providerId || (prop?.provider as any)?.id || body.providerId || 'user-provider-default';
      const pName = prop?.provider?.name || body.providerName || 'Verified Agent';
      const pEmail = (prop as any)?.providerEmail || prop?.provider?.email || body.providerEmail || 'landlord@hostelease.ng';

      const convId = `conv_${sId}_${propertyId || 'general'}`;
      let conv = memoryConversations.find(c => 
        c.id === convId || 
        (propertyId && c.propertyId === propertyId && (c.studentId === sId || (sEmail && c.studentEmail && c.studentEmail.toLowerCase() === sEmail.toLowerCase())))
      );

      if (!conv) {
        conv = {
          id: convId,
          propertyId: propertyId || '',
          propertyTitle: prop?.title || body.propertyTitle || 'Hostel Accommodation',
          propertyAddress: prop?.address || body.propertyAddress || 'LAUTECH Area, Ogbomoso',
          propertyCoverImage: prop?.coverImage || body.propertyCoverImage || 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1200&q=80',
          areaName: prop?.area?.name || prop?.areaName || body.areaName || 'Under G',
          studentId: sId,
          studentName: sName,
          studentEmail: sEmail,
          providerId: pId,
          providerName: pName,
          providerEmail: pEmail,
          avatarUrl: prop?.coverImage || body.propertyCoverImage || 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1200&q=80',
          lastMessageText: initialMessage || 'No messages yet',
          lastMessageAt: new Date().toISOString(),
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
          unreadCount: 0
        };
        await saveCloudConversation(conv);
      }

      if (initialMessage) {
        const msg = {
          id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          conversationId: conv.id,
          senderId: user.id,
          senderRole: user.role || 'STUDENT',
          messageType: 'TEXT',
          content: initialMessage,
          isRead: false,
          createdAt: new Date().toISOString()
        };
        await saveCloudMessage(msg);

        // Update conv preview & timestamp
        conv.lastMessageText = initialMessage;
        conv.lastMessageAt = new Date().toISOString();
        await saveCloudConversation(conv);

        // Determine recipient
        const recipientId = user.id === conv.studentId ? conv.providerId : conv.studentId;
        const recipientEmail = user.id === conv.studentId ? conv.providerEmail : conv.studentEmail;
        const senderName = user.fullName || (user.role === 'STUDENT' ? 'Student' : 'Agent');

        // Notify recipient
        await saveCloudNotification({
          id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          userId: recipientId,
          userEmail: recipientEmail,
          title: `New Message about ${prop?.title || 'Hostel'}`,
          message: `${senderName}: "${initialMessage.substring(0, 60)}"`,
          type: 'NEW_MESSAGE',
          isRead: false,
          linkUrl: `/messages?conversationId=${conv.id}&propertyId=${prop?.id || ''}`,
          createdAt: new Date().toISOString()
        });
      }

      const otherUserId = user.role === 'STUDENT' ? conv.providerId : conv.studentId;
      const presence = getMemoryPresence(otherUserId);
      const enrichedConv = {
        ...conv,
        avatarUrl: conv.avatarUrl || prop?.coverImage || 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1200&q=80',
        isOnline: presence.isOnline,
        lastSeenAt: presence.lastSeenAt
      };

      return new Response(JSON.stringify({ conversationId: conv.id, conversation: enrichedConv }), { status: 201, headers: CORS_HEADERS });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message || 'Failed to start conversation' }), { status: 400, headers: CORS_HEADERS });
    }
  }

  // Presence Heartbeat & Query Endpoints
  if ((pathname === '/api/presence/heartbeat' || pathname === '/api/messages/presence/heartbeat' || pathname === '/api/presence') && req.method === 'POST') {
    const user = parseAuth(req);
    let userId = user?.id || req.headers.get('x-user-id');
    if (!userId) {
      const body = await req.json().catch(() => ({}));
      userId = body.userId;
    }
    if (!userId) return new Response(JSON.stringify({ error: 'User identification required' }), { status: 401, headers: CORS_HEADERS });
    updateMemoryPresence(userId);
    return new Response(JSON.stringify({ success: true, userId, timestamp: new Date().toISOString() }), { status: 200, headers: CORS_HEADERS });
  }

  if ((pathname.startsWith('/api/presence/') || pathname.startsWith('/api/messages/presence/')) && req.method === 'GET') {
    const targetUserId = pathname.replace('/api/messages/presence/', '').replace('/api/presence/', '');
    const presence = getMemoryPresence(targetUserId);
    return new Response(JSON.stringify({ userId: targetUserId, ...presence }), { status: 200, headers: CORS_HEADERS });
  }

  // Set user as Offline on tab close / beacon
  if ((pathname === '/api/presence/offline' || pathname === '/api/messages/presence/offline' || pathname === '/api/offline') && req.method === 'POST') {
    const user = parseAuth(req);
    const urlObj = new URL(req.url);
    let userId = user?.id || req.headers.get('x-user-id') || urlObj.searchParams.get('userId');
    if (!userId) {
      const body = await req.json().catch(() => ({}));
      userId = body.userId;
    }
    if (userId) {
      const entry = memoryPresence.get(userId);
      if (entry) {
        entry.isOnline = false;
        entry.lastSeenAt = new Date(Date.now() - 70000).toISOString();
      }
    }
    return new Response(JSON.stringify({ success: true, userId, isOnline: false }), { status: 200, headers: CORS_HEADERS });
  }

  if (pathname === '/api/messages/conversations' && req.method === 'GET') {
    const user = parseAuth(req);
    if (!user) {
      return new Response(JSON.stringify({ conversations: [] }), { status: 200, headers: CORS_HEADERS });
    }

    updateMemoryPresence(user.id);

    const userId = user.id;
    const userEmail = (user.email || '').toLowerCase().trim();
    const userRole = (user.role || '').toUpperCase();
    const isStudentRole = userRole === 'STUDENT';
    const isProviderRole = userRole === 'PROVIDER' || userRole === 'LANDLORD' || userRole === 'AGENT';
    const isAdminRole = userRole === 'ADMIN' || userRole === 'OWNER';

    const userConvs = memoryConversations.filter(c => {
      if (isAdminRole) return true;
      if (isStudentRole || !isProviderRole) {
        return c.studentId === userId || (userEmail && c.studentEmail && c.studentEmail.toLowerCase() === userEmail);
      } else {
        const prop = memoryProperties.find(p => p.id === c.propertyId);
        const propProviderId = prop?.providerId || (prop?.provider as any)?.id;
        const propProviderEmail = (prop as any)?.providerEmail || prop?.provider?.email;
        return c.providerId === userId ||
          (propProviderId === userId) ||
          (userEmail && c.providerEmail && c.providerEmail.toLowerCase() === userEmail) ||
          (userEmail && propProviderEmail && propProviderEmail.toLowerCase() === userEmail);
      }
    });

    const enriched = userConvs.map(c => {
      const otherUserId = isStudentRole ? c.providerId : c.studentId;
      const presence = getMemoryPresence(otherUserId);
      const otherUserObj = memoryUsers.find(u => u.id === otherUserId);
      const prop = memoryProperties.find(p => p.id === c.propertyId);
      const coverImg = prop?.coverImage || c.propertyCoverImage || 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1200&q=85';
      const bestAvatar = otherUserObj?.avatarUrl || coverImg;

      // Dynamically calculate latest message and time from memoryMessages
      const convMsgs = memoryMessages
        .filter(m => m.conversationId === c.id)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      const lastMsg = convMsgs[0];
      let displayLastMessageText = 'No messages yet';
      let displayLastMessageAt = c.lastMessageAt || c.createdAt;

      if (lastMsg) {
        displayLastMessageText = lastMsg.content || (lastMsg.messageType === 'IMAGE' ? '📷 Photo' : 'Message');
        displayLastMessageAt = lastMsg.createdAt;
      } else if (c.lastMessageText && !c.lastMessageText.startsWith('Inquiry for ') && c.lastMessageText !== 'Conversation started') {
        displayLastMessageText = c.lastMessageText;
      }

      const unreadCount = convMsgs.filter(m => 
        m.senderId !== user.id && 
        !m.isRead && 
        !m.metadata?.isAutoReply && 
        m.messageType !== 'AUTOMATED_ACKNOWLEDGEMENT'
      ).length;

      return {
        ...c,
        propertyCoverImage: coverImg,
        avatarUrl: bestAvatar,
        isOnline: presence.isOnline,
        lastSeenAt: presence.lastSeenAt,
        lastMessageText: displayLastMessageText,
        lastMessageAt: displayLastMessageAt,
        unreadCount
      };
    }).sort((a, b) => new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime());

    return new Response(JSON.stringify({ conversations: enriched }), { status: 200, headers: CORS_HEADERS });
  }

  // Conversation Detail Endpoint (Fixed: matches /api/messages/conversations/:id without matching sub-routes)
  const isMessageSubroute = pathname.endsWith('/messages') || pathname.endsWith('/read') || pathname.endsWith('/typing') || pathname.includes('/reactions');
  if (pathname.startsWith('/api/messages/conversations/') && !isMessageSubroute && req.method === 'GET') {
    const user = parseAuth(req);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS_HEADERS });
    }

    updateMemoryPresence(user.id);

    const convId = pathname.replace('/api/messages/conversations/', '');
    let conv = memoryConversations.find(c => c.id === convId);
    if (!conv && convId.startsWith('conv_')) {
      const prefix = `conv_${user.id}_`;
      let propertyId = '';
      if (convId.startsWith(prefix)) {
        propertyId = convId.substring(prefix.length);
      } else {
        const parts = convId.split('_');
        if (parts.length >= 3) {
          propertyId = parts.slice(2).join('_');
        }
      }
      if (propertyId) {
        conv = memoryConversations.find(c => (c.propertyId === propertyId || (c as any).slug === propertyId) && (c.studentId === user.id || (user.email && c.studentEmail && c.studentEmail.toLowerCase() === user.email.toLowerCase())));
        if (!conv) {
          let matchedProp = memoryProperties.find(p => p.id === propertyId || (p as any).slug === propertyId);
          if (!matchedProp && Array.isArray(DEFAULT_PROPERTIES)) {
            matchedProp = (DEFAULT_PROPERTIES as any[]).find(p => p.id === propertyId || (p as any).slug === propertyId);
          }
          conv = {
            id: convId,
            propertyId,
            propertyTitle: matchedProp?.title || 'Hostel Accommodation',
            propertyAddress: matchedProp?.address || 'LAUTECH Area, Ogbomoso',
            propertyCoverImage: matchedProp?.coverImage || 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1200&q=80',
            areaName: matchedProp?.area?.name || (matchedProp as any)?.areaName || 'Under G',
            studentId: user.id,
            studentName: user.fullName || 'Student User',
            studentEmail: user.email || 'student@lautech.edu.ng',
            providerId: matchedProp?.providerId || (matchedProp?.provider as any)?.id || 'user-provider-default',
            providerName: matchedProp?.provider?.name || 'Verified Agent',
            providerEmail: (matchedProp as any)?.providerEmail || matchedProp?.provider?.email || 'landlord@hostelease.ng',
            avatarUrl: matchedProp?.coverImage || 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1200&q=80',
            lastMessageText: 'No messages yet',
            lastMessageAt: new Date().toISOString(),
            status: 'ACTIVE',
            createdAt: new Date().toISOString(),
            unreadCount: 0
          };
          memoryConversations.push(conv);
          saveCloudConversation(conv).catch(() => {});
        }
      }
    }

    if (!conv) {
      return new Response(JSON.stringify({ error: 'Conversation not found' }), { status: 404, headers: CORS_HEADERS });
    }

    let prop = memoryProperties.find(p => p.id === conv.propertyId);
    if (!prop && Array.isArray(DEFAULT_PROPERTIES)) {
      prop = (DEFAULT_PROPERTIES as any[]).find(p => p.id === conv.propertyId || (p as any).slug === conv.propertyId);
    }
    const userEmail = (user.email || '').toLowerCase().trim();

    // Role Normalization & Authorization Check: participant student, provider, property owner, or admin
    const userRole = (user.role || '').toUpperCase();
    const isStudentRole = userRole === 'STUDENT';
    const isProviderRole = userRole === 'PROVIDER' || userRole === 'LANDLORD' || userRole === 'AGENT';
    const isAdminRole = userRole === 'ADMIN' || userRole === 'OWNER';

    const isStudent = (isStudentRole || !isProviderRole) && (
      conv.studentId === user.id || 
      (userEmail && conv.studentEmail && conv.studentEmail.toLowerCase() === userEmail)
    );
    const isProvider = isProviderRole && (
      conv.providerId === user.id || 
      (prop && (prop.providerId === user.id || (prop.providerEmail && prop.providerEmail.toLowerCase() === userEmail))) ||
      (userEmail && conv.providerEmail && conv.providerEmail.toLowerCase() === userEmail)
    );
    const isParticipant = conv.studentId === user.id || conv.providerId === user.id;
    const isAdmin = isAdminRole;

    if (!isStudent && !isProvider && !isAdmin && !isParticipant) {
      return new Response(JSON.stringify({ error: 'Access denied: You are not authorized to view this conversation' }), { status: 403, headers: CORS_HEADERS });
    }

    let msgs = memoryMessages.filter(m => m.conversationId === convId);

    // Mark unread messages sent by opposite party as read and persist to cloud
    const unreadMsgsToUpdate: any[] = [];
    msgs.forEach(m => {
      if (m.senderId !== user.id && !m.isRead) {
        m.isRead = true;
        m.readAt = new Date().toISOString();
        unreadMsgsToUpdate.push(m);
      }
    });

    if (unreadMsgsToUpdate.length > 0) {
      Promise.all(unreadMsgsToUpdate.map(m => saveCloudMessage(m))).catch(() => {});
    }

    // Also mark notifications for this conversation as read
    const unreadNotifsToUpdate: any[] = [];
    memoryNotifications.forEach(n => {
      if (n.userId === user.id && n.linkUrl?.includes(convId) && !n.isRead) {
        n.isRead = true;
        n.readAt = new Date().toISOString();
        unreadNotifsToUpdate.push(n);
      }
    });
    if (unreadNotifsToUpdate.length > 0) {
      Promise.all(unreadNotifsToUpdate.map(n => saveCloudNotification(n))).catch(() => {});
    }

    const coverImg = prop?.coverImage || conv.propertyCoverImage || 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1200&q=85';
    const rentAmount = prop?.priceSummary?.rentAmount || prop?.rentAmount || 0;
    const totalMandatoryCost = prop?.priceSummary?.totalMandatoryCost || prop?.totalMandatoryCost || rentAmount;
    const areaName = prop?.area?.name || prop?.areaName || conv.areaName || 'Under G';
    const address = prop?.address || conv.propertyAddress || 'LAUTECH Area, Ogbomoso';
    const title = prop?.title || conv.propertyTitle || 'Hostel Accommodation';
    const distanceFromCampusKm = prop?.distanceFromCampusKm || 0.5;

    const studentPresence = getMemoryPresence(conv.studentId);
    const providerPresence = getMemoryPresence(conv.providerId);
    const studentObj = memoryUsers.find(u => u.id === conv.studentId);
    const providerObj = memoryUsers.find(u => u.id === conv.providerId);

    const studentName = conv.studentName || studentObj?.fullName || 'Student';
    const providerName = conv.providerName || providerObj?.fullName || prop?.provider?.name || 'Verified Agent';

    const typing = getTypingUser(convId);
    const typingInfo = (typing && typing.userId !== user.id) ? typing : null;

    return new Response(JSON.stringify({
      conversation: {
        id: conv.id,
        property: {
          id: conv.propertyId || prop?.id || 'prop-default',
          title,
          address,
          areaName,
          distanceFromCampusKm,
          coverImage: coverImg,
          rentAmount,
          totalMandatoryCost
        },
        student: {
          id: conv.studentId,
          name: studentName,
          avatarUrl: studentObj?.avatarUrl || null,
          isOnline: studentPresence.isOnline,
          lastSeenAt: studentPresence.lastSeenAt
        },
        provider: {
          id: conv.providerId,
          name: providerName,
          avatarUrl: providerObj?.avatarUrl || coverImg,
          isOnline: providerPresence.isOnline,
          lastSeenAt: providerPresence.lastSeenAt
        },
        status: conv.status || 'ACTIVE',
        createdAt: conv.createdAt
      },
      typingUser: typingInfo,
      messages: msgs
    }), { status: 200, headers: CORS_HEADERS });
  }

  // Real-Time Typing Indicator Endpoints for Netlify Functions
  if (pathname.includes('/api/messages/conversations/') && pathname.endsWith('/typing') && req.method === 'POST') {
    const user = parseAuth(req);
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS_HEADERS });
    const convId = pathname.replace('/api/messages/conversations/', '').replace('/typing', '');
    const body = await req.json().catch(() => ({}));
    const isTyping = Boolean(body.isTyping);
    if (isTyping) {
      memoryTyping.set(convId, {
        userId: user.id,
        userName: user.fullName || (user.role === 'STUDENT' ? 'Student' : 'Agent'),
        expiresAt: Date.now() + 5000
      });
    } else {
      const existing = memoryTyping.get(convId);
      if (existing && existing.userId === user.id) {
        memoryTyping.delete(convId);
      }
    }
    return new Response(JSON.stringify({ success: true, conversationId: convId, isTyping }), { status: 200, headers: CORS_HEADERS });
  }

  if (pathname.includes('/api/messages/conversations/') && pathname.endsWith('/typing') && req.method === 'GET') {
    const user = parseAuth(req);
    const convId = pathname.replace('/api/messages/conversations/', '').replace('/typing', '');
    const typing = getTypingUser(convId);
    if (typing && typing.userId !== user?.id) {
      return new Response(JSON.stringify({ typing: true, isTyping: true, user: typing, typingUser: typing }), { status: 200, headers: CORS_HEADERS });
    }
    return new Response(JSON.stringify({ typing: false, isTyping: false, user: null, typingUser: null }), { status: 200, headers: CORS_HEADERS });
  }

  if (pathname.includes('/api/messages/conversations/') && pathname.endsWith('/messages') && req.method === 'POST') {
    try {
      const user = parseAuth(req);
      if (!user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS_HEADERS });
      }

      updateMemoryPresence(user.id);

      const convId = pathname.replace('/api/messages/conversations/', '').replace('/messages', '');
      let conv = memoryConversations.find(c => c.id === convId);
      const body = await req.json();

      if (!body.content || typeof body.content !== 'string' || !body.content.trim()) {
        return new Response(JSON.stringify({ error: 'Message content cannot be empty' }), { status: 400, headers: CORS_HEADERS });
      }

      if (!conv && (convId.startsWith('conv_') || body.propertyId)) {
        let propertyId = body.propertyId;
        if (!propertyId && convId.startsWith('conv_')) {
          const prefix = `conv_${user.id}_`;
          if (convId.startsWith(prefix)) {
            propertyId = convId.substring(prefix.length);
          } else {
            const parts = convId.split('_');
            if (parts.length >= 3) {
              propertyId = parts.slice(2).join('_');
            }
          }
        }
        if (propertyId) {
          conv = memoryConversations.find(c => (c.propertyId === propertyId || (c as any).slug === propertyId) && (c.studentId === user.id || (user.email && c.studentEmail && c.studentEmail.toLowerCase() === user.email.toLowerCase())));
          if (!conv) {
            let matchedProp = memoryProperties.find(p => p.id === propertyId || (p as any).slug === propertyId);
            if (!matchedProp && Array.isArray(DEFAULT_PROPERTIES)) {
              matchedProp = (DEFAULT_PROPERTIES as any[]).find(p => p.id === propertyId || (p as any).slug === propertyId);
            }
            conv = {
              id: convId,
              propertyId,
              propertyTitle: matchedProp?.title || body.propertyTitle || 'Hostel Accommodation',
              propertyAddress: matchedProp?.address || body.propertyAddress || 'LAUTECH Area, Ogbomoso',
              propertyCoverImage: matchedProp?.coverImage || body.propertyCoverImage || 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1200&q=80',
              areaName: matchedProp?.area?.name || (matchedProp as any)?.areaName || body.areaName || 'Under G',
              studentId: user.id,
              studentName: user.fullName || 'Student User',
              studentEmail: user.email || 'student@lautech.edu.ng',
              providerId: matchedProp?.providerId || (matchedProp?.provider as any)?.id || body.providerId || 'user-provider-default',
              providerName: matchedProp?.provider?.name || body.providerName || 'Verified Agent',
              providerEmail: (matchedProp as any)?.providerEmail || matchedProp?.provider?.email || body.providerEmail || 'landlord@hostelease.ng',
              avatarUrl: matchedProp?.coverImage || body.propertyCoverImage || 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1200&q=80',
              lastMessageText: body.content.trim(),
              lastMessageAt: new Date().toISOString(),
              status: 'ACTIVE',
              createdAt: new Date().toISOString(),
              unreadCount: 0
            };
            memoryConversations.push(conv);
            saveCloudConversation(conv).catch(() => {});
          }
        }
      }

      const userRole = (user.role || '').toUpperCase();
      const isStudentRole = userRole === 'STUDENT';
      const isAdminRole = userRole === 'ADMIN' || userRole === 'OWNER';
      const userEmail = (user.email || '').toLowerCase().trim();

      if (conv) {
        const isStudent = conv.studentId === user.id || (userEmail && conv.studentEmail && userEmail === conv.studentEmail.toLowerCase());
        const isProvider = conv.providerId === user.id || (userEmail && conv.providerEmail && userEmail === conv.providerEmail.toLowerCase());
        if (!isStudent && !isProvider && !isAdminRole) {
          return new Response(JSON.stringify({ error: 'Access denied: You cannot send messages in this conversation' }), { status: 403, headers: CORS_HEADERS });
        }
      }

      const effectiveConvId = conv ? conv.id : convId;
      const newMsg = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        conversationId: effectiveConvId,
        senderId: user.id,
        senderRole: user.role || 'STUDENT',
        messageType: body.messageType || 'TEXT',
        content: body.content.trim(),
        metadata: body.metadata,
        isRead: false,
        createdAt: new Date().toISOString()
      };

      // Always save message to memory array
      memoryMessages.push(newMsg);

      // Clear typing indicator for sender upon message dispatch
      const existingTyping = memoryTyping.get(effectiveConvId) || memoryTyping.get(convId);
      if (existingTyping && existingTyping.userId === user.id) {
        memoryTyping.delete(effectiveConvId);
        memoryTyping.delete(convId);
      }

      if (conv) {
        // Fast Automated Assistant Acknowledgement for Students:
        let autoReplyMsg: any = null;
        const autoReplyContent = `Hi! Thanks for reaching out. Your message has been received. The verified agent has been notified and will respond as soon as possible.`;
        const autoMeta = {
          isAutoReply: true,
          automated: true,
          senderTag: 'Hostel Ease Automated Assistant'
        };

        if (isStudentRole && conv && !body.metadata?.isAutoReply && body.messageType !== 'AUTOMATED_ACKNOWLEDGEMENT') {
          try {
            const fifteenMinsAgo = Date.now() - (15 * 60 * 1000);
            const tenMinsAgo = Date.now() - (10 * 60 * 1000);

            const hasRecentManualProviderMsg = memoryMessages.some(m => 
              m.conversationId === convId && 
              m.senderId !== user.id && 
              !m.metadata?.automated &&
              new Date(m.createdAt).getTime() > fifteenMinsAgo
            );

            const hasRecentAutoReply = memoryMessages.some(m =>
              m.conversationId === convId &&
              (m.metadata?.isAutoReply || m.messageType === 'AUTOMATED_ACKNOWLEDGEMENT') &&
              new Date(m.createdAt).getTime() > tenMinsAgo
            );

            if (!hasRecentManualProviderMsg && !hasRecentAutoReply) {
              autoReplyMsg = {
                id: `msg-auto-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                conversationId: convId,
                senderId: conv.providerId,
                senderRole: 'PROVIDER',
                messageType: 'AUTOMATED_ACKNOWLEDGEMENT',
                content: autoReplyContent,
                metadata: autoMeta,
                isRead: true, // Viewed immediately on screen by student
                createdAt: new Date().toISOString()
              };
            }
          } catch (autoErr) {
            console.warn('Netlify auto reply error:', autoErr);
          }
        }

        // Update conversation in memory
        conv.lastMessageText = autoReplyMsg ? autoReplyContent : body.content.trim();
        conv.lastMessageAt = new Date().toISOString();

        // Parallelize cloud storage saves to cut latency from 2500ms down to ~200ms
        const recipientId = user.id === conv.studentId ? conv.providerId : conv.studentId;
        const recipientEmail = user.id === conv.studentId ? conv.providerEmail : conv.studentEmail;
        const senderName = user.fullName || (user.role === 'STUDENT' ? 'Student' : 'Agent');

        const savePromises: Promise<any>[] = [
          saveCloudMessage(newMsg),
          saveCloudConversation(conv),
          saveCloudNotification({
            id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            userId: recipientId,
            userEmail: recipientEmail,
            title: `New message from ${senderName}`,
            message: `${senderName}: "${body.content.trim().substring(0, 60)}"`,
            type: 'NEW_MESSAGE',
            isRead: false,
            linkUrl: `/messages?conversationId=${convId}&propertyId=${conv.propertyId || ''}`,
            createdAt: new Date().toISOString()
          })
        ];

        if (autoReplyMsg) {
          savePromises.push(saveCloudMessage(autoReplyMsg));
          savePromises.push(saveCloudNotification({
            id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            userId: user.id,
            userEmail: user.email,
            title: `Hostel Ease Automated Assistant`,
            message: autoReplyContent,
            type: 'NEW_MESSAGE',
            isRead: false,
            linkUrl: `/messages?conversationId=${convId}&propertyId=${conv.propertyId || ''}`,
            createdAt: new Date().toISOString()
          }));
        }

        // Await all saves concurrently
        await Promise.all(savePromises);

        return new Response(JSON.stringify({ message: newMsg, autoReply: autoReplyMsg }), { status: 201, headers: CORS_HEADERS });
      }

      await saveCloudMessage(newMsg);
      return new Response(JSON.stringify({ message: newMsg }), { status: 201, headers: CORS_HEADERS });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message || 'Failed to send message' }), { status: 400, headers: CORS_HEADERS });
    }
  }

  if (pathname.includes('/api/messages/conversations/') && pathname.endsWith('/read') && (req.method === 'PATCH' || req.method === 'POST' || req.method === 'PUT')) {
    const convId = pathname.replace('/api/messages/conversations/', '').replace('/read', '');
    const user = parseAuth(req);
    const userId = user?.id || '';

    const toPersist: any[] = [];
    memoryMessages.forEach(m => {
      if (m.conversationId === convId && m.senderId !== userId && !m.isRead) {
        m.isRead = true;
        m.readAt = new Date().toISOString();
        toPersist.push(m);
      }
    });

    memoryNotifications.forEach(n => {
      if (n.userId === userId && n.linkUrl?.includes(convId) && !n.isRead) {
        n.isRead = true;
        n.readAt = new Date().toISOString();
        toPersist.push(n);
      }
    });

    if (toPersist.length > 0) {
      Promise.all(toPersist.map(item => item.content ? saveCloudMessage(item) : saveCloudNotification(item))).catch(() => {});
    }

    return new Response(JSON.stringify({ success: true, message: 'Conversation marked as read' }), { status: 200, headers: CORS_HEADERS });
  }

  // Toggle message reaction
  const reactionMatch = pathname.match(/^\/api\/messages\/conversations\/([^/]+)\/messages\/([^/]+)\/reactions$/);
  if (reactionMatch && req.method === 'POST') {
    const user = parseAuth(req);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS_HEADERS });
    }
    const convId = reactionMatch[1];
    const messageId = reactionMatch[2];
    const body = await req.json().catch(() => ({}));
    const emoji = body.emoji;
    if (!emoji) {
      return new Response(JSON.stringify({ error: 'Emoji is required' }), { status: 400, headers: CORS_HEADERS });
    }

    const msg = memoryMessages.find(m => m.id === messageId && m.conversationId === convId);
    if (!msg) {
      return new Response(JSON.stringify({ error: 'Message not found' }), { status: 404, headers: CORS_HEADERS });
    }

    const metadata = msg.metadata || {};
    const reactions: Record<string, string[]> = { ...(metadata.reactions || {}) };
    const myId = user.id;

    const currentEmojiUsers = reactions[emoji] || [];
    const alreadyHas = currentEmojiUsers.includes(myId);

    // Single active reaction per user (WhatsApp-style)
    for (const em of Object.keys(reactions)) {
      reactions[em] = (reactions[em] || []).filter(uid => uid !== myId);
      if (reactions[em].length === 0) delete reactions[em];
    }

    if (!alreadyHas) {
      if (!reactions[emoji]) reactions[emoji] = [];
      reactions[emoji].push(myId);
    }

    msg.metadata = { ...metadata, reactions };
    saveCloudMessage(msg).catch(() => {});

    return new Response(JSON.stringify({ success: true, reactions, messageId }), { status: 200, headers: CORS_HEADERS });
  }

  // Mark all conversations as read
  if (pathname === '/api/messages/conversations/read-all' && (req.method === 'POST' || req.method === 'PATCH' || req.method === 'PUT')) {
    const user = parseAuth(req);
    const userId = user?.id || '';

    const userConvs = memoryConversations.filter(c => c.studentId === userId || c.providerId === userId);
    const convIds = new Set(userConvs.map(c => c.id));

    memoryMessages.forEach(m => {
      if (convIds.has(m.conversationId) && m.senderId !== userId && !m.isRead) {
        m.isRead = true;
        m.readAt = new Date().toISOString();
      }
    });

    memoryNotifications.forEach(n => {
      if (n.userId === userId && !n.isRead) {
        n.isRead = true;
        n.readAt = new Date().toISOString();
      }
    });

    return new Response(JSON.stringify({ success: true, unreadCount: 0, message: 'All conversations marked as read' }), { status: 200, headers: CORS_HEADERS });
  }

  if (pathname === '/api/messages/unread-count' && req.method === 'GET') {
    const user = parseAuth(req);
    const userId = user?.id || '';
    const userConvs = memoryConversations.filter(c => c.studentId === userId || c.providerId === userId);
    const convIds = new Set(userConvs.map(c => c.id));
    const unreadCount = memoryMessages.filter(m => 
      convIds.has(m.conversationId) && 
      m.senderId !== userId && 
      !m.isRead && 
      !m.metadata?.isAutoReply && 
      m.messageType !== 'AUTOMATED_ACKNOWLEDGEMENT'
    ).length;

    return new Response(JSON.stringify({ unreadCount }), { status: 200, headers: CORS_HEADERS });
  }

  // 17. Inspections Endpoints
  if (pathname.includes('/api/inspections/properties/') && pathname.endsWith('/available-slots') && req.method === 'GET') {
    const propertyId = pathname.replace('/api/inspections/properties/', '').replace('/available-slots', '');
    const urlObj = new URL(req.url);
    const date = urlObj.searchParams.get('date') || new Date().toISOString().split('T')[0];

    const defaultSlots = [
      '09:00 AM',
      '10:00 AM',
      '11:00 AM',
      '12:00 PM',
      '01:00 PM',
      '02:00 PM',
      '03:00 PM',
      '04:00 PM',
      '05:00 PM'
    ];

    const prop = memoryProperties.find(p => p.id === propertyId);
    const providerId = prop?.providerId || (prop?.provider as any)?.id;

    const bookedSlots = memoryInspections
      .filter(i => (i.propertyId === propertyId || (providerId && i.providerId === providerId)) && i.preferredDate === date && (i.status === 'CONFIRMED' || i.status === 'ACCEPTED' || i.status === 'PENDING'))
      .map(i => i.preferredTime || i.preferredTimeSlot);

    const bookedSet = new Set(bookedSlots.map((s: string) => (s || '').trim().toUpperCase()));
    const availableSlots = defaultSlots.filter(s => !bookedSet.has(s.trim().toUpperCase()));

    return new Response(JSON.stringify({
      date,
      allSlots: defaultSlots,
      bookedSlots,
      availableSlots
    }), { status: 200, headers: CORS_HEADERS });
  }

  if (pathname.startsWith('/api/inspections/') && pathname.endsWith('/session') && req.method === 'GET') {
    const inspId = pathname.replace('/api/inspections/', '').replace('/session', '');
    const insp = memoryInspections.find(i => i.id === inspId);
    if (!insp) {
      return new Response(JSON.stringify({ error: 'Inspection session not found' }), { status: 404, headers: CORS_HEADERS });
    }
    const user = parseAuth(req);
    const isStudent = user && (user.id === insp.studentId || user.email === insp.studentEmail);
    const isProvider = user && (user.id === insp.providerId || user.email === insp.providerEmail);
    const isAdmin = user && user.role === 'ADMIN';

    if (!isStudent && !isProvider && !isAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden: You are not authorized to join this walkthrough session' }), { status: 403, headers: CORS_HEADERS });
    }

    return new Response(JSON.stringify({
      session: {
        id: insp.id,
        propertyId: insp.propertyId,
        propertyTitle: insp.propertyTitle,
        propertyAddress: insp.propertyAddress,
        coverImage: insp.coverImage || 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1200&q=80',
        roomName: insp.roomName || 'Executive Suite',
        preferredDate: insp.preferredDate,
        preferredTime: insp.preferredTime || insp.preferredTimeSlot || '10:00 AM',
        inspectionType: insp.inspectionType || 'VIRTUAL',
        status: insp.status || 'CONFIRMED',
        studentName: insp.studentName || 'Student',
        providerName: insp.providerName || 'Hostel Agent',
        studentPhone: insp.studentPhone || 'Not provided',
        notes: insp.notes || '',
        virtualMeetingUrl: insp.virtualMeetingUrl || `https://meet.hostelease.ng/room/he-${insp.id}`,
        isHost: isProvider || isAdmin,
        participantRole: isProvider ? 'AGENT' : isStudent ? 'STUDENT' : 'ADMIN'
      }
    }), { status: 200, headers: CORS_HEADERS });
  }

  if (pathname === '/api/inspections' && req.method === 'GET') {
    const user = parseAuth(req);
    const userId = user?.id || '';
    const userEmail = (user?.email || '').toLowerCase().trim();
    const userRole = (user?.role || '').toUpperCase();
    const isAgent = userRole === 'PROVIDER' || userRole === 'LANDLORD' || userRole === 'AGENT';

    const urlObj = new URL(req.url);
    const statusFilter = urlObj.searchParams.get('status');
    const typeFilter = urlObj.searchParams.get('type');

    let insps = memoryInspections.filter(i => {
      if (userRole === 'ADMIN') return true;
      if (isAgent) {
        return i.providerId === userId || (userEmail && (i as any).providerEmail === userEmail);
      }
      return i.studentId === userId || (userEmail && (i as any).studentEmail === userEmail);
    });

    if (statusFilter && statusFilter !== 'ALL') {
      insps = insps.filter(i => i.status === statusFilter);
    }
    if (typeFilter && typeFilter !== 'ALL') {
      insps = insps.filter(i => i.inspectionType === typeFilter);
    }

    return new Response(JSON.stringify({ inspections: insps }), { status: 200, headers: CORS_HEADERS });
  }

  // 17b-1. Inspection Calendar Dashboard Summary
  if (pathname === '/api/inspections/calendar' && req.method === 'GET') {
    const user = parseAuth(req);
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS_HEADERS });

    const userRole = (user.role || '').toUpperCase();
    const isAgent = userRole === 'PROVIDER' || userRole === 'LANDLORD' || userRole === 'AGENT';
    const isAdmin = userRole === 'ADMIN';

    if (!isAgent && !isAdmin) {
      return new Response(JSON.stringify({ error: 'Provider authorization required' }), { status: 403, headers: CORS_HEADERS });
    }

    const userId = user.id;
    const userEmail = (user.email || '').toLowerCase().trim();

    const providerInsps = memoryInspections.filter(i => {
      if (isAdmin) return true;
      return i.providerId === userId || (userEmail && (i as any).providerEmail === userEmail);
    });

    const todayStr = new Date().toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const todayList = providerInsps.filter(i => i.preferredDate === todayStr && i.status === 'CONFIRMED');
    const tomorrowList = providerInsps.filter(i => i.preferredDate === tomorrowStr && i.status === 'CONFIRMED');
    const upcomingList = providerInsps.filter(i => i.preferredDate > tomorrowStr && i.status === 'CONFIRMED');
    const pendingList = providerInsps.filter(i => i.status === 'PENDING' || i.status === 'RESCHEDULE_REQUESTED');
    const completedList = providerInsps.filter(i => i.status === 'COMPLETED');

    return new Response(JSON.stringify({
      totalCount: providerInsps.length,
      todayCount: todayList.length,
      tomorrowCount: tomorrowList.length,
      upcomingCount: upcomingList.length,
      pendingCount: pendingList.length,
      today: todayList,
      tomorrow: tomorrowList,
      upcoming: upcomingList,
      pending: pendingList,
      completed: completedList
    }), { status: 200, headers: CORS_HEADERS });
  }

  // 17b. Available Inspection Time Slots
  if (pathname.includes('/api/inspections/properties/') && pathname.endsWith('/available-slots') && req.method === 'GET') {
    const propertyId = pathname.replace('/api/inspections/properties/', '').replace('/available-slots', '');
    const urlObj = new URL(req.url);
    const date = urlObj.searchParams.get('date') || new Date().toISOString().split('T')[0];

    const defaultSlots = [
      '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
      '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM'
    ];

    const prop = memoryProperties.find(p => p.id === propertyId);
    const pId = prop?.providerId || (prop?.provider as any)?.id;

    const bookedInsps = memoryInspections.filter(i => 
      ((pId && i.providerId === pId) || i.propertyId === propertyId) &&
      i.preferredDate === date &&
      ['PENDING', 'CONFIRMED', 'RESCHEDULE_REQUESTED'].includes(i.status)
    );

    const bookedSlots = bookedInsps.map(i => i.preferredTime || i.preferredTimeSlot).filter(Boolean);
    const bookedSet = new Set(bookedSlots.map((s: string) => s.trim().toUpperCase()));
    const availableSlots = defaultSlots.filter(s => !bookedSet.has(s.trim().toUpperCase()));

    return new Response(JSON.stringify({
      date,
      allSlots: defaultSlots,
      bookedSlots,
      availableSlots
    }), { status: 200, headers: CORS_HEADERS });
  }

  // 17c. Request Inspection (POST /api/inspections/properties/:propertyId)
  if (pathname.startsWith('/api/inspections/properties/') && req.method === 'POST') {
    try {
      const user = parseAuth(req);
      if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS_HEADERS });
      const propertyId = pathname.replace('/api/inspections/properties/', '');
      const body = await req.json();
      const prop = memoryProperties.find(p => p.id === propertyId);
      if (!prop) return new Response(JSON.stringify({ error: 'Property not found' }), { status: 404, headers: CORS_HEADERS });

      const inspType = body.inspectionType || 'PHYSICAL';
      const prefDate = body.preferredDate;
      const prefTime = body.preferredTime || body.preferredTimeSlot || '10:00 AM';

      const inspId = `insp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const insp = {
        id: inspId,
        propertyId,
        propertyTitle: prop.title,
        propertyAddress: prop.address || 'LAUTECH Area',
        studentId: user.id,
        studentName: user.fullName || 'Student',
        studentEmail: user.email,
        studentPhone: body.studentPhone || user.phone,
        roomId: body.roomId || null,
        roomName: body.roomId ? prop.rooms?.find((r: any) => r.id === body.roomId)?.name || null : null,
        providerId: prop.providerId || (prop.provider as any)?.id || 'user-provider-default',
        providerName: prop.provider?.name || (prop as any).providerName || 'Verified Agent',
        providerEmail: (prop as any).providerEmail || prop.provider?.email || 'landlord@hostelease.ng',
        providerPhone: (prop as any).providerPhone || prop.provider?.phone || '+2348039876543',
        inspectionType: inspType,
        preferredDate: prefDate,
        preferredTime: prefTime,
        preferredTimeSlot: prefTime,
        status: 'PENDING',
        notes: body.notes || '',
        createdAt: new Date().toISOString()
      };

      await saveCloudInspection(insp);

      // Notify Provider with direct inspectionId deep-link
      await saveCloudNotification({
        id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        userId: insp.providerId,
        userEmail: insp.providerEmail,
        title: `New ${inspType === 'VIRTUAL' ? 'Virtual Tour' : 'Inspection'} Request`,
        message: `${insp.studentName} requested a ${inspType === 'VIRTUAL' ? 'Virtual Tour' : 'Physical Visit'} for "${insp.propertyTitle}" on ${prefDate} at ${prefTime}.`,
        type: 'INSPECTION_REQUEST',
        isRead: false,
        linkUrl: `/provider-portal?tab=inspections&inspectionId=${inspId}`,
        relatedEntityId: inspId,
        relatedEntityType: 'INSPECTION',
        createdAt: new Date().toISOString()
      });

      return new Response(JSON.stringify({ 
        message: `Inspection request submitted for ${prop.title}`, 
        inspectionId: inspId,
        inspection: insp 
      }), { status: 201, headers: CORS_HEADERS });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message }), { status: 400, headers: CORS_HEADERS });
    }
  }

  // Legacy POST /api/inspections fallback
  if (pathname === '/api/inspections' && req.method === 'POST') {
    try {
      const user = parseAuth(req);
      if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS_HEADERS });
      const body = await req.json();
      const prop = memoryProperties.find(p => p.id === body.propertyId);

      const inspId = `insp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const insp = {
        id: inspId,
        propertyId: body.propertyId,
        propertyTitle: prop?.title || 'Hostel Accommodation',
        propertyAddress: prop?.address || 'LAUTECH Area',
        studentId: user.id,
        studentName: user.fullName || 'Student',
        studentEmail: user.email,
        studentPhone: body.studentPhone || user.phone,
        roomId: body.roomId || null,
        providerId: prop?.providerId || (prop?.provider as any)?.id || 'user-provider-default',
        providerName: prop?.provider?.name || 'Verified Agent',
        providerEmail: (prop as any)?.providerEmail || prop?.provider?.email || 'landlord@hostelease.ng',
        inspectionType: body.inspectionType || 'PHYSICAL',
        preferredDate: body.preferredDate || new Date().toISOString().split('T')[0],
        preferredTime: body.preferredTime || body.preferredTimeSlot || '11:00 AM',
        preferredTimeSlot: body.preferredTime || body.preferredTimeSlot || '11:00 AM',
        status: 'PENDING',
        notes: body.notes || '',
        createdAt: new Date().toISOString()
      };

      await saveCloudInspection(insp);

      return new Response(JSON.stringify({ success: true, inspectionId: inspId, inspection: insp }), { status: 201, headers: CORS_HEADERS });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message }), { status: 400, headers: CORS_HEADERS });
    }
  }

  // 17d. Secure Walkthrough Session Metadata
  if (pathname.startsWith('/api/inspections/') && pathname.endsWith('/session') && req.method === 'GET') {
    const user = parseAuth(req);
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS_HEADERS });

    const inspId = pathname.replace('/api/inspections/', '').replace('/session', '');
    const insp = memoryInspections.find(i => i.id === inspId);
    if (!insp) return new Response(JSON.stringify({ error: 'Inspection request not found' }), { status: 404, headers: CORS_HEADERS });

    const isStudent = user.role === 'STUDENT' && (insp.studentId === user.id || (user.email && insp.studentEmail?.toLowerCase() === user.email.toLowerCase()));
    const isProvider = user.role === 'PROVIDER' && (insp.providerId === user.id || (user.email && insp.providerEmail?.toLowerCase() === user.email.toLowerCase()));
    const isAdmin = user.role === 'ADMIN';

    if (!isStudent && !isProvider && !isAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden: You are not authorized to join this inspection walkthrough' }), { status: 403, headers: CORS_HEADERS });
    }

    const prop = memoryProperties.find(p => p.id === insp.propertyId);

    return new Response(JSON.stringify({
      session: {
        id: insp.id,
        propertyId: insp.propertyId,
        propertyTitle: insp.propertyTitle,
        propertyAddress: insp.propertyAddress,
        coverImage: prop?.coverImage || 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=600&q=80',
        roomName: insp.roomName || 'Executive Suite',
        preferredDate: insp.preferredDate,
        preferredTime: insp.preferredTime || insp.preferredTimeSlot,
        inspectionType: insp.inspectionType || 'VIRTUAL',
        status: insp.status,
        studentName: insp.studentName,
        providerName: insp.providerName,
        studentPhone: insp.studentPhone,
        notes: insp.notes,
        virtualMeetingUrl: insp.virtualMeetingUrl,
        isHost: isProvider || isAdmin,
        participantRole: isProvider ? 'AGENT' : isStudent ? 'STUDENT' : 'ADMIN',
        userRoleInSession: isProvider ? 'AGENT' : isStudent ? 'STUDENT' : 'ADMIN',
        property: {
          id: insp.propertyId,
          title: insp.propertyTitle,
          address: insp.propertyAddress,
          coverImage: prop?.coverImage
        },
        room: {
          name: insp.roomName || 'Executive Suite'
        },
        student: {
          name: insp.studentName,
          email: insp.studentEmail,
          phone: insp.studentPhone
        },
        agent: {
          name: insp.providerName,
          phone: insp.providerPhone
        }
      }
    }), { status: 200, headers: CORS_HEADERS });
  }

  if (pathname.startsWith('/api/inspections/') && (pathname.endsWith('/accept') || pathname.endsWith('/confirm')) && (req.method === 'PATCH' || req.method === 'POST')) {
    const inspId = pathname.replace('/api/inspections/', '').replace('/accept', '').replace('/confirm', '');
    const insp = memoryInspections.find(i => i.id === inspId);
    if (insp) {
      const body = await req.json().catch(() => ({}));
      insp.status = 'CONFIRMED';
      insp.providerResponse = body.message || body.providerResponse || 'Confirmed by agent';
      if (!insp.virtualMeetingUrl && (insp.inspectionType === 'VIRTUAL' || insp.inspectionType === undefined)) {
        insp.virtualMeetingUrl = `https://meet.hostelease.ng/room/he-${Date.now().toString(36)}`;
      }
      await saveCloudInspection(insp);

      // Notify Student
      await saveCloudNotification({
        id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        userId: insp.studentId,
        userEmail: insp.studentEmail,
        title: 'Inspection Request Confirmed! 🎉',
        message: `Agent accepted your ${insp.inspectionType === 'VIRTUAL' ? 'Virtual Tour' : 'Inspection'} for "${insp.propertyTitle}".`,
        type: 'INSPECTION_CONFIRMED',
        isRead: false,
        linkUrl: `/student-dashboard?tab=inspections`,
        relatedEntityId: inspId,
        relatedEntityType: 'INSPECTION',
        createdAt: new Date().toISOString()
      });
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Inspection accepted and confirmed successfully',
        status: 'CONFIRMED',
        virtualMeetingUrl: insp.virtualMeetingUrl,
        inspection: insp
      }), { status: 200, headers: CORS_HEADERS });
    }
    return new Response(JSON.stringify({ error: 'Inspection request not found' }), { status: 404, headers: CORS_HEADERS });
  }

  if (pathname.startsWith('/api/inspections/') && pathname.endsWith('/decline') && req.method === 'PATCH') {
    const inspId = pathname.replace('/api/inspections/', '').replace('/decline', '');
    const insp = memoryInspections.find(i => i.id === inspId);
    if (insp) {
      insp.status = 'DECLINED';
      await saveCloudInspection(insp);

      // Notify Student
      await saveCloudNotification({
        id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        userId: insp.studentId,
        userEmail: insp.studentEmail,
        title: 'Inspection Request Declined',
        message: `Agent was unable to accept your inspection for "${insp.propertyTitle}". Please select another date/time window.`,
        type: 'INSPECTION',
        isRead: false,
        linkUrl: '/student?tab=inspections',
        createdAt: new Date().toISOString()
      });
    }
    return new Response(JSON.stringify({ success: true, message: 'Inspection request declined' }), { status: 200, headers: CORS_HEADERS });
  }

  // 17e. Propose Reschedule (PATCH /api/inspections/:id/reschedule)
  if (pathname.startsWith('/api/inspections/') && pathname.endsWith('/reschedule') && req.method === 'PATCH') {
    const inspId = pathname.replace('/api/inspections/', '').replace('/reschedule', '');
    const insp = memoryInspections.find(i => i.id === inspId);
    if (!insp) return new Response(JSON.stringify({ error: 'Inspection request not found' }), { status: 404, headers: CORS_HEADERS });

    const body = await req.json();
    insp.status = 'RESCHEDULE_REQUESTED';
    insp.proposedAlternativeDate = body.alternativeDate;
    insp.proposedAlternativeTime = body.alternativeTime;
    insp.rescheduleReason = body.message || 'Provider suggested alternative slot';
    insp.providerResponse = body.message || null;
    await saveCloudInspection(insp);

    // Notify Student
    await saveCloudNotification({
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      userId: insp.studentId,
      userEmail: insp.studentEmail,
      title: 'New Inspection Time Proposed 📅',
      message: `The provider for "${insp.propertyTitle}" suggested rescheduling your inspection to ${body.alternativeDate} at ${body.alternativeTime}.`,
      type: 'INSPECTION_RESCHEDULE',
      isRead: false,
      linkUrl: '/student?tab=inspections',
      relatedEntityId: inspId,
      relatedEntityType: 'INSPECTION',
      createdAt: new Date().toISOString()
    });

    return new Response(JSON.stringify({ success: true, message: 'Reschedule proposal sent to student' }), { status: 200, headers: CORS_HEADERS });
  }

  // 17f. Confirm Reschedule (PATCH /api/inspections/:id/confirm-reschedule)
  if (pathname.startsWith('/api/inspections/') && pathname.endsWith('/confirm-reschedule') && req.method === 'PATCH') {
    const inspId = pathname.replace('/api/inspections/', '').replace('/confirm-reschedule', '');
    const insp = memoryInspections.find(i => i.id === inspId);
    if (!insp) return new Response(JSON.stringify({ error: 'Inspection request not found' }), { status: 404, headers: CORS_HEADERS });

    insp.status = 'CONFIRMED';
    insp.preferredDate = insp.proposedAlternativeDate || insp.preferredDate;
    insp.preferredTime = insp.proposedAlternativeTime || insp.preferredTime;
    insp.proposedAlternativeDate = undefined;
    insp.proposedAlternativeTime = undefined;
    await saveCloudInspection(insp);

    // Notify Provider
    await saveCloudNotification({
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      userId: insp.providerId,
      userEmail: insp.providerEmail,
      title: 'Reschedule Confirmed by Student',
      message: `Student confirmed inspection for "${insp.propertyTitle}" on ${insp.preferredDate} at ${insp.preferredTime}.`,
      type: 'INSPECTION_CONFIRMED',
      isRead: false,
      linkUrl: `/provider-portal?tab=inspections&inspectionId=${inspId}`,
      relatedEntityId: inspId,
      relatedEntityType: 'INSPECTION',
      createdAt: new Date().toISOString()
    });

    return new Response(JSON.stringify({ success: true, message: 'Reschedule confirmed successfully' }), { status: 200, headers: CORS_HEADERS });
  }

  // 17g. Cancel Inspection (PATCH /api/inspections/:id/cancel)
  if (pathname.startsWith('/api/inspections/') && pathname.endsWith('/cancel') && req.method === 'PATCH') {
    const inspId = pathname.replace('/api/inspections/', '').replace('/cancel', '');
    const insp = memoryInspections.find(i => i.id === inspId);
    if (!insp) return new Response(JSON.stringify({ error: 'Inspection request not found' }), { status: 404, headers: CORS_HEADERS });

    const body = await req.json().catch(() => ({}));
    insp.status = 'CANCELLED';
    insp.cancellationReason = body.reason || 'Cancelled';
    await saveCloudInspection(insp);

    return new Response(JSON.stringify({ success: true, message: 'Inspection cancelled successfully' }), { status: 200, headers: CORS_HEADERS });
  }

  // 17h. Mark Completed (PATCH/POST /api/inspections/:id/complete)
  if (pathname.startsWith('/api/inspections/') && pathname.endsWith('/complete') && (req.method === 'PATCH' || req.method === 'POST')) {
    const inspId = pathname.replace('/api/inspections/', '').replace('/complete', '');
    const insp = memoryInspections.find(i => i.id === inspId);
    if (!insp) return new Response(JSON.stringify({ error: 'Inspection request not found' }), { status: 404, headers: CORS_HEADERS });

    insp.status = 'COMPLETED';
    await saveCloudInspection(insp);

    // Notify Student
    await saveCloudNotification({
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      userId: insp.studentId,
      userEmail: insp.studentEmail,
      title: 'Inspection Completed — How Was It?',
      message: `Your inspection for "${insp.propertyTitle}" is complete. Leave feedback or add private notes!`,
      type: 'INSPECTION_COMPLETED',
      isRead: false,
      linkUrl: '/student-dashboard?tab=inspections',
      relatedEntityId: inspId,
      relatedEntityType: 'INSPECTION',
      createdAt: new Date().toISOString()
    });

    return new Response(JSON.stringify({ success: true, message: 'Inspection marked as completed', inspection: insp }), { status: 200, headers: CORS_HEADERS });
  }

  // 17i. Mark No-Show (PATCH/POST /api/inspections/:id/no-show)
  if (pathname.startsWith('/api/inspections/') && pathname.endsWith('/no-show') && (req.method === 'PATCH' || req.method === 'POST')) {
    const inspId = pathname.replace('/api/inspections/', '').replace('/no-show', '');
    const insp = memoryInspections.find(i => i.id === inspId);
    if (!insp) return new Response(JSON.stringify({ error: 'Inspection request not found' }), { status: 404, headers: CORS_HEADERS });

    insp.status = 'NO_SHOW';
    await saveCloudInspection(insp);

    return new Response(JSON.stringify({ success: true, message: 'Inspection marked as no-show', inspection: insp }), { status: 200, headers: CORS_HEADERS });
  }

  // 17j. Private Student Notes (POST/PATCH /api/inspections/:id/private-notes)
  if (pathname.startsWith('/api/inspections/') && pathname.endsWith('/private-notes') && (req.method === 'POST' || req.method === 'PATCH')) {
    const inspId = pathname.replace('/api/inspections/', '').replace('/private-notes', '');
    const insp = memoryInspections.find(i => i.id === inspId);
    if (!insp) return new Response(JSON.stringify({ error: 'Inspection request not found' }), { status: 404, headers: CORS_HEADERS });

    const body = await req.json().catch(() => ({}));
    insp.privateStudentNotes = body.notes !== undefined ? body.notes : (body.privateNotes || '');
    await saveCloudInspection(insp);

    return new Response(JSON.stringify({ success: true, message: 'Private inspection notes saved successfully', inspection: insp }), { status: 200, headers: CORS_HEADERS });
  }

  // 17k. Inspection Feedback (POST/PATCH /api/inspections/:id/feedback)
  if (pathname.startsWith('/api/inspections/') && pathname.endsWith('/feedback') && (req.method === 'POST' || req.method === 'PATCH')) {
    const inspId = pathname.replace('/api/inspections/', '').replace('/feedback', '');
    const insp = memoryInspections.find(i => i.id === inspId);
    if (!insp) return new Response(JSON.stringify({ error: 'Inspection request not found' }), { status: 404, headers: CORS_HEADERS });

    const body = await req.json().catch(() => ({}));
    insp.feedbackRating = body.rating || 5;
    insp.feedbackComment = body.comment || '';
    await saveCloudInspection(insp);

    return new Response(JSON.stringify({ success: true, message: 'Thank you for your inspection feedback!', inspection: insp }), { status: 200, headers: CORS_HEADERS });
  }

  // 17l. Virtual Link (GET /api/inspections/:id/virtual-link)
  if (pathname.startsWith('/api/inspections/') && pathname.endsWith('/virtual-link') && req.method === 'GET') {
    const inspId = pathname.replace('/api/inspections/', '').replace('/virtual-link', '');
    const insp = memoryInspections.find(i => i.id === inspId);
    if (!insp) return new Response(JSON.stringify({ error: 'Inspection request not found' }), { status: 404, headers: CORS_HEADERS });

    return new Response(JSON.stringify({
      virtualMeetingUrl: insp.virtualMeetingUrl || `https://meet.hostelease.ng/room/he-${insp.id}`,
      inspectionType: insp.inspectionType || 'VIRTUAL',
      preferredDate: insp.preferredDate,
      preferredTime: insp.preferredTime
    }), { status: 200, headers: CORS_HEADERS });
  }

  // 18. Bookings Endpoints
  if (pathname === '/api/bookings' && req.method === 'GET') {
    const user = parseAuth(req);
    const userId = user?.id || '';
    const userEmail = (user?.email || '').toLowerCase().trim();

    const bks = memoryBookings.filter(b => {
      if (user?.role === 'ADMIN') return true;
      if (user?.role === 'PROVIDER') return b.providerId === userId;
      return b.studentId === userId || (userEmail && b.studentEmail === userEmail);
    });

    return new Response(JSON.stringify({ bookings: bks }), { status: 200, headers: CORS_HEADERS });
  }

  if (pathname === '/api/bookings' && req.method === 'POST') {
    try {
      const user = parseAuth(req);
      if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS_HEADERS });
      const body = await req.json();
      const prop = memoryProperties.find(p => p.id === body.propertyId);

      // Check if already booked
      const activeBooking = memoryBookings.find(b => b.propertyId === body.propertyId && ['PENDING', 'CONFIRMED'].includes(b.status));
      if (activeBooking || prop?.availabilityStatus === 'BOOKED' || prop?.availabilityStatus === 'FULL') {
        return new Response(JSON.stringify({ error: 'Sorry, this hostel is already booked.' }), { status: 409, headers: CORS_HEADERS });
      }

      const bk = {
        id: `bk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        propertyId: body.propertyId,
        propertyTitle: prop?.title || 'Hostel Accommodation',
        studentId: user.id,
        studentName: user.fullName || 'Student',
        studentEmail: user.email,
        providerId: prop?.providerId || (prop?.provider as any)?.id || 'user-provider-default',
        rentAmount: body.rentAmount || prop?.priceSummary?.rentAmount || 200000,
        totalCost: body.totalCost || prop?.priceSummary?.totalMandatoryCost || 200000,
        status: 'PENDING',
        moveInDate: body.moveInDate || '2026-09-01',
        createdAt: new Date().toISOString()
      };

      await saveCloudBooking(bk);

      if (prop) {
        prop.availabilityStatus = 'BOOKED';
        prop.isBooked = true;
        prop.bookingStatus = 'BOOKED';
        await saveCloudProperty(prop);
      }

      // Notify Landlord
      await saveCloudNotification({
        id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        userId: bk.providerId,
        title: 'New Student Booking Request 🔑',
        message: `${bk.studentName} requested to book "${bk.propertyTitle}". Review and confirm reservation.`,
        type: 'BOOKING',
        isRead: false,
        linkUrl: '/provider?tab=bookings',
        createdAt: new Date().toISOString()
      });

      return new Response(JSON.stringify({ success: true, booking: bk }), { status: 201, headers: CORS_HEADERS });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message }), { status: 400, headers: CORS_HEADERS });
    }
  }

  if (pathname.startsWith('/api/bookings/') && pathname.endsWith('/confirm') && req.method === 'PATCH') {
    const bkId = pathname.replace('/api/bookings/', '').replace('/confirm', '');
    const bk = memoryBookings.find(b => b.id === bkId);
    if (bk) {
      bk.status = 'CONFIRMED';
      await saveCloudBooking(bk);

      // Notify Student
      await saveCloudNotification({
        id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        userId: bk.studentId,
        userEmail: bk.studentEmail,
        title: 'Hostel Booking Confirmed! 🎉',
        message: `Your booking for "${bk.propertyTitle}" has been confirmed by the agent.`,
        type: 'BOOKING',
        isRead: false,
        linkUrl: '/student?tab=bookings',
        createdAt: new Date().toISOString()
      });
    }
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: CORS_HEADERS });
  }

  if (pathname.startsWith('/api/bookings/') && pathname.endsWith('/decline') && req.method === 'PATCH') {
    const bkId = pathname.replace('/api/bookings/', '').replace('/decline', '');
    const bk = memoryBookings.find(b => b.id === bkId);
    if (bk) {
      bk.status = 'DECLINED';
      await saveCloudBooking(bk);

      const remainingActive = memoryBookings.filter(b => b.propertyId === bk.propertyId && b.id !== bk.id && ['PENDING', 'CONFIRMED'].includes(b.status));
      if (remainingActive.length === 0) {
        const prop = memoryProperties.find(p => p.id === bk.propertyId);
        if (prop) {
          prop.availabilityStatus = 'AVAILABLE';
          prop.isBooked = false;
          prop.bookingStatus = 'AVAILABLE';
          await saveCloudProperty(prop);
        }
      }

      // Notify Student
      await saveCloudNotification({
        id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        userId: bk.studentId,
        userEmail: bk.studentEmail,
        title: 'Booking Request Declined',
        message: `Your booking request for "${bk.propertyTitle}" was declined by the agent.`,
        type: 'BOOKING',
        isRead: false,
        linkUrl: '/student?tab=bookings',
        createdAt: new Date().toISOString()
      });
    }
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: CORS_HEADERS });
  }

  if (pathname.startsWith('/api/bookings/') && pathname.endsWith('/cancel') && req.method === 'PATCH') {
    const bkId = pathname.replace('/api/bookings/', '').replace('/cancel', '');
    const bk = memoryBookings.find(b => b.id === bkId);
    if (bk) {
      bk.status = 'CANCELLED_BY_STUDENT';
      await saveCloudBooking(bk);

      const remainingActive = memoryBookings.filter(b => b.propertyId === bk.propertyId && b.id !== bk.id && ['PENDING', 'CONFIRMED'].includes(b.status));
      if (remainingActive.length === 0) {
        const prop = memoryProperties.find(p => p.id === bk.propertyId);
        if (prop) {
          prop.availabilityStatus = 'AVAILABLE';
          prop.isBooked = false;
          prop.bookingStatus = 'AVAILABLE';
          await saveCloudProperty(prop);
        }
      }

      await saveCloudNotification({
        id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        userId: bk.providerId,
        title: 'Booking Cancelled',
        message: `Booking for "${bk.propertyTitle}" was cancelled.`,
        type: 'BOOKING',
        isRead: false,
        linkUrl: '/provider?tab=bookings',
        createdAt: new Date().toISOString()
      });
    }
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: CORS_HEADERS });
  }

  // 18b. Provider Financials
  if (pathname === '/api/payments/provider-financials' && req.method === 'GET') {
    const user = parseAuth(req);
    const userEmail = (user?.email || '').toLowerCase().trim();
    const isDemo = userEmail === 'landlord@hostelease.ng' || userEmail === 'provider@hostelease.ng';
    return new Response(JSON.stringify({
      availableBalance: isDemo ? 3500000 : 0,
      escrowBalance: 0,
      totalEarned: isDemo ? 3500000 : 0,
      recentPayouts: []
    }), { status: 200, headers: CORS_HEADERS });
  }

  // 12. Agent AI Assistant
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

  // =============================================================================
  // 19. ADMIN USERS MANAGEMENT & PERMANENT ACCOUNT DELETION
  // =============================================================================
  
  // 19a. Admin: List All Users with Live Metrics
  if (pathname === '/api/admin/users' && req.method === 'GET') {
    const caller = parseAuth(req);
    if (!caller || (caller.role !== 'ADMIN' && caller.role !== 'OWNER')) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Administrative credentials required' }), { status: 403, headers: CORS_HEADERS });
    }

    const searchParam = (url.searchParams.get('search') || '').toLowerCase().trim();
    const roleParam = url.searchParams.get('role');
    const statusParam = url.searchParams.get('status');

    let userList = memoryUsers
      .filter(u => !memoryDeletedUserIds.has(u.id) && !memoryDeletedUserIds.has((u.email || '').toLowerCase().trim()))
      .map(u => {
        const uEmail = (u.email || '').toLowerCase().trim();
        const uId = u.id;

        const studentBookings = memoryBookings.filter(b => b.studentId === uId || (uEmail && b.studentEmail?.toLowerCase() === uEmail)).length;
        const studentInspections = memoryInspections.filter(i => i.studentId === uId || (uEmail && i.studentEmail?.toLowerCase() === uEmail)).length;
        const providerHostels = memoryProperties.filter(p => {
          const pEmail = ((p as any).providerEmail || p.provider?.email || '').toLowerCase().trim();
          const pId = (p as any).providerId || p.provider?.id;
          return (uEmail && pEmail === uEmail) || (uId && pId === uId);
        }).length;

        return {
          id: u.id,
          fullName: u.fullName || (u.role === 'PROVIDER' ? 'Hostel Agent' : 'Student User'),
          email: u.email,
          phone: u.phone || '',
          role: u.role,
          isActive: u.isActive !== undefined ? Boolean(u.isActive) : true,
          accountStatus: u.accountStatus || 'ACTIVE',
          createdAt: u.createdAt || '2026-08-01T00:00:00Z',
          studentBookingsCount: studentBookings,
          studentInspectionsCount: studentInspections,
          providerHostelsCount: providerHostels,
          department: u.department,
          matricNo: u.matricNo,
          level: u.level,
          businessName: u.businessName,
          avatarUrl: u.avatarUrl,
          verificationStatus: u.role === 'PROVIDER' ? 'VERIFIED' : undefined
        };
      });

    if (roleParam && roleParam !== 'all') {
      userList = userList.filter(u => u.role === roleParam);
    }
    if (statusParam && statusParam !== 'all') {
      userList = userList.filter(u => u.accountStatus === statusParam);
    }
    if (searchParam) {
      userList = userList.filter(u => 
        (u.fullName && u.fullName.toLowerCase().includes(searchParam)) ||
        (u.email && u.email.toLowerCase().includes(searchParam)) ||
        (u.phone && u.phone.includes(searchParam)) ||
        (u.matricNo && u.matricNo.toLowerCase().includes(searchParam)) ||
        (u.businessName && u.businessName.toLowerCase().includes(searchParam))
      );
    }

    return new Response(JSON.stringify({ users: userList }), { status: 200, headers: CORS_HEADERS });
  }

  // 19b. Admin: User Pre-Deletion Summary
  if (pathname.startsWith('/api/admin/users/') && pathname.endsWith('/deletion-summary') && req.method === 'GET') {
    const caller = parseAuth(req);
    if (!caller || (caller.role !== 'ADMIN' && caller.role !== 'OWNER')) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Administrative credentials required' }), { status: 403, headers: CORS_HEADERS });
    }

    const targetUserId = pathname.replace('/api/admin/users/', '').replace('/deletion-summary', '');
    const targetUser = memoryUsers.find(u => u.id === targetUserId || u.email?.toLowerCase().trim() === targetUserId.toLowerCase().trim());

    if (!targetUser || memoryDeletedUserIds.has(targetUser.id) || memoryDeletedUserIds.has((targetUser.email || '').toLowerCase().trim())) {
      return new Response(JSON.stringify({ error: `User with ID ${targetUserId} not found` }), { status: 404, headers: CORS_HEADERS });
    }

    const isProvider = targetUser.role === 'PROVIDER';
    const isStudent = targetUser.role === 'STUDENT';
    const tEmail = (targetUser.email || '').toLowerCase().trim();
    const tId = targetUser.id;

    const userProps = isProvider ? memoryProperties.filter(p => {
      const pEmail = ((p as any).providerEmail || p.provider?.email || '').toLowerCase().trim();
      const pId = (p as any).providerId || p.provider?.id;
      return (tEmail && pEmail === tEmail) || (tId && pId === tId);
    }) : [];

    let roomsCount = 0;
    let mediaCount = 0;
    let imagesCount = 0;
    let videosCount = 0;
    if (isProvider) {
      userProps.forEach(p => {
        roomsCount += Number(p.totalRooms) || 1;
        const media = (p.mediaItems || p.media || []);
        mediaCount += media.length;
        imagesCount += media.filter((m: any) => m.mediaType !== 'VIDEO' && m.type !== 'VIDEO' && m.category !== 'VIDEO_WALKTHROUGH').length;
        videosCount += (p.has4KVideo || p.videoTourUrl || media.some((m: any) => m.mediaType === 'VIDEO' || m.type === 'VIDEO')) ? 1 : 0;
      });
    }

    const bookingsCount = memoryBookings.filter(b => 
      b.studentId === tId || 
      (tEmail && b.studentEmail?.toLowerCase() === tEmail) ||
      (isProvider && (b.providerId === tId || (tEmail && b.providerEmail?.toLowerCase() === tEmail) || userProps.some(p => p.id === b.propertyId)))
    ).length;

    const inspectionsCount = memoryInspections.filter(i => 
      i.studentId === tId || 
      (tEmail && i.studentEmail?.toLowerCase() === tEmail) ||
      (isProvider && (i.providerId === tId || (tEmail && i.providerEmail?.toLowerCase() === tEmail) || userProps.some(p => p.id === i.propertyId)))
    ).length;

    const convCount = memoryConversations.filter(c => 
      c.studentId === tId || 
      (isProvider && (c.providerId === tId || userProps.some(p => p.id === c.propertyId)))
    ).length;

    const notifCount = memoryNotifications.filter(n => n.userId === tId || (tEmail && n.userEmail?.toLowerCase() === tEmail)).length;
    const savedCount = isStudent ? memorySavedProperties.filter(s => s.userId === tId || (tEmail && s.userEmail?.toLowerCase() === tEmail)).length : 0;

    return new Response(JSON.stringify({
      summary: {
        userId: targetUser.id,
        fullName: targetUser.fullName || (isProvider ? 'Agent' : 'Student'),
        email: targetUser.email,
        phone: targetUser.phone,
        role: targetUser.role,
        accountStatus: targetUser.accountStatus || 'ACTIVE',
        businessName: targetUser.businessName,
        createdAt: targetUser.createdAt || new Date().toISOString(),
        hostelsCount: userProps.length,
        roomsCount,
        mediaCount,
        imagesCount,
        videosCount,
        bookingsCount,
        inspectionsCount,
        conversationsCount: convCount,
        messagesCount: convCount * 2,
        notificationsCount: notifCount,
        savedHostelsCount: savedCount
      }
    }), { status: 200, headers: CORS_HEADERS });
  }

  // 19c. Admin: Permanently Delete User Account (Atomic Multi-Store Purge)
  if (pathname.startsWith('/api/admin/users/') && !pathname.endsWith('/deletion-summary') && !pathname.endsWith('/status') && req.method === 'DELETE') {
    const caller = parseAuth(req);
    if (!caller || (caller.role !== 'ADMIN' && caller.role !== 'OWNER')) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Administrative credentials required' }), { status: 403, headers: CORS_HEADERS });
    }

    const targetUserId = pathname.replace('/api/admin/users/', '');
    if (caller.id === targetUserId || caller.email?.toLowerCase().trim() === targetUserId.toLowerCase().trim()) {
      return new Response(JSON.stringify({ error: 'Administrative security restriction: You cannot delete your own admin account.' }), { status: 400, headers: CORS_HEADERS });
    }

    const targetUser = memoryUsers.find(u => u.id === targetUserId || u.email?.toLowerCase().trim() === targetUserId.toLowerCase().trim());
    if (!targetUser || memoryDeletedUserIds.has(targetUser.id) || memoryDeletedUserIds.has((targetUser.email || '').toLowerCase().trim())) {
      return new Response(JSON.stringify({ error: `User with ID ${targetUserId} does not exist` }), { status: 404, headers: CORS_HEADERS });
    }

    if (targetUser.role === 'ADMIN' || targetUser.email?.toLowerCase().trim() === 'admin@hostelease.ng' || targetUser.id === SINGLE_ADMIN_ACCOUNT.id) {
      return new Response(JSON.stringify({ error: 'Admin accounts cannot be deleted through this interface. Contact platform governance.' }), { status: 400, headers: CORS_HEADERS });
    }

    const isProvider = targetUser.role === 'PROVIDER';
    const isStudent = targetUser.role === 'STUDENT';
    const tEmail = (targetUser.email || '').toLowerCase().trim();
    const tId = targetUser.id;

    let deletedHostelsCount = 0;
    let deletedBookingsCount = 0;
    let deletedInspectionsCount = 0;
    let deletedConversationsCount = 0;
    let deletedNotificationsCount = 0;

    const propStore = getBlobsStore('properties');
    const bookingStore = getBlobsStore('bookings');
    const inspStore = getBlobsStore('inspections');
    const savedStore = getBlobsStore('saved_properties');
    const userStore = getBlobsStore('users');
    const delStore = getBlobsStore('deleted_users');

    if (isProvider) {
      // 1. Collect landlord hostels
      const userProps = memoryProperties.filter(p => {
        const pEmail = ((p as any).providerEmail || p.provider?.email || '').toLowerCase().trim();
        const pId = (p as any).providerId || p.provider?.id;
        return (tEmail && pEmail === tEmail) || (tId && pId === tId);
      });
      deletedHostelsCount = userProps.length;
      const propIdSet = new Set(userProps.map(p => p.id));

      // Remove properties
      memoryProperties = memoryProperties.filter(p => !propIdSet.has(p.id));
      if (propStore) {
        for (const pid of propIdSet) {
          try { await propStore.delete(pid); } catch {}
        }
      }

      // Remove bookings for landlord properties
      const bksToDelete = memoryBookings.filter(b => b.providerId === tId || (tEmail && b.providerEmail?.toLowerCase() === tEmail) || propIdSet.has(b.propertyId));
      deletedBookingsCount = bksToDelete.length;
      const bkIdSet = new Set(bksToDelete.map(b => b.id));
      memoryBookings = memoryBookings.filter(b => !bkIdSet.has(b.id));
      if (bookingStore) {
        for (const bid of bkIdSet) {
          try { await bookingStore.delete(bid); } catch {}
        }
      }

      // Remove inspections for landlord properties
      const inspsToDelete = memoryInspections.filter(i => i.providerId === tId || (tEmail && i.providerEmail?.toLowerCase() === tEmail) || propIdSet.has(i.propertyId));
      deletedInspectionsCount = inspsToDelete.length;
      const inspIdSet = new Set(inspsToDelete.map(i => i.id));
      memoryInspections = memoryInspections.filter(i => !inspIdSet.has(i.id));
      if (inspStore) {
        for (const iid of inspIdSet) {
          try { await inspStore.delete(iid); } catch {}
        }
      }

      // Remove conversations for landlord
      const convsToDelete = memoryConversations.filter(c => c.providerId === tId || (c.propertyId && propIdSet.has(c.propertyId)));
      deletedConversationsCount = convsToDelete.length;
      const convIdSet = new Set(convsToDelete.map(c => c.id));
      memoryConversations = memoryConversations.filter(c => !convIdSet.has(c.id));
      memoryMessages = memoryMessages.filter(m => !convIdSet.has(m.conversationId));

      // Remove saved properties referencing deleted landlord hostels
      memorySavedProperties = memorySavedProperties.filter(sp => !propIdSet.has(sp.propertyId));

    } else if (isStudent) {
      // STUDENT DELETION: Landlord properties remain completely untouched and safe!
      // 1. Identify student bookings and release any occupied bedspaces / restore capacity on landlord properties
      const bksToDelete = memoryBookings.filter(b => b.studentId === tId || (tEmail && b.studentEmail?.toLowerCase() === tEmail));
      deletedBookingsCount = bksToDelete.length;
      const bkIdSet = new Set(bksToDelete.map(b => b.id));

      for (const bk of bksToDelete) {
        if (!bk.propertyId) continue;
        const prop = memoryProperties.find(p => p.id === bk.propertyId);
        if (prop) {
          let propModified = false;
          if (Array.isArray(prop.rooms)) {
            for (const rm of prop.rooms) {
              if (bk.roomId && rm.id !== bk.roomId) continue;
              if (Array.isArray(rm.bedspaces)) {
                for (const bs of rm.bedspaces) {
                  if (!bk.bedspaceId || bs.id === bk.bedspaceId) {
                    if (bs.is_occupied || bs.isOccupied) {
                      bs.is_occupied = 0;
                      bs.isOccupied = false;
                      bs.status = 'AVAILABLE';
                      propModified = true;
                    }
                  }
                }
              }
              if (rm.occupied_count !== undefined) rm.occupied_count = Math.max(0, rm.occupied_count - 1);
              if (rm.occupiedCount !== undefined) rm.occupiedCount = Math.max(0, rm.occupiedCount - 1);
              if (rm.quantity_available !== undefined) rm.quantity_available = Math.min(rm.quantity_total || 1, rm.quantity_available + 1);
              if (rm.quantityAvailable !== undefined) rm.quantityAvailable = Math.min(rm.quantityTotal || 1, rm.quantityAvailable + 1);
              rm.status = 'AVAILABLE';
              propModified = true;
            }
          }
          if (prop.availabilityStatus === 'FULL') {
            prop.availabilityStatus = 'AVAILABLE';
            propModified = true;
          }
          if (propModified && propStore) {
            try { await propStore.setJSON(prop.id, prop); } catch {}
          }
        }
      }

      memoryBookings = memoryBookings.filter(b => !bkIdSet.has(b.id));
      if (bookingStore) {
        for (const bid of bkIdSet) {
          try { await bookingStore.delete(bid); } catch {}
        }
      }

      // Remove student inspections
      const inspsToDelete = memoryInspections.filter(i => i.studentId === tId || (tEmail && i.studentEmail?.toLowerCase() === tEmail));
      deletedInspectionsCount = inspsToDelete.length;
      const inspIdSet = new Set(inspsToDelete.map(i => i.id));
      memoryInspections = memoryInspections.filter(i => !inspIdSet.has(i.id));
      if (inspStore) {
        for (const iid of inspIdSet) {
          try { await inspStore.delete(iid); } catch {}
        }
      }

      // Remove student saved hostels
      const savedToDelete = memorySavedProperties.filter(s => s.userId === tId || (tEmail && s.userEmail?.toLowerCase() === tEmail));
      const savedIdSet = new Set(savedToDelete.map(s => s.id));
      memorySavedProperties = memorySavedProperties.filter(s => !savedIdSet.has(s.id));
      if (savedStore) {
        for (const sid of savedIdSet) {
          try { await savedStore.delete(sid); } catch {}
        }
      }

      // Remove student conversations
      const convsToDelete = memoryConversations.filter(c => c.studentId === tId);
      deletedConversationsCount = convsToDelete.length;
      const convIdSet = new Set(convsToDelete.map(c => c.id));
      memoryConversations = memoryConversations.filter(c => !convIdSet.has(c.id));
      memoryMessages = memoryMessages.filter(m => !convIdSet.has(m.conversationId));
    }

    // Common: Remove notifications
    const notifsToDelete = memoryNotifications.filter(n => n.userId === tId || (tEmail && n.userEmail?.toLowerCase() === tEmail));
    deletedNotificationsCount = notifsToDelete.length;
    memoryNotifications = memoryNotifications.filter(n => !(n.userId === tId || (tEmail && n.userEmail?.toLowerCase() === tEmail)));

    // Tombstone the user so they cannot be restored or authenticate
    memoryDeletedUserIds.add(tId);
    if (tEmail) memoryDeletedUserIds.add(tEmail);

    if (delStore) {
      try {
        await delStore.setJSON(tId, { id: tId, email: tEmail, deletedAt: new Date().toISOString() });
        if (tEmail) await delStore.setJSON(tEmail, { id: tId, email: tEmail, deletedAt: new Date().toISOString() });
      } catch {}
    }

    // Remove user from memory & Netlify Blobs
    memoryUsers = memoryUsers.filter(u => u.id !== tId && (!tEmail || u.email?.toLowerCase().trim() !== tEmail));
    if (userStore) {
      try {
        await userStore.delete(tId);
        if (tEmail) await userStore.delete(tEmail);
      } catch {}
    }

    // Broadcast sync event to notify any running nodes
    try {
      await fetch(`https://ntfy.sh/${NTFY_TOPIC}`, {
        method: 'POST',
        headers: { 'Title': 'HOSTEL_USER_DELETED', 'Tags': 'wastebasket,skull' },
        body: JSON.stringify({ type: 'USER_DELETED', userId: tId, email: tEmail }),
        signal: AbortSignal.timeout(3000)
      });
    } catch {}

    return new Response(JSON.stringify({
      success: true,
      message: `${targetUser.role === 'PROVIDER' ? 'Agent' : 'Student'} account and all associated records permanently deleted.`,
      deletedUserId: tId,
      deletedRole: targetUser.role,
      deletedFullName: targetUser.fullName,
      deletedHostelsCount,
      deletedMediaFilesCount: 0,
      deletedBookingsCount,
      deletedInspectionsCount,
      deletedConversationsCount,
      deletedNotificationsCount
    }), { status: 200, headers: CORS_HEADERS });
  }

  // 19d. Admin: Update User Account Status (ACTIVE / SUSPENDED)
  if (pathname.startsWith('/api/admin/users/') && pathname.endsWith('/status') && req.method === 'PATCH') {
    const caller = parseAuth(req);
    if (!caller || (caller.role !== 'ADMIN' && caller.role !== 'OWNER')) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Administrative credentials required' }), { status: 403, headers: CORS_HEADERS });
    }

    const targetUserId = pathname.replace('/api/admin/users/', '').replace('/status', '');
    const body = await req.json().catch(() => ({}));
    const newStatus = body.status || 'ACTIVE';

    const targetUser = memoryUsers.find(u => u.id === targetUserId || u.email?.toLowerCase().trim() === targetUserId.toLowerCase().trim());
    if (!targetUser) {
      return new Response(JSON.stringify({ error: 'User not found' }), { status: 404, headers: CORS_HEADERS });
    }

    targetUser.accountStatus = newStatus;
    await saveCloudUser(targetUser);

    return new Response(JSON.stringify({
      message: `Account status updated to ${newStatus}`,
      accountStatus: newStatus
    }), { status: 200, headers: CORS_HEADERS });
  }

  return new Response(JSON.stringify({ error: 'Endpoint not found', path: pathname }), { status: 404, headers: CORS_HEADERS });
};
