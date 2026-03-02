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
