#!/usr/bin/env python3
"""
Aikka Sense — Backend API (CGI-bin)
Routes:
  GET  /api.py?action=search_openalex&query=...&page=1
  GET  /api.py?action=search_trials&query=...&page=1
  GET  /api.py?action=pharmageo_scores&brand_id=...
  GET  /api.py?action=pharmageo_brands
  POST /api.py?action=pharmageo_launch  (body: {title, language, llms, format})
  GET  /api.py?action=pharmageo_login
  GET  /api.py?action=openalex_author&author_id=...
  GET  /api.py?action=aggregate_score&brand=...&competitor=...
  GET  /api.py?action=kol_rising_stars&query=...&country=...
  GET  /api.py?action=visibrain_topics
  POST /api.py?action=ai_chat  (body: {message, context})
"""

import json, os, sys, urllib.request, urllib.parse, urllib.error, ssl, hashlib, time
from pathlib import Path

# ---- Config ----
PHARMAGEO_BASE = "https://api.aikka-pharma.com"
PHARMAGEO_EMAIL = "contact@thomasdouglas.fr"
PHARMAGEO_PASS = "HariboHope618*"
OPENALEX_BASE = "https://api.openalex.org"
TRIALS_BASE = "https://clinicaltrials.gov/api/v2"
OPENALEX_EMAIL = "contact@thomasdouglas.fr"  # polite pool

TOKEN_FILE = Path("pharmageo_token.json")

# SSL context for API calls
ctx = ssl.create_default_context()

def http_request(url, method="GET", data=None, headers=None, timeout=30):
    """Simple HTTP request helper."""
    if headers is None:
        headers = {}
    if data and isinstance(data, dict):
        data = json.dumps(data).encode("utf-8")
        headers.setdefault("Content-Type", "application/json")
    elif data and isinstance(data, str):
        data = data.encode("utf-8")
    
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout, context=ctx) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        return {"error": f"HTTP {e.code}", "detail": body[:500]}
    except Exception as e:
        return {"error": str(e)}

# ---- PharmaGEO Auth ----
def get_pharmageo_token():
    """Get or refresh PharmaGEO JWT token."""
    if TOKEN_FILE.exists():
        cached = json.loads(TOKEN_FILE.read_text())
        # Token valid for ~7 days, refresh after 6
        if time.time() - cached.get("ts", 0) < 6 * 86400:
            return cached["token"]
    
    result = http_request(
        f"{PHARMAGEO_BASE}/auth/login",
        method="POST",
        data={"email": PHARMAGEO_EMAIL, "password": PHARMAGEO_PASS}
    )
    token = result.get("access_token", "")
    if token:
        TOKEN_FILE.write_text(json.dumps({"token": token, "ts": time.time()}))
    return token

def pharmageo_get(endpoint, token=None):
    if not token:
        token = get_pharmageo_token()
    return http_request(
        f"{PHARMAGEO_BASE}{endpoint}",
        headers={"Authorization": f"Bearer {token}"}
    )

# ---- OpenAlex ----
def search_openalex(query, page=1, per_page=25):
    """Search OpenAlex for publications."""
    params = urllib.parse.urlencode({
        "search": query,
        "page": page,
        "per_page": per_page,
        "mailto": OPENALEX_EMAIL,
    })
    data = http_request(f"{OPENALEX_BASE}/works?{params}")
    if "error" in data:
        return data
    
    results = []
    for w in data.get("results", []):
        # Extract author info
        authors = []
        for a in w.get("authorships", [])[:6]:
            auth = a.get("author", {})
            inst = a.get("institutions", [{}])
            authors.append({
                "name": auth.get("display_name", ""),
                "openalex_id": auth.get("id", ""),
                "institution": inst[0].get("display_name", "") if inst else "",
                "country": inst[0].get("country_code", "") if inst else "",
            })
        
        results.append({
            "id": w.get("id", ""),
            "title": w.get("title", ""),
            "year": w.get("publication_year"),
            "journal": w.get("primary_location", {}).get("source", {}).get("display_name", "") if w.get("primary_location") else "",
            "doi": w.get("doi", ""),
            "cited_by_count": w.get("cited_by_count", 0),
            "type": w.get("type", ""),
            "open_access": w.get("open_access", {}).get("is_oa", False),
            "authors": authors,
            "concepts": [c.get("display_name", "") for c in w.get("concepts", [])[:5]],
        })
    
    return {
        "total": data.get("meta", {}).get("count", 0),
        "page": page,
        "per_page": per_page,
        "results": results,
        "meta": {"count": data.get("meta", {}).get("count", 0), "per_page": per_page},
    }

