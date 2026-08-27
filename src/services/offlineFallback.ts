import { 
  Area, 
  Property, 
  Amenity, 
  StudentDashboardData, 
  StudentPreferences,
  RevenueOverviewResponse,
  AdminFinancialsData,
  BookingCommissionItem,
  ProviderSubscriptionItem,
  FeaturedListingItem,
  ProviderDigitalServiceItem,
  PayoutRequestItem,
  PlatformInvoiceItem,
  PlatformWithdrawalItem,
  FinancialReportRow,
  RevenueSettingItem,
  AdminUserItem,
  AdminProviderItem,
  AdminAuditLogItem
} from '../types/hostelEase';

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

// =========================================================================
// PHASE 15: COMPLETE OPERATIONS FALLBACK DATA
// =========================================================================
export const DEFAULT_OPERATIONAL_TASKS = [
  {
    id: 'opt-1',
    title: 'Physical Site Inspection for Emerald Heights (Under G)',
    description: 'Verify 24/7 borehole pressure, gate security locks, and POP ceiling state.',
    category: 'VERIFICATION' as const,
    priority: 'HIGH' as const,
    status: 'RESOLVED' as const,
    assignedTo: 'Admin Officer (Ibrahim)',
    relatedEntityType: 'HOSTEL',
    relatedEntityId: 'prop-underg-1',
    createdAt: '2026-08-25T10:00:00Z',
    resolvedAt: '2026-08-25T16:00:00Z',
    resolutionNotes: 'Field verification complete. 100% genuine LAUTECH listing.'
  },
  {
    id: 'opt-2',
    title: 'Move-In Checkin Audit for Peace Haven Room 104',
    description: 'Student marked minor faucet leakage during move-in. Landlord dispatched plumber.',
    category: 'MOVE_IN' as const,
    priority: 'MEDIUM' as const,
    status: 'IN_PROGRESS' as const,
    assignedTo: 'Support Staff (Kemi)',
    relatedEntityType: 'BOOKING',
    relatedEntityId: 'book-102',
    createdAt: '2026-08-26T08:30:00Z'
  },
  {
    id: 'opt-3',
    title: 'Process Provider Payout for Scholars Court',
    description: 'Student checked in and verified key handover. Net payout ₦304,000 ready for bank disbursement.',
    category: 'REFUND' as const,
    priority: 'HIGH' as const,
    status: 'PENDING' as const,
    assignedTo: 'Finance Admin (Tayo)',
    relatedEntityType: 'PAYOUT',
    relatedEntityId: 'payout-101',
    createdAt: '2026-08-26T11:00:00Z'
  }
];

export const DEFAULT_PAYOUTS = [
  {
    id: 'payout-101',
    providerId: 'user-provider-1',
    providerName: 'Engr. Segun Adeyemi',
    providerPhone: '+2348034567890',
    bookingId: 'book-101',
    hostelTitle: 'Emerald Heights Luxury Self-Contain',
    roomName: 'Executive Self-Contain Room 1',
    grossAmount: 350000,
    platformFee: 17500,
    cautionEscrow: 20000,
    netPayout: 312500,
    payoutStatus: 'PAID' as const,
    payoutReference: 'PAYOUT-FLW-89382109',
    bankName: 'First Bank Nigeria',
    accountNumber: '3049281920',
    accountName: 'Segun Adeyemi Enterprise',
    processedBy: 'Finance Admin',
    createdAt: '2026-08-25T14:00:00Z',
    paidAt: '2026-08-25T15:30:00Z'
  },
  {
    id: 'payout-102',
    providerId: 'user-provider-2',
    providerName: 'Chief Oladimeji Alao',
    providerPhone: '+2348051239876',
    bookingId: 'book-102',
    hostelTitle: 'Peace Haven Executive Lodge',
    roomName: 'Single Self-Contain A1',
    grossAmount: 275000,
    platformFee: 13750,
    cautionEscrow: 15000,
    netPayout: 246250,
    payoutStatus: 'PROCESSING' as const,
    payoutReference: 'PAYOUT-FLW-90182341',
    bankName: 'GTBank',
    accountNumber: '0129384756',
    accountName: 'Oladimeji Alao',
    processedBy: 'Finance Admin',
    createdAt: '2026-08-26T09:00:00Z'
  }
];

