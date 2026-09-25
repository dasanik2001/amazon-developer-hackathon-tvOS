import { Router, Request, Response } from 'express';
import QRCode from 'qrcode';
import { db } from '../db/database.js';
import { analyzeContent, analyzeFrameContext, preheatContentCatalog } from '../services/aiPipeline.js';
import { getOrCreateDailyDigest } from '../services/digestService.js';
import { answerParentQuestion } from '../services/qaService.js';
import { socketService } from '../services/socketService.js';
import { ViewingSession, FrameContext } from '../types.js';

const router = Router();

// Children Profiles
router.get('/children', (_req: Request, res: Response) => {
  const children = db.getChildren();
  res.json({ success: true, data: children });
});

// Content Catalog with Signals
router.get('/catalog', async (_req: Request, res: Response) => {
  const contents = db.getAllContent();
  const enriched = contents.map((item) => {
    const analysis = db.getAnalysis(item.id);
    return {
      ...item,
      analysis: analysis || null,
    };
  });
  res.json({ success: true, data: enriched });
});

// Viewing Event Ingestion (P0 Viewing session tracking)
router.post('/events/session', async (req: Request, res: Response) => {
  try {
    const { id, child_id, content_id, title, category, started_at, ended_at, duration_sec, completed } = req.body;

    if (!child_id || !content_id) {
      res.status(400).json({ success: false, error: 'child_id and content_id are required' });
      return;
    }

    const sessionId = id || `session_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const nowIso = new Date().toISOString();
    const startDate = started_at || nowIso;
    const endDate = ended_at || nowIso;
    const dateStamp = startDate.split('T')[0];

    const session: ViewingSession = {
      id: sessionId,
      child_id,
      content_id,
      title: title || 'Unknown Title',
      category: category || 'Entertainment',
      started_at: startDate,
      ended_at: endDate,
      duration_sec: duration_sec || 60,
      completed: !!completed,
      timestamp: dateStamp,
    };

    // Store the session
    db.recordSession(session);

    // Auto-enrich content if needed
    let content = db.getContentById(content_id);
    if (!content) {
      // Dynamically add content item streamed from the app
      content = {
        id: content_id,
        title: title || 'Kids Video',
        provider: 'Fire TV Stream',
        duration_sec: duration_sec || 600,
        category: category || 'Entertainment',
        genres: [category || 'Entertainment'],
        content_rating: 'TV-G',
        description: `${title || 'Video'} streamed on Family TV Guardian.`,
        transcript: `${title || 'Video'} watched by child.`,
        poster_url: '',
        video_url: '',
      };
      db.getAllContent().push(content);
    }
    await analyzeContent(content);

    // Recompute Daily Digest for child
    const digest = getOrCreateDailyDigest(child_id, dateStamp);

    // Broadcast realtime update to Web Dashboard clients
    socketService.broadcast('session:updated', { session, digest });
    socketService.broadcast('digest:updated', digest);

    res.json({
      success: true,
      data: {
        session,
        digest,
      },
    });
  } catch (err: any) {
    console.error('Error processing viewing event:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// List Viewing Sessions
router.get('/sessions', (req: Request, res: Response) => {
  const childId = req.query.child_id as string | undefined;
  const date = (req.query.date as string) || new Date().toISOString().split('T')[0];
  const sessions = db.getSessions(childId, date);
  res.json({ success: true, data: sessions });
});

// Daily Digest (P0)
router.get('/digest/:childId', (req: Request, res: Response) => {
  const childId = String(req.params.childId);
  const date = (req.query.date as string) || new Date().toISOString().split('T')[0];
  const digest = getOrCreateDailyDigest(childId, date);
  res.json({ success: true, data: digest });
});

// Parent Q&A (P0)
router.post('/ai/qa', async (req: Request, res: Response) => {
  try {
    const { child_id, question, date } = req.body;
    if (!child_id || !question) {
      res.status(400).json({ success: false, error: 'child_id and question are required' });
      return;
    }

    const result = await answerParentQuestion(child_id, question, date);
    res.json({ success: true, data: result });
  } catch (err: any) {
    console.error('Error answering parent question:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Fire TV OS System Overlay - Periodic 2-minute Frame & Media Ingestion
router.post('/overlay/ingest-frame', async (req: Request, res: Response) => {
  try {
    const {
      child_id,
      app_package,
      app_name,
      media_title,
      media_artist,
      synopsis,
      text_snippets,
      frame_base64,
      timestamp,
      duration_increment_sec,
    } = req.body;

    if (!child_id || !app_package) {
      res.status(400).json({ success: false, error: 'child_id and app_package are required' });
      return;
    }

    // Enforce parental control gate: if monitoring is disabled, reject ingestion
    if (!db.isMonitoringEnabled()) {
      res.json({
        success: false,
        monitoring_enabled: false,
        message: 'Parental control monitoring is paused from web dashboard. Ingestion skipped.',
      });
      return;
    }

    const nowIso = timestamp || new Date().toISOString();
    const dateStamp = nowIso.split('T')[0];
    const resolvedAppName =
      app_name ||
      (app_package.includes('smarttube')
        ? 'SmartTube'
        : app_package.includes('youtube')
        ? 'YouTube'
        : app_package.includes('netflix')
        ? 'Netflix'
        : app_package.includes('amazonvideo') || app_package.includes('prime')
        ? 'Prime Video'
        : app_package.includes('disney') || app_package.includes('hotstar')
        ? 'Disney+'
        : 'Streaming App');

    const rawTitle = (media_title || '').trim();
    const snippets = Array.isArray(text_snippets) ? text_snippets : [];
    
    // Intelligent title resolution:
    // If media_title is generic (e.g. "Prime Video Stream", "Netflix Stream", "Streaming App", empty),
    // search text_snippets for candidate titles (first non-generic, non-URL string with good length)
    let resolvedTitle = rawTitle;
    const isGenericTitle = !rawTitle || 
      rawTitle.endsWith(' Stream') || 
      rawTitle.endsWith(' Media Stream') || 
      rawTitle.toLowerCase().includes('streaming app') ||
      rawTitle.toLowerCase() === resolvedAppName.toLowerCase();

    if (isGenericTitle && snippets.length > 0) {
      const blacklist = ['home', 'store', 'live tv', 'categories', 'my stuff', 'settings', 'search', 'profiles', 'recommended', 'prime video', 'netflix', 'youtube', 'disney+', 'trending', 'explore', 'channels', 'live'];
      const candidate = snippets.find((s: string) => {
        const lower = s.toLowerCase().trim();
        return s.length >= 3 && s.length <= 90 && !blacklist.includes(lower) && !s.startsWith('http') && !s.match(/^[0-9:.]+$/);
      });
      if (candidate) {
        resolvedTitle = candidate;
      }
    }

    if (!resolvedTitle || resolvedTitle.endsWith(' Stream')) {
      resolvedTitle = `${resolvedAppName} Presentation`;
    }

    // Run AI analysis on captured frame/text context
    const analysis = await analyzeFrameContext(
      resolvedAppName,
      app_package,
      resolvedTitle,
      snippets,
      media_artist || '',
      synopsis || '',
    );

    const frameContext: FrameContext = {
      id: `frame_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      child_id,
      timestamp: nowIso,
      app_package,
      app_name: resolvedAppName,
      media_title: resolvedTitle,
      media_artist: media_artist || '',
      synopsis: synopsis || '',
      text_snippets: snippets,
      frame_base64: frame_base64 || '',
      analysis,
    };

    // Store frame context snapshot
    db.recordFrame(frameContext);

    // Update or extend the current external viewing session for this app
    // E.g. 120 seconds (2 mins) per sample
    const sampleDurationSec = duration_increment_sec || 120;
    const contentId = `ext_${app_package}_${resolvedTitle.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

    // Store analysis so sessions have full metadata
    db.saveAnalysis({
      ...analysis,
      content_id: contentId,
    });

    const session: ViewingSession = {
      id: `session_${contentId}_${dateStamp}`,
      child_id,
      content_id: contentId,
      title: `${resolvedTitle} [${resolvedAppName}]`,
      category: analysis.categories[0] || 'Entertainment',
      started_at: nowIso,
      ended_at: nowIso,
      duration_sec: sampleDurationSec,
      completed: false,
      timestamp: dateStamp,
    };

    // Check if session already exists for today to accumulate duration
    const existing = db.getSessions(child_id, dateStamp).find((s) => s.content_id === contentId);
    if (existing) {
      existing.duration_sec += sampleDurationSec;
      existing.ended_at = nowIso;
      db.recordSession(existing);
    } else {
      db.recordSession(session);
    }

    // Update Daily Digest
    const digest = getOrCreateDailyDigest(child_id, dateStamp);

    // Broadcast realtime event over WebSocket to Web Dashboard
    socketService.broadcast('frame:new', {
      frame: frameContext,
      session: existing || session,
      digest,
      app: resolvedAppName,
      title: resolvedTitle,
    });
    socketService.broadcast('digest:updated', digest);

    console.log(`[Overlay Ingestion] Processed sample from ${resolvedAppName}: "${resolvedTitle}" for child ${child_id}`);
    db.setCurrentApp(resolvedAppName, app_package || '');

    res.json({
      success: true,
      data: {
        frame_id: frameContext.id,
        app: resolvedAppName,
        title: resolvedTitle,
        analysis,
        digest,
      },
    });
  } catch (err: any) {
    console.error('Error ingesting overlay frame:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Realtime App Switch notification from Fire TV
router.post('/overlay/app-change', (req: Request, res: Response) => {
  const { app_name, app_package, child_id } = req.body;
  const resolvedName = app_name || 'Streaming App';
  console.log(`[Realtime TV Socket] App switched: ${resolvedName} (${app_package}) for child ${child_id}`);
  db.setCurrentApp(resolvedName, app_package || '');
  socketService.broadcast('app:active', {
    app_name: resolvedName,
    app_package: app_package || '',
    child_id: child_id || 'child_aarav',
    timestamp: new Date().toISOString(),
  });
  res.json({ success: true, app_name: resolvedName });
});

// Retrieve recent frame snapshots
router.get('/overlay/frames', (req: Request, res: Response) => {
  const childId = req.query.child_id as string | undefined;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
  const frames = db.getFrames(childId, limit);
  res.json({ success: true, data: frames });
});

// Parental Control Monitoring State & Web Toggle
router.get('/overlay/control', (_req: Request, res: Response) => {
  res.json({
    success: true,
    enabled: db.isMonitoringEnabled(),
    current_app: db.getCurrentApp(),
  });
});

router.post('/overlay/control', (req: Request, res: Response) => {
  const { enabled, child_id } = req.body;
  const targetState = Boolean(enabled);
  db.setMonitoringEnabled(targetState);

  console.log(`[Parental Control] Monitoring state changed from dashboard to: ${targetState ? 'ENABLED' : 'PAUSED'}`);

  // Broadcast to all connected Web Dashboard clients & TV apps via WebSocket
  socketService.broadcast('monitoring:state', {
    enabled: targetState,
    child_id: child_id || 'child_aarav',
    timestamp: new Date().toISOString(),
  });

  res.json({
    success: true,
    enabled: targetState,
    message: targetState
      ? 'Parental control monitoring started. Screen context & metadata streaming active.'
      : 'Parental control monitoring paused. TV background sampling stopped.',
  });
});


// Real-life Scenario Simulation Endpoint
router.post('/demo/simulate', async (req: Request, res: Response) => {
  const { scenario, child_id } = req.body;
  const targetChild = child_id || 'child_aarav';
  const today = new Date().toISOString().split('T')[0];

  if (scenario === 'reset') {
    db.resetAll();
    await preheatContentCatalog();
    res.json({ success: true, message: 'Database reset to fresh state' });
    return;
  }

  const catalog = db.getAllContent();

  if (scenario === 'space_day') {
    const spaceItem = catalog.find((c) => c.id === 'content_jwst_space') || catalog[0];
    const session: ViewingSession = {
      id: `sim_${Date.now()}_1`,
      child_id: targetChild,
      content_id: spaceItem.id,
      title: spaceItem.title,
      category: spaceItem.category,
      started_at: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
      ended_at: new Date().toISOString(),
      duration_sec: 1500, // 25 min
      completed: true,
      timestamp: today,
    };
    db.recordSession(session);
    await analyzeContent(spaceItem);
    const digest = getOrCreateDailyDigest(targetChild, today);
    res.json({ success: true, scenario, message: 'Simulated 25m Space Discovery session', data: { session, digest } });
    return;
  }

  if (scenario === 'action_cartoon') {
    const actionItem = catalog.find((c) => c.id === 'content_city_rescue_action') || catalog[3];
    const session: ViewingSession = {
      id: `sim_${Date.now()}_2`,
      child_id: targetChild,
      content_id: actionItem.id,
      title: actionItem.title,
      category: actionItem.category,
      started_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      ended_at: new Date().toISOString(),
      duration_sec: 900, // 15 min
      completed: true,
      timestamp: today,
    };
    db.recordSession(session);
    await analyzeContent(actionItem);
    const digest = getOrCreateDailyDigest(targetChild, today);
    res.json({
      success: true,
      scenario,
      message: 'Simulated 15m Turbo Squad Action session (triggers mild action signal)',
      data: { session, digest },
    });
    return;
  }

  if (scenario === 'full_day') {
    // 3 sessions: space (25m), coding robots (20m), funny cartoons (10m)
    const items = [
      { id: 'content_jwst_space', dur: 1500 },
      { id: 'content_kids_coding', dur: 1200 },
      { id: 'content_funny_cartoons', dur: 600 },
    ];

    for (let i = 0; i < items.length; i++) {
      const item = catalog.find((c) => c.id === items[i].id)!;
      const session: ViewingSession = {
        id: `sim_${Date.now()}_${i}`,
        child_id: targetChild,
        content_id: item.id,
        title: item.title,
        category: item.category,
        started_at: new Date(Date.now() - (60 - i * 15) * 60 * 1000).toISOString(),
        ended_at: new Date(Date.now() - (40 - i * 15) * 60 * 1000).toISOString(),
        duration_sec: items[i].dur,
        completed: true,
        timestamp: today,
      };
      db.recordSession(session);
      await analyzeContent(item);
    }
    const digest = getOrCreateDailyDigest(targetChild, today);
    res.json({ success: true, scenario, message: 'Simulated full viewing day (55 mins across 3 titles)', data: { digest } });
    return;
  }

  res.status(400).json({ success: false, error: 'Unknown scenario. Available: space_day, action_cartoon, full_day, reset' });
});

// ==========================================
// Dynamic TV Device Pairing & Authentication
// ==========================================

// Create or refresh pairing session for Fire TV
router.post('/pairing/session', async (req: Request, res: Response) => {
  try {
    const { device_id, device_name, host } = req.body;
    const deviceId = device_id || 'tv_fire_livingroom';
    const deviceName = device_name || 'Fire TV Living Room';

    // Check if device is already linked
    const existingAccount = db.getDeviceAccount(deviceId);
    if (existingAccount) {
      res.json({
        success: true,
        already_linked: true,
        data: {
          deviceId,
          email: existingAccount.email,
          deviceName: existingAccount.deviceName,
          linkedAt: existingAccount.linkedAt,
        },
      });
      return;
    }

    const session = db.createPairingSession(deviceId, deviceName);
    
    // Determine public WiFi host IP for phone scanner
    const resolvedHost = host || process.env.LOCAL_IP || '192.168.0.4';
    const port = process.env.PORT || 3001;
    const qrPayload = `http://${resolvedHost}:${port}/pair?session=${session.sessionId}&code=${session.pairingCode}`;

    // Generate dynamic QR Code Data URL (PNG base64) with high error correction and crisp margin
    const qrDataUrl = await QRCode.toDataURL(qrPayload, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      margin: 1,
      width: 512,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });

    res.json({
      success: true,
      data: {
        sessionId: session.sessionId,
        pairingCode: session.pairingCode,
        expiresAt: session.expiresAt,
        qrPayload,
        qrDataUrl,
        deviceId,
        deviceName,
      },
    });
  } catch (err: any) {
    console.error('Error generating pairing session:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Render dynamic QR Code directly as PNG image
router.get('/pairing/qr/:sessionId.png', async (req: Request, res: Response) => {
  try {
    const sessionId = req.params.sessionId as string;
    const session = db.getPairingSession(sessionId);
    if (!session) {
      res.status(404).send('Session not found');
      return;
    }

    const host = (req.query.host as string) || process.env.LOCAL_IP || '192.168.0.4';
    const port = process.env.PORT || 3001;
    const qrPayload = `http://${host}:${port}/pair?session=${session.sessionId}&code=${session.pairingCode}`;

    const pngBuffer = await QRCode.toBuffer(qrPayload, {
      errorCorrectionLevel: 'H',
      type: 'png',
      margin: 1,
      width: 512,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.send(pngBuffer);
  } catch (err: any) {
    console.error('Error rendering QR image:', err);
    res.status(500).send('Error generating QR code');
  }
});

// Check pairing status for active TV session
router.get('/pairing/session/:sessionId/status', (req: Request, res: Response) => {
  const sessionId = req.params.sessionId as string;
  const session = db.getPairingSession(sessionId);

  if (!session) {
    res.status(404).json({ success: false, error: 'Session not found' });
    return;
  }

  // Check expiration
  if (session.status === 'pending' && new Date() > new Date(session.expiresAt)) {
    session.status = 'expired';
  }

  res.json({
    success: true,
    data: {
      sessionId: session.sessionId,
      pairingCode: session.pairingCode,
      status: session.status,
      linkedEmail: session.linkedEmail || null,
      deviceId: session.deviceId,
      deviceName: session.deviceName,
      expiresAt: session.expiresAt,
    },
  });
});

// Mobile App / Web Companion scan confirmation
// Links TV to the parent account email
router.post('/pairing/confirm', (req: Request, res: Response) => {
  try {
    const { sessionId, pairingCode, email, userId } = req.body;

    if (!email || !email.includes('@')) {
      res.status(400).json({ success: false, error: 'Valid email address is required' });
      return;
    }

    const targetKey = sessionId || pairingCode;
    if (!targetKey) {
      res.status(400).json({ success: false, error: 'sessionId or pairingCode is required' });
      return;
    }

    const updatedSession = db.confirmPairing(targetKey, email, userId);
    if (!updatedSession) {
      res.status(404).json({ success: false, error: 'Pairing session not found or invalid' });
      return;
    }

    console.log(`[Device Pairing] TV linked to email "${email}" (Session: ${updatedSession.sessionId})`);

    // Broadcast instant pairing success over WebSocket to TV
    socketService.broadcast('pairing:linked', {
      sessionId: updatedSession.sessionId,
      pairingCode: updatedSession.pairingCode,
      email: updatedSession.linkedEmail,
      deviceId: updatedSession.deviceId,
      deviceName: updatedSession.deviceName,
      linkedAt: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: `Device successfully linked to ${updatedSession.linkedEmail}`,
      data: {
        sessionId: updatedSession.sessionId,
        pairingCode: updatedSession.pairingCode,
        email: updatedSession.linkedEmail,
        deviceId: updatedSession.deviceId,
      },
    });
  } catch (err: any) {
    console.error('Error confirming pairing:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Check device link status
router.get('/pairing/device/:deviceId/status', (req: Request, res: Response) => {
  const deviceId = req.params.deviceId as string;
  const account = db.getDeviceAccount(deviceId);
  res.json({
    success: true,
    linked: !!account,
    data: account || null,
  });
});

// Unlink TV device
router.post('/pairing/unlink', (req: Request, res: Response) => {
  const { device_id, deviceId } = req.body;
  const targetId = device_id || deviceId || 'tv_fire_livingroom';
  db.unlinkDevice(targetId);

  socketService.broadcast('pairing:unlinked', {
    deviceId: targetId,
    timestamp: new Date().toISOString(),
  });

  res.json({
    success: true,
    message: `Device ${targetId} unlinked successfully`,
  });
});

export default router;
