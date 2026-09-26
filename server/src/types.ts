export interface ChildProfile {
  id: string;
  household_id: string;
  display_name: string;
  age_band: string; // e.g. "6-9" or "10-12"
  avatar?: string;
  settings?: {
    daily_limit_minutes?: number;
    flag_threshold?: 'strict' | 'standard' | 'relaxed';
  };
}

export interface ContentItem {
  id: string;
  title: string;
  provider: string;
  duration_sec: number;
  category: string;
  genres: string[];
  description: string;
  transcript: string;
  poster_url: string;
  video_url: string;
  content_rating?: string;
}

export interface ViewingSession {
  id: string;
  child_id: string;
  content_id: string;
  title: string;
  category: string;
  started_at: string;
  ended_at: string;
  duration_sec: number;
  completed: boolean;
  timestamp: string; // YYYY-MM-DD
}

export interface ContentAnalysis {
  content_id: string;
  categories: string[];
  topics: string[];
  educational_score: number; // 0 - 100
  age_signal: string; // e.g. "7-10" or "All Ages"
  violence_signal: 'none' | 'mild_action' | 'intense';
  language_signal: 'clean' | 'mild' | 'concerning';
  summary: string;
  key_takeaways: string[];
  model_version: string;
  analyzed_at: string;
}

export interface DailyDigest {
  child_id: string;
  date: string; // YYYY-MM-DD
  total_minutes: number;
  category_minutes: Record<string, number>;
  top_topics: string[];
  notable_items: Array<{
    title: string;
    reason: string;
    flag_type: 'educational_highlight' | 'potential_concern' | 'topic_breakthrough';
  }>;
  generated_summary: string;
}

export interface QAResult {
  question: string;
  answer: string;
  evidence_sessions: Array<{
    session_id: string;
    content_id: string;
    title: string;
    watched_at: string;
    duration_min: number;
    category: string;
    topics: string[];
    summary: string;
  }>;
  confidence: number;
}

export interface FrameContext {
  id: string;
  child_id: string;
  timestamp: string; // ISO timestamp
  app_package: string; // e.g. "com.google.android.youtube.tv", "com.amazon.amazonvideo.livingroom", "com.netflix.ninja"
  app_name: string; // e.g. "YouTube", "Amazon Prime Video", "Netflix"
  media_title?: string;
  media_artist?: string;
  synopsis?: string;
  text_snippets?: string[]; // on-screen titles, subtitles, or UI elements captured from AccessibilityNodeInfo
  frame_base64?: string; // sampled frame thumbnail if available
  analysis?: ContentAnalysis;
}

export interface PairingSession {
  sessionId: string;
  pairingCode: string;
  status: 'pending' | 'linked' | 'expired';
  createdAt: string;
  expiresAt: string;
  linkedEmail?: string;
  linkedUserId?: string;
  deviceId?: string;
  deviceName?: string;
}

// ─── Authentication & Parent Account Types ──────────────────────────────

export interface ParentUser {
  id: string;
  household_id: string;
  display_name: string;
  email?: string;           // Sign in via email
  phone?: string;           // Sign in via phone (E.164 format, e.g. +1234567890)
  password_hash: string;    // bcrypt-hashed password
  two_fa_enabled: boolean;
  two_fa_secret?: string;   // TOTP secret for authenticator apps (optional)
  linked_children: string[]; // Array of child profile IDs
  created_at: string;
  updated_at: string;
}

export interface OtpChallenge {
  id: string;               // challenge_id returned to client
  user_id: string;
  otp_code: string;         // 6-digit code
  purpose: 'login_2fa' | 'forgot_password' | 'verify_account' | 'registration';
  identifier: string;       // email or phone used
  expires_at: number;       // Unix timestamp (ms)
  attempts: number;         // max 3
  created_at: string;
  pending_user?: {
    display_name: string;
    password_hash: string;
    email?: string;
    phone?: string;
  };
}

export interface TvPairSession {
  id: string;               // pair_token
  short_code: string;       // 6-char human-readable code (e.g. "GARD-892")
  qr_payload: string;       // Full URL/JSON encoded in QR
  qr_data_url?: string;     // Base64 Data URL for embedding QR directly in UI
  status: 'pending' | 'approved' | 'expired';
  household_id?: string;    // Set once approved
  approved_by?: string;     // parent_user_id
  device_name?: string;     // e.g. "Living Room Fire TV"
  device_token?: string;    // JWT issued for the TV device after approval
  created_at: string;
  approved_at?: string;
  expires_at: number;       // Unix timestamp (ms) - 10 min TTL
}

export interface RemoteCommand {
  id: string;
  command: 'pause' | 'resume' | 'lock' | 'extend_time' | 'bedtime';
  issued_by: string;        // parent_user_id
  target_child?: string;    // child_id (optional, applies to all if omitted)
  payload?: Record<string, any>; // e.g. { extra_minutes: 15 }
  timestamp: string;
}

export interface AuthTokenPayload {
  user_id: string;
  household_id: string;
  type: 'access' | 'refresh' | 'tv_device';
  iat?: number;
  exp?: number;
}
