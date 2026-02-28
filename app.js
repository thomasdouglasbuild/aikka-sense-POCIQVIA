/* ═══════════════════════════════════════════════════════════════════════════
   AIKKA SENSE v3.1 — Application Logic
   Figma-accurate Light UI · All API integrations preserved
   ═══════════════════════════════════════════════════════════════════════════ */

'use strict';

// ─── CONFIG ────────────────────────────────────────────────────────────────────
const CGI_BIN = "__CGI_BIN__";
const API = `${CGI_BIN}/api.py`;
const OPENALEX_BASE = 'https://api.openalex.org';
const OPENALEX_EMAIL = 'contact@thomasdouglas.fr';
const TRIALS_BASE = 'https://clinicaltrials.gov/api/v2';

// ─── CHART PALETTE (Figma-aligned) ────────────────────────────────────────────
const PALETTE = {
  pink:    '#F472B6',
  teal:    '#06B6D4',
  green:   '#22C55E',
  yellow:  '#EAB308',
  orange:  '#F97316',
  blue:    '#60A5FA',
  purple:  '#A78BFA',
  cyan:    '#00E1FF',
  muted:   '#9CA3AF',
  dark:    '#111111',
  pinkA:   'rgba(244,114,182,0.15)',
  tealA:   'rgba(6,182,212,0.15)',
  blueA:   'rgba(96,165,250,0.15)',
  purpleA: 'rgba(167,139,250,0.15)',
};

// ─── BOARD MANAGEMENT ─────────────────────────────────────────────────────────
const boards = [
  {
    id: 'ledaga-ctcl-fr',
    name: 'Ledaga CTCL France',
    area: 'Dermatology',
    indication: 'Cutaneous T-cell lymphoma',
    geo: 'France',
    brand: 'Ledaga (chlormethine)',
    status: 'active',
    created: '2026-01-15',
    sources: ['openalex', 'clinicaltrials', 'pharmageo', 'visibrain'],
  }
];
let activeBoard = boards[0];

function getBoardLabel(board) {
  return `${board.brand.split(' ')[0]} · ${board.indication.split(' ').slice(0,3).join(' ')} · ${board.geo}`;
}

function updateBoardUI() {
  const label = getBoardLabel(activeBoard);
  const short = `${activeBoard.brand.split(' ')[0]} · ${activeBoard.geo}`;
  setEl('boardSelectorText', label);
  setEl('sidebarBoardName', short);
  setEl('dashBoardLabel', label);
}

function renderBoardDropdown() {
  const dd = document.getElementById('boardDropdown');
  if (!dd) return;
  dd.innerHTML = boards.map(b => `
    <div class="board-dropdown-item ${b.id === activeBoard.id ? 'selected' : ''}" data-board-id="${b.id}">
      <svg width="8" height="8" viewBox="0 0 8 8"><circle cx="4" cy="4" r="3.5" fill="${b.id === activeBoard.id ? '#22C55E' : '#9CA3AF'}"/></svg>
      <span>${getBoardLabel(b)}</span>
    </div>
  `).join('') + `
    <div style="border-top:1px solid var(--border);margin:4px 0;"></div>
    <div class="board-dropdown-item" id="ddCreateBoard">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1V11M1 6H11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
      New Board
    </div>
  `;

  dd.querySelectorAll('[data-board-id]').forEach(item => {
    item.addEventListener('click', () => {
      const b = boards.find(x => x.id === item.dataset.boardId);
      if (b) { activeBoard = b; updateBoardUI(); renderBoardDropdown(); }
      dd.classList.remove('open');
    });
  });
  document.getElementById('ddCreateBoard')?.addEventListener('click', () => {
    dd.classList.remove('open');
    openBoardModal();
  });
}

// ─── BOARD CREATION WIZARD ────────────────────────────────────────────────────
let boardWizardStep = 1;
const BOARD_WIZARD_STEPS = 7;
let newBoardData = {};

function openBoardModal() {
  boardWizardStep = 1;
  newBoardData = {};
  document.getElementById('boardModal')?.classList.remove('hidden');
  renderBoardWizardStep();
}

function closeBoardModal() {
  document.getElementById('boardModal')?.classList.add('hidden');
}

function renderBoardWizardStep() {
  const dotsEl = document.getElementById('boardWizardDots');
  const bodyEl = document.getElementById('boardWizardBody');
  const prevBtn = document.getElementById('boardWizardPrev');
  const nextBtn = document.getElementById('boardWizardNext');
  if (!bodyEl) return;

  // Dots
  if (dotsEl) {
    dotsEl.innerHTML = Array.from({length: BOARD_WIZARD_STEPS}, (_, i) => {
      const n = i + 1;
      const cls = n < boardWizardStep ? 'done' : n === boardWizardStep ? 'active' : '';
      return `<div class="wizard-step-dot ${cls}"></div>${n < BOARD_WIZARD_STEPS ? '<div class="wizard-step-line"></div>' : ''}`;
    }).join('');
  }

  if (prevBtn) prevBtn.disabled = boardWizardStep === 1;
  if (nextBtn) nextBtn.textContent = boardWizardStep === BOARD_WIZARD_STEPS ? 'Create Board' : 'Next';

  const steps = {
    1: `<div class="form-group"><label class="form-label">Board Name</label><input class="input" id="bw_name" placeholder="e.g. Keytruda Melanoma UK" value="${newBoardData.name || ''}" /></div>`,
    2: `<div class="form-group"><label class="form-label">Therapeutic Area</label><select class="input" id="bw_area"><option value="">Select…</option>${['Oncology','Cardiology','Dermatology','Neurology','Rare Diseases','Immunology','Hematology','Gastroenterology','Custom…'].map(a => `<option ${newBoardData.area===a?'selected':''}>${a}</option>`).join('')}</select></div>`,
    3: `<div class="form-group"><label class="form-label">Indication</label><input class="input" id="bw_indication" placeholder="e.g. Cutaneous T-cell lymphoma" value="${newBoardData.indication || ''}" /></div>`,
    4: `<div class="form-group"><label class="form-label">Geography</label><select class="input" id="bw_geo"><option value="">Select…</option>${['France','Spain','UK','Germany','Italy','USA','Global','Europe (All)'].map(g => `<option ${newBoardData.geo===g?'selected':''}>${g}</option>`).join('')}</select></div>`,
    5: `<div class="form-group"><label class="form-label">Brand Focus (optional)</label><input class="input" id="bw_brand" placeholder="e.g. Keytruda (pembrolizumab)" value="${newBoardData.brand || ''}" /></div>`,
    6: `<div class="form-group"><label class="form-label">Activate Data Sources</label><div style="display:flex;flex-direction:column;gap:8px;margin-top:6px;">${[['openalex','OpenAlex — Publications'],['clinicaltrials','ClinicalTrials.gov — Trials'],['pharmageo','PharmaGEO — AI Visibility'],['visibrain','VisiBrain — Social Listening'],['googletrends','Google Trends (Demo)'],['ansm','ANSM / HAS — Regulatory']].map(([id,label]) => `<label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer;"><input type="checkbox" id="bw_src_${id}" ${(newBoardData.sources||['openalex','clinicaltrials','pharmageo','visibrain']).includes(id)?'checked':''} style="accent-color:#111111;width:14px;height:14px;"> ${label}</label>`).join('')}</div></div>`,
    7: `<div style="background:var(--bg-input);border-radius:var(--radius-card);padding:16px;">
      <div class="card-title" style="margin-bottom:12px;">Review &amp; Create</div>
      ${['name','area','indication','geo','brand'].map(k => `<div style="display:flex;gap:10px;font-size:13px;margin-bottom:6px;"><span style="color:var(--text-muted);width:90px;flex-shrink:0;">${k.charAt(0).toUpperCase()+k.slice(1)}</span><span style="font-weight:600;color:var(--text-heading);">${newBoardData[k]||'—'}</span></div>`).join('')}
      <div style="display:flex;gap:10px;font-size:13px;margin-bottom:6px;"><span style="color:var(--text-muted);width:90px;flex-shrink:0;">Sources</span><span style="font-weight:600;color:var(--text-heading);">${(newBoardData.sources||[]).join(', ') || '—'}</span></div>
    </div>`,
  };

  bodyEl.innerHTML = steps[boardWizardStep] || '';
}

function saveBoardWizardStep() {
  const v = val => document.getElementById(v)?.value?.trim();
  const checks = ids => ids.filter(id => document.getElementById(`bw_src_${id}`)?.checked);
  const sourceIds = ['openalex','clinicaltrials','pharmageo','visibrain','googletrends','ansm'];
  switch(boardWizardStep) {
    case 1: newBoardData.name = document.getElementById('bw_name')?.value?.trim() || ''; break;
    case 2: newBoardData.area = document.getElementById('bw_area')?.value || ''; break;
    case 3: newBoardData.indication = document.getElementById('bw_indication')?.value?.trim() || ''; break;
    case 4: newBoardData.geo = document.getElementById('bw_geo')?.value || ''; break;
    case 5: newBoardData.brand = document.getElementById('bw_brand')?.value?.trim() || ''; break;
    case 6: newBoardData.sources = checks(sourceIds); break;
  }
}

function createBoard() {
  const id = 'board-' + Date.now();
  const board = {
    id,
    name: newBoardData.name || 'New Board',
    area: newBoardData.area || 'Unknown',
    indication: newBoardData.indication || '',
    geo: newBoardData.geo || 'Global',
    brand: newBoardData.brand || '',
    status: 'active',
    created: new Date().toISOString().split('T')[0],
    sources: newBoardData.sources || ['openalex','clinicaltrials','pharmageo','visibrain'],
  };
  boards.push(board);
  activeBoard = board;
  closeBoardModal();
  updateBoardUI();
  renderBoardDropdown();
  navigateTo('home');
  showToast(`Board "${board.name}" created!`);
  agenticMemory.add('board_created', `New board: ${board.name} — ${board.indication} · ${board.geo}`);
}

// ─── AGENTIC MEMORY ───────────────────────────────────────────────────────────
const agenticMemory = {
  patterns_detected: [],
  kol_signals: [],
  brand_mentions: [],
  anomalies: [],
  learning_log: [],
  add(type, content) {
    const entry = { type, content, ts: new Date().toLocaleTimeString() };
    this.learning_log.unshift(entry);
    if (this.learning_log.length > 50) this.learning_log.pop();
    renderMemory();
  }
};

// ─── CHART INSTANCES ──────────────────────────────────────────────────────────
const charts = {};

// ─── STATE ────────────────────────────────────────────────────────────────────
let state = {
  currentPage: 'home',
  pubPage: 1,
  pubQuery: 'cutaneous lymphoma',
  pubTotal: 0,
  trialsQuery: 'cutaneous T-cell lymphoma',
  trialsNextToken: null,
  wizardStep: 1,
  wizardData: {},
  sources: {},
};

// ─── NAVIGATION ───────────────────────────────────────────────────────────────
function navigateTo(pageName) {
  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
  const target = document.getElementById(`page-${pageName}`);
  if (target) target.classList.remove('hidden');

  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.page === pageName);
  });

  const pageTitles = {
    home: 'Projects',
    dashboard: 'Dashboard',
    geo: 'GEO & SEO Scores',
    publications: 'Publications',
    kol: 'KOL & Rising Stars',
    trials: 'Clinical Trials',
    social: 'Social Intelligence',
    landscape: 'Digital Landscape',
    sources: 'Sources & Config',
    reports: 'Reports & Planning',
  };
  setEl('breadcrumbPage', pageTitles[pageName] || pageName);
  state.currentPage = pageName;
  window.location.hash = pageName;
  loadPageData(pageName);
}

