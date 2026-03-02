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
        <span class="gen-step-detail" id="gen-step-detail-${s.id}" style="font-size:11px;color:var(--text-muted);margin-left:8px;"></span>
      </div>
    `).join('');
  }

  let cancelled = false;
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

  function setStepDetail(id, text) {
    const el = document.getElementById('gen-step-detail-' + id);
    if (el) el.textContent = text;
  }

  function setProgress(pct) {
    if (progressFill) progressFill.style.width = pct + '%';
    if (progressPct) progressPct.textContent = pct + '%';
  }

  // Helper: call backend API
  async function apiCall(action, params = {}, body = null) {
    let url = `${CGI_BIN}/api.py?action=${action}`;
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') url += `&${encodeURIComponent(k)}=${encodeURIComponent(v)}`;
    }
    const opts = {};
    if (body) {
      opts.method = 'POST';
      opts.headers = { 'Content-Type': 'application/json' };
      opts.body = JSON.stringify(body);
    }
    const resp = await fetch(url, opts);
    return resp.json();
  }

  // Helper: derive board's language code and market name from geography
  function boardGeoInfo() {
    const geo = (board.geo || '').toLowerCase();
    const LANG_MAP = { spain: 'es', france: 'fr', germany: 'de', italy: 'it', uk: 'en', 'united kingdom': 'en', 'united states': 'en', usa: 'en' };
    const MARKET_MAP = { spain: 'Spain', france: 'France', germany: 'Germany', italy: 'Italy', uk: 'United Kingdom', 'united kingdom': 'United Kingdom', 'united states': 'United States', usa: 'United States' };
    const CC_MAP = { spain: 'ES', france: 'FR', germany: 'DE', italy: 'IT', uk: 'GB', 'united kingdom': 'GB', 'united states': 'US', usa: 'US' };
    return {
      lang: LANG_MAP[geo] || 'en',
      market: MARKET_MAP[geo] || board.geo || 'Global',
      cc: CC_MAP[geo] || (geo.length === 2 ? geo.toUpperCase() : 'US'),
    };
  }

  // Helper: poll for PharmaGEO report completion
  async function pollPharmaGEOReport(reportId, type, maxWaitMs = 120000) {
    const action = type === 'agnostic' ? 'pharmageo_agnostic_report' : 'pharmageo_brand_report';
    const start = Date.now();
    while (Date.now() - start < maxWaitMs) {
      const report = await apiCall(action, { report_id: reportId });
      if (report.status === 'done') return report;
      if (report.status === 'error') return report;
      await new Promise(r => setTimeout(r, 5000)); // poll every 5s
    }
    return { status: 'timeout', error: 'Report generation timed out after ' + (maxWaitMs / 1000) + 's' };
  }

  // ----- STEP EXECUTORS (REAL API CALLS) -----

  async function stepGeo() {
    const { lang, market } = boardGeoInfo();
    const indication = board.indication || board.area || board.brand;
    setStepDetail('geo', `Searching PharmaGEO for "${indication}" in ${market}...`);

    // 1. Check if an existing agnostic report matches this indication + market
    const settings = await apiCall('pharmageo_agnostic_settings');
    let existingReportId = null;
    if (Array.isArray(settings)) {
      const match = settings.find(s => {
        const sPath = (s.pathology || '').toLowerCase();
        const bIndic = indication.toLowerCase();
        const sMarket = (s.market || '').toLowerCase();
        const bMarket = market.toLowerCase();
        return (sPath.includes(bIndic) || bIndic.includes(sPath)) && (sMarket.includes(bMarket) || bMarket.includes(sMarket));
      });
      if (match) {
        setStepDetail('geo', `Found existing agnostic report setting: ${match.pathology} (${match.market})`);
        // Get the recurring report to find the latest report ID
        const recurring = await apiCall('pharmageo_agnostic_list');
        const recData = (recurring.data || recurring || []);
        if (Array.isArray(recData)) {
          const rec = recData.find(r => r.id === match.recurringAgnosticReportId);
          if (rec && rec.lastReport) existingReportId = rec.lastReport.id;
        }
      }
    }

    let geoReport = null;
    if (existingReportId) {
      setStepDetail('geo', `Fetching existing report ${existingReportId.slice(0, 8)}...`);
      geoReport = await apiCall('pharmageo_agnostic_report', { report_id: existingReportId });
    } else {
      // Launch new agnostic report
      setStepDetail('geo', `No existing report found. Launching new agnostic report...`);
      const brandName = board.brand || indication;
      const createResult = await apiCall('pharmageo_agnostic_create', {}, {
        pathology: indication,
        market: market,
        languages: [lang],
        llms: ['OpenAI', 'Perplexity', 'Gemini'],
        trackedProducts: brandName !== indication ? [brandName] : [],
      });
      if (createResult && createResult.id) {
        setStepDetail('geo', `Report launched (${createResult.id.slice(0, 8)}). Waiting for completion...`);
        geoReport = await pollPharmaGEOReport(createResult.id, 'agnostic');
      } else {
        setStepDetail('geo', `API returned: ${JSON.stringify(createResult).slice(0, 120)}`);
      }
    }

    // Parse the GEO report into board data
    if (!board.generatedData) board.generatedData = {};
    if (geoReport && geoReport.status === 'done' && geoReport.overview) {
      const ov = geoReport.overview;
      board.generatedData.pharmageoReportId = geoReport.id;
      board.generatedData.pharmageoReport = geoReport;
      board.generatedData.geoScores = (geoReport.content && geoReport.content.llms ? geoReport.content.llms : ['OpenAI', 'Perplexity', 'Gemini']).map(llm => {
        // Extract per-LLM metrics from answers
        const llmAnswers = (geoReport.answers || []).filter(a => a.llmName === llm);
        const avgReliability = llmAnswers.length ? Math.round(llmAnswers.reduce((s, a) => s + (a.reliability || 0), 0) / llmAnswers.length) : ov.overallReliability || 50;
        return {
          llm: llm,
          overallScore: ov.overallReliability || 50,
          reliability: avgReliability,
          sentiment: 'neutral',
          aiVisibility: ov.groundingRate ? Math.round(ov.groundingRate * 100) : 60,
          answersCollected: llmAnswers.length,
        };
      });
      board.geoScore = ov.overallReliability || Math.round(board.generatedData.geoScores.reduce((a, s) => a + s.overallScore, 0) / board.generatedData.geoScores.length);
      // Extract top products detected by GEO
      if (ov.topProducts) board.generatedData.geoTopProducts = ov.topProducts;
      if (geoReport.entities) board.generatedData.geoEntities = geoReport.entities;
      if (geoReport.questions) board.generatedData.geoQuestions = geoReport.questions;
      if (geoReport.sources) board.generatedData.geoSources = geoReport.sources;
      if (geoReport.metrics) board.generatedData.geoMetrics = geoReport.metrics;
      setStepDetail('geo', `Score: ${board.geoScore} | ${ov.productsDetected || 0} products | ${ov.questionsGenerated || 0} questions`);
    } else {
      // Fallback: minimal data if API didn't return a complete report
      board.generatedData.geoScores = [
        { llm: 'OpenAI', overallScore: 0, reliability: 0, sentiment: 'pending', aiVisibility: 0 },
        { llm: 'Perplexity', overallScore: 0, reliability: 0, sentiment: 'pending', aiVisibility: 0 },
        { llm: 'Gemini', overallScore: 0, reliability: 0, sentiment: 'pending', aiVisibility: 0 }
      ];
      board.geoScore = 0;
      setStepDetail('geo', geoReport ? `Report status: ${geoReport.status || 'unknown'}` : 'No report data returned');
    }
  }

  async function stepPubs() {
    const query = board.indication || board.area || board.brand;
    setStepDetail('pubs', `Searching OpenAlex for "${query}"...`);
    const data = await apiCall('search_openalex', { query: query, per_page: 25 });
    if (!board.generatedData) board.generatedData = {};
    board.generatedData.publications = data.results || [];
    board.publications = data.total || data.meta?.count || (data.results || []).length;
    setStepDetail('pubs', `${board.publications} publications found`);
  }

  async function stepTrials() {
    const query = board.indication || board.area || board.brand;
    setStepDetail('trials', `Searching ClinicalTrials.gov for "${query}"...`);
    const data = await apiCall('search_trials', { query: query, page_size: 20 });
    if (!board.generatedData) board.generatedData = {};
    board.generatedData.trials = data.results || data.studies || [];
    board.trials = data.totalCount || (data.results || data.studies || []).length;
    setStepDetail('trials', `${board.trials} trials found`);
  }

  async function stepKol() {
    const query = board.indication || board.area;
    const { cc } = boardGeoInfo();
    setStepDetail('kol', `Finding rising stars for "${query}" in ${cc}...`);
    const data = await apiCall('kol_rising_stars', { query: query, country: cc });
    if (!board.generatedData) board.generatedData = {};
    board.generatedData.kols = data.results || [];
    board.kols = (data.results || []).length;
    setStepDetail('kol', `${board.kols} KOLs identified`);
  }

  async function stepBrands() {
    const area = board.area || board.indication;
    const { market } = boardGeoInfo();
    setStepDetail('brands', `Detecting brands in "${area}" for ${market}...`);
    const data = await apiCall('detect_brands', { area: area, country: market });
    if (!board.generatedData) board.generatedData = {};
    board.generatedData.brands = data.brands || board.brands || [];
    // Also try to get brand data from GEO entities if available
    if (board.generatedData.geoEntities && board.generatedData.geoEntities.length > 0) {
      const geoProducts = board.generatedData.geoEntities
        .filter(e => e.entityType === 'PRODUCT')
        .map(e => ({ name: e.canonicalName, generic: '', class: 'GEO-detected', manufacturer: '', source: 'pharmageo' }));
      // Merge: keep local brands, add GEO-detected ones that aren't already present
      const existingNames = new Set((board.generatedData.brands || []).map(b => (b.name || '').toLowerCase()));
      for (const gp of geoProducts) {
        if (!existingNames.has(gp.name.toLowerCase())) {
          board.generatedData.brands.push(gp);
        }
      }
    }
    setStepDetail('brands', `${(board.generatedData.brands || []).length} brands identified`);
  }

  async function stepSocial() {
    const query = board.brand || board.indication || board.area;
    const { market } = boardGeoInfo();
    setStepDetail('social', `Screening social presence for "${query}"...`);
    const data = await apiCall('social_screen', { query: query, country: market });
    if (!board.generatedData) board.generatedData = {};
    board.generatedData.socialData = data;
    board.generatedData.socialScore = data.overall_social_score || 50;
    setStepDetail('social', `Social score: ${board.generatedData.socialScore} (${data.source || 'simulated'})`);
  }

  async function stepReport() {
    setStepDetail('report', 'Compiling all intelligence sources...');
    if (!board.generatedData) board.generatedData = {};
    // Generate summary stats
    board.generatedData.summary = {
      geoScore: board.geoScore || 0,
      publications: board.publications || 0,
      trials: board.trials || 0,
      kols: board.kols || 0,
      brands: (board.generatedData.brands || []).length,
      socialScore: board.generatedData.socialScore || 0,
      generatedAt: new Date().toISOString(),
      dataSources: {
        pharmageo: !!board.generatedData.pharmageoReportId,
        openalex: (board.generatedData.publications || []).length > 0,
        clinicaltrials: (board.generatedData.trials || []).length > 0,
        kol_discovery: (board.generatedData.kols || []).length > 0,
      }
    };
    setStepDetail('report', 'Report compiled successfully');
  }

  // Map step IDs to executor functions
  const STEP_EXECUTORS = {
    geo: stepGeo,
    pubs: stepPubs,
    trials: stepTrials,
    kol: stepKol,
    brands: stepBrands,
    social: stepSocial,
    report: stepReport,
  };

  async function runStep(stepIdx) {
    if (cancelled) return;
    if (stepIdx >= GEN_STEPS.length) {
      setProgress(100);
      if (!board.generatedData) board.generatedData = {};
      board.status = 'active';
      board.lastUpdated = new Date().toISOString().slice(0, 10);
      if (resultsEl) {
        const srcCount = Object.values(board.generatedData.summary?.dataSources || {}).filter(Boolean).length;
        resultsEl.classList.remove('hidden');
        resultsEl.innerHTML = `
          <div style="text-align:center;padding:16px 0;">
            <div style="font-size:20px;margin-bottom:8px;">✅ Board Ready!</div>
            <div style="font-size:13px;color:var(--text-muted);margin-bottom:8px;">All intelligence sources compiled for ${escHtml(board.name)}</div>
            <div style="font-size:12px;color:var(--text-muted);margin-bottom:16px;">
              GEO Score: ${board.geoScore || '—'} · ${board.publications || 0} publications · ${board.trials || 0} trials · ${board.kols || 0} KOLs · ${(board.generatedData.brands || []).length} brands · ${srcCount} live data sources
            </div>
            <div style="display:flex;gap:8px;justify-content:center;">
              <button class="btn btn-primary" id="genLaunchBtn">Launch Board</button>
              <button class="btn btn-ghost" id="genExportBtn">Export Data</button>
            </div>
          </div>`;
        document.getElementById('genLaunchBtn') && document.getElementById('genLaunchBtn').addEventListener('click', () => {
          overlay.classList.add('hidden');
          activeBoard = board;
          updateBoardUI();
          state.pubResults = board.generatedData.publications || [];
          state.trialsResults = board.generatedData.trials || [];
          navigateTo('dashboard');
        });
        document.getElementById('genExportBtn') && document.getElementById('genExportBtn').addEventListener('click', () => {
          // Export board data as JSON
          const blob = new Blob([JSON.stringify(board.generatedData, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = `aikka-board-${board.id}.json`; a.click();
          URL.revokeObjectURL(url);
          showToast('Board data exported', 'success');
        });
      }
      return;
    }

    const step = GEN_STEPS[stepIdx];
    setStepStatus(step.id, 'running');
    setProgress(Math.round((stepIdx / GEN_STEPS.length) * 100));

    try {
      const executor = STEP_EXECUTORS[step.id];
      if (executor) {
        await executor();
      }
      if (cancelled) return;
      setStepStatus(step.id, 'done');
    } catch (err) {
      console.error(`Board generation step ${step.id} failed:`, err);
      setStepStatus(step.id, 'error');
      setStepDetail(step.id, `Error: ${err.message || 'Unknown error'}`);
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