def get_openalex_author(author_id):
    """Get author details from OpenAlex."""
    url = author_id if author_id.startswith("http") else f"{OPENALEX_BASE}/authors/{author_id}"
    params = urllib.parse.urlencode({"mailto": OPENALEX_EMAIL})
    data = http_request(f"{url}?{params}")
    if "error" in data:
        return data
    
    return {
        "id": data.get("id", ""),
        "name": data.get("display_name", ""),
        "works_count": data.get("works_count", 0),
        "cited_by_count": data.get("cited_by_count", 0),
        "h_index": data.get("summary_stats", {}).get("h_index", 0),
        "i10_index": data.get("summary_stats", {}).get("i10_index", 0),
        "2yr_mean_citedness": data.get("summary_stats", {}).get("2yr_mean_citedness", 0),
        "institution": data.get("last_known_institutions", [{}])[0].get("display_name", "") if data.get("last_known_institutions") else "",
        "country": data.get("last_known_institutions", [{}])[0].get("country_code", "") if data.get("last_known_institutions") else "",
        "topics": [t.get("display_name", "") for t in data.get("topics", [])[:10]],
        "works_api_url": data.get("works_api_url", ""),
    }

# ---- ClinicalTrials.gov ----
def search_trials(query, page_size=20, page_token=None):
    """Search ClinicalTrials.gov."""
    params = {
        "query.term": query,
        "pageSize": page_size,
        "format": "json",
    }
    if page_token:
        params["pageToken"] = page_token
    
    url = f"{TRIALS_BASE}/studies?{urllib.parse.urlencode(params)}"
    data = http_request(url)
    if "error" in data:
        return data
    
    results = []
    for s in data.get("studies", []):
        prot = s.get("protocolSection", {})
        ident = prot.get("identificationModule", {})
        status = prot.get("statusModule", {})
        design = prot.get("designModule", {})
        desc = prot.get("descriptionModule", {})
        
        results.append({
            "nct_id": ident.get("nctId", ""),
            "title": ident.get("officialTitle", ident.get("briefTitle", "")),
            "status": status.get("overallStatus", ""),
            "phase": ", ".join(design.get("phases", [])) if design.get("phases") else "N/A",
            "start_date": status.get("startDateStruct", {}).get("date", ""),
            "completion_date": status.get("completionDateStruct", {}).get("date", ""),
            "brief_summary": desc.get("briefSummary", "")[:300],
            "conditions": prot.get("conditionsModule", {}).get("conditions", []),
            "interventions": [
                i.get("name", "") for i in 
                prot.get("armsInterventionsModule", {}).get("interventions", [])
            ],
        })
    
    return {
        "nextPageToken": data.get("nextPageToken"),
        "totalCount": data.get("totalCount", len(results)),
        "studies": results,
        "results": results,
    }

