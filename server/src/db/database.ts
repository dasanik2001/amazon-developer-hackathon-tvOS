import fs from 'fs';
import path from 'path';
import {
  ChildProfile,
  ContentItem,
  ViewingSession,
  ContentAnalysis,
  DailyDigest,
  FrameContext,
  PairingSession,
  ParentUser,
  OtpChallenge,
  TvPairSession,
} from '../types.js';

interface DatabaseSchema {
  children: ChildProfile[];
  contents: ContentItem[];
  sessions: ViewingSession[];
  analyses: Record<string, ContentAnalysis>;
  digests: Record<string, DailyDigest>; // key: `${child_id}_${date}`
  frames: FrameContext[];
  pairingSessions?: Record<string, PairingSession>;
  devices?: Record<string, { email: string; deviceName: string; linkedAt: string }>;
  // Auth & Pairing
  parent_users: ParentUser[];
  otp_challenges: OtpChallenge[];
  tv_pair_sessions: TvPairSession[];
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

const INITIAL_CONTENTS: ContentItem[] = [
  {
    id: 'content_jwst_space',
    title: 'JWST: Unfolding the Universe',
    provider: 'NASA TV / Prime Video',
    category: 'Science & Documentary',
    genres: ['Science', 'Documentary', 'Space'],
    duration_sec: 1800,
    description: 'A deep space documentary exploring the James Webb Space Telescope, exoplanets, nebulae, and early galaxy formation.',
    transcript: 'The James Webb Space Telescope has deployed its golden mirrors in deep space. Astronomers can now observe infrared wavelengths to study early galaxies, exoplanet atmospheres, and stellar nurseries.',
    poster_url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600',
    video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    content_rating: 'TV-G',
  },
  {
    id: 'content_kids_coding',
    title: 'RoboKids: Learn to Code',
    provider: 'STEM Kids Learning',
    category: 'Educational',
    genres: ['Educational', 'STEM', 'Technology'],
    duration_sec: 1200,
    description: 'An interactive STEM show teaching algorithms, loops, and logic through fun robot adventures.',
    transcript: 'Today on RoboKids we learn about loops and if-then conditionals. Watch Byte the Robot solve the maze using logical algorithms and sequencing.',
    poster_url: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=600',
    video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    content_rating: 'TV-Y7',
  },
  {
    id: 'content_funny_cartoons',
    title: 'Looney Adventures',
    provider: 'ToonTime Animation',
    category: 'Animation',
    genres: ['Animation', 'Comedy', 'Cartoons'],
    duration_sec: 600,
    description: 'Classic slapstick animated cartoons with comedic chases and humorous situations.',
    transcript: 'The rabbit outsmarts the duck in another humorous chase through the forest. Lots of silly slapstick laughs and playful antics.',
    poster_url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600',
    video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    content_rating: 'TV-Y',
  },
  {
    id: 'content_city_rescue_action',
    title: 'Turbo Squad: City Rescue',
    provider: 'ActionToons Network',
    category: 'Action',
    genres: ['Animation', 'Action', 'Superheroes'],
    duration_sec: 900,
    description: 'Superhero cartoon where vehicles transform to stop runaway robots and save the city.',
    transcript: 'Alert! Robots have escaped the factory. The Turbo Squad transforms their rescue vehicles, deploying laser shields and sonic nets to safely capture the robots and defend the city.',
    poster_url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=600',
    video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    content_rating: 'TV-Y7',
  },
];

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
      parent_users: [],
      otp_challenges: [],
      tv_pair_sessions: [],
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

  // ─── Parent Users ─────────────────────────────────────────────────────

  public createParentUser(user: ParentUser): void {
    if (!this.data.parent_users) this.data.parent_users = [];
    this.data.parent_users.push(user);
    this.save();
  }

  public getParentById(id: string): ParentUser | undefined {
    if (!this.data.parent_users) return undefined;
    return this.data.parent_users.find((u) => u.id === id);
  }

  public getParentByEmail(email: string): ParentUser | undefined {
    if (!this.data.parent_users) return undefined;
    return this.data.parent_users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  }

  public getParentByPhone(phone: string): ParentUser | undefined {
    if (!this.data.parent_users) return undefined;
    return this.data.parent_users.find((u) => u.phone === phone);
  }

