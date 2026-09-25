import express from 'express';
import http from 'http';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import apiRouter from './routes/api.js';
import authRouter from './routes/authRoutes.js';
import { preheatContentCatalog } from './services/aiPipeline.js';
import { socketService } from './services/socketService.js';

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

// Initialize WebSocket stream
socketService.init(server);

// Middleware
app.use(cors());
app.use(express.json());

// Serve static Web Dashboard & Testing UI
const webDashboardPath = path.resolve(process.cwd(), '../web-dashboard');
app.use('/dashboard', express.static(webDashboardPath));

// API routes
app.use('/api', apiRouter);
app.use('/api/auth', authRouter);

// Mobile App / QR Companion Pairing Screen
app.get('/pair', (req, res) => {
  const sessionId = (req.query.session as string) || '';
  const code = (req.query.code as string) || '';

  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <title>Guardian • Link Fire TV</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    body {
      background-color: #070A11;
      color: #F8FAFC;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 24px;
    }
    .card {
      background: #0E1626;
      border: 1px solid rgba(255, 153, 0, 0.25);
      border-radius: 24px;
      padding: 32px 24px;
      max-width: 420px;
      width: 100%;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
      text-align: center;
    }
    .logo {
      width: 64px;
      height: 64px;
      margin: 0 auto 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 16px;
      background: rgba(255, 153, 0, 0.1);
      border: 1px solid rgba(255, 153, 0, 0.3);
    }
    .logo svg {
      width: 36px;
      height: 36px;
    }
    h1 {
      font-size: 24px;
      font-weight: 700;
      color: #FFFFFF;
      margin-bottom: 6px;
    }
    .subtitle {
      font-size: 14px;
      color: #94A3B8;
      margin-bottom: 24px;
    }
    .code-badge {
      display: inline-block;
      background: rgba(255, 153, 0, 0.12);
      border: 1px solid #FF9900;
      color: #FF9900;
      font-weight: 700;
      font-size: 18px;
      padding: 8px 18px;
      border-radius: 12px;
      letter-spacing: 2px;
      margin-bottom: 24px;
    }
    .form-group {
      text-align: left;
      margin-bottom: 20px;
    }
    label {
      display: block;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #94A3B8;
      margin-bottom: 8px;
      font-weight: 600;
    }
    input {
      width: 100%;
      background: #141E33;
      border: 1px solid #2A3B5C;
      border-radius: 12px;
      padding: 14px 16px;
      color: #FFFFFF;
      font-size: 16px;
      outline: none;
      transition: border-color 0.2s;
    }
    input:focus {
      border-color: #FF9900;
      box-shadow: 0 0 0 3px rgba(255, 153, 0, 0.2);
    }
    .btn {
      width: 100%;
      background: linear-gradient(135deg, #FF9900, #E68A00);
      border: none;
      border-radius: 12px;
      color: #070A11;
      font-size: 16px;
      font-weight: 700;
      padding: 16px;
      cursor: pointer;
      box-shadow: 0 8px 24px rgba(255, 153, 0, 0.35);
      transition: transform 0.15s, opacity 0.15s;
    }
    .btn:active {
      transform: scale(0.98);
      opacity: 0.9;
    }
    .success-box {
      display: none;
      padding: 24px 12px;
    }
    .success-icon {
      font-size: 52px;
      margin-bottom: 12px;
    }
    .success-title {
      font-size: 20px;
      font-weight: 700;
      color: #38BDF8;
      margin-bottom: 8px;
    }
    .success-desc {
      font-size: 14px;
      color: #94A3B8;
      line-height: 1.5;
    }
    .footer {
      margin-top: 24px;
      font-size: 12px;
      color: #64748B;
    }
  </style>
</head>
<body>
  <div class="card">
    <div id="pairForm">
      <div class="logo">
        <svg viewBox="0 0 24 24" fill="none" stroke="#FF9900" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
      </div>
      <h1>Link Fire TV</h1>
      <p class="subtitle">Guardian Companion Authentication</p>
      
      ${code ? `
      <div class="code-badge" id="codeDisplay">${code}</div>
      <input type="hidden" id="pairingCodeInput" value="${code}" />
      ` : `
      <div class="form-group">
        <label for="pairingCodeInput">TV Pairing Code</label>
        <input type="text" id="pairingCodeInput" placeholder="Enter code shown on TV (e.g. TV-8821)" style="text-transform: uppercase; font-weight: 700; letter-spacing: 2px;" required />
      </div>
      `}

      <div class="form-group">
        <label for="emailInput">Guardian Account Email</label>
        <input type="email" id="emailInput" value="parent@guardian.family" placeholder="Enter your parent email" required />
      </div>

      <button class="btn" id="confirmBtn" onclick="confirmLink()">Approve &amp; Link TV</button>
    </div>

    <div class="success-box" id="successBox">
      <div class="success-icon">🛡️</div>
      <div class="success-title">TV Linked Successfully!</div>
      <p class="success-desc">
        Your Fire TV is now connected with <br><strong style="color: #FF9900;" id="confirmedEmail"></strong>.
        <br><br>Look at your TV screen &mdash; it has automatically logged in.
      </p>
    </div>
  </div>

  <p class="footer">guardian [tv] &bull; Family Media Intelligence</p>

  <script>
    const sessionId = "${sessionId}";
    let pairingCode = "${code}";

    async function confirmLink() {
      const codeInput = document.getElementById('pairingCodeInput');
      const targetCode = (codeInput ? codeInput.value.trim() : '') || pairingCode;
      const email = document.getElementById('emailInput').value.trim();

      if (!targetCode) {
        alert('Please enter the pairing code displayed on your TV');
        return;
      }

      if (!email || !email.includes('@')) {
        alert('Please enter a valid email address');
        return;
      }

      const btn = document.getElementById('confirmBtn');
      btn.disabled = true;
      btn.textContent = 'Linking TV...';

      try {
        const res = await fetch('/api/pairing/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: sessionId || undefined,
            pairingCode: targetCode,
            email: email
          })
        });

        const data = await res.json();
        if (data.success) {
          document.getElementById('pairForm').style.display = 'none';
          document.getElementById('confirmedEmail').textContent = email;
          document.getElementById('successBox').style.display = 'block';
        } else {
          alert('Linking failed: ' + (data.error || 'Invalid session'));
          btn.disabled = false;
          btn.textContent = 'Approve & Link TV';
        }
      } catch (err) {
        alert('Network error connecting to Guardian server: ' + err.message);
        btn.disabled = false;
        btn.textContent = 'Approve & Link TV';
      }
    }
  </script>
