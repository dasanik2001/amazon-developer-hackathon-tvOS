import { db } from '../src/db/database.js';
import {
  registerParent,
  loginParent,
  verify2FA,
  generatePairCode,
  issueTvDeviceToken,
  verifyAccessToken,
} from '../src/services/authService.js';
import { TvPairSession } from '../src/types.js';
import crypto from 'crypto';
import QRCode from 'qrcode';

async function runTvPairingFlowTest() {
  console.log('--- STARTING TV QR PAIRING & MOBILE AUTH FLOW TEST ---');
  db.resetAll();

  // Step 1: Parent registers on mobile app
  console.log('\n[Step 1] Parent signs up on mobile app with email/password...');
  const regResult = await registerParent({
    identifier: 'parent.test@guardian.family',
    password: 'SecurePassword123!',
    display_name: 'David Miller',
  });

  if (!regResult.success || !regResult.user) {
    throw new Error(`Registration failed: ${regResult.error}`);
  }
  console.log(`[PASS] Parent registered: ${regResult.user.display_name} (ID: ${regResult.user.id})`);

  // Step 2: Parent logs in and completes 2FA verification on mobile
  console.log('\n[Step 2] Parent logs in and completes 2FA verification on mobile...');
  const loginResult = await loginParent({
    identifier: 'parent.test@guardian.family',
    password: 'SecurePassword123!',
  });

  if (!loginResult.success || !loginResult.challenge_id) {
    throw new Error(`Login failed: ${loginResult.error}`);
  }
  console.log(`       2FA Challenge created: ${loginResult.challenge_id}, dev OTP hint: ${loginResult.otp_hint}`);

  const verifyResult = await verify2FA({
    challenge_id: loginResult.challenge_id,
    otp_code: loginResult.otp_hint || '123456',
  });

  if (!verifyResult.success || !verifyResult.access_token) {
    throw new Error(`2FA verification failed: ${verifyResult.error}`);
  }
  const mobileAccessToken = verifyResult.access_token;
  const decodedToken = verifyAccessToken(mobileAccessToken);
  if (!decodedToken) throw new Error('JWT token invalid');
  console.log(`[PASS] 2FA verified successfully!`);
  console.log(`       JWT Access Token issued (Household: ${decodedToken.household_id})`);

  // Step 3: Fire TV requests pairing session & displays QR code
  console.log('\n[Step 3] Fire TV boots up and generates QR pairing session...');
  const pairToken = `tv_pair_${crypto.randomBytes(16).toString('hex')}`;
  const shortCode = generatePairCode();
  const qrPayload = JSON.stringify({
    type: 'guardian_tv_pair',
    pair_token: pairToken,
    short_code: shortCode,
    server: 'http://localhost:3001',
  });

  const qrDataUrl = await QRCode.toDataURL(qrPayload, { width: 360 });
  const qrSvg = await QRCode.toString(qrPayload, { type: 'svg' });

  const session: TvPairSession = {
    id: pairToken,
    short_code: shortCode,
    qr_payload: qrPayload,
    qr_data_url: qrDataUrl,
    status: 'pending',
    device_name: 'Living Room Fire TV Stick 4K',
    created_at: new Date().toISOString(),
    expires_at: Date.now() + 10 * 60 * 1000,
  };
  db.createTvPairSession(session);

  console.log(`[PASS] TV pairing session created:`);
  console.log(`       Short Code: ${session.short_code}`);
  console.log(`       Pair Token: ${session.id.substring(0, 24)}...`);
  console.log(`       QR Data URL generated (${qrDataUrl.length} chars)`);
  console.log(`       QR SVG generated (${qrSvg.length} chars)`);

  // Step 4: Mobile scans TV QR code and approves pairing
  console.log('\n[Step 4] Mobile app scans TV QR and approves pairing...');
  // Simulate mobile parsing QR payload and approving
  const parsed = JSON.parse(qrPayload);
  const foundSession = db.getTvPairSession(parsed.pair_token);
  if (!foundSession || foundSession.status !== 'pending') {
    throw new Error('TV session not found or not pending');
  }

  const tvDeviceToken = issueTvDeviceToken(decodedToken.household_id);
  const approvedSession = db.updateTvPairSession(foundSession.id, {
    status: 'approved',
    household_id: decodedToken.household_id,
    approved_by: decodedToken.user_id,
    device_token: tvDeviceToken,
    approved_at: new Date().toISOString(),
  });

  if (!approvedSession || approvedSession.status !== 'approved') {
    throw new Error('Approval failed');
  }
  console.log(`[PASS] Fire TV approved and bound to household: ${approvedSession.household_id}`);
  console.log(`       TV Device Token issued: ${tvDeviceToken.substring(0, 28)}...`);

  // Step 5: Check Fire TV device status from TV side
  console.log('\n[Step 5] Checking TV pairing status from TV poll/socket...');
  const tvCheck = db.getTvPairSession(pairToken);
  if (!tvCheck || tvCheck.status !== 'approved') {
    throw new Error('TV check did not return approved');
  }
  console.log(`[PASS] TV is authenticated: Status=${tvCheck.status}, Device=${tvCheck.device_name}`);

  // Step 6: Mobile lists linked TV devices
  console.log('\n[Step 6] Mobile app queries linked TV devices...');
  const linkedDevices = db.getLinkedTvDevices(decodedToken.household_id);
  console.log(`[PASS] Household has ${linkedDevices.length} linked TV(s):`);
  linkedDevices.forEach((dev) => {
    console.log(`       - ${dev.device_name} (Code: ${dev.short_code}, Status: ${dev.status})`);
  });
  if (linkedDevices.length === 0) throw new Error('No linked devices found');

  // Step 7: Mobile disconnects TV
  console.log('\n[Step 7] Mobile unlinks Fire TV...');
  db.updateTvPairSession(pairToken, { status: 'expired' });
  const remaining = db.getLinkedTvDevices(decodedToken.household_id);
  console.log(`[PASS] TV disconnected. Remaining linked TVs: ${remaining.length}`);

  console.log('\n======================================================');
  console.log('✅ ALL TV QR SCAN & AUTHENTICATION TESTS PASSED!');
  console.log('======================================================\n');
}

runTvPairingFlowTest().catch((err) => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
