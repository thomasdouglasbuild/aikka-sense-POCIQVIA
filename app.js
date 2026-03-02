'use strict';

/* ═══════════════════════════════════════════════════════════════════
   1. CONFIG
═══════════════════════════════════════════════════════════════════ */
const CGI_BIN = '__CGI_BIN__';
const API = CGI_BIN + '/aikka_api.py';
const OPENALEX_BASE = 'https://api.openalex.org';
const CLINICAL_TRIALS_BASE = 'https://clinicaltrials.gov/api/v2/studies';

/* ═══════════════════════════════════════════════════════════════════
   2. CHART PALETTE
═══════════════════════════════════════════════════════════════════ */
const PALETTE = {
  primary:   '#111111',
  accent:    '#00E1FF',
  blue:      '#60A5FA',
  pink:      '#F472B6',
  yellow:    '#EAB308',
  green:     '#22C55E',
  gray:      '#9CA3AF',
  purple:    '#A78BFA',
  orange:    '#FB923C',
  red:       '#F87171',
  bg:        '#F8F9FA',
  border:    '#E5E7EB',
  textMuted: '#6B7280'
};
const CHART_COLORS = [PALETTE.accent, PALETTE.blue, PALETTE.pink, PALETTE.yellow, PALETTE.purple, PALETTE.orange, PALETTE.green, PALETTE.gray];
const FONT = "'DM Sans', sans-serif";

/* ═══════════════════════════════════════════════════════════════════
   3. STATE
═══════════════════════════════════════════════════════════════════ */
const charts = {};
const state = {
  currentPage: 'home',
  pubPage: 1,
  pubQuery: '',
  pubResults: [],
  pubTotal: 0,
  trialsPage: 1,
  trialsQuery: '',
  trialsResults: [],
  trialsTotal: 0,
  kolFilter: 'all',
  chatOpen: false,
  chatFirstOpen: true,
  wizardStep: 1,
  boardWizardStep: 1,
  boardDraft: {},
  reportWizardStep: 1,
  agenticMemory: [],
  sourceWeights: { geo: 30, publications: 25, social: 20, trials: 15, kol: 10 }
};

/* ═══════════════════════════════════════════════════════════════════
   4. BOARD MANAGEMENT
═══════════════════════════════════════════════════════════════════ */
const boards = [
  {
    id: 'ledaga-ctcl-fr',
    name: 'Ledaga · CTCL · France',
    brand: 'Ledaga',
    area: 'Lymphomes T Cutanés',
    geo: 'France',
    competitor: 'Poteligeo',
    status: 'active',
    lastUpdated: '2026-02-27',
    geoScore: 49,
    publications: 247,
    kols: 29,
    trials: 7
  }
];

let activeBoard = boards[0];

function getActiveBoardData() {
  if (activeBoard.id === 'ledaga-ctcl-fr') return PLATFORM_DATA;
  if (typeof SPAIN_CARDIO_DATA !== 'undefined' && activeBoard.id && activeBoard.id.includes('spain')) return SPAIN_CARDIO_DATA;
  // For dynamically generated boards, build from activeBoard.generatedData
  const gd = activeBoard.generatedData || {};
  return {
    config: {
      brand: activeBoard.brand || '',
      therapeutic_area: activeBoard.area || '',
      market: activeBoard.geo || '',
      pathology: activeBoard.indication || '',
      competitor: activeBoard.competitor || '',
      last_updated: new Date().toISOString()
    },
    pharmageo: {
      scores: gd.geoScores || [],
      cloudwords: gd.cloudwords || [],
      trending_questions: gd.trendingQuestions || [],
      competitive: gd.competitive || [],
      sources: gd.sources || [],
      recommendations: gd.recommendations || [],
      discoverability: gd.discoverability || { brandRecognition: 0, innOnly: 0, drugClass: 0, notFound: 100 },
      agnostic: gd.agnostic || { overview: {}, products: [] }
    },
    kols: { france: gd.kols || [] },
    publications: gd.publications || [],
    treatments: { clinical_trials_france: gd.trials || [], emerging_therapies: [] },
    trending_topics: gd.trending_topics || []
  };
}

function updateBoardUI() {
  const name = activeBoard.name;
  setEl('sidebarBoardName', name);
  setEl('boardSelectorText', name);
  const dashLabel = document.getElementById('dashBoardLabel');
  if (dashLabel) dashLabel.textContent = name;
  renderBoardDropdown();
}

function renderBoardDropdown() {
  const dd = document.getElementById('boardDropdown');
  if (!dd) return;
  dd.innerHTML = boards.map(b => `
    <div class="board-dropdown-item ${b.id === activeBoard.id ? 'active' : ''}" data-board-id="${b.id}">
      <svg width="8" height="8" viewBox="0 0 8 8"><circle cx="4" cy="4" r="4" fill="${b.id === activeBoard.id ? '#22C55E' : '#9CA3AF'}"/></svg>
      <span>${escHtml(b.name)}</span>
    </div>
  `).join('');
  dd.querySelectorAll('.board-dropdown-item').forEach(el => {
    el.addEventListener('click', () => {
      const bid = el.getAttribute('data-board-id');
      const found = boards.find(b => b.id === bid);
      if (found) {
        activeBoard = found;
        updateBoardUI();
        loadPageData(state.currentPage);
        dd.classList.remove('open');
      }
    });
  });
}

/* ═══════════════════════════════════════════════════════════════════
   5. UTILITY FUNCTIONS
═══════════════════════════════════════════════════════════════════ */
function setEl(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}

function escHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function showToast(msg, type) {
  type = type || 'info';
  const toast = document.getElementById('globalToast');
  if (!toast) return;
  toast.innerHTML = `<div class="toast toast-${type}">${escHtml(msg)}</div>`;
  toast.querySelector('.toast') && toast.querySelector('.toast').classList.add('show');
  setTimeout(() => { toast.innerHTML = ''; }, 3500);
}

function destroyChart(key) {
  if (charts[key]) {
    charts[key].destroy();
    delete charts[key];
  }
}

function getCtx(id) {
  const canvas = document.getElementById(id);
  if (!canvas) return null;
  return canvas.getContext('2d');
}

function lerp(a, b, t) { return a + (b - a) * t; }

/* ═══════════════════════════════════════════════════════════════════
   6. NAVIGATION
═══════════════════════════════════════════════════════════════════ */
const PAGE_NAMES = {
  home: 'Projects',
  dashboard: 'Dashboard',
  geo: 'GEO & SEO',
  publications: 'Publications',
  kol: 'KOL & Rising Stars',
  trials: 'Clinical Trials',
  social: 'Social Intelligence',
  landscape: 'Digital Landscape',
  sources: 'Sources & Config',
  reports: 'Reports & Planning'
};

function navigateTo(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
  const pageEl = document.getElementById('page-' + page);
  if (pageEl) pageEl.classList.remove('hidden');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const navEl = document.querySelector('[data-page="' + page + '"]');
  if (navEl) navEl.classList.add('active');
  const bcEl = document.getElementById('breadcrumbPage');
  if (bcEl) bcEl.textContent = PAGE_NAMES[page] || page;
  state.currentPage = page;
  loadPageData(page);
}

function loadPageData(page) {
  switch (page) {
    case 'home':         renderBoardsGrid(); break;
    case 'dashboard':   initDashboard(); break;
    case 'geo':         initGeoPage(); break;
    case 'publications':
      if (!state.pubResults.length) {
        const data = getActiveBoardData();
        const brand = (data.config && data.config.brand) ? data.config.brand : 'cutaneous lymphoma';
        const input = document.getElementById('pubSearchInput');
        if (input && !input.value) input.value = brand + ' chlormethine';
        searchPublications();
      }
      break;
    case 'kol':
      renderPersonas();
      renderKOLTable();
      renderKOLTimeline();
      loadRisingStars();
      initKOLNetwork();
      break;
    case 'trials':
      if (!state.trialsResults.length) {
        const data2 = getActiveBoardData();
        const brand2 = (data2.config && data2.config.pathology) ? data2.config.pathology : 'cutaneous lymphoma';
        const input2 = document.getElementById('trialsSearchInput');
        if (input2 && !input2.value) input2.value = brand2;
        searchTrials();
      }
      break;
    case 'social':      initSocial(); break;
    case 'landscape':   initLandscape(); break;
    case 'sources':     initSources(); break;
    case 'reports':     initReports(); break;
  }
}

function initSidebarNav() {
  document.querySelectorAll('.nav-item[data-page]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo(el.getAttribute('data-page'));
    });
  });

  // Sidebar collapse
  const collapseBtn = document.getElementById('sidebarCollapseBtn');
  const sidebar = document.getElementById('sidebar');
  const mainWrapper = document.getElementById('mainWrapper');
  if (collapseBtn && sidebar) {
    collapseBtn.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
      if (mainWrapper) mainWrapper.classList.toggle('sidebar-collapsed');
    });
  }

  // Topbar menu btn (mobile)
  const menuBtn = document.getElementById('topbarMenuBtn');
  if (menuBtn && sidebar) {
    menuBtn.addEventListener('click', () => sidebar.classList.toggle('mobile-open'));
  }

  // Sidebar search filter
  const sidebarSearch = document.getElementById('sidebarSearchInput');
  if (sidebarSearch) {
    sidebarSearch.addEventListener('input', () => {
      const q = sidebarSearch.value.toLowerCase();
      document.querySelectorAll('.nav-item[data-page]').forEach(el => {
        const label = el.querySelector('.nav-label');
        if (!label) return;
        el.style.display = (!q || label.textContent.toLowerCase().includes(q)) ? '' : 'none';
      });
    });
  }

  // Board selector dropdown
  const boardSelectorBtn = document.getElementById('boardSelectorBtn');
  const boardDropdown = document.getElementById('boardDropdown');
  if (boardSelectorBtn && boardDropdown) {
    boardSelectorBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      boardDropdown.classList.toggle('open');
    });
    document.addEventListener('click', () => boardDropdown.classList.remove('open'));
  }

  // Sidebar board btn navigate to home
  const sidebarBoardBtn = document.getElementById('sidebarBoardBtn');
  if (sidebarBoardBtn) {
    sidebarBoardBtn.addEventListener('click', () => navigateTo('home'));
  }

  // Hash routing
  function handleHash() {
    const hash = window.location.hash.replace('#', '') || 'home';
    if (PAGE_NAMES[hash]) navigateTo(hash);
  }
  window.addEventListener('hashchange', handleHash);
  handleHash();
}

