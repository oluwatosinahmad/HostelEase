import { Area, Property, Amenity } from '../types/hostelEase';

export const DEFAULT_AREAS: Area[] = [
  {
    id: 'area-under-g',
    universityId: 'univ-lautech',
    name: 'Under G',
    slug: 'under-g',
    description: 'The premier student district directly opposite the LAUTECH Under G Gate. 24/7 commercial activities, study cafes, printing hubs, and fast walking access to campus.',
    landmark: 'LAUTECH Under G Gate & Bovas Station',
    approxDistanceMinKm: 0.2,
    approxDistanceMaxKm: 1.0,
    centerLat: 8.1458,
    centerLng: 4.2625,
    propertyCount: 18,
    minRent: 180000,
    maxRent: 380000
  },
  {
    id: 'area-adenike',
    universityId: 'univ-lautech',
    name: 'Adenike Area',
    slug: 'adenike',
    description: 'Vibrant student neighborhood with constant electricity feeder, student supermarkets, and regular Keke NAPEP shuttle services to campus.',
    landmark: 'Adenike Junction & Holy Light',
    approxDistanceMinKm: 0.5,
    approxDistanceMaxKm: 1.8,
    centerLat: 8.1412,
    centerLng: 4.2680,
    propertyCount: 14,
    minRent: 160000,
    maxRent: 320000
  },
  {
    id: 'area-stadium-road',
    universityId: 'univ-lautech',
    name: 'Stadium Road',
    slug: 'stadium-road',
    description: 'Serene, well-paved avenue preferred by final-year scholars and serious students. Excellent night security, steady borehole water, and quiet surroundings.',
    landmark: 'Ogbomoso Township Stadium Gate 2',
    approxDistanceMinKm: 0.8,
    approxDistanceMaxKm: 2.0,
    centerLat: 8.1380,
    centerLng: 4.2550,
    propertyCount: 12,
    minRent: 200000,
    maxRent: 420000
  },
  {
    id: 'area-college-road',
    universityId: 'univ-lautech',
    name: 'College Road / 2nd Gate',
    slug: 'college-road',
    description: 'Direct walking route to LAUTECH College of Health Sciences, anatomy laboratories, lecture halls, and main library.',
    landmark: 'LAUTECH 2nd Gate / CHS',
    approxDistanceMinKm: 0.4,
    approxDistanceMaxKm: 1.5,
    centerLat: 8.1420,
    centerLng: 4.2590,
    propertyCount: 10,
    minRent: 170000,
    maxRent: 340000
  },
  {
    id: 'area-general',
    universityId: 'univ-lautech',
    name: 'General Area',
    slug: 'general',
    description: 'Calm residential quarter near the State Hospital with clean running water, gated compounds, and peaceful atmosphere for studying.',
    landmark: 'Bowen Teaching Hospital / General Hospital',
    approxDistanceMinKm: 1.4,
    approxDistanceMaxKm: 2.8,
    centerLat: 8.1340,
    centerLng: 4.2650,
    propertyCount: 9,
    minRent: 150000,
    maxRent: 300000
  },
  {
    id: 'area-isale-general',
    universityId: 'univ-lautech',
    name: 'Isale General',
    slug: 'isale-general',
    description: 'Budget-friendly area with authentic student lodges, steady borehole systems, and low living costs for students.',
    landmark: 'Isale General Central Mosque',
    approxDistanceMinKm: 1.8,
    approxDistanceMaxKm: 3.2,
    centerLat: 8.1320,
    centerLng: 4.2690,
    propertyCount: 8,
    minRent: 120000,
    maxRent: 240000
  },
  {
    id: 'area-caretaker',
    universityId: 'univ-lautech',
    name: 'Caretaker',
    slug: 'caretaker',
    description: 'Well-connected commercial district with modern apartment complexes, banks, fast-food outlets, and direct campus transport.',
    landmark: 'Caretaker Junction & Total Fuel Station',
    approxDistanceMinKm: 2.0,
    approxDistanceMaxKm: 3.5,
    centerLat: 8.1360,
    centerLng: 4.2480,
    propertyCount: 7,
    minRent: 180000,
    maxRent: 350000
  },
  {
    id: 'area-yoaco',
    universityId: 'univ-lautech',
    name: 'Yoaco Area',
    slug: 'yoaco',
    description: 'Rapidly developing student corridor with newly built self-contains, spacious compounds, and quiet neighborhood watch.',
    landmark: 'Yoaco Filling Station & Ogbomoso High School',
    approxDistanceMinKm: 2.2,
    approxDistanceMaxKm: 4.0,
    centerLat: 8.1280,
    centerLng: 4.2580,
    propertyCount: 6,
    minRent: 140000,
    maxRent: 280000
  },
  {
    id: 'area-aroje',
    universityId: 'univ-lautech',
    name: 'Aroje Express',
    slug: 'aroje',
    description: 'Spacious student lodges with large perimeter compounds, dedicated transformers, and ample vehicle parking.',
    landmark: 'Aroje Express / Ilorin Highway',
    approxDistanceMinKm: 2.5,
    approxDistanceMaxKm: 4.5,
    centerLat: 8.1520,
    centerLng: 4.2720,
    propertyCount: 5,
    minRent: 160000,
    maxRent: 320000
  },
  {
    id: 'area-randa',
    universityId: 'univ-lautech',
    name: 'Randa Roundabout',
    slug: 'randa',
    description: 'Traditional student residential hub with standard single rooms, affordable flats, and close proximity to major markets.',
    landmark: 'Randa Roundabout',
    approxDistanceMinKm: 2.0,
    approxDistanceMaxKm: 3.8,
    centerLat: 8.1300,
    centerLng: 4.2420,
    propertyCount: 6,
    minRent: 130000,
    maxRent: 260000
  }
];