function loadPageData(page) {
  switch (page) {
    case 'home':        initHome();          break;
    case 'dashboard':   initDashboard();     break;
    case 'geo':         initGeoPage();       break;
    case 'publications': initPublications(); break;
    case 'kol':         initKOL();          break;
    case 'trials':      initTrials();        break;
    case 'social':      initSocial();        break;
    case 'landscape':   initLandscape();     break;
    case 'sources':     initSources();       break;
    case 'reports':     initReports();       break;
  }
}

// ─── INIT ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  bindNavigation();
  bindTopbar();
  bindChat();
  bindBoardUI();
  updateBoardUI();
  renderBoardDropdown();
  initializeFromHash();
  agenticMemory.add('session_start', 'Platform initialized. Context: Ledaga / CTCL France.');
});

function initializeFromHash() {
  const hash = window.location.hash.replace('#', '');
  const validPages = ['home','dashboard','geo','publications','kol','trials','social','landscape','sources','reports'];
  const page = validPages.includes(hash) ? hash : 'home';
  navigateTo(page);
}

function bindNavigation() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', e => {
      e.preventDefault();
      const page = item.dataset.page;
      if (page) navigateTo(page);
    });
  });

  document.getElementById('navCopilot')?.addEventListener('click', e => {
    e.preventDefault();
    toggleChat(true);
  });

  const collapseBtn = document.getElementById('sidebarCollapseBtn');
  const sidebar = document.getElementById('sidebar');
  const wrapper = document.getElementById('mainWrapper');
  if (collapseBtn) {
    collapseBtn.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
      wrapper.classList.toggle('expanded');
    });
  }

  const menuBtn = document.getElementById('topbarMenuBtn');
  if (menuBtn) {
    menuBtn.addEventListener('click', () => {
      if (sidebar) sidebar.classList.toggle('open');
    });
  }
}

function bindTopbar() {
  document.querySelectorAll('.suggestion-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      state.pubQuery = chip.dataset.query;
      navigateTo('publications');
    });
  });

  document.querySelectorAll('.hub-question-card').forEach(card => {
    card.addEventListener('click', () => {
      if (card.dataset.page) navigateTo(card.dataset.page);
    });
  });
}

function bindBoardUI() {
  const selectorBtn = document.getElementById('boardSelectorBtn');
  const dd = document.getElementById('boardDropdown');
  if (selectorBtn && dd) {
    selectorBtn.addEventListener('click', e => {
      e.stopPropagation();
      dd.classList.toggle('open');
    });
    document.addEventListener('click', () => dd.classList.remove('open'));
    dd.addEventListener('click', e => e.stopPropagation());
  }

  document.getElementById('createBoardBtn')?.addEventListener('click', openBoardModal);
  document.getElementById('boardModalClose')?.addEventListener('click', closeBoardModal);
  document.getElementById('sidebarBoardBtn')?.addEventListener('click', openBoardModal);

  document.getElementById('boardWizardNext')?.addEventListener('click', () => {
    saveBoardWizardStep();
    if (boardWizardStep < BOARD_WIZARD_STEPS) {
      boardWizardStep++;
      renderBoardWizardStep();
    } else {
      createBoard();
    }
  });
  document.getElementById('boardWizardPrev')?.addEventListener('click', () => {
    if (boardWizardStep > 1) { boardWizardStep--; renderBoardWizardStep(); }
  });
  document.getElementById('boardModal')?.addEventListener('click', e => {
    if (e.target === document.getElementById('boardModal')) closeBoardModal();
  });
}

// ─── CHART HELPER ─────────────────────────────────────────────────────────────
function destroyChart(id) {
  if (charts[id]) { charts[id].destroy(); delete charts[id]; }
}

function getCtx(id) {
  const canvas = document.getElementById(id);
  return canvas ? canvas.getContext('2d') : null;
}

const FONT = 'DM Sans';

// ─── PAGE: HOME / PROJECTS ────────────────────────────────────────────────────
function initHome() {
  const grid = document.getElementById('boardsGrid');
  if (!grid) return;

  const boardCards = boards.map(b => `
    <div class="board-card ${b.id === activeBoard.id ? 'active-board' : ''}" data-board-id="${b.id}">
      <div class="board-card-status board-status-active">${b.status.toUpperCase()}</div>
      <div class="board-card-name">${b.name}</div>
      <div class="board-card-ta">${b.area} · ${b.indication}</div>
      <div class="board-card-geo">${b.geo}</div>
      <div class="board-card-sources">
        ${b.sources.slice(0,4).map(s => `<span class="source-chip">${s}</span>`).join('')}
      </div>
      <div style="margin-top:14px;display:flex;gap:8px;">
        <button class="btn btn-primary btn-sm board-open-btn" data-board-id="${b.id}">Open Dashboard</button>
        ${b.id === activeBoard.id ? '<span style="font-size:11px;color:var(--success);font-weight:600;display:flex;align-items:center;gap:4px;"><svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" fill="#22C55E"/></svg> Active</span>' : ''}
      </div>
    </div>
  `).join('');

  const createCard = `
    <div class="create-board-card" id="createBoardCardBtn">
      <div class="create-board-card-icon">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 2V16M2 9H16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      </div>
      <div class="create-board-card-label">Create New Board</div>
      <div class="create-board-card-sub">Add a new pharma intelligence project</div>
    </div>
  `;

  grid.innerHTML = boardCards + createCard;

  grid.querySelectorAll('.board-open-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const b = boards.find(x => x.id === btn.dataset.boardId);
      if (b) { activeBoard = b; updateBoardUI(); renderBoardDropdown(); }
      navigateTo('dashboard');
    });
  });

  document.getElementById('createBoardCardBtn')?.addEventListener('click', openBoardModal);
}

// ─── PAGE: DASHBOARD ──────────────────────────────────────────────────────────
function initDashboard() {
  const geoScores = PLATFORM_DATA.pharmageo.scores;
  if (geoScores && geoScores.length) {
    const avg = Math.round(geoScores.reduce((s, x) => s + x.overallScore, 0) / geoScores.length);
    setEl('kpiGeoScore', avg);
    agenticMemory.add('geo_analysis', `Average GEO score: ${avg}/100 across ${geoScores.length} LLMs.`);
  }

  fetch(`${API}?action=search_openalex&query=${encodeURIComponent('cutaneous lymphoma chlormethine')}&per_page=1`)
    .then(r => r.json())
    .then(data => { if (data.total) setEl('kpiPublications', data.total.toLocaleString()); })
    .catch(() => setEl('kpiPublications', '1,200+'));

  // Dashboard top recommendations
  const recoEl = document.getElementById('dashRecommendations');
  if (recoEl && PLATFORM_DATA.pharmageo.recommendations) {
    const recos = PLATFORM_DATA.pharmageo.recommendations.slice(0, 3);
    recoEl.innerHTML = recos.map(r => `
      <div style="padding:10px 12px;border-radius:var(--radius-sm);border-left:3px solid ${r.priority === 'High' ? '#EF4444' : '#EAB308'};background:var(--bg-input);margin-bottom:8px;">
        <div style="font-size:12px;font-weight:600;color:var(--text-heading);margin-bottom:2px;">${r.title}</div>
        <div style="font-size:11px;color:var(--text-secondary);">${r.description.substring(0,120)}…</div>
      </div>
    `).join('');
  }

  // Footprint radar
  destroyChart('footprintChart');
  const ctx1 = getCtx('footprintChart');
  if (ctx1) {
    charts.footprintChart = new Chart(ctx1, {
      type: 'radar',
      data: {
        labels: ['GEO/AI', 'Publications', 'KOL Network', 'Social Reach', 'Clinical Trials', 'SEO'],
        datasets: [{
          label: 'Ledaga',
          data: [49, 68, 75, 40, 55, 35],
          borderColor: PALETTE.teal,
          backgroundColor: PALETTE.tealA,
          borderWidth: 2,
          pointBackgroundColor: PALETTE.teal,
          pointRadius: 4,
        }, {
          label: 'Poteligeo',
          data: [42, 55, 62, 48, 65, 30],
          borderColor: PALETTE.pink,
          backgroundColor: PALETTE.pinkA,
          borderWidth: 2,
          pointBackgroundColor: PALETTE.pink,
          pointRadius: 4,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: true,
        plugins: { legend: { labels: { font: { family: FONT, size: 11 } } } },
        scales: { r: { min: 0, max: 100, ticks: { font: { family: FONT, size: 10 }, stepSize: 25 }, grid: { color: 'rgba(0,0,0,0.06)' }, pointLabels: { font: { family: FONT, size: 11 } } } }
      }
    });
  }

  // GEO vs SEO bar chart
  destroyChart('geoSeoChart');
  const ctx2 = getCtx('geoSeoChart');
  if (ctx2) {
    charts.geoSeoChart = new Chart(ctx2, {
      type: 'bar',
      data: {
        labels: ['ChatGPT', 'Gemini', 'Perplexity', 'Google (est.)', 'Bing (est.)'],
        datasets: [{
          label: 'GEO Score',
          data: [43, 46, 57, 0, 0],
          backgroundColor: PALETTE.pink,
          borderRadius: 6,
        }, {
          label: 'SEO Index',
          data: [0, 0, 0, 42, 31],
          backgroundColor: PALETTE.teal,
          borderRadius: 6,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: true,
        plugins: { legend: { labels: { font: { family: FONT, size: 11 } } } },
        scales: {
          y: { beginAtZero: true, max: 100, grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { font: { family: FONT, size: 11 } } },
          x: { grid: { display: false }, ticks: { font: { family: FONT, size: 11 } } }
        }
      }
    });
  }

  // Sparklines
  const sparkData = {
    sparkPub:    { data: [14,18,22,19,24,28,25,30,35,32,38,42], color: PALETTE.teal },
    sparkSocial: { data: [80,95,110,90,105,120,130,118,125,140,155,148], color: PALETTE.pink },
    sparkTrials: { data: [4,4,5,5,5,6,6,6,7,7,7,7], color: PALETTE.purple },
  };
  Object.entries(sparkData).forEach(([id, cfg]) => {
    destroyChart(id);
    const ctx = getCtx(id);
    if (!ctx) return;
    charts[id] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: Array(12).fill(''),
        datasets: [{ data: cfg.data, borderColor: cfg.color, borderWidth: 2, fill: false, pointRadius: 0, tension: 0.4 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { x: { display: false }, y: { display: false } },
      }
    });
  });
}

// ─── PAGE: GEO/SEO ────────────────────────────────────────────────────────────
function initGeoPage() {
  renderGeoScores();
  renderGeoCharts();
  renderGeoRecommendations();
  renderGeoSources();
  renderGeoTrendingQuestions();
  initSEOTab();
  initCorrelationTab();
  bindGeoTabs();
}

function bindGeoTabs() {
  document.querySelectorAll('[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      document.querySelectorAll('[data-tab]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));
      const panel = document.getElementById(`tab-${tab}`);
      if (panel) panel.classList.remove('hidden');
    });
  });
}

function renderGeoScores() {
  const container = document.getElementById('geoScoresGrid');
  if (!container) return;
  const scores = PLATFORM_DATA.pharmageo.scores;
  container.innerHTML = scores.map(s => {
    const sentBadge = s.sentiment === 'neutral'
      ? `<span style="background:var(--bg-hover);color:var(--text-secondary);padding:2px 7px;border-radius:999px;font-size:10px;font-weight:600;">Neutral</span>`
      : `<span style="background:#D1FAE5;color:#065F46;padding:2px 7px;border-radius:999px;font-size:10px;font-weight:600;">Positive</span>`;
    return `
      <div class="geo-score-card">
        <div class="geo-llm-name">${s.llm} ${sentBadge}</div>
        ${geoBar('Overall Score', s.overallScore, 'fill-dark')}
        ${geoBar('Reliability', s.reliability, 'fill-cyan')}
        ${geoBar('AI Visibility', s.aiVisibility, 'fill-pink')}
        <div class="geo-summary">${s.summary.length > 200 ? s.summary.substring(0, 200) + '…' : s.summary}</div>
      </div>
    `;
  }).join('');
}