/* ═══════════════════════════════════════════════════════════════════
   7. HOME PAGE — BOARDS GRID
═══════════════════════════════════════════════════════════════════ */
function renderBoardsGrid() {
  const grid = document.getElementById('boardsGrid');
  if (!grid) return;
  if (!boards.length) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--text-muted);">
      <div style="font-size:32px;margin-bottom:12px;">📋</div>
      <div style="font-size:16px;font-weight:600;margin-bottom:8px;">No boards yet</div>
      <div style="font-size:13px;margin-bottom:20px;">Create your first intelligence board to get started</div>
      <button class="btn btn-primary" onclick="openBoardWizard()">+ New Board</button>
    </div>`;
    return;
  }
  grid.innerHTML = boards.map(b => `
    <div class="board-card" data-board-id="${b.id}">
      <div class="board-card-header">
        <div class="board-card-status">
          <svg width="8" height="8" viewBox="0 0 8 8"><circle cx="4" cy="4" r="4" fill="${b.status === 'active' ? '#22C55E' : '#9CA3AF'}"/></svg>
          <span>${escHtml(b.status === 'active' ? 'Active' : 'Draft')}</span>
        </div>
        <button class="board-card-delete" data-board-id="${b.id}" title="Delete board">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2L10 10M10 2L2 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        </button>
      </div>
      <div class="board-card-title">${escHtml(b.name)}</div>
      <div class="board-card-meta">
        <span>${escHtml(b.area || '')}</span>
        ${b.competitor ? `<span>vs ${escHtml(b.competitor)}</span>` : ''}
      </div>
      <div class="board-card-kpis">
        <div class="board-card-kpi">
          <div class="board-card-kpi-val">${b.geoScore || '—'}</div>
          <div class="board-card-kpi-lbl">GEO</div>
        </div>
        <div class="board-card-kpi">
          <div class="board-card-kpi-val">${b.publications || '—'}</div>
          <div class="board-card-kpi-lbl">Pubs</div>
        </div>
        <div class="board-card-kpi">
          <div class="board-card-kpi-val">${b.kols || '—'}</div>
          <div class="board-card-kpi-lbl">KOLs</div>
        </div>
        <div class="board-card-kpi">
          <div class="board-card-kpi-val">${b.trials || '—'}</div>
          <div class="board-card-kpi-lbl">Trials</div>
        </div>
      </div>
      <div class="board-card-footer">
        <span style="font-size:11px;color:var(--text-muted);">Updated ${escHtml(b.lastUpdated || '')}</span>
        <button class="btn btn-primary btn-sm board-open-btn" data-board-id="${b.id}">Open Board</button>
      </div>
    </div>
  `).join('');

  grid.querySelectorAll('.board-open-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const bid = btn.getAttribute('data-board-id');
      const found = boards.find(b2 => b2.id === bid);
      if (found) {
        activeBoard = found;
        updateBoardUI();
        // Reset paged data when switching boards
        state.pubResults = [];
        state.trialsResults = [];
        navigateTo('dashboard');
      }
    });
  });

  grid.querySelectorAll('.board-card-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const bid = btn.getAttribute('data-board-id');
      const idx = boards.findIndex(b2 => b2.id === bid);
      if (idx === -1) return;
      if (!confirm('Delete board "' + boards[idx].name + '"?')) return;
      boards.splice(idx, 1);
      if (activeBoard.id === bid) {
        activeBoard = boards[0] || { id: '', name: 'No Board', brand: '', area: '', geo: '', competitor: '' };
        updateBoardUI();
      }
      renderBoardsGrid();
      showToast('Board deleted', 'info');
    });
  });
}

/* ═══════════════════════════════════════════════════════════════════
   8. BOARD CREATION WIZARD
═══════════════════════════════════════════════════════════════════ */
const BOARD_WIZARD_STEPS = [
  { title: 'Therapeutic Area', key: 'area' },
  { title: 'Indication', key: 'indication' },
  { title: 'Geography', key: 'geo' },
  { title: 'Competitor (optional)', key: 'competitor' },
  { title: 'Auto-Detect Brands', key: 'brands' }
];

const THERAPEUTIC_AREAS = ['Cardiology', 'Oncology', 'Neurology', 'Dermatology', 'Immunology', 'Hematology', 'Rheumatology', 'Gastroenterology', 'Endocrinology', 'Respiratory', 'Rare Diseases', 'Other'];
const GEOGRAPHIES = ['France', 'Spain', 'Germany', 'United Kingdom', 'Italy', 'Netherlands', 'Belgium', 'Switzerland', 'United States', 'Canada', 'Japan', 'Global'];

function openBoardWizard() {
  state.boardWizardStep = 1;
  state.boardDraft = {};
  renderBoardWizardStep();
  const modal = document.getElementById('boardModal');
  if (modal) modal.classList.remove('hidden');
}

function renderBoardWizardStep() {
  const step = state.boardWizardStep;
  const dots = document.getElementById('boardWizardDots');
  const body = document.getElementById('boardWizardBody');
  const prevBtn = document.getElementById('boardWizardPrev');
  const nextBtn = document.getElementById('boardWizardNext');
  const title = document.getElementById('boardModalTitle');
  if (!body) return;

  if (dots) {
    dots.innerHTML = BOARD_WIZARD_STEPS.map((s, i) => `
      <div class="wizard-dot ${i + 1 === step ? 'active' : i + 1 < step ? 'done' : ''}">${i + 1 < step ? '✓' : i + 1}</div>
    `).join('<div class="wizard-dot-connector"></div>');
  }
  if (title) title.textContent = 'New Board — ' + BOARD_WIZARD_STEPS[step - 1].title;
  if (prevBtn) prevBtn.disabled = step === 1;
  if (nextBtn) nextBtn.textContent = step === BOARD_WIZARD_STEPS.length ? 'Create Board' : 'Next';

  switch (step) {
    case 1:
      body.innerHTML = `
        <div class="wizard-step-body">
          <label class="wizard-label">Select Therapeutic Area</label>
          <select class="select" id="wizardAreaSelect" style="width:100%;">
            <option value="">— Choose area —</option>
            ${THERAPEUTIC_AREAS.map(a => `<option value="${escHtml(a)}" ${state.boardDraft.area === a ? 'selected' : ''}>${escHtml(a)}</option>`).join('')}
          </select>
        </div>`;
      break;
    case 2:
      body.innerHTML = `
        <div class="wizard-step-body">
          <label class="wizard-label">Indication / Pathology</label>
          <input type="text" class="input" id="wizardIndicationInput" placeholder="e.g. Cutaneous T-Cell Lymphoma, Heart Failure…" value="${escHtml(state.boardDraft.indication || '')}" style="width:100%;" />
        </div>`;
      break;
    case 3:
      body.innerHTML = `
        <div class="wizard-step-body">
          <label class="wizard-label">Target Geography</label>
          <select class="select" id="wizardGeoSelect" style="width:100%;">
            <option value="">— Choose geography —</option>
            ${GEOGRAPHIES.map(g => `<option value="${escHtml(g)}" ${state.boardDraft.geo === g ? 'selected' : ''}>${escHtml(g)}</option>`).join('')}
          </select>
        </div>`;
      break;
    case 4:
      body.innerHTML = `
        <div class="wizard-step-body">
          <label class="wizard-label">Competitor Brand (optional)</label>
          <input type="text" class="input" id="wizardCompetitorInput" placeholder="e.g. Poteligeo, Dupixent…" value="${escHtml(state.boardDraft.competitor || '')}" style="width:100%;" />
          <div style="font-size:12px;color:var(--text-muted);margin-top:8px;">Leave blank to skip competitive intelligence</div>
        </div>`;
      break;
    case 5: {
      const areaKey = (state.boardDraft.area || 'other').toLowerCase().replace(/\s+/g, '_');
      const brandList = (BRAND_DB && BRAND_DB[areaKey]) ? BRAND_DB[areaKey] : [];
      const ctclBrands = BRAND_DB && BRAND_DB['ctcl_france'] ? BRAND_DB['ctcl_france'] : [];
      const cardioBrands = BRAND_DB && BRAND_DB['cardiology_spain'] ? BRAND_DB['cardiology_spain'] : [];
      const suggestedBrands = brandList.length ? brandList : (state.boardDraft.indication && state.boardDraft.indication.toLowerCase().includes('lymph') ? ctclBrands : cardioBrands.slice(0, 8));
      body.innerHTML = `
        <div class="wizard-step-body">
          <label class="wizard-label">Detected Brands</label>
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:12px;">Select brands to include in this intelligence board</div>
          <div id="wizardBrandsGrid" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;max-height:240px;overflow-y:auto;">
            ${suggestedBrands.slice(0, 12).map((b, i) => `
              <label class="brand-check-item">
                <input type="checkbox" name="brand" value="${escHtml(b.name)}" ${i < 4 ? 'checked' : ''} />
                <div>
                  <div style="font-weight:600;font-size:13px;">${escHtml(b.name)}</div>
                  <div style="font-size:11px;color:var(--text-muted);">${escHtml(b.class || b.generic || '')}</div>
                </div>
              </label>
            `).join('')}
          </div>
          ${suggestedBrands.length === 0 ? '<div style="font-size:13px;color:var(--text-muted);">No brands found — you can add them manually after board creation.</div>' : ''}
        </div>`;
      break;
    }
  }
}

function advanceBoardWizard() {
  const step = state.boardWizardStep;
  // Collect current step data
  switch (step) {
    case 1: {
      const sel = document.getElementById('wizardAreaSelect');
      if (!sel || !sel.value) { showToast('Please select a therapeutic area', 'error'); return; }
      state.boardDraft.area = sel.value;
      break;
    }
    case 2: {
      const inp = document.getElementById('wizardIndicationInput');
      if (!inp || !inp.value.trim()) { showToast('Please enter an indication', 'error'); return; }
      state.boardDraft.indication = inp.value.trim();
      break;
    }
    case 3: {
      const sel = document.getElementById('wizardGeoSelect');
      if (!sel || !sel.value) { showToast('Please select a geography', 'error'); return; }
      state.boardDraft.geo = sel.value;
      break;
    }
    case 4: {
      const inp = document.getElementById('wizardCompetitorInput');
      state.boardDraft.competitor = inp ? inp.value.trim() : '';
      break;
    }
    case 5: {
      const checked = document.querySelectorAll('#wizardBrandsGrid input[type="checkbox"]:checked');
      state.boardDraft.brands = Array.from(checked).map(c => c.value);
      // Final step: create board
      createBoardFromDraft();
      return;
    }
  }
  state.boardWizardStep++;
  renderBoardWizardStep();
}

function retreatBoardWizard() {
  if (state.boardWizardStep > 1) {
    state.boardWizardStep--;
    renderBoardWizardStep();
  }
}

function createBoardFromDraft() {
  const draft = state.boardDraft;
  const id = 'board-' + Date.now();
  const name = (draft.indication || draft.area) + ' · ' + draft.geo;
  const newBoard = {
    id: id,
    name: name,
    brand: draft.brands && draft.brands[0] ? draft.brands[0] : draft.indication,
    area: draft.area,
    indication: draft.indication,
    geo: draft.geo,
    competitor: draft.competitor,
    brands: draft.brands || [],
    status: 'draft',
    lastUpdated: new Date().toISOString().slice(0, 10),
    geoScore: null,
    publications: null,
    kols: null,
    trials: null
  };
  boards.push(newBoard);
  const modal = document.getElementById('boardModal');
  if (modal) modal.classList.add('hidden');
  renderBoardsGrid();
  showToast('Board "' + name + '" created! Starting generation…', 'success');
  // Ask if they want to generate
  setTimeout(() => {
    activeBoard = newBoard;
    updateBoardUI();
    runBoardGeneration(newBoard);
  }, 600);
}

/* ═══════════════════════════════════════════════════════════════════
   9. BOARD GENERATION ENGINE
═══════════════════════════════════════════════════════════════════ */
const GEN_STEPS = [
  { id: 'geo',      label: 'PharmaGEO Score Retrieval',     action: 'pharmageo_launch' },
  { id: 'pubs',     label: 'Publication Discovery',          action: 'search_openalex' },
  { id: 'trials',   label: 'Clinical Trials Scan',           action: 'search_trials' },
  { id: 'kol',      label: 'KOL Discovery',                  action: 'kol_rising_stars' },
  { id: 'brands',   label: 'Brand Landscape Analysis',       action: 'detect_brands' },
  { id: 'social',   label: 'Social Screening',               action: 'social_screen' },
  { id: 'report',   label: 'Report Compilation',             action: null }
];

function runBoardGeneration(board) {
  const overlay = document.getElementById('genOverlay');
  const stepsEl = document.getElementById('genSteps');
  const progressFill = document.getElementById('genProgressFill');
  const progressPct = document.getElementById('genProgressPct');
  const subtitle = document.getElementById('genSubtitle');
  const resultsEl = document.getElementById('genResults');
  if (!overlay) return;

  overlay.classList.remove('hidden');
  if (resultsEl) resultsEl.classList.add('hidden');
  if (subtitle) subtitle.textContent = 'Aikka Agent is building your board: ' + board.name;

  // Render initial steps
  if (stepsEl) {
    stepsEl.innerHTML = GEN_STEPS.map((s, i) => `
      <div class="gen-step" id="gen-step-${s.id}">
        <span class="gen-step-icon" id="gen-step-icon-${s.id}">⏳</span>
        <span class="gen-step-label">${escHtml(s.label)}</span>
      </div>
    `).join('');
  }

  let cancelled = false;
  // Add cancel button to overlay panel
  const genPanel = overlay.querySelector('.gen-panel');
  if (genPanel) {
    let existingControls = genPanel.querySelector('.gen-controls');
    if (!existingControls) {
      existingControls = document.createElement('div');
      existingControls.className = 'gen-controls';
      existingControls.style.cssText = 'display:flex;gap:8px;justify-content:flex-end;margin-top:12px;';
      existingControls.innerHTML = '<button class="btn btn-ghost btn-sm" id="genCancelBtn">Cancel</button>';
      genPanel.appendChild(existingControls);
    }
    const cancelBtn = document.getElementById('genCancelBtn');
    if (cancelBtn) {
      cancelBtn.onclick = () => {
        cancelled = true;
        overlay.classList.add('hidden');
        showToast('Generation cancelled', 'info');
      };
    }
  }

  function setStepStatus(id, status) {
    const iconEl = document.getElementById('gen-step-icon-' + id);
    if (!iconEl) return;
    if (status === 'running') iconEl.textContent = '⏳';
    else if (status === 'done') iconEl.textContent = '✅';
    else if (status === 'error') iconEl.textContent = '❌';
  }

  function setProgress(pct) {
    if (progressFill) progressFill.style.width = pct + '%';
    if (progressPct) progressPct.textContent = pct + '%';
  }

  async function runStep(stepIdx) {
    if (cancelled) return;
    if (stepIdx >= GEN_STEPS.length) {
      setProgress(100);
      // Done
      if (!board.generatedData) board.generatedData = {};
      board.status = 'active';
      board.lastUpdated = new Date().toISOString().slice(0, 10);
      if (resultsEl) {
        resultsEl.classList.remove('hidden');
        resultsEl.innerHTML = `
          <div style="text-align:center;padding:16px 0;">
            <div style="font-size:20px;margin-bottom:8px;">✅ Board Ready!</div>
            <div style="font-size:13px;color:var(--text-muted);margin-bottom:16px;">All intelligence sources compiled for ${escHtml(board.name)}</div>
            <div style="display:flex;gap:8px;justify-content:center;">
              <button class="btn btn-primary" id="genLaunchBtn">Launch Board</button>
              <button class="btn btn-ghost" id="genExportBtn">Export Data</button>
            </div>
          </div>`;
        document.getElementById('genLaunchBtn') && document.getElementById('genLaunchBtn').addEventListener('click', () => {
          overlay.classList.add('hidden');
          activeBoard = board;
          updateBoardUI();
          state.pubResults = [];
          state.trialsResults = [];
          navigateTo('dashboard');
        });
        document.getElementById('genExportBtn') && document.getElementById('genExportBtn').addEventListener('click', () => {
          showToast('Export coming soon', 'info');
        });
      }
      return;
    }

    const step = GEN_STEPS[stepIdx];
    setStepStatus(step.id, 'running');
    setProgress(Math.round((stepIdx / GEN_STEPS.length) * 100));

    try {
      await simulateStepDelay(800 + Math.random() * 700);
      if (cancelled) return;

      // Mock data assignment per step
      if (!board.generatedData) board.generatedData = {};
      switch (step.id) {
        case 'geo':
          board.generatedData.geoScores = [
            { llm: 'OpenAI', overallScore: Math.round(30 + Math.random() * 40), reliability: Math.round(60 + Math.random() * 30), sentiment: 'neutral', aiVisibility: Math.round(50 + Math.random() * 50) },
            { llm: 'Perplexity', overallScore: Math.round(35 + Math.random() * 40), reliability: Math.round(65 + Math.random() * 30), sentiment: 'neutral', aiVisibility: Math.round(60 + Math.random() * 40) },
            { llm: 'Gemini', overallScore: Math.round(32 + Math.random() * 40), reliability: Math.round(62 + Math.random() * 30), sentiment: 'neutral', aiVisibility: Math.round(55 + Math.random() * 45) }
          ];
          board.geoScore = Math.round(board.generatedData.geoScores.reduce((a, s) => a + s.overallScore, 0) / board.generatedData.geoScores.length);
          break;
        case 'pubs':
          board.publications = Math.round(50 + Math.random() * 300);
          board.generatedData.publications = [];
          break;
        case 'trials':
          board.trials = Math.round(2 + Math.random() * 15);
          board.generatedData.trials = [];
          break;
        case 'kol':
          board.kols = Math.round(10 + Math.random() * 30);
          board.generatedData.kols = [];
          break;
        case 'brands':
          board.generatedData.brands = board.brands || [];
          break;
        case 'social':
          board.generatedData.socialScore = Math.round(30 + Math.random() * 60);
          break;
        case 'report':
          break;
      }
      setStepStatus(step.id, 'done');
    } catch (err) {
      setStepStatus(step.id, 'error');
    }

    await runStep(stepIdx + 1);
  }

  runStep(0);
}

function simulateStepDelay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/* ═══════════════════════════════════════════════════════════════════
   10. DASHBOARD
═══════════════════════════════════════════════════════════════════ */
function initDashboard() {
  const data = getActiveBoardData();
  const cfg = data.config || {};
  const geo = data.pharmageo || {};
  const kols = data.kols || {};
  const pubs = data.publications || [];
  const scores = geo.scores || [];

  // Board label
  const dashLabel = document.getElementById('dashBoardLabel');
  if (dashLabel) dashLabel.textContent = activeBoard.name;

  // KPIs
  const avgGeo = scores.length ? Math.round(scores.reduce((a, s) => a + s.overallScore, 0) / scores.length) : (activeBoard.geoScore || '—');
  setEl('kpiGeoScore', avgGeo);
  setEl('kpiPublications', activeBoard.publications || pubs.length || '247');
  const kolList = kols.france || kols.spain || [];
  setEl('kpiKols', activeBoard.kols || kolList.length || '29');
  const trialsArr = (data.treatments && data.treatments.clinical_trials_france) ? data.treatments.clinical_trials_france : [];
  setEl('kpiTrials', activeBoard.trials || trialsArr.length || '7');

  // Sparklines
  renderSparkline('sparkPub', [38, 42, 41, 44, 46, 47, 49], PALETTE.accent);
  renderSparkline('sparkSocial', [180, 210, 225, 215, 235, 240, 247], PALETTE.blue);
  renderSparkline('sparkTrials', [5, 5, 6, 6, 7, 7, 7], PALETTE.pink);

  // Radar chart: Digital Footprint
  destroyChart('footprintChart');
  const radarCtx = getCtx('footprintChart');
  if (radarCtx) {
    const pubScore = Math.min(100, Math.round((activeBoard.publications || pubs.length || 247) / 3));
    const geoScore = avgGeo || 49;
    const socialScore = 58;
    const trialScore = Math.min(100, (activeBoard.trials || trialsArr.length || 7) * 12);
    const kolScore = Math.min(100, (activeBoard.kols || kolList.length || 29) * 3);
    charts['footprintChart'] = new Chart(radarCtx, {
      type: 'radar',
      data: {
        labels: ['Publications', 'GEO Score', 'Social Presence', 'Clinical Trials', 'KOL Network'],
        datasets: [
          {
            label: cfg.brand || activeBoard.brand || 'Brand',
            data: [pubScore, geoScore, socialScore, trialScore, kolScore],
            backgroundColor: 'rgba(0,225,255,0.15)',
            borderColor: PALETTE.accent,
            borderWidth: 2,
            pointBackgroundColor: PALETTE.accent,
            pointRadius: 4
          },
          {
            label: cfg.competitor || activeBoard.competitor || 'Competitor',
            data: [45, 38, 62, 40, 55],
            backgroundColor: 'rgba(96,165,250,0.1)',
            borderColor: PALETTE.blue,
            borderWidth: 2,
            pointBackgroundColor: PALETTE.blue,
            pointRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        plugins: { legend: { labels: { font: { family: FONT, size: 11 } } } },
        scales: {
          r: {
            beginAtZero: true,
            max: 100,
            ticks: { stepSize: 25, font: { family: FONT, size: 10 } },
            grid: { color: PALETTE.border },
            angleLines: { color: PALETTE.border },
            pointLabels: { font: { family: FONT, size: 11 } }
          }
        }
      }
    });
  }

  // Bar chart: GEO vs SEO
  destroyChart('geoSeoChart');
  const barCtx = getCtx('geoSeoChart');
  if (barCtx) {
    const brandName = cfg.brand || activeBoard.brand || 'Brand';
    const compName = cfg.competitor || activeBoard.competitor || 'Competitor';
    charts['geoSeoChart'] = new Chart(barCtx, {
      type: 'bar',
      data: {
        labels: ['OpenAI GEO', 'Perplexity GEO', 'Gemini GEO', 'SEO Index'],
        datasets: [
          {
            label: brandName,
            data: scores.length ? [scores[0] && scores[0].overallScore, scores[1] && scores[1].overallScore, scores[2] && scores[2].overallScore, 62] : [43, 57, 46, 62],
            backgroundColor: PALETTE.accent,
            borderRadius: 4
          },
          {
            label: compName,
            data: [35, 42, 38, 55],
            backgroundColor: PALETTE.blue,
            borderRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        plugins: { legend: { labels: { font: { family: FONT, size: 11 } } } },
        scales: {
          y: { beginAtZero: true, max: 100, grid: { color: PALETTE.border }, ticks: { font: { family: FONT } } },
          x: { grid: { display: false }, ticks: { font: { family: FONT } } }
        }
      }
    });
  }

  // Recommendations
  const recEl = document.getElementById('dashRecommendations');
  if (recEl) {
    const recs = geo.recommendations || [];
    const topRecs = recs.slice(0, 3);
    if (topRecs.length) {
      recEl.innerHTML = topRecs.map(r => `
        <div class="rec-item" style="padding:12px 0;border-bottom:1px solid var(--border);">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
            <span class="badge badge-${r.priority === 'High' ? 'red' : 'yellow'}">${escHtml(r.priority || 'Med')}</span>
            <span style="font-size:12px;color:var(--text-muted);">${escHtml(r.llm || r.type || '')}</span>
          </div>
          <div style="font-size:13px;font-weight:600;margin-bottom:4px;">${escHtml(r.title)}</div>
          <div style="font-size:12px;color:var(--text-muted);line-height:1.4;">${escHtml((r.description || '').slice(0, 180))}…</div>
        </div>
      `).join('');
    } else {
      recEl.innerHTML = '<div style="color:var(--text-muted);font-size:13px;">No recommendations available for this board.</div>';
    }
  }
}

function renderSparkline(id, data, color) {
  destroyChart(id);
  const ctx = getCtx(id);
  if (!ctx) return;
  charts[id] = new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.map((_, i) => i),
      datasets: [{ data: data, borderColor: color, borderWidth: 1.5, fill: false, pointRadius: 0, tension: 0.4 }]
    },
    options: {
      responsive: false,
      plugins: { legend: { display: false } },
      scales: { x: { display: false }, y: { display: false } },
      animation: false
    }
  });
}

/* ═══════════════════════════════════════════════════════════════════
   11. GEO/SEO PAGE
═══════════════════════════════════════════════════════════════════ */
function initGeoPage() {
  initGeoTabs();
  renderGeoTab();
  renderSeoTab();
  renderCrossRefTab();
}

function initGeoTabs() {
  document.querySelectorAll('#page-geo .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#page-geo .tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const tabId = btn.getAttribute('data-tab');
      document.querySelectorAll('#page-geo .tab-panel').forEach(p => p.classList.add('hidden'));
      const panel = document.getElementById('tab-' + tabId);
      if (panel) panel.classList.remove('hidden');
    });
  });
}

function renderGeoTab() {
  const data = getActiveBoardData();
  const geo = data.pharmageo || {};
  const scores = geo.scores || [];

  // GEO Scores grid
  const grid = document.getElementById('geoScoresGrid');
  if (grid) {
    if (scores.length) {
      grid.innerHTML = scores.map(s => {
        const scoreColor = s.overallScore >= 60 ? PALETTE.green : s.overallScore >= 40 ? PALETTE.yellow : PALETTE.red;
        return `
          <div class="geo-score-card">
            <div class="geo-score-llm">${escHtml(s.llm)}</div>
            <div class="geo-score-value" style="color:${scoreColor};">${s.overallScore}<span style="font-size:14px;">/100</span></div>
            <div class="geo-score-meta">
              <div><span style="color:var(--text-muted);font-size:11px;">Reliability</span> <strong>${s.reliability || '—'}/100</strong></div>
              <div><span style="color:var(--text-muted);font-size:11px;">AI Visibility</span> <strong>${s.aiVisibility || '—'}%</strong></div>
              <div><span style="color:var(--text-muted);font-size:11px;">Sentiment</span> <strong>${escHtml(s.sentiment || 'neutral')}</strong></div>
            </div>
            <div style="font-size:11px;color:var(--text-muted);margin-top:8px;line-height:1.4;">${escHtml((s.summary || '').slice(0, 120))}…</div>
          </div>`;
      }).join('');
    } else {
      grid.innerHTML = '<div style="color:var(--text-muted);font-size:13px;padding:20px;">No GEO scores available.</div>';
    }
  }

  // Discoverability doughnut
  destroyChart('discoverabilityChart');
  const discCtx = getCtx('discoverabilityChart');
  if (discCtx) {
    const disc = geo.discoverability || { brandRecognition: 0, innOnly: 0, drugClass: 67, notFound: 33 };
    charts['discoverabilityChart'] = new Chart(discCtx, {
      type: 'doughnut',
      data: {
        labels: ['Brand Recognition', 'INN Only', 'Drug Class', 'Not Found'],
        datasets: [{
          data: [disc.brandRecognition || 0, disc.innOnly || 0, disc.drugClass || 67, disc.notFound || 33],
          backgroundColor: [PALETTE.green, PALETTE.accent, PALETTE.blue, PALETTE.gray],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom', labels: { font: { family: FONT, size: 11 }, padding: 10 } }
        },
        cutout: '65%'
      }
    });
  }

  // SOV horizontal bar
  destroyChart('sovChart');
  const sovCtx = getCtx('sovChart');
  if (sovCtx) {
    const products = (geo.agnostic && geo.agnostic.products) ? geo.agnostic.products.slice(0, 8) : [];
    const labels = products.map(p => p.name);
    const sovData = products.map(p => p.sov);
    const mainBrand = data.config && data.config.brand ? data.config.brand : 'Ledaga';
    const bgColors = labels.map(l => (l.toLowerCase().includes(mainBrand.toLowerCase()) ? PALETTE.accent : PALETTE.blue));
    charts['sovChart'] = new Chart(sovCtx, {
      type: 'bar',
      data: {
        labels: labels.length ? labels : ['Targretin', 'Poteligeo', 'Adcetris', 'Intron A', 'Ledaga®'],
        datasets: [{
          label: 'Share of Voice (%)',
          data: sovData.length ? sovData : [6.2, 6.2, 6.2, 5.9, 4.5],
          backgroundColor: labels.length ? bgColors : [PALETTE.blue, PALETTE.blue, PALETTE.blue, PALETTE.blue, PALETTE.accent],
          borderRadius: 4
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { beginAtZero: true, grid: { color: PALETTE.border }, ticks: { font: { family: FONT } } },
          y: { grid: { display: false }, ticks: { font: { family: FONT, size: 11 } } }
        }
      }
    });
  }

  // Recommendations
  const recList = document.getElementById('geoRecommendationsList');
  if (recList) {
    const recs = (geo.recommendations || []).slice(0, 5);
    recList.innerHTML = recs.map(r => `
      <div style="padding:10px 0;border-bottom:1px solid var(--border);">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
          <span class="badge badge-${r.priority === 'High' ? 'red' : 'yellow'}">${escHtml(r.priority || 'Med')}</span>
          <span style="font-size:11px;color:var(--text-muted);">${escHtml(r.type || '')} · ${escHtml(r.llm || '')}</span>
        </div>
        <div style="font-size:13px;font-weight:600;">${escHtml(r.title)}</div>
      </div>
    `).join('') || '<div style="color:var(--text-muted);font-size:13px;">No recommendations.</div>';
  }

  // Trending questions
  const tqEl = document.getElementById('geoTrendingQuestions');
  if (tqEl) {
    const questions = (geo.trending_questions || []).slice(0, 8);
    const catColors = { patient: PALETTE.blue, professional: PALETTE.accent, competitive: PALETTE.pink };
    tqEl.innerHTML = questions.map(q => `
      <div style="padding:8px 0;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px;">
        <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${catColors[q.category] || PALETTE.gray};flex-shrink:0;"></span>
        <span style="font-size:12px;">${escHtml(q.question)}</span>
      </div>
    `).join('') || '<div style="color:var(--text-muted);font-size:13px;">No trending questions.</div>';
  }

  // Sources table
  const srcTable = document.getElementById('geoSourcesTable');
  if (srcTable) {
    const sources = geo.sources || [];
    if (sources.length) {
      srcTable.innerHTML = `<table class="data-table">
        <thead><tr><th>Source</th><th>Type</th><th>Reliability</th><th>Cited</th></tr></thead>
        <tbody>${sources.slice(0, 12).map(s => `
          <tr>
            <td><a href="${escHtml(s.link)}" target="_blank" rel="noopener" style="color:var(--accent);font-size:12px;">${escHtml(s.title)}</a></td>
            <td><span class="badge">${escHtml(s.type)}</span></td>
            <td>${s.reliability}/100</td>
            <td>${s.usage}×</td>
          </tr>
        `).join('')}</tbody>
      </table>`;
    } else {
      srcTable.innerHTML = '<div style="color:var(--text-muted);font-size:13px;">No source data available.</div>';
    }
  }
}

function renderSeoTab() {
  // SEO trend chart (simulated)
  destroyChart('seoTrendChart');
  const seoCtx = getCtx('seoTrendChart');
  if (seoCtx) {
    const months = ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb'];
    const brandData = [42, 45, 48, 50, 47, 52, 55, 53, 58, 60, 62, 65];
    const compData  = [30, 32, 34, 38, 36, 40, 42, 44, 46, 48, 50, 52];
    const data = getActiveBoardData();
    const brand = (data.config && data.config.brand) || 'Brand';
    const comp  = (data.config && data.config.competitor) || 'Competitor';
    charts['seoTrendChart'] = new Chart(seoCtx, {
      type: 'line',
      data: {
        labels: months,
        datasets: [
          { label: brand, data: brandData, borderColor: PALETTE.accent, backgroundColor: 'rgba(0,225,255,0.08)', fill: true, tension: 0.4, pointRadius: 3 },
          { label: comp, data: compData, borderColor: PALETTE.blue, backgroundColor: 'transparent', fill: false, tension: 0.4, pointRadius: 3 }
        ]
      },
      options: {
        responsive: true,
        plugins: { legend: { labels: { font: { family: FONT, size: 11 } } } },
        scales: {
          y: { beginAtZero: true, grid: { color: PALETTE.border }, ticks: { font: { family: FONT } } },
          x: { grid: { display: false }, ticks: { font: { family: FONT } } }
        }
      }
    });
  }

  // SEO Radar
  destroyChart('seoRadarChart');
  const seoRadarCtx = getCtx('seoRadarChart');
  if (seoRadarCtx) {
    charts['seoRadarChart'] = new Chart(seoRadarCtx, {
      type: 'radar',
      data: {
        labels: ['Brand Queries', 'INN Queries', 'Symptom Queries', 'Treatment Queries', 'Competitive Queries'],
        datasets: [{
          label: 'Search Interest',
          data: [65, 48, 72, 58, 35],
          backgroundColor: 'rgba(0,225,255,0.15)',
          borderColor: PALETTE.accent,
          borderWidth: 2,
          pointBackgroundColor: PALETTE.accent
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { labels: { font: { family: FONT, size: 11 } } } },
        scales: {
          r: {
            beginAtZero: true, max: 100,
            ticks: { stepSize: 25, font: { family: FONT, size: 10 } },
            grid: { color: PALETTE.border },
            angleLines: { color: PALETTE.border },
            pointLabels: { font: { family: FONT, size: 11 } }
          }
        }
      }
    });
  }

  // Related queries table
  const relBody = document.getElementById('seoRelatedBody');
  if (relBody) {
    const queries = [
      { query: 'lymphome T cutané traitement', vol: 82, trend: '↑', type: 'Rising' },
      { query: 'chlorméthine gel posologie', vol: 68, trend: '↑', type: 'Rising' },
      { query: 'mycosis fongoïde pronostic', vol: 74, trend: '→', type: 'Stable' },
      { query: 'Ledaga effets secondaires', vol: 55, trend: '↑', type: 'Rising' },
      { query: 'syndrome de Sézary traitement', vol: 47, trend: '↑', type: 'Trending' },
      { query: 'cutaneous lymphoma France', vol: 38, trend: '→', type: 'Stable' }
    ];
    relBody.innerHTML = queries.map(q => `
      <tr>
        <td>${escHtml(q.query)}</td>
        <td>${q.vol}</td>
        <td>${q.trend}</td>
        <td><span class="badge">${escHtml(q.type)}</span></td>
      </tr>
    `).join('');
  }

  // Regional list
  const regList = document.getElementById('seoRegionalList');
  if (regList) {
    const regions = [
      { name: 'Île-de-France', idx: 95, bar: 95 },
      { name: 'Auvergne-Rhône-Alpes', idx: 72, bar: 72 },
      { name: 'Nouvelle-Aquitaine', idx: 68, bar: 68 },
      { name: 'Occitanie', idx: 61, bar: 61 },
      { name: 'Hauts-de-France', idx: 55, bar: 55 },
      { name: 'Bretagne', idx: 48, bar: 48 }
    ];
    regList.innerHTML = regions.map(r => `
      <div style="display:flex;align-items:center;gap:12px;padding:6px 0;">
        <div style="flex:1;font-size:13px;">${escHtml(r.name)}</div>
        <div style="flex:2;background:var(--border);border-radius:4px;height:8px;overflow:hidden;">
          <div style="width:${r.bar}%;background:${PALETTE.accent};height:100%;border-radius:4px;"></div>
        </div>
        <div style="font-size:12px;color:var(--text-muted);width:30px;text-align:right;">${r.idx}</div>
      </div>
    `).join('');
  }

  // SEO search btn
  const seoBtn = document.getElementById('seoSearchBtn');
  if (seoBtn && !seoBtn._bound) {
    seoBtn._bound = true;
    seoBtn.addEventListener('click', () => {
      const kw = (document.getElementById('seoSearchInput') || {}).value || '';
      showToast('SEO trend search: "' + kw + '" — demo mode', 'info');
    });
  }
}

function renderCrossRefTab() {
  destroyChart('correlationChart');
  const ctx = getCtx('correlationChart');
  if (!ctx) return;
  // Bubble chart: GEO score vs search volume
  const data = getActiveBoardData();
  const scores = (data.pharmageo && data.pharmageo.scores) || [];
  const bubbleData = [
    { x: 43, y: 65, r: 12, label: 'OpenAI GEO' },
    { x: 57, y: 72, r: 15, label: 'Perplexity GEO' },
    { x: 46, y: 68, r: 13, label: 'Gemini GEO' },
    { x: 62, y: 80, r: 18, label: 'SEO Index' },
    { x: 35, y: 42, r: 8,  label: 'Competitor GEO' }
  ];
  const colors = [PALETTE.accent, PALETTE.blue, PALETTE.pink, PALETTE.yellow, PALETTE.gray];
  charts['correlationChart'] = new Chart(ctx, {
    type: 'bubble',
    data: {
      datasets: bubbleData.map((d, i) => ({
        label: d.label,
        data: [{ x: d.x, y: d.y, r: d.r }],
        backgroundColor: colors[i] + '99',
        borderColor: colors[i],
        borderWidth: 2
      }))
    },
    options: {
      responsive: true,
      plugins: { legend: { labels: { font: { family: FONT, size: 11 } } } },
      scales: {
        x: { title: { display: true, text: 'GEO Score', font: { family: FONT } }, min: 0, max: 100, grid: { color: PALETTE.border } },
        y: { title: { display: true, text: 'Search Volume Index', font: { family: FONT } }, min: 0, max: 100, grid: { color: PALETTE.border } }
      }
    }
  });
}

/* ═══════════════════════════════════════════════════════════════════
   12. PUBLICATIONS
═══════════════════════════════════════════════════════════════════ */
function searchPublications() {
  const input = document.getElementById('pubSearchInput');
  const query = input ? input.value.trim() : '';
  if (!query) { showToast('Enter a search query', 'error'); return; }
  state.pubQuery = query;
  state.pubPage = 1;
  fetchPublications();
}

function fetchPublications() {
  const skeleton = document.getElementById('pubSkeletonList');
  const resultsList = document.getElementById('pubResultsList');
  const pagination = document.getElementById('pubPagination');
  const countLabel = document.getElementById('pubCountLabel');
  if (skeleton) skeleton.style.display = '';
  if (resultsList) resultsList.style.display = 'none';
  if (pagination) pagination.style.display = 'none';
  if (countLabel) countLabel.textContent = 'Searching OpenAlex…';

  const url = OPENALEX_BASE + '/works?search=' + encodeURIComponent(state.pubQuery) +
    '&per_page=10&page=' + state.pubPage +
    '&select=id,title,authorships,publication_year,host_venue,cited_by_count,doi&sort=cited_by_count:desc';

  fetch(url)
    .then(r => r.json())
    .then(json => {
      const results = json.results || [];
      state.pubResults = results;
      state.pubTotal = (json.meta && json.meta.count) ? json.meta.count : results.length;
      renderPubResults();
    })
    .catch(() => {
      // Fallback to local data
      const data = getActiveBoardData();
      state.pubResults = (data.publications || []).map(p => ({
        id: p.doi || p.title,
        title: p.title,
        authorships: (p.authors || []).map(a => ({ author: { display_name: a } })),
        publication_year: p.year,
        host_venue: { display_name: p.journal },
        cited_by_count: Math.floor(Math.random() * 200),
        doi: p.doi
      }));
      state.pubTotal = state.pubResults.length;
      renderPubResults();
    });
}

function renderPubResults() {
  const skeleton = document.getElementById('pubSkeletonList');
  const resultsList = document.getElementById('pubResultsList');
  const pagination = document.getElementById('pubPagination');
  const countLabel = document.getElementById('pubCountLabel');
  if (skeleton) skeleton.style.display = 'none';
  if (resultsList) resultsList.style.display = '';
  if (pagination) pagination.style.display = '';

  if (countLabel) countLabel.textContent = state.pubTotal.toLocaleString() + ' results for "' + state.pubQuery + '"';
  setEl('pubPageInfo', 'Page ' + state.pubPage);

  const prevBtn = document.getElementById('pubPrevBtn');
  const nextBtn = document.getElementById('pubNextBtn');
  if (prevBtn) prevBtn.disabled = state.pubPage <= 1;
  if (nextBtn) nextBtn.disabled = state.pubTotal <= state.pubPage * 10;

  if (resultsList) {
    if (!state.pubResults.length) {
      resultsList.innerHTML = '<div style="color:var(--text-muted);padding:20px;text-align:center;">No results found.</div>';
      return;
    }
    resultsList.innerHTML = state.pubResults.map(p => {
      const authors = (p.authorships || []).slice(0, 3).map(a => a.author && a.author.display_name ? a.author.display_name : '').filter(Boolean).join(', ');
      const journal = (p.host_venue && p.host_venue.display_name) ? p.host_venue.display_name : (p.journal || '');
      const year = p.publication_year || p.year || '';
      const doi = p.doi || '';
      const cites = p.cited_by_count !== undefined ? p.cited_by_count : '';
      return `<div class="pub-card" style="padding:14px;border:1px solid var(--border);border-radius:8px;margin-bottom:10px;">
        <div style="font-size:13px;font-weight:600;margin-bottom:6px;line-height:1.4;">${escHtml(p.title || 'Untitled')}</div>
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px;">${escHtml(authors)}</div>
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
          ${journal ? `<span style="font-size:11px;font-style:italic;">${escHtml(journal)}</span>` : ''}
          ${year ? `<span class="badge">${escHtml(String(year))}</span>` : ''}
          ${cites !== '' ? `<span style="font-size:11px;color:var(--text-muted);">📚 ${escHtml(String(cites))} citations</span>` : ''}
          ${doi ? `<a href="https://doi.org/${escHtml(doi)}" target="_blank" rel="noopener" style="font-size:11px;color:var(--accent);">DOI ↗</a>` : ''}
        </div>
      </div>`;
    }).join('');
  }

  // Update author network placeholder
  buildAuthorNetwork();
}

function buildAuthorNetwork() {
  const placeholder = document.getElementById('authorNetworkPlaceholder');
  if (!placeholder) return;
  if (!state.pubResults.length) {
    placeholder.textContent = 'Search for publications to view the author network';
    return;
  }
  placeholder.innerHTML = '<div style="font-size:13px;color:var(--text-muted);">Switch to Author Network view to see the D3 co-authorship graph</div>';
}

function initPubViewToggle() {
  const listBtn = document.getElementById('pubViewList');
  const networkBtn = document.getElementById('pubViewNetwork');
  const listView = document.getElementById('pubListView');
  const networkView = document.getElementById('pubNetworkView');
  if (listBtn && networkBtn) {
    listBtn.addEventListener('click', () => {
      listBtn.classList.add('active');
      networkBtn.classList.remove('active');
      if (listView) listView.style.display = '';
      if (networkView) networkView.style.display = 'none';
    });
    networkBtn.addEventListener('click', () => {
      networkBtn.classList.add('active');
      listBtn.classList.remove('active');
      if (networkView) networkView.style.display = '';
      if (listView) listView.style.display = 'none';
      renderAuthorNetworkD3();
    });
  }
}

function renderAuthorNetworkD3() {
  const wrap = document.getElementById('authorNetworkPlaceholder');
  if (!wrap) return;
  if (typeof d3 === 'undefined') {
    wrap.textContent = 'D3.js not loaded';
    return;
  }
  if (!state.pubResults.length) {
    wrap.textContent = 'No publications loaded. Search first.';
    return;
  }

  wrap.innerHTML = '';
  const width = wrap.offsetWidth || 600;
  const height = 400;

  // Build author nodes & edges
  const authorMap = {};
  const links = [];
  state.pubResults.forEach(pub => {
    const auths = (pub.authorships || []).slice(0, 5).map(a => a.author && a.author.display_name ? a.author.display_name : null).filter(Boolean);
    auths.forEach(a => { authorMap[a] = (authorMap[a] || 0) + 1; });
    for (let i = 0; i < auths.length - 1; i++) {
      links.push({ source: auths[i], target: auths[i + 1] });
    }
  });
  const nodes = Object.keys(authorMap).slice(0, 30).map(id => ({ id, count: authorMap[id] }));
  const nodeIds = new Set(nodes.map(n => n.id));
  const validLinks = links.filter(l => nodeIds.has(l.source) && nodeIds.has(l.target)).slice(0, 50);

  const svg = d3.select(wrap).append('svg').attr('width', width).attr('height', height).style('background', '#F8F9FA').style('border-radius', '8px');
  const sim = d3.forceSimulation(nodes)
    .force('link', d3.forceLink(validLinks).id(d => d.id).distance(80))
    .force('charge', d3.forceManyBody().strength(-120))
    .force('center', d3.forceCenter(width / 2, height / 2));

  const link = svg.append('g').selectAll('line').data(validLinks).enter().append('line')
    .attr('stroke', PALETTE.border).attr('stroke-width', 1);

  const node = svg.append('g').selectAll('circle').data(nodes).enter().append('circle')
    .attr('r', d => 4 + d.count * 2)
    .attr('fill', PALETTE.accent)
    .attr('stroke', '#fff').attr('stroke-width', 1.5)
    .call(d3.drag()
      .on('start', (event, d) => { if (!event.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
      .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y; })
      .on('end', (event, d) => { if (!event.active) sim.alphaTarget(0); d.fx = null; d.fy = null; }));

  svg.append('g').selectAll('text').data(nodes).enter().append('text')
    .text(d => d.id.split(' ').pop())
    .attr('font-size', '9px').attr('font-family', FONT).attr('fill', PALETTE.primary);

  sim.on('tick', () => {
    link.attr('x1', d => d.source.x).attr('y1', d => d.source.y).attr('x2', d => d.target.x).attr('y2', d => d.target.y);
    node.attr('cx', d => d.x).attr('cy', d => d.y);
    svg.selectAll('text').attr('x', d => d.x + 6).attr('y', d => d.y + 3);
  });
}

/* ═══════════════════════════════════════════════════════════════════
   13. KOL & RISING STARS
═══════════════════════════════════════════════════════════════════ */
function getFilteredKOLs() {
  const data = getActiveBoardData();
  const kols = data.kols || {};
  const kolList = kols.france || kols.spain || [];
  const filter = state.kolFilter;
  if (filter === 'all') return kolList;
  return kolList.filter(k => String(k.tier) === String(filter));
}

function renderPersonas() {
  const data = getActiveBoardData();
  const kols = data.kols || {};
  const allKOLs = kols.france || kols.spain || [];

  const experts = allKOLs.filter(k => k.tier === 1);
  const connected = allKOLs.filter(k => k.social && k.social.linkedin);
  const silent = allKOLs.filter(k => k.tier === 2 && !(k.social && k.social.linkedin));
  const rising = allKOLs.filter(k => k.tier === 3);
  const diagnostic = allKOLs.filter(k => {
    const sp = typeof k.specialty === 'string' ? k.specialty.toLowerCase() : (Array.isArray(k.specialty) ? k.specialty.join(' ').toLowerCase() : '');
    return sp.includes('pathol') || sp.includes('anatom');
  });

  function setPersona(suffix, list) {
    setEl('personaCount' + suffix, String(list.length));
    const examples = list.slice(0, 2).map(k => `<div class="persona-example">${escHtml(k.name)}</div>`).join('');
    setEl('personaExamples' + suffix, examples);
  }

  setPersona('Expert', experts);
  setPersona('Connected', connected);
  setPersona('Silent', silent);
  setPersona('Rising', rising);
  setPersona('Diagnostic', diagnostic);
}

function renderKOLTable() {
  const tbody = document.getElementById('kolTableBody');
  if (!tbody) return;
  const kols = getFilteredKOLs();
  if (!kols.length) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:var(--text-muted);">No KOLs found.</td></tr>';
    return;
  }
  const CHANNELS = { 1: 'Congress', 2: 'LinkedIn', 3: 'Webinar' };
  const TOPICS = { 1: 'Ledaga real-world data', 2: 'MF treatment algorithm', 3: 'CTCL emerging therapies' };
  tbody.innerHTML = kols.slice(0, 20).map((k, i) => {
    const tierColor = k.tier === 1 ? PALETTE.primary : k.tier === 2 ? PALETTE.blue : PALETTE.accent;
    const specialty = typeof k.specialty === 'string' ? k.specialty.replace(/[\[\]']/g, '') : (Array.isArray(k.specialty) ? k.specialty.slice(0, 2).join(', ') : '');
    return `<tr>
      <td>${i + 1}</td>
      <td style="font-weight:600;">${escHtml(k.name)}</td>
      <td style="font-size:12px;">${escHtml(k.institution || '')}</td>
      <td>${escHtml(k.city || '')}</td>
      <td><span class="badge" style="background:${tierColor};color:white;">T${k.tier}</span></td>
      <td><strong>${k.score || '—'}</strong></td>
      <td><span class="badge">${escHtml(CHANNELS[k.tier] || 'Visit')}</span></td>
      <td style="font-size:11px;max-width:180px;">${escHtml(TOPICS[k.tier] || specialty || '')}</td>
      <td><button class="btn btn-ghost btn-sm">Plan</button></td>
    </tr>`;
  }).join('');
}

function renderKOLTimeline() {
  const el = document.getElementById('kolTimeline');
  if (!el) return;
  const data = getActiveBoardData();
  const pubs = data.publications || [];
  const items = pubs.slice(0, 8).map(p => ({
    type: 'Publication',
    title: p.title,
    author: (p.authors || []).slice(0, 1).join(''),
    year: p.year || p.publication_year || ''
  }));
  // Add some mock congress items
  items.push({ type: 'Congress', title: 'EADV 2025 — CTCL algorithm update', author: 'Pr Bagot', year: 2025 });
  items.push({ type: 'Trial', title: 'TELLOMAK 3 Phase 3 launch', author: 'Innate Pharma', year: 2026 });
  el.innerHTML = items.slice(0, 8).map(item => {
    const dotClass = item.type === 'Publication' ? 'pub' : item.type === 'Congress' ? 'congress' : 'trial';
    return `<div class="timeline-item">
      <div class="timeline-dot-col"><div class="timeline-dot ${dotClass}"></div></div>
      <div class="timeline-content">
        <div class="timeline-type">${escHtml(item.type)}</div>
        <div class="timeline-title">${escHtml(item.title)}</div>
        <div style="font-size:11px;color:var(--text-muted);">${escHtml(item.author)} · ${escHtml(String(item.year))}</div>
      </div>
    </div>`;
  }).join('');
}

function loadRisingStars() {
  const skeleton = document.getElementById('risingStarsSkeleton');
  const grid = document.getElementById('risingStarsGrid');
  if (!grid) return;
  if (skeleton) skeleton.style.display = '';
  grid.style.display = 'none';

  const data = getActiveBoardData();
  // Check if SPAIN_CARDIO_DATA and use its risingStars
  let risingStars = [];
  if (activeBoard.id.includes('spain') && typeof SPAIN_CARDIO_DATA !== 'undefined' && SPAIN_CARDIO_DATA.risingStars) {
    risingStars = SPAIN_CARDIO_DATA.risingStars;
    renderRisingStarsGrid(risingStars, skeleton, grid);
  } else {
    // Call API
    const cfg = data.config || {};
    const query = cfg.brand || cfg.therapeutic_area || 'cutaneous lymphoma';
    const country = cfg.market || 'France';
    const url = API + '?action=kol_rising_stars&query=' + encodeURIComponent(query) + '&country=' + encodeURIComponent(country);
    fetch(url)
      .then(r => r.json())
      .then(json => {
        risingStars = json.results || json.kols || json || [];
        if (!Array.isArray(risingStars)) risingStars = [];
        renderRisingStarsGrid(risingStars, skeleton, grid);
      })
      .catch(() => {
        // Generate mock rising stars
        risingStars = [
          { name: 'Dr. Marie Dupont', institution: 'CHU Paris', score: 8.4, specialty: 'CTCL', publications: 42, rising_star_rationale: 'Rapid citation velocity in 2024-2025.' },
          { name: 'Dr. Lucas Bernard', institution: 'CHU Lyon', score: 7.8, specialty: 'Dermatology', publications: 28, rising_star_rationale: 'Multiple first-author papers in JEADV.' }
        ];
        renderRisingStarsGrid(risingStars, skeleton, grid);
      });
  }
}

function renderRisingStarsGrid(stars, skeleton, grid) {
  if (skeleton) skeleton.style.display = 'none';
  if (!grid) return;
  grid.style.display = '';
  if (!stars.length) {
    grid.innerHTML = '<div style="color:var(--text-muted);font-size:13px;grid-column:1/-1;">No rising stars data available.</div>';
    return;
  }
  grid.innerHTML = stars.slice(0, 6).map(s => {
    const specialty = Array.isArray(s.specialty) ? s.specialty.slice(0, 2).join(', ') : (s.specialty || '');
    return `<div class="rising-star-card" style="padding:12px;border:1px solid var(--border);border-radius:8px;">
      <div style="font-weight:600;font-size:13px;margin-bottom:4px;">${escHtml(s.name)}</div>
      <div style="font-size:11px;color:var(--text-muted);margin-bottom:6px;">${escHtml(s.institution || '')}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:6px;">
        ${s.score ? `<span class="badge" style="background:${PALETTE.pink};color:white;">⭐ ${s.score}</span>` : ''}
        ${s.publications ? `<span class="badge">${s.publications} pubs</span>` : ''}
        ${s.h_index ? `<span class="badge">h=${s.h_index}</span>` : ''}
      </div>
      <div style="font-size:11px;color:var(--text-muted);">${escHtml((s.rising_star_rationale || specialty || '').slice(0, 100))}</div>
    </div>`;
  }).join('');
}

function initKOLNetwork() {
  const svg = document.getElementById('kolNetworkSvg');
  const wrap = document.getElementById('kolNetworkSvgWrap');
  const tooltip = document.getElementById('kolNetworkTooltip');
  const detail = document.getElementById('kolNetworkDetail');
  if (!svg || typeof d3 === 'undefined') return;

  const data = getActiveBoardData();
  const kols = (data.kols && (data.kols.france || data.kols.spain)) ? (data.kols.france || data.kols.spain) : [];
  const pubs = data.publications || [];

  const wrapWidth = (wrap && wrap.offsetWidth) ? wrap.offsetWidth : 700;
  const height = 420;

  svg.setAttribute('width', wrapWidth);
  svg.setAttribute('height', height);
  svg.innerHTML = '';

  const d3svg = d3.select(svg);
  const g = d3svg.append('g');

  // Build graph data
  const nodes = [];
  const links = [];

  // Add KOL nodes
  kols.slice(0, 15).forEach(k => {
    nodes.push({ id: k.name, type: 'kol', tier: k.tier, institution: k.institution, city: k.city, score: k.score });
  });

  // Add hospital nodes (unique institutions)
  const hospitals = [...new Set(kols.slice(0, 10).map(k => k.institution).filter(Boolean))].slice(0, 6);
  hospitals.forEach(h => nodes.push({ id: h, type: 'hospital' }));

  // Add pub nodes
  pubs.slice(0, 5).forEach(p => nodes.push({ id: p.title ? p.title.slice(0, 40) + '…' : 'Publication', type: 'publication', year: p.year }));

  // Add links: KOL → hospital
  kols.slice(0, 15).forEach(k => {
    if (k.institution && hospitals.includes(k.institution)) {
      links.push({ source: k.name, target: k.institution });
    }
  });

  // Links: KOL → pub
  pubs.slice(0, 5).forEach((p, pi) => {
    (p.authors || []).slice(0, 2).forEach(a => {
      const authorName = typeof a === 'string' ? a.split('—')[0].trim() : a;
      const match = kols.find(k => k.name.toLowerCase().includes(authorName.toLowerCase().split(' ').pop()));
      if (match) links.push({ source: match.name, target: p.title ? p.title.slice(0, 40) + '…' : 'Publication' });
    });
  });

  const nodeIds = new Set(nodes.map(n => n.id));
  const validLinks = links.filter(l => nodeIds.has(l.source) && nodeIds.has(l.target));

  const sim = d3.forceSimulation(nodes)
    .force('link', d3.forceLink(validLinks).id(d => d.id).distance(100))
    .force('charge', d3.forceManyBody().strength(-160))
    .force('center', d3.forceCenter(wrapWidth / 2, height / 2))
    .force('collision', d3.forceCollide().radius(22));

  const linkEl = g.append('g').selectAll('line').data(validLinks).enter().append('line')
    .attr('stroke', PALETTE.border).attr('stroke-width', 1.5).attr('opacity', 0.6);

  const nodeEl = g.append('g').selectAll('g.node').data(nodes).enter().append('g').attr('class', 'node')
    .call(d3.drag()
      .on('start', (event, d) => { if (!event.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
      .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y; })
      .on('end', (event, d) => { if (!event.active) sim.alphaTarget(0); d.fx = null; d.fy = null; }));

  nodeEl.each(function (d) {
    const el = d3.select(this);
    if (d.type === 'kol') {
      const color = d.tier === 1 ? PALETTE.primary : d.tier === 2 ? PALETTE.blue : PALETTE.accent;
      el.append('circle').attr('r', 10 + (d.score ? d.score / 15 : 4)).attr('fill', color).attr('stroke', '#fff').attr('stroke-width', 2);
    } else if (d.type === 'hospital') {
      el.append('rect').attr('x', -8).attr('y', -8).attr('width', 16).attr('height', 16).attr('rx', 2)
        .attr('fill', PALETTE.gray).attr('stroke', '#fff').attr('stroke-width', 1.5);
    } else if (d.type === 'rising') {
      el.append('polygon').attr('points', '0,-10 9,7 -9,7').attr('fill', PALETTE.pink).attr('stroke', '#fff').attr('stroke-width', 1.5);
    } else {
      el.append('circle').attr('r', 6).attr('fill', PALETTE.yellow).attr('stroke', '#fff').attr('stroke-width', 1.5);
    }
    el.append('text').text(d.id.split(' ').pop()).attr('dy', 20).attr('text-anchor', 'middle')
      .attr('font-size', '9px').attr('font-family', FONT).attr('fill', PALETTE.primary).attr('pointer-events', 'none');
  });

  nodeEl.on('mouseover', (event, d) => {
    if (tooltip) {
      tooltip.classList.add('visible');
      tooltip.innerHTML = `<strong>${escHtml(d.id)}</strong><br><span style="font-size:11px;">${escHtml(d.type)}${d.institution ? ' · ' + d.institution.slice(0, 30) : ''}</span>`;
      tooltip.style.left = (event.offsetX + 12) + 'px';
      tooltip.style.top = (event.offsetY - 10) + 'px';
    }
  }).on('mouseout', () => {
    if (tooltip) tooltip.classList.remove('visible');
  }).on('click', (event, d) => {
    if (detail) {
      detail.classList.remove('hidden');
      const kol = kols.find(k => k.name === d.id);
      if (kol) {
        detail.innerHTML = `<div style="padding:12px;">
          <div style="font-weight:700;font-size:14px;margin-bottom:4px;">${escHtml(kol.name)}</div>
          <div style="font-size:12px;color:var(--text-muted);">${escHtml(kol.institution || '')} · ${escHtml(kol.city || '')}</div>
          <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;">
            <span class="badge">Tier ${kol.tier}</span>
            <span class="badge">Score: ${kol.score}</span>
            ${kol.publications ? `<span class="badge">${escHtml(String(kol.publications))} pubs</span>` : ''}
          </div>
          <button class="btn btn-ghost btn-sm" style="margin-top:8px;" onclick="document.getElementById('kolNetworkDetail').classList.add('hidden')">✕ Close</button>
        </div>`;
      } else {
        detail.innerHTML = `<div style="padding:12px;"><strong>${escHtml(d.id)}</strong><br><span style="font-size:12px;">${escHtml(d.type)}</span><button class="btn btn-ghost btn-sm" style="margin-top:8px;" onclick="document.getElementById('kolNetworkDetail').classList.add('hidden')">✕ Close</button></div>`;
      }
    }
  });

  sim.on('tick', () => {
    linkEl.attr('x1', d => d.source.x).attr('y1', d => d.source.y).attr('x2', d => d.target.x).attr('y2', d => d.target.y);
    nodeEl.attr('transform', d => `translate(${d.x},${d.y})`);
  });

  // Reset btn
  const resetBtn = document.getElementById('kolNetworkReset');
  if (resetBtn && !resetBtn._bound) {
    resetBtn._bound = true;
    resetBtn.addEventListener('click', () => {
      sim.alpha(0.5).restart();
    });
  }

  // Network search
  const netSearch = document.getElementById('kolNetworkSearch');
  if (netSearch && !netSearch._bound) {
    netSearch._bound = true;
    netSearch.addEventListener('input', () => {
      const q = netSearch.value.toLowerCase();
      nodeEl.attr('opacity', d => (!q || d.id.toLowerCase().includes(q)) ? 1 : 0.15);
    });
  }

  // Filter buttons
  document.querySelectorAll('.kol-filter-btn').forEach(btn => {
    if (!btn._bound) {
      btn._bound = true;
      btn.addEventListener('click', () => {
        btn.classList.toggle('active');
        const activeTypes = Array.from(document.querySelectorAll('.kol-filter-btn.active')).map(b => b.getAttribute('data-type'));
        nodeEl.attr('opacity', d => activeTypes.includes(d.type) ? 1 : 0.1);
        linkEl.attr('opacity', d => {
          const sType = nodes.find(n => n.id === (d.source.id || d.source)) && nodes.find(n => n.id === (d.source.id || d.source)).type;
          return activeTypes.includes(sType) ? 0.6 : 0.05;
        });
      });
    }
  });

  // Zoom
  const zoom = d3.zoom().scaleExtent([0.3, 3]).on('zoom', (event) => {
    g.attr('transform', event.transform);
  });
  d3svg.call(zoom);

  // Tier filter select
  const tierFilter = document.getElementById('kolTierFilter');
  if (tierFilter && !tierFilter._bound) {
    tierFilter._bound = true;
    tierFilter.addEventListener('change', () => {
      state.kolFilter = tierFilter.value;
      renderKOLTable();
    });
  }

  // Rising stars refresh btn
  const risingBtn = document.getElementById('kolLoadRisingStars');
  if (risingBtn && !risingBtn._bound) {
    risingBtn._bound = true;
    risingBtn.addEventListener('click', loadRisingStars);
  }
}

/* ═══════════════════════════════════════════════════════════════════
   14. CLINICAL TRIALS
═══════════════════════════════════════════════════════════════════ */
function searchTrials() {
  const input = document.getElementById('trialsSearchInput');
  const query = input ? input.value.trim() : '';
  if (!query) { showToast('Enter a search term', 'error'); return; }
  state.trialsQuery = query;
  state.trialsPage = 1;
  fetchTrials();
}

function fetchTrials() {
  const skeleton = document.getElementById('trialsSkeletonList');
  const resultsList = document.getElementById('trialsResultsList');
  const pagination = document.getElementById('trialsPagination');
  const countLabel = document.getElementById('trialsCountLabel');
  if (skeleton) skeleton.style.display = '';
  if (resultsList) resultsList.style.display = 'none';
  if (pagination) pagination.style.display = 'none';
  if (countLabel) countLabel.textContent = 'Searching ClinicalTrials.gov…';

  const url = CLINICAL_TRIALS_BASE + '?query.term=' + encodeURIComponent(state.trialsQuery) +
    '&pageSize=10&pageToken=' + ((state.trialsPage - 1) * 10) +
    '&fields=protocolSection';

  fetch(url)
    .then(r => r.json())
    .then(json => {
      const studies = json.studies || [];
      state.trialsResults = studies.map(s => {
        const ps = s.protocolSection || {};
        const id = ps.identificationModule || {};
        const status = ps.statusModule || {};
        const design = ps.designModule || {};
        const desc = ps.descriptionModule || {};
        const sponsor = ps.sponsorCollaboratorsModule || {};
        return {
          nctId: id.nctId || '',
          title: id.briefTitle || id.officialTitle || '',
          status: status.overallStatus || '',
          phase: (design.phases || []).join(', ') || 'N/A',
          startDate: status.startDateStruct && status.startDateStruct.date ? status.startDateStruct.date : '',
          completionDate: status.completionDateStruct && status.completionDateStruct.date ? status.completionDateStruct.date : '',
          sponsor: sponsor.leadSponsor && sponsor.leadSponsor.name ? sponsor.leadSponsor.name : '',
          summary: (desc.briefSummary || '').slice(0, 200)
        };
      });
      state.trialsTotal = json.totalCount || studies.length;
      renderTrialsResults();
    })
    .catch(() => {
      // Fallback to PLATFORM_DATA
      const data = getActiveBoardData();
      const localTrials = (data.treatments && data.treatments.clinical_trials_france) ? data.treatments.clinical_trials_france : [];
      state.trialsResults = localTrials.map(t => ({
        nctId: t.nct_id || '',
        title: t.trial_name || t.title || '',
        status: t.status || '',
        phase: t.phase || '',
        startDate: '',
        completionDate: '',
        sponsor: t.sponsor || 'N/A',
        summary: ''
      }));
      state.trialsTotal = state.trialsResults.length;
      renderTrialsResults();
    });
}

function renderTrialsResults() {
  const skeleton = document.getElementById('trialsSkeletonList');
  const resultsList = document.getElementById('trialsResultsList');
  const pagination = document.getElementById('trialsPagination');
  const countLabel = document.getElementById('trialsCountLabel');
  if (skeleton) skeleton.style.display = 'none';
  if (resultsList) resultsList.style.display = '';
  if (pagination) pagination.style.display = '';
  if (countLabel) countLabel.textContent = state.trialsTotal + ' trials found for "' + state.trialsQuery + '"';

  const prevBtn = document.getElementById('trialsPrevBtn');
  const nextBtn = document.getElementById('trialsNextBtn');
  if (prevBtn) prevBtn.disabled = state.trialsPage <= 1;
  if (nextBtn) nextBtn.disabled = state.trialsTotal <= state.trialsPage * 10;

  if (resultsList) {
    if (!state.trialsResults.length) {
      resultsList.innerHTML = '<div style="color:var(--text-muted);padding:20px;text-align:center;">No trials found.</div>';
    } else {
      const statusColor = { 'RECRUITING': PALETTE.green, 'COMPLETED': PALETTE.gray, 'ACTIVE_NOT_RECRUITING': PALETTE.blue, 'NOT_YET_RECRUITING': PALETTE.yellow };
      resultsList.innerHTML = state.trialsResults.map(t => {
        const sc = statusColor[t.status] || PALETTE.gray;
        return `<div style="padding:14px;border:1px solid var(--border);border-radius:8px;margin-bottom:10px;">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:6px;">
            <div style="font-size:13px;font-weight:600;line-height:1.4;flex:1;">${escHtml(t.title || 'Untitled Trial')}</div>
            <span class="badge" style="background:${sc};color:white;flex-shrink:0;">${escHtml(t.status.replace(/_/g, ' '))}</span>
          </div>
          <div style="display:flex;gap:12px;flex-wrap:wrap;font-size:11px;color:var(--text-muted);">
            ${t.nctId ? `<a href="https://clinicaltrials.gov/study/${escHtml(t.nctId)}" target="_blank" rel="noopener" style="color:var(--accent);">${escHtml(t.nctId)} ↗</a>` : ''}
            <span>Phase: ${escHtml(t.phase)}</span>
            ${t.sponsor ? `<span>Sponsor: ${escHtml(t.sponsor)}</span>` : ''}
            ${t.startDate ? `<span>Start: ${escHtml(t.startDate)}</span>` : ''}
            ${t.completionDate ? `<span>End: ${escHtml(t.completionDate)}</span>` : ''}
          </div>
          ${t.summary ? `<div style="font-size:12px;color:var(--text-muted);margin-top:6px;line-height:1.4;">${escHtml(t.summary)}…</div>` : ''}
        </div>`;
      }).join('');
    }
  }

  renderTrialsGantt();
  renderTrialsPhasesChart();
  renderTrialsSponsorsList();
}

function renderTrialsGantt() {
  const ganttEl = document.getElementById('trialsGantt');
  if (!ganttEl) return;
  const trials = state.trialsResults.length ? state.trialsResults : (getActiveBoardData().treatments && getActiveBoardData().treatments.clinical_trials_france) ? getActiveBoardData().treatments.clinical_trials_france.map(t => ({ title: t.trial_name || t.title || '', phase: t.phase || '', startDate: '2022-01', completionDate: '2026-12', status: t.status || 'Active' })) : [];
  if (!trials.length) { ganttEl.innerHTML = '<div style="color:var(--text-muted);font-size:13px;">No trial data.</div>'; return; }

  const now = new Date();
  const minYear = 2020, maxYear = 2028;
  const totalMonths = (maxYear - minYear) * 12;

  ganttEl.innerHTML = `
    <div style="font-size:11px;color:var(--text-muted);margin-bottom:8px;display:flex;justify-content:space-between;">
      <span>${minYear}</span><span>${(minYear + maxYear) / 2}</span><span>${maxYear}</span>
    </div>
    ${trials.slice(0, 6).map(t => {
      const startStr = t.startDate || '2022-01-01';
      const endStr = t.completionDate || '2026-12-01';
      const start = new Date(startStr + (startStr.length === 7 ? '-01' : ''));
      const end = new Date(endStr + (endStr.length === 7 ? '-01' : ''));
      const startPct = Math.max(0, ((start.getFullYear() - minYear) * 12 + start.getMonth()) / totalMonths * 100);
      const endPct = Math.min(100, ((end.getFullYear() - minYear) * 12 + end.getMonth()) / totalMonths * 100);
      const width = Math.max(2, endPct - startPct);
      const title = (t.title || t.trial_name || '').slice(0, 40);
      return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
        <div style="width:120px;font-size:11px;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escHtml(title)}</div>
        <div style="flex:1;background:var(--bg);border-radius:4px;height:18px;position:relative;">
          <div style="position:absolute;left:${startPct}%;width:${width}%;height:100%;background:${PALETTE.accent};border-radius:4px;opacity:0.8;"></div>
          <div style="position:absolute;left:${((now.getFullYear() - minYear) * 12 + now.getMonth()) / totalMonths * 100}%;top:0;bottom:0;width:2px;background:${PALETTE.red};opacity:0.7;"></div>
        </div>
        <div style="width:60px;font-size:10px;color:var(--text-muted);">${escHtml(t.phase || '')}</div>
      </div>`;
    }).join('')}
  `;
}

function renderTrialsPhasesChart() {
  destroyChart('trialsPhasesChart');
  const ctx = getCtx('trialsPhasesChart');
  if (!ctx) return;
  const phaseCounts = { 'Phase 1': 0, 'Phase 2': 0, 'Phase 3': 0, 'Phase 4': 0, 'Other': 0 };
  state.trialsResults.forEach(t => {
    const p = t.phase || '';
    if (p.includes('3')) phaseCounts['Phase 3']++;
    else if (p.includes('2')) phaseCounts['Phase 2']++;
    else if (p.includes('1')) phaseCounts['Phase 1']++;
    else if (p.includes('4')) phaseCounts['Phase 4']++;
    else phaseCounts['Other']++;
  });
  if (!state.trialsResults.length) {
    phaseCounts['Phase 2'] = 1; phaseCounts['Phase 3'] = 2; phaseCounts['Other'] = 1;
  }
  charts['trialsPhasesChart'] = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: Object.keys(phaseCounts),
      datasets: [{ data: Object.values(phaseCounts), backgroundColor: CHART_COLORS.slice(0, 5), borderWidth: 0 }]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'bottom', labels: { font: { family: FONT, size: 11 } } } },
      cutout: '60%'
    }
  });
}