export const DEFAULT_NOTIFICATION_LOGS = [
  {
    id: 'notif-1',
    userId: 'usr-student-1',
    userName: 'Tunde Bakare',
    channel: 'IN_APP' as const,
    eventType: 'BOOKING_CONFIRMED',
    recipient: 'tunde@lautech.edu.ng',
    message: 'Your booking for Emerald Heights (Room 101) has been approved by the landlord.',
    deliveryStatus: 'DELIVERED' as const,
    readStatus: true,
    createdAt: '2026-08-25T12:00:00Z'
  },
  {
    id: 'notif-2',
    userId: 'usr-student-1',
    userName: 'Tunde Bakare',
    channel: 'SMS' as const,
    eventType: 'INSPECTION_REMINDER',
    recipient: '+2348012345678',
    message: 'Reminder: Your physical hostel inspection is scheduled for tomorrow at 2:00 PM (Under G Gate).',
    deliveryStatus: 'DELIVERED' as const,
    readStatus: false,
    createdAt: '2026-08-25T18:00:00Z'
  }
];

export const DEFAULT_OPERATIONS_DASHBOARD = {
  todayBookingsCount: 3,
  pendingBookingsCount: 2,
  todayMoveInsCount: 1,
  upcomingMoveInsCount: 4,
  openComplaintsCount: 1,
  openDisputesCount: 1,
  pendingRefundsCount: 1,
  paymentIssuesCount: 0,
  pendingProviderVerificationsCount: 2,
  pendingHostelVerificationsCount: 1,
  unresolvedAccommodationIssuesCount: 2,
  openSupportTicketsCount: 3,
  urgentTasksCount: 1,
  actionRequiredItems: [
    {
      id: 'act-1',
      title: '2 Booking Requests Require Attention',
      description: 'Students waiting for landlord reservation approval on Under G lodges.',
      category: 'BOOKING',
      priority: 'HIGH' as const,
      actionUrl: '/admin/bookings'
    },
    {
      id: 'act-2',
      title: '2 Provider NIN & CAC Verifications Awaiting Review',
      description: 'Review government documents before enabling new property submissions.',
      category: 'VERIFICATION',
      priority: 'HIGH' as const,
      actionUrl: '/admin/providers'
    },
    {
      id: 'act-3',
      title: '1 Student Escrow Dispute Pending Mediation',
      description: 'Student requested caution deposit verification review.',
      category: 'DISPUTE',
      priority: 'URGENT' as const,
      actionUrl: '/admin/disputes'
    }
  ],
  operationalTasks: DEFAULT_OPERATIONAL_TASKS,
  recentPayouts: DEFAULT_PAYOUTS,
  complaintPatterns: [
    {
      propertyId: 'prop-underg-1',
      propertyTitle: 'Emerald Heights Luxury Self-Contain',
      areaName: 'Under G',
      providerName: 'Engr. Segun Adeyemi',
      totalComplaints: 1,
      electricityIssues: 0,
      waterIssues: 1,
      securityIssues: 0,
      cleanlinessIssues: 0,
      status: 'NORMAL' as const
    },
    {
      propertyId: 'prop-adenike-1',
      propertyTitle: 'Peace Haven Executive Lodge',
      areaName: 'Adenike Area',
      providerName: 'Chief Oladimeji Alao',
      totalComplaints: 2,
      electricityIssues: 1,
      waterIssues: 1,
      securityIssues: 0,
      cleanlinessIssues: 0,
      status: 'NORMAL' as const
    }
  ],
  providerScorecards: [
    {
      providerId: 'user-provider-1',
      providerName: 'Engr. Segun Adeyemi',
      businessName: 'Destiny Properties LAUTECH',
      totalHostels: 3,
      totalBedspaces: 32,
      occupiedBedspaces: 26,
      occupancyRate: '81.2%',
      bookingAcceptanceRate: '94.5%',
      cancellationRate: '2.1%',
      avgIssueResolutionHours: 4.2,
      studentSatisfactionRating: 4.8,
      verificationBadge: 'VERIFIED_PROVIDER' as const
    },
    {
      providerId: 'user-provider-2',
      providerName: 'Chief Oladimeji Alao',
      businessName: 'Holy Light Real Estate',
      totalHostels: 2,
      totalBedspaces: 24,
      occupiedBedspaces: 20,
      occupancyRate: '83.3%',
      bookingAcceptanceRate: '91.0%',
      cancellationRate: '4.0%',
      avgIssueResolutionHours: 8.5,
      studentSatisfactionRating: 4.5,
      verificationBadge: 'VERIFIED_PROVIDER' as const
    }
  ]
};

