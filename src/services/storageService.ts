// =========================================================================
// CAMPUSNEST — STORAGE & REPOSITORY SERVICE (PHASE 1)
// =========================================================================
import { 
  Property, 
  CampusZone, 
  UserProfile, 
  PropertyReport, 
  LandlordReport, 
  VirtualViewingRequest, 
  AuditLogEntry, 
  StudentNotification, 
  LandlordNotification,
  SavedSearch,
  AdminUser,
  StudentUser,
  LandlordUser
} from '../types';
import { 
  LAUTECH_ZONES, 
  INITIAL_PROPERTIES, 
  INITIAL_ADMIN_USERS, 
  INITIAL_STUDENT_USERS, 
  INITIAL_LANDLORD_USERS,
  INITIAL_REPORTS,
  INITIAL_LANDLORD_REPORTS,
  INITIAL_VIEWINGS,
  INITIAL_AUDIT_LOGS,
  INITIAL_STUDENT_NOTIFICATIONS,
  INITIAL_NOTIFICATIONS,
  INITIAL_SAVED_SEARCHES
} from '../data/campusData';

const STORAGE_KEYS = {
  PROPERTIES: 'campusnest_properties_v1',
  ZONES: 'campusnest_zones_v1',
  USERS: 'campusnest_users_v1',
  CURRENT_USER: 'campusnest_current_user_v1',
  INSPECTIONS: 'campusnest_inspections_v1',
  REPORTS: 'campusnest_reports_v1',
  LANDLORD_REPORTS: 'campusnest_landlord_reports_v1',
  SAVED_PROPERTY_IDS: 'campusnest_saved_ids_v1',
  AUDIT_LOGS: 'campusnest_audit_logs_v1',
  STUDENT_NOTIFS: 'campusnest_student_notifs_v1',
  LANDLORD_NOTIFS: 'campusnest_landlord_notifs_v1',
  SAVED_SEARCHES: 'campusnest_saved_searches_v1',
};

// Helper for safe JSON parse
function safeGet<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    if (!item) return fallback;
    return JSON.parse(item) as T;
  } catch (error) {
    console.error(`Error reading ${key} from storage:`, error);
    return fallback;
  }
}

// Helper for safe JSON stringify
function safeSet<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`Error saving ${key} to storage:`, error);
  }
}

// =========================================================================
// 1. PROPERTY REPOSITORY
// =========================================================================
export const PropertyRepository = {
  getAll(): Property[] {
    return safeGet<Property[]>(STORAGE_KEYS.PROPERTIES, INITIAL_PROPERTIES);
  },

  getById(id: string): Property | undefined {
    const properties = this.getAll();
    return properties.find((p) => p.id === id);
  },

  getByLandlordId(landlordId: string): Property[] {
    const properties = this.getAll();
    return properties.filter((p) => p.landlord.id === landlordId);
  },

  create(property: Property): Property {
    const properties = this.getAll();
    const updated = [property, ...properties];
    safeSet(STORAGE_KEYS.PROPERTIES, updated);
    return property;
  },

  update(id: string, updates: Partial<Property>): Property | null {
    const properties = this.getAll();
    const index = properties.findIndex((p) => p.id === id);
    if (index === -1) return null;

    const updatedProperty: Property = {
      ...properties[index],
      ...updates,
      lastUpdated: 'Just now',
    };
    properties[index] = updatedProperty;
    safeSet(STORAGE_KEYS.PROPERTIES, properties);
    return updatedProperty;
  },

  delete(id: string): boolean {
    const properties = this.getAll();
    const filtered = properties.filter((p) => p.id !== id);
    if (filtered.length === properties.length) return false;
    safeSet(STORAGE_KEYS.PROPERTIES, filtered);
    return true;
  },

  updateStatus(id: string, status: Property['listingStatus'], adminNotes?: string): Property | null {
    const properties = this.getAll();
    const index = properties.findIndex((p) => p.id === id);
    if (index === -1) return null;

    const property = properties[index];
    const updated: Property = {
      ...property,
      listingStatus: status,
      verificationChecklist: property.verificationChecklist 
        ? {
            ...property.verificationChecklist,
            adminNotes: adminNotes || property.verificationChecklist.adminNotes,
          }
        : undefined,
      lastUpdated: 'Just now'
    };

    properties[index] = updated;
    safeSet(STORAGE_KEYS.PROPERTIES, properties);
    return updated;
  },

  updateVerification(id: string, verificationStatus: Property['verificationStatus'], _isVerified: boolean, notes?: string): Property | null {
    const properties = this.getAll();
    const index = properties.findIndex((p) => p.id === id);
    if (index === -1) return null;

    const property = properties[index];
    const updated: Property = {
      ...property,
      verificationStatus,
      verificationChecklist: property.verificationChecklist
        ? {
            ...property.verificationChecklist,
            adminNotes: notes || property.verificationChecklist.adminNotes,
          }
        : undefined,
      lastUpdated: 'Just now'
    };

    properties[index] = updated;
    safeSet(STORAGE_KEYS.PROPERTIES, properties);
    return updated;
  },

  updateAvailability(id: string, availabilityStatus: Property['availabilityStatus']): Property | null {
    return this.update(id, { availabilityStatus });
  }
};