function renderTrialsSponsorsList() {
  const el = document.getElementById('trialsSponsorsList');
  if (!el) return;
  const sponsors = {};
  state.trialsResults.forEach(t => {
    if (t.sponsor) sponsors[t.sponsor] = (sponsors[t.sponsor] || 0) + 1;
  });
  if (!Object.keys(sponsors).length) {
    el.innerHTML = '<div style="color:var(--text-muted);font-size:13px;">No sponsor data.</div>';
    return;
  }
  const sorted = Object.entries(sponsors).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const max = sorted[0][1];
  el.innerHTML = sorted.map(([name, count]) => `
    <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border);">
      <div style="flex:1;font-size:12px;">${escHtml(name)}</div>
      <div style="width:80px;background:var(--bg);border-radius:4px;height:6px;overflow:hidden;">
        <div style="width:${(count / max) * 100}%;background:${PALETTE.accent};height:100%;border-radius:4px;"></div>
      </div>
      <div style="font-size:11px;color:var(--text-muted);width:20px;text-align:right;">${count}</div>
    </div>
  `).join('');
}

/* ═══════════════════════════════════════════════════════════════════
   15. SOCIAL INTELLIGENCE
═══════════════════════════════════════════════════════════════════ */
function initSocial() {
  renderSentimentGauge();
  renderSignalsFeed();
  renderWordCloud();
  loadVisibrainTopics();
}

