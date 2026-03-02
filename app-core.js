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
        // Clear cached data so board-specific data loads fresh
        state.pubResults = [];
        state.trialsResults = [];
        state.risingStars = [];
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
      // If board already has generated publications, use them
      if (activeBoard.generatedData && activeBoard.generatedData.publications && activeBoard.generatedData.publications.length > 0 && !state.pubResults.length) {
        state.pubResults = activeBoard.generatedData.publications;
        state.pubTotal = activeBoard.publications || state.pubResults.length;
        renderPubResults();
        renderPubChart();
        renderPubAuthorsChart();
      } else if (!state.pubResults.length) {
        const data = getActiveBoardData();
        const brand = (data.config && data.config.brand) ? data.config.brand : (activeBoard.indication || activeBoard.brand || 'cutaneous lymphoma');
        const input = document.getElementById('pubSearchInput');
        if (input && !input.value) input.value = brand;
        searchPublications();
      }
      break;
    case 'kol':
      renderPersonas();
      // Pre-populate KOL table from board generated data if available
      if (activeBoard.generatedData && activeBoard.generatedData.kols && activeBoard.generatedData.kols.length > 0) {
        state.risingStars = activeBoard.generatedData.kols;
      }
      renderKOLTable();
      renderKOLTimeline();
      loadRisingStars();
      initKOLNetwork();
      break;
    case 'trials':
      // If board already has generated trials, use them
      if (activeBoard.generatedData && activeBoard.generatedData.trials && activeBoard.generatedData.trials.length > 0 && !state.trialsResults.length) {
        state.trialsResults = activeBoard.generatedData.trials;
        state.trialsTotal = activeBoard.trials || state.trialsResults.length;
        renderTrialsResults();
      } else if (!state.trialsResults.length) {
        const data2 = getActiveBoardData();
        const brand2 = (data2.config && data2.config.pathology) ? data2.config.pathology : (activeBoard.indication || activeBoard.brand || 'cutaneous lymphoma');
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