function geoBar(label, value, fillClass) {
  return `
    <div class="geo-score-row">
      <span class="geo-score-label">${label}</span>
      <div class="geo-score-bar"><div class="geo-score-fill ${fillClass}" style="width:${value}%"></div></div>
      <span class="geo-score-num">${value}</span>
    </div>`;
}

function renderGeoCharts() {
  destroyChart('discoverabilityChart');
  const d = PLATFORM_DATA.pharmageo.discoverability;
  const ctx = getCtx('discoverabilityChart');
  if (ctx) {
    charts.discoverabilityChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Drug Class', 'Brand Recognition', 'INN Only', 'Not Found'],
        datasets: [{ data: [d.drugClass, d.brandRecognition, d.innOnly, d.notFound], backgroundColor: [PALETTE.teal, PALETTE.pink, PALETTE.purple, PALETTE.muted], borderWidth: 0, hoverOffset: 4 }]
      },
      options: {
        responsive: true, maintainAspectRatio: true, cutout: '65%',
        plugins: { legend: { position: 'right', labels: { font: { family: FONT, size: 11 }, boxWidth: 10 } } }
      }
    });
  }

  destroyChart('sovChart');
  const products = PLATFORM_DATA.pharmageo.agnostic.products.slice(0, 8);
  const ctx2 = getCtx('sovChart');
  if (ctx2) {
    charts.sovChart = new Chart(ctx2, {
      type: 'bar',
      data: {
        labels: products.map(p => p.name),
        datasets: [{
          label: 'Share of Voice (%)',
          data: products.map(p => p.sov),
          backgroundColor: products.map(p => p.name.includes('Ledaga') ? PALETTE.pink : PALETTE.muted),
          borderRadius: 6,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: true, indexAxis: 'y',
        plugins: { legend: { display: false } },
        scales: {
          x: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { font: { family: FONT, size: 11 } } },
          y: { grid: { display: false }, ticks: { font: { family: FONT, size: 11 } } }
        }
      }
    });
  }
}

function renderGeoRecommendations() {
  const container = document.getElementById('geoRecommendationsList');
  if (!container) return;
  const recos = PLATFORM_DATA.pharmageo.recommendations.slice(0, 5);
  container.innerHTML = recos.map(r => `
    <div class="reco-item ${r.priority === 'Med' ? 'reco-med' : ''}">
      <div class="reco-header">
        <div class="reco-title">${r.title}</div>
        <span class="reco-priority ${r.priority === 'High' ? 'priority-high' : 'priority-med'}">${r.priority}</span>
      </div>
      <div class="reco-llm">${r.llm} · ${r.type}</div>
      <div class="reco-desc">${r.description.length > 180 ? r.description.substring(0, 180) + '…' : r.description}</div>
    </div>
  `).join('');
}

