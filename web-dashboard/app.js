const API_BASE = window.location.origin.includes('3001')
  ? `${window.location.origin}/api`
  : 'http://localhost:3001/api';

let activeChildId = 'child_aarav';
let currentDigest = null;
let currentCatalog = [];
let socket = null;
let isMonitoringEnabled = true;

// Initialize Dashboard & Real-Time TV WebSocket
document.addEventListener('DOMContentLoaded', async () => {
  initWebSocket();
  await loadProfiles();
  await loadMonitoringControlState();
  await initTvPairing();
  await refreshDashboard();
  await loadRecentFrames();

  // Background fallback sync every 30s
  setInterval(async () => {
    await refreshDashboard();
  }, 30000);
});

// Real-Time WebSocket Connection to TV App & Guardian Server
function initWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host || 'localhost:3001';
  const wsUrl = `${protocol}//${host}/ws`;

  console.log('[WebSocket] Connecting to:', wsUrl);
  socket = new WebSocket(wsUrl);

  const statusBadge = document.getElementById('ws-status');
  const statusText = document.getElementById('ws-status-text');

  socket.onopen = () => {
    console.log('⚡ [WebSocket] Realtime TV connection established');
    if (statusBadge) statusBadge.classList.remove('disconnected');
    if (statusText) statusText.textContent = 'Live TV Socket: Connected';
  };

  socket.onmessage = async (event) => {
    try {
      const msg = JSON.parse(event.data);
      console.log('[WebSocket] Realtime event:', msg.type, msg.data);
      handleLiveSocketEvent(msg);
    } catch (e) {
      console.error('[WebSocket] Message parse error:', e);
    }
  };

  socket.onclose = () => {
    console.warn('[WebSocket] Realtime TV connection lost. Reconnecting in 3s...');
    if (statusBadge) statusBadge.classList.add('disconnected');
    if (statusText) statusText.textContent = 'Live TV Socket: Reconnecting...';
    setTimeout(initWebSocket, 3000);
  };

  socket.onerror = (err) => {
    console.warn('[WebSocket] Error:', err);
    socket.close();
  };
}

// Handle incoming realtime events from TV
function handleLiveSocketEvent(msg) {
  const { type, data } = msg;

  if (type === 'monitoring:state') {
    const enabled = data?.enabled ?? true;
    updateMonitoringUI(enabled);
  } else if (type === 'app:active') {
    const activeLabel = document.getElementById('overlay-active-app');
    if (activeLabel && data.app_name) {
      activeLabel.textContent = `${data.app_name} (Active on TV)`;
      activeLabel.style.color = '#38bdf8';
    }
  } else if (type === 'frame:new' || type === 'frame:ingested') {
    // 1. Immediately prepend frame to live feed with highlight animation
    if (data.frame) {
      prependFrameToLiveFeed(data.frame);
    }
    // 2. Immediately update digest
    if (data.digest) {
      renderDigest(data.digest);
    } else {
      refreshDashboard();
    }
    // 3. Update active app and title
    const activeLabel = document.getElementById('overlay-active-app');
    if (activeLabel) {
      const app = data.app || data.frame?.app_name || 'TV App';
      const title = data.title || data.frame?.media_title || '';
      activeLabel.textContent = `${app} • Playing "${title}"`;
      activeLabel.style.color = 'var(--accent-orange)';
    }
  } else if (type === 'session:updated' || type === 'digest:updated') {
    if (data.digest) {
      renderDigest(data.digest);
    } else {
      refreshDashboard();
    }
  } else if (type === 'tv:authorized') {
    handleTvAuthorized(data);
  } else if (type === 'tv:unpaired') {
    handleTvUnpaired();
  } else if (type === 'remote:command') {
    handleRemoteCommandOnTv(data);
  }
}

