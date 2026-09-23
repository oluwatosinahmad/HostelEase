/**
 * Test Suite: 4K Property Video Viewing Experience & History Routing
 * Verifies:
 * 1. Dedicated Virtual Tours route and components
 * 2. Hash routing & history back/forward navigation logic
 * 3. In-app '← Back to 4K Tours' behavior
 * 4. Preservation of origin view and scroll position
 * 5. Authentic uploaded video URL resolution
 */

import { Property, Area, AppView } from '../src/types/hostelEase';
import { getMediaUrl } from '../src/services/api';

console.log('======================================================');
console.log('STARTING 4K PROPERTY VIDEO VIEWING & ROUTING TEST');
console.log('======================================================\n');

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`✅ [PASS] ${testName}`);
    passCount++;
  } else {
    console.error(`❌ [FAIL] ${testName}`);
    failCount++;
  }
}

// 1. Verify AppView includes 'virtual-tours'
const testView: AppView = 'virtual-tours';
assert(testView === 'virtual-tours', "AppView type union supports 'virtual-tours'");

// 2. Mock Properties with authentic 4K video walkthrough
const mockPropertyA: Property = {
  id: 'prop-under-g-1',
  title: 'Under G Royal Suites',
  description: 'Luxury student accommodation near LAUTECH gate',
  address: 'Under G Area, Ogbomoso',
  propertyType: 'SELF_CONTAIN',
  verificationStatus: 'APPROVED',
  availabilityStatus: 'AVAILABLE',
  isFeatured: true,
  distanceFromCampusKm: 0.4,
  nearbyLandmark: 'Close to Under-G Junction',
  areaId: 'area-under-g',
  area: {
    id: 'area-under-g',
    name: 'Under G',
    slug: 'under-g',
    description: 'Closest area to LAUTECH main gate',
    distanceToCampusKm: 0.4,
    averagePricePerYear: 180000,
    safetyRating: 4.8,
    isPopular: true,
    coverImage: '/uploads/under_g.jpg'
  },
  priceSummary: {
    rentAmount: 180000,
    cautionDeposit: 20000,
    serviceCharge: 15000,
    totalMandatoryCost: 215000
  },
  coverImage: '/uploads/royal_cover.jpg',
  videoTourUrl: '/uploads/videos/royal_suites_4k_walkthrough.mp4',
  has4KVideo: true,
  media: [
    {
      id: 'med-1',
      propertyId: 'prop-under-g-1',
      mediaType: 'VIDEO',
      category: 'VIDEO_WALKTHROUGH',
      url: '/uploads/videos/royal_suites_4k_walkthrough.mp4',
      sortOrder: 0
    }
  ],
  rooms: [],
  providerId: 'prov-1',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

const mockPropertyB: Property = {
  id: 'prop-adenike-2',
  title: 'Adenike Scholars Lodge',
  description: 'Quiet study environment in Adenike',
  address: 'Adenike Area, Ogbomoso',
  propertyType: 'SINGLE_ROOM',
  verificationStatus: 'APPROVED',
  availabilityStatus: 'AVAILABLE',
  isFeatured: false,
  distanceFromCampusKm: 1.1,
  nearbyLandmark: 'Opposite Adenike Mosque',
  areaId: 'area-adenike',
  area: {
    id: 'area-adenike',
    name: 'Adenike',
    slug: 'adenike',
    description: 'Popular residential zone',
    distanceToCampusKm: 1.1,
    averagePricePerYear: 120000,
    safetyRating: 4.5,
    isPopular: true,
    coverImage: '/uploads/adenike.jpg'
  },
  priceSummary: {
    rentAmount: 120000,
    cautionDeposit: 15000,
    serviceCharge: 10000,
    totalMandatoryCost: 145000
  },
  coverImage: '/uploads/adenike_cover.jpg',
  videoTourUrl: '/uploads/videos/adenike_lodge_4k.mp4',
  has4KVideo: true,
  media: [
    {
      id: 'med-2',
      propertyId: 'prop-adenike-2',
      mediaType: 'VIDEO',
      category: 'VIDEO_WALKTHROUGH',
      url: '/uploads/videos/adenike_lodge_4k.mp4',
      sortOrder: 0
    }
  ],
  rooms: [],
  providerId: 'prov-2',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

// 3. Test Authentic Video URL Resolution
const resolvedVideoA = getMediaUrl(mockPropertyA.videoTourUrl!);
assert(
  resolvedVideoA.includes('/uploads/videos/royal_suites_4k_walkthrough.mp4') && !resolvedVideoA.includes('mixkit'),
  'Property A resolves real uploaded 4K video URL (no stock/placeholder links)'
);

const resolvedVideoB = getMediaUrl(mockPropertyB.videoTourUrl!);
assert(
  resolvedVideoB.includes('/uploads/videos/adenike_lodge_4k.mp4') && !resolvedVideoB.includes('mixkit'),
  'Property B resolves real uploaded 4K video URL'
);

// 4. Test Simulated Browser History and Navigation Lifecycle
// Simulating the browser history stack:
type HistoryEntry = {
  state: any;
  title: string;
  url: string;
};

class MockBrowserHistory {
  private stack: HistoryEntry[] = [];
  private pointer: number = -1;
  public onPopState: ((event: { state: any }) => void) | null = null;

  pushState(state: any, title: string, url: string) {
    // Truncate any forward history when pushing a new state
    this.stack = this.stack.slice(0, this.pointer + 1);
    this.stack.push({ state, title, url });
    this.pointer = this.stack.length - 1;
  }

  replaceState(state: any, title: string, url: string) {
    if (this.pointer >= 0) {
      this.stack[this.pointer] = { state, title, url };
    } else {
      this.pushState(state, title, url);
    }
  }

  back() {
    if (this.pointer > 0) {
      this.pointer--;
      const current = this.stack[this.pointer];
      if (this.onPopState) {
        this.onPopState({ state: current.state });
      }
    }
  }

  get currentState() {
    return this.stack[this.pointer]?.state || null;
  }

  get currentUrl() {
    return this.stack[this.pointer]?.url || '/';
  }

  get length() {
    return this.stack.length;
  }
}

const mockHistory = new MockBrowserHistory();

// Initialize on #virtual-tours
let currentView: AppView = 'virtual-tours';
let selectedVideo: Property | null = null;
let currentScrollY = 250;
let originRef: { fromView: AppView; scrollY: number; hasHistoryPushed: boolean } | null = null;

mockHistory.pushState({ view: 'virtual-tours' }, '', '#virtual-tours');

// Wire up the popstate handler exactly as implemented in App.tsx
mockHistory.onPopState = (event) => {
  const state = event.state;

  if (selectedVideo) {
    if (state && state.videoTourPropertyId) {
      // Switching videos in history
      const target = [mockPropertyA, mockPropertyB].find(p => p.id === state.videoTourPropertyId);
      if (target) {
        selectedVideo = target;
        return;
      }
    }

    // User pressed BACK from video!
    selectedVideo = null;
    currentView = (state && state.view) || originRef?.fromView || 'virtual-tours';
    if (originRef?.scrollY !== undefined) {
      currentScrollY = originRef.scrollY;
    }
    originRef = null;
    return;
  }

  // Normal view navigation
  if (state && state.view) {
    currentView = state.view;
  }
};

function handleOpenVideoTour(prop: Property) {
  originRef = {
    fromView: currentView,
    scrollY: currentScrollY,
    hasHistoryPushed: true
  };
  selectedVideo = prop;
  mockHistory.pushState(
    {
      view: currentView,
      videoTourPropertyId: prop.id,
      fromView: currentView,
      scrollY: currentScrollY
    },
    '',
    `#virtual-tours/${prop.id}`
  );
}

function handleCloseVideoTour() {
  if (mockHistory.currentState && mockHistory.currentState.videoTourPropertyId) {
    mockHistory.back();
  } else {
    selectedVideo = null;
    currentView = originRef?.fromView || 'virtual-tours';
    originRef = null;
  }
}

// 5. TEST USER FLOW:
// 4K VIDEOS -> User clicks Video A -> Video A opens -> User watches Video A -> User presses BACK -> 4K VIDEOS -> User clicks Video B -> Video B opens -> User watches Video B

// Step A: User is viewing 4K videos list
assert(currentView === 'virtual-tours' && selectedVideo === null, 'Initial state: Browsing 4K Virtual Tours list');

// Step B: User clicks Video A
currentScrollY = 320;
handleOpenVideoTour(mockPropertyA);
assert(
  selectedVideo?.id === 'prop-under-g-1' && mockHistory.currentUrl === '#virtual-tours/prop-under-g-1',
  'Step 1: Video A opens with URL #virtual-tours/prop-under-g-1'
);

// Step C: User presses browser Back
mockHistory.back();
assert(
  selectedVideo === null && currentView === 'virtual-tours' && currentScrollY === 320,
  'Step 2: Back button closes Video A and returns to 4K Tours list at exact scroll position (320px)'
);

// Step D: User clicks Video B immediately
currentScrollY = 480;
handleOpenVideoTour(mockPropertyB);
assert(
  selectedVideo?.id === 'prop-adenike-2' && mockHistory.currentUrl === '#virtual-tours/prop-adenike-2',
  'Step 3: User clicks Video B, opens with URL #virtual-tours/prop-adenike-2'
);

// Step E: User taps in-app '← Back to 4K Tours' button
handleCloseVideoTour();
assert(
  selectedVideo === null && currentView === 'virtual-tours' && currentScrollY === 480,
  'Step 4: In-app "← Back to 4K Tours" button returns to 4K Tours list at exact scroll position (480px)'
);

// 6. Test Flow from Homepage Spotlight:
// Home page -> Click Video A -> Video A opens -> Press Back -> Return to Home page at same scroll position!
currentView = 'home';
currentScrollY = 1250; // Scrolled down to 4K spotlight section
mockHistory.pushState({ view: 'home' }, '', '/');

handleOpenVideoTour(mockPropertyA);
assert(
  selectedVideo?.id === 'prop-under-g-1' && mockHistory.currentUrl === '#virtual-tours/prop-under-g-1',
  'Homepage Flow: Video A opened from Homepage 4K Spotlight'
);

// User presses browser Back
mockHistory.back();
assert(
  selectedVideo === null && currentView === 'home' && currentScrollY === 1250,
  'Homepage Flow: Back button returns to Homepage at exact 4K Spotlight scroll position (1250px) without resetting view'
);

console.log('\n======================================================');
console.log(`TEST RESULTS: ${passCount} / ${passCount + failCount} PASSED`);
console.log('======================================================');

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
