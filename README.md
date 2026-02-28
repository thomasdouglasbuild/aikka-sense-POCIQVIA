# Aikka Sense — Pharma Intelligence Platform

Cross-source aggregation dashboard for pharmaceutical market intelligence. Built for medical affairs, MSL teams, and brand strategy.

## Features

- **Dashboard** — KPI overview with trend visualization
- **GEO & SEO** — PharmaGEO integration for AI visibility scoring
- **Publications** — Live OpenAlex search across 250M+ scholarly works
- **KOL & Rising Stars** — Key Opinion Leader identification and tracking
- **Clinical Trials** — Real-time ClinicalTrials.gov integration (15+ filters)
- **Social Intelligence** — VisiBrain social media monitoring (19 topic streams)
- **Digital Landscape** — Web presence and competitive analysis
- **Sources & Configuration** — API connections and data source management
- **Reports & Planning** — Schedule and export intelligence reports
- **Board Management** — Create new monitoring boards with 7-step wizard
- **Aikka Copilot** — Conversational AI agent for data exploration

## Architecture

```
├── index.html              # Main application (SPA)
├── style.css               # Figma-accurate design system (DM Sans)
├── app.js                  # Application logic + Copilot chat agent
├── data.js                 # Static curated pharma data
├── visibrain_topics.json   # VisiBrain monitoring topics config
├── cgi-bin/
│   └── api.py              # Backend API (OpenAlex, ClinicalTrials.gov, PharmaGEO)
├── aikka-icon.svg          # Brand icon (SVG)
├── aikka-logo.svg          # Brand logo (SVG)
├── aikka-icon.jpg          # Brand icon (JPG fallback)
├── aikka-logo.jpg          # Brand logo (JPG fallback)
├── bg-pattern-1.jpg        # Background pattern
└── bg-pattern-2.jpg        # Background pattern
```

## Live APIs

| Source | Status | Endpoint |
|--------|--------|----------|
| OpenAlex | ✅ Live | `api.openalex.org` |
| ClinicalTrials.gov | ✅ Live | `clinicaltrials.gov/api/v2` |
| PharmaGEO | ✅ Live | `api.aikka-pharma.com` |
| VisiBrain | 🔧 Config | Browser-based monitoring |

## Design System

- **Font**: DM Sans (Google Fonts)
- **Sidebar**: White `#FFFFFF`
- **Background**: `#F2F7FF`
- **Cards**: White, `12px` border-radius
- **Accent colors**: Cyan `#00E1FF`, Blue `#2600FF`, Pink `#FFABE9`
- **Text**: `#111111` headings, `#374151` body, `#6B7280` secondary

## Deployment

Static site deployed to S3 with CGI-bin backend. The `__CGI_BIN__` placeholder in client code is replaced at deploy time.

## Brand

**Aikka** — AI-powered pharmaceutical intelligence.

---

© 2026 Aikka. All rights reserved.
