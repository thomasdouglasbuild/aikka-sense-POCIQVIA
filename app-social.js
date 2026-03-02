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