function renderGeoSources() {
  const container = document.getElementById('geoSourcesTable');
  if (!container) return;
  const sources = PLATFORM_DATA.pharmageo.sources.slice(0, 10);
  container.innerHTML = `
    <table class="data-table">
      <thead><tr><th>Title</th><th>Type</th><th>Reliability</th><th>LLM Uses</th></tr></thead>
      <tbody>
        ${sources.map(s => `
          <tr>
            <td><a href="${s.link}" target="_blank" rel="noopener noreferrer" style="color:var(--chart-teal)">${s.title}</a></td>
            <td><span class="channel-badge">${s.type}</span></td>
            <td>
              <div class="score-cell">
                <div class="score-mini-bar"><div class="score-mini-fill" style="width:${s.reliability}%"></div></div>
                <span class="score-num-sm">${s.reliability}</span>
              </div>
            </td>
            <td style="font-weight:600;color:var(--text-heading)">${s.usage}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function renderGeoTrendingQuestions() {
  const container = document.getElementById('geoTrendingQuestions');
  if (!container) return;
  const qs = PLATFORM_DATA.pharmageo.trending_questions;
  container.innerHTML = qs.map(q => `
    <div class="trending-q-item">
      <span class="tq-category tq-cat-${q.category}">${q.category}</span>
      <span class="tq-text">${q.question.replace('{COMPETITOR}', PLATFORM_DATA.config.competitor)}</span>
    </div>
  `).join('');
}

function initSEOTab() {
  destroyChart('seoTrendChart');
  const ctx = getCtx('seoTrendChart');
  if (!ctx) return;
  const months = ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb'];
  charts.seoTrendChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: months,
      datasets: [{
        label: 'mycosis fungoides traitement',
        data: [42, 45, 38, 50, 55, 48, 62, 58, 70, 66, 72, 78],
        borderColor: PALETTE.teal, backgroundColor: PALETTE.tealA,
        fill: true, tension: 0.4, borderWidth: 2, pointRadius: 4, pointBackgroundColor: PALETTE.teal,
      }, {
        label: 'lymphome cutané',
        data: [30, 35, 28, 40, 45, 38, 52, 48, 55, 58, 60, 65],
        borderColor: PALETTE.pink, backgroundColor: PALETTE.pinkA,
        fill: true, tension: 0.4, borderWidth: 2, pointRadius: 4, pointBackgroundColor: PALETTE.pink,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      plugins: { legend: { labels: { font: { family: FONT, size: 11 } } } },
      scales: {
        y: { beginAtZero: true, max: 100, title: { display: true, text: 'Relative Interest', font: { family: FONT, size: 11 } }, ticks: { font: { family: FONT, size: 11 } }, grid: { color: 'rgba(0,0,0,0.04)' } },
        x: { grid: { display: false }, ticks: { font: { family: FONT, size: 11 } } }
      }
    }
  });

  destroyChart('seoRadarChart');
  const ctx2 = getCtx('seoRadarChart');
  if (ctx2) {
    charts.seoRadarChart = new Chart(ctx2, {
      type: 'radar',
      data: {
        labels: ['Branded\n(Ledaga)', 'INN\n(chlormethine)', 'Disease\n(CTCL)', 'Treatment\n(topical)', 'Congress\n(EADV/JDP)', 'Guidelines'],
        datasets: [{
          label: 'Search Index',
          data: [22, 45, 68, 55, 30, 40],
          borderColor: PALETTE.pink, backgroundColor: PALETTE.pinkA,
          borderWidth: 2, pointBackgroundColor: PALETTE.pink, pointRadius: 4,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: true,
        plugins: { legend: { display: false } },
        scales: { r: { min: 0, max: 100, ticks: { stepSize: 25, font: { family: FONT, size: 10 } }, pointLabels: { font: { family: FONT, size: 10 } } } }
      }
    });
  }

  const relatedBody = document.getElementById('seoRelatedBody');
  if (relatedBody) {
    const related = [
      { q: 'mycosis fungoides stade IA traitement', vol: 78, trend: '+12%', type: 'Disease' },
      { q: 'lymphome T cutané Ledaga', vol: 45, trend: '+8%', type: 'Branded' },
      { q: 'chlorméthine gel effets secondaires', vol: 62, trend: '+3%', type: 'Safety' },
      { q: 'GFELC centres référence France', vol: 38, trend: '+22%', type: 'Network' },
      { q: 'mogamulizumab Poteligeo comparaison', vol: 55, trend: '-5%', type: 'Competitive' },
      { q: 'dupilumab lymphome cutané risque', vol: 90, trend: '+41%', type: 'Emerging' },
      { q: 'CTCL traitement ligne 1', vol: 70, trend: '+9%', type: 'Disease' },
    ];
    relatedBody.innerHTML = related.map(r => `
      <tr>
        <td>${r.q}</td>
        <td style="font-weight:600">${r.vol}</td>
        <td style="color:${r.trend.startsWith('+') ? 'var(--success)' : 'var(--error)'};">${r.trend}</td>
        <td><span class="channel-badge">${r.type}</span></td>
      </tr>
    `).join('');
  }

  const regionalList = document.getElementById('seoRegionalList');
  if (regionalList) {
    const regions = [
      { name: 'Île-de-France', pct: 100 }, { name: 'Nouvelle-Aquitaine', pct: 68 },
      { name: 'Auvergne-Rhône-Alpes', pct: 62 }, { name: 'Occitanie', pct: 55 },
      { name: 'Pays de la Loire', pct: 48 }, { name: 'PACA', pct: 45 },
      { name: 'Grand Est', pct: 40 }, { name: 'Normandie', pct: 35 },
    ];
    regionalList.innerHTML = regions.map(r => `
      <div class="regional-row">
        <span class="regional-name">${r.name}</span>
        <div class="regional-bar"><div class="regional-fill" style="width:${r.pct}%"></div></div>
        <span class="regional-val">${r.pct}</span>
      </div>
    `).join('');
  }

  document.getElementById('seoSearchBtn')?.addEventListener('click', () => {
    showToast('Demo data — Google Trends API not connected');
  });
}

function initCorrelationTab() {
  destroyChart('correlationChart');
  const ctx = getCtx('correlationChart');
  if (!ctx) return;
  charts.correlationChart = new Chart(ctx, {
    type: 'bubble',
    data: {
      datasets: [{
        label: 'CTCL Keywords',
        data: [
          { x: 49, y: 62, r: 12 }, { x: 35, y: 78, r: 8 }, { x: 57, y: 45, r: 10 },
          { x: 22, y: 90, r: 6 }, { x: 68, y: 38, r: 9 }, { x: 42, y: 55, r: 7 },
        ],
        backgroundColor: PALETTE.pinkA,
        borderColor: PALETTE.pink,
        borderWidth: 2,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      plugins: { legend: { display: false }, tooltip: {
        callbacks: { label: ctx => `GEO: ${ctx.raw.x} | Search Vol: ${ctx.raw.y} | Weight: ${ctx.raw.r}` }
      }},
      scales: {
        x: { title: { display: true, text: 'GEO Score', font: { family: FONT, size: 11 } }, min: 0, max: 100, ticks: { font: { family: FONT, size: 11 } } },
        y: { title: { display: true, text: 'Search Volume Index', font: { family: FONT, size: 11 } }, min: 0, max: 100, ticks: { font: { family: FONT, size: 11 } } }
      }
    }
  });
}

// ─── PAGE: PUBLICATIONS ────────────────────────────────────────────────────────
function initPublications() {
  const input = document.getElementById('pubSearchInput');
  if (input) input.value = state.pubQuery;

  const searchBtn = document.getElementById('pubSearchBtn');
  if (searchBtn) {
    searchBtn.addEventListener('click', () => {
      state.pubQuery = document.getElementById('pubSearchInput')?.value?.trim() || 'cutaneous lymphoma';
      state.pubPage = 1;
      loadPublications();
    });
  }

  document.getElementById('pubSearchInput')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('pubSearchBtn')?.click();
  });

  document.getElementById('pubPrevBtn')?.addEventListener('click', () => {
    if (state.pubPage > 1) { state.pubPage--; loadPublications(); }
  });
  document.getElementById('pubNextBtn')?.addEventListener('click', () => {
    if (state.pubPage * 25 < state.pubTotal) { state.pubPage++; loadPublications(); }
  });

  document.getElementById('pubViewList')?.addEventListener('click', () => {
    showEl('pubListView'); hideEl('pubNetworkView');
    document.getElementById('pubViewList')?.classList.add('active');
    document.getElementById('pubViewNetwork')?.classList.remove('active');
  });
  document.getElementById('pubViewNetwork')?.addEventListener('click', () => {
    hideEl('pubListView'); showEl('pubNetworkView');
    document.getElementById('pubViewNetwork')?.classList.add('active');
    document.getElementById('pubViewList')?.classList.remove('active');
    renderAuthorNetwork();
  });

  loadPublications();
}

async function loadPublications() {
  showEl('pubSkeletonList'); hideEl('pubResultsList'); hideEl('pubPagination');
  try {
    const data = await apiGet(`${API}?action=search_openalex&query=${encodeURIComponent(state.pubQuery)}&page=${state.pubPage}&per_page=25`);
    if (data.error) throw new Error(data.error);
    state.pubTotal = data.total || 0;
    hideEl('pubSkeletonList'); showEl('pubResultsList'); showEl('pubPagination');
    const results = data.results || [];
    setEl('pubCountLabel', `${state.pubTotal.toLocaleString()} publications found (OpenAlex)`);
    renderPublications(results);
    updatePagination('pubPrevBtn', 'pubNextBtn', 'pubPageInfo', state.pubPage, state.pubTotal, 25);
    agenticMemory.add('publication_search', `Query "${state.pubQuery}" → ${state.pubTotal} results`);
  } catch(e) {
    hideEl('pubSkeletonList'); showEl('pubResultsList');
    renderPublicationsFromData();
  }
}

function renderPublications(results) {
  const container = document.getElementById('pubResultsList');
  if (!container) return;
  if (!results.length) {
    container.innerHTML = '<div class="memory-empty">No publications found for this query.</div>';
    return;
  }
  container.innerHTML = results.map(pub => {
    const authors = pub.authors?.slice(0,3).map(a => a.name).join(', ') || '';
    const moreAuthors = pub.authors?.length > 3 ? ` et al.` : '';
    return `
      <div class="pub-card">
        <div class="pub-card-header">
          <div class="pub-title">${pub.title || 'Untitled'}</div>
          ${pub.open_access ? '<span class="pub-oa-badge">OA</span>' : ''}
        </div>
        <div class="pub-meta">
          <span><strong>${pub.year || 'N/A'}</strong></span>
          ${pub.journal ? `<span>${pub.journal}</span>` : ''}
          ${authors ? `<span>${authors}${moreAuthors}</span>` : ''}
          ${pub.cited_by_count ? `<span class="pub-cite-count">${pub.cited_by_count} citations</span>` : ''}
          ${pub.doi ? `<a href="https://doi.org/${pub.doi.replace('https://doi.org/','')}" target="_blank" rel="noopener noreferrer" style="color:var(--chart-teal);font-size:12px;">DOI →</a>` : ''}
        </div>
        ${pub.concepts?.length ? `<div class="pub-concepts">${pub.concepts.map(c => `<span class="pub-concept">${c}</span>`).join('')}</div>` : ''}
      </div>
    `;
  }).join('');
}

function renderPublicationsFromData() {
  const pubs = PLATFORM_DATA.publications || [];
  setEl('pubCountLabel', `${pubs.length} curated publications (data.js)`);
  const container = document.getElementById('pubResultsList');
  if (!container) return;
  container.innerHTML = pubs.map(pub => `
    <div class="pub-card">
      <div class="pub-card-header">
        <div class="pub-title">${pub.title}</div>
        <span class="pub-oa-badge">Curated</span>
      </div>
      <div class="pub-meta">
        <span><strong>${pub.year}</strong></span>
        <span>${pub.journal}</span>
        <span>${pub.authors.join(', ')}</span>
        ${pub.doi ? `<a href="https://doi.org/${pub.doi}" target="_blank" rel="noopener noreferrer" style="color:var(--chart-teal);font-size:12px;">DOI →</a>` : ''}
      </div>
    </div>
  `).join('');
  hideEl('pubPagination');
}

function renderAuthorNetwork() {
  const container = document.getElementById('authorNetworkPlaceholder');
  if (!container) return;
  const kols = PLATFORM_DATA.kols.france.slice(0, 12);
  const colors = [PALETTE.teal, PALETTE.pink, PALETTE.purple, PALETTE.blue];
  container.innerHTML = `
    <div style="display:flex;flex-wrap:wrap;gap:12px;padding:16px;justify-content:center;">
      ${kols.map((k, i) => `
        <div style="
          padding:8px 14px;
          background:${colors[i % colors.length]}18;
          border:1px solid ${colors[i % colors.length]}30;
          border-radius:20px;
          font-size:12px;font-weight:600;
          color:var(--text-heading);
          transition:transform 0.2s;
          cursor:pointer;
        " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
          ${k.name}
          <span style="font-size:10px;color:var(--text-muted);display:block;font-weight:400;">${k.city}</span>
        </div>
      `).join('')}
    </div>
    <p style="text-align:center;font-size:12px;color:var(--text-muted);padding:8px">
      Author network visualization. Node size = publication count. Edges = co-authorship.
    </p>
  `;
}

// ─── PAGE: KOL ────────────────────────────────────────────────────────────────
function initKOL() {
  renderPersonas();
  renderKOLTable();
  renderKOLTimeline();
  loadRisingStars();
  document.getElementById('kolLoadRisingStars')?.addEventListener('click', loadRisingStars);
  document.getElementById('kolTierFilter')?.addEventListener('change', renderKOLTable);
}

function renderPersonas() {
  const kols = PLATFORM_DATA.kols.france;
  const personas = {
    Expert:     kols.filter(k => k.tier === 1),
    Connected:  kols.filter(k => k.social && k.social.linkedin),
    Silent:     kols.filter(k => k.tier === 2 && (!k.social || !k.social.linkedin)),
    Rising:     kols.filter(k => k.tier === 3),
    Diagnostic: kols.filter(k => (k.specialty || '').toLowerCase().includes('patholog') || (k.specialty || '').toLowerCase().includes('anatomo')),
  };
  const map = {
    Expert:     { count: 'personaCountExpert',     examples: 'personaExamplesExpert' },
    Connected:  { count: 'personaCountConnected',  examples: 'personaExamplesConnected' },
    Silent:     { count: 'personaCountSilent',     examples: 'personaExamplesSilent' },
    Rising:     { count: 'personaCountRising',     examples: 'personaExamplesRising' },
    Diagnostic: { count: 'personaCountDiagnostic', examples: 'personaExamplesDiagnostic' },
  };
  Object.entries(map).forEach(([key, ids]) => {
    const list = personas[key] || [];
    setEl(ids.count, list.length);
    const ex = document.getElementById(ids.examples);
    if (ex) {
      ex.innerHTML = list.slice(0,2).map(k => `<div class="persona-example">${k.name}</div>`).join('');
    }
  });
}

function renderKOLTable() {
  const tbody = document.getElementById('kolTableBody');
  if (!tbody) return;
  const tierFilter = document.getElementById('kolTierFilter')?.value;
  let kols = PLATFORM_DATA.kols.france;
  if (tierFilter && tierFilter !== 'all') kols = kols.filter(k => String(k.tier) === tierFilter);
  const channels = ['Face-to-face', 'Scientific event', 'Digital MSL', 'Remote detail', 'Advisory board'];
  const topics   = ['Chlormethine efficacy data', 'EORTC 2023 guidelines update', 'Patient adherence strategies', 'Lacutamab Phase 3 discussion', 'MOA of chlormethine'];
  tbody.innerHTML = kols.map((k, i) => {
    const channel = channels[i % channels.length];
    const topic   = topics[i % topics.length];
    return `
      <tr>
        <td style="font-weight:700;color:var(--text-muted);">#${i+1}</td>
        <td style="font-weight:600">${k.name}</td>
        <td style="max-width:160px;white-space:normal;font-size:11px">${k.institution}</td>
        <td>${k.city}</td>
        <td><span class="tier-badge tier-${k.tier}">Tier ${k.tier}</span></td>
        <td>
          <div class="score-cell">
            <div class="score-mini-bar"><div class="score-mini-fill" style="width:${k.score}%"></div></div>
            <span class="score-num-sm">${k.score}</span>
          </div>
        </td>
        <td><span class="channel-badge">${channel}</span></td>
        <td style="font-size:11px;max-width:140px;white-space:normal">${topic}</td>
        <td><button class="btn btn-ghost btn-sm" style="font-size:11px">Visit Plan</button></td>
      </tr>
    `;
  }).join('');
}

function renderKOLTimeline() {
  const container = document.getElementById('kolTimeline');
  if (!container) return;
  const entries = [
    { type: 'pub', kol: 'Pr Martine Bagot', action: '"Therapeutic advances in CTCL" — British Journal of Dermatology', ts: 'Feb 2026' },
    { type: 'congress', kol: 'Pr Marie Beylot-Barry', action: 'Session chair — EADV Cutaneous Lymphoma Course, Bordeaux', ts: 'Feb 2026' },
    { type: 'pub', kol: 'Dr Adèle de Masson', action: 'Rethinking prognostic boundaries in early-stage MF (PMID:41431959)', ts: 'Jan 2026' },
    { type: 'social', kol: 'Pr Jean-David Bouaziz', action: 'LinkedIn post: CAR-T for CTCL — early insights from #ASH2025', ts: 'Jan 2026' },
    { type: 'trial', kol: 'Innate Pharma / GFELC', action: 'TELLOMAK 3 Phase 3 FDA IND cleared — H1 2026 launch', ts: 'Dec 2025' },
    { type: 'congress', kol: 'Pr Florent Grange', action: '"Traitement des LTC en 2025" — JDP 2025 session coordinator', ts: 'Dec 2025' },
    { type: 'pub', kol: 'Pr Jean-David Bouaziz', action: 'Overall survival after HSCT for CTCL — JCO 2025 long-term follow-up', ts: 'Nov 2025' },
    { type: 'social', kol: 'Dr Florent Amatore', action: 'EADV 2025 talk: Mogamulizumab-associated rash management', ts: 'Oct 2025' },
  ];
  container.innerHTML = entries.map(e => `
    <div class="timeline-item">
      <div class="timeline-dot-col"><div class="timeline-dot ${e.type}"></div></div>
      <div class="timeline-content">
        <div class="timeline-type">${e.type.toUpperCase()}</div>
        <div class="timeline-title">${e.action}</div>
        <div class="timeline-who">${e.kol}</div>
      </div>
      <div class="timeline-ts">${e.ts}</div>
    </div>
  `).join('');
}

async function loadRisingStars() {
  showEl('risingStarsSkeleton'); hideEl('risingStarsGrid');
  try {
    const data = await apiGet(`${API}?action=kol_rising_stars&query=cutaneous+T-cell+lymphoma+mycosis+fungoides&country=FR`);
    if (data.error) throw new Error(data.error);
    hideEl('risingStarsSkeleton'); showEl('risingStarsGrid');
    renderRisingStars(data.results || []);
    agenticMemory.add('kol_discovery', `${(data.results||[]).length} rising stars detected in OpenAlex.`);
  } catch(e) {
    hideEl('risingStarsSkeleton'); showEl('risingStarsGrid');
    renderRisingStarsFallback();
  }
}

function renderRisingStars(stars) {
  const grid = document.getElementById('risingStarsGrid');
  if (!grid) return;
  if (!stars.length) { renderRisingStarsFallback(); return; }
  grid.innerHTML = stars.slice(0, 6).map(s => {
    const signalClass = s.signal === 'Rising Star' ? 'rs-signal-rising' : s.signal === 'Established Expert' ? 'rs-signal-established' : 'rs-signal-emerging';
    const scorePct = Math.min(s.rising_star_score, 100);
    return `
      <div class="rising-star-card">
        <span class="rs-signal-badge ${signalClass}">${s.signal}</span>
        <div class="rs-name">${s.name}</div>
        <div class="rs-institution">${s.institution || s.country || 'N/A'}</div>
        <div class="rs-stats">
          <div class="rs-stat"><div class="rs-stat-val">${s.h_index || 0}</div><div class="rs-stat-label">h-index</div></div>
          <div class="rs-stat"><div class="rs-stat-val">${s.works_count || 0}</div><div class="rs-stat-label">Works</div></div>
          <div class="rs-stat"><div class="rs-stat-val">${s.recent_works_3yr || 0}</div><div class="rs-stat-label">Recent</div></div>
          <div class="rs-stat"><div class="rs-stat-val">${s['2yr_citedness'] || 0}</div><div class="rs-stat-label">2yr Cite.</div></div>
        </div>
        <div class="rs-score">
          <div class="rs-score-bar"><div class="rs-score-fill" style="width:${scorePct}%"></div></div>
          <span class="rs-score-num">${s.rising_star_score}</span>
        </div>
      </div>
    `;
  }).join('');
}

function renderRisingStarsFallback() {
  const grid = document.getElementById('risingStarsGrid');
  if (!grid) return;
  const fallback = [
    { name: 'Dr Adèle de Masson', institution: 'AP-HP Hôpital Saint-Louis', h: 18, works: 75, signal: 'Rising Star', score: 82 },
    { name: 'Dr Maxime Battistella', institution: 'AP-HP Hôpital Saint-Louis', h: 22, works: 90, signal: 'Established Expert', score: 76 },
    { name: 'Dr Audrey Gros', institution: 'CHU Bordeaux', h: 12, works: 45, signal: 'Rising Star', score: 71 },
    { name: 'Dr Fanny Beltzung', institution: 'CHU Bordeaux', h: 8, works: 30, signal: 'Emerging', score: 58 },
    { name: 'Dr Caroline Ram-Wolff', institution: 'AP-HP Saint-Louis', h: 15, works: 55, signal: 'Rising Star', score: 68 },
    { name: 'Dr Hélène Moins-Teisserenc', institution: 'AP-HP Saint-Louis', h: 20, works: 65, signal: 'Rising Star', score: 73 },
  ];
  grid.innerHTML = fallback.map(s => {
    const signalClass = s.signal === 'Rising Star' ? 'rs-signal-rising' : s.signal === 'Established Expert' ? 'rs-signal-established' : 'rs-signal-emerging';
    return `
      <div class="rising-star-card">
        <span class="rs-signal-badge ${signalClass}">${s.signal}</span>
        <div class="rs-name">${s.name}</div>
        <div class="rs-institution">${s.institution}</div>
        <div class="rs-stats">
          <div class="rs-stat"><div class="rs-stat-val">${s.h}</div><div class="rs-stat-label">h-index</div></div>
          <div class="rs-stat"><div class="rs-stat-val">${s.works}</div><div class="rs-stat-label">Works</div></div>
        </div>
        <div class="rs-score">
          <div class="rs-score-bar"><div class="rs-score-fill" style="width:${s.score}%"></div></div>
          <span class="rs-score-num">${s.score}</span>
        </div>
      </div>
    `;
  }).join('');
}

// ─── PAGE: CLINICAL TRIALS ────────────────────────────────────────────────────
function initTrials() {
  const searchBtn = document.getElementById('trialsSearchBtn');
  if (searchBtn) {
    searchBtn.addEventListener('click', () => {
      state.trialsQuery = document.getElementById('trialsSearchInput')?.value?.trim() || 'cutaneous lymphoma';
      state.trialsNextToken = null;
      loadTrials();
    });
  }
  document.getElementById('trialsSearchInput')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('trialsSearchBtn')?.click();
  });
  document.getElementById('trialsNextBtn')?.addEventListener('click', () => {
    if (state.trialsNextToken) loadTrials(state.trialsNextToken);
  });
  document.getElementById('trialsPrevBtn')?.addEventListener('click', () => {
    showToast('Navigate using Next button — token-based pagination');
  });
  renderGantt();
  renderTrialSponsors();
  loadTrials();
}