// =========================================================================
// 2. ZONE REPOSITORY (LAUTECH, OGBOMOSO)
// =========================================================================
export const ZoneRepository = {
  getAll(): CampusZone[] {
    return safeGet<CampusZone[]>(STORAGE_KEYS.ZONES, LAUTECH_ZONES);
  },

  getById(id: string): CampusZone | undefined {
    return this.getAll().find((z) => z.id === id);
  },

  create(zone: CampusZone): CampusZone {
    const zones = this.getAll();
    const updated = [...zones, zone];
    safeSet(STORAGE_KEYS.ZONES, updated);
    return zone;
  },

  update(id: string, updates: Partial<CampusZone>): CampusZone | null {
    const zones = this.getAll();
    const index = zones.findIndex((z) => z.id === id);
    if (index === -1) return null;

    zones[index] = { ...zones[index], ...updates };
    safeSet(STORAGE_KEYS.ZONES, zones);
    return zones[index];
  }
};

// =========================================================================
// 3. INSPECTION REPOSITORY
// =========================================================================
export const InspectionRepository = {
  getAll(): VirtualViewingRequest[] {
    return safeGet<VirtualViewingRequest[]>(STORAGE_KEYS.INSPECTIONS, INITIAL_VIEWINGS);
  },

  getById(id: string): VirtualViewingRequest | undefined {
    return this.getAll().find((i) => i.id === id);
  },

  getByStudentId(studentId: string): VirtualViewingRequest[] {
    return this.getAll().filter((i) => i.studentId === studentId);
  },

  getByLandlordId(landlordId: string): VirtualViewingRequest[] {
    return this.getAll().filter((i) => i.landlordId === landlordId);
  },

  create(request: VirtualViewingRequest): VirtualViewingRequest {
    const all = this.getAll();
    const updated = [request, ...all];
    safeSet(STORAGE_KEYS.INSPECTIONS, updated);
    return request;
  },

  updateStatus(id: string, status: VirtualViewingRequest['status'], adminNotes?: string): VirtualViewingRequest | null {
    const all = this.getAll();
    const index = all.findIndex((i) => i.id === id);
    if (index === -1) return null;

    all[index] = {
      ...all[index],
      status,
      adminNotes: adminNotes || all[index].adminNotes,
    };
    safeSet(STORAGE_KEYS.INSPECTIONS, all);
    return all[index];
  }
};