  public getParentByIdentifier(identifier: string): ParentUser | undefined {
    return identifier.startsWith('+')
      ? this.getParentByPhone(identifier)
      : this.getParentByEmail(identifier);
  }

  public updateParentUser(id: string, updates: Partial<ParentUser>): ParentUser | undefined {
    if (!this.data.parent_users) return undefined;
    const idx = this.data.parent_users.findIndex((u) => u.id === id);
    if (idx < 0) return undefined;
    this.data.parent_users[idx] = { ...this.data.parent_users[idx], ...updates, updated_at: new Date().toISOString() };
    this.save();
    return this.data.parent_users[idx];
  }

  // ─── OTP Challenges ───────────────────────────────────────────────────

  public createOtpChallenge(challenge: OtpChallenge): void {
    if (!this.data.otp_challenges) this.data.otp_challenges = [];
    // Remove any existing challenges for same user + purpose
    this.data.otp_challenges = this.data.otp_challenges.filter(
      (c) => !(c.user_id === challenge.user_id && c.purpose === challenge.purpose)
    );
    this.data.otp_challenges.push(challenge);
    this.save();
  }

  public getOtpChallenge(challengeId: string): OtpChallenge | undefined {
    if (!this.data.otp_challenges) return undefined;
    return this.data.otp_challenges.find((c) => c.id === challengeId);
  }

  public updateOtpChallenge(challengeId: string, updates: Partial<OtpChallenge>): void {
    if (!this.data.otp_challenges) return;
    const idx = this.data.otp_challenges.findIndex((c) => c.id === challengeId);
    if (idx >= 0) {
      this.data.otp_challenges[idx] = { ...this.data.otp_challenges[idx], ...updates };
      this.save();
    }
  }

  public deleteOtpChallenge(challengeId: string): void {
    if (!this.data.otp_challenges) return;
    this.data.otp_challenges = this.data.otp_challenges.filter((c) => c.id !== challengeId);
    this.save();
  }

  // Cleanup expired challenges
  public cleanupExpiredOtps(): void {
    if (!this.data.otp_challenges) return;
    const now = Date.now();
    const before = this.data.otp_challenges.length;
    this.data.otp_challenges = this.data.otp_challenges.filter((c) => c.expires_at > now);
    if (this.data.otp_challenges.length !== before) this.save();
  }

  // ─── TV Pair Sessions ─────────────────────────────────────────────────

  public createTvPairSession(session: TvPairSession): void {
    if (!this.data.tv_pair_sessions) this.data.tv_pair_sessions = [];
    this.data.tv_pair_sessions.push(session);
    this.save();
  }

  public getTvPairSession(pairToken: string): TvPairSession | undefined {
    if (!this.data.tv_pair_sessions) return undefined;
    return this.data.tv_pair_sessions.find((s) => s.id === pairToken);
  }

  public getTvPairSessionByCode(shortCode: string): TvPairSession | undefined {
    if (!this.data.tv_pair_sessions) return undefined;
    return this.data.tv_pair_sessions.find((s) => s.short_code === shortCode && s.status === 'pending');
  }

  public updateTvPairSession(pairToken: string, updates: Partial<TvPairSession>): TvPairSession | undefined {
    if (!this.data.tv_pair_sessions) return undefined;
    const idx = this.data.tv_pair_sessions.findIndex((s) => s.id === pairToken);
    if (idx < 0) return undefined;
    this.data.tv_pair_sessions[idx] = { ...this.data.tv_pair_sessions[idx], ...updates };
    this.save();
    return this.data.tv_pair_sessions[idx];
  }

  // Expire stale pairing sessions (older than 10 mins)
  public cleanupExpiredPairSessions(): void {
    if (!this.data.tv_pair_sessions) return;
    const now = Date.now();
    this.data.tv_pair_sessions = this.data.tv_pair_sessions.map((s) => {
      if (s.status === 'pending' && s.expires_at < now) {
        return { ...s, status: 'expired' as const };
      }
      return s;
    });
    this.save();
  }

  public getLinkedTvDevices(householdId: string): TvPairSession[] {
    if (!this.data.tv_pair_sessions) return [];
    return this.data.tv_pair_sessions.filter((s) => s.status === 'approved' && s.household_id === householdId);
  }
}


export const db = new Database();