# ---- Rising Stars Detection ----
def find_rising_stars(query, country=None):
    """Find rising stars: authors with rapid citation growth, recent publications, moderate h-index."""
    params = {
        "search": query,
        "per_page": 50,
        "mailto": OPENALEX_EMAIL,
    }
    if country:
        params["filter"] = f"last_known_institutions.country_code:{country}"
    
    url = f"{OPENALEX_BASE}/authors?{urllib.parse.urlencode(params)}"
    data = http_request(url)
    if "error" in data:
        return data
    
    stars = []
    for a in data.get("results", []):
        h_index = a.get("summary_stats", {}).get("h_index", 0)
        works = a.get("works_count", 0)
        cited = a.get("cited_by_count", 0)
        yr_mean = a.get("summary_stats", {}).get("2yr_mean_citedness", 0)
        
        # Count recent works (last 3 years) from counts_by_year
        recent_works = sum(
            y.get("works_count", 0) 
            for y in a.get("counts_by_year", []) 
            if y.get("year", 0) >= 2024
        )
        recent_cited = sum(
            y.get("cited_by_count", 0) 
            for y in a.get("counts_by_year", []) 
            if y.get("year", 0) >= 2024
        )
        
        # Rising star score: high recent activity + moderate overall h-index
        # (not already a mega-KOL but growing fast)
        if works < 3:
            continue
            
        recency_score = min(recent_works * 10, 40)  # max 40 pts for recent publications
        citation_velocity = min(recent_cited / max(works, 1) * 5, 30)  # max 30 pts
        h_factor = min(h_index * 2, 20) if h_index < 30 else max(20 - (h_index - 30), 5)  # sweet spot 10-30
        diversity_score = min(yr_mean * 3, 10)  # 2yr citedness
        
        total_score = round(recency_score + citation_velocity + h_factor + diversity_score)
        
        inst_list = a.get("last_known_institutions", [])
        
        stars.append({
            "name": a.get("display_name", ""),
            "openalex_id": a.get("id", ""),
            "h_index": h_index,
            "works_count": works,
            "cited_by_count": cited,
            "recent_works_3yr": recent_works,
            "recent_citations_3yr": recent_cited,
            "2yr_citedness": round(yr_mean, 2),
            "institution": inst_list[0].get("display_name", "") if inst_list else "",
            "country": inst_list[0].get("country_code", "") if inst_list else "",
            "rising_star_score": total_score,
            "topics": [t.get("display_name", "") for t in a.get("topics", [])[:5]],
            "signal": "Rising Star" if h_index < 30 and recent_works >= 3 else 
                      "Established Expert" if h_index >= 30 else "Emerging",
        })
    
    # Sort by rising star score
    stars.sort(key=lambda x: x["rising_star_score"], reverse=True)
    return {"results": stars[:30]}

# ---- Aggregate Score ----
def compute_aggregate_score(brand_id=None, brand_name=None, competitor_name=None):
    """Compute cross-source aggregate score for a brand vs competitor."""
    token = get_pharmageo_token()
    
    scores = {"brand": {}, "competitor": {}}
    
    # 1. PharmaGEO scores for brand
    if brand_id:
        brand_data = pharmageo_get(f"/brands/{brand_id}", token)
        if not brand_data.get("error"):
            geo_scores = brand_data.get("data", {}).get("scores", [])
            if geo_scores:
                avg_geo = sum(s.get("overallScore", 0) for s in geo_scores) / len(geo_scores)
                avg_rel = sum(s.get("reliability", 0) for s in geo_scores) / len(geo_scores)
                avg_vis = sum(s.get("aiVisibility", 0) for s in geo_scores) / len(geo_scores)
                scores["brand"]["geo_score"] = round(avg_geo)
                scores["brand"]["reliability"] = round(avg_rel)
                scores["brand"]["ai_visibility"] = round(avg_vis)
                scores["brand"]["geo_detail"] = geo_scores
    
    # 2. OpenAlex publication count for brand
    if brand_name:
        pub_data = search_openalex(brand_name, per_page=1)
        scores["brand"]["publication_count"] = pub_data.get("total", 0)
        
        if competitor_name:
            comp_pub = search_openalex(competitor_name, per_page=1)
            scores["competitor"]["publication_count"] = comp_pub.get("total", 0)
    
    # 3. ClinicalTrials count
    if brand_name:
        trial_data = search_trials(brand_name, page_size=1)
        scores["brand"]["trial_count"] = len(trial_data.get("results", []))
        
        if competitor_name:
            comp_trial = search_trials(competitor_name, page_size=1)
            scores["competitor"]["trial_count"] = len(comp_trial.get("results", []))
    
    # 4. Compute aggregate
    brand_s = scores["brand"]
    geo = brand_s.get("geo_score", 50)
    pubs = min(brand_s.get("publication_count", 0) / 10, 100)  # normalize
    
    aggregate = round(geo * 0.4 + brand_s.get("reliability", 50) * 0.2 + 
                      brand_s.get("ai_visibility", 50) * 0.2 + pubs * 0.2)
    
    scores["brand"]["aggregate_score"] = aggregate
    
    # Competitor aggregate if available
    if competitor_name and scores["competitor"]:
        comp_pubs = min(scores["competitor"].get("publication_count", 0) / 10, 100)
        scores["competitor"]["aggregate_score"] = round(comp_pubs * 0.5 + 50 * 0.5)  # partial without GEO
    
    return scores