export const DEFAULT_STUDENT_PREFERENCES: StudentPreferences = {
  minBudget: 120000,
  maxBudget: 350000,
  preferredAreas: ['Under G', 'Adenike Area', 'Stadium Road'],
  preferredRoomTypes: ['SELF_CONTAIN', 'SINGLE_ROOM', 'FLAT'],
  preferredFacilities: ['Borehole Water', 'Backup Generator / Solar', 'Fenced & Gated', 'Prepaid Meter'],
  maxDistanceKm: 2.5,
  genderPreference: 'ANY',
  preferredMoveInDate: '2026-09-01',
  isMoveInFlexible: true,
  academicSession: '2026/2027',
  onboardingCompleted: true
};

export const DEFAULT_STUDENT_DASHBOARD: StudentDashboardData = {
  summary: {
    savedCount: 3,
    pendingInspectionsCount: 1,
    activeBookingsCount: 1,
    pendingPaymentsCount: 0,
    unreadMessagesCount: 2
  },
  urgentAction: {
    type: 'INSPECTION_REMINDER',
    priority: 1,
    badge: 'Upcoming Tour',
    badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
    title: 'Scheduled Physical Inspection Today at 2:00 PM',
    message: 'Your inspection for Crown Royal Deluxe Lodge (Room B2) with Engr. Segun Adeyemi is scheduled for today. Bring your student ID.',
    actionLabel: 'View Inspection Details',
    actionType: 'VIEW_INSPECTIONS',
    inspectionId: 'insp-1'
  },
  actionQueue: [
    {
      type: 'INSPECTION_REMINDER',
      priority: 1,
      badge: 'Upcoming Tour',
      badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
      title: 'Scheduled Physical Inspection Today at 2:00 PM',
      message: 'Your inspection for Crown Royal Deluxe Lodge with Engr. Segun Adeyemi is confirmed.',
      actionLabel: 'View Tour',
      actionType: 'VIEW_INSPECTIONS',
      inspectionId: 'insp-1'
    }
  ],
  activeBooking: {
    id: 'bk-demo-101',
    bookingReference: 'HE-BK-2026-8891',
    propertyId: 'prop-underg-1',
    propertyTitle: 'Crown Royal Deluxe Lodge',
    propertyAddress: 'Opposite Bovas Station, Under G Area, Ogbomoso',
    coverImage: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1000&q=80',
    distanceFromCampusKm: 0.6,
    roomName: 'Executive Ensuite Room (B2)',
    roomType: 'SELF_CONTAIN',
    bedspaceNumber: 'Bed A',
    moveInDate: '2026-09-01',
    academicSession: '2026/2027',
    totalCost: 280000,
    rentAmount: 220000,
    status: 'CONFIRMED',
    paymentStatus: 'PAID',
    paidAt: '2026-08-20T10:00:00Z',
    expiresAt: '2027-08-20T10:00:00Z',
    provider: {
      name: 'Engr. Segun Adeyemi',
      phone: '+234 803 123 4567',
      email: 'landlord@destinyproperties.ng'
    }
  },
  pendingBookings: [],
  pendingPayments: [],
  upcomingInspection: {
    id: 'insp-1',
    propertyTitle: 'Crown Royal Deluxe Lodge',
    propertyAddress: 'Opposite Bovas Station, Under G, Ogbomoso',
    date: '2026-08-26',
    time: '14:00',
    type: 'PHYSICAL',
    status: 'CONFIRMED',
    provider: {
      name: 'Engr. Segun Adeyemi',
      phone: '+234 803 123 4567'
    }
  },
  recentInspections: [
    {
      id: 'insp-1',
      inspectionType: 'PHYSICAL',
      preferredDate: '2026-08-26',
      preferredTime: '14:00',
      status: 'CONFIRMED',
      propertyTitle: 'Crown Royal Deluxe Lodge',
      propertyId: 'prop-underg-1'
    }
  ],
  recentMessages: [
    {
      id: 'msg-1',
      propertyId: 'prop-underg-1',
      content: 'Hello Ahmad! I will be waiting at the lodge gate by 2:00 PM for the inspection.',
      createdAt: '2026-08-26T11:30:00Z',
      isRead: 0,
      propertyTitle: 'Crown Royal Deluxe Lodge',
      otherPartyName: 'Engr. Segun Adeyemi'
    },
    {
      id: 'msg-2',
      propertyId: 'prop-adenike-1',
      content: 'Good day! Room 4 is still available for the 2026/2027 academic session.',
      createdAt: '2026-08-25T17:15:00Z',
      isRead: 1,
      propertyTitle: 'Peace Haven Executive Lodge',
      otherPartyName: 'Chief Oladimeji Alao'
    }
  ],
  savedHostels: DEFAULT_PROPERTIES.slice(0, 3).map((p, idx) => ({
    ...p,
    savedId: `saved-${idx + 1}`,
    savedAt: '2026-08-24T12:00:00Z',
    priceChanged: false,
    availabilityChanged: false
  })),
  recentlyViewed: DEFAULT_PROPERTIES.slice(0, 4).map(p => ({
    ...p,
    viewedAt: '2026-08-26T10:00:00Z'
  })),
  recommendedHostels: DEFAULT_PROPERTIES.slice(0, 3).map((p, idx) => ({
    ...p,
    matchScore: 95 - idx * 5,
    explanationReasons: [
      'Matches your preferred location (Under G & Adenike)',
      'Rent is within your ₦120k - ₦350k budget',
      'Verified borehole water & prepaid meter available'
    ]
  })),
  preferences: DEFAULT_STUDENT_PREFERENCES,
  profileCompleteness: {
    score: 85,
    missingFields: ['matricNo']
  },
  user: {
    id: 'student-demo-1',
    fullName: 'Ahmad Adelopo',
    email: 'student@lautech.edu.ng',
    phone: '+234 812 345 6789',
    department: 'Computer Science',
    level: '300L',
    matricNo: '184920',
    gender: 'MALE',
    avatarUrl: ''
  }
};

