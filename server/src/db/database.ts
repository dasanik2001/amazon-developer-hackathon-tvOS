import fs from 'fs';
import path from 'path';
import { ChildProfile, ContentItem, ViewingSession, ContentAnalysis, DailyDigest, FrameContext, PairingSession } from '../types.js';

interface DatabaseSchema {
  children: ChildProfile[];
  contents: ContentItem[];
  sessions: ViewingSession[];
  analyses: Record<string, ContentAnalysis>;
  digests: Record<string, DailyDigest>; // key: `${child_id}_${date}`
  frames: FrameContext[];
  pairingSessions?: Record<string, PairingSession>;
  devices?: Record<string, { email: string; deviceName: string; linkedAt: string }>;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'guardian_db.json');

// Default initial catalog
const INITIAL_CHILDREN: ChildProfile[] = [
  {
    id: 'child_aarav',
    household_id: 'house_001',
    display_name: 'Aarav',
    age_band: '7-10',
    avatar: '👦',
    settings: { daily_limit_minutes: 60, flag_threshold: 'standard' },
  },
  {
    id: 'child_meera',
    household_id: 'house_001',
    display_name: 'Meera',
    age_band: '4-6',
    avatar: '👧',
    settings: { daily_limit_minutes: 45, flag_threshold: 'strict' },
  },
];

const INITIAL_CONTENTS: ContentItem[] = [];

class Database {
  private data: DatabaseSchema;