</body>
</html>`);
});

// Healthcheck & Root redirect -> redirect to /pair for QR scanner
app.get('/', (_req, res) => {
  res.redirect('/pair');
});

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'Family TV Guardian Intelligence Layer',
    timestamp: new Date().toISOString(),
  });
});

// Start server and preheat catalog
server.listen(PORT, async () => {
  console.log(`=================================================`);
  console.log(`🛡️  Family TV Guardian Backend is running on port ${PORT}`);
  console.log(`📡  API: http://localhost:${PORT}/api`);
  console.log(`🔐  Auth API: http://localhost:${PORT}/api/auth`);
  console.log(`💻  Parent Dashboard: http://localhost:${PORT}/dashboard`);
  console.log(`📱  Mobile App API: http://localhost:${PORT}/api/auth/*`);
  console.log(`=================================================`);

  try {
    await preheatContentCatalog();
    console.log(`✅ Content catalog preheated and intelligence signals loaded.`);
  } catch (err) {
    console.warn('Catalog preheat warning:', err);
  }

  // Seed demo parent user for testing
  try {
    const { registerParent } = await import('./services/authService.js');
    const { db } = await import('./db/database.js');
    const bcrypt = await import('bcryptjs');

    const DEMO_PASSWORD = 'Password123!';
    const demoHash = await bcrypt.hash(DEMO_PASSWORD, 10);

    // Check if demo user already exists
    const existingEmail = db.getParentByEmail('parent.test@guardian.family');
    const existingPhone = db.getParentByPhone('+15551234567');

    if (existingEmail) {
      // Ensure password matches known demo password
      db.updateParentUser(existingEmail.id, { password_hash: demoHash });
      console.log('✅ Demo email user password reset: parent.test@guardian.family / Password123!');
    } else {
      const emailResult = await registerParent({
        identifier: 'parent.test@guardian.family',
        password: DEMO_PASSWORD,
        display_name: 'Demo Parent',
      });
      if (emailResult.success) {
        console.log('✅ Demo email user seeded: parent.test@guardian.family / Password123!');
      }
    }

    if (existingPhone) {
      db.updateParentUser(existingPhone.id, { password_hash: demoHash });
      console.log('✅ Demo phone user password reset: +15551234567 / Password123!');
    } else {
      const phoneResult = await registerParent({
        identifier: '+15551234567',
        password: DEMO_PASSWORD,
        display_name: 'Demo Parent (Phone)',
      });
      if (phoneResult.success) {
        console.log('✅ Demo phone user seeded: +15551234567 / Password123!');
      }
    }
  } catch (err) {
    console.warn('Demo user seeding warning:', err);
  }
});

