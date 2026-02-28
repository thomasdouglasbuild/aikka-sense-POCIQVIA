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
        
        elif action == "visibrain_topics":
            result = get_visibrain_topics()
        
        elif action == "health":
            result = {"status": "ok", "timestamp": time.time(), "apis": {
                "pharmageo": bool(get_pharmageo_token()),
                "openalex": True,
                "clinicaltrials": True,
                "visibrain": Path("visibrain_topics.json").exists(),
            }}
        
        else:
            result = {
                "error": "Unknown action. Available: search_openalex, search_trials, pharmageo_brands, pharmageo_scores, pharmageo_launch, pharmageo_login, openalex_author, kol_rising_stars, aggregate_score, visibrain_topics, health"
            }
    
    except Exception as e:
        result = {"error": str(e)}
    
    # Output
    print("Content-Type: application/json")
    print("Access-Control-Allow-Origin: *")
    print()
    print(json.dumps(result, ensure_ascii=False, default=str))

if __name__ == "__main__":
    main()