export const DEFAULT_REVENUE_OVERVIEW: RevenueOverviewResponse = {
  success: true,
  ownerRevenue: {
    totalGrossRevenue: 4500000,
    bookingCommission: 337500,
    providerSubscriptions: 180000,
    featuredListings: 60000,
    digitalServices: 45000,
    refunds: 0,
    netPlatformRevenue: 622500
  },
  dashboardSummary: {
    totalRevenue: 4500000,
    thisMonth: 850000,
    pendingRevenue: 280000,
    successfulBookings: 18,
    providerRevenue: 3877500,
    platformCommission: 622500,
    activeSubscribers: 8,
    activeFeatured: 4,
    completedServices: 6,
    pendingPayouts: 180000,
    pendingPayoutsCount: 2,
    totalOwnerWithdrawn: 400000
  },
  streams: [
    { name: '7.5% Booking Commissions', amount: 337500, percentage: 54.2, color: '#10B981', icon: 'Receipt' },
    { name: 'Provider Subscriptions', amount: 180000, percentage: 28.9, color: '#3B82F6', icon: 'ShieldCheck' },
    { name: 'Featured Listings Boost', amount: 60000, percentage: 9.6, color: '#F59E0B', icon: 'Sparkles' },
    { name: 'Photography & Digital Services', amount: 45000, percentage: 7.3, color: '#8B5CF6', icon: 'Camera' }
  ],
  areaRevenue: [
    { areaName: 'Under G', areaSlug: 'under-g', paymentsCount: 8, grossAmount: 2200000, commissionEarned: 165000 },
    { areaName: 'Adenike Area', areaSlug: 'adenike', paymentsCount: 5, grossAmount: 1250000, commissionEarned: 93750 },
    { areaName: 'Stadium Road', areaSlug: 'stadium-road', paymentsCount: 3, grossAmount: 700000, commissionEarned: 52500 },
    { areaName: 'College Road', areaSlug: 'college-road', paymentsCount: 2, grossAmount: 350000, commissionEarned: 26250 }
  ],
  monthlyHistory: [
    { month: '2026-05', bookingCommission: 45000, grossTransactionVolume: 600000, transactionsCount: 3 },
    { month: '2026-06', bookingCommission: 90000, grossTransactionVolume: 1200000, transactionsCount: 5 },
    { month: '2026-07', bookingCommission: 135000, grossTransactionVolume: 1800000, transactionsCount: 7 },
    { month: '2026-08', bookingCommission: 67500, grossTransactionVolume: 900000, transactionsCount: 3 }
  ]
};

