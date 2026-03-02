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
    // Call API — use pathology/therapeutic_area for topic search (not brand name)
    const cfg = data.config || {};
    const query = cfg.pathology || cfg.therapeutic_area || activeBoard.indication || activeBoard.area || 'cutaneous lymphoma';
    const country = cfg.market || activeBoard.geo || 'France';
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