// Prepend live frame into feed with animated highlight
function prependFrameToLiveFeed(f) {
  const container = document.getElementById('frame-feed-list');
  if (!container) return;

  // Clear empty state placeholder
  if (container.children.length === 1 && container.children[0].tagName === 'SPAN') {
    container.innerHTML = '';
  }

  const timeStr = new Date(f.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const row = document.createElement('div');
  row.className = 'frame-item-new';
  row.style.background = 'var(--bg-card)';
  row.style.padding = '8px 12px';
  row.style.borderRadius = '6px';
  row.style.borderLeft = '3px solid var(--accent-orange)';
  row.style.fontSize = '0.84rem';
  row.style.marginBottom = '6px';
  row.innerHTML = `
    <div style="display:flex; justify-content:space-between; margin-bottom:2px;">
      <strong style="color:#ffffff;">📺 ${f.app_name} <span style="font-size:0.75rem; color:#4ade80; font-weight:normal;">[LIVE⚡]</span></strong>
      <span style="color:var(--text-muted); font-size:0.75rem;">${timeStr}</span>
    </div>
    <div style="color:var(--text-primary); font-weight:600;">"${f.media_title}"</div>
    <div style="color:var(--text-secondary); font-size:0.78rem; margin-top:2px;">
      Topics: <span style="color:var(--accent-blue);">${f.analysis?.topics?.join(', ') || 'General'}</span> • Score: ${f.analysis?.educational_score || 50}/100
    </div>
  `;
  container.prepend(row);

  while (container.children.length > 15) {
    container.removeChild(container.lastChild);
  }
}

// Parental Control Monitoring State & Remote Toggle
async function loadMonitoringControlState() {
  try {
    const res = await fetch(`${API_BASE}/overlay/control`);
    const data = await res.json();
    if (data.success) {
      isMonitoringEnabled = Boolean(data.enabled);
      updateMonitoringUI(isMonitoringEnabled);
      if (data.current_app && data.current_app.app_name) {
        const activeLabel = document.getElementById('overlay-active-app');
        if (activeLabel) {
          activeLabel.textContent = `${data.current_app.app_name} (Active on TV)`;
          activeLabel.style.color = '#38bdf8';
        }
      }
    }
  } catch (err) {
    console.error('Failed to fetch monitoring control state:', err);
  }
}

async function toggleParentalMonitoring() {
  const newState = !isMonitoringEnabled;
  try {
    const res = await fetch(`${API_BASE}/overlay/control`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        enabled: newState,
        child_id: activeChildId,
      }),
    });
    const data = await res.json();
    if (data.success) {
      isMonitoringEnabled = data.enabled;
      updateMonitoringUI(isMonitoringEnabled);
    }
  } catch (err) {
    console.error('Failed to toggle parental monitoring:', err);
  }
}

function updateMonitoringUI(enabled) {
  isMonitoringEnabled = enabled;
  const btn = document.getElementById('btn-toggle-monitor');
  const btnIcon = document.getElementById('btn-monitor-icon');
  const btnText = document.getElementById('btn-monitor-text');
  const pill = document.getElementById('monitoring-status-pill');
  const desc = document.getElementById('monitoring-desc-text');
  const simIcon = document.getElementById('sim-icon');

  if (enabled) {
    if (btn) {
      btn.className = 'btn btn-monitor-active';
    }
    if (btnIcon) btnIcon.textContent = '🛡️';
    if (btnText) btnText.textContent = 'Monitoring Enabled';
    if (pill) {
      pill.className = 'badge-status-on';
      pill.textContent = '● MONITORING ACTIVE';
    }
    if (desc) desc.textContent = 'Sampling TV screen metadata every 120s into RAG';
    if (simIcon) simIcon.textContent = '🛡️';
  } else {
    if (btn) {
      btn.className = 'btn btn-monitor-paused';
    }
    if (btnIcon) btnIcon.textContent = '⏸️';
    if (btnText) btnText.textContent = 'Monitoring Paused (Click to Start)';
    if (pill) {
      pill.className = 'badge-status-off';
      pill.textContent = '○ MONITORING PAUSED';
    }
    if (desc) desc.textContent = 'TV background sampling paused. Zero metadata being recorded.';
    if (simIcon) simIcon.textContent = '⏸️';
  }
}

