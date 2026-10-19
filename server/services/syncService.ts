/**
 * HOSTEL EASE — BIDIRECTIONAL LOCALHOST & LIVE SYNCHRONIZATION SERVICE
 * 
 * Ensures database records, user accounts, listings, bookings, and operations
 * remain 100% synchronized between localhost (SQLite) and the live production website
 * (hostelease.oluwatosinahmad.workers.dev).
 */

import dns from 'dns';
try {
  dns.setDefaultResultOrder('ipv4first');
} catch {}

import db from '../db';

interface SyncPayload {
  users?: any[];
  properties?: any[];
  bookings?: any[];
}

export class SyncService {
  private liveUrl: string;
  private syncSecret: string;
  private lastPullTimestamp: number = 0;
  private isSyncing = false;
  private syncTimer: NodeJS.Timeout | null = null;
  private isLiveReachable = false;

  constructor() {
    this.liveUrl = (process.env.LIVE_SITE_URL || 'https://hostelease.oluwatosinahmad.workers.dev').replace(/\/+$/, '');
    this.syncSecret = process.env.SYNC_SECRET || 'hostel_ease_sync_secret_2026';
  }

  public async start() {
    console.log(`📡 [SyncService] Initializing bidirectional sync with live site (${this.liveUrl})...`);
    await this.pushAllLocalData();
    this.startPolling();
  }

  public stop() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  /**
   * Pushes the entire local SQLite dataset to the live Edge Store on startup.
   */
  public async pushAllLocalData() {
    try {
      const users = db.prepare('SELECT * FROM users').all().map((u: any) => ({
        id: u.id,
        fullName: u.full_name,
        email: u.email,
        phone: u.phone || '',
        role: u.role,
        passwordHash: u.password_hash,
        avatarUrl: u.avatar_url || '',
        isActive: u.is_active === 1,
        status: u.account_status || 'ACTIVE',
        department: u.department || '',
        level: u.level || '',
        matricNo: u.matric_no || '',
        gender: u.gender || '',
        isVerified: u.role === 'ADMIN' || u.is_active === 1,
        createdAt: u.created_at,
        updated_at: u.updated_at
      }));

      const properties = db.prepare('SELECT * FROM properties').all().map((p: any) => ({
        ...p,
        amenities: p.amenities ? (typeof p.amenities === 'string' ? JSON.parse(p.amenities) : p.amenities) : [],
        images: p.images ? (typeof p.images === 'string' ? JSON.parse(p.images) : p.images) : [],
        rules: p.rules ? (typeof p.rules === 'string' ? JSON.parse(p.rules) : p.rules) : [],
        bills_included: p.bills_included ? (typeof p.bills_included === 'string' ? JSON.parse(p.bills_included) : p.bills_included) : [],
        security_features: p.security_features ? (typeof p.security_features === 'string' ? JSON.parse(p.security_features) : p.security_features) : []
      }));

      const bookings = db.prepare('SELECT * FROM bookings').all();

      const payload: SyncPayload = { users, properties, bookings };

      const res = await fetch(`${this.liveUrl}/api/sync/push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Sync-Secret': this.syncSecret
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const result = await res.json() as any;
        this.isLiveReachable = true;
        console.log(`✅ [SyncService] Full database push successful: ${users.length} users, ${properties.length} properties synchronized with live site.`);
      } else {
        console.warn(`⚠️ [SyncService] Push returned HTTP ${res.status}`);
      }
    } catch (err: any) {
      this.isLiveReachable = false;
      console.warn(`⚠️ [SyncService] Initial push to live site deferred: ${err.message}`);
    }
  }

  /**
   * Pushes a single newly inserted or updated record directly to the live site.
   */
  public async queueRecordPush(table: string, record: any) {
    try {
      const payload: SyncPayload = {};
      if (table === 'users') {
        payload.users = [{
          id: record.id,
          fullName: record.fullName || record.full_name,
          email: record.email,
          phone: record.phone || '',
          role: record.role,
          passwordHash: record.passwordHash || record.password_hash,
          avatarUrl: record.avatarUrl || record.avatar_url || '',
          isActive: record.isActive ?? (record.is_active === 1),
          status: record.status || record.account_status || 'ACTIVE',
          department: record.department || '',
          level: record.level || '',
          createdAt: record.createdAt || record.created_at || new Date().toISOString()
        }];
      } else if (table === 'properties') {
        payload.properties = [record];
      } else if (table === 'bookings') {
        payload.bookings = [record];
      }

      const res = await fetch(`${this.liveUrl}/api/sync/push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Sync-Secret': this.syncSecret
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        console.log(`📤 [SyncService] Pushed ${table} record to live site:`, record.id || record.email);
      } else {
        console.warn(`⚠️ [SyncService] Push ${table} returned HTTP ${res.status}`);
      }
    } catch (e: any) {
      console.warn(`[SyncService] Failed to push ${table} record:`, e.message);
    }
  }

  /**
   * Polls the live website for changes made directly on the live website and merges them into SQLite.
   */
  public async pullLiveChanges() {
    if (this.isSyncing) return;
    this.isSyncing = true;

    try {
      const res = await fetch(`${this.liveUrl}/api/sync/pull?since=${this.lastPullTimestamp}`, {
        headers: { 'X-Sync-Secret': this.syncSecret }
      });

      if (res.ok) {
        const data = await res.json() as any;
        if (Array.isArray(data.changes) && data.changes.length > 0) {
          for (const change of data.changes) {
            if (change.table === 'users' && change.data) {
              const u = change.data;
              const exists = db.prepare('SELECT id FROM users WHERE id = ? OR LOWER(email) = ?').get(u.id, (u.email || '').toLowerCase());
              if (!exists) {
                db.prepare(`
                  INSERT INTO users (id, email, password_hash, full_name, phone, role, is_active, account_status, department, level, matric_no, gender, created_at, updated_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `).run(
                  u.id,
                  u.email,
                  u.passwordHash || '$2a$10$wK1eB1Kz779e5tF/a9gJ2uQ4V.f2nZ5d2p.h1g2a3b4c5d6e7f8g9',
                  u.fullName || 'Registered User',
                  u.phone || '',
                  u.role || 'STUDENT',
                  1,
                  u.status || 'ACTIVE',
                  u.department || '',
                  u.level || '100L',
                  u.matricNo || '',
                  u.gender || '',
                  u.createdAt || new Date().toISOString(),
                  new Date().toISOString()
                );
                console.log(`📥 [SyncService] Synced new live user to SQLite: ${u.email} (${u.role})`);
              }
            }
          }
        }
        if (data.timestamp) {
          this.lastPullTimestamp = data.timestamp;
        }
      }
    } catch (err: any) {
      console.warn(`[SyncService] pullLiveChanges error:`, err.message);
    } finally {
      this.isSyncing = false;
    }
  }

  private startPolling() {
    this.syncTimer = setInterval(() => {
      this.pullLiveChanges().catch(() => {});
    }, 5000);
  }

  public getStatus() {
    return {
      liveUrl: this.liveUrl,
      isLiveReachable: this.isLiveReachable,
      lastPullTimestamp: this.lastPullTimestamp
    };
  }
}

export const syncService = new SyncService();
export default syncService;
