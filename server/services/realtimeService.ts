import { Response } from 'express';
import { notificationEvents } from './notificationService.js';

interface ConnectedClient {
  id: string;
  userId: string;
  userEmail?: string;
  role?: string;
  res: Response;
  connectedAt: Date;
}

class RealtimeService {
  private clients: Map<string, ConnectedClient> = new Map();
  private userToClientIds: Map<string, Set<string>> = new Map();
  private keepAliveInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initNotificationListeners();
    this.startKeepAlive();
  }

  private normalizeKey(key: string): string {
    return (key || '').toLowerCase().trim();
  }

  /**
   * Listen to internal notificationService events and push instantly to connected users
   */
  private initNotificationListeners() {
    notificationEvents.on('notification_created', (data: { userId: string; notification: any; unreadCount: number }) => {
      this.sendToUser(data.userId, 'notification:new', {
        notification: data.notification,
        unreadCount: data.unreadCount
      });
    });

    notificationEvents.on('notification_updated', (data: { userId: string; notificationId: string; unreadCount: number }) => {
      this.sendToUser(data.userId, 'notification:read', {
        notificationId: data.notificationId,
        unreadCount: data.unreadCount
      });
    });

    notificationEvents.on('notifications_all_read', (data: { userId: string; unreadCount: number }) => {
      this.sendToUser(data.userId, 'notification:all_read', {
        unreadCount: data.unreadCount || 0
      });
    });
  }

  /**
   * Keep-alive ping every 15 seconds to prevent mobile / proxy timeout
   */
  private startKeepAlive() {
    if (this.keepAliveInterval) clearInterval(this.keepAliveInterval);
    this.keepAliveInterval = setInterval(() => {
      for (const client of this.clients.values()) {
        try {
          client.res.write(': keepalive\n\n');
        } catch {
          this.removeClient(client.id);
        }
      }
    }, 15000);
  }

  /**
   * Register a new SSE connection for an authenticated user
   */
  public addClient(user: { id: string; email?: string; role?: string }, res: Response): string {
    const clientId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Set standard SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable buffering in Nginx / proxy

    // Send connection established event
    res.write(`event: connected\ndata: ${JSON.stringify({ clientId, userId: user.id, time: new Date().toISOString() })}\n\n`);

    const client: ConnectedClient = {
      id: clientId,
      userId: user.id,
      userEmail: user.email ? this.normalizeKey(user.email) : undefined,
      role: user.role,
      res,
      connectedAt: new Date()
    };

    this.clients.set(clientId, client);

    // Map user ID to client ID
    const userKey = this.normalizeKey(user.id);
    if (!this.userToClientIds.has(userKey)) {
      this.userToClientIds.set(userKey, new Set());
    }
    this.userToClientIds.get(userKey)!.add(clientId);

    // Map user email to client ID if present
    if (user.email) {
      const emailKey = this.normalizeKey(user.email);
      if (!this.userToClientIds.has(emailKey)) {
        this.userToClientIds.set(emailKey, new Set());
      }
      this.userToClientIds.get(emailKey)!.add(clientId);
    }

    res.on('close', () => {
      this.removeClient(clientId);
    });

    res.on('error', () => {
      this.removeClient(clientId);
    });

    return clientId;
  }

  /**
   * Remove a client when disconnected
   */
  public removeClient(clientId: string) {
    const client = this.clients.get(clientId);
    if (!client) return;

    const userKey = this.normalizeKey(client.userId);
    const userClients = this.userToClientIds.get(userKey);
    if (userClients) {
      userClients.delete(clientId);
      if (userClients.size === 0) this.userToClientIds.delete(userKey);
    }

    if (client.userEmail) {
      const emailKey = this.normalizeKey(client.userEmail);
      const emailClients = this.userToClientIds.get(emailKey);
      if (emailClients) {
        emailClients.delete(clientId);
        if (emailClients.size === 0) this.userToClientIds.delete(emailKey);
      }
    }

    this.clients.delete(clientId);
  }

  /**
   * Send a real-time event to a specific user (all their active connections/tabs/devices)
   */
  public sendToUser(userIdOrEmail: string, eventName: string, data: any): number {
    const key = this.normalizeKey(userIdOrEmail);
    const clientIds = this.userToClientIds.get(key);
    if (!clientIds || clientIds.size === 0) return 0;

    let sent = 0;
    const sseMessage = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;

    for (const cid of Array.from(clientIds)) {
      const client = this.clients.get(cid);
      if (client) {
        try {
          client.res.write(sseMessage);
          sent++;
        } catch {
          this.removeClient(cid);
        }
      }
    }

    return sent;
  }

  /**
   * Send real-time event to conversation participants
   */
  public sendToConversation(studentIdentifier: string, providerIdentifier: string, eventName: string, data: any) {
    if (studentIdentifier) {
      this.sendToUser(studentIdentifier, eventName, data);
    }
    if (providerIdentifier) {
      this.sendToUser(providerIdentifier, eventName, data);
    }
  }

  /**
   * Return number of active connections
   */
  public getStats() {
    return {
      totalClients: this.clients.size,
      totalUsers: this.userToClientIds.size
    };
  }
}

export const realtimeService = new RealtimeService();
export default realtimeService;