// Load Child Profiles
async function loadProfiles() {
  try {
    const res = await fetch(`${API_BASE}/children`);
    const data = await res.json();
    if (data.success && data.data.length > 0) {
      const select = document.getElementById('child-select');
      select.innerHTML = '';
      data.data.forEach((child) => {
        const option = document.createElement('option');
        option.value = child.id;
        option.textContent = `${child.avatar || '👤'} ${child.display_name} (Age: ${child.age_band})`;
        select.appendChild(option);
      });
      activeChildId = data.data[0].id;

      select.addEventListener('change', async (e) => {
        activeChildId = e.target.value;
        await refreshDashboard();
      });
    }
  } catch (err) {
    console.error('Failed to load child profiles:', err);
  }
}

// Refresh Dashboard Data (P0 Daily Digest, Categories, Topics, Flags)
function getLocalDateString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function refreshDashboard() {
  try {
    const today = getLocalDateString();
    const res = await fetch(`${API_BASE}/digest/${activeChildId}?date=${today}`);
    const result = await res.json();

    if (result.success) {
      currentDigest = result.data;
      renderDigest(currentDigest);
    }
  } catch (err) {
    console.error('Failed to refresh dashboard:', err);
  }
}

// Render Daily Digest
function renderDigest(digest) {
  document.getElementById('digest-date').textContent = digest.date || 'Today';
  document.getElementById('briefing-summary').textContent = digest.generated_summary;
  document.getElementById('total-time').textContent = `${digest.total_minutes} min`;

  const cartoonMinutes = digest.category_minutes['Cartoon'] || 0;
  const cartoonElem = document.getElementById('cartoon-time');
  if (cartoonElem) cartoonElem.textContent = `${cartoonMinutes} min`;

  const eduMinutes = digest.category_minutes['Educational'] || 0;
  document.getElementById('edu-time').textContent = `${eduMinutes} min`;

  // Render Category Breakdown Bars
  const barsContainer = document.getElementById('category-bars');
  barsContainer.innerHTML = '';

  const categories = Object.entries(digest.category_minutes);
  if (categories.length === 0) {
    barsContainer.innerHTML = '<span class="text-secondary" style="font-size:0.85rem">No viewing activity recorded yet.</span>';
  } else {
    categories.forEach(([cat, mins]) => {
      const percent = digest.total_minutes > 0 ? Math.round((mins / digest.total_minutes) * 100) : 0;
      const catLower = cat.toLowerCase();
      let color = 'var(--accent-blue)';
      let icon = '🎬';
      if (catLower === 'cartoon' || catLower === 'animation') {
        color = '#a855f7';
        icon = '🎨';
      } else if (catLower === 'educational') {
        color = 'var(--accent-emerald)';
        icon = '🌱';
      }

      const row = document.createElement('div');
      row.className = 'cat-bar-row';
      row.innerHTML = `
        <div class="cat-bar-header">
          <span>${icon} ${cat}</span>
          <span>${mins} min (${percent}%)</span>
        </div>
        <div class="progress-track">
          <div class="progress-fill" style="width: ${percent}%; background: ${color};"></div>
        </div>
      `;
      barsContainer.appendChild(row);
    });
  }

  // Render Extracted Topics (P0)
  const topicContainer = document.getElementById('topic-chips');
  topicContainer.innerHTML = '';
  if (digest.top_topics.length === 0) {
    topicContainer.innerHTML = '<span style="color:var(--text-muted); font-size:0.85rem">No topics detected yet.</span>';
  } else {
    digest.top_topics.forEach((topic) => {
      const chip = document.createElement('span');
      chip.className = 'topic-chip';
      chip.textContent = topic;
      topicContainer.appendChild(chip);
    });
  }

  // Render Notable Items & Safety Signals (P0)
  const notableContainer = document.getElementById('notable-list');
  notableContainer.innerHTML = '';
  if (digest.notable_items.length === 0) {
    notableContainer.innerHTML = `
      <div class="notable-item highlight">
        <span style="font-size:1.2rem">✅</span>
        <div>
          <div class="notable-title">All Content Family-Friendly</div>
          <div class="notable-reason">No sensitive themes, violence, or concerning language detected.</div>
        </div>
      </div>
    `;
  } else {
    digest.notable_items.forEach((item) => {
      const isConcern = item.flag_type === 'potential_concern';
      const el = document.createElement('div');
      el.className = `notable-item ${isConcern ? 'concern' : 'highlight'}`;
      el.innerHTML = `
        <span style="font-size:1.2rem">${isConcern ? '⚠️' : '🌟'}</span>
        <div>
          <div class="notable-title">${item.title}</div>
          <div class="notable-reason">${item.reason}</div>
        </div>
      `;
      notableContainer.appendChild(el);
    });
  }
}

