import express from 'express';
import http from 'http';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import apiRouter from './routes/api.js';
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

// Healthcheck & Root redirect
app.get('/', (_req, res) => {
  res.redirect('/dashboard');
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
  console.log(`💻  Parent Dashboard: http://localhost:${PORT}/dashboard`);
  console.log(`=================================================`);

  try {
    await preheatContentCatalog();
    console.log(`✅ Content catalog preheated and intelligence signals loaded.`);
  } catch (err) {
    console.warn('Catalog preheat warning:', err);
  }
});
