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