function renderSentimentGauge() {
  destroyChart('sentimentGauge');
  const ctx = getCtx('sentimentGauge');
  if (!ctx) return;
  // Half-doughnut gauge: positive, neutral, negative
  const posVal = 30, neutVal = 50, negVal = 20;
  charts['sentimentGauge'] = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Positive', 'Neutral', 'Negative'],
      datasets: [{
        data: [posVal, neutVal, negVal, 100], // last 100 = invisible lower half
        backgroundColor: [PALETTE.green, PALETTE.yellow, PALETTE.red, 'transparent'],
        borderWidth: 0,
        circumference: 180,
        rotation: 270
      }]
    },
    options: {
      responsive: true,
      cutout: '65%',
      plugins: {
        legend: { position: 'bottom', labels: { font: { family: FONT, size: 11 }, filter: item => item.index < 3 } },
        tooltip: { filter: item => item.index < 3 }
      }
    }
  });

  setEl('sentimentBreakdown', `
    <div style="display:flex;justify-content:center;gap:20px;font-size:12px;">
      <div style="text-align:center;"><div style="font-weight:700;font-size:18px;color:${PALETTE.green};">${posVal}%</div><div style="color:var(--text-muted);">Positive</div></div>
      <div style="text-align:center;"><div style="font-weight:700;font-size:18px;color:${PALETTE.yellow};">${neutVal}%</div><div style="color:var(--text-muted);">Neutral</div></div>
      <div style="text-align:center;"><div style="font-weight:700;font-size:18px;color:${PALETTE.red};">${negVal}%</div><div style="color:var(--text-muted);">Negative</div></div>
    </div>
  `);
}