# ---- Brand Detection ----
BRAND_KNOWLEDGE = {
    "cardiology": {
        "es": [
            {"name": "Entresto", "generic": "sacubitril/valsartan", "class": "ARNI", "manufacturer": "Novartis"},
            {"name": "Forxiga", "generic": "dapagliflozin", "class": "SGLT2 Inhibitor", "manufacturer": "AstraZeneca"},
            {"name": "Jardiance", "generic": "empagliflozin", "class": "SGLT2 Inhibitor", "manufacturer": "Boehringer Ingelheim / Eli Lilly"},
            {"name": "Kerendia", "generic": "finerenone", "class": "nsMRA", "manufacturer": "Bayer"},
            {"name": "Verquvo", "generic": "vericiguat", "class": "sGC Stimulator", "manufacturer": "Bayer"},
            {"name": "Inspra", "generic": "eplerenone", "class": "MRA", "manufacturer": "Multiple generics"},
            {"name": "Procoralan", "generic": "ivabradine", "class": "If-Channel Inhibitor", "manufacturer": "Servier"},
            {"name": "Ferinject", "generic": "ferric carboxymaltose", "class": "IV Iron", "manufacturer": "CSL Vifor"},
            {"name": "Simdax", "generic": "levosimendan", "class": "Inodilator", "manufacturer": "Orion Pharma"},
            {"name": "Veltassa", "generic": "patiromer", "class": "Potassium Binder", "manufacturer": "Vifor Pharma"},
            {"name": "Lokelma", "generic": "sodium zirconium cyclosilicate", "class": "Potassium Binder", "manufacturer": "AstraZeneca"},
            {"name": "Bisoprolol", "generic": "bisoprolol", "class": "Beta-Blocker", "manufacturer": "Multiple generics"},
            {"name": "Carvedilol", "generic": "carvedilol", "class": "Beta-Blocker", "manufacturer": "Multiple generics"},
            {"name": "Ramipril", "generic": "ramipril", "class": "ACE Inhibitor", "manufacturer": "Multiple generics"},
            {"name": "Enalapril", "generic": "enalapril", "class": "ACE Inhibitor", "manufacturer": "Multiple generics"},
            {"name": "Candesartan", "generic": "candesartan", "class": "ARB", "manufacturer": "Multiple generics"},
            {"name": "Spironolactone", "generic": "spironolactone", "class": "MRA", "manufacturer": "Multiple generics"},
            {"name": "Furosemide", "generic": "furosemide", "class": "Loop Diuretic", "manufacturer": "Multiple generics"},
            {"name": "Torasemide", "generic": "torasemide", "class": "Loop Diuretic", "manufacturer": "Multiple generics"},
        ],
        "fr": [
            {"name": "Entresto", "generic": "sacubitril/valsartan", "class": "ARNI", "manufacturer": "Novartis"},
            {"name": "Forxiga", "generic": "dapagliflozin", "class": "SGLT2 Inhibitor", "manufacturer": "AstraZeneca"},
            {"name": "Jardiance", "generic": "empagliflozin", "class": "SGLT2 Inhibitor", "manufacturer": "Boehringer Ingelheim / Eli Lilly"},
            {"name": "Kerendia", "generic": "finerenone", "class": "nsMRA", "manufacturer": "Bayer"},
            {"name": "Verquvo", "generic": "vericiguat", "class": "sGC Stimulator", "manufacturer": "Bayer"},
            {"name": "Inspra", "generic": "éplérénone", "class": "ARM", "manufacturer": "Multiple génériques"},
            {"name": "Procoralan", "generic": "ivabradine", "class": "Inhibiteur If", "manufacturer": "Servier"},
            {"name": "Ferinject", "generic": "carboxymaltose ferrique", "class": "Fer IV", "manufacturer": "CSL Vifor"},
        ],
    },
    "oncology": {
        "fr": [
            {"name": "Ledaga", "generic": "chlormethine", "class": "Alkylant topique", "manufacturer": "Recordati"},
            {"name": "Poteligeo", "generic": "mogamulizumab", "class": "Anticorps anti-CCR4", "manufacturer": "Kyowa Kirin"},
            {"name": "Adcetris", "generic": "brentuximab vedotin", "class": "ADC anti-CD30", "manufacturer": "Takeda"},
            {"name": "Targretin", "generic": "bexarotene", "class": "Rétinoïde RXR", "manufacturer": "Eisai"},
        ],
        "es": [
            {"name": "Ledaga", "generic": "clormetina", "class": "Alquilante tópico", "manufacturer": "Recordati"},
            {"name": "Poteligeo", "generic": "mogamulizumab", "class": "Anticuerpo anti-CCR4", "manufacturer": "Kyowa Kirin"},
        ],
    },
}