export const DEFAULT_ADMIN_FINANCIALS: AdminFinancialsData = {
  metrics: {
    totalGmv: 4500000,
    totalPlatformFees: 337500,
    totalProviderEarnings: 3877500,
    totalRefunded: 0,
    successCount: 18,
    pendingCount: 2,
    failedCount: 0,
    refundedCount: 0,
    totalTransactions: 20
  },
  ledgerStream: [
    {
      id: 'led-1',
      entryType: 'PAYMENT_RECEIVED',
      amount: 280000,
      currency: 'NGN',
      debitAccount: 'STUDENT_PAYMENT_GATEWAY',
      creditAccount: 'ESCROW_HOLDING_ACCOUNT',
      description: 'Hostel Booking Payment for Crown Royal Deluxe Lodge',
      createdAt: '2026-08-20T10:00:00Z',
      paymentReference: 'HE-PAY-2026-8891',
      bookingReference: 'HE-BK-2026-8891'
    },
    {
      id: 'led-2',
      entryType: 'PLATFORM_FEE_DEDUCTED',
      amount: 21000,
      currency: 'NGN',
      debitAccount: 'ESCROW_HOLDING_ACCOUNT',
      creditAccount: 'PLATFORM_REVENUE_ACCOUNT',
      description: '7.5% Platform Commission for Booking HE-BK-2026-8891',
      createdAt: '2026-08-20T10:00:05Z',
      paymentReference: 'HE-PAY-2026-8891',
      bookingReference: 'HE-BK-2026-8891'
    }
  ],
  disputes: [
    {
      id: 'disp-101',
      disputeReference: 'DISP-2026-091',
      reason: 'Water pump maintenance delay reported prior to move-in date',
      status: 'UNDER_REVIEW',
      createdAt: '2026-08-25T14:30:00Z',
      bookingReference: 'HE-BK-2026-7712',
      studentName: 'Ahmad Adelopo',
      providerName: 'Engr. Segun Adeyemi',
      paymentAmount: 240000
    }
  ]
};