async function loadTrials(pageToken = null) {
  showEl('trialsSkeletonList'); hideEl('trialsResultsList'); hideEl('trialsPagination');
  try {
    let url = `${API}?action=search_trials&query=${encodeURIComponent(state.trialsQuery)}&page_size=15`;
    if (pageToken) url += `&page_token=${pageToken}`;
    const data = await apiGet(url);
    if (data.error) throw new Error(data.error);
    state.trialsNextToken = data.nextPageToken || null;
    hideEl('trialsSkeletonList'); showEl('trialsResultsList'); showEl('trialsPagination');
    const results = data.results || data.studies || [];
    setEl('trialsCountLabel', `${(data.totalCount || results.length).toLocaleString()} trials found (ClinicalTrials.gov)`);
    renderTrials(results);
    renderTrialsPhaseChart(results);
    agenticMemory.add('clinical_trials', `Query "${state.trialsQuery}" → ${results.length} trials retrieved.`);
  } catch(e) {
    hideEl('trialsSkeletonList'); showEl('trialsResultsList');
    renderTrialsFallback();
  }
}

function renderTrials(results) {
  const container = document.getElementById('trialsResultsList');
  if (!container) return;
  if (!results.length) {
    container.innerHTML = '<div class="memory-empty">No trials found.</div>';
    return;
  }
  container.innerHTML = results.map(t => {
    const statusClass = {
      'RECRUITING': 'status-recruiting',
      'ACTIVE_NOT_RECRUITING': 'status-active',
      'COMPLETED': 'status-completed',
      'TERMINATED': 'status-terminated',
    }[t.status] || 'status-unknown';
    return `
      <div class="trial-card">
        <div class="trial-card-top">
          <span class="trial-nct">${t.nct_id}</span>
          <div class="trial-title">${t.title}</div>
          <span class="trial-status-pill ${statusClass}">${(t.status||'').replace(/_/g, ' ')}</span>
        </div>
        <div class="trial-meta">
          ${t.phase && t.phase !== 'N/A' ? `<span>${t.phase}</span>` : ''}
          ${t.start_date ? `<span>Started: ${t.start_date}</span>` : ''}
          ${t.completion_date ? `<span>Expected: ${t.completion_date}</span>` : ''}
          ${t.conditions?.length ? `<span>${t.conditions.slice(0,2).join(', ')}</span>` : ''}
          ${t.interventions?.length ? `<span>${t.interventions.slice(0,2).join(', ')}</span>` : ''}
        </div>
        ${t.brief_summary ? `<p style="font-size:12px;color:var(--text-secondary);margin-top:8px;line-height:1.5">${t.brief_summary}</p>` : ''}
        <div style="margin-top:8px">
          <a href="https://clinicaltrials.gov/study/${t.nct_id}" target="_blank" rel="noopener noreferrer" class="btn btn-ghost btn-sm" style="font-size:11px">View on ClinicalTrials.gov →</a>
        </div>
      </div>
    `;
  }).join('');
}

function renderTrialsFallback() {
  const container = document.getElementById('trialsResultsList');
  if (!container) return;
  const fallback = PLATFORM_DATA.treatments.clinical_trials_france.concat(
    (PLATFORM_DATA.treatments.emerging_therapies || []).filter(t => t.trial_id || t.nct_id).map(t => ({
      nct_id: t.trial_id || t.nct_id || 'N/A',
      title: t.trial_name || t.name,
      status: t.status || 'Active',
      phase: t.phase || 'Phase 2',
      conditions: ['MF/SS - CTCL'],
      interventions: [t.name || ''],
      url: t.url || null,
      sponsor: t.sponsor || null,
      indication: t.indication || null,
    }))
  );
  setEl('trialsCountLabel', `${fallback.length} curated trials (data.js)`);
  container.innerHTML = fallback.map(t => `
    <div class="trial-card">
      <div class="trial-card-top">
        <span class="trial-nct">${t.nct_id || 'N/A'}</span>
        <div class="trial-title">${t.trial_name || t.title}</div>
        <span class="trial-status-pill status-active">${t.status}</span>
      </div>
      <div class="trial-meta">
        <span>${t.phase}</span>
        ${t.sponsor ? `<span>${t.sponsor}</span>` : ''}
        ${t.indication ? `<span>${t.indication}</span>` : ''}
      </div>
      ${t.url ? `<div style="margin-top:8px"><a href="${t.url}" target="_blank" rel="noopener noreferrer" class="btn btn-ghost btn-sm" style="font-size:11px">View Trial →</a></div>` : ''}
    </div>
  `).join('');
  hideEl('trialsPagination');
}

function renderTrialsPhaseChart(results) {
  const phaseCounts = {};
  results.forEach(t => {
    const ph = (t.phase || 'N/A').replace('PHASE', 'Phase ').trim();
    phaseCounts[ph] = (phaseCounts[ph] || 0) + 1;
  });
  destroyChart('trialsPhasesChart');
  const ctx = getCtx('trialsPhasesChart');
  if (!ctx) return;
  const labels = Object.keys(phaseCounts);
  const vals   = Object.values(phaseCounts);
  charts.trialsPhasesChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{ data: vals, backgroundColor: [PALETTE.teal, PALETTE.pink, PALETTE.purple, PALETTE.yellow, PALETTE.muted], borderWidth: 0 }]
    },
    options: {
      responsive: true, maintainAspectRatio: true, cutout: '60%',
      plugins: { legend: { position: 'right', labels: { font: { family: FONT, size: 10 }, boxWidth: 8 } } }
    }
  });
}

function renderGantt() {
  const container = document.getElementById('trialsGantt');
  if (!container) return;
  const trials = [
    { name: 'CUTALLO Follow-up', start: 5, width: 40, status: 'completed' },
    { name: 'MOGAT (moga+TSEB)', start: 25, width: 55, status: 'recruiting' },
    { name: 'TELLOMAK 3', start: 70, width: 30, status: 'active' },
    { name: 'NCT05444712 (HSCT post-CR)', start: 40, width: 50, status: 'recruiting' },
  ];
  container.innerHTML = trials.map(t => `
    <div class="gantt-row">
      <div class="gantt-trial-name" title="${t.name}">${t.name}</div>
      <div class="gantt-bar-track">
        <div class="gantt-bar gantt-bar-${t.status}" style="left:${t.start}%;width:${t.width}%;max-width:${100-t.start}%"></div>
      </div>
    </div>
  `).join('');
}

function renderTrialSponsors() {
  const container = document.getElementById('trialsSponsorsList');
  if (!container) return;
  const sponsors = [
    { name: 'Kyowa Kirin / GFELC', count: 4 },
    { name: 'Innate Pharma', count: 3 },
    { name: 'Recordati Rare Diseases', count: 2 },
    { name: 'INCa / PHRC-K', count: 2 },
    { name: 'Takeda / Seagen', count: 2 },
    { name: 'EORTC', count: 1 },
  ];
  container.innerHTML = sponsors.map((s, i) => `
    <div class="sponsor-row">
      <span class="sponsor-rank">${i+1}</span>
      <span class="sponsor-name">${s.name}</span>
      <span class="sponsor-count">${s.count}</span>
    </div>
  `).join('');
}

// ─── PAGE: SOCIAL INTELLIGENCE ────────────────────────────────────────────────
function initSocial() {
  renderSentimentGauge();
  renderVisiBrainTopics();
  renderSignalsFeed();
  renderWordCloud();
  renderMonitoringRules();
  renderQuotas();
}