def detect_brands(area, country):
    """Return auto-detected brands for a therapeutic area + country.
    Falls back to OpenAlex-sourced drug discovery if no local knowledge found.
    """
    area_key = area.lower().replace(" ", "_")
    country_lower = country.lower()

    # Map country name to 2-letter code if needed
    COUNTRY_MAP = {
        "spain": "es", "españa": "es", "es": "es",
        "france": "fr", "fr": "fr",
        "germany": "de", "de": "de",
        "italy": "it", "it": "it",
        "uk": "gb", "united kingdom": "gb", "gb": "gb",
        "us": "us", "usa": "us", "united states": "us",
    }
    cc = COUNTRY_MAP.get(country_lower, country_lower[:2])

    # Fuzzy area match
    matched_area = None
    for kb_area in BRAND_KNOWLEDGE:
        if kb_area in area_key or area_key in kb_area:
            matched_area = kb_area
            break
        # Extra aliases
        aliases = {
            "cardiology": ["cardio", "heart failure", "hf", "insuficiencia", "insuffisance"],
            "oncology": ["onco", "lymphoma", "ctcl", "cancer", "tumour", "tumor"],
        }
        for kb_area2, alts in aliases.items():
            if any(a in area_key for a in alts):
                matched_area = kb_area2
                break
        if matched_area:
            break

    if matched_area and matched_area in BRAND_KNOWLEDGE:
        country_brands = BRAND_KNOWLEDGE[matched_area].get(cc)
        if not country_brands:
            # Fallback to first available country list in that area
            country_brands = next(iter(BRAND_KNOWLEDGE[matched_area].values()), [])
        return {
            "area": area,
            "country": country,
            "source": "local_knowledge",
            "brands": country_brands,
        }

    # Fallback: OpenAlex search for drugs in the area
    try:
        params = urllib.parse.urlencode({
            "search": f"{area} drug treatment",
            "filter": "type:article",
            "per_page": 20,
            "mailto": OPENALEX_EMAIL,
        })
        data = http_request(f"{OPENALEX_BASE}/works?{params}")
        drug_mentions = {}
        for w in data.get("results", []):
            title = w.get("title", "") or ""
            for concept in w.get("concepts", []):
                cname = concept.get("display_name", "")
                if concept.get("level", 99) <= 3 and cname:
                    drug_mentions[cname] = drug_mentions.get(cname, 0) + 1
        top_drugs = sorted(drug_mentions.items(), key=lambda x: -x[1])[:15]
        return {
            "area": area,
            "country": country,
            "source": "openalex_inference",
            "brands": [
                {"name": d[0], "generic": "", "class": "inferred", "manufacturer": ""}
                for d in top_drugs
            ],
        }
    except Exception as e:
        return {"area": area, "country": country, "brands": [], "error": str(e)}