export const DEFAULT_COMMISSIONS_LIST: BookingCommissionItem[] = [
  {
    paymentId: 'pay-1',
    paymentReference: 'HE-PAY-2026-8891',
    grossRentPaid: 280000,
    commissionEarned: 21000,
    providerNet: 259000,
    status: 'COMPLETED',
    paidAt: '2026-08-20T10:00:00Z',
    createdAt: '2026-08-20T09:45:00Z',
    bookingReference: 'HE-BK-2026-8891',
    hostelTitle: 'Crown Royal Deluxe Lodge',
    areaName: 'Under G',
    studentName: 'Ahmad Adelopo',
    providerName: 'Engr. Segun Adeyemi',
    commissionRatePercent: 7.5
  },
  {
    paymentId: 'pay-2',
    paymentReference: 'HE-PAY-2026-7712',
    grossRentPaid: 240000,
    commissionEarned: 18000,
    providerNet: 222000,
    status: 'COMPLETED',
    paidAt: '2026-08-18T15:20:00Z',
    createdAt: '2026-08-18T15:00:00Z',
    bookingReference: 'HE-BK-2026-7712',
    hostelTitle: 'Peace Haven Executive Lodge',
    areaName: 'Adenike Area',
    studentName: 'Bolanle Olamide',
    providerName: 'Chief Oladimeji Alao',
    commissionRatePercent: 7.5
  }
];

export const DEFAULT_SUBSCRIPTIONS_LIST: ProviderSubscriptionItem[] = [
  {
    id: 'sub-1',
    provider_id: 'user-provider-1',
    providerName: 'Engr. Segun Adeyemi',
    providerEmail: 'provider@hostelease.ng',
    providerPhone: '+234 803 123 4567',
    businessName: 'Destiny Properties LAUTECH',
    plan_name: 'PRO_LANDLORD',
    amount: 15000,
    billing_cycle: 'MONTHLY',
    max_listings: 10,
    features_json: JSON.stringify(['Instant SMS Leads', 'Verified Badge', 'Direct Tenant Chat', 'Priority Placement']),
    status: 'ACTIVE',
    start_date: '2026-08-01',
    end_date: '2026-08-31',
    payment_reference: 'HE-SUB-2026-001',
    created_at: '2026-08-01T00:00:00Z'
  },
  {
    id: 'sub-2',
    provider_id: 'user-provider-2',
    providerName: 'Chief Oladimeji Alao',
    providerEmail: 'alao@holylightproperties.ng',
    providerPhone: '+234 802 987 6543',
    businessName: 'Holy Light Real Estate',
    plan_name: 'ENTERPRISE_ESTATE',
    amount: 35000,
    billing_cycle: 'MONTHLY',
    max_listings: 30,
    features_json: JSON.stringify(['Unlimited Listings', '3D Walkthrough Tours', 'Dedicated Account Manager', 'Verified Badge']),
    status: 'ACTIVE',
    start_date: '2026-08-01',
    end_date: '2026-08-31',
    payment_reference: 'HE-SUB-2026-002',
    created_at: '2026-08-01T00:00:00Z'
  }
];

export const DEFAULT_FEATURED_LISTINGS_LIST: FeaturedListingItem[] = [
  {
    id: 'feat-1',
    property_id: 'prop-underg-1',
    propertyTitle: 'Crown Royal Deluxe Lodge',
    propertyAddress: 'Opposite Bovas Station, Under G, Ogbomoso',
    propertySlug: 'crown-royal-deluxe-lodge',
    areaName: 'Under G',
    provider_id: 'user-provider-1',
    providerName: 'Engr. Segun Adeyemi',
    providerPhone: '+234 803 123 4567',
    feature_tier: 'HOMEPAGE_SPOTLIGHT',
    amount: 25000,
    duration_days: 30,
    impressions_count: 1420,
    clicks_count: 310,
    status: 'ACTIVE',
    start_date: '2026-08-01',
    end_date: '2026-08-31',
    payment_reference: 'HE-FEAT-2026-01',
    created_at: '2026-08-01T00:00:00Z'
  }
];

