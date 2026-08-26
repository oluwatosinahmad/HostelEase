import { Property, CompletenessItem } from '../types';

export interface CompletenessResult {
  score: number;
  items: CompletenessItem[];
  missingCount: number;
  topRecommendation: string;
}

export function calculateListingCompleteness(property: Partial<Property>): CompletenessResult {
  const items: CompletenessItem[] = [
    {
      key: 'title_description',
      label: 'Title & Detailed Description',
      isCompleted: Boolean(property.title && property.description && property.description.length >= 40),
      weight: 15,
      recommendation: 'Add a comprehensive description (at least 40 characters) explaining the room features and study environment.',
    },
    {
      key: 'location',
      label: 'University & Exact Location Details',
      isCompleted: Boolean(property.universityId && property.zoneId && property.address && property.landmark),
      weight: 15,
      recommendation: 'Provide exact street address and prominent landmark (e.g. Near Bovas, 4 mins to gate).',
    },
    {
      key: 'pricing',
      label: 'Transparent Rent & Fee Breakdown',
      isCompleted: Boolean(property.fees && property.fees.annualRent > 0),
      weight: 20,
      recommendation: 'Set the annual rent and itemized fees (caution, agreement, service charges).',
    },
    {
      key: 'photos',
      label: 'Multiple High-Resolution Photos',
      isCompleted: Boolean(property.images && property.images.length >= 3),
      weight: 20,
      recommendation: 'Upload at least 3 photos covering the room interior, bathroom, and compound exterior.',
    },
    {
      key: 'video',
      label: '30–90s Walkthrough Video',
      isCompleted: Boolean(property.hasVideoTour && property.videoTourUrl),
      weight: 15,
      recommendation: 'Add a real property walkthrough video to boost student inquiries by 3x.',
    },
    {
      key: 'amenities',
      label: 'Verified Amenities Check',
      isCompleted: Boolean(property.amenities && property.amenities.length >= 3),
      weight: 10,
      recommendation: 'Select all available amenities (borehole, prepaid meter, security, parking, etc.).',
    },
    {
      key: 'availability',
      label: 'Active Availability Status',
      isCompleted: Boolean(property.availabilityStatus),
      weight: 5,
      recommendation: 'Confirm whether the property is immediately available or pending inspection.',
    },
  ];

  let totalScore = 0;
  items.forEach((item) => {
    if (item.isCompleted) {
      totalScore += item.weight;
    }
  });

  const missing = items.filter((i) => !i.isCompleted);
  const topRecommendation = missing.length > 0 ? missing[0].recommendation : 'Your listing is 100% complete and ready for verification!';

  return {
    score: Math.min(100, Math.round(totalScore)),
    items,
    missingCount: missing.length,
    topRecommendation,
  };
}