// Parent Q&A (P0 Grounded RAG)
async function submitQuestion() {
  const input = document.getElementById('qa-input');
  const question = input.value.trim();
  if (!question) return;
  await askQuestion(question);
  input.value = '';
}

function handleKeyPress(e) {
  if (e.key === 'Enter') {
    submitQuestion();
  }
}

async function askQuestion(question) {
  const history = document.getElementById('qa-history');
  const btn = document.getElementById('btn-ask');

  // Clear empty state if present
  const emptyState = history.querySelector('.qa-empty-state');
  if (emptyState) emptyState.remove();

  // Create loading placeholder
  const loadingBubble = document.createElement('div');
  loadingBubble.className = 'qa-bubble';
  loadingBubble.innerHTML = `
    <div class="qa-query">Q: "${question}"</div>
    <div class="qa-response" style="color: var(--text-muted);">Consulting viewing evidence & Bedrock AI...</div>
  `;
  history.prepend(loadingBubble);
  btn.disabled = true;

  try {
    const res = await fetch(`${API_BASE}/ai/qa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        child_id: activeChildId,
        question,
        date: getLocalDateString(),
      }),
    });

    const result = await res.json();
    if (result.success) {
      const data = result.data;
      let evidenceHtml = '';
      if (data.evidence_sessions && data.evidence_sessions.length > 0) {
        evidenceHtml = `
          <div class="evidence-header">Verified Evidence from Fire TV Sessions:</div>
          <div class="evidence-cards">
            ${data.evidence_sessions
              .map(
                (ev) => `
              <div class="evidence-card">
                <strong>🎬 ${ev.title} (${ev.duration_min} min)</strong>
                <span>Category: ${ev.category} • Topics: ${ev.topics.join(', ') || 'N/A'}</span>
              </div>
            `,
              )
              .join('')}
          </div>
        `;
      }

      loadingBubble.innerHTML = `
        <div class="qa-query">Q: "${data.question}"</div>
        <div class="qa-response">${data.answer}</div>
        ${evidenceHtml}
      `;
    } else {
      loadingBubble.innerHTML = `
        <div class="qa-query">Q: "${question}"</div>
        <div class="qa-response" style="color:var(--accent-rose);">Error: ${result.error}</div>
      `;
    }
  } catch (err) {
    loadingBubble.innerHTML = `
      <div class="qa-query">Q: "${question}"</div>
      <div class="qa-response" style="color:var(--accent-rose);">Network error contacting AI service.</div>
    `;
  } finally {
    btn.disabled = false;
  }
}

// Real-Life Scenario Simulator
async function runScenario(scenario) {
  try {
    const res = await fetch(`${API_BASE}/demo/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scenario,
        child_id: activeChildId,
      }),
    });

    const result = await res.json();
    if (result.success) {
      await refreshDashboard();
      if (scenario === 'reset') {
        document.getElementById('qa-history').innerHTML = `
          <div class="qa-empty-state">
            <div class="ai-avatar">💡</div>
            <p>History cleared. Click a suggested prompt or simulate a scenario above to test.</p>
          </div>
        `;
      }
    }
  } catch (err) {
    console.error('Failed to run scenario:', err);
  }
}