export const DEFAULT_SERVICES_LIST: ProviderDigitalServiceItem[] = [
  {
    id: 'serv-1',
    provider_id: 'user-provider-1',
    providerName: 'Engr. Segun Adeyemi',
    property_id: 'prop-underg-1',
    propertyTitle: 'Crown Royal Deluxe Lodge',
    service_type: 'PROFESSIONAL_PHOTOGRAPHY',
    service_name: 'HD Wide-Angle Room & Exterior Photography',
    amount: 15000,
    status: 'COMPLETED',
    assigned_agent: 'Bamidele Olatunji (Verified Media Agent)',
    delivery_notes: '12 high-resolution photos uploaded and approved for listing.',
    payment_reference: 'HE-SERV-2026-01',
    created_at: '2026-08-10T11:00:00Z',
    completed_at: '2026-08-12T16:00:00Z'
  }
];

export const DEFAULT_PAYOUTS_LIST: PayoutRequestItem[] = [
  {
    id: 'pay-req-1',
    payout_reference: 'HE-PO-2026-901',
    provider_id: 'user-provider-1',
    providerName: 'Engr. Segun Adeyemi',
    providerEmail: 'provider@hostelease.ng',
    providerPhone: '+234 803 123 4567',
    businessName: 'Destiny Properties LAUTECH',
    amount: 259000,
    bank_name: 'First Bank of Nigeria',
    account_number: '3049182740',
    account_name: 'Segun Adeyemi',
    status: 'PAID',
    processed_at: '2026-08-20T14:30:00Z',
    processed_by: 'Oluwatosin Ahmad (Admin)',
    created_at: '2026-08-20T12:00:00Z'
  },
  {
    id: 'pay-req-2',
    payout_reference: 'HE-PO-2026-902',
    provider_id: 'user-provider-2',
    providerName: 'Chief Oladimeji Alao',
    providerEmail: 'alao@holylightproperties.ng',
    providerPhone: '+234 802 987 6543',
    businessName: 'Holy Light Real Estate',
    amount: 222000,
    bank_name: 'Guaranty Trust Bank (GTBank)',
    account_number: '0129481726',
    account_name: 'Oladimeji Alao',
    status: 'PROCESSING',
    created_at: '2026-08-22T09:00:00Z'
  }
];

export const DEFAULT_INVOICES_LIST: PlatformInvoiceItem[] = [
  {
    id: 'inv-1',
    invoice_number: 'HE-INV-2026-001',
    user_id: 'user-provider-1',
    user_role: 'PROVIDER',
    user_name: 'Engr. Segun Adeyemi',
    user_email: 'provider@hostelease.ng',
    item_type: 'SUBSCRIPTION',
    item_description: 'Pro Landlord Subscription (August 2026)',
    subtotal: 15000,
    tax_amount: 0,
    total_amount: 15000,
    status: 'PAID',
    due_date: '2026-08-05',
    paid_at: '2026-08-01T10:00:00Z',
    created_at: '2026-08-01T00:00:00Z'
  }
];

export const DEFAULT_WITHDRAWALS_LIST: PlatformWithdrawalItem[] = [
  {
    id: 'wdr-1',
    withdrawal_reference: 'HE-WDR-2026-01',
    admin_id: 'user-admin-1',
    adminName: 'Oluwatosin Ahmad',
    adminEmail: 'admin@hostelease.ng',
    amount: 200000,
    destination_bank: 'First Bank of Nigeria',
    destination_account_number: '3049182740',
    destination_account_name: 'Oluwatosin Ahmad',
    status: 'COMPLETED',
    purpose: 'Platform Commission Profit Distribution',
    created_at: '2026-08-15T10:00:00Z'
  }
];

export const DEFAULT_REPORT_ROWS: FinancialReportRow[] = [
  {
    monthPeriod: 'August 2026',
    paidBookings: 18,
    grossBookingVolume: 4500000,
    bookingCommission: 337500,
    subscriptionRevenue: 180000,
    featuredRevenue: 60000,
    digitalServiceRevenue: 45000,
    totalPlatformGross: 622500,
    refundsTotal: 0,
    netPlatformEarnings: 622500,
    providerDisbursements: 3877500
  }
];

