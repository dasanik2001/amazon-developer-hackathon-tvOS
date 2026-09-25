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