# ---- Social Screen (No-VisiBrain fallback) ----
def social_screen(query, country):
    """Simulated social media presence screening for KOLs.
    Returns mock social presence data when VisiBrain is unavailable.
    """
    import hashlib

    seed = int(hashlib.md5(f"{query}{country}".encode()).hexdigest(), 16)

    def seeded_int(offset, lo, hi):
        return lo + ((seed + offset) % (hi - lo + 1))

    def seeded_float(offset, lo, hi, decimals=1):
        raw = (seed + offset) % 1000
        return round(lo + (raw / 1000) * (hi - lo), decimals)

    platforms = [
        {
            "platform": "Twitter / X",
            "handle": f"@{query.lower().replace(' ', '_')[:20]}",
            "followers": seeded_int(1, 200, 18000),
            "following": seeded_int(2, 50, 2000),
            "tweets_total": seeded_int(3, 50, 5000),
            "avg_engagement_rate": seeded_float(4, 0.5, 4.5),
            "recent_activity": "Active" if seeded_int(5, 0, 1) else "Moderate",
            "hcp_topics": ["#CardioTwitter", "#HeartFailure", "#ESCCongress"]
            if "cardio" in country.lower() or "heart" in query.lower()
            else ["#Oncology", "#Dermatology", "#CTCL"],
        },
        {
            "platform": "LinkedIn",
            "connections": seeded_int(6, 100, 3000),
            "followers": seeded_int(7, 50, 5000),
            "posts_last_6mo": seeded_int(8, 0, 30),
            "avg_post_likes": seeded_int(9, 2, 120),
            "profile_completeness": seeded_int(10, 60, 100),
        },
        {
            "platform": "ResearchGate",
            "rg_score": seeded_float(11, 5.0, 42.0),
            "reads_total": seeded_int(12, 500, 80000),
            "citations": seeded_int(13, 10, 5000),
            "followers": seeded_int(14, 5, 800),
        },
    ]

    overall_score = seeded_int(15, 20, 95)
    activity_level = (
        "High" if overall_score >= 70
        else "Moderate" if overall_score >= 40
        else "Low"
    )

    return {
        "query": query,
        "country": country,
        "source": "simulated",
        "note": "VisiBrain integration not available — simulated data based on KOL profile hash. For accurate data, connect VisiBrain.",
        "overall_social_score": overall_score,
        "activity_level": activity_level,
        "platforms": platforms,
        "digital_presence_summary": {
            "primary_channel": "Twitter / X" if seeded_int(16, 0, 1) else "LinkedIn",
            "content_focus": "Clinical research & guidelines" if seeded_int(17, 0, 2) < 2 else "Patient education",
            "influence_tier": "Macro-KOL" if overall_score >= 75 else "Mid-tier" if overall_score >= 45 else "Micro",
            "engagement_quality": "High" if seeded_float(18, 0, 1) > 0.5 else "Moderate",
        },
    }


