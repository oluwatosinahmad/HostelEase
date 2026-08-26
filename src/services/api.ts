import { 
  Property, 
  Area, 
  SearchFilterState, 
  InspectionRequest, 
  ListingReport, 
  NotificationItem, 
  VerificationDocument, 
  AuditLogItem, 
  PriceHistoryItem,
  PublicProviderProfile,
  SmartSearchResponse,
  MapDataResponse,
  HostelComparisonResult,
  RecommendedProperty,
  SearchHistoryItem,
  RecentlyViewedItem,
  ConversationItem,
  ConversationDetail,
  MessageItem,
  ProviderCalendarData,
  PropertyAvailabilityResponse,
  BookingStatus,
  BookingItem,
  BookingDetail,
  BookingHistoryItem,
  PaymentStatus,
  PaymentItem,
  PaymentReceipt,
  ProviderFinancialsData,
  AdminFinancialsData,
  StudentPreferences,
  StudentDashboardData,
  StudentNotificationPreferences,
  StudentSearchHistoryItem,
  RecentlyViewedHostelItem,
    AIChatResponse, AIConversation, AIMessage, AIAdminStats,
    AdminDashboardData,
    AdminUserItem,
    AdminProviderItem,
    AdminHostelItem,
    VerificationChecklist,
    AdminSupportTicket,
    AdminSupportMessage,
    SystemHealthService,
    PlatformAnnouncementItem,
    AdminAuditLogItem,
    BookingReviewData,
    CancellationPreviewData,
    AlternativeHostelRecommendation,
    MoveInChecklistData,
    DisputeItem,
    DisputeMessageItem
  } from '../types/hostelEase';
import { DEFAULT_AREAS, DEFAULT_PROPERTIES, filterFallbackProperties } from './offlineFallback';

const API_BASE = '/api';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('hostel_ease_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorMsg = 'API request failed';
    try {
      const data = await res.json();
      errorMsg = data.error || data.message || errorMsg;
    } catch {
      errorMsg = res.statusText || errorMsg;
    }
    throw new Error(errorMsg);
  }
  return res.json();
}