function renderSignalsFeed() {
  const feed = document.getElementById('signalsFeed');
  if (!feed) return;
  const data = getActiveBoardData();
  const signals = [
    { platform: 'Twitter/X', handle: '@DermatolFR', text: 'Nouvelle étude sur Ledaga dans le MF — résultats encourageants en phase 2 #CTCL #dermatologie', sentiment: 'positive', time: '2h' },
    { platform: 'LinkedIn', handle: 'Pr Marie Dupont', text: 'Discussion intéressante à l\'EADV sur les nouvelles cibles thérapeutiques dans le lymphome cutané', sentiment: 'neutral', time: '5h' },
    { platform: 'Twitter/X', handle: '@onco_news', text: 'TELLOMAK 3 confirme les données de Phase 2 — lacutamab pourrait changer le paradigme CTCL', sentiment: 'positive', time: '1d' },
    { platform: 'Forum médical', handle: 'Dr.A.Medecin', text: 'Question: quelle est la durée recommandée du traitement par chlorméthine gel?', sentiment: 'neutral', time: '2d' },
    { platform: 'Twitter/X', handle: '@pharma_watch', text: 'Controversy: dupilumab masking MF cases — dermatologists call for better screening protocols', sentiment: 'negative', time: '3d' }
  ];
  const sentColor = { positive: PALETTE.green, neutral: PALETTE.yellow, negative: PALETTE.red };
  feed.innerHTML = signals.map(s => `
    <div style="padding:10px 0;border-bottom:1px solid var(--border);">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
        <span style="width:8px;height:8px;border-radius:50%;background:${sentColor[s.sentiment]};display:inline-block;flex-shrink:0;"></span>
        <span style="font-weight:600;font-size:12px;">${escHtml(s.platform)}</span>
        <span style="font-size:11px;color:var(--text-muted);">${escHtml(s.handle)}</span>
        <span style="font-size:11px;color:var(--text-muted);margin-left:auto;">${escHtml(s.time)}</span>
      </div>
      <div style="font-size:12px;color:var(--text-primary);line-height:1.4;">${escHtml(s.text)}</div>
    </div>
  `).join('');
}