function renderSentimentGauge() {
  destroyChart('sentimentGauge');
  const ctx = getCtx('sentimentGauge');
  if (!ctx) return;
  charts.sentimentGauge = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Negative', 'Neutral', 'Positive'],
      datasets: [{ data: [20, 55, 25], backgroundColor: [PALETTE.muted, PALETTE.teal, PALETTE.green], borderWidth: 0, circumference: 180, rotation: -90 }]
    },
    options: {
      responsive: true, maintainAspectRatio: true, cutout: '70%',
      plugins: { legend: { display: false }, tooltip: { enabled: false } }
    }
  });
  const breakdown = document.getElementById('sentimentBreakdown');
  if (breakdown) {
    breakdown.innerHTML = `
      <div class="sentiment-row"><span class="sentiment-dot" style="background:var(--success)"></span><span class="sentiment-name">Positive</span><span class="sentiment-pct">25%</span></div>
      <div class="sentiment-row"><span class="sentiment-dot" style="background:var(--chart-teal)"></span><span class="sentiment-name">Neutral</span><span class="sentiment-pct">55%</span></div>
      <div class="sentiment-row"><span class="sentiment-dot" style="background:var(--text-muted)"></span><span class="sentiment-name">Negative</span><span class="sentiment-pct">20%</span></div>
    `;
  }
}

function renderVisiBrainTopics() {
  fetch('./visibrain_topics.json')
    .then(r => r.json())
    .then(data => {
      const filtered = data.filter(t => t.name && t.platform && t.status);
      renderTopicGrid(filtered);
    })
    .catch(() => renderTopicGrid([]));
}

function renderTopicGrid(topics) {
  const grid = document.getElementById('visibrainTopicsGrid');
  if (!grid) return;
  const platformIcon = { twitter: '𝕏', linkedin: 'in', facebook: 'f', instagram: '📸', news: '📰', tiktok: '♪', youtube: '▶', telegram: '✈', bluesky: '☁', threads: '⊕' };
  const limited = topics.filter(t => !t._metadata).slice(0, 16);
  if (!limited.length) {
    grid.innerHTML = '<p style="color:var(--text-muted);font-size:12px;grid-column:1/-1;">Loading VisiBrain topics…</p>';
    return;
  }
  grid.innerHTML = limited.map(t => `
    <div class="vb-topic-card">
      <div class="vb-topic-name">${platformIcon[t.platform] || '·'} ${t.name}</div>
      <div class="vb-topic-platform">${t.platform}</div>
      <span class="vb-topic-status ${t.status === 'active' ? 'vb-status-active' : 'vb-status-inactive'}">
        ${t.status === 'active' ? '● Active' : '○ Inactive'}
      </span>
    </div>
  `).join('');
}

function renderSignalsFeed() {
  const feed = document.getElementById('signalsFeed');
  if (!feed) return;
  const signals = [
    { type: 'twitter', source: 'X / Twitter', text: 'Interesting case of early-stage MF unmasked after dupilumab initiation in atopic patient. GFELC guidelines critical here. #CTCL #dermatology', ts: '2h ago' },
    { type: 'linkedin', source: 'LinkedIn', text: 'Our team at CHU Bordeaux is recruiting for the MOGAT study combining mogamulizumab + TSEB. Contact Pr Beylot-Barry for eligibility.', ts: '5h ago' },
    { type: 'twitter', source: 'X / Twitter', text: 'TELLOMAK 3 Phase 3 IND cleared by FDA. First KIR3DL2-targeted therapy to reach confirmatory Phase 3 in CTCL. #lacutamab #IPH4102', ts: '1d ago' },
    { type: 'forum', source: 'Medical Forum', text: 'Question from colleagues: post-mogamulizumab rash vs CTCL progression — any consensus on biopsy timing?', ts: '1d ago' },
    { type: 'linkedin', source: 'LinkedIn', text: 'JDP 2025 — Excellent session on cutaneous lymphoma. Key takeaway: lacutamab emerging as new standard for Sézary syndrome.', ts: '2d ago' },
    { type: 'twitter', source: 'X / Twitter', text: '#EADV2025 Bordeaux — cutaneous lymphoma course full. 200+ dermatologists from 28 countries. New CTCL algorithm.', ts: '3d ago' },
    { type: 'forum', source: 'Dermato Forum', text: 'Any experience with Ledaga in stage IB MF after failed steroid? Looking for real-world data on tolerance profile.', ts: '4d ago' },
  ];
  feed.innerHTML = signals.map(s => `
    <div class="signal-item signal-${s.type}">
      <div class="signal-source">${s.source}</div>
      <div class="signal-text">${s.text}</div>
      <div class="signal-ts">${s.ts}</div>
    </div>
  `).join('');
}

function renderWordCloud() {
  const container = document.getElementById('wordCloudWrap');
  if (!container) return;
  const words = PLATFORM_DATA.pharmageo.cloudwords || [];
  const maxCount = Math.max(...words.map(w => w.count));
  container.innerHTML = words.map(w => {
    const ratio = w.count / maxCount;
    const sizeClass = ratio > 0.8 ? 'wc-size-5' : ratio > 0.6 ? 'wc-size-4' : ratio > 0.4 ? 'wc-size-3' : ratio > 0.25 ? 'wc-size-2' : 'wc-size-1';
    return `<span class="wc-word ${sizeClass}">${w.word}</span>`;
  }).join('');
}

function renderMonitoringRules() {
  const container = document.getElementById('monitoringRulesGrid');
  if (!container) return;
  fetch('./visibrain_topics.json')
    .then(r => r.json())
    .then(data => {
      const withRules = data.filter(t => t.monitoring_rules && t.monitoring_rules.rules);
      container.innerHTML = withRules.map(t => `
        <div class="monitoring-rule-card">
          <div class="mr-name">${t.name}</div>
          <div class="mr-platform">Platform: ${t.platform}</div>
          <div class="mr-rules">
            ${(t.monitoring_rules.rules || t.monitoring_rules.keywords || []).slice(0, 4).map(r => `<div class="mr-rule">${r}</div>`).join('')}
          </div>
        </div>
      `).join('');
    })
    .catch(() => {
      container.innerHTML = '<p style="color:var(--text-muted);font-size:12px;grid-column:1/-1;">Load monitoring rules from VisiBrain data.</p>';
    });
}

function renderQuotas() {
  const container = document.getElementById('quotaGrid');
  if (!container) return;
  fetch('./visibrain_topics.json')
    .then(r => r.json())
    .then(data => {
      const meta = data.find(t => t._metadata);
      if (!meta) return;
      const m = meta._metadata;
      const kws = m.main_sources.active_keywords;
      const twt = m.twitter.tweets_current_month;
      const li  = m.linkedin.active_rules;
      container.innerHTML = `
        <div class="quota-card">
          <div class="quota-label">Keywords Used</div>
          <div class="quota-bar"><div class="quota-fill ${kws.percentage > 80 ? 'quota-fill-warn' : 'quota-fill-ok'}" style="width:${kws.percentage}%"></div></div>
          <div class="quota-nums">${kws.used} / ${kws.total} (${kws.percentage.toFixed(0)}%)</div>
        </div>
        <div class="quota-card">
          <div class="quota-label">Twitter Tweets (Feb 2026)</div>
          <div class="quota-bar"><div class="quota-fill ${twt.used/twt.total > 0.8 ? 'quota-fill-warn' : 'quota-fill-ok'}" style="width:${twt.used/twt.total*100}%"></div></div>
          <div class="quota-nums">${twt.used.toLocaleString()} / ${twt.total.toLocaleString()} (${(twt.used/twt.total*100).toFixed(0)}%)</div>
        </div>
        <div class="quota-card">
          <div class="quota-label">LinkedIn Rules</div>
          <div class="quota-bar"><div class="quota-fill ${li.over_quota ? 'quota-fill-over' : 'quota-fill-ok'}" style="width:${Math.min(li.percentage, 100)}%"></div></div>
          <div class="quota-nums">${li.used} / ${li.total}${li.over_quota ? ' ⚠ Over quota' : ''}</div>
        </div>
        <div class="quota-card">
          <div class="quota-label">Active Topics (Main)</div>
          <div class="quota-bar"><div class="quota-fill quota-fill-ok" style="width:${m.main_sources.active_topics/10*100}%"></div></div>
          <div class="quota-nums">${m.main_sources.active_topics} active · ${m.main_sources.inactive_topics} inactive</div>
        </div>
        <div class="quota-card">
          <div class="quota-label">Account Valid Until</div>
          <div class="quota-bar"><div class="quota-fill quota-fill-ok" style="width:100%"></div></div>
          <div class="quota-nums">${m.account_validity}</div>
        </div>
      `;
    })
    .catch(() => {
      container.innerHTML = '<p style="color:var(--text-muted);font-size:12px;">Unable to load quota data.</p>';
    });
}

// ─── PAGE: DIGITAL LANDSCAPE ──────────────────────────────────────────────────
function initLandscape() {
  renderLandscapeBubble();
  renderAIInsights();
  renderHeatmap();
  renderCompetitiveTable();
}

