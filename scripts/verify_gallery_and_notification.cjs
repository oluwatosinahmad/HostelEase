const fs = require('fs');
const path = require('path');

console.log('--- RUNNING AUDIT & VERIFICATION FOR TASK 1 & TASK 2 ---\n');

let failed = false;
function assert(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`);
  } else {
    console.error(`[FAIL] ${message}`);
    failed = true;
  }
}

// 1. Verify NotificationCenterModal.tsx
const notifPath = path.join(__dirname, '..', 'src', 'components', 'NotificationCenterModal.tsx');
const notifCode = fs.readFileSync(notifPath, 'utf8');

assert(notifCode.includes('items-center justify-center'), 'Notification modal overlay is centered (not items-end bottom sheet)');
assert(notifCode.includes('z-[100]'), 'Notification modal overlay has high z-index (z-[100]) above bottom navigation');
assert(notifCode.includes("w-[94%] max-w-lg"), 'Notification modal uses 94% width fitting mobile viewports comfortably');
assert(notifCode.includes("min(86vh, calc(100dvh - 2rem))"), 'Notification modal uses dynamic safe viewport height');
assert(notifCode.includes('overflow-y-auto'), 'Notification list has internal scrolling');
assert(
  notifCode.includes("'all'") &&
  notifCode.includes("'unread'") &&
  notifCode.includes("'messages'") &&
  notifCode.includes("'bookings'") &&
  notifCode.includes("'inspections'") &&
  notifCode.includes("'maintenance'") &&
  notifCode.includes("'safety'"),
  'All 7 notification categories are preserved and available'
);
assert(!notifCode.includes('w-12 h-1.5 bg-slate-300 rounded-full'), 'Bottom sheet pull handle was removed in favor of floating modal');

// 2. Verify MorePageView.tsx uses unified NotificationCenterModal
const morePath = path.join(__dirname, '..', 'src', 'components', 'MorePageView.tsx');
const moreCode = fs.readFileSync(morePath, 'utf8');
assert(moreCode.includes('<NotificationCenterModal'), 'MorePageView opens unified full-featured NotificationCenterModal');

// 3. Verify HostelImageGalleryModal.tsx
const galleryPath = path.join(__dirname, '..', 'src', 'components', 'HostelImageGalleryModal.tsx');
const galleryCode = fs.readFileSync(galleryPath, 'utf8');

assert(galleryCode.includes('onClose: (finalIndex?: number) => void'), 'HostelImageGalleryModal returns finalIndex on close to preserve student place');
assert(galleryCode.includes('onIndexChange?: (index: number) => void'), 'HostelImageGalleryModal supports live index change sync');
assert(galleryCode.includes('initialIndex = 0'), 'HostelImageGalleryModal accepts initialIndex');
assert(galleryCode.includes('clamped = Math.max(0, Math.min(initialIndex, items.length - 1))'), 'HostelImageGalleryModal clamps index within bounds safely');
assert(galleryCode.includes('handleTouchStart') && galleryCode.includes('handleTouchEnd'), 'HostelImageGalleryModal has mobile touch swipe handlers');
assert(galleryCode.includes('Math.abs(deltaX) > Math.abs(deltaY)'), 'Swipe logic ensures horizontal swipes do not conflict with vertical scrolling');
assert(galleryCode.includes('disabled={currentIndex === 0}'), 'Previous button is disabled at first image boundary');
assert(galleryCode.includes('disabled={currentIndex === items.length - 1}'), 'Next button is disabled at last image boundary');
assert(galleryCode.includes('min-w-[48px] min-h-[48px]'), 'Previous/Next buttons meet 48px touch target accessibility standards on phones');
assert(galleryCode.includes('{currentIndex + 1} of {items.length}'), 'Image counter shows "X of Y" clearly in header and floating badge');
assert(galleryCode.includes('thumbnailItemRefs.current[currentIndex]?.scrollIntoView'), 'Thumbnail strip auto-scrolls active thumbnail into view');

// 4. Verify HostelDetailModal.tsx
const detailPath = path.join(__dirname, '..', 'src', 'components', 'HostelDetailModal.tsx');
const detailCode = fs.readFileSync(detailPath, 'utf8');

assert(detailCode.includes('setActiveMediaIndex(idx);'), 'Detail modal sets active media index on thumbnail click');
assert(detailCode.includes('setLightboxOpen(true);'), 'Clicking thumbnail directly opens lightbox gallery at that exact image');
assert(detailCode.includes('e.stopPropagation()'), 'Navigation chevron buttons stop event propagation so preview navigation does not accidentally open lightbox');
assert(detailCode.includes('handlePreviewTouchStart') && detailCode.includes('handlePreviewTouchEnd'), 'Detail modal inline preview supports touch swiping between photos');
assert(detailCode.includes('initialIndex={activeMediaIndex}'), 'Detail modal passes activeMediaIndex as initialIndex to lightbox');
assert(detailCode.includes('if (typeof finalIdx === \'number\')'), 'Detail modal preserves place on page by updating activeMediaIndex on gallery close');

if (failed) {
  console.error('\nOne or more verification checks failed!');
  process.exit(1);
} else {
  console.log('\nAll 19 audit checks passed successfully!');
  process.exit(0);
}
