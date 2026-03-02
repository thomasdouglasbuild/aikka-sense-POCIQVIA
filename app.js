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