// Catalog & Mini Player Simulator
async function loadCatalog() {
  try {
    const res = await fetch(`${API_BASE}/catalog`);
    const data = await res.json();
    if (data.success) {
      currentCatalog = data.data;
      renderCatalog(currentCatalog);
    }
  } catch (err) {
    console.error('Failed to load catalog:', err);
  }
}

function renderCatalog(catalog) {
  const container = document.getElementById('catalog-list');
  container.innerHTML = '';

  catalog.forEach((item) => {
    const el = document.createElement('div');
    el.className = 'catalog-item-card';
    el.innerHTML = `
      <img src="${item.poster_url}" alt="${item.title}" />
      <div class="catalog-item-info">
        <h4>${item.title}</h4>
        <p>${item.provider} • ${Math.round(item.duration_sec / 60)} min</p>
        <div>
          <span class="tag-badge">${item.category}</span>
          ${item.genres.map((g) => `<span class="tag-badge">${g}</span>`).join('')}
        </div>
      </div>
      <button class="btn btn-primary" onclick="watchDemoItem('${item.id}', '${item.title.replace(/'/g, "\\'")}', '${item.category}')">▶ Watch & Track</button>
    `;
    container.appendChild(el);
  });
}

// Simulate watching an item directly from catalog
async function watchDemoItem(contentId, title, category) {
  try {
    const res = await fetch(`${API_BASE}/events/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        child_id: activeChildId,
        content_id: contentId,
        title,
        category,
        duration_sec: 900, // 15 mins
        completed: true,
      }),
    });

    const result = await res.json();
    if (result.success) {
      await refreshDashboard();
    }
  } catch (err) {
    console.error('Failed to record session event:', err);
  }
}

// Sample external app 2-minute frame
async function sampleApp(appName, appPackage, mediaTitle, textSnippets) {
  const activeLabel = document.getElementById('overlay-active-app');
  if (activeLabel) activeLabel.textContent = appName;

  try {
    const res = await fetch(`${API_BASE}/overlay/ingest-frame`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        child_id: activeChildId,
        app_name: appName,
        app_package: appPackage,
        media_title: mediaTitle,
        text_snippets: textSnippets,
        duration_increment_sec: 120, // 2-min sample
      }),
    });

    const result = await res.json();
    if (result.success) {
      await refreshDashboard();
      await loadRecentFrames();
    }
  } catch (err) {
    console.error('Failed to ingest external app frame:', err);
  }
}

// Load recent 2-minute frame context snapshots
async function loadRecentFrames() {
  const container = document.getElementById('frame-feed-list');
  if (!container) return;

  try {
    const res = await fetch(`${API_BASE}/overlay/frames?child_id=${activeChildId}&limit=10`);
    const result = await res.json();
    if (result.success) {
      const frames = result.data;
      if (frames.length === 0) {
        container.innerHTML = '<span style="color:var(--text-muted); font-size:0.85rem">No frames captured yet. Start playing media on your Fire TV / YouTube emulator to ingest live data.</span>';
      } else {
        container.innerHTML = '';
        frames.forEach((f) => {
          const timeStr = new Date(f.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const row = document.createElement('div');
          row.style.background = 'var(--bg-card)';
          row.style.padding = '8px 12px';
          row.style.borderRadius = '6px';
          row.style.borderLeft = '3px solid var(--accent-orange)';
          row.style.fontSize = '0.84rem';
          row.innerHTML = `
            <div style="display:flex; justify-content:space-between; margin-bottom:2px;">
              <strong style="color:#ffffff;">📺 ${f.app_name}</strong>
              <span style="color:var(--text-muted); font-size:0.75rem;">${timeStr} (2m sample)</span>
            </div>
            <div style="color:var(--text-primary); font-weight:600;">"${f.media_title}"</div>
            <div style="color:var(--text-secondary); font-size:0.78rem; margin-top:2px;">
              Topics: <span style="color:var(--accent-blue);">${f.analysis?.topics?.join(', ') || 'General'}</span> • Score: ${f.analysis?.educational_score || 50}/100
            </div>
          `;
          container.appendChild(row);
        });
      }
    }
  } catch (err) {
    console.error('Failed to load frames:', err);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// FIRE TV QR CODE PAIRING & AUTHENTICATION CONTROLLER
// ═══════════════════════════════════════════════════════════════════════════

let currentTvPairSession = null;
let tvCountdownInterval = null;

async function initTvPairing() {
  try {
    const res = await fetch(`${API_BASE}/auth/tv-pair/active`);
    if (res.ok) {
      const json = await res.json();
      if (json.data && json.data.status === 'approved') {
        renderTvConnected(json.data);
        return;
      }
    }
    await initiateTvPairing();
  } catch (err) {
    console.warn('[TV Pair] Init error:', err);
    await initiateTvPairing();
  }
}

async function initiateTvPairing(forceNew = false) {
  try {
    const res = await fetch(`${API_BASE}/auth/tv-pair/initiate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device_name: 'Living Room Fire TV' })
    });
    const json = await res.json();
    if (json.success && json.data) {
      currentTvPairSession = json.data;
      renderTvPairingMode(json.data);
    }
  } catch (err) {
    console.error('[TV Pair] Initiate error:', err);
  }
}