  constructor() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
        if (!this.data.pairingSessions) this.data.pairingSessions = {};
        if (!this.data.devices) this.data.devices = {};
      } catch (err) {
        console.warn('Failed to parse existing DB file, reinitializing', err);
        this.data = this.getDefaultData();
        this.save();
      }
    } else {
      this.data = this.getDefaultData();
      this.save();
    }
  }

  private getDefaultData(): DatabaseSchema {
    return {
      children: [...INITIAL_CHILDREN],
      contents: [...INITIAL_CONTENTS],
      sessions: [],
      analyses: {},
      digests: {},
      frames: [],
      pairingSessions: {},
      devices: {},
    };
  }

  private save(): void {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to write database file:', err);
    }
  }

  // Children
  public getChildren(): ChildProfile[] {
    return this.data.children;
  }

  public getChildById(id: string): ChildProfile | undefined {
    return this.data.children.find((c) => c.id === id);
  }

  // Contents
  public getAllContent(): ContentItem[] {
    return this.data.contents;
  }

  public getContentById(id: string): ContentItem | undefined {
    return this.data.contents.find((c) => c.id === id);
  }

  // Sessions
  public recordSession(session: ViewingSession): void {
    // Check if session already exists (update heartbeat/duration)
    const existingIndex = this.data.sessions.findIndex((s) => s.id === session.id);
    if (existingIndex >= 0) {
      this.data.sessions[existingIndex] = session;
    } else {
      this.data.sessions.push(session);
    }
    this.save();
  }

  public getSessions(childId?: string, date?: string): ViewingSession[] {
    let list = this.data.sessions;
    if (childId) {
      list = list.filter((s) => s.child_id === childId);
    }
    if (date) {
      list = list.filter((s) => s.timestamp === date || s.started_at.startsWith(date));
    }
    return list;
  }

  // Content Analyses
  public getAnalysis(contentId: string): ContentAnalysis | undefined {
    return this.data.analyses[contentId];
  }

  public saveAnalysis(analysis: ContentAnalysis): void {
    this.data.analyses[analysis.content_id] = analysis;
    this.save();
  }

  public getAllAnalyses(): Record<string, ContentAnalysis> {
    return this.data.analyses;
  }

  // Daily Digests
  public getDigest(childId: string, date: string): DailyDigest | undefined {
    return this.data.digests[`${childId}_${date}`];
  }

  public saveDigest(digest: DailyDigest): void {
    this.data.digests[`${digest.child_id}_${digest.date}`] = digest;
    this.save();
  }

  // Frame Contexts (2-minute overlay ingestion)
  public recordFrame(frame: FrameContext): void {
    if (!this.data.frames) {
      this.data.frames = [];
    }
    this.data.frames.unshift(frame); // newest first
    if (this.data.frames.length > 500) {
      this.data.frames = this.data.frames.slice(0, 500); // cap history
    }
    this.save();
  }

  public getFrames(childId?: string, limit = 20): FrameContext[] {
    if (!this.data.frames) return [];
    let list = this.data.frames;
    if (childId) {
      list = list.filter((f) => f.child_id === childId);
    }
    return list.slice(0, limit);
  }

  // Monitoring State (Controls whether background overlay actively samples & streams)
  public isMonitoringEnabled(): boolean {
    return (this.data as any).monitoringEnabled !== false; // default true
  }

  public setMonitoringEnabled(enabled: boolean): boolean {
    (this.data as any).monitoringEnabled = enabled;
    this.save();
    return enabled;
  }

  // Active Streaming App state
  public getCurrentApp(): { app_name: string; app_package: string; timestamp: string } | null {
    return (this.data as any).currentApp || null;
  }

  public setCurrentApp(app_name: string, app_package: string): void {
    (this.data as any).currentApp = {
      app_name,
      app_package,
      timestamp: new Date().toISOString(),
    };
    this.save();
  }

  // Pairing & Auth Sessions
  public createPairingSession(deviceId = 'tv_fire_01', deviceName = 'Fire TV Living Room'): PairingSession {
    if (!this.data.pairingSessions) this.data.pairingSessions = {};
    const hex = Math.random().toString(36).substring(2, 8) + Math.random().toString(36).substring(2, 4);
    const sessionId = `gdn_${hex}`;
    const codeNum = Math.floor(1000 + Math.random() * 9000);
    const pairingCode = `TV-${codeNum}`;
    const now = new Date();
    const expires = new Date(now.getTime() + 15 * 60 * 1000); // 15 mins

    const session: PairingSession = {
      sessionId,
      pairingCode,
      status: 'pending',
      createdAt: now.toISOString(),
      expiresAt: expires.toISOString(),
      deviceId,
      deviceName,
    };

    this.data.pairingSessions[sessionId] = session;
    this.save();
    return session;
  }

  public getPairingSession(sessionId: string): PairingSession | undefined {
    return this.data.pairingSessions?.[sessionId];
  }

  public getPairingSessionByCode(code: string): PairingSession | undefined {
    const list = Object.values(this.data.pairingSessions || {});
    return list.find((s) => s.pairingCode.toUpperCase() === code.trim().toUpperCase());
  }

  public confirmPairing(sessionIdOrCode: string, email: string, userId?: string): PairingSession | null {
    let session = this.getPairingSession(sessionIdOrCode) || this.getPairingSessionByCode(sessionIdOrCode);
    if (!session) return null;

    session.status = 'linked';
    session.linkedEmail = email.trim().toLowerCase();
    session.linkedUserId = userId || `usr_${session.linkedEmail.replace(/[^a-z0-9]/g, '_')}`;

    if (session.deviceId) {
      if (!this.data.devices) this.data.devices = {};
      this.data.devices[session.deviceId] = {
        email: session.linkedEmail,
        deviceName: session.deviceName || 'Fire TV',
        linkedAt: new Date().toISOString(),
      };
    }

    this.save();
    return session;
  }

  public getDeviceAccount(deviceId: string): { email: string; deviceName: string; linkedAt: string } | null {
    return this.data.devices?.[deviceId] || null;
  }

  public unlinkDevice(deviceId: string): void {
    if (this.data.devices?.[deviceId]) {
      delete this.data.devices[deviceId];
    }
    for (const s of Object.values(this.data.pairingSessions || {})) {
      if (s.deviceId === deviceId && s.status === 'linked') {
        s.status = 'expired';
      }
    }
    this.save();
  }

  public resetAll(): void {
    this.data = this.getDefaultData();
    this.save();
  }
}


export const db = new Database();
