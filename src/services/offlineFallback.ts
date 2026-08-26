import { Area, Property, Amenity } from '../types/hostelEase';

export const DEFAULT_AREAS: Area[] = [
  {
    id: 'area-under-g',
    universityId: 'univ-lautech',
    name: 'Under G',
    slug: 'under-g',
    description: 'Closest student community directly opposite the LAUTECH Under-G Gate. High concentration of modern self-contains, study cafes, and 24/7 commercial activities.',
    landmark: 'LAUTECH Under-G Gate & Bovas Station',
    approxDistanceMinKm: 0.1,
    approxDistanceMaxKm: 1.2,
    centerLat: 8.1458,
    centerLng: 4.2625,
    propertyCount: 8,
    minRent: 180000,
    maxRent: 350000
  },
  {
    id: 'area-adenike',
    universityId: 'univ-lautech',
    name: 'Adenike Area',
    slug: 'adenike',
    description: 'Popular student residential district with strong electricity supply, modern single rooms and self-contains. 5-10 minutes walk to campus.',
    landmark: 'Adenike Junction & Holy Light',
    approxDistanceMinKm: 0.4,
    approxDistanceMaxKm: 1.8,
    centerLat: 8.1412,
    centerLng: 4.2680,
    propertyCount: 6,
    minRent: 150000,
    maxRent: 320000
  },
  {
    id: 'area-stadium',
    universityId: 'univ-lautech',
    name: 'Stadium Road',
    slug: 'stadium-road',
    description: 'Serene, well-paved neighborhood preferred by serious students and final year scholars. Quiet environment with gated lodges and steady borehole water.',
    landmark: 'Ogbomoso Township Stadium',
    approxDistanceMinKm: 1.0,
    approxDistanceMaxKm: 2.5,
    centerLat: 8.1380,
    centerLng: 4.2550,
    propertyCount: 5,
    minRent: 200000,
    maxRent: 400000
  },
  {
    id: 'area-isale-general',
    universityId: 'univ-lautech',
    name: 'Isale General',
    slug: 'isale-general',
    description: 'Affordable, secure residential quarter near the State Hospital with spacious compounds, reliable water, and peaceful study atmosphere.',
    landmark: 'State Hospital / General Area',
    approxDistanceMinKm: 1.5,
    approxDistanceMaxKm: 3.2,
    centerLat: 8.1320,
    centerLng: 4.2690,
    propertyCount: 4,
    minRent: 120000,
    maxRent: 250000
  }
];

const AMENITIES_LIST: Amenity[] = [
  { id: 'am-1', key: 'electricity', name: 'Constant Electricity', category: 'POWER', icon: 'Zap' },
  { id: 'am-2', key: 'water', name: '24/7 Borehole Water', category: 'WATER', icon: 'Droplets' },
  { id: 'am-3', key: 'security', name: 'Gated & Fenced Compound', category: 'SECURITY', icon: 'ShieldCheck' },
  { id: 'am-4', key: 'tiled', name: 'Ceramic Tiled Floor', category: 'FACILITY', icon: 'Check' },
  { id: 'am-5', key: 'inverter', name: 'Solar / Inverter Backup', category: 'POWER', icon: 'Sun' }
];

export const DEFAULT_PROPERTIES: Property[] = [
  {
    id: 'prop-underg-1',
    title: 'Emerald Heights Luxury Self-Contain',
    slug: 'emerald-heights-luxury-self-contain-under-g',
    description: 'Newly finished premium self-contained apartment with POP ceiling, dedicated prepaid meter, 24/7 motorized borehole with multiple overhead reserve tanks, and quiet environment ideal for studying.',
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
      { id: 'm-1', url: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=1000&q=80', caption: 'Living Room', displayOrder: 1, isCover: true, mediaType: 'IMAGE', category: 'BEDROOM' },
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
      id: 'area-stadium',
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
        id: 'room-401',
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
      { id: 'm-7', url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1000&q=80', caption: 'Room View', displayOrder: 1, isCover: true, mediaType: 'IMAGE', category: 'BEDROOM' }
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
      p.description?.toLowerCase().includes(q)
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