function renderWordCloud() {
  const wrap = document.getElementById('wordCloudWrap');
  if (!wrap) return;
  const data = getActiveBoardData();
  const words = (data.pharmageo && data.pharmageo.cloudwords) ? data.pharmageo.cloudwords : [];
  if (!words.length) { wrap.innerHTML = '<div style="color:var(--text-muted);font-size:13px;padding:20px;text-align:center;">No word cloud data.</div>'; return; }
  const maxCount = Math.max(...words.map(w => w.count));
  const colors = [PALETTE.primary, PALETTE.accent, PALETTE.blue, PALETTE.pink, PALETTE.yellow, PALETTE.purple, PALETTE.orange];
  wrap.innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:8px;padding:16px;align-items:center;justify-content:center;">
    ${words.slice(0, 25).map((w, i) => {
      const size = 10 + Math.round((w.count / maxCount) * 20);
      const color = colors[i % colors.length];
      return `<span style="font-size:${size}px;color:${color};font-weight:${w.count > 7 ? '700' : '400'};cursor:default;" title="${w.count} mentions">${escHtml(w.word)}</span>`;
    }).join('')}
  </div>`;
}

function loadVisibrainTopics() {
  const grid = document.getElementById('visibrainTopicsGrid');
  const rulesGrid = document.getElementById('monitoringRulesGrid');
  const quotaGrid = document.getElementById('quotaGrid');

  const url = API + '?action=visibrain_topics';
  fetch(url)
    .then(r => r.json())
    .then(json => {
      const topics = json.topics || json.results || [];
      renderVisibrainTopics(topics, grid);
    })
    .catch(() => {
      const mockTopics = [
        { name: 'CTCL France', mentions: 342, trend: '+12%', sentiment: 'neutral' },
        { name: 'Ledaga', mentions: 156, trend: '+5%', sentiment: 'positive' },
        { name: 'Poteligeo', mentions: 128, trend: '+8%', sentiment: 'neutral' },
        { name: 'Lymphome cutané', mentions: 89, trend: '+3%', sentiment: 'neutral' },
        { name: 'Dupilumab CTCL', mentions: 67, trend: '+22%', sentiment: 'negative' }
      ];
      renderVisibrainTopics(mockTopics, grid);
    });

  // Monitoring rules
  if (rulesGrid) {
    const rules = [
      { keyword: 'Ledaga OR chlorméthine', channel: 'Twitter, LinkedIn', active: true },
      { keyword: 'CTCL OR "lymphome cutané"', channel: 'All', active: true },
      { keyword: 'Poteligeo OR mogamulizumab', channel: 'Twitter, Forums', active: true },
      { keyword: 'TELLOMAK OR lacutamab', channel: 'All', active: false }
    ];
    rulesGrid.innerHTML = rules.map(r => `
      <div style="padding:10px;border:1px solid var(--border);border-radius:6px;">
        <div style="font-size:12px;font-weight:600;">${escHtml(r.keyword)}</div>
        <div style="font-size:11px;color:var(--text-muted);">${escHtml(r.channel)}</div>
        <div style="margin-top:4px;"><span class="badge" style="background:${r.active ? PALETTE.green : PALETTE.gray};color:white;font-size:10px;">${r.active ? 'Active' : 'Paused'}</span></div>
      </div>
    `).join('');
  }

  // Quotas
  if (quotaGrid) {
    const quotas = [
      { label: 'Monthly Mentions', used: 8420, limit: 10000 },
      { label: 'Topics Active', used: 4, limit: 10 },
      { label: 'Alert Rules', used: 4, limit: 20 },
      { label: 'API Calls (month)', used: 1240, limit: 5000 }
    ];
    quotaGrid.innerHTML = quotas.map(q => {
      const pct = Math.round((q.used / q.limit) * 100);
      const color = pct > 85 ? PALETTE.red : pct > 60 ? PALETTE.yellow : PALETTE.green;
      return `<div style="padding:12px;border:1px solid var(--border);border-radius:8px;">
        <div style="font-size:12px;font-weight:600;margin-bottom:8px;">${escHtml(q.label)}</div>
        <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-muted);margin-bottom:4px;">
          <span>${q.used.toLocaleString()}</span><span>${q.limit.toLocaleString()}</span>
        </div>
        <div style="background:var(--border);border-radius:4px;height:6px;overflow:hidden;">
          <div style="width:${pct}%;background:${color};height:100%;border-radius:4px;transition:width 0.5s;"></div>
        </div>
        <div style="font-size:11px;color:${color};margin-top:4px;">${pct}%</div>
      </div>`;
    }).join('');
  }
}

function renderVisibrainTopics(topics, grid) {
  if (!grid) return;
  if (!topics.length) { grid.innerHTML = '<div style="color:var(--text-muted);font-size:13px;">No topics data.</div>'; return; }
  grid.innerHTML = topics.map(t => `
    <div style="padding:10px;border:1px solid var(--border);border-radius:8px;">
      <div style="font-weight:600;font-size:12px;margin-bottom:4px;">${escHtml(t.name || t.topic || '')}</div>
      <div style="font-size:11px;color:var(--text-muted);">${t.mentions ? t.mentions + ' mentions' : ''} ${t.trend ? '· ' + t.trend : ''}</div>
      ${t.sentiment ? `<span class="badge" style="margin-top:4px;font-size:10px;">${escHtml(t.sentiment)}</span>` : ''}
    </div>
  `).join('');
}

/* ═══════════════════════════════════════════════════════════════════
   16. DIGITAL LANDSCAPE
═══════════════════════════════════════════════════════════════════ */
function initLandscape() {
  renderLandscapeBubble();
  renderHeatmapFrance();
  renderAIInsights();
  renderCompetitiveTable();
}

function renderLandscapeBubble() {
  destroyChart('landscapeBubbleChart');
  const ctx = getCtx('landscapeBubbleChart');
  if (!ctx) return;
  const data = getActiveBoardData();
  const products = (data.pharmageo && data.pharmageo.agnostic && data.pharmageo.agnostic.products) ? data.pharmageo.agnostic.products : [];
  const mainBrand = (data.config && data.config.brand) || 'Ledaga';

  const bubbleDatasets = products.slice(0, 8).map((p, i) => {
    const isMain = p.name.toLowerCase().includes(mainBrand.toLowerCase());
    const geoScore = 20 + Math.random() * 60;
    const socialVol = 10 + Math.random() * 80;
    const pubReach = 5 + Math.random() * 20;
    return {
      label: p.name,
      data: [{ x: geoScore, y: socialVol, r: pubReach }],
      backgroundColor: (isMain ? PALETTE.accent : CHART_COLORS[i % CHART_COLORS.length]) + '99',
      borderColor: isMain ? PALETTE.accent : CHART_COLORS[i % CHART_COLORS.length],
      borderWidth: isMain ? 3 : 1.5
    };
  });

  if (!bubbleDatasets.length) {
    bubbleDatasets.push(
      { label: 'Ledaga', data: [{ x: 49, y: 35, r: 18 }], backgroundColor: PALETTE.accent + '99', borderColor: PALETTE.accent, borderWidth: 3 },
      { label: 'Poteligeo', data: [{ x: 38, y: 62, r: 14 }], backgroundColor: PALETTE.blue + '99', borderColor: PALETTE.blue, borderWidth: 1.5 },
      { label: 'Adcetris', data: [{ x: 42, y: 45, r: 10 }], backgroundColor: PALETTE.pink + '99', borderColor: PALETTE.pink, borderWidth: 1.5 }
    );
  }

  charts['landscapeBubbleChart'] = new Chart(ctx, {
    type: 'bubble',
    data: { datasets: bubbleDatasets },
    options: {
      responsive: true,
      plugins: { legend: { position: 'bottom', labels: { font: { family: FONT, size: 11 } } } },
      scales: {
        x: { title: { display: true, text: 'GEO Score', font: { family: FONT } }, min: 0, max: 100, grid: { color: PALETTE.border } },
        y: { title: { display: true, text: 'Social Volume Index', font: { family: FONT } }, min: 0, max: 100, grid: { color: PALETTE.border } }
      }
    }
  });
}

function renderHeatmapFrance() {
  const el = document.getElementById('heatmapFrance');
  if (!el) return;
  const data = getActiveBoardData();
  const centres = (data.gfelc && data.gfelc.centres_france) ? data.gfelc.centres_france : [];
  const regions = [
    { name: 'Île-de-France', density: 95, city: 'Paris' },
    { name: 'Nouvelle-Aquitaine', density: 78, city: 'Bordeaux' },
    { name: 'Auvergne-Rhône-Alpes', density: 65, city: 'Lyon' },
    { name: 'Occitanie', density: 58, city: 'Montpellier' },
    { name: 'Hauts-de-France', density: 52, city: 'Lille' },
    { name: 'Bretagne', density: 45, city: 'Rennes' },
    { name: 'Normandie', density: 42, city: 'Rouen' },
    { name: 'Grand Est', density: 48, city: 'Reims' },
    { name: 'Pays de la Loire', density: 40, city: 'Nantes' },
    { name: 'PACA', density: 55, city: 'Marseille' }
  ];

  el.innerHTML = regions.map(r => {
    const opacity = 0.2 + (r.density / 100) * 0.8;
    return `<div style="display:flex;align-items:center;gap:10px;padding:5px 0;border-bottom:1px solid var(--border);">
      <div style="width:12px;height:12px;border-radius:2px;background:${PALETTE.accent};opacity:${opacity};flex-shrink:0;"></div>
      <div style="flex:1;font-size:12px;">${escHtml(r.name)}</div>
      <div style="width:100px;background:var(--bg);border-radius:4px;height:6px;overflow:hidden;">
        <div style="width:${r.density}%;background:${PALETTE.accent};height:100%;border-radius:4px;"></div>
      </div>
      <div style="font-size:11px;color:var(--text-muted);width:40px;text-align:right;">${r.density}</div>
    </div>`;
  }).join('');
}

function renderAIInsights() {
  const el = document.getElementById('aiInsightsList');
  if (!el) return;
  const data = getActiveBoardData();
  const brand = (data.config && data.config.brand) || 'Ledaga';
  const comp = (data.config && data.config.competitor) || 'Poteligeo';
  const insights = [
    { icon: '📊', title: 'GEO Score Gap', text: `${brand}'s average GEO score (49/100) trails Perplexity AI visibility (100%) but shows strong citation from regulatory sources. Opportunity: Wikipedia and schema.org markup.`, priority: 'High' },
    { icon: '🔬', title: 'Publication Velocity', text: `${brand}-related publications have accelerated +12% YoY, with Saint-Louis and Bordeaux driving the most output. CUTALLO data still generating secondary publications.`, priority: 'Med' },
    { icon: '⚠️', title: 'Competitive Alert', text: `${comp} (mogamulizumab) is gaining social share of voice in CTCL discourse, particularly around real-world data. OMEGA study driving awareness.`, priority: 'High' },
    { icon: '💡', title: 'KOL Engagement Opportunity', text: '7 Tier 1 KOLs have no digital presence. Webinar series could activate "Silent" segment and amplify clinical evidence.', priority: 'Med' },
    { icon: '🧬', title: 'Emerging Threat', text: 'TELLOMAK 3 Phase 3 launch will significantly increase lacutamab visibility. Proactive media strategy recommended before H2 2026.', priority: 'High' }
  ];
  el.innerHTML = insights.map(i => `
    <div style="display:flex;gap:12px;padding:12px 0;border-bottom:1px solid var(--border);">
      <div style="font-size:20px;flex-shrink:0;">${i.icon}</div>
      <div style="flex:1;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
          <strong style="font-size:13px;">${escHtml(i.title)}</strong>
          <span class="badge badge-${i.priority === 'High' ? 'red' : 'yellow'}">${escHtml(i.priority)}</span>
        </div>
        <div style="font-size:12px;color:var(--text-muted);line-height:1.5;">${escHtml(i.text)}</div>
      </div>
    </div>
  `).join('');
}