function renderTvPairingMode(session) {
  const pairingView = document.getElementById('tv-pairing-view');
  const connectedView = document.getElementById('tv-connected-view');
  const statusLabel = document.getElementById('tv-status-label');
  const statusDot = document.getElementById('tv-status-dot');
  const qrImg = document.getElementById('tv-qr-image');
  const shortCode = document.getElementById('tv-short-code');

  if (pairingView) pairingView.style.display = 'flex';
  if (connectedView) connectedView.style.display = 'none';
  if (statusLabel) statusLabel.textContent = 'Pairing Mode Active';
  if (statusDot) {
    statusDot.className = 'tv-status-dot pulsing';
    statusDot.style.background = 'var(--accent-orange)';
  }

  if (qrImg) {
    qrImg.src = session.qr_data_url || `${API_BASE}/auth/tv-pair/qr/${session.pair_token}`;
  }
  if (shortCode) {
    shortCode.textContent = session.short_code || 'GARD-892';
  }

  startTvExpiryTimer(session.expires_in_seconds || 600);
}

function renderTvConnected(data) {
  if (tvCountdownInterval) clearInterval(tvCountdownInterval);

  const pairingView = document.getElementById('tv-pairing-view');
  const connectedView = document.getElementById('tv-connected-view');
  const statusLabel = document.getElementById('tv-status-label');
  const statusDot = document.getElementById('tv-status-dot');
  const parentName = document.getElementById('tv-parent-name');
  const householdId = document.getElementById('tv-household-id');
  const activeChild = document.getElementById('tv-active-child');

  if (pairingView) pairingView.style.display = 'none';
  if (connectedView) connectedView.style.display = 'block';
  if (statusLabel) statusLabel.textContent = '● Authenticated & Active';
  if (statusDot) {
    statusDot.className = 'tv-status-dot';
    statusDot.style.background = 'var(--accent-emerald)';
  }

  if (parentName) parentName.textContent = data.parent_name || 'Sarah Jenkins (Parent)';
  if (householdId) householdId.textContent = data.household_id || 'hh_guardian_01';
  if (activeChild) {
    const childName = (data.children && data.children[0]?.display_name) || 'Aarav (Age 8)';
    activeChild.textContent = childName;
  }
}

function handleTvAuthorized(data) {
  console.log('🎉 [TV] Authorized by mobile device!', data);
  currentTvPairSession = data;
  renderTvConnected(data);
}