function renderLandscapeBubble() {
  destroyChart('landscapeBubbleChart');
  const ctx = getCtx('landscapeBubbleChart');
  if (!ctx) return;
  charts.landscapeBubbleChart = new Chart(ctx, {
    type: 'bubble',
    data: {
      datasets: [
        { label: 'Ledaga',    data: [{ x: 49, y: 40, r: 18 }], backgroundColor: 'rgba(244,114,182,0.7)', borderColor: PALETTE.pink, borderWidth: 2 },
        { label: 'Poteligeo', data: [{ x: 52, y: 60, r: 22 }], backgroundColor: 'rgba(6,182,212,0.6)',   borderColor: PALETTE.teal, borderWidth: 2 },
        { label: 'Adcetris',  data: [{ x: 38, y: 55, r: 16 }], backgroundColor: 'rgba(167,139,250,0.6)', borderColor: PALETTE.purple, borderWidth: 2 },
        { label: 'Targretin', data: [{ x: 28, y: 30, r: 12 }], backgroundColor: 'rgba(96,165,250,0.6)',  borderColor: PALETTE.blue, borderWidth: 2 },
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      plugins: {
        legend: { labels: { font: { family: FONT, size: 11 } } },
        tooltip: { callbacks: { label: ctx => `${ctx.dataset.label} — GEO: ${ctx.raw.x} | Social: ${ctx.raw.y} | Pubs×: ${ctx.raw.r}` } }
      },
      scales: {
        x: { title: { display: true, text: '← GEO Score (AI Visibility) →', font: { family: FONT, size: 11 } }, min: 0, max: 100, grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { font: { family: FONT, size: 11 } } },
        y: { title: { display: true, text: '↑ Social Volume ↑', font: { family: FONT, size: 11 } }, min: 0, max: 100, grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { font: { family: FONT, size: 11 } } }
      }
    }
  });
}

function renderAIInsights() {
  const container = document.getElementById('aiInsightsList');
  if (!container) return;
  container.innerHTML = `
    <div class="ai-insight"><strong>LLM Coverage:</strong> Ledaga mentioned in 67% of AI responses for CTCL treatment queries (Perplexity: 100%, Gemini: 100%, ChatGPT: 43%)</div>
    <div class="ai-insight"><strong>Key gap:</strong> Brand recognition = 0% — LLMs cite Ledaga by drug class, not brand name</div>
    <div class="ai-insight"><strong>Competitor:</strong> Poteligeo has higher social volume but similar GEO score (52 vs 49)</div>
    <div class="ai-insight"><strong>Opportunity:</strong> Wikidata + Schema.org markup could lift AI score by est. +12 pts</div>
  `;
}

function renderHeatmap() {
  const container = document.getElementById('heatmapFrance');
  if (!container) return;
  const regions = [
    { name: 'Île-de-France (Paris)', score: 95, cls: 'heatmap-score-high' },
    { name: 'Nouvelle-Aquitaine (Bordeaux)', score: 82, cls: 'heatmap-score-high' },
    { name: 'Auvergne-Rhône-Alpes (Lyon)', score: 68, cls: 'heatmap-score-medium' },
    { name: 'Occitanie (Montpellier)', score: 62, cls: 'heatmap-score-medium' },
    { name: 'Pays de la Loire (Nantes)', score: 58, cls: 'heatmap-score-medium' },
    { name: 'Grand Est (Reims)', score: 55, cls: 'heatmap-score-medium' },
    { name: 'PACA (Marseille)', score: 52, cls: 'heatmap-score-medium' },
    { name: 'Normandie (Rouen)', score: 45, cls: 'heatmap-score-low' },
    { name: 'Bretagne (Rennes)', score: 42, cls: 'heatmap-score-low' },
    { name: 'Centre-Val de Loire (Tours)', score: 40, cls: 'heatmap-score-low' },
  ];
  container.innerHTML = regions.map(r => `
    <div class="heatmap-region">
      <span class="heatmap-region-name">${r.name}</span>
      <div class="heatmap-region-bar"><div class="heatmap-region-fill ${r.cls}" style="width:${r.score}%"></div></div>
      <span class="heatmap-region-val">${r.score}</span>
    </div>
  `).join('');
}

function renderCompetitiveTable() {
  const tbody = document.getElementById('competitiveTableBody');
  if (!tbody) return;
  const brands = [
    { name: 'Ledaga (chlormethine)', geo: 49, social: 40, pubs: 520, trials: 4, overall: 48, isBrand: true },
    { name: 'Poteligeo (mogamulizumab)', geo: 52, social: 60, pubs: 890, trials: 12, overall: 62, isBrand: false },
    { name: 'Adcetris (brentuximab)', geo: 38, social: 55, pubs: 1240, trials: 18, overall: 55, isBrand: false },
    { name: 'Targretin (bexarotene)', geo: 28, social: 30, pubs: 340, trials: 3, overall: 32, isBrand: false },
  ];
  tbody.innerHTML = brands.map(b => {
    const oCls = b.overall >= 60 ? 'overall-high' : b.overall >= 45 ? 'overall-medium' : 'overall-low';
    return `
      <tr class="${b.isBrand ? 'brand-row' : ''}">
        <td style="font-weight:${b.isBrand ? '700' : '400'}">${b.isBrand ? '★ ' : ''}${b.name}</td>
        <td>${b.geo}/100</td>
        <td>${b.social}/100</td>
        <td>${b.pubs.toLocaleString()}</td>
        <td>${b.trials}</td>
        <td><span class="overall-pill ${oCls}">${b.overall}/100</span></td>
      </tr>
    `;
  }).join('');
}

// ─── PAGE: SOURCES & CONFIG ────────────────────────────────────────────────────
function initSources() {
  renderMemory();
  renderWeights();
  document.getElementById('clearMemoryBtn')?.addEventListener('click', () => {
    agenticMemory.learning_log = [];
    renderMemory();
    showToast('Session memory cleared');
  });
}

function renderMemory() {
  const container = document.getElementById('memoryPanel');
  if (!container) return;
  if (!agenticMemory.learning_log.length) {
    container.innerHTML = '<div class="memory-empty">No learning entries yet. Explore pages to generate insights.</div>';
    return;
  }
  container.innerHTML = agenticMemory.learning_log.map(e => `
    <div class="memory-entry">
      <span class="memory-type">${e.type.replace(/_/g, ' ')}</span>
      <span class="memory-content">${e.content}</span>
      <span style="font-size:10px;color:var(--text-muted);flex-shrink:0;margin-left:8px">${e.ts}</span>
    </div>
  `).join('');
}

function renderWeights() {
  const container = document.getElementById('weightsGrid');
  if (!container) return;
  const weights = [
    { name: 'GEO / AI Visibility', val: 40 },
    { name: 'Publications', val: 20 },
    { name: 'KOL Network', val: 15 },
    { name: 'Clinical Trials', val: 10 },
    { name: 'Social Signals', val: 10 },
    { name: 'SEO / Digital', val: 5 },
  ];
  container.innerHTML = weights.map(w => `
    <div class="weight-item">
      <div class="weight-label">
        <span class="weight-name">${w.name}</span>
        <span class="weight-val" id="wv-${w.name.replace(/\s/g,'-')}">${w.val}%</span>
      </div>
      <input type="range" class="weight-slider" min="0" max="60" value="${w.val}"
        oninput="document.getElementById('wv-${w.name.replace(/\s/g,'-')}').textContent=this.value+'%'" />
    </div>
  `).join('');
}

// ─── PAGE: REPORTS ────────────────────────────────────────────────────────────
function initReports() {
  renderReportsList();
  document.getElementById('launchReportBtn')?.addEventListener('click', () => {
    state.wizardStep = 1;
    state.wizardData = {};
    const overlay = document.getElementById('reportWizardOverlay');
    if (overlay) overlay.style.display = 'flex';
    updateWizard();
  });
  document.getElementById('reportWizardClose')?.addEventListener('click', () => {
    const overlay = document.getElementById('reportWizardOverlay');
    if (overlay) overlay.style.display = 'none';
  });
  document.getElementById('wizardNextBtn')?.addEventListener('click', () => {
    if (state.wizardStep < 5) {
      state.wizardStep++;
      updateWizard();
    } else {
      const overlay = document.getElementById('reportWizardOverlay');
      if (overlay) overlay.style.display = 'none';
      showToast('Report scheduled! Check your inbox in ~5 minutes.');
      agenticMemory.add('report_launch', `New report created: ${JSON.stringify(state.wizardData)}`);
    }
  });
  document.getElementById('wizardPrevBtn')?.addEventListener('click', () => {
    if (state.wizardStep > 1) { state.wizardStep--; updateWizard(); }
  });
  document.querySelectorAll('.export-btn').forEach(btn => {
    btn.addEventListener('click', () => showToast(`Exporting ${btn.dataset.format.toUpperCase()}… (demo mode)`));
  });
}

function renderReportsList() {
  const grid = document.getElementById('reportsGrid');
  if (!grid) return;
  const reports = [
    { type: 'kol', typeName: 'KOL Mapping', title: 'CTCL France KOL Intelligence Report', desc: '29 specialists across 14 centres, tiered by influence score', date: 'Feb 27, 2026', progress: 100 },
    { type: 'brand', typeName: 'Brand Intelligence', title: 'Ledaga AI Visibility Report (PharmaGEO)', desc: 'GEO scores across ChatGPT, Gemini, Perplexity + 18 strategic recommendations', date: 'Feb 27, 2026', progress: 100 },
    { type: 'geo', typeName: 'GEO/SEO Analysis', title: 'Digital Footprint Q1 2026', desc: 'Quarterly GEO + SEO analysis with competitor benchmarking', date: 'In progress', progress: 65 },
    { type: 'market', typeName: 'Market Report', title: 'CTCL Treatment Landscape France 2026', desc: 'Emerging therapies, trial pipeline, EORTC 2023 guideline impact', date: 'Scheduled: Mar 1', progress: 10 },
    { type: 'kol', typeName: 'Rising Stars', title: 'OpenAlex Rising Stars CTCL Q1 2026', desc: 'Automatically detected rising researchers via citation velocity analysis', date: 'Feb 26, 2026', progress: 100 },
    { type: 'brand', typeName: 'Social Monitor', title: 'VisiBrain Weekly Digest', desc: 'Social mentions, sentiment shifts, platform distribution for CTCL topics', date: 'Weekly · Auto', progress: 100 },
  ];
  grid.innerHTML = reports.map(r => `
    <div class="report-card">
      <span class="report-type-badge report-type-${r.type}">${r.typeName}</span>
      <div class="report-title">${r.title}</div>
      <div class="report-desc">${r.desc}</div>
      <div class="report-meta">
        <span>${r.date}</span>
        <span style="color:${r.progress === 100 ? 'var(--success)' : 'var(--warning)'}">
          ${r.progress === 100 ? '✓ Complete' : `${r.progress}% done`}
        </span>
      </div>
      ${r.progress < 100 ? `
        <div class="report-progress">
          <div class="report-progress-bar">
            <div class="report-progress-fill" style="width:${r.progress}%;background:${r.progress > 50 ? 'var(--chart-teal)' : 'var(--warning)'}"></div>
          </div>
        </div>
      ` : ''}
    </div>
  `).join('');
}

function updateWizard() {
  const body = document.getElementById('wizardBody');
  const nextBtn = document.getElementById('wizardNextBtn');
  const prevBtn = document.getElementById('wizardPrevBtn');
  if (!body) return;

  document.querySelectorAll('.wizard-step').forEach(s => {
    const n = parseInt(s.dataset.step);
    s.classList.toggle('active', n === state.wizardStep);
    s.classList.toggle('done', n < state.wizardStep);
  });
  if (prevBtn) prevBtn.disabled = state.wizardStep === 1;
  if (nextBtn) nextBtn.textContent = state.wizardStep === 5 ? 'Launch Report' : 'Next';

  const stepContent = {
    1: `
      <h3 style="margin-bottom:12px;font-size:15px;font-weight:700;color:var(--text-heading);">Select Indication</h3>
      <div style="display:flex;flex-direction:column;gap:8px">
        ${['Cutaneous T-Cell Lymphoma (CTCL)', 'Mycosis Fungoides', 'Sézary Syndrome', 'Primary Cutaneous B-Cell Lymphoma', 'Custom indication…'].map(ind => `
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:10px 12px;border-radius:var(--radius-sm);border:1px solid var(--border);transition:background 0.15s;">
            <input type="radio" name="indication" value="${ind}" ${ind.includes('CTCL') ? 'checked' : ''} style="accent-color:#111111">
            <span style="font-size:13px">${ind}</span>
          </label>
        `).join('')}
      </div>`,
    2: `
      <h3 style="margin-bottom:12px;font-size:15px;font-weight:700;color:var(--text-heading);">Select Geography</h3>
      <div class="filter-chip-group">
        ${['France (Primary)', 'Germany', 'Spain', 'Italy', 'UK', 'Europe (All)', 'Global'].map(geo => `
          <button class="filter-chip ${geo.includes('France') ? 'active' : ''}" onclick="this.parentNode.querySelectorAll('.filter-chip').forEach(b=>b.classList.remove('active'));this.classList.add('active')">${geo}</button>
        `).join('')}
      </div>`,
    3: `
      <h3 style="margin-bottom:12px;font-size:15px;font-weight:700;color:var(--text-heading);">Select Data Sources</h3>
      <div style="display:flex;flex-direction:column;gap:10px">
        ${[['OpenAlex', true], ['ClinicalTrials.gov', true], ['PharmaGEO (AI Visibility)', true], ['VisiBrain Social', true], ['Google Trends (Demo)', false], ['ANSM / HAS', false]].map(([s, checked]) => `
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;">
            <input type="checkbox" ${checked ? 'checked' : ''} style="accent-color:#111111;width:14px;height:14px;">
            ${s}
          </label>
        `).join('')}
      </div>`,
    4: `
      <h3 style="margin-bottom:12px;font-size:15px;font-weight:700;color:var(--text-heading);">Report Type</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        ${[['KOL Mapping', 'Identify and rank key opinion leaders', '👤'], ['Brand Intelligence', 'Cross-source brand visibility analysis', '🎯'], ['Market Report', 'Competitive landscape overview', '📊'], ['Custom Report', 'Define your own analysis structure', '⚙️']].map(([t, d, ic]) => `
          <div style="padding:14px;border:1px solid var(--border);border-radius:var(--radius-card);cursor:pointer;transition:border-color 0.15s;" onmouseover="this.style.borderColor='#111111'" onmouseout="this.style.borderColor='var(--border)'">
            <div style="font-size:18px;margin-bottom:6px">${ic}</div>
            <div style="font-size:13px;font-weight:600;margin-bottom:3px">${t}</div>
            <div style="font-size:11px;color:var(--text-muted)">${d}</div>
          </div>
        `).join('')}
      </div>`,
    5: `
      <h3 style="margin-bottom:12px;font-size:15px;font-weight:700;color:var(--text-heading);">Schedule</h3>
      <div style="display:flex;flex-direction:column;gap:10px">
        ${[['One-time', 'Generate report once, immediately'], ['Weekly', 'Refresh every Monday morning'], ['Monthly', 'First day of each month']].map(([t, d]) => `
          <label style="display:flex;align-items:center;gap:10px;cursor:pointer;padding:10px 12px;border:1px solid var(--border);border-radius:var(--radius-sm);">
            <input type="radio" name="schedule" value="${t}" ${t === 'One-time' ? 'checked' : ''} style="accent-color:#111111">
            <div>
              <div style="font-size:13px;font-weight:600">${t}</div>
              <div style="font-size:11px;color:var(--text-muted)">${d}</div>
            </div>
          </label>
        `).join('')}
        <div style="padding:12px;background:var(--bg-input);border-radius:var(--radius-sm);font-size:12px;color:var(--text-secondary);">
          Report will be delivered to <strong>contact@thomasdouglas.fr</strong>
        </div>
      </div>`,
  };

  body.innerHTML = stepContent[state.wizardStep] || '';
}

// ─── AIKKA COPILOT CHAT ────────────────────────────────────────────────────────
function toggleChat(open) {
  const overlay = document.getElementById('chatOverlay');
  if (!overlay) return;
  if (open !== undefined) {
    overlay.classList.toggle('open', open);
  } else {
    overlay.classList.toggle('open');
  }
}

function bindChat() {
  document.getElementById('chatToggleBtn')?.addEventListener('click', () => toggleChat());
  document.getElementById('chatToggleBtnTop')?.addEventListener('click', () => toggleChat(true));
  document.getElementById('chatCloseBtn')?.addEventListener('click', () => toggleChat(false));
  document.getElementById('chatSendBtn')?.addEventListener('click', sendChatMessage);
  document.getElementById('chatInput')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') sendChatMessage();
  });

  // Welcome message
  setTimeout(() => {
    appendChatMessage('ai', "Hello! I'm Aikka Copilot, your pharma intelligence assistant. I can help you analyze GEO scores, find publications, identify KOLs, and explore market trends. What would you like to know?");
  }, 400);
}