function renderCompetitiveTable() {
  const tbody = document.getElementById('competitiveTableBody');
  if (!tbody) return;
  const data = getActiveBoardData();
  const products = (data.pharmageo && data.pharmageo.agnostic && data.pharmageo.agnostic.products) ? data.pharmageo.agnostic.products.slice(0, 8) : [];
  const brand = (data.config && data.config.brand) || 'Ledaga';

  const rows = products.length ? products.map(p => ({
    name: p.name,
    geo: Math.round(20 + Math.random() * 60),
    social: Math.round(p.sov * 10),
    pubs: Math.round(20 + Math.random() * 200),
    trials: Math.round(1 + Math.random() * 10),
    isMain: p.name.toLowerCase().includes(brand.toLowerCase())
  })) : [
    { name: 'Ledaga', geo: 49, social: 35, pubs: 247, trials: 7, isMain: true },
    { name: 'Poteligeo', geo: 38, social: 62, pubs: 180, trials: 5, isMain: false },
    { name: 'Adcetris', geo: 42, social: 45, pubs: 320, trials: 8, isMain: false }
  ];

  tbody.innerHTML = rows.map(r => {
    const overall = Math.round((r.geo * 0.3 + r.social * 0.25 + Math.min(100, r.pubs / 3) * 0.25 + r.trials * 5 * 0.2));
    const overallColor = overall >= 60 ? PALETTE.green : overall >= 40 ? PALETTE.yellow : PALETTE.red;
    return `<tr ${r.isMain ? 'style="background:rgba(0,225,255,0.04);"' : ''}>
      <td><strong style="color:${r.isMain ? PALETTE.accent : 'inherit'};">${escHtml(r.name)}</strong></td>
      <td>${r.geo}/100</td>
      <td>${r.social}</td>
      <td>${r.pubs}</td>
      <td>${r.trials}</td>
      <td><strong style="color:${overallColor};">${overall}</strong></td>
    </tr>`;
  }).join('');
}

/* ═══════════════════════════════════════════════════════════════════
   17. SOURCES & CONFIG
═══════════════════════════════════════════════════════════════════ */
function initSources() {
  renderWeightsGrid();
  renderMemoryPanel();
  renderRegulatoryGrid();
}

function renderWeightsGrid() {
  const grid = document.getElementById('weightsGrid');
  if (!grid) return;
  const weights = [
    { key: 'geo', label: 'GEO / AI Visibility' },
    { key: 'publications', label: 'Publications' },
    { key: 'social', label: 'Social Intelligence' },
    { key: 'trials', label: 'Clinical Trials' },
    { key: 'kol', label: 'KOL Network' }
  ];
  grid.innerHTML = weights.map(w => `
    <div style="padding:10px 0;border-bottom:1px solid var(--border);">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
        <span style="font-size:13px;">${escHtml(w.label)}</span>
        <span style="font-size:13px;font-weight:600;" id="weightVal-${w.key}">${state.sourceWeights[w.key]}%</span>
      </div>
      <input type="range" min="0" max="100" value="${state.sourceWeights[w.key]}" class="weight-slider" data-key="${w.key}"
        style="width:100%;accent-color:${PALETTE.accent};" />
    </div>
  `).join('');
  grid.querySelectorAll('.weight-slider').forEach(slider => {
    slider.addEventListener('input', () => {
      const key = slider.getAttribute('data-key');
      state.sourceWeights[key] = parseInt(slider.value, 10);
      const valEl = document.getElementById('weightVal-' + key);
      if (valEl) valEl.textContent = slider.value + '%';
    });
  });
}

function renderMemoryPanel() {
  const panel = document.getElementById('memoryPanel');
  if (!panel) return;
  if (!state.agenticMemory.length) {
    panel.innerHTML = '<div style="color:var(--text-muted);font-size:13px;padding:12px 0;">No agentic memory entries yet. AI analyses will be logged here.</div>';
    return;
  }
  panel.innerHTML = state.agenticMemory.map(m => `
    <div style="padding:10px;background:var(--bg);border-radius:6px;margin-bottom:8px;">
      <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px;">${escHtml(m.timestamp)} · ${escHtml(m.page)}</div>
      <div style="font-size:13px;">${escHtml(m.text)}</div>
    </div>
  `).join('');

  const clearBtn = document.getElementById('clearMemoryBtn');
  if (clearBtn && !clearBtn._bound) {
    clearBtn._bound = true;
    clearBtn.addEventListener('click', () => {
      state.agenticMemory = [];
      renderMemoryPanel();
      showToast('Agentic memory cleared', 'info');
    });
  }
}

function renderRegulatoryGrid() {
  // Find or create a container for regulatory databases
  let regContainer = document.getElementById('regulatoryDbGrid');
  if (!regContainer) {
    const sourcesPage = document.getElementById('page-sources');
    if (!sourcesPage) return;
    regContainer = document.createElement('div');
    regContainer.id = 'regulatoryDbGrid';
    regContainer.style.cssText = 'margin-top:20px;';
    sourcesPage.querySelector('.content') || sourcesPage.appendChild(regContainer);

    const main = sourcesPage;
    const lastCard = main.querySelectorAll('.card');
    const lastEl = lastCard[lastCard.length - 1];
    if (lastEl && lastEl.parentNode) {
      lastEl.parentNode.insertBefore(regContainer, lastEl.nextSibling);
    } else {
      main.appendChild(regContainer);
    }
  }

  if (!REGULATORY_SOURCES || !REGULATORY_SOURCES.length) return;

  const countryFlags = { FR: '🇫🇷', GB: '🇬🇧', ES: '🇪🇸', IT: '🇮🇹', DE: '🇩🇪', CA: '🇨🇦', BE: '🇧🇪', PT: '🇵🇹', EU: '🇪🇺', US: '🇺🇸' };

  regContainer.innerHTML = `
    <div class="card">
      <div class="card-title">Regulatory Transparency Databases</div>
      <div class="card-subtitle">HCP payment transparency and regulatory sources by country</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px;margin-top:16px;">
        ${REGULATORY_SOURCES.map(r => `
          <div style="padding:12px;border:1px solid var(--border);border-radius:8px;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
              <span style="font-size:20px;">${countryFlags[r.country_code] || '🌐'}</span>
              <div>
                <div style="font-weight:600;font-size:12px;">${escHtml(r.name)}</div>
                <div style="font-size:11px;color:var(--text-muted);">${escHtml(r.country)} · Since ${r.year_established}</div>
              </div>
            </div>
            <div style="font-size:11px;color:var(--text-muted);margin-bottom:6px;line-height:1.4;">${escHtml((r.legal_basis || '').slice(0, 100))}…</div>
            <a href="${escHtml(r.url)}" target="_blank" rel="noopener" style="font-size:11px;color:var(--accent);">Visit Database ↗</a>
          </div>
        `).join('')}
      </div>
    </div>`;
}

/* ═══════════════════════════════════════════════════════════════════
   18. REPORTS & PLANNING
═══════════════════════════════════════════════════════════════════ */
const REPORT_CARDS = [
  { id: 'r1', title: 'Q1 2026 GEO Intelligence Report', type: 'GEO', status: 'Scheduled', date: '2026-03-15', size: '2.4 MB' },
  { id: 'r2', title: 'CTCL KOL Landscape — France', type: 'KOL', status: 'Completed', date: '2026-02-28', size: '1.8 MB' },
  { id: 'r3', title: 'Competitive Intelligence Ledaga vs Poteligeo', type: 'Competitive', status: 'Completed', date: '2026-02-10', size: '3.1 MB' },
  { id: 'r4', title: 'Clinical Trial Pipeline 2026', type: 'Trials', status: 'Draft', date: '2026-03-01', size: '—' },
  { id: 'r5', title: 'Social Signals Monthly — Feb 2026', type: 'Social', status: 'Completed', date: '2026-02-29', size: '0.9 MB' },
  { id: 'r6', title: 'GEO Full Audit Q4 2025', type: 'GEO', status: 'Completed', date: '2025-12-31', size: '4.2 MB' }
];

const REPORT_WIZARD_STEPS_DEF = [
  { title: 'Scope', desc: 'Select the intelligence sections to include' },
  { title: 'Sources', desc: 'Choose data sources and date range' },
  { title: 'Format', desc: 'Select output format and template' },
  { title: 'Schedule', desc: 'Set delivery schedule and recipients' },
  { title: 'Review', desc: 'Review and generate report' }
];

function initReports() {
  renderReportsGrid();
  initReportWizard();

  document.querySelectorAll('.export-btn').forEach(btn => {
    if (!btn._bound) {
      btn._bound = true;
      btn.addEventListener('click', () => {
        const fmt = btn.getAttribute('data-format');
        showToast('Export to ' + (fmt || 'file').toUpperCase() + ' coming soon', 'info');
      });
    }
  });
}

function renderReportsGrid() {
  const grid = document.getElementById('reportsGrid');
  if (!grid) return;
  const statusColor = { Scheduled: PALETTE.yellow, Completed: PALETTE.green, Draft: PALETTE.gray };
  grid.innerHTML = REPORT_CARDS.map(r => `
    <div class="card" style="cursor:pointer;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
        <span class="badge" style="background:${statusColor[r.status]||PALETTE.gray};color:white;">${escHtml(r.status)}</span>
        <span class="badge">${escHtml(r.type)}</span>
      </div>
      <div style="font-weight:600;font-size:14px;margin-bottom:4px;">${escHtml(r.title)}</div>
      <div style="font-size:12px;color:var(--text-muted);">
        <span>${escHtml(r.date)}</span>
        ${r.size !== '—' ? `<span style="margin-left:8px;">${escHtml(r.size)}</span>` : ''}
      </div>
      <div style="display:flex;gap:8px;margin-top:12px;">
        ${r.status === 'Completed' ? `<button class="btn btn-secondary btn-sm">Download</button>` : ''}
        <button class="btn btn-ghost btn-sm">View</button>
      </div>
    </div>
  `).join('');

  grid.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => showToast('Report action coming soon', 'info'));
  });
}

function initReportWizard() {
  const launchBtn = document.getElementById('launchReportBtn');
  const overlay = document.getElementById('reportWizardOverlay');
  const closeBtn = document.getElementById('reportWizardClose');
  const nextBtn = document.getElementById('wizardNextBtn');
  const prevBtn = document.getElementById('wizardPrevBtn');

  if (launchBtn && overlay) {
    launchBtn.addEventListener('click', () => {
      state.reportWizardStep = 1;
      renderReportWizardStep();
      overlay.style.display = '';
    });
  }
  if (closeBtn && overlay) {
    closeBtn.addEventListener('click', () => { overlay.style.display = 'none'; });
  }
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      if (state.reportWizardStep < REPORT_WIZARD_STEPS_DEF.length) {
        state.reportWizardStep++;
        renderReportWizardStep();
      } else {
        if (overlay) overlay.style.display = 'none';
        showToast('Report generation scheduled!', 'success');
      }
    });
  }
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (state.reportWizardStep > 1) {
        state.reportWizardStep--;
        renderReportWizardStep();
      }
    });
  }
}