export const api = {
  // Authentication & Session
  auth: {
    async register(data: any): Promise<{ message: string; token: string; user: any }> {
      try {
        const res = await fetch(`${API_BASE}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        if (res.ok) return await res.json();
      } catch (err) {
        console.warn('Backend auth unreachable, using client session mode.');
      }
      const mockUser = {
        id: `usr-${Date.now()}`,
        fullName: data.fullName || 'Student User',
        email: data.email,
        role: data.role || 'STUDENT',
        phone: data.phone || '08012345678',
        isActive: 1
      };
      localStorage.setItem('hostel_ease_token', 'mock_client_token');
      localStorage.setItem('hostel_ease_user', JSON.stringify(mockUser));
      return { message: 'Registration successful', token: 'mock_client_token', user: mockUser };
    },

    async login(emailOrData: string | { email: string; password: string }, maybePassword?: string): Promise<{ message: string; token: string; user: any }> {
      const payload = typeof emailOrData === 'string'
        ? { email: emailOrData, password: maybePassword }
        : emailOrData;
      try {
        const res = await fetch(`${API_BASE}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) return await res.json();
      } catch (err) {
        console.warn('Backend auth unreachable, using client session mode.');
      }
      const email = payload.email.toLowerCase();
      let role: 'STUDENT' | 'PROVIDER' | 'ADMIN' = 'STUDENT';
      let fullName = 'Tunde Bakare (LAUTECH 300L)';
      if (email.includes('admin')) {
        role = 'ADMIN';
        fullName = 'Hostel Ease Admin';
      } else if (email.includes('landlord') || email.includes('provider') || email.includes('segun')) {
        role = 'PROVIDER';
        fullName = 'Engr. Segun Adeyemi';
      }
      const mockUser = {
        id: `usr-${role.toLowerCase()}`,
        fullName,
        email: payload.email,
        role,
        phone: '08034567890',
        isActive: 1
      };
      localStorage.setItem('hostel_ease_token', 'mock_client_token');
      localStorage.setItem('hostel_ease_user', JSON.stringify(mockUser));
      return { message: 'Login successful', token: 'mock_client_token', user: mockUser };
    },

    async getMe(): Promise<{ user: any }> {
      try {
        const res = await fetch(`${API_BASE}/auth/me`, {
          headers: { ...getAuthHeader() }
        });
        if (res.ok) return await res.json();
      } catch (err) {
        // Silent fallback
      }
      const stored = localStorage.getItem('hostel_ease_user');
      if (stored) {
        try { return { user: JSON.parse(stored) }; } catch {}
      }
      return { user: null };
    },

    async updateProfile(data: any): Promise<{ message: string; user: any }> {
      try {
        const res = await fetch(`${API_BASE}/auth/profile`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
          body: JSON.stringify(data)
        });
        if (res.ok) return await res.json();
      } catch (err) {
        // Fallback
      }
      return { message: 'Profile updated', user: data };
    }
  },

  // Universities & Areas
  areas: {
    async getAll(): Promise<{ areas: Area[] }> {
      try {
        const res = await fetch(`${API_BASE}/areas`);
        if (res.ok) {
          const data = await res.json();
          if (data.areas && data.areas.length > 0) return data;
        }
      } catch (err) {
        console.warn('Backend /api/areas unreachable, using verified LAUTECH area catalog.');
      }
      return { areas: DEFAULT_AREAS };
    }
  },

  // Properties / Accommodation Discovery
  properties: {
    async search(filters: Partial<SearchFilterState>): Promise<{
      properties: Property[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }> {
      try {
        const params = new URLSearchParams();
        if (filters.search) params.append('search', filters.search);
        if (filters.areaId && filters.areaId !== 'all') params.append('areaId', filters.areaId);
        if (filters.minPrice) params.append('minPrice', filters.minPrice.toString());
        if (filters.maxPrice) params.append('maxPrice', filters.maxPrice.toString());
        if (filters.maxDistance) params.append('maxDistance', filters.maxDistance.toString());
        if (filters.roomType && filters.roomType !== 'all') params.append('roomType', filters.roomType);
        if (filters.genderPreference && filters.genderPreference !== 'ANY') params.append('genderPreference', filters.genderPreference);
        if (filters.availability && filters.availability !== 'all') params.append('availability', filters.availability);
        if (filters.verifiedOnly) params.append('verifiedOnly', 'true');
        if (filters.facilities && filters.facilities.length > 0) params.append('amenities', filters.facilities.join(','));
        if (filters.sortBy) params.append('sortBy', filters.sortBy);
        if (filters.page) params.append('page', filters.page.toString());

        const res = await fetch(`${API_BASE}/properties?${params.toString()}`, {
          headers: { ...getAuthHeader() }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.properties) return data;
        }
      } catch (err) {
        console.warn('Backend /api/properties unreachable, using verified LAUTECH hostel directory.');
      }
      return filterFallbackProperties(filters);
    },

    async getById(id: string): Promise<{ property: Property }> {
      try {
        const res = await fetch(`${API_BASE}/properties/${id}`, {
          headers: { ...getAuthHeader() }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.property) return data;
        }
      } catch (err) {
        console.warn(`Backend /api/properties/${id} unreachable, using fallback property.`);
      }
      const prop = DEFAULT_PROPERTIES.find(p => p.id === id) || DEFAULT_PROPERTIES[0];
      return { property: prop };
    },

    async getFeatured(): Promise<{ properties: Property[] }> {
      try {
        const res = await fetch(`${API_BASE}/properties/featured`);
        if (res.ok) {
          const data = await res.json();
          if (data.properties && data.properties.length > 0) return data;
        }
      } catch (err) {
        console.warn('Backend /api/properties/featured unreachable, using featured fallback.');
      }
      return { properties: DEFAULT_PROPERTIES.slice(0, 3) };
    },

    async getRecent(): Promise<{ properties: Property[] }> {
      try {
        const res = await fetch(`${API_BASE}/properties/recent`);
        if (res.ok) {
          const data = await res.json();
          if (data.properties && data.properties.length > 0) return data;
        }
      } catch (err) {
        console.warn('Backend /api/properties/recent unreachable, using recent fallback.');
      }
      return { properties: DEFAULT_PROPERTIES.slice(0, 6) };
    },

    async saveProperty(propertyId: string, notes?: string): Promise<{ isSaved: boolean }> {
      const res = await fetch(`${API_BASE}/properties/${propertyId}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ notes })
      });
      return handleResponse(res);
    },

    async unsaveProperty(propertyId: string): Promise<{ isSaved: boolean }> {
      const res = await fetch(`${API_BASE}/properties/${propertyId}/save`, {
        method: 'DELETE',
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res);
    },

    async getSaved(): Promise<{ savedProperties: Property[] }> {
      const res = await fetch(`${API_BASE}/saved-properties`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res);
    }
  },

  // Inspections (Phase 4 Workflow)
  inspections: {
    async request(propertyId: string, data: {
      inspectionType: 'PHYSICAL' | 'VIRTUAL';
      preferredDate: string;
      preferredTime: string;
      roomId?: string;
      studentPhone?: string;
      notes?: string;
    }): Promise<{ message: string; inspectionId: string }> {
      const res = await fetch(`${API_BASE}/inspections/properties/${propertyId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(data)
      });
      return handleResponse(res);
    },

    async getAll(filters: { status?: string; type?: string } = {}): Promise<{ inspections: InspectionRequest[] }> {
      const params = new URLSearchParams();
      if (filters.status && filters.status !== 'ALL') params.append('status', filters.status);
      if (filters.type && filters.type !== 'ALL') params.append('type', filters.type);

      const res = await fetch(`${API_BASE}/inspections?${params.toString()}`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res);
    },

    async accept(id: string, message?: string): Promise<{ message: string; virtualMeetingUrl?: string }> {
      const res = await fetch(`${API_BASE}/inspections/${id}/accept`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ message })
      });
      return handleResponse(res);
    },

    async decline(id: string, reason?: string): Promise<{ message: string }> {
      const res = await fetch(`${API_BASE}/inspections/${id}/decline`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ reason })
      });
      return handleResponse(res);
    },

    async reschedule(id: string, data: { alternativeDate: string; alternativeTime: string; message?: string }): Promise<{ message: string }> {
      const res = await fetch(`${API_BASE}/inspections/${id}/reschedule`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(data)
      });
      return handleResponse(res);
    },

    async confirmReschedule(id: string): Promise<{ message: string }> {
      const res = await fetch(`${API_BASE}/inspections/${id}/confirm-reschedule`, {
        method: 'PATCH',
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res);
    },

    async updateStatus(id: string, status: string, providerResponse?: string): Promise<{ message: string }> {
      if (status === 'CONFIRMED') {
        return this.accept(id, providerResponse);
      } else if (status === 'CANCELLED') {
        return this.decline(id, providerResponse);
      } else {
        const res = await fetch(`${API_BASE}/inspections/${id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
          body: JSON.stringify({ status, providerResponse })
        });
        return handleResponse(res);
      }
    },

    async cancel(id: string, reason?: string): Promise<{ message: string }> {
      const res = await fetch(`${API_BASE}/inspections/${id}/cancel`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ reason })
      });
      return handleResponse(res);
    },

    async complete(id: string): Promise<{ message: string }> {
      const res = await fetch(`${API_BASE}/inspections/${id}/complete`, {
        method: 'PATCH',
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res);
    },

    async markNoShow(id: string): Promise<{ message: string }> {
      const res = await fetch(`${API_BASE}/inspections/${id}/no-show`, {
        method: 'PATCH',
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res);
    },

    async savePrivateNotes(id: string, notes: string): Promise<{ message: string }> {
      const res = await fetch(`${API_BASE}/inspections/${id}/private-notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ notes })
      });
      return handleResponse(res);
    },

    async submitFeedback(id: string, rating: number, comment?: string): Promise<{ message: string }> {
      const res = await fetch(`${API_BASE}/inspections/${id}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ rating, comment })
      });
      return handleResponse(res);
    },

    async getVirtualLink(id: string): Promise<{ virtualMeetingUrl: string; inspectionType: string; preferredDate: string; preferredTime: string }> {
      const res = await fetch(`${API_BASE}/inspections/${id}/virtual-link`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res);
    },

    async getCalendar(): Promise<ProviderCalendarData> {
      const res = await fetch(`${API_BASE}/inspections/calendar`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res);
    }
  },

  // Accommodation Messaging (Phase 4)
  messages: {
    async startConversation(propertyId: string, initialMessage?: string, studentId?: string): Promise<{ conversationId: string; conversation: any }> {
      const res = await fetch(`${API_BASE}/messages/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ propertyId, initialMessage, studentId })
      });
      return handleResponse(res);
    },

    async getConversations(): Promise<{ conversations: ConversationItem[] }> {
      const res = await fetch(`${API_BASE}/messages/conversations`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res);
    },

    async getConversation(id: string): Promise<ConversationDetail> {
      const res = await fetch(`${API_BASE}/messages/conversations/${id}`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res);
    },

    async sendMessage(conversationId: string, content: string, messageType?: string, metadata?: any): Promise<{ message: MessageItem }> {
      const res = await fetch(`${API_BASE}/messages/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ content, messageType, metadata })
      });
      return handleResponse(res);
    },

    async markAsRead(conversationId: string): Promise<{ message: string }> {
      const res = await fetch(`${API_BASE}/messages/conversations/${conversationId}/read`, {
        method: 'PATCH',
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res);
    },

    async getUnreadCount(): Promise<{ unreadCount: number }> {
      const res = await fetch(`${API_BASE}/messages/unread-count`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res);
    },

    async reportUser(data: { reportedUserId: string; conversationId?: string; reason: string; description: string }): Promise<{ message: string }> {
      const res = await fetch(`${API_BASE}/messages/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(data)
      });
      return handleResponse(res);
    }
  },

  // Listing Reports
  reports: {
    async submit(propertyId: string, data: { reason: string; description: string }): Promise<{ message: string; reportId: string }> {
      const res = await fetch(`${API_BASE}/reports/properties/${propertyId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(data)
      });
      return handleResponse(res);
    },

    async getAll(): Promise<{ reports: ListingReport[] }> {
      const res = await fetch(`${API_BASE}/reports`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res);
    },

    async update(id: string, data: { status: string; adminActionNotes?: string; suspendListing?: boolean }): Promise<{ message: string }> {
      const res = await fetch(`${API_BASE}/reports/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(data)
      });
      return handleResponse(res);
    }
  },

  // Provider API
  provider: {
    async getDashboardStats(): Promise<{ stats: any }> {
      const res = await fetch(`${API_BASE}/provider/dashboard/stats`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res);
    },

    async getDashboard(propertyId?: string): Promise<any> {
      const url = propertyId ? `${API_BASE}/provider/dashboard?propertyId=${encodeURIComponent(propertyId)}` : `${API_BASE}/provider/dashboard`;
      const res = await fetch(url, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res);
    },

    async getOnboarding(): Promise<{ onboarding: any }> {
      const res = await fetch(`${API_BASE}/provider/onboarding`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res);
    },

    async updateOnboarding(data: any): Promise<{ message: string; completed: boolean }> {
      const res = await fetch(`${API_BASE}/provider/onboarding`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(data)
      });
      return handleResponse(res);
    },

    async getMyListings(): Promise<{ properties: Property[] }> {
      const res = await fetch(`${API_BASE}/provider/properties`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res);
    },

    async checkDuplicate(title: string, areaId: string, address?: string): Promise<{ isDuplicate: boolean; message?: string }> {
      const res = await fetch(`${API_BASE}/provider/properties/check-duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ title, areaId, address })
      });
      return handleResponse(res);
    },

    async createListing(data: any): Promise<{ message: string; propertyId: string; slug: string }> {
      const res = await fetch(`${API_BASE}/provider/properties`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(data)
      });
      return handleResponse(res);
    },

    async updateListing(id: string, data: any): Promise<{ message: string }> {
      const res = await fetch(`${API_BASE}/provider/properties/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(data)
      });
      return handleResponse(res);
    },

    async updateAvailability(id: string, availabilityStatus: string): Promise<{ message: string }> {
      const res = await fetch(`${API_BASE}/provider/properties/${id}/availability`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ availabilityStatus })
      });
      return handleResponse(res);
    },

    async getPriceHistory(id: string): Promise<{ priceHistory: PriceHistoryItem[] }> {
      const res = await fetch(`${API_BASE}/provider/properties/${id}/price-history`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res);
    },

    async getRooms(id: string): Promise<{ rooms: any[] }> {
      const res = await fetch(`${API_BASE}/provider/properties/${id}/rooms`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res);
    },

    async addRoom(id: string, roomData: any): Promise<{ message: string; roomId: string }> {
      const res = await fetch(`${API_BASE}/provider/properties/${id}/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(roomData)
      });
      return handleResponse(res);
    },

    async updateRoom(roomId: string, roomData: any): Promise<{ message: string }> {
      const res = await fetch(`${API_BASE}/provider/rooms/${roomId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(roomData)
      });
      return handleResponse(res);
    },

    async deleteRoom(roomId: string): Promise<{ message: string }> {
      const res = await fetch(`${API_BASE}/provider/rooms/${roomId}`, {
        method: 'DELETE',
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res);
    },

    async updateBedspace(roomId: string, bedId: string, status: string, isOccupied?: boolean): Promise<{ message: string }> {
      const res = await fetch(`${API_BASE}/provider/rooms/${roomId}/bedspaces/${bedId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ status, isOccupied })
      });
      return handleResponse(res);
    },

    async getCalendar(propertyId?: string): Promise<{ events: any[] }> {
      const url = propertyId ? `${API_BASE}/provider/calendar?propertyId=${encodeURIComponent(propertyId)}` : `${API_BASE}/provider/calendar`;
      const res = await fetch(url, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res);
    },

    async getInspectionSchedules(): Promise<{ schedules: any[] }> {
      const res = await fetch(`${API_BASE}/provider/inspections/availability`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res);
    },

    async updateInspectionSchedules(schedules: any[]): Promise<{ message: string }> {
      const res = await fetch(`${API_BASE}/provider/inspections/availability`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ schedules })
      });
      return handleResponse(res);
    },

    async getQuickReplies(): Promise<{ quickReplies: any[] }> {
      const res = await fetch(`${API_BASE}/provider/quick-replies`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res);
    },

    async createQuickReply(data: { title: string; messageText: string; category?: string }): Promise<{ message: string; id: string }> {
      const res = await fetch(`${API_BASE}/provider/quick-replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(data)
      });
      return handleResponse(res);
    },

    async deleteQuickReply(id: string): Promise<{ message: string }> {
      const res = await fetch(`${API_BASE}/provider/quick-replies/${id}`, {
        method: 'DELETE',
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res);
    },

    async getPerformance(propertyId?: string, period?: string): Promise<any> {
      let url = `${API_BASE}/provider/performance?`;
      if (propertyId) url += `propertyId=${encodeURIComponent(propertyId)}&`;
      if (period) url += `period=${encodeURIComponent(period)}`;
      const res = await fetch(url, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res);
    },

    async reportReview(reviewId: string, data: { reason: string; description: string }): Promise<{ message: string; reportId: string }> {
      const res = await fetch(`${API_BASE}/provider/reviews/${reviewId}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(data)
      });
      return handleResponse(res);
    },

    async askAI(prompt: string, propertyId?: string): Promise<{ response: string; structuredData?: any }> {
      const res = await fetch(`${API_BASE}/provider/ai/assist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ prompt, propertyId })
      });
      return handleResponse(res);
    },

    async getTeam(): Promise<{ team: any[] }> {
      const res = await fetch(`${API_BASE}/provider/team`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res);
    },

    async addTeamMember(data: { email: string; role: string; propertyId?: string }): Promise<{ message: string; id: string }> {
      const res = await fetch(`${API_BASE}/provider/team`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(data)
      });
      return handleResponse(res);
    },

    async removeTeamMember(id: string): Promise<{ message: string }> {
      const res = await fetch(`${API_BASE}/provider/team/${id}`, {
        method: 'DELETE',
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res);
    },

    async getAuditLogs(): Promise<{ logs: any[] }> {
      const res = await fetch(`${API_BASE}/provider/audit-logs`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res);
    }
  },

  // Private Verification Documents API
  verification: {
    async uploadDocument(formData: FormData): Promise<{ message: string; document: VerificationDocument }> {
      const token = localStorage.getItem('hostel_ease_token');
      const res = await fetch(`${API_BASE}/verification/documents`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData
      });
      return handleResponse(res);
    },

    async getMyDocuments(): Promise<{ documents: VerificationDocument[] }> {
      const res = await fetch(`${API_BASE}/verification/documents`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res);
    },

    async getAdminDocuments(providerId: string): Promise<{ documents: VerificationDocument[] }> {
      const res = await fetch(`${API_BASE}/verification/documents/admin/${providerId}`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res);
    },

    async deleteDocument(id: string): Promise<{ message: string }> {
      const res = await fetch(`${API_BASE}/verification/documents/${id}`, {
        method: 'DELETE',
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res);
    }
  },

  // In-App Notifications API
  notifications: {
    async getAll(): Promise<{ notifications: NotificationItem[]; unreadCount: number }> {
      const res = await fetch(`${API_BASE}/notifications`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res);
    },

    async markRead(id: string): Promise<{ message: string }> {
      const res = await fetch(`${API_BASE}/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res);
    },

    async markAllRead(): Promise<{ message: string }> {
      const res = await fetch(`${API_BASE}/notifications/read-all`, {
        method: 'PATCH',
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res);
    }
  },

  // Admin Control Center & Trust System API (Phase 10)
  admin: {
    async getDashboard(): Promise<AdminDashboardData> {
      const res = await fetch(`${API_BASE}/admin/dashboard`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res);
    },

    async getStats(): Promise<{ stats: any }> {
      const res = await fetch(`${API_BASE}/admin/stats`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res);
    },

    async getUsers(search?: string, role?: string, status?: string): Promise<{ users: AdminUserItem[] }> {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (role && role !== 'all') params.append('role', role);
      if (status && status !== 'all') params.append('status', status);
      const res = await fetch(`${API_BASE}/admin/users?${params.toString()}`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res);
    },

    async getUser(id: string): Promise<{ user: any }> {
      const res = await fetch(`${API_BASE}/admin/users/${id}`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res);
    },

    async updateUserStatus(id: string, status: string, reason: string): Promise<{ message: string; accountStatus: string }> {
      const res = await fetch(`${API_BASE}/admin/users/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ status, reason })
      });
      return handleResponse(res);
    },

    async getProviders(status?: string, search?: string): Promise<{ providers: AdminProviderItem[] }> {
      const params = new URLSearchParams();
      if (status && status !== 'all') params.append('status', status);
      if (search) params.append('search', search);
      const res = await fetch(`${API_BASE}/admin/providers?${params.toString()}`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res);
    },

    async getVerificationProviders(status?: string): Promise<{ providers: any[] }> {
      const url = status && status !== 'all' ? `${API_BASE}/admin/verification/providers?status=${status}` : `${API_BASE}/admin/verification/providers`;
      const res = await fetch(url, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res);
    },

    async moderateProvider(id: string, status: string, adminFeedback?: string): Promise<{ message: string }> {
      const res = await fetch(`${API_BASE}/admin/verification/providers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ status, adminFeedback })
      });
      return handleResponse(res);
    },

    async getHostels(search?: string, status?: string, areaId?: string): Promise<{ hostels: AdminHostelItem[] }> {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (status && status !== 'all') params.append('status', status);
      if (areaId && areaId !== 'all') params.append('areaId', areaId);
      const res = await fetch(`${API_BASE}/admin/hostels?${params.toString()}`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res);
    },

    async reviewHostelVerification(id: string, data: {
      decision: 'APPROVED' | 'REJECTED' | 'MORE_INFO_REQUIRED' | 'SUSPENDED';
      checklist: Partial<VerificationChecklist>;
      notes?: string;
      validMonths?: number;
    }): Promise<{ message: string; reviewId: string; verificationStatus: string }> {
      const res = await fetch(`${API_BASE}/admin/verification/properties/${id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(data)
      });
      return handleResponse(res);
    },

    async getReports(status?: string, category?: string): Promise<{ reports: any[] }> {
      const params = new URLSearchParams();
      if (status && status !== 'all') params.append('status', status);
      if (category && category !== 'all') params.append('category', category);
      const res = await fetch(`${API_BASE}/admin/reports?${params.toString()}`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res);
    },

    async updateReport(id: string, data: { status: string; adminNotes?: string; suspendListing?: boolean }): Promise<{ message: string }> {
      const res = await fetch(`${API_BASE}/admin/reports/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(data)
      });
      return handleResponse(res);
    },

    async getReviews(status?: string): Promise<{ reviews: any[] }> {
      const url = status && status !== 'all' ? `${API_BASE}/admin/reviews?status=${status}` : `${API_BASE}/admin/reviews`;
      const res = await fetch(url, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res);
    },

    async moderateReview(id: string, data: { status: string; reason?: string }): Promise<{ message: string }> {
      const res = await fetch(`${API_BASE}/admin/reviews/${id}/moderate`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(data)
      });
      return handleResponse(res);
    },

    async getBookings(status?: string, search?: string): Promise<{ bookings: any[] }> {
      const params = new URLSearchParams();
      if (status && status !== 'all') params.append('status', status);
      if (search) params.append('search', search);
      const res = await fetch(`${API_BASE}/admin/bookings?${params.toString()}`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res);
    },

    async getReconciliation(): Promise<{ summary: any; unverifiedTransactions: any[]; mismatchList: any[] }> {
      const res = await fetch(`${API_BASE}/admin/payments/reconciliation`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res);
    },

    async getSupportTickets(status?: string, category?: string, priority?: string): Promise<{ tickets: AdminSupportTicket[] }> {
      const params = new URLSearchParams();
      if (status && status !== 'all') params.append('status', status);
      if (category && category !== 'all') params.append('category', category);
      if (priority && priority !== 'all') params.append('priority', priority);
      const res = await fetch(`${API_BASE}/admin/support/tickets?${params.toString()}`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res);
    },

    async getSupportTicket(id: string): Promise<{ ticket: any; messages: AdminSupportMessage[] }> {
      const res = await fetch(`${API_BASE}/admin/support/tickets/${id}`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res);
    },

    async createSupportTicket(data: { category: string; subject: string; message: string; priority?: string }): Promise<{ message: string; ticketId: string; ticketCode: string }> {
      const res = await fetch(`${API_BASE}/admin/support/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(data)
      });
      return handleResponse(res);
    },

    async replySupportTicket(id: string, data: { message: string; isInternalNote?: boolean; statusToSet?: string }): Promise<{ message: string; messageId: string }> {
      const res = await fetch(`${API_BASE}/admin/support/tickets/${id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(data)
      });
      return handleResponse(res);
    },

    async getSystemHealth(): Promise<{ overallStatus: string; services: SystemHealthService[] }> {
      const res = await fetch(`${API_BASE}/admin/system-health`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res);
    },

    async getAnnouncements(): Promise<{ announcements: PlatformAnnouncementItem[] }> {
      const res = await fetch(`${API_BASE}/admin/announcements`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res);
    },

    async createAnnouncement(data: { title: string; content: string; targetAudience?: string; priority?: string }): Promise<{ message: string; announcementId: string }> {
      const res = await fetch(`${API_BASE}/admin/announcements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(data)
      });
      return handleResponse(res);
    },

    async getAuditLogs(search?: string, action?: string, entityType?: string): Promise<{ logs: AdminAuditLogItem[] }> {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (action && action !== 'all') params.append('action', action);
      if (entityType && entityType !== 'all') params.append('entityType', entityType);
      const res = await fetch(`${API_BASE}/admin/audit-logs?${params.toString()}`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res);
    },

    async search(q: string): Promise<{ results: { users: any[]; hostels: any[]; bookings: any[]; reports: any[]; tickets: any[] } }> {
      const res = await fetch(`${API_BASE}/admin/search?q=${encodeURIComponent(q)}`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res);
    }
  },


  // Public Landlord Profile API
  publicProvider: {
    async getProfile(id: string): Promise<{ provider: PublicProviderProfile }> {
      const res = await fetch(`${API_BASE}/public/providers/${id}`);
      return handleResponse(res);
    }
  },

  // File Upload API
  upload: {
    async single(file: File): Promise<{
      message: string;
      file: { url: string; filename: string; originalName: string; mimeType: string; mediaType: 'IMAGE' | 'VIDEO'; size: number };
    }> {
      const formData = new FormData();
      formData.append('file', file);

      const token = localStorage.getItem('hostel_ease_token');
      const res = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData
      });
      return handleResponse(res);
    },

    async multiple(files: File[]): Promise<{
      message: string;
      files: Array<{ url: string; filename: string; originalName: string; mimeType: string; mediaType: 'IMAGE' | 'VIDEO'; size: number }>;
    }> {
      const formData = new FormData();
      files.forEach(f => formData.append('files', f));

      const token = localStorage.getItem('hostel_ease_token');
      const res = await fetch(`${API_BASE}/upload/multiple`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData
      });
      return handleResponse(res);
    }
  },

  // Phase 3 Smart Discovery & Maps API
  discovery: {
    async smartSearch(query: string): Promise<SmartSearchResponse> {
      const res = await fetch(`${API_BASE}/discovery/smart-search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ query })
      });
      return handleResponse(res);
    },

    async getMapMarkers(filters: any = {}): Promise<MapDataResponse> {
      const params = new URLSearchParams();
      if (filters.areaId && filters.areaId !== 'all') params.append('areaId', filters.areaId);
      if (filters.maxPrice) params.append('maxPrice', filters.maxPrice.toString());
      if (filters.maxDistance) params.append('maxDistance', filters.maxDistance.toString());
      if (filters.roomType && filters.roomType !== 'all') params.append('roomType', filters.roomType);
      if (filters.verifiedOnly) params.append('verifiedOnly', 'true');
      if (filters.availability && filters.availability !== 'all') params.append('availability', filters.availability);

      const res = await fetch(`${API_BASE}/discovery/map-markers?${params.toString()}`);
      return handleResponse(res);
    },

    async compareHostels(propertyIds: string[]): Promise<HostelComparisonResult> {
      const res = await fetch(`${API_BASE}/discovery/compare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyIds })
      });
      return handleResponse(res);
    },

    async getRecommendations(preferences: any): Promise<{
      preferences: any;
      recommendations: RecommendedProperty[];
    }> {
      const res = await fetch(`${API_BASE}/discovery/recommendations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences)
      });
      return handleResponse(res);
    },

    async getSearchHistory(): Promise<{ history: SearchHistoryItem[] }> {
      const res = await fetch(`${API_BASE}/discovery/search-history`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res);
    },

    async clearSearchHistory(): Promise<{ message: string }> {
      const res = await fetch(`${API_BASE}/discovery/search-history`, {
        method: 'DELETE',
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res);
    },

    async getRecentlyViewed(): Promise<{ recentViews: RecentlyViewedItem[] }> {
      const res = await fetch(`${API_BASE}/discovery/recently-viewed`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res);
    },

    async trackRecentlyViewed(propertyId: string): Promise<{ message: string }> {
      const res = await fetch(`${API_BASE}/discovery/recently-viewed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ propertyId })
      });
      return handleResponse(res);
    }
  },

  // ----------------------------------------------------
  // Phase 5: Bookings & Reservations
  // ----------------------------------------------------
  bookings: {
    async getAvailability(propertyId: string): Promise<PropertyAvailabilityResponse> {
      const res = await fetch(`${API_BASE}/bookings/availability/properties/${propertyId}`);
      return handleResponse(res);
    },

    async reserve(data: {
      propertyId: string;
      roomId: string;
      bedspaceId?: string;
      moveInDate: string;
      academicSession?: string;
      durationMonths?: number;
      specialRequests?: string;
    }): Promise<{
      message: string;
      bookingId: string;
      bookingReference: string;
      status: BookingStatus;
      expiresAt: string;
      totalCost: number;
      breakdown: any;
    }> {
      const res = await fetch(`${API_BASE}/bookings/reserve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(data)
      });
      return handleResponse(res);
    },

    async getAll(status?: string): Promise<{ bookings: BookingItem[] }> {
      const query = status && status !== 'ALL' ? `?status=${status}` : '';
      const res = await fetch(`${API_BASE}/bookings${query}`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res);
    },

    async getById(id: string): Promise<{ booking: BookingDetail; history: BookingHistoryItem[] }> {
      const res = await fetch(`${API_BASE}/bookings/${id}`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res);
    },

    async confirm(id: string): Promise<{ message: string; status: BookingStatus }> {
      const res = await fetch(`${API_BASE}/bookings/${id}/confirm`, {
        method: 'PATCH',
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res);
    },

    async decline(id: string, reason?: string): Promise<{ message: string; status: BookingStatus }> {
      const res = await fetch(`${API_BASE}/bookings/${id}/decline`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ reason })
      });
      return handleResponse(res);
    },

    async cancel(id: string, reason?: string): Promise<{ message: string; status: BookingStatus }> {
      const res = await fetch(`${API_BASE}/bookings/${id}/cancel`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ reason })
      });
      return handleResponse(res);
    },

    async getReview(id: string): Promise<BookingReviewData> {
      const res = await fetch(`${API_BASE}/bookings/review/${id}`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res);
    },

    async getCancellationPreview(id: string): Promise<CancellationPreviewData> {
      const res = await fetch(`${API_BASE}/bookings/${id}/cancellation-preview`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res);
    },

    async getAlternatives(id: string): Promise<{ alternatives: AlternativeHostelRecommendation[]; originalBookingRef: string }> {
      const res = await fetch(`${API_BASE}/bookings/${id}/alternatives`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res);
    },

    async getMoveInChecklist(id: string): Promise<MoveInChecklistData> {
      const res = await fetch(`${API_BASE}/bookings/${id}/move-in-checklist`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res);
    },

    async updateMoveInChecklist(id: string, checklist: Record<string, boolean>): Promise<{ message: string; isCompleted: boolean }> {
      const res = await fetch(`${API_BASE}/bookings/${id}/move-in-checklist`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ checklist })
      });
      return handleResponse(res);
    }
  },

  // ----------------------------------------------------
  // Phase 11: Formal Dispute System
  // ----------------------------------------------------
  disputes: {
    async create(data: {
      bookingId: string;
      category: string;
      subject: string;
      description: string;
      evidence?: string[];
    }): Promise<{ message: string; disputeId: string; disputeCode: string }> {
      const res = await fetch(`${API_BASE}/disputes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(data)
      });
      return handleResponse(res);
    },

    async getMy(): Promise<{ disputes: DisputeItem[] }> {
      const res = await fetch(`${API_BASE}/disputes/my`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res);
    },

    async getById(id: string): Promise<{ dispute: DisputeItem; messages: DisputeMessageItem[] }> {
      const res = await fetch(`${API_BASE}/disputes/${id}`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res);
    },

    async sendMessage(id: string, data: {
      message: string;
      evidence?: string[];
      isInternalNote?: boolean;
    }): Promise<{ message: string; messageId: string }> {
      const res = await fetch(`${API_BASE}/disputes/${id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(data)
      });
      return handleResponse(res);
    },

    async resolve(id: string, data: {
      resolutionType: string;
      resolutionNotes: string;
      refundAmount?: number;
    }): Promise<{ message: string; disputeId: string; status: string }> {
      const res = await fetch(`${API_BASE}/disputes/${id}/resolve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(data)
      });
      return handleResponse(res);
    },

    async adminList(filters?: { status?: string; category?: string }): Promise<{ disputes: DisputeItem[] }> {
      let query = '';
      if (filters) {
        const params = new URLSearchParams();
        if (filters.status && filters.status !== 'all') params.append('status', filters.status);
        if (filters.category && filters.category !== 'all') params.append('category', filters.category);
        const q = params.toString();
        if (q) query = `?${q}`;
      }
      const res = await fetch(`${API_BASE}/disputes/admin/all${query}`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res);
    }
  },

  payments: {
    async getPlatformFee(): Promise<{ feeName: string; feeAmount: number; currency: string; description: string }> {
      const res = await fetch(`${API_BASE}/payments/platform-fee`);
      return handleResponse(res);
    },

    async initialize(data: {
      bookingId: string;
      paymentProvider?: string;
      paymentMethod?: string;
    }): Promise<{
      message: string;
      paymentId: string;
      paymentReference: string;
      bookingReference: string;
      propertyTitle: string;
      roomName: string;
      amount: number;
      platformFee: number;
      currency: string;
      breakdown: any;
      authorizationUrl: string;
      provider: string;
    }> {
      const res = await fetch(`${API_BASE}/payments/initialize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(data)
      });
      return handleResponse(res);
    },

    async verify(reference: string): Promise<{
      success: boolean;
      status: PaymentStatus;
      message?: string;
      payment: any;
    }> {
      const res = await fetch(`${API_BASE}/payments/verify/${encodeURIComponent(reference)}`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res);
    },

    async getStudentPayments(status?: string): Promise<{ payments: PaymentItem[] }> {
      const query = status ? `?status=${encodeURIComponent(status)}` : '';
      const res = await fetch(`${API_BASE}/payments/student${query}`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res);
    },

    async getReceipt(reference: string): Promise<{ receipt: PaymentReceipt }> {
      const res = await fetch(`${API_BASE}/payments/receipt/${encodeURIComponent(reference)}`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res);
    },

    async getProviderFinancials(): Promise<ProviderFinancialsData> {
      const res = await fetch(`${API_BASE}/payments/provider/financials`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res);
    },

    async getAdminFinancials(): Promise<AdminFinancialsData> {
      const res = await fetch(`${API_BASE}/payments/admin/financials`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res);
    },

    async processRefund(data: {
      paymentId: string;
      amount?: number;
      reason?: string;
    }): Promise<{ message: string; refundReference: string; amount: number; status: string }> {
      const res = await fetch(`${API_BASE}/payments/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(data)
      });
      return handleResponse(res);
    },

    async savePayoutAccount(data: {
      bankCode: string;
      bankName: string;
      accountNumber: string;
      accountName: string;
    }): Promise<{ message: string; account: any }> {
      const res = await fetch(`${API_BASE}/payments/payout-account`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(data)
      });
      return handleResponse(res);
    },

    async createDispute(data: {
      bookingId: string;
      paymentId?: string;
      reason: string;
    }): Promise<{ message: string; disputeReference: string; status: string }> {
      const res = await fetch(`${API_BASE}/payments/dispute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(data)
      });
      return handleResponse(res);
    }
  },

  // Phase 7 Student Dashboard & Personalization API
  student: {
    async getDashboard(): Promise<StudentDashboardData> {
      const res = await fetch(`${API_BASE}/student/dashboard`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res);
    },

    async getPreferences(): Promise<{ preferences: StudentPreferences }> {
      const res = await fetch(`${API_BASE}/student/preferences`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res);
    },

    async savePreferences(preferences: Partial<StudentPreferences>): Promise<{ success: boolean; message: string }> {
      const res = await fetch(`${API_BASE}/student/preferences`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(preferences)
      });
      return handleResponse(res);
    },

    async recordRecentlyViewed(propertyId: string): Promise<{ success: boolean }> {
      const res = await fetch(`${API_BASE}/student/recently-viewed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ propertyId })
      });
      return handleResponse(res);
    },

    async getRecentlyViewed(): Promise<{ recentlyViewed: RecentlyViewedHostelItem[] }> {
      const res = await fetch(`${API_BASE}/student/recently-viewed`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res);
    },

    async getSearchHistory(): Promise<{ searchHistory: StudentSearchHistoryItem[] }> {
      const res = await fetch(`${API_BASE}/student/search-history`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res);
    },

    async recordSearch(queryText: string, filters?: any): Promise<{ success: boolean; id: string }> {
      const res = await fetch(`${API_BASE}/student/search-history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ queryText, filters })
      });
      return handleResponse(res);
    },

    async deleteSearchItem(id: string): Promise<{ success: boolean }> {
      const res = await fetch(`${API_BASE}/student/search-history/${id}`, {
        method: 'DELETE',
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res);
    },

    async clearSearchHistory(): Promise<{ success: boolean; message: string }> {
      const res = await fetch(`${API_BASE}/student/search-history`, {
        method: 'DELETE',
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res);
    },

    async getRecommendations(): Promise<{ recommendations: any[] }> {
      const res = await fetch(`${API_BASE}/student/recommendations`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res);
    },

    async getProfile(): Promise<{ profile: any }> {
      const res = await fetch(`${API_BASE}/student/profile`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res);
    },

    async updateProfile(data: {
      fullName: string;
      phone?: string;
      department?: string;
      level?: string;
      matricNo?: string;
      gender?: string;
      avatarUrl?: string;
    }): Promise<{ success: boolean; message: string }> {
      const res = await fetch(`${API_BASE}/student/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(data)
      });
      return handleResponse(res);
    },

    async getNotificationPreferences(): Promise<{ notificationPreferences: StudentNotificationPreferences }> {
      const res = await fetch(`${API_BASE}/student/notification-preferences`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res);
    },

    async updateNotificationPreferences(data: Partial<StudentNotificationPreferences>): Promise<{ success: boolean; message: string }> {
      const res = await fetch(`${API_BASE}/student/notification-preferences`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(data)
      });
      return handleResponse(res);
    },

    async changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
      const res = await fetch(`${API_BASE}/student/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      return handleResponse(res);
    }
  },

  // AI Accommodation Assistant API (Phase 8)
  ai: {
    async chat(
      message: string, 
      conversationId?: string, 
      context?: { propertyId?: string; contextType?: string }
    ): Promise<AIChatResponse> {
      const res = await fetch(`${API_BASE}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ message, conversationId, context })
      });
      return handleResponse(res);
    },

    async getConversations(): Promise<{ conversations: AIConversation[] }> {
      const res = await fetch(`${API_BASE}/ai/conversations`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res);
    },

    async getConversation(id: string): Promise<{ conversation: AIConversation; messages: AIMessage[] }> {
      const res = await fetch(`${API_BASE}/ai/conversations/${id}`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res);
    },

    async deleteConversation(id: string): Promise<{ message: string }> {
      const res = await fetch(`${API_BASE}/ai/conversations/${id}`, {
        method: 'DELETE',
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res);
    },

    async confirmAction(actionType: string, payload: any): Promise<{ success: boolean; message: string; [key: string]: any }> {
      const res = await fetch(`${API_BASE}/ai/action/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ actionType, payload })
      });
      return handleResponse(res);
    },

    async submitFeedback(messageId: string, rating: 'HELPFUL' | 'UNHELPFUL', comment?: string): Promise<{ success: boolean; message: string }> {
      const res = await fetch(`${API_BASE}/ai/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ messageId, rating, comment })
      });
      return handleResponse(res);
    },

    async getAdminStats(): Promise<AIAdminStats> {
      const res = await fetch(`${API_BASE}/ai/admin/stats`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res);
    }
  },

  // Phase 12 Move-In & Post-Booking Service
  moveIn: {
    async getCurrentStudentMoveIn(): Promise<{ hasActiveMoveIn: boolean; moveIn: any }> {
      const res = await fetch(`${API_BASE}/move-in/student/current`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res);
    },

    async getStudentHistory(): Promise<{ stays: any[] }> {
      const res = await fetch(`${API_BASE}/move-in/student/history`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res);
    },

    async getMoveIn(bookingId: string): Promise<any> {
      const res = await fetch(`${API_BASE}/move-in/${bookingId}`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res);
    },

    async updateChecklist(bookingId: string, items: any[]): Promise<{ message: string; isCompleted: boolean }> {
      const res = await fetch(`${API_BASE}/move-in/${bookingId}/checklist`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ items })
      });
      return handleResponse(res);
    },

    async confirmArrival(bookingId: string): Promise<{ message: string; status: string }> {
      const res = await fetch(`${API_BASE}/move-in/${bookingId}/arrival`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() }
      });
      return handleResponse(res);
    },

    async confirmAcceptance(bookingId: string): Promise<{ message: string; status: string }> {
      const res = await fetch(`${API_BASE}/move-in/${bookingId}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() }
      });
      return handleResponse(res);
    },

    async submitConditionReport(bookingId: string, data: { overallCondition: string; roomChecks: Record<string, boolean>; comments?: string }): Promise<any> {
      const res = await fetch(`${API_BASE}/move-in/${bookingId}/condition-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(data)
      });
      return handleResponse(res);
    },

    async uploadPhoto(bookingId: string, data: { photoUrl: string; category?: string; caption?: string }): Promise<any> {
      const res = await fetch(`${API_BASE}/move-in/${bookingId}/photos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(data)
      });
      return handleResponse(res);
    },

    async reportIssue(bookingId: string, data: { category: string; severity: string; title: string; description: string; evidence?: string[] }): Promise<any> {
      const res = await fetch(`${API_BASE}/move-in/${bookingId}/issues`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(data)
      });
      return handleResponse(res);
    },

    async getIssues(bookingId: string): Promise<{ issues: any[] }> {
      const res = await fetch(`${API_BASE}/move-in/${bookingId}/issues`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res);
    },

    async providerActionIssue(issueId: string, data: { actionStatus: string; responseText?: string }): Promise<any> {
      const res = await fetch(`${API_BASE}/move-in/issues/${issueId}/provider-action`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(data)
      });
      return handleResponse(res);
    },

    async studentConfirmIssue(issueId: string, data: { isResolved: boolean; feedbackNotes?: string }): Promise<any> {
      const res = await fetch(`${API_BASE}/move-in/issues/${issueId}/student-confirm`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(data)
      });
      return handleResponse(res);
    },

    async acknowledgeRules(bookingId: string, version = 1): Promise<{ message: string }> {
      const res = await fetch(`${API_BASE}/move-in/${bookingId}/rules/acknowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ version })
      });
      return handleResponse(res);
    },

    async getProviderOverview(): Promise<any> {
      const res = await fetch(`${API_BASE}/move-in/provider/overview`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res);
    },

    async updateProviderInstructions(bookingId: string, data: any): Promise<{ message: string }> {
      const res = await fetch(`${API_BASE}/move-in/provider/${bookingId}/instructions`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(data)
      });
      return handleResponse(res);
    },

    async submitMoveOut(bookingId: string, data: any): Promise<{ message: string }> {
      const res = await fetch(`${API_BASE}/move-in/${bookingId}/move-out`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(data)
      });
      return handleResponse(res);
    },

    async submitCheckInFeedback(bookingId: string, data: { rating: string; feedbackText?: string }): Promise<{ message: string }> {
      const res = await fetch(`${API_BASE}/move-in/${bookingId}/check-in-feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(data)
      });
      return handleResponse(res);
    }
  },

  // =========================================================================
  // PHASE 14: COMMUNITY & ROOMMATES API
  // =========================================================================
  community: {
    async getQuestions(params?: { category?: string; propertyId?: string; areaId?: string; search?: string }): Promise<{ questions: any[]; total: number }> {
      const q = new URLSearchParams();
      if (params?.category) q.append('category', params.category);
      if (params?.propertyId) q.append('propertyId', params.propertyId);
      if (params?.areaId) q.append('areaId', params.areaId);
      if (params?.search) q.append('search', params.search);

      const res = await fetch(`${API_BASE}/community/questions?${q.toString()}`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res);
    },

    async getQuestionDetail(id: string): Promise<{ question: any; answers: any[] }> {
      const res = await fetch(`${API_BASE}/community/questions/${id}`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res);
    },

    async askQuestion(data: { title: string; description: string; category?: string; propertyId?: string; areaId?: string; isAnonymous?: boolean }): Promise<any> {
      const res = await fetch(`${API_BASE}/community/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(data)
      });
      return handleResponse(res);
    },

    async answerQuestion(data: { questionId: string; content: string }): Promise<any> {
      const res = await fetch(`${API_BASE}/community/answers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(data)
      });
      return handleResponse(res);
    },

    async reactToAnswer(data: { answerId: string; reactionType: 'HELPFUL' | 'UNHELPFUL' }): Promise<any> {
      const res = await fetch(`${API_BASE}/community/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(data)
      });
      return handleResponse(res);
    },

    async postExperience(data: any): Promise<any> {
      const res = await fetch(`${API_BASE}/community/experiences`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(data)
      });
      return handleResponse(res);
    },

    async getExperiences(propertyId?: string): Promise<{ experiences: any[] }> {
      const q = propertyId ? `?propertyId=${propertyId}` : '';
      const res = await fetch(`${API_BASE}/community/experiences${q}`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res);
    },

    async getHostelInsights(propertyId: string): Promise<any> {
      const res = await fetch(`${API_BASE}/community/insights/${propertyId}`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res);
    },

    async getGuides(): Promise<{ guides: any[] }> {
      const res = await fetch(`${API_BASE}/community/guides`);
      return handleResponse(res);
    },

    async getGuideBySlug(slug: string): Promise<any> {
      const res = await fetch(`${API_BASE}/community/guides/${slug}`);
      return handleResponse(res);
    },

    async getAreas(): Promise<{ areas: any[] }> {
      const res = await fetch(`${API_BASE}/community/areas`);
      return handleResponse(res);
    },

    async search(query: string): Promise<{ questions: any[]; guides: any[]; areaGuides: any[] }> {
      const res = await fetch(`${API_BASE}/community/search?q=${encodeURIComponent(query)}`);
      return handleResponse(res);
    },

    async submitReport(data: { entityType: string; entityId: string; reason: string; description?: string }): Promise<any> {
      const res = await fetch(`${API_BASE}/community/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(data)
      });
      return handleResponse(res);
    }
  },

  roommates: {
    async getProfile(): Promise<{ profile: any | null }> {
      const res = await fetch(`${API_BASE}/roommates/profile`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res);
    },

    async upsertProfile(data: any): Promise<{ profile: any; message: string }> {
      const res = await fetch(`${API_BASE}/roommates/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(data)
      });
      return handleResponse(res);
    },

    async discover(): Promise<{ matches: any[]; total: number }> {
      const res = await fetch(`${API_BASE}/roommates/discover`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res);
    },

    async sendRequest(receiverId: string, message?: string): Promise<any> {
      const res = await fetch(`${API_BASE}/roommates/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ receiverId, message })
      });
      return handleResponse(res);
    },

    async respondRequest(requestId: string, action: 'ACCEPT' | 'DECLINE' | 'END'): Promise<any> {
      const res = await fetch(`${API_BASE}/roommates/requests/${requestId}/respond`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ action })
      });
      return handleResponse(res);
    },

    async getMessages(requestId: string): Promise<any> {
      const res = await fetch(`${API_BASE}/roommates/requests/${requestId}/messages`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res);
    },

    async sendMessage(requestId: string, message: string): Promise<any> {
      const res = await fetch(`${API_BASE}/roommates/requests/${requestId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ message })
      });
      return handleResponse(res);
    },

    async blockUser(blockedId: string, reason?: string): Promise<any> {
      const res = await fetch(`${API_BASE}/roommates/block`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ blockedId, reason })
      });
      return handleResponse(res);
    }
  }
};
