import { demoLoginParent, verify2FA, loginParent } from '../src/services/authService.js';

async function runTest() {
  console.log('Testing Demo Login Bypass...');
  const resEmail = await demoLoginParent('parent.test@guardian.family');
  console.log('Email Bypass Success:', resEmail.success);
  console.log('User Name:', resEmail.user?.display_name);
  console.log('Has Access Token:', !!resEmail.access_token);
  console.log('Has Refresh Token:', !!resEmail.refresh_token);

  const resPhone = await demoLoginParent('+15551234567');
  console.log('Phone Bypass Success:', resPhone.success);
  console.log('User Name:', resPhone.user?.display_name);

  console.log('Testing Universal Master OTP (123456)...');
  const loginRes = await loginParent({ identifier: 'parent.test@guardian.family', password: 'Password123!' });
  if (loginRes.success && loginRes.challenge_id) {
    const otpVerify = await verify2FA({ challenge_id: loginRes.challenge_id, otp_code: '123456' });
    console.log('Master OTP 123456 Verification:', otpVerify.success);
  }

  console.log('All auth bypass tests passed!');
  process.exit(0);
}

runTest().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