# ---- Google Trends (Simulated) ----
def google_trends(keyword, geo):
    """Simulated Google Trends data for the SEO tab.
    Returns 12 months of search volume data, related queries, and regional breakdown.
    """
    import hashlib

    seed = int(hashlib.md5(f"{keyword}{geo}".encode()).hexdigest(), 16)

    def seeded_int(offset, lo, hi):
        return lo + ((seed + offset) % (hi - lo + 1))

    months = [
        "Mar 2025", "Apr 2025", "May 2025", "Jun 2025",
        "Jul 2025", "Aug 2025", "Sep 2025", "Oct 2025",
        "Nov 2025", "Dec 2025", "Jan 2026", "Feb 2026",
    ]

    # Generate a believable trend curve (base + seasonal variation)
    base = seeded_int(1, 30, 80)
    timeline = []
    for i, month in enumerate(months):
        delta = seeded_int(i + 100, -15, 20)
        # add slight seasonal bump in Sep-Nov (congress season)
        seasonal = 10 if 6 <= i <= 8 else 0
        value = max(5, min(100, base + delta + seasonal))
        timeline.append({"month": month, "value": value})

    # Related queries: rising
    related_terms = [
        f"{keyword} guidelines",
        f"{keyword} clinical trial",
        f"{keyword} mechanism",
        f"{keyword} side effects",
        f"{keyword} vs placebo",
        f"{keyword} efficacy",
        f"{keyword} Spain" if geo in ("ES", "es") else f"{keyword} France",
    ]
    rising = [
        {
            "query": related_terms[i % len(related_terms)],
            "value": seeded_int(i + 200, 50, 5000),
            "trend": "+" + str(seeded_int(i + 300, 50, 500)) + "%",
        }
        for i in range(5)
    ]

    # Top queries
    top = [
        {
            "query": related_terms[i % len(related_terms)],
            "value": seeded_int(i + 400, 30, 100),
        }
        for i in range(5)
    ]

    # Regional breakdown
    GEO_REGIONS = {
        "ES": ["Madrid", "Cataluña", "Andalucía", "Comunidad Valenciana", "País Vasco"],
        "FR": ["\u00cele-de-France", "Auvergne-Rhône-Alpes", "Nouvelle-Aquitaine", "Occitanie", "Provence-Alpes-Côte d'Azur"],
        "GB": ["London", "South East", "North West", "West Midlands", "Scotland"],
        "DE": ["Bayern", "Nordrhein-Westfalen", "Baden-Württemberg", "Berlin", "Hamburg"],
        "US": ["California", "New York", "Texas", "Florida", "Massachusetts"],
    }
    regions = GEO_REGIONS.get(geo.upper(), GEO_REGIONS["ES"])
    regional = [
        {"region": r, "value": seeded_int(i + 500, 40, 100)}
        for i, r in enumerate(regions)
    ]
    regional.sort(key=lambda x: -x["value"])

    avg_volume = round(sum(t["value"] for t in timeline) / len(timeline))
    trend_direction = "up" if timeline[-1]["value"] > timeline[0]["value"] else "down"

    return {
        "keyword": keyword,
        "geo": geo,
        "source": "simulated",
        "note": "Simulated Google Trends data — for production use, integrate Google Trends API or SerpAPI.",
        "summary": {
            "avg_monthly_volume_index": avg_volume,
            "trend_12mo": trend_direction,
            "peak_month": max(timeline, key=lambda x: x["value"])["month"],
            "trough_month": min(timeline, key=lambda x: x["value"])["month"],
        },
        "timeline": timeline,
        "related_queries": {
            "rising": rising,
            "top": top,
        },
        "regional_breakdown": regional,
    }


# ---- VisiBrain topics (from cached file) ----
def get_visibrain_topics():
    """Return cached VisiBrain topics info."""
    topics_file = Path("visibrain_topics.json")
    if topics_file.exists():
        return json.loads(topics_file.read_text())
    return {"error": "No cached VisiBrain data found. Run browser sync first."}

