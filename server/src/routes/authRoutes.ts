import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../db/database.js';
import {
  registerParent,
  loginParent,
  verify2FA,
  resendOtp,
  forgotPassword,
  resetPassword,
  verifyAccessToken,
  refreshAccessToken,
  demoLoginParent,
  generatePairCode,
  issueTvDeviceToken,
} from '../services/authService.js';
import { socketService } from '../services/socketService.js';
import { TvPairSession } from '../types.js';
import crypto from 'crypto';
import QRCode from 'qrcode';

const router = Router();

// ─── JWT Auth Middleware ─────────────────────────────────────────────────

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Authorization header required' });
    return;
  }

  const token = authHeader.split(' ')[1];
  const payload = verifyAccessToken(token);
  if (!payload) {
    res.status(401).json({ success: false, error: 'Invalid or expired access token' });
    return;
  }

  // Attach user info to request
  (req as any).userId = payload.user_id;
  (req as any).householdId = payload.household_id;
  next();
}

// ─── Registration ────────────────────────────────────────────────────────

router.post('/register', async (req: Request, res: Response) => {
  try {
    const { identifier, password, display_name } = req.body;

    if (!identifier || !password || !display_name) {
      res.status(400).json({
        success: false,
        error: 'identifier (email or phone), password, and display_name are required',
      });
      return;
    }

    const result = await registerParent({ identifier, password, display_name });
    if (!result.success) {
      res.status(400).json(result);
      return;
    }

    res.status(201).json(result);
  } catch (err: any) {
    console.error('[Auth] Registration error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Login (Step 1) ──────────────────────────────────────────────────────

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      res.status(400).json({
        success: false,
        error: 'identifier (email or phone) and password are required',
      });
      return;
    }

    const result = await loginParent({ identifier, password });
    if (!result.success) {
      res.status(401).json(result);
      return;
    }

    // Returns { success, access_token, refresh_token, user }
    res.json(result);
  } catch (err: any) {
    console.error('[Auth] Login error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Instant Demo / Auth Bypass (Step 1 & 2 Combined, No 2FA) ───────────

router.post('/demo-login', async (req: Request, res: Response) => {
  try {
    const { identifier } = req.body || {};
    const result = await demoLoginParent(identifier);
    if (!result.success) {
      res.status(400).json(result);
      return;
    }
    res.json(result);
  } catch (err: any) {
    console.error('[Auth] Demo login bypass error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Verify 2FA OTP (Step 2) ─────────────────────────────────────────────

router.post('/verify-2fa', async (req: Request, res: Response) => {
  try {
    const { challenge_id, otp_code } = req.body;

    if (!challenge_id || !otp_code) {
      res.status(400).json({
        success: false,
        error: 'challenge_id and otp_code are required',
      });
      return;
    }

    const result = await verify2FA({ challenge_id, otp_code: String(otp_code) });
    if (!result.success) {
      res.status(401).json(result);
      return;
    }

    res.json(result);
  } catch (err: any) {
    console.error('[Auth] 2FA verification error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Resend OTP ──────────────────────────────────────────────────────────

router.post('/resend-otp', async (req: Request, res: Response) => {
  try {
    const { challenge_id } = req.body;
    if (!challenge_id) {
      res.status(400).json({ success: false, error: 'challenge_id is required' });
      return;
    }

    const result = await resendOtp({ challenge_id });
    if (!result.success) {
      res.status(400).json(result);
      return;
    }

    res.json(result);
  } catch (err: any) {
    console.error('[Auth] Resend OTP error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Forgot Password ────────────────────────────────────────────────────

router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { identifier } = req.body;
    if (!identifier) {
      res.status(400).json({ success: false, error: 'identifier (email or phone) is required' });
      return;
    }

    const result = await forgotPassword({ identifier });
    res.json(result);
  } catch (err: any) {
    console.error('[Auth] Forgot password error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Reset Password ─────────────────────────────────────────────────────

router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { challenge_id, otp_code, new_password } = req.body;
    if (!challenge_id || !otp_code || !new_password) {
      res.status(400).json({
        success: false,
        error: 'challenge_id, otp_code, and new_password are required',
      });
      return;
    }

    const result = await resetPassword({ challenge_id, otp_code: String(otp_code), new_password });
    if (!result.success) {
      res.status(400).json(result);
      return;
    }

    res.json(result);
  } catch (err: any) {
    console.error('[Auth] Reset password error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Refresh Token ───────────────────────────────────────────────────────

router.post('/refresh', (req: Request, res: Response) => {
  const { refresh_token } = req.body;
  if (!refresh_token) {
    res.status(400).json({ success: false, error: 'refresh_token is required' });
    return;
  }

  const result = refreshAccessToken(refresh_token);
  if (!result.success) {
    res.status(401).json(result);
    return;
  }

  res.json(result);
});

// ─── Get Current User ────────────────────────────────────────────────────

router.get('/me', requireAuth, (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const user = db.getParentById(userId);
  if (!user) {
    res.status(404).json({ success: false, error: 'User not found' });
    return;
  }

  // Return user without password hash
  const children = user.linked_children.map((cid) => db.getChildById(cid)).filter(Boolean);

  res.json({
    success: true,
    data: {
      id: user.id,
      household_id: user.household_id,
      display_name: user.display_name,
      email: user.email,
      phone: user.phone,
      two_fa_enabled: user.two_fa_enabled,
      linked_children: children,
      created_at: user.created_at,
    },
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// TV PAIRING ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════

// TV requests a new pairing session (called by Fire TV app)
router.post('/tv-pair/initiate', async (req: Request, res: Response) => {
  try {
    const { device_name } = req.body;

    // Cleanup expired sessions first
    db.cleanupExpiredPairSessions();

    const pairToken = `tv_pair_${crypto.randomBytes(16).toString('hex')}`;
    const shortCode = generatePairCode();
    const baseUrl = process.env.SERVER_URL || `http://localhost:${process.env.PORT || 3001}`;

    const qrPayload = JSON.stringify({
      type: 'guardian_tv_pair',
      pair_token: pairToken,
      short_code: shortCode,
      server: baseUrl,
    });

    let qrDataUrl = '';
    try {
      qrDataUrl = await QRCode.toDataURL(qrPayload, {
        width: 360,
        margin: 2,
        color: { dark: '#0a0f1d', light: '#ffffff' },
      });
    } catch (qrErr) {
      console.warn('[TV Pair] QR DataURL generation error:', qrErr);
    }

    const session: TvPairSession = {
      id: pairToken,
      short_code: shortCode,
      qr_payload: qrPayload,
      qr_data_url: qrDataUrl,
      status: 'pending',
      device_name: device_name || 'Fire TV Device',
      created_at: new Date().toISOString(),
      expires_at: Date.now() + 10 * 60 * 1000, // 10 minutes
    };

    db.createTvPairSession(session);

    console.log(`[TV Pair] New pairing session created: ${shortCode} (token: ${pairToken.substring(0, 20)}...)`);

    res.json({
      success: true,
      data: {
        pair_token: pairToken,
        short_code: shortCode,
        qr_payload: qrPayload,
        qr_data_url: qrDataUrl,
        expires_in_seconds: 600,
      },
    });
  } catch (err: any) {
    console.error('[TV Pair] Initiate error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Render SVG QR code directly for TV displays / browsers
router.get('/tv-pair/qr/:token', async (req: Request, res: Response) => {
  try {
    let token = String(req.params.token);
    if (token.endsWith('.svg')) {
      token = token.slice(0, -4);
    }

    let session = db.getTvPairSession(token);
    if (!session) {
      session = db.getTvPairSessionByCode(token.toUpperCase());
    }

    if (!session) {
      res.status(404).send('Pairing session not found');
      return;
    }

    const svg = await QRCode.toString(session.qr_payload, {
      type: 'svg',
      margin: 2,
      color: { dark: '#0a0f1d', light: '#ffffff' },
    });

    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.send(svg);
  } catch (err: any) {
    res.status(500).send('Error generating QR code');
  }
});

// Get currently active TV session for the TV display simulator
router.get('/tv-pair/active', (req: Request, res: Response) => {
  try {
    db.cleanupExpiredPairSessions();
    const token = req.query.pair_token as string;
    if (token) {
      const session = db.getTvPairSession(token);
      if (session) {
        res.json({ success: true, data: session });
        return;
      }
    }

    // Look for any existing approved or pending session
    const sessions = (db as any).data.tv_pair_sessions || [];
    const approved = sessions.find((s: TvPairSession) => s.status === 'approved');
    if (approved) {
      res.json({ success: true, data: approved });
      return;
    }

    const pending = sessions.find((s: TvPairSession) => s.status === 'pending' && s.expires_at > Date.now());
    if (pending) {
      res.json({ success: true, data: pending });
      return;
    }

    res.json({ success: true, data: null });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Mobile app lists linked TV devices for the household
router.get('/tv-pair/devices', requireAuth, (req: Request, res: Response) => {
  try {
    const householdId = (req as any).householdId;
    const devices = db.getLinkedTvDevices(householdId);
    res.json({
      success: true,
      data: devices.map((d) => ({
        id: d.id,
        device_name: d.device_name,
        short_code: d.short_code,
        status: d.status,
        created_at: d.created_at,
        approved_at: d.approved_at,
      })),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Mobile app unlinks a TV device
router.post('/tv-pair/disconnect', requireAuth, (req: Request, res: Response) => {
  try {
    const householdId = (req as any).householdId;
    const { pair_token } = req.body;

    if (!pair_token) {
      res.status(400).json({ success: false, error: 'pair_token is required' });
      return;
    }

    const session = db.getTvPairSession(pair_token);
    if (!session || session.household_id !== householdId) {
      res.status(404).json({ success: false, error: 'TV device not found in household' });
      return;
    }

    db.updateTvPairSession(pair_token, { status: 'expired' });

    // Notify TV via WebSocket that it has been disconnected
    socketService.broadcast('tv:unpaired', {
      pair_token,
      timestamp: new Date().toISOString(),
    });

    console.log(`[TV Pair] Disconnected TV "${session.device_name}" (${session.short_code})`);

    res.json({ success: true, message: 'TV disconnected successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Mobile app approves a TV pairing (called by authenticated parent on mobile)
router.post('/tv-pair/approve', requireAuth, (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const householdId = (req as any).householdId;
    const { pair_token, short_code } = req.body;

    if (!pair_token && !short_code) {
      res.status(400).json({ success: false, error: 'pair_token or short_code is required' });
      return;
    }

    // Find the pairing session
    let session: TvPairSession | undefined;
    if (pair_token) {
      session = db.getTvPairSession(pair_token);
    } else if (short_code) {
      session = db.getTvPairSessionByCode(short_code.toUpperCase());
    }

    if (!session) {
      res.status(404).json({ success: false, error: 'Pairing session not found or expired' });
      return;
    }

    if (session.status !== 'pending') {
      res.status(400).json({ success: false, error: `Pairing session is already ${session.status}` });
      return;
    }

    if (Date.now() > session.expires_at) {
      db.updateTvPairSession(session.id, { status: 'expired' });
      res.status(400).json({ success: false, error: 'Pairing session has expired. Please generate a new code on your TV.' });
      return;
    }

    // Issue a long-lived TV device token
    const deviceToken = issueTvDeviceToken(householdId);

    // Approve the session
    const user = db.getParentById(userId);
    const approvedAt = new Date().toISOString();
    const updatedSession = db.updateTvPairSession(session.id, {
      status: 'approved',
      household_id: householdId,
      approved_by: userId,
      device_token: deviceToken,
      approved_at: approvedAt,
    });

    // Broadcast to TV via WebSocket so it transitions instantly
    const children = (user?.linked_children || []).map((cid) => db.getChildById(cid)).filter(Boolean);
    socketService.broadcast('tv:authorized', {
      pair_token: session.id,
      short_code: session.short_code,
      household_id: householdId,
      device_token: deviceToken,
      device_name: session.device_name,
      parent_name: user?.display_name,
      children,
      timestamp: approvedAt,
    });

    console.log(`[TV Pair] ✅ TV "${session.device_name}" linked to household ${householdId} by ${user?.display_name}`);

    res.json({
      success: true,
      data: {
        pair_token: session.id,
        linked_tv: session.device_name,
        household_id: householdId,
        parent_name: user?.display_name,
        children,
      },
    });
  } catch (err: any) {
    console.error('[TV Pair] Approve error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Polling endpoint for TV to check pairing status (fallback if WebSocket reconnects)
router.get('/tv-pair/status', (req: Request, res: Response) => {
  const pairToken = req.query.pair_token as string;
  if (!pairToken) {
    res.status(400).json({ success: false, error: 'pair_token query param is required' });
    return;
  }

  const session = db.getTvPairSession(pairToken);
  if (!session) {
    res.status(404).json({ success: false, error: 'Pairing session not found' });
    return;
  }

  res.json({
    success: true,
    data: {
      status: session.status,
      device_token: session.status === 'approved' ? session.device_token : undefined,
      household_id: session.household_id,
      device_name: session.device_name,
      approved_at: session.approved_at,
    },
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// REMOTE COMMANDS (Mobile -> TV)
// ═══════════════════════════════════════════════════════════════════════════

router.post('/remote/command', requireAuth, (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { command, target_child, payload } = req.body;

    const validCommands = ['pause', 'resume', 'lock', 'extend_time', 'bedtime'];
    if (!command || !validCommands.includes(command)) {
      res.status(400).json({
        success: false,
        error: `Invalid command. Valid commands: ${validCommands.join(', ')}`,
      });
      return;
    }

    const remoteCommand = {
      id: `cmd_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      command,
      issued_by: userId,
      target_child: target_child || undefined,
      payload: payload || {},
      timestamp: new Date().toISOString(),
    };

    // Broadcast the command to all connected TV devices
    socketService.broadcast('remote:command', remoteCommand);

    console.log(`[Remote] Command "${command}" issued by ${userId}${target_child ? ` for ${target_child}` : ''}`);

    res.json({
      success: true,
      data: remoteCommand,
    });
  } catch (err: any) {
    console.error('[Remote] Command error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// DEVICE PUSH TOKEN REGISTRATION
// ═══════════════════════════════════════════════════════════════════════════

router.post('/device/push-token', requireAuth, (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { push_token, platform } = req.body;

  if (!push_token) {
    res.status(400).json({ success: false, error: 'push_token is required' });
    return;
  }

  // In production this would store the token for push notification delivery
  console.log(`[Device] Push token registered for ${userId}: ${push_token.substring(0, 20)}... (${platform || 'unknown'})`);

  res.json({
    success: true,
    message: 'Push token registered successfully',
  });
});

export default router;