export const DEFAULT_REVENUE_SETTINGS: RevenueSettingItem[] = [
  { id: 'set-1', setting_key: 'commission_rate_percent', setting_value: '7.5', category: 'COMMISSION', description: 'Percentage charged per successful booking', updated_at: '2026-08-20T00:00:00Z' },
  { id: 'set-2', setting_key: 'min_payout_threshold', setting_value: '10000', category: 'PAYOUT', description: 'Minimum amount required to request a payout', updated_at: '2026-08-20T00:00:00Z' },
  { id: 'set-3', setting_key: 'caution_fee_retention_days', setting_value: '7', category: 'ESCROW', description: 'Days caution fee is held in escrow post move-in', updated_at: '2026-08-20T00:00:00Z' }
];

export const DEFAULT_ADMIN_USERS: AdminUserItem[] = [
  {
    id: 'user-admin-1',
    email: 'admin@hostelease.ng',
    fullName: 'Oluwatosin Ahmad',
    phone: '+234 800 000 0001',
    role: 'ADMIN',
    isActive: true,
    accountStatus: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00Z',
    studentBookingsCount: 0,
    providerHostelsCount: 0
  },
  {
    id: 'user-student-1',
    email: 'student@lautech.edu.ng',
    fullName: 'Ahmad Adelopo',
    phone: '+234 812 345 6789',
    role: 'STUDENT',
    isActive: true,
    accountStatus: 'ACTIVE',
    createdAt: '2026-02-15T10:00:00Z',
    studentBookingsCount: 1,
    providerHostelsCount: 0
  },
  {
    id: 'user-provider-1',
    email: 'provider@hostelease.ng',
    fullName: 'Engr. Segun Adeyemi',
    phone: '+234 803 123 4567',
    role: 'PROVIDER',
    isActive: true,
    accountStatus: 'ACTIVE',
    createdAt: '2026-01-10T14:00:00Z',
    studentBookingsCount: 0,
    providerHostelsCount: 3
  }
];

export const DEFAULT_ADMIN_DISPUTES = [
  {
    id: 'disp-101',
    disputeCode: 'DISP-2026-091',
    bookingReference: 'HE-BK-2026-7712',
    category: 'MAINTENANCE_ISSUE',
    subject: 'Borehole Water Pump Maintenance Delay',
    description: 'Student reported water supply maintenance taking longer than 48 hours. Landlord has engaged a technician.',
    status: 'UNDER_REVIEW',
    totalCost: 240000,
    studentName: 'Ahmad Adelopo',
    propertyTitle: 'Crown Royal Deluxe Lodge',
    providerName: 'Engr. Segun Adeyemi',
    createdAt: '2026-08-25T14:30:00Z'
  }
];

export const DEFAULT_ADMIN_AUDIT_LOGS: AdminAuditLogItem[] = [
  {
    id: 'audit-1',
    actorId: 'user-admin-1',
    actorName: 'Oluwatosin Ahmad (Admin)',
    actorRole: 'SUPER_ADMIN',
    action: 'VERIFY_HOSTEL',
    entityType: 'PROPERTY',
    entityId: 'prop-underg-1',
    details: 'Awarded 8-point physical verification badge to Crown Royal Deluxe Lodge',
    createdAt: '2026-08-20T10:30:00Z'
  },
  {
    id: 'audit-2',
    actorId: 'user-admin-1',
    actorName: 'Oluwatosin Ahmad (Admin)',
    actorRole: 'SUPER_ADMIN',
    action: 'AUTHORIZE_PAYOUT',
    entityType: 'PAYOUT',
    entityId: 'pay-req-1',
    details: 'Approved provider disbursement of ₦259,000 to Engr. Segun Adeyemi',
    createdAt: '2026-08-20T14:30:00Z'
  }
];