function handleTvUnpaired() {
  console.log('[TV] Unpaired by parent');
  currentTvPairSession = null;
  initiateTvPairing(true);
}

function handleRemoteCommandOnTv(cmd) {
  const banner = document.getElementById('tv-command-banner');
  const icon = document.getElementById('tv-command-icon');
  const text = document.getElementById('tv-command-text');
  if (!banner || !icon || !text) return;

  const commandMap = {
    pause: { icon: '⏸️', text: 'Parent PAUSED Fire TV viewing from mobile app' },
    resume: { icon: '▶️', text: 'Parent RESUMED Fire TV viewing from mobile app' },
    bedtime: { icon: '🌙', text: 'BEDTIME LOCK activated by parent — Screen is locked!' },
    extend_time: { icon: '⏱️', text: 'Parent granted +15 minutes of additional screen time!' },
    lock: { icon: '🔒', text: 'Screen Locked by Parent Guardian' },
  };

  const info = commandMap[cmd.command] || { icon: '🎮', text: `Command: ${cmd.command}` };
  icon.textContent = info.icon;
  text.textContent = info.text;

  banner.style.display = 'inline-flex';

  setTimeout(() => {
    banner.style.display = 'none';
  }, 6000);
}

function startTvExpiryTimer(seconds) {
  if (tvCountdownInterval) clearInterval(tvCountdownInterval);
  let remaining = seconds;
  const timerEl = document.getElementById('tv-expiry-timer');

  const update = () => {
    if (!timerEl) return;
    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;
    timerEl.textContent = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    if (remaining <= 0) {
      clearInterval(tvCountdownInterval);
      timerEl.textContent = 'Expired';
      initiateTvPairing(true);
    }
    remaining--;
  };

  update();
  tvCountdownInterval = setInterval(update, 1000);
}

// 1-Click Simulator Demo for Mobile Scan & TV Login
async function simulateMobileScan() {
  if (!currentTvPairSession) {
    await initiateTvPairing();
  }

  try {
    // 1. Sign up / login a parent on behalf of the mobile test
    const loginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'sarah@guardian.family', password: 'Password123!' })
    });

    let token = '';
    if (loginRes.ok) {
      const loginData = await loginRes.json();
      if (loginData.challenge_id) {
        // Complete 2FA
        const otp = loginData.dev_otp || '123456';
        const verifyRes = await fetch(`${API_BASE}/auth/verify-2fa`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ challenge_id: loginData.challenge_id, otp_code: otp })
        });
        const verifyData = await verifyRes.json();
        token = verifyData.tokens?.access_token;
      }
    }

    if (!token) {
      // Register new parent if not exists
      const regRes = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: `parent_${Date.now()}@guardian.family`,
          password: 'Password123!',
          display_name: 'Sarah Jenkins'
        })
      });
      const regData = await regRes.json();
      const otp = regData.dev_otp || '123456';
      const verifyRes = await fetch(`${API_BASE}/auth/verify-2fa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challenge_id: regData.challenge_id, otp_code: otp })
      });
      const verifyData = await verifyRes.json();
      token = verifyData.tokens?.access_token;
    }

    // 2. Approve pairing with token
    const approveRes = await fetch(`${API_BASE}/auth/tv-pair/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        pair_token: currentTvPairSession.pair_token,
        short_code: currentTvPairSession.short_code
      })
    });

    const approveData = await approveRes.json();
    if (approveData.success) {
      console.log('✅ [Simulate] Mobile scan successful!');
    }
  } catch (err) {
    console.error('[Simulate] Scan error:', err);
  }
}

async function unlinkTvDevice() {
  if (currentTvPairSession && currentTvPairSession.pair_token) {
    try {
      await fetch(`${API_BASE}/auth/tv-pair/disconnect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pair_token: currentTvPairSession.pair_token })
      });
    } catch {}
  }
  handleTvUnpaired();
}

