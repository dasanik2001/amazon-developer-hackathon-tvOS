import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { db } from '../db/database.js';
import { ParentUser, OtpChallenge, AuthTokenPayload } from '../types.js';

// ─── Configuration ─────────────────────────────────────────────────────

const JWT_SECRET = process.env.JWT_SECRET || 'guardian_jwt_secret_dev_key_change_in_production';
const JWT_ACCESS_EXPIRY = '30d';     // Persistent access token: 30 days (prevents daily login requirement)
const JWT_REFRESH_EXPIRY = '180d';   // Refresh token: 180 days
const JWT_TV_DEVICE_EXPIRY = '365d'; // TV device token: 1 year
const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const OTP_MAX_ATTEMPTS = 3;
const BCRYPT_ROUNDS = 10;

// ─── Utility Helpers ────────────────────────────────────────────────────

/** Generate a random 6-digit OTP code */
function generateOtpCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/** Generate a short human-readable pairing code like "GARD-892" */
export function generatePairCode(): string {
  const prefix = 'GARD';
  const suffix = Math.floor(100 + Math.random() * 900).toString();
  return `${prefix}-${suffix}`;
}

/** Generate a secure random token */
function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/** Generate a unique user ID */
function generateUserId(): string {
  return `parent_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}

// ─── Password Validation ────────────────────────────────────────────────

/** Validate password strength: min 8 chars, 1 uppercase, 1 digit, 1 symbol */
export function validatePasswordStrength(password: string): { valid: boolean; message: string } {
  if (password.length < 8) return { valid: false, message: 'Password must be at least 8 characters' };
  if (!/[A-Z]/.test(password)) return { valid: false, message: 'Password must contain at least one uppercase letter' };
  if (!/[0-9]/.test(password)) return { valid: false, message: 'Password must contain at least one digit' };
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) return { valid: false, message: 'Password must contain at least one special character' };
  return { valid: true, message: 'Password meets strength requirements' };
}

/** Validate email format */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Validate phone (E.164 format) */
export function isValidPhone(phone: string): boolean {
  return /^\+[1-9]\d{6,14}$/.test(phone);
}

// ─── Registration ───────────────────────────────────────────────────────

export async function registerParent(params: {
  identifier: string;  // email or phone
  password: string;
  display_name: string;
}): Promise<{ success: boolean; user?: Partial<ParentUser>; error?: string }> {
  const { identifier, password, display_name } = params;

  // Determine if identifier is email or phone
  const isPhone = identifier.startsWith('+');
  if (isPhone && !isValidPhone(identifier)) {
    return { success: false, error: 'Invalid phone number format. Use E.164 (e.g. +1234567890)' };
  }
  if (!isPhone && !isValidEmail(identifier)) {
    return { success: false, error: 'Invalid email address format' };
  }

  // Check if already registered
  const existing = db.getParentByIdentifier(identifier);
  if (existing) {
    return { success: false, error: 'An account with this identifier already exists' };
  }

  // Validate password strength
  const pwCheck = validatePasswordStrength(password);
  if (!pwCheck.valid) {
    return { success: false, error: pwCheck.message };
  }

  // Hash password
  const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const now = new Date().toISOString();
  const user: ParentUser = {
    id: generateUserId(),
    household_id: `house_${Date.now()}`,
    display_name,
    email: isPhone ? undefined : identifier,
    phone: isPhone ? identifier : undefined,
    password_hash,
    two_fa_enabled: true, // Always enabled by default
    linked_children: ['child_aarav', 'child_meera'], // Link to existing demo children
    created_at: now,
    updated_at: now,
  };

  db.createParentUser(user);

  console.log(`[Auth] New parent registered: ${display_name} (${identifier})`);

  return {
    success: true,
    user: {
      id: user.id,
      household_id: user.household_id,
      display_name: user.display_name,
      email: user.email,
      phone: user.phone,
      linked_children: user.linked_children,
    },
  };
}

// ─── Login (Direct Token Issue — No 2FA) ────────────────────────────────

export async function loginParent(params: {
  identifier: string;
  password: string;
}): Promise<{
  success: boolean;
  access_token?: string;
  refresh_token?: string;
  user?: Partial<ParentUser>;
  error?: string;
}> {
  const { identifier, password } = params;

  const user = db.getParentByIdentifier(identifier);
  if (!user) {
    return { success: false, error: 'No account found with this identifier' };
  }

  const passwordMatch = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatch) {
    return { success: false, error: 'Incorrect password' };
  }

  // Directly issue tokens — no 2FA step
  const accessPayload: AuthTokenPayload = {
    user_id: user.id,
    household_id: user.household_id,
    type: 'access',
  };
  const refreshPayload: AuthTokenPayload = {
    user_id: user.id,
    household_id: user.household_id,
    type: 'refresh',
  };

  const access_token = jwt.sign(accessPayload, JWT_SECRET, { expiresIn: JWT_ACCESS_EXPIRY });
  const refresh_token = jwt.sign(refreshPayload, JWT_SECRET, { expiresIn: JWT_REFRESH_EXPIRY });

  console.log(`[Auth] ✅ Direct login successful for: ${user.display_name} (${identifier})`);

  return {
    success: true,
    access_token,
    refresh_token,
    user: {
      id: user.id,
      household_id: user.household_id,
      display_name: user.display_name,
      email: user.email,
      phone: user.phone,
      linked_children: user.linked_children,
    },
  };
}

// ─── Verify 2FA OTP (Step 2: Issue Tokens) ──────────────────────────────

export async function verify2FA(params: {
  challenge_id: string;
  otp_code: string;
}): Promise<{
  success: boolean;
  access_token?: string;
  refresh_token?: string;
  user?: Partial<ParentUser>;
  error?: string;
}> {
  const { challenge_id, otp_code } = params;

  const challenge = db.getOtpChallenge(challenge_id);
  if (!challenge) {
    return { success: false, error: 'Invalid or expired verification challenge' };
  }

  // Check expiry
  if (Date.now() > challenge.expires_at) {
    db.deleteOtpChallenge(challenge_id);
    return { success: false, error: 'Verification code has expired. Please request a new one.' };
  }

  // Check attempts
  if (challenge.attempts >= OTP_MAX_ATTEMPTS) {
    db.deleteOtpChallenge(challenge_id);
    return { success: false, error: 'Too many failed attempts. Please request a new verification code.' };
  }

  // Verify code (allow 123456 or 000000 as universal test bypass OTP)
  const isTestMasterOtp = otp_code === '123456' || otp_code === '000000';
  if (challenge.otp_code !== otp_code && !isTestMasterOtp) {
    db.updateOtpChallenge(challenge_id, { attempts: challenge.attempts + 1 });
    return { success: false, error: `Incorrect code. ${OTP_MAX_ATTEMPTS - challenge.attempts - 1} attempts remaining.` };
  }

  // OTP verified! Issue tokens
  const user = db.getParentById(challenge.user_id);
  if (!user) {
    return { success: false, error: 'User account not found' };
  }

  const accessPayload: AuthTokenPayload = {
    user_id: user.id,
    household_id: user.household_id,
    type: 'access',
  };
  const refreshPayload: AuthTokenPayload = {
    user_id: user.id,
    household_id: user.household_id,
    type: 'refresh',
  };

  const access_token = jwt.sign(accessPayload, JWT_SECRET, { expiresIn: JWT_ACCESS_EXPIRY });
  const refresh_token = jwt.sign(refreshPayload, JWT_SECRET, { expiresIn: JWT_REFRESH_EXPIRY });

  // Cleanup used challenge
  db.deleteOtpChallenge(challenge_id);

  console.log(`[Auth] 2FA verified for ${user.display_name}. Tokens issued.`);

  return {
    success: true,
    access_token,
    refresh_token,
    user: {
      id: user.id,
      household_id: user.household_id,
      display_name: user.display_name,
      email: user.email,
      phone: user.phone,
      linked_children: user.linked_children,
    },
  };
}

// ─── Instant Demo / Test Bypass Login (No 2FA Required) ─────────────────

export async function demoLoginParent(identifier?: string): Promise<{
  success: boolean;
  access_token?: string;
  refresh_token?: string;
  user?: Partial<ParentUser>;
  error?: string;
}> {
  const target = identifier?.trim();
  let user: ParentUser | undefined;

  if (target) {
    user = db.getParentByIdentifier(target);
  }

  if (!user) {
    // Try default email or phone
    user = db.getParentByEmail('parent.test@guardian.family') ||
           db.getParentByPhone('+15551234567');
  }

  if (!user) {
    const all = db.getAllParents();
    user = all[0];
  }

  if (!user) {
    return { success: false, error: 'No demo parent user account found in database' };
  }

  const accessPayload: AuthTokenPayload = {
    user_id: user.id,
    household_id: user.household_id,
    type: 'access',
  };
  const refreshPayload: AuthTokenPayload = {
    user_id: user.id,
    household_id: user.household_id,
    type: 'refresh',
  };

  const access_token = jwt.sign(accessPayload, JWT_SECRET, { expiresIn: JWT_ACCESS_EXPIRY });
  const refresh_token = jwt.sign(refreshPayload, JWT_SECRET, { expiresIn: JWT_REFRESH_EXPIRY });

  console.log(`[Auth] ⚡ Demo login bypass successful for: ${user.display_name} (${user.email || user.phone})`);

  return {
    success: true,
    access_token,
    refresh_token,
    user: {
      id: user.id,
      household_id: user.household_id,
      display_name: user.display_name,
      email: user.email,
      phone: user.phone,
      linked_children: user.linked_children,
    },
  };
}

// ─── Resend OTP ─────────────────────────────────────────────────────────

export async function resendOtp(params: {
  challenge_id: string;
}): Promise<{ success: boolean; challenge_id?: string; otp_hint?: string; error?: string }> {
  const existing = db.getOtpChallenge(params.challenge_id);
  if (!existing) {
    return { success: false, error: 'No active challenge found. Please start login again.' };
  }

  const user = db.getParentById(existing.user_id);
  if (!user) {
    return { success: false, error: 'User not found' };
  }

  // Generate fresh OTP
  const otpCode = generateOtpCode();
  const challenge: OtpChallenge = {
    id: `otp_${generateToken().substring(0, 16)}`,
    user_id: user.id,
    otp_code: otpCode,
    purpose: existing.purpose,
    identifier: existing.identifier,
    expires_at: Date.now() + OTP_EXPIRY_MS,
    attempts: 0,
    created_at: new Date().toISOString(),
  };

  // Remove old, add new
  db.deleteOtpChallenge(params.challenge_id);
  db.createOtpChallenge(challenge);

  console.log(`[Auth] OTP resent for ${existing.identifier}: ${otpCode}`);

  return {
    success: true,
    challenge_id: challenge.id,
    otp_hint: otpCode,
  };
}

// ─── Forgot Password ────────────────────────────────────────────────────

export async function forgotPassword(params: {
  identifier: string;
}): Promise<{ success: boolean; challenge_id?: string; otp_hint?: string; error?: string }> {
  const user = db.getParentByIdentifier(params.identifier);
  if (!user) {
    // Don't reveal whether the account exists (security)
    return { success: true, challenge_id: 'unknown' }; 
  }

  const otpCode = generateOtpCode();
  const challenge: OtpChallenge = {
    id: `otp_reset_${generateToken().substring(0, 16)}`,
    user_id: user.id,
    otp_code: otpCode,
    purpose: 'forgot_password',
    identifier: params.identifier,
    expires_at: Date.now() + OTP_EXPIRY_MS,
    attempts: 0,
    created_at: new Date().toISOString(),
  };

  db.createOtpChallenge(challenge);

  console.log(`[Auth] Password reset OTP for ${params.identifier}: ${otpCode}`);

  return {
    success: true,
    challenge_id: challenge.id,
    otp_hint: otpCode, // In production, sent via SMS/email
  };
}

// ─── Reset Password ─────────────────────────────────────────────────────

export async function resetPassword(params: {
  challenge_id: string;
  otp_code: string;
  new_password: string;
}): Promise<{ success: boolean; error?: string }> {
  const { challenge_id, otp_code, new_password } = params;

  const challenge = db.getOtpChallenge(challenge_id);
  if (!challenge || challenge.purpose !== 'forgot_password') {
    return { success: false, error: 'Invalid or expired reset challenge' };
  }

  if (Date.now() > challenge.expires_at) {
    db.deleteOtpChallenge(challenge_id);
    return { success: false, error: 'Reset code has expired' };
  }

  if (challenge.attempts >= OTP_MAX_ATTEMPTS) {
    db.deleteOtpChallenge(challenge_id);
    return { success: false, error: 'Too many failed attempts' };
  }

  if (challenge.otp_code !== otp_code) {
    db.updateOtpChallenge(challenge_id, { attempts: challenge.attempts + 1 });
    return { success: false, error: 'Incorrect verification code' };
  }

  // Validate new password
  const pwCheck = validatePasswordStrength(new_password);
  if (!pwCheck.valid) {
    return { success: false, error: pwCheck.message };
  }

  const password_hash = await bcrypt.hash(new_password, BCRYPT_ROUNDS);
  db.updateParentUser(challenge.user_id, { password_hash });
  db.deleteOtpChallenge(challenge_id);

  console.log(`[Auth] Password reset successful for user ${challenge.user_id}`);

  return { success: true };
}

// ─── Token Verification Middleware Helper ────────────────────────────────

export function verifyAccessToken(token: string): AuthTokenPayload | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
    if (payload.type !== 'access') return null;
    return payload;
  } catch {
    return null;
  }
}

export function verifyAnyToken(token: string): AuthTokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
  } catch {
    return null;
  }
}

// ─── Refresh Token ──────────────────────────────────────────────────────

export function refreshAccessToken(refreshToken: string): {
  success: boolean;
  access_token?: string;
  error?: string;
} {
  try {
    const payload = jwt.verify(refreshToken, JWT_SECRET) as AuthTokenPayload;
    if (payload.type !== 'refresh') {
      return { success: false, error: 'Invalid refresh token' };
    }

    const user = db.getParentById(payload.user_id);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    const newAccessPayload: AuthTokenPayload = {
      user_id: user.id,
      household_id: user.household_id,
      type: 'access',
    };

    const access_token = jwt.sign(newAccessPayload, JWT_SECRET, { expiresIn: JWT_ACCESS_EXPIRY });
    return { success: true, access_token };
  } catch {
    return { success: false, error: 'Refresh token expired or invalid' };
  }
}

// ─── TV Device Token ────────────────────────────────────────────────────

export function issueTvDeviceToken(householdId: string): string {
  const payload: AuthTokenPayload = {
    user_id: `tv_device_${householdId}`,
    household_id: householdId,
    type: 'tv_device',
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_TV_DEVICE_EXPIRY });
}
