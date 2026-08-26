export function formatNaira(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '₦0';
  }
  return '₦' + Math.round(amount).toLocaleString('en-NG');
}

export function formatDistance(distanceKm: number | null | undefined): string {
  if (distanceKm === null || distanceKm === undefined) return '';
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)}m from LAUTECH Gate`;
  }
  return `${distanceKm.toFixed(1)} km from LAUTECH`;
}

export function getAvailabilityBadgeInfo(status: string) {
  switch (status) {
    case 'AVAILABLE':
      return { label: 'Available', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    case 'LIMITED':
      return { label: 'Few Rooms Left', bg: 'bg-amber-50 text-amber-700 border-amber-200' };
    case 'FULLY_OCCUPIED':
      return { label: 'Fully Occupied', bg: 'bg-red-50 text-red-700 border-red-200' };
    case 'UNAVAILABLE':
    default:
      return { label: 'Unavailable', bg: 'bg-slate-100 text-slate-600 border-slate-200' };
  }
}

export function getVerificationBadgeInfo(status: string) {
  switch (status) {
    case 'APPROVED':
      return { label: 'Hostel Ease Verified', bg: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
    case 'PENDING':
      return { label: 'Verification Pending', bg: 'bg-amber-100 text-amber-800 border-amber-300' };
    case 'REJECTED':
      return { label: 'Rejected', bg: 'bg-red-100 text-red-800 border-red-300' };
    case 'SUSPENDED':
      return { label: 'Suspended', bg: 'bg-rose-100 text-rose-800 border-rose-300' };
    default:
      return { label: status, bg: 'bg-slate-100 text-slate-700 border-slate-300' };
  }
}

export function getPropertyTypeLabel(type: string): string {
  switch (type) {
    case 'SELF_CONTAIN':
      return 'Self-Contain';
    case 'SINGLE_ROOM':
      return 'Single Room';
    case 'FLAT':
      return 'Apartment / Flat';
    case 'SHARED_BEDSPACE':
      return 'Shared Bedspace';
    default:
      return type;
  }
}

export function formatDate(dateStr?: string | null): string {
  if (!dateStr) return 'N/A';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}