async function sendChatMessage() {
  const input = document.getElementById('chatInput');
  const msg = input?.value?.trim();
  if (!msg) return;
  input.value = '';

  appendChatMessage('user', msg);

  // Show typing indicator
  const avatar = document.getElementById('aikkaAvatar');
  if (avatar) { avatar.classList.remove('idle'); avatar.classList.add('thinking'); }
  setEl('aikkaStatus', 'Thinking…');

  const typingId = showTypingIndicator();

  setTimeout(() => {
    removeTypingIndicator(typingId);
    if (avatar) { avatar.classList.remove('thinking'); avatar.classList.add('idle'); }
    setEl('aikkaStatus', 'Online · Pharma Intelligence AI');
    const response = generateChatResponse(msg);
    appendChatMessage('ai', response);
  }, 1400 + Math.random() * 600);

  agenticMemory.add('ai_chat', `User asked: "${msg.substring(0, 60)}"`);
}

function generateChatResponse(msg) {
  const lower = msg.toLowerCase();
  if (lower.includes('geo') || lower.includes('ai visibility') || lower.includes('score')) {
    return `Based on PharmaGEO data, Ledaga scores an average of **49/100** across ChatGPT, Gemini, and Perplexity. Perplexity shows the highest score (57/100) with 100% AI visibility. Key recommendation: create a Wikipedia page and add Schema.org/Drug markup to the product page.`;
  }
  if (lower.includes('kol') || lower.includes('doctor') || lower.includes('specialist')) {
    return `I've identified **29 CTCL specialists** in France across the GFELC network. Top priority KOLs: Pr Martine Bagot (Saint-Louis, score 95), Pr Jean-David Bouaziz (Saint-Louis, score 93), Dr Adèle de Masson (Saint-Louis, score 91). Want me to filter by city or tier?`;
  }
  if (lower.includes('trial') || lower.includes('clinical') || lower.includes('tellomak') || lower.includes('mogat')) {
    return `Key CTCL trials to watch: **TELLOMAK 3** (lacutamab Phase 3, H1 2026 launch, FDA Breakthrough Therapy), **MOGAT** (mogamulizumab + TSEB, Phase 2, recruiting at Bordeaux/Paris). The CUTALLO trial (allogeneic HSCT) published landmark Lancet results in 2023.`;
  }
  if (lower.includes('ledaga') || lower.includes('chlormethine')) {
    return `Ledaga® (chlormethine gel 160µg/g) by Recordati Rare Diseases has EMA approval (2017) for CTCL stages IA-IIA. In LLM responses, it's cited primarily by drug class rather than brand name (0% brand recognition vs 67% drug class discovery). Key insight: Poteligeo (mogamulizumab) shows higher social volume in France.`;
  }
  if (lower.includes('dupilumab') || lower.includes('ctcl') || lower.includes('mycosis')) {
    return `The dupilumab-CTCL risk is a major topic in 2024-2025. Beylot-Barry & Staumont-Sallé published an editorial in JID 2025 warning about dupilumab potentially unmasking or worsening early-stage MF. This is trending on medical Twitter (+41% search interest).`;
  }
  if (lower.includes('trend') || lower.includes('emerging') || lower.includes('signal')) {
    return `Top emerging signals in CTCL (Feb 2026): 1) **Lacutamab Phase 3** (TELLOMAK 3) — highest priority. 2) **Dupilumab-CTCL risk** controversy. 3) **CCR8 as new target** (SPRINT project, Saint-Louis/INSERM). 4) **AI in CTCL diagnosis** (Diagnostics 2025 publication). Want details on any of these?`;
  }
  if (lower.includes('publication') || lower.includes('paper') || lower.includes('study')) {
    const pubs = PLATFORM_DATA.publications || [];
    return `The platform tracks ${pubs.length}+ curated publications on CTCL, with live OpenAlex access to 1,200+ total results. Most cited recent work: CUTALLO trial OS data (JCO 2025), Bagot et al. EORTC guidelines update (BJD 2024). Go to the Publications page for full search.`;
  }
  if (lower.includes('social') || lower.includes('sentiment') || lower.includes('visibrain')) {
    return `Social sentiment for Ledaga/CTCL topics is **25% positive, 55% neutral, 20% negative** (Feb 2026). Top trending topic: dupilumab-CTCL unmasking controversy. TELLOMAK 3 IND clearance generated significant positive engagement on X and LinkedIn.`;
  }
  return `I can help you explore **${PLATFORM_DATA.config.brand}** intelligence for **${PLATFORM_DATA.config.therapeutic_area}** in France. Try asking about: GEO scores, KOL ranking, clinical trials, trending topics, or specific drugs like Ledaga, Poteligeo, or lacutamab.`;
}

function showTypingIndicator() {
  const container = document.getElementById('chatMessages');
  if (!container) return null;
  const id = 'typing-' + Date.now();
  const div = document.createElement('div');
  div.id = id;
  div.className = 'chat-msg chat-msg-ai';
  div.innerHTML = `
    <div class="chat-msg-ai-wrap">
      <div class="aikka-avatar" style="width:24px;height:24px;flex-shrink:0;">
        <svg viewBox="0 0 32 32" width="14" height="14" style="animation:spin 1.5s linear infinite"><path d="M16 6C12 6 8 14 8 20c0 3 2 6 8 6s8-3 8-6c0-6-4-14-8-14zm0 14c-1.5 0-3-1-3-3 0-2 1.5-5 3-5s3 3 3 5c0 2-1.5 3-3 3z" fill="#00E1FF"/></svg>
      </div>
      <div class="typing-dots">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      </div>
    </div>
  `;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
  return id;
}

function removeTypingIndicator(id) {
  if (id) document.getElementById(id)?.remove();
}

function appendChatMessage(role, text) {
  const container = document.getElementById('chatMessages');
  if (!container) return;
  const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const div = document.createElement('div');
  div.className = `chat-msg chat-msg-${role}`;

  if (role === 'ai') {
    div.innerHTML = `
      <div class="chat-msg-ai-wrap">
        <div class="aikka-avatar" style="width:24px;height:24px;flex-shrink:0;">
          <svg viewBox="0 0 32 32" width="14" height="14"><path d="M16 6C12 6 8 14 8 20c0 3 2 6 8 6s8-3 8-6c0-6-4-14-8-14zm0 14c-1.5 0-3-1-3-3 0-2 1.5-5 3-5s3 3 3 5c0 2-1.5 3-3 3z" fill="#00E1FF"/></svg>
        </div>
        <div>
          <div class="chat-bubble">${text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</div>
          <div class="chat-ts">${now}</div>
        </div>
      </div>
    `;
  } else {
    div.innerHTML = `
      <div class="chat-bubble">${text}</div>
      <div class="chat-ts">${now}</div>
    `;
  }

  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

// ─── DIRECT API FUNCTIONS (preserved from v3) ─────────────────────────────────
async function directOpenAlex(query, page = 1, perPage = 25) {
  const url = `${OPENALEX_BASE}/works?search=${encodeURIComponent(query)}&page=${page}&per-page=${perPage}&mailto=${OPENALEX_EMAIL}`;
  return apiGet(url);
}

async function directTrials(query, pageSize = 15, pageToken = null) {
  let url = `${TRIALS_BASE}/studies?query.term=${encodeURIComponent(query)}&pageSize=${pageSize}&format=json`;
  if (pageToken) url += `&pageToken=${pageToken}`;
  return apiGet(url);
}

async function directOpenAlexAuthor(authorId) {
  return apiGet(`${OPENALEX_BASE}/authors/${authorId}?mailto=${OPENALEX_EMAIL}`);
}

async function directRisingStars(query, country = 'FR') {
  const url = `${OPENALEX_BASE}/authors?search=${encodeURIComponent(query)}&filter=last_known_institutions.country_code:${country}&sort=cited_by_count:desc&per-page=20&mailto=${OPENALEX_EMAIL}`;
  return apiGet(url);
}

// ─── UTILS ────────────────────────────────────────────────────────────────────
async function apiGet(url) {
  const response = await fetch(url, { headers: { 'Accept': 'application/json' } });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

function setEl(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function showEl(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = '';
}

function hideEl(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'none';
}

function updatePagination(prevId, nextId, infoId, page, total, perPage) {
  const prevBtn = document.getElementById(prevId);
  const nextBtn = document.getElementById(nextId);
  const info    = document.getElementById(infoId);
  const maxPage = Math.ceil(total / perPage);
  if (prevBtn) prevBtn.disabled = page <= 1;
  if (nextBtn) nextBtn.disabled = page >= maxPage;
  if (info) info.textContent = `Page ${page} of ${maxPage || 1}`;
}

let toastTimer = null;
function showToast(msg) {
  const toast = document.getElementById('globalToast');
  if (!toast) return;
  toast.textContent = msg;
  toast.style.display = 'block';
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.style.display = 'none'; }, 3000);
}