// =========================================================================
// 4. REPORT REPOSITORY (ANTI-SCAM & TRUST)
// =========================================================================
export const ReportRepository = {
  getPropertyReports(): PropertyReport[] {
    return safeGet<PropertyReport[]>(STORAGE_KEYS.REPORTS, INITIAL_REPORTS);
  },

  createPropertyReport(report: PropertyReport): PropertyReport {
    const all = this.getPropertyReports();
    const updated = [report, ...all];
    safeSet(STORAGE_KEYS.REPORTS, updated);
    return report;
  },

  updatePropertyReportStatus(id: string, status: PropertyReport['status'], adminNotes?: string): PropertyReport | null {
    const all = this.getPropertyReports();
    const index = all.findIndex((r) => r.id === id);
    if (index === -1) return null;

    all[index] = {
      ...all[index],
      status,
      adminNotes: adminNotes || all[index].adminNotes,
      updatedAt: new Date().toISOString(),
    };
    safeSet(STORAGE_KEYS.REPORTS, all);
    return all[index];
  },

  getLandlordReports(): LandlordReport[] {
    return safeGet<LandlordReport[]>(STORAGE_KEYS.LANDLORD_REPORTS, INITIAL_LANDLORD_REPORTS);
  },

  createLandlordReport(report: LandlordReport): LandlordReport {
    const all = this.getLandlordReports();
    const updated = [report, ...all];
    safeSet(STORAGE_KEYS.LANDLORD_REPORTS, updated);
    return report;
  }
};

// =========================================================================
// 5. SAVED PROPERTIES REPOSITORY
// =========================================================================
export const SavedPropertyRepository = {
  getSavedIds(): string[] {
    return safeGet<string[]>(STORAGE_KEYS.SAVED_PROPERTY_IDS, []);
  },

  toggle(propertyId: string): { saved: boolean; ids: string[] } {
    const ids = this.getSavedIds();
    const exists = ids.includes(propertyId);
    let updated: string[];

    if (exists) {
      updated = ids.filter((id) => id !== propertyId);
    } else {
      updated = [...ids, propertyId];
    }

    safeSet(STORAGE_KEYS.SAVED_PROPERTY_IDS, updated);
    return { saved: !exists, ids: updated };
  },

  isSaved(propertyId: string): boolean {
    return this.getSavedIds().includes(propertyId);
  }
};

// =========================================================================
// 6. USER & AUTH REPOSITORY
// =========================================================================
export const UserRepository = {
  getCurrentUser(): UserProfile | null {
    return safeGet<UserProfile | null>(STORAGE_KEYS.CURRENT_USER, null);
  },

  setCurrentUser(user: UserProfile | null): void {
    safeSet(STORAGE_KEYS.CURRENT_USER, user);
  },

  getStudents(): StudentUser[] {
    return safeGet<StudentUser[]>(STORAGE_KEYS.USERS + '_students', INITIAL_STUDENT_USERS);
  },

  getLandlords(): LandlordUser[] {
    return safeGet<LandlordUser[]>(STORAGE_KEYS.USERS + '_landlords', INITIAL_LANDLORD_USERS);
  },

  getAdmins(): AdminUser[] {
    return safeGet<AdminUser[]>(STORAGE_KEYS.USERS + '_admins', INITIAL_ADMIN_USERS);
  },

  updateLandlordVerification(landlordId: string, status: LandlordUser['verificationStatus']): LandlordUser | null {
    const landlords = this.getLandlords();
    const index = landlords.findIndex((l) => l.id === landlordId);
    if (index === -1) return null;

    landlords[index] = {
      ...landlords[index],
      verificationStatus: status,
    };
    safeSet(STORAGE_KEYS.USERS + '_landlords', landlords);
    return landlords[index];
  }
};

// =========================================================================
// 7. AUDIT LOG REPOSITORY
// =========================================================================
export const AuditLogRepository = {
  getAll(): AuditLogEntry[] {
    return safeGet<AuditLogEntry[]>(STORAGE_KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS);
  },

  log(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): AuditLogEntry {
    const all = this.getAll();
    const newEntry: AuditLogEntry = {
      id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString(),
      ...entry,
    };
    const updated = [newEntry, ...all];
    safeSet(STORAGE_KEYS.AUDIT_LOGS, updated);
    return newEntry;
  }
};