# ---- Main Router ----
def main():
    method = os.environ.get("REQUEST_METHOD", "GET")
    qs = os.environ.get("QUERY_STRING", "")
    params = dict(urllib.parse.parse_qsl(qs))
    action = params.get("action", "")
    
    body = None
    if method == "POST":
        length = int(os.environ.get("CONTENT_LENGTH", 0))
        if length > 0:
            body = json.loads(sys.stdin.read(length))
    
    result = {"error": "Unknown action"}
    
    try:
        if action == "search_openalex":
            result = search_openalex(
                params.get("query", ""),
                int(params.get("page", 1)),
                int(params.get("per_page", 25))
            )
        
        elif action == "search_trials":
            result = search_trials(
                params.get("query", ""),
                int(params.get("page_size", 20)),
                params.get("page_token")
            )
        
        elif action == "pharmageo_brands":
            token = get_pharmageo_token()
            raw = pharmageo_get("/brands", token)
            # Normalize: PharmaGEO may return list or dict with 'data' key
            if isinstance(raw, list):
                result = {"brands": raw}
            elif isinstance(raw, dict) and "data" in raw:
                result = {"brands": raw["data"] if isinstance(raw["data"], list) else [raw["data"]]}
            elif isinstance(raw, dict) and "brands" in raw:
                result = raw
            elif isinstance(raw, dict) and "error" not in raw:
                result = {"brands": [raw]}
            else:
                result = raw
        
        elif action == "pharmageo_scores":
            brand_id = params.get("brand_id", "")
            token = get_pharmageo_token()
            result = pharmageo_get(f"/brands/{brand_id}", token)
        
        elif action == "pharmageo_login":
            token = get_pharmageo_token()
            result = {"success": bool(token), "token_preview": token[:20] + "..." if token else ""}
        
        elif action == "pharmageo_launch":
            if body:
                token = get_pharmageo_token()
                result = http_request(
                    f"{PHARMAGEO_BASE}/brands/modular",
                    method="POST",
                    data=body,
                    headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
                )
            else:
                result = {"error": "POST body required"}
        
        elif action == "openalex_author":
            result = get_openalex_author(params.get("author_id", ""))
        
        elif action == "kol_rising_stars":
            result = find_rising_stars(
                params.get("query", ""),
                params.get("country")
            )
        
        elif action == "aggregate_score":
            raw = compute_aggregate_score(
                brand_id=params.get("brand_id"),
                brand_name=params.get("brand"),
                competitor_name=params.get("competitor")
            )
            # Flatten for frontend
            brand_s = raw.get("brand", {})
            comp_s = raw.get("competitor", {})
            result = {
                "brand_score": brand_s.get("aggregate_score", "-"),
                "competitor_score": comp_s.get("aggregate_score", "-"),
                "detail": raw
            }
        
        elif action == "detect_brands":
            result = detect_brands(
                params.get("area", ""),
                params.get("country", "")
            )
        
        elif action == "social_screen":
            result = social_screen(
                params.get("query", ""),
                params.get("country", "")
            )
        
        elif action == "google_trends":
            result = google_trends(
                params.get("keyword", ""),
                params.get("geo", "FR")
            )
        
        elif action == "visibrain_topics":
            result = get_visibrain_topics()
        
        elif action == "ai_chat":
            if body:
                message = body.get("message", "")
                context = body.get("context", {})
                # AI chat via PharmaGEO or simple echo for now
                token = get_pharmageo_token()
                if token:
                    resp = http_request(
                        f"{PHARMAGEO_BASE}/chat",
                        method="POST",
                        data={"message": message, "context": context},
                        headers={"Authorization": f"Bearer {token}"}
                    )
                    result = resp if not resp.get("error") else {"reply": f"Chat endpoint unavailable: {resp['error']}"}
                else:
                    result = {"reply": "Authentication required for AI chat."}
            else:
                result = {"error": "POST body required"}
        
        else:
            result = {"error": f"Unknown action: {action}"}
    
    except Exception as e:
        result = {"error": str(e)}
    
    # Output CGI headers + JSON
    print("Content-Type: application/json")
    print("Access-Control-Allow-Origin: *")
    print("Access-Control-Allow-Methods: GET, POST, OPTIONS")
    print("Access-Control-Allow-Headers: Content-Type, Authorization")
    print()
    print(json.dumps(result, ensure_ascii=False, default=str))

if __name__ == "__main__":
    main()