const AMENITIES_LIST: Amenity[] = [
  { id: 'am-1', key: 'electricity', name: 'Constant Electricity', category: 'POWER', icon: 'Zap' },
  { id: 'am-2', key: 'water', name: '24/7 Motorized Borehole', category: 'WATER', icon: 'Droplets' },
  { id: 'am-3', key: 'security', name: 'Gated Compound & Night Guard', category: 'SECURITY', icon: 'ShieldCheck' },
  { id: 'am-4', key: 'tiled', name: 'Ceramic Tiled Floor', category: 'FACILITY', icon: 'Check' },
  { id: 'am-5', key: 'inverter', name: 'Solar / Inverter Backup', category: 'POWER', icon: 'Sun' },
  { id: 'am-6', key: 'wifi', name: 'Unlimited Wi-Fi', category: 'INTERNET', icon: 'Wifi' }
];

export const DEFAULT_PROPERTIES: Property[] = [
  {
    id: 'prop-underg-1',
    title: 'Emerald Heights Luxury Self-Contain',
    slug: 'emerald-heights-luxury-self-contain-under-g',
    description: 'Newly finished executive self-contained apartment with POP ceiling, dedicated prepaid meter, 24/7 motorized borehole with multiple overhead reserve tanks, and quiet environment ideal for studying.',
    address: 'Plot 12, Destiny Boulevard, Under-G, Ogbomoso',
    nearbyLandmark: 'Behind Bovas Petrol Station, 3 mins from Under-G Gate',
    latitude: 8.1458,
    longitude: 4.2625,
    distanceFromCampusKm: 0.3,
    propertyType: 'SELF_CONTAIN',
    genderPreference: 'ANY',
    totalRooms: 12,
    verificationStatus: 'APPROVED',
    availabilityStatus: 'AVAILABLE',
    isDemo: true,
    isFeatured: true,
    completenessScore: 100,
    createdAt: '2026-08-20T10:00:00Z',
    area: {
      id: 'area-under-g',
      name: 'Under G',
      slug: 'under-g',
      landmark: 'LAUTECH Under-G Gate'
    },
    coverImage: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=1000&q=80',
    coverImageCaption: 'Spacious Bedroom & Work Desk Area',
    priceSummary: {
      period: 'YEARLY',
      rentAmount: 280000,
      serviceCharge: 10000,
      agencyFee: 25000,
      cautionFee: 20000,
      otherMandatoryCharges: 15000,
      legalFee: 0,
      totalMandatoryCost: 350000,
      totalRefundableCost: 20000,
      isNegotiable: false
    },
    keyAmenities: AMENITIES_LIST,
    rooms: [
      {
        id: 'room-101',
        name: 'Executive Self-Contain Room 1',
        type: 'SELF_CONTAIN',
        maxOccupants: 1,
        quantityTotal: 12,
        quantityAvailable: 4,
        isEnsuite: true,
        isFurnished: true
      }
    ],
    media: [
      { id: 'm-1', url: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=1000&q=80', caption: 'Living Space', displayOrder: 1, isCover: true, mediaType: 'IMAGE', category: 'BEDROOM' },
      { id: 'm-2', url: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1000&q=80', caption: 'Bathroom', displayOrder: 2, isCover: false, mediaType: 'IMAGE', category: 'BATHROOM' },
      { id: 'm-3', url: 'https://images.unsplash.com/photo-1507089947368-19c1da9775ae?auto=format&fit=crop&w=1000&q=80', caption: 'Kitchenette', displayOrder: 3, isCover: false, mediaType: 'IMAGE', category: 'KITCHEN' }
    ]
  },
  {
    id: 'prop-adenike-1',
    title: 'Peace Haven Executive Lodge',
    slug: 'peace-haven-executive-lodge-adenike',
    description: 'Modern student lodge with constant solar electricity, high perimeter security wall, tiled rooms, clean running water, and reliable caretaker on site.',
    address: '15 Holy Light Road, Adenike, Ogbomoso',
    nearbyLandmark: 'Opposite Adenike Junction Bus Stop',
    latitude: 8.1412,
    longitude: 4.2680,
    distanceFromCampusKm: 0.6,
    propertyType: 'SELF_CONTAIN',
    genderPreference: 'ANY',
    totalRooms: 16,
    verificationStatus: 'APPROVED',
    availabilityStatus: 'AVAILABLE',
    isDemo: true,
    isFeatured: true,
    completenessScore: 98,
    createdAt: '2026-08-21T10:00:00Z',
    area: {
      id: 'area-adenike',
      name: 'Adenike Area',
      slug: 'adenike',
      landmark: 'Adenike Junction'
    },
    coverImage: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1000&q=80',
    coverImageCaption: 'Ensuite Bedroom with Natural Light',
    priceSummary: {
      period: 'YEARLY',
      rentAmount: 220000,
      serviceCharge: 10000,
      agencyFee: 20000,
      cautionFee: 15000,
      otherMandatoryCharges: 10000,
      legalFee: 0,
      totalMandatoryCost: 275000,
      totalRefundableCost: 15000,
      isNegotiable: false
    },
    keyAmenities: AMENITIES_LIST,
    rooms: [
      {
        id: 'room-201',
        name: 'Single Self-Contain A1',
        type: 'SELF_CONTAIN',
        maxOccupants: 1,
        quantityTotal: 16,
        quantityAvailable: 6,
        isEnsuite: true,
        isFurnished: false
      }
    ],
    media: [
      { id: 'm-4', url: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1000&q=80', caption: 'Room View', displayOrder: 1, isCover: true, mediaType: 'IMAGE', category: 'BEDROOM' },
      { id: 'm-5', url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1000&q=80', caption: 'Exterior View', displayOrder: 2, isCover: false, mediaType: 'IMAGE', category: 'EXTERIOR' }
    ]
  },
  {
    id: 'prop-stadium-1',
    title: 'Scholars Court Premium Apartments',
    slug: 'scholars-court-premium-stadium-road',
    description: 'Serene, secure environment designed specifically for focused academic excellence. Features reading desks, high-speed Wi-Fi, constant water pressure, and night security watch.',
    address: '8 Winners Avenue, Stadium Road, Ogbomoso',
    nearbyLandmark: 'Beside Township Stadium Gate 2',
    latitude: 8.1380,
    longitude: 4.2550,
    distanceFromCampusKm: 1.1,
    propertyType: 'FLAT',
    genderPreference: 'ANY',
    totalRooms: 8,
    verificationStatus: 'APPROVED',
    availabilityStatus: 'AVAILABLE',
    isDemo: true,
    isFeatured: true,
    completenessScore: 100,
    createdAt: '2026-08-22T10:00:00Z',
    area: {
      id: 'area-stadium-road',
      name: 'Stadium Road',
      slug: 'stadium-road',
      landmark: 'Township Stadium'
    },
    coverImage: 'https://images.unsplash.com/photo-1507089947368-19c1da9775ae?auto=format&fit=crop&w=1000&q=80',
    coverImageCaption: 'Modern Living Space',
    priceSummary: {
      period: 'YEARLY',
      rentAmount: 320000,
      serviceCharge: 15000,
      agencyFee: 30000,
      cautionFee: 25000,
      otherMandatoryCharges: 10000,
      legalFee: 0,
      totalMandatoryCost: 400000,
      totalRefundableCost: 25000,
      isNegotiable: false
    },
    keyAmenities: AMENITIES_LIST,
    rooms: [
      {
        id: 'room-301',
        name: '2-Bedroom Shared Flat',
        type: 'FLAT',
        maxOccupants: 2,
        quantityTotal: 8,
        quantityAvailable: 3,
        isEnsuite: true,
        isFurnished: true
      }
    ],
    media: [
      { id: 'm-6', url: 'https://images.unsplash.com/photo-1507089947368-19c1da9775ae?auto=format&fit=crop&w=1000&q=80', caption: 'Apartment View', displayOrder: 1, isCover: true, mediaType: 'IMAGE', category: 'BEDROOM' }
    ]
  },
  {
    id: 'prop-college-1',
    title: 'Crown Heights Student Suites',
    slug: 'crown-heights-college-road',
    description: 'Prime accommodation 4 minutes walk from LAUTECH 2nd Gate. Features uninterrupted solar backup, personal water tanks, and reading library.',
    address: '22 Science Avenue, College Road, Ogbomoso',
    nearbyLandmark: 'Opposite CHS Anatomy Complex',
    latitude: 8.1420,
    longitude: 4.2590,
    distanceFromCampusKm: 0.4,
    propertyType: 'SELF_CONTAIN',
    genderPreference: 'ANY',
    totalRooms: 14,
    verificationStatus: 'APPROVED',
    availabilityStatus: 'AVAILABLE',
    isDemo: true,
    isFeatured: true,
    completenessScore: 100,
    createdAt: '2026-08-23T10:00:00Z',
    area: {
      id: 'area-college-road',
      name: 'College Road / 2nd Gate',
      slug: 'college-road',
      landmark: 'LAUTECH 2nd Gate'
    },
    coverImage: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1000&q=80',
    coverImageCaption: 'Spacious Suite Interior',
    priceSummary: {
      period: 'YEARLY',
      rentAmount: 260000,
      serviceCharge: 10000,
      agencyFee: 25000,
      cautionFee: 20000,
      otherMandatoryCharges: 10000,
      legalFee: 0,
      totalMandatoryCost: 325000,
      totalRefundableCost: 20000,
      isNegotiable: false
    },
    keyAmenities: AMENITIES_LIST,
    rooms: [
      {
        id: 'room-401',
        name: 'Suite Deluxe 1',
        type: 'SELF_CONTAIN',
        maxOccupants: 1,
        quantityTotal: 14,
        quantityAvailable: 5,
        isEnsuite: true,
        isFurnished: true
      }
    ],
    media: [
      { id: 'm-7', url: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1000&q=80', caption: 'Suite View', displayOrder: 1, isCover: true, mediaType: 'IMAGE', category: 'BEDROOM' }
    ]
  },
  {
    id: 'prop-general-1',
    title: 'Grace Villa Single Rooms & Self-Contain',
    slug: 'grace-villa-isale-general',
    description: 'Affordable, well-maintained student accommodation in a peaceful neighborhood. High perimeter fence, constant borehole water, and friendly student community.',
    address: '4 Central Mosque Street, Isale General, Ogbomoso',
    nearbyLandmark: '5 mins from State Hospital',
    latitude: 8.1320,
    longitude: 4.2690,
    distanceFromCampusKm: 1.8,
    propertyType: 'SINGLE_ROOM',
    genderPreference: 'ANY',
    totalRooms: 20,
    verificationStatus: 'APPROVED',
    availabilityStatus: 'AVAILABLE',
    isDemo: true,
    isFeatured: false,
    completenessScore: 95,
    createdAt: '2026-08-23T10:00:00Z',
    area: {
      id: 'area-isale-general',
      name: 'Isale General',
      slug: 'isale-general',
      landmark: 'State Hospital / General Area'
    },
    coverImage: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1000&q=80',
    coverImageCaption: 'Clean Room Interior',
    priceSummary: {
      period: 'YEARLY',
      rentAmount: 140000,
      serviceCharge: 5000,
      agencyFee: 15000,
      cautionFee: 10000,
      otherMandatoryCharges: 5000,
      legalFee: 0,
      totalMandatoryCost: 175000,
      totalRefundableCost: 10000,
      isNegotiable: false
    },
    keyAmenities: AMENITIES_LIST,
    rooms: [
      {
        id: 'room-501',
        name: 'Single Room Deluxe',
        type: 'SINGLE_ROOM',
        maxOccupants: 1,
        quantityTotal: 20,
        quantityAvailable: 8,
        isEnsuite: false,
        isFurnished: false
      }
    ],
    media: [
      { id: 'm-8', url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1000&q=80', caption: 'Room View', displayOrder: 1, isCover: true, mediaType: 'IMAGE', category: 'BEDROOM' }
    ]
  },
  {
    id: 'prop-caretaker-1',
    title: 'Royal Palm Executive Residency',
    slug: 'royal-palm-caretaker',
    description: 'Executive student lodge situated along Caretaker main road. Fast transport to Under G gate, gated parking, individual water meters, and 24/7 security watch.',
    address: '10 Commercial Avenue, Caretaker, Ogbomoso',
    nearbyLandmark: 'Close to Total Fuel Station',
    latitude: 8.1360,
    longitude: 4.2480,
    distanceFromCampusKm: 2.1,
    propertyType: 'SELF_CONTAIN',
    genderPreference: 'ANY',
    totalRooms: 10,
    verificationStatus: 'APPROVED',
    availabilityStatus: 'AVAILABLE',
    isDemo: true,
    isFeatured: false,
    completenessScore: 97,
    createdAt: '2026-08-24T10:00:00Z',
    area: {
      id: 'area-caretaker',
      name: 'Caretaker',
      slug: 'caretaker',
      landmark: 'Caretaker Junction'
    },
    coverImage: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1000&q=80',
    coverImageCaption: 'Executive Building & Compound',
    priceSummary: {
      period: 'YEARLY',
      rentAmount: 240000,
      serviceCharge: 10000,
      agencyFee: 20000,
      cautionFee: 15000,
      otherMandatoryCharges: 10000,
      legalFee: 0,
      totalMandatoryCost: 295000,
      totalRefundableCost: 15000,
      isNegotiable: false
    },
    keyAmenities: AMENITIES_LIST,
    rooms: [
      {
        id: 'room-601',
        name: 'Executive Studio 2B',
        type: 'SELF_CONTAIN',
        maxOccupants: 1,
        quantityTotal: 10,
        quantityAvailable: 4,
        isEnsuite: true,
        isFurnished: true
      }
    ],
    media: [
      { id: 'm-9', url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1000&q=80', caption: 'Residency View', displayOrder: 1, isCover: true, mediaType: 'IMAGE', category: 'EXTERIOR' }
    ]
  }
];

export function filterFallbackProperties(filters: any): { properties: Property[]; pagination: any } {
  let result = [...DEFAULT_PROPERTIES];

  if (filters.search) {
    const q = filters.search.toLowerCase().trim();
    result = result.filter(p => 
      p.title?.toLowerCase().includes(q) || 
      p.address?.toLowerCase().includes(q) ||
      p.nearbyLandmark?.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q) ||
      p.area?.name?.toLowerCase().includes(q)
    );
  }

  if (filters.areaId && filters.areaId !== 'all') {
    result = result.filter(p => p.area?.id === filters.areaId || p.area?.name?.toLowerCase().includes(filters.areaId.toLowerCase()));
  }

  if (filters.roomType && filters.roomType !== 'all') {
    result = result.filter(p => p.propertyType === filters.roomType);
  }

  if (filters.minPrice) {
    const min = Number(filters.minPrice);
    if (!isNaN(min)) result = result.filter(p => (p.priceSummary?.rentAmount || 0) >= min);
  }

  if (filters.maxPrice) {
    const max = Number(filters.maxPrice);
    if (!isNaN(max)) result = result.filter(p => (p.priceSummary?.rentAmount || 0) <= max);
  }

  if (filters.verifiedOnly) {
    result = result.filter(p => p.verificationStatus === 'APPROVED' || p.verificationStatus === 'VERIFIED');
  }

  const page = Number(filters.page) || 1;
  const limit = 12;
  const total = result.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const startIndex = (page - 1) * limit;
  const paginated = result.slice(startIndex, startIndex + limit);

  return {
    properties: paginated,
    pagination: { page, limit, total, totalPages }
  };
}

// Fallback data for Community Q&A & Roommates
export const DEFAULT_COMMUNITY_QUESTIONS = [
  {
    id: 'q-1',
    authorName: 'Adebayo F. (400L Civil Eng)',
    authorRole: 'STUDENT',
    title: 'How is the electricity situation in Under G vs Adenike currently?',
    content: 'I am planning to move out of my current lodge. Which area has a more reliable dedicated power line for studying at night?',
    areaName: 'Under G',
    upvotes: 24,
    createdAt: '2026-08-24T14:30:00Z',
    answers: [
      {
        id: 'ans-1',
        authorName: 'Kemi O. (300L Nursing)',
        content: 'Under-G on the Bovas feeder line averages 18-20 hours of power daily. Adenike is also very stable near Holy Light, but make sure your lodge has a prepaid meter.',
        upvotes: 19,
        isVerifiedStay: true,
        createdAt: '2026-08-24T16:00:00Z'
      }
    ]
  },
  {
    id: 'q-2',
    authorName: 'Tolani S. (200L Comp Sci)',
    authorRole: 'STUDENT',
    title: 'What is the average Keke NAPEP price from Stadium Road to Under G Gate?',
    content: 'Want to know monthly transit estimates before booking a room on Stadium Road.',
    areaName: 'Stadium Road',
    upvotes: 15,
    createdAt: '2026-08-25T09:15:00Z',
    answers: [
      {
        id: 'ans-2',
        authorName: 'Ibrahim M. (500L Agric)',
        content: 'It is typically ₦150 to ₦200 per drop. If you share a bike it is around ₦250. Walking takes about 12-15 minutes.',
        upvotes: 11,
        isVerifiedStay: true,
        createdAt: '2026-08-25T11:00:00Z'
      }
    ]
  }
];

export const DEFAULT_ROOMMATE_PROFILES = [
  {
    id: 'rm-1',
    fullName: 'Damilola Ajayi',
    department: 'Mechanical Engineering',
    level: '300L',
    gender: 'MALE',
    preferredArea: 'Under G / Adenike',
    budgetMax: 150000,
    sleepHabit: 'NIGHT_OWL',
    studyHabit: 'QUIET_FOCUSED',
    cleanlinessRating: 'VERY_CLEAN',
    bio: 'Easygoing 300L student looking for a neat and focused roommate to split an executive self-contain around Under G.',
    matchScore: 96
  },
  {
    id: 'rm-2',
    fullName: 'Grace Oladipo',
    department: 'Biochemistry',
    level: '200L',
    gender: 'FEMALE',
    preferredArea: 'Stadium Road / Adenike',
    budgetMax: 180000,
    sleepHabit: 'EARLY_BIRD',
    studyHabit: 'STUDY_GROUP',
    cleanlinessRating: 'MODERATE_CLEAN',
    bio: 'Christian female student seeking a peaceful roommate for a 2-room flat around Stadium Road. Non-smoker and serious with studies.',
    matchScore: 92
  }
];