function renderReportWizardStep() {
  const step = state.reportWizardStep;
  const def = REPORT_WIZARD_STEPS_DEF[step - 1];
  const body = document.getElementById('wizardBody');
  const prevBtn = document.getElementById('wizardPrevBtn');
  const nextBtn = document.getElementById('wizardNextBtn');

  // Update step indicators
  document.querySelectorAll('#reportWizardOverlay .wizard-step').forEach((el, i) => {
    el.classList.toggle('active', i + 1 === step);
    el.classList.toggle('done', i + 1 < step);
  });

  if (prevBtn) prevBtn.disabled = step === 1;
  if (nextBtn) nextBtn.textContent = step === REPORT_WIZARD_STEPS_DEF.length ? 'Generate Report' : 'Next';

  if (!body) return;
  switch (step) {
    case 1:
      body.innerHTML = `<div class="wizard-step-body">
        <h3 style="margin-bottom:12px;">${def.title}: ${def.desc}</h3>
        ${['GEO Analysis', 'Publications', 'KOL Landscape', 'Clinical Trials', 'Social Intelligence', 'Digital Landscape', 'Competitive Overview'].map(s => `
          <label style="display:flex;align-items:center;gap:8px;margin-bottom:8px;font-size:13px;">
            <input type="checkbox" checked style="accent-color:${PALETTE.accent};" /> ${escHtml(s)}
          </label>
        `).join('')}
      </div>`; break;
    case 2:
      body.innerHTML = `<div class="wizard-step-body">
        <h3 style="margin-bottom:12px;">${def.title}: ${def.desc}</h3>
        <div style="margin-bottom:12px;">
          <label style="font-size:13px;display:block;margin-bottom:4px;">Date Range</label>
          <select class="select" style="width:100%;">
            <option>Last 30 days</option><option selected>Last 90 days</option><option>Last 12 months</option><option>All time</option>
          </select>
        </div>
        <div>
          <label style="font-size:13px;display:block;margin-bottom:8px;">Include Sources</label>
          ${['OpenAlex', 'ClinicalTrials.gov', 'PharmaGEO', 'VisiBrain', 'Google Trends'].map(s => `
            <label style="display:flex;align-items:center;gap:8px;margin-bottom:8px;font-size:13px;">
              <input type="checkbox" checked style="accent-color:${PALETTE.accent};" /> ${escHtml(s)}
            </label>
          `).join('')}
        </div>
      </div>`; break;
    case 3:
      body.innerHTML = `<div class="wizard-step-body">
        <h3 style="margin-bottom:12px;">${def.title}: ${def.desc}</h3>
        ${[{ fmt: 'PDF', desc: 'Full report with charts and tables' }, { fmt: 'PPTX', desc: 'Executive presentation slides' }, { fmt: 'DOCX', desc: 'Editable Word document' }, { fmt: 'CSV', desc: 'Raw data export' }].map(f => `
          <label style="display:flex;align-items:center;gap:8px;margin-bottom:10px;font-size:13px;cursor:pointer;">
            <input type="radio" name="reportFormat" value="${f.fmt}" ${f.fmt === 'PDF' ? 'checked' : ''} style="accent-color:${PALETTE.accent};" />
            <div><div style="font-weight:600;">${f.fmt}</div><div style="font-size:11px;color:var(--text-muted);">${f.desc}</div></div>
          </label>
        `).join('')}
      </div>`; break;
    case 4:
      body.innerHTML = `<div class="wizard-step-body">
        <h3 style="margin-bottom:12px;">${def.title}: ${def.desc}</h3>
        <div style="margin-bottom:12px;">
          <label style="font-size:13px;display:block;margin-bottom:4px;">Frequency</label>
          <select class="select" style="width:100%;"><option>One-time</option><option>Weekly</option><option>Monthly</option><option>Quarterly</option></select>
        </div>
        <div>
          <label style="font-size:13px;display:block;margin-bottom:4px;">Recipients (email)</label>
          <input type="text" class="input" placeholder="email@example.com, email2@example.com" style="width:100%;" />
        </div>
      </div>`; break;
    case 5:
      body.innerHTML = `<div class="wizard-step-body">
        <h3 style="margin-bottom:12px;">${def.title}: ${def.desc}</h3>
        <div style="padding:16px;background:var(--bg);border-radius:8px;">
          <div style="font-size:13px;"><strong>Board:</strong> ${escHtml(activeBoard.name)}</div>
          <div style="font-size:13px;margin-top:6px;"><strong>Sections:</strong> All selected</div>
          <div style="font-size:13px;margin-top:6px;"><strong>Format:</strong> PDF</div>
          <div style="font-size:13px;margin-top:6px;"><strong>Schedule:</strong> One-time</div>
          <div style="font-size:13px;margin-top:6px;"><strong>Estimated generation time:</strong> ~2 minutes</div>
        </div>
      </div>`; break;
  }
}

/* ═══════════════════════════════════════════════════════════════════
   19. AIKKA COPILOT CHAT
═══════════════════════════════════════════════════════════════════ */
function initChat() {
  const toggleBtns = [document.getElementById('chatToggleBtn'), document.getElementById('chatToggleBtnTop')];
  const overlay = document.getElementById('chatOverlay');
  const closeBtn = document.getElementById('chatCloseBtn');
  const navCopilot = document.getElementById('navCopilot');
  const sendBtn = document.getElementById('chatSendBtn');
  const input = document.getElementById('chatInput');

  function openChat() {
    state.chatOpen = true;
    if (overlay) overlay.classList.add('open');
    if (state.chatFirstOpen) {
      state.chatFirstOpen = false;
      addChatMessage('assistant', getWelcomeMessage());
    }
    if (input) input.focus();
  }

  function closeChat() {
    state.chatOpen = false;
    if (overlay) overlay.classList.remove('open');
  }

  toggleBtns.forEach(btn => {
    if (btn) btn.addEventListener('click', () => state.chatOpen ? closeChat() : openChat());
  });
  if (closeBtn) closeBtn.addEventListener('click', closeChat);
  if (navCopilot) navCopilot.addEventListener('click', (e) => { e.preventDefault(); openChat(); });

  if (sendBtn) sendBtn.addEventListener('click', sendChatMessage);
  if (input) {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage(); }
    });
  }
}

function getWelcomeMessage() {
  const data = getActiveBoardData();
  const brand = (data.config && data.config.brand) || activeBoard.brand || 'the active brand';
  const geo = (data.config && data.config.market) || activeBoard.geo || 'this market';
  return `Hello! I'm Aikka Copilot 👋\n\nI'm your AI intelligence assistant for **${brand}** in **${geo}**.\n\nYou can ask me about:\n• **GEO scores** — AI visibility performance\n• **KOLs** — key opinion leaders and their activity\n• **Clinical trials** — active and upcoming studies\n• **Brands** — competitive landscape\n• **Publications** — recent scientific literature\n\nHow can I help you today?`;
}

function addChatMessage(role, text) {
  const messages = document.getElementById('chatMessages');
  if (!messages) return;
  const avatar = document.getElementById('aikkaAvatar');

  if (role === 'assistant' && avatar) {
    avatar.classList.add('thinking');
    setTimeout(() => avatar.classList.remove('thinking'), 1200);
  }

  const div = document.createElement('div');
  div.className = 'chat-message ' + role;
  // Convert markdown-like **bold** and \n to HTML
  const html = escHtml(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');
  div.innerHTML = `<div class="chat-bubble">${html}</div>`;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

function sendChatMessage() {
  const input = document.getElementById('chatInput');
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  addChatMessage('user', text);
  const status = document.getElementById('aikkaStatus');
  if (status) status.textContent = 'Thinking…';
  setTimeout(() => {
    const response = generateChatResponse(text);
    addChatMessage('assistant', response);
    if (status) status.textContent = 'Online · Pharma Intelligence AI';
    // Log to agentic memory
    state.agenticMemory.push({ timestamp: new Date().toLocaleTimeString(), page: 'Chat', text: 'Q: ' + text.slice(0, 80) });
  }, 800 + Math.random() * 400);
}

function generateChatResponse(query) {
  const q = query.toLowerCase();
  const data = getActiveBoardData();
  const scores = (data.pharmageo && data.pharmageo.scores) || [];
  const kols = (data.kols && (data.kols.france || data.kols.spain)) ? (data.kols.france || data.kols.spain) : [];
  const brand = (data.config && data.config.brand) || activeBoard.brand || 'the brand';
  const competitor = (data.config && data.config.competitor) || activeBoard.competitor || 'the competitor';

  if (q.includes('geo') || q.includes('score') || q.includes('ai visibility')) {
    if (scores.length) {
      const avg = Math.round(scores.reduce((a, s) => a + s.overallScore, 0) / scores.length);
      const best = scores.reduce((a, b) => a.overallScore > b.overallScore ? a : b);
      return `**GEO Score Summary for ${brand}:**\n\n• Average: **${avg}/100**\n• Best: **${best.llm}** (${best.overallScore}/100)\n• OpenAI: ${scores[0] ? scores[0].overallScore : 'N/A'}/100\n• Perplexity: ${scores[1] ? scores[1].overallScore : 'N/A'}/100\n• Gemini: ${scores[2] ? scores[2].overallScore : 'N/A'}/100\n\nTop recommendation: Create/enrich the Wikipedia page and implement schema.org/Drug markup to improve AI discoverability.`;
    }
    return `GEO score data is not yet available for this board. Run a board generation to fetch fresh data.`;
  }

  if (q.includes('kol') || q.includes('expert') || q.includes('specialist') || q.includes('physician')) {
    const tier1 = kols.filter(k => k.tier === 1).slice(0, 3);
    if (tier1.length) {
      const names = tier1.map(k => `• **${k.name}** (${k.institution || ''}, score: ${k.score})`).join('\n');
      return `**Top KOLs for ${brand}:**\n\n${names}\n\n${kols.length} total KOLs mapped. ${kols.filter(k => k.tier === 1).length} Tier 1 national leaders.`;
    }
    return `KOL data is not yet loaded. Navigate to the KOL page or run board generation.`;
  }

  if (q.includes('trial') || q.includes('clinical') || q.includes('study') || q.includes('phase')) {
    const trials = (data.treatments && data.treatments.clinical_trials_france) ? data.treatments.clinical_trials_france : [];
    if (trials.length) {
      const active = trials.filter(t => t.status && (t.status.toLowerCase().includes('cours') || t.status.toLowerCase().includes('recrut') || t.status.toLowerCase().includes('active'))).slice(0, 3);
      const list = (active.length ? active : trials.slice(0, 3)).map(t => `• **${t.trial_name || t.title}** — ${t.phase || 'N/A'} (${t.status || ''})`).join('\n');
      return `**Active Clinical Trials:**\n\n${list}\n\nSearch ClinicalTrials.gov for the latest enrollment data.`;
    }
    return `No trial data loaded. Visit the Clinical Trials page or search ClinicalTrials.gov.`;
  }

  if (q.includes('brand') || q.includes('compet') || q.includes('versus') || q.includes('vs') || q.includes('comparaison')) {
    const products = (data.pharmageo && data.pharmageo.agnostic && data.pharmageo.agnostic.products) ? data.pharmageo.agnostic.products.slice(0, 5) : [];
    if (products.length) {
      const list = products.map(p => `• **${p.name}**: SOV ${p.sov}%`).join('\n');
      return `**AI Share of Voice — Top Brands:**\n\n${list}\n\n${brand} has ${data.pharmageo.agnostic.products.find(p => p.name.toLowerCase().includes(brand.toLowerCase())) ? data.pharmageo.agnostic.products.find(p => p.name.toLowerCase().includes(brand.toLowerCase())).sov + '% SOV' : 'low AI visibility'}. Key competitor: **${competitor}**.`;
    }
    return `Brand landscape data is available in the Digital Landscape section. Navigate there for the full competitive map.`;
  }

  if (q.includes('publication') || q.includes('article') || q.includes('paper') || q.includes('journal') || q.includes('study')) {
    const pubs = data.publications || [];
    if (pubs.length) {
      const recent = pubs.slice(0, 3).map(p => `• **${p.title.slice(0, 60)}…** (${p.journal}, ${p.year})`).join('\n');
      return `**Recent Publications:**\n\n${recent}\n\n${pubs.length} publications indexed. Use the Publications page to search OpenAlex for the full literature database.`;
    }
    return `No publications loaded. Visit the Publications page to search OpenAlex.`;
  }

  if (q.includes('bonjour') || q.includes('hello') || q.includes('salut') || q.includes('hi ')) {
    return `Bonjour! Ready to dive into ${brand} intelligence. Ask me about GEO scores, KOLs, clinical trials, or competitive positioning.`;
  }

  if (q.includes('recomm') || q.includes('action') || q.includes('priorit') || q.includes('stratég')) {
    const recs = (data.pharmageo && data.pharmageo.recommendations) ? data.pharmageo.recommendations.slice(0, 3) : [];
    if (recs.length) {
      const list = recs.map(r => `• **[${r.priority}]** ${r.title.slice(0, 80)}`).join('\n');
      return `**Top Strategic Recommendations:**\n\n${list}\n\nAll ${data.pharmageo.recommendations.length} recommendations are in the GEO page.`;
    }
    return `No recommendations available yet. Run a full board generation to generate AI strategic recommendations.`;
  }

  // Default fallback
  return `I can help you analyze **${brand}** intelligence. Try asking about:\n• GEO scores — "What is the GEO score for ${brand}?"\n• KOLs — "Who are the top KOLs?"\n• Trials — "What trials are active?"\n• Brands — "What is the competitive landscape?"\n• Publications — "Show me recent publications"`;
}

/* ═══════════════════════════════════════════════════════════════════
   20. DOMContentLoaded INIT
═══════════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', function () {
  // Board modal close
  const boardModalClose = document.getElementById('boardModalClose');
  if (boardModalClose) {
    boardModalClose.addEventListener('click', () => {
      const modal = document.getElementById('boardModal');
      if (modal) modal.classList.add('hidden');
    });
  }

  // Board wizard prev/next
  const boardWizardNext = document.getElementById('boardWizardNext');
  if (boardWizardNext) boardWizardNext.addEventListener('click', advanceBoardWizard);
  const boardWizardPrev = document.getElementById('boardWizardPrev');
  if (boardWizardPrev) boardWizardPrev.addEventListener('click', retreatBoardWizard);

  // Create board btn
  const createBoardBtn = document.getElementById('createBoardBtn');
  if (createBoardBtn) createBoardBtn.addEventListener('click', openBoardWizard);

  // Publication search
  const pubSearchBtn = document.getElementById('pubSearchBtn');
  if (pubSearchBtn) pubSearchBtn.addEventListener('click', searchPublications);
  const pubInput = document.getElementById('pubSearchInput');
  if (pubInput) pubInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') searchPublications(); });

  // Publication pagination
  const pubPrevBtn = document.getElementById('pubPrevBtn');
  if (pubPrevBtn) pubPrevBtn.addEventListener('click', () => { if (state.pubPage > 1) { state.pubPage--; fetchPublications(); } });
  const pubNextBtn = document.getElementById('pubNextBtn');
  if (pubNextBtn) pubNextBtn.addEventListener('click', () => { state.pubPage++; fetchPublications(); });

  // Publication view toggle
  initPubViewToggle();

  // Trials search
  const trialsSearchBtn = document.getElementById('trialsSearchBtn');
  if (trialsSearchBtn) trialsSearchBtn.addEventListener('click', searchTrials);
  const trialsInput = document.getElementById('trialsSearchInput');
  if (trialsInput) trialsInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') searchTrials(); });

  // Trials pagination
  const trialsPrevBtn = document.getElementById('trialsPrevBtn');
  if (trialsPrevBtn) trialsPrevBtn.addEventListener('click', () => { if (state.trialsPage > 1) { state.trialsPage--; fetchTrials(); } });
  const trialsNextBtn = document.getElementById('trialsNextBtn');
  if (trialsNextBtn) trialsNextBtn.addEventListener('click', () => { state.trialsPage++; fetchTrials(); });

  // GEO search btn on tab
  const geoPageEl = document.getElementById('page-geo');
  if (geoPageEl) {
    // Tab switching
    geoPageEl.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        geoPageEl.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const tabId = btn.getAttribute('data-tab');
        geoPageEl.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));
        const panel = document.getElementById('tab-' + tabId);
        if (panel) panel.classList.remove('hidden');
      });
    });
  }

  // Sources clear memory
  const clearMemoryBtn = document.getElementById('clearMemoryBtn');
  if (clearMemoryBtn) {
    clearMemoryBtn.addEventListener('click', () => {
      state.agenticMemory = [];
      const panel = document.getElementById('memoryPanel');
      if (panel) panel.innerHTML = '<div style="color:var(--text-muted);font-size:13px;padding:12px 0;">Memory cleared.</div>';
      showToast('Agentic memory cleared', 'info');
    });
  }

  // Filter chips (dashboard)
  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const group = chip.closest('.filter-chip-group');
      if (group) group.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
    });
  });

  // Gen overlay close (click outside)
  const genOverlay = document.getElementById('genOverlay');
  if (genOverlay) {
    genOverlay.addEventListener('click', (e) => {
      if (e.target === genOverlay) genOverlay.classList.add('hidden');
    });
  }

  // Board modal click-outside close
  const boardModal = document.getElementById('boardModal');
  if (boardModal) {
    boardModal.addEventListener('click', (e) => {
      if (e.target === boardModal) boardModal.classList.add('hidden');
    });
  }

  // Report wizard overlay click-outside
  const reportWizardOverlay = document.getElementById('reportWizardOverlay');
  if (reportWizardOverlay) {
    reportWizardOverlay.addEventListener('click', (e) => {
      if (e.target === reportWizardOverlay) reportWizardOverlay.style.display = 'none';
    });
  }

  // Init sidebar nav (hash routing)
  initSidebarNav();

  // Init board dropdown
  renderBoardDropdown();

  // Init chat
  initChat();

  // Init board UI
  updateBoardUI();

  // Default to home page
  const hash = window.location.hash.replace('#', '');
  navigateTo(PAGE_NAMES[hash] ? hash : 'home');
});
