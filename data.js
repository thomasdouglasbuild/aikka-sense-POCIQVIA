const PLATFORM_DATA = {
  "config": {
    "brand": "Ledaga",
    "therapeutic_area": "Lymphomes T Cutanés",
    "market": "France",
    "pathology": "Mycosis Fongoïde / Syndrome de Sézary",
    "competitor": "Poteligeo",
    "last_updated": "2026-02-27T17:00:00Z"
  },
  "pharmageo": {
    "scores": [
      {
        "llm": "OpenAI",
        "overallScore": 43,
        "reliability": 76,
        "sentiment": "neutral",
        "aiVisibility": 67,
        "netSentiment": -10,
        "summary": "Performance globale modérée (43/100) avec une fiabilité moyenne à bonne (76/100). Le sentiment est neutre (aucune réponse positive sur 14), reflétant des réponses surtout factuelles et prudentes."
      },
      {
        "llm": "Perplexity",
        "overallScore": 57,
        "reliability": 89,
        "sentiment": "neutral",
        "aiVisibility": 100,
        "netSentiment": -10,
        "summary": "Performance globale moyenne (57/100) avec une fiabilité des sources élevée (89/100). Le sentiment est globalement neutre, reflétant des réponses majoritairement factuelles avec une marge d'amélioration sur la qualité globale."
      },
      {
        "llm": "Gemini",
        "overallScore": 46,
        "reliability": 78,
        "sentiment": "neutral",
        "aiVisibility": 100,
        "netSentiment": -10,
        "summary": "Les réponses de Gemini en français sur Ledaga affichent un score global modéré (46/100) et une fiabilité globalement élevée (78/100). Le sentiment est neutre, sans avis positifs identifiés (0/15), reflétant surtout des réponses factuelles."
      }
    ],
    "cloudwords": [
      {"word": "Ledaga", "count": 15},
      {"word": "chlorméthine", "count": 10},
      {"word": "lymphome", "count": 9},
      {"word": "cutané", "count": 8},
      {"word": "gel", "count": 7},
      {"word": "mycosis", "count": 7},
      {"word": "fongoïde", "count": 7},
      {"word": "lymphomes", "count": 6},
      {"word": "cutanés", "count": 6},
      {"word": "effets", "count": 6},
      {"word": "secondaires", "count": 6},
      {"word": "T cutanés", "count": 5},
      {"word": "mycosis fongoïde", "count": 5},
      {"word": "effets secondaires", "count": 5},
      {"word": "dermatite", "count": 5},
      {"word": "application", "count": 5},
      {"word": "traitement", "count": 5},
      {"word": "réaction", "count": 5},
      {"word": "local", "count": 5},
      {"word": "peau", "count": 4},
      {"word": "symptômes", "count": 4},
      {"word": "dosage", "count": 4},
      {"word": "efficacité", "count": 4},
      {"word": "réactions", "count": 4},
      {"word": "cancer", "count": 4},
      {"word": "dermatologique", "count": 4},
      {"word": "cytotoxique", "count": 4},
      {"word": "prurit", "count": 3},
      {"word": "érythème", "count": 3},
      {"word": "hypopigmentation", "count": 3}
    ],
    "trending_questions": [
      {"question": "Qu'est-ce que Ledaga et à quoi ça sert ?", "category": "patient"},
      {"question": "Quels sont les effets secondaires de Ledaga ?", "category": "patient"},
      {"question": "Ledaga est-il efficace contre le vitiligo ?", "category": "patient"},
      {"question": "Combien de temps faut-il pour voir les effets de Ledaga ?", "category": "patient"},
      {"question": "Y a-t-il des interactions médicamenteuses avec Ledaga ?", "category": "patient"},
      {"question": "Comment Ledaga agit-il sur la peau ?", "category": "professional"},
      {"question": "Quelles sont les recommandations pour l'utilisation de Ledaga ?", "category": "professional"},
      {"question": "Quels sont les effets indésirables fréquents de Ledaga ?", "category": "professional"},
      {"question": "Ledaga est-il recommandé pour tous les types de vitiligo ?", "category": "professional"},
      {"question": "Quelle est la posologie recommandée pour Ledaga ?", "category": "professional"},
      {"question": "Comment Ledaga se compare-t-il à {COMPETITOR} ?", "category": "competitive"},
      {"question": "Est-ce que Ledaga est plus efficace que {COMPETITOR} ?", "category": "competitive"},
      {"question": "Quelles sont les différences entre Ledaga et {COMPETITOR} ?", "category": "competitive"},
      {"question": "Ledaga est-il plus sûr que {COMPETITOR} ?", "category": "competitive"},
      {"question": "Quel traitement est meilleur, Ledaga ou {COMPETITOR} ?", "category": "competitive"}
    ],
    "competitive": [
      {"llm": "OpenAI", "question": "Comment Ledaga se compare-t-il à Poteligeo ?", "score": 48, "sentiment": "neutre"},
      {"llm": "OpenAI", "question": "Est-ce que Ledaga est plus efficace que Poteligeo ?", "score": 49, "sentiment": "neutre"},
      {"llm": "OpenAI", "question": "Quelles sont les différences entre Ledaga et Poteligeo ?", "score": 49, "sentiment": "neutre"},
      {"llm": "OpenAI", "question": "Ledaga est-il plus sûr que Poteligeo ?", "score": 68, "sentiment": "positif"},
      {"llm": "OpenAI", "question": "Quel traitement est meilleur, Ledaga ou Poteligeo ?", "score": 48, "sentiment": "neutre"},
      {"llm": "Gemini", "question": "Comment Ledaga se compare-t-il à Poteligeo ?", "score": 52, "sentiment": "neutre"},
      {"llm": "Gemini", "question": "Est-ce que Ledaga est plus efficace que Poteligeo ?", "score": 50, "sentiment": "neutre"},
      {"llm": "Gemini", "question": "Quelles sont les différences entre Ledaga et Poteligeo ?", "score": 54, "sentiment": "neutre"},
      {"llm": "Gemini", "question": "Ledaga est-il plus sûr que Poteligeo ?", "score": 59, "sentiment": "neutre"},
      {"llm": "Gemini", "question": "Quel traitement est meilleur, Ledaga ou Poteligeo ?", "score": 54, "sentiment": "neutre"}
    ],
    "sources": [
      {"title": "Chlormethine Gel (Ledaga) — CADTH Reimbursement Review (NCBI Bookshelf)", "link": "https://www.ncbi.nlm.nih.gov/books/NBK594332/", "type": "PubMed", "reliability": 72, "usage": 13},
      {"title": "Ledaga Product Monograph - Recordati Rare Diseases", "link": "https://recordatirarediseases.com/wp-content/uploads/2025/03/Ledaga-Product-Monograph-French-Feb-2023.pdf", "type": "Manufacturer", "reliability": 100, "usage": 11},
      {"title": "Ledaga (chlormethine) EPAR product information — EMA", "link": "https://www.ema.europa.eu/en/documents/product-information/ledaga-epar-product-information_en.pdf", "type": "Regulatory", "reliability": 72, "usage": 10},
      {"title": "Ledaga | European Medicines Agency (EMA)", "link": "https://www.ema.europa.eu/en/medicines/human/EPAR/ledaga", "type": "Regulatory", "reliability": 72, "usage": 7},
      {"title": "HAS – Recherche: POTELIGEO (mogamulizumab)", "link": "https://www.has-sante.fr/jcms/r_1499251/fr/recherche?text=POTELIGEO", "type": "Regulatory", "reliability": 100, "usage": 5},
      {"title": "HAS – Recherche: LEDAGA (chlorméthine)", "link": "https://www.has-sante.fr/jcms/r_1499251/fr/recherche?text=LEDAGA", "type": "Regulatory", "reliability": 100, "usage": 5},
      {"title": "Avis de la Commission de la Transparence - LEDAGA", "link": "https://www.has-sante.fr/jcms/c_2794000/fr/ledaga-13092017-avis-ct16175", "type": "Regulatory", "reliability": 100, "usage": 5},
      {"title": "LEDAGA (chlorméthine), alkylant", "link": "https://www.has-sante.fr/jcms/c_2794001/fr/ledaga-chlormethine-alkylant", "type": "Regulatory", "reliability": 90, "usage": 4},
      {"title": "Avis de la Commission de la Transparence - POTELIGEO", "link": "https://www.has-sante.fr/jcms/c_2901323/fr/poteligeo", "type": "Regulatory", "reliability": 100, "usage": 4}
    ],
    "recommendations": [
      {"type": "GEO", "llm": "OpenAI", "title": "Créer et référencer la page Wikipédia FR Ledaga", "description": "Créer ou enrichir la page Wikipédia en français Ledaga avec un résumé neutre, une infobox Médicament et des références primaires officielles.", "priority": "High", "impact": "Renforce l'expertise, l'autorité et la confiance."},
      {"type": "GEO", "llm": "Gemini", "title": "Création d'une Page de Référence Produit sur le Site Officiel", "description": "Développer une page web dédiée et complète pour Ledaga sur le site du fabricant, Recordati Rare Diseases.", "priority": "High", "impact": "Établit le site du fabricant comme la source d'information de référence."}
    ],
    "discoverability": {
      "brandRecognition": 0,
      "innOnly": 0,
      "drugClass": 67,
      "notFound": 33
    },
    "agnostic": {
      "overview": {
        "market": "France",
        "languages": ["fr"],
        "pathology": "Mycosis fungoides, Sézary syndrome",
        "topProducts": [
          {"name": "Targretin", "productId": "entity_daogbg", "shareOfVoice": 0.0616, "appearanceRate": 0.03125},
          {"name": "Poteligeo", "productId": "entity_u4xbss", "shareOfVoice": 0.0616, "appearanceRate": 0.03125},
          {"name": "Adcetris", "productId": "entity_ktiopf", "shareOfVoice": 0.0616, "appearanceRate": 0.03125},
          {"name": "Intron A", "productId": "entity_9mp8w3", "shareOfVoice": 0.0589, "appearanceRate": 0.03125},
          {"name": "Bactroban", "productId": "entity_qmok3m", "shareOfVoice": 0.0457, "appearanceRate": 0.015625}
        ],
        "ownedDomains": ["kyowakirin.com", "recordati.com"],
        "groundingRate": 0.9375,
        "answersCollected": 64,
        "productsDetected": 23,
        "overallReliability": 62,
        "questionsGenerated": 34
      },
      "products": [
        {"name": "Targretin", "sov": 6.2, "mentions": 2, "appearance": 3.1},
        {"name": "Poteligeo", "sov": 6.2, "mentions": 2, "appearance": 3.1},
        {"name": "Adcetris", "sov": 6.2, "mentions": 2, "appearance": 3.1},
        {"name": "Intron A", "sov": 5.9, "mentions": 2, "appearance": 3.1},
        {"name": "Bactroban", "sov": 4.6, "mentions": 1, "appearance": 1.6},
        {"name": "Ledaga®", "sov": 4.5, "mentions": 1, "appearance": 1.6},
        {"name": "Dermovate", "sov": 4.4, "mentions": 1, "appearance": 1.6},
        {"name": "Atarax", "sov": 4.4, "mentions": 1, "appearance": 1.6},
        {"name": "Neurontin", "sov": 4.4, "mentions": 1, "appearance": 1.6},
        {"name": "CeraVe", "sov": 4.4, "mentions": 1, "appearance": 1.6},
        {"name": "Zolinza", "sov": 4.4, "mentions": 1, "appearance": 1.6},
        {"name": "Pegasys", "sov": 4.3, "mentions": 1, "appearance": 1.6},
        {"name": "Gemzar", "sov": 4.3, "mentions": 1, "appearance": 1.6},
        {"name": "MabCampath", "sov": 4.3, "mentions": 1, "appearance": 1.6},
        {"name": "Dexeryl", "sov": 4.2, "mentions": 1, "appearance": 1.6}
      ]
    }
  },
  "kols": {
    "france": [
      {"name": "Pr Martine Bagot", "institution": "AP-HP Hôpital Saint-Louis", "city": "Paris", "specialty": "['CTCL', 'Mycosis fongoïde', 'Syndrome de Sézary', 'Lymphomes cutanés']", "tier": 1, "publications": ">750", "social": {}, "score": 95},
      {"name": "Pr Jean-David Bouaziz", "institution": "AP-HP Hôpital Saint-Louis", "city": "Paris", "specialty": "['CTCL', 'Dermatologie immunitaire', 'Greffe allogénique']", "tier": 1, "publications": ">250", "social": {"linkedin": "https://www.linkedin.com/in/jean-david-bouaziz-27a8015b", "linkedin_followers": 366, "linkedin_connections": 317}, "score": 93},
      {"name": "Dr Adèle de Masson", "institution": "AP-HP Hôpital Saint-Louis", "city": "Paris", "specialty": "['CTCL', 'Pathophysiologie CTCL', 'Greffe allogénique', 'CCR8']", "tier": 1, "publications": ">75", "social": {}, "score": 91},
      {"name": "Dr Maxime Battistella", "institution": "AP-HP Hôpital Saint-Louis", "city": "Paris", "specialty": "['Dermatopathologie CTCL', 'KIR3DL2', 'Histopathologie lymphomes cutanés']", "tier": 1, "publications": null, "social": {}, "score": 89},
      {"name": "Dr Caroline Ram-Wolff", "institution": "AP-HP Hôpital Saint-Louis", "city": "Paris", "specialty": "['CTCL', 'Coordination réseau GFELC']", "tier": 2, "publications": null, "social": {}, "score": 87},
      {"name": "Pr Armand Bensussan", "institution": "AP-HP Hôpital Saint-Louis / INSERM", "city": "Paris", "specialty": "['Immunologie CTCL', 'KIR3DL2/CD158k', 'Anticorps monoclonaux anti-CTCL']", "tier": 1, "publications": null, "social": {}, "score": 85},
      {"name": "Dr Hélène Moins-Teisserenc", "institution": "AP-HP Hôpital Saint-Louis", "city": "Paris", "specialty": "['Biomarqueurs Sézary', 'Hématologie biologique CTCL']", "tier": 2, "publications": null, "social": {}, "score": 83},
      {"name": "Pr Marie Beylot-Barry", "institution": "CHU Bordeaux — Hôpital Haut-Lévêque", "city": "Bordeaux", "specialty": "['CTCL', 'Mogamulizumab real-world', 'Dupilumab-CTCL', 'Lymphomes cutanés']", "tier": 1, "publications": null, "social": {}, "score": 81},
      {"name": "Pr Anne Pham-Ledard", "institution": "CHU Bordeaux — Hôpital Haut-Lévêque", "city": "Bordeaux", "specialty": "['Génomique CTCL', 'DUSP22', 'Lymphomes cutanés B']", "tier": 2, "publications": null, "social": {}, "score": 79},
      {"name": "Pr Béatrice Vergier", "institution": "CHU Bordeaux", "city": "Bordeaux", "specialty": "['Anatomopathologie CTCL', 'Transformation MF']", "tier": 2, "publications": null, "social": {}, "score": 77},
      {"name": "Pr Olivier Dereure", "institution": "CHU Montpellier — Hôpital Saint-Éloi", "city": "Montpellier", "specialty": "['CTCL', 'Lymphomes cutanés', 'Dermato-oncologie']", "tier": 1, "publications": null, "social": {}, "score": 71},
      {"name": "Pr Florent Grange", "institution": "CHU Reims — Hôpital Robert Debré", "city": "Reims", "specialty": "['CTCL', 'Lymphomes cutanés', 'Dermatologie oncologique']", "tier": 1, "publications": null, "social": {}, "score": 69},
      {"name": "Pr Gaëlle Quéreux-Baumgartner", "institution": "CHU Nantes — Hôtel Dieu", "city": "Nantes", "specialty": "['CTCL', 'Lymphomes cutanés', 'Dermatologie oncologique']", "tier": 1, "publications": 169, "social": {}, "score": 65}
    ],
    "spain": [
      {"name": "Valentín Fuster", "institution": "", "city": "Madrid (Spain) / New York (USA)", "specialty": ["Atherosclerosis", "Thrombosis"], "publications": "", "h_index": 218, "source": "discovered", "score": 95},
      {"name": "Hector Jose Bueno Zamora", "institution": "", "city": "Madrid", "specialty": ["Acute coronary syndromes", "Heart failure"], "publications": "", "h_index": 113, "source": "existing", "score": 95}
    ]
  },
  "publications": [
    {"title": "Allogeneic transplantation in advanced cutaneous T-cell lymphomas (CUTALLO): a propensity score matched controlled prospective study", "authors": ["de Masson A", "Beylot-Barry M", "Bouaziz J-D", "et al — GFELC & SFGM-TC"], "journal": "The Lancet", "year": 2023, "doi": "10.1016/S0140-6736(23)00329-X"},
    {"title": "EORTC consensus recommendations for the treatment of mycosis fungoides/Sézary syndrome — update 2023", "authors": ["Bagot M", "et al — EORTC Cutaneous Lymphoma Group"], "journal": "European Journal of Cancer", "year": 2023, "doi": "10.1016/j.ejca.2023.113343"},
    {"title": "Effectiveness of mogamulizumab in patients with Mycosis Fungoides or Sézary syndrome (OMEGA study)", "authors": ["Beylot-Barry M", "et al — GFELC"], "journal": "JEADV", "year": 2023, "doi": "10.1111/jdv.19134"},
    {"title": "Lacutamab (IPH4102) in relapsed/refractory mycosis fungoides and Sézary syndrome: TELLOMAK phase 2 final results", "authors": ["Porcu P", "Bagot M", "et al"], "journal": "Journal of Clinical Oncology (ASCO Annual Meeting Suppl)", "year": 2024, "doi": "10.1200/JCO.2024.42.16_suppl.7082"},
    {"title": "Therapeutic advances in cutaneous T-cell lymphomas", "authors": ["Bagot M"], "journal": "British Journal of Dermatology", "year": 2025, "doi": "10.1093/bjd/ljaf105"},
    {"title": "Overall survival after allogeneic hematopoietic stem cell transplantation for CTCL — CUTALLO long-term follow-up", "authors": ["Bouaziz J-D", "de Masson A", "Bagot M", "et al — GFELC & SFGM-TC"], "journal": "Journal of Clinical Oncology", "year": 2025, "doi": "10.1200/JCO-25-00183"}
  ],
  "treatments": {
    "standard_of_care_by_stage": {
      "stage_IA_IB_early": {
        "description": "MF stades IA-IB",
        "therapies": [
          {"name": "Dermocorticoïdes (topiques forts)", "type": "Traitement local", "indication": "Lésions localisées IA", "approval_status": "Standard of care France", "brand_name": null},
          {"name": "Chlorméthine gel", "generic_name": "Méchloréthamine", "brand_name": "Ledaga® 160 µg/g", "type": "Alkylant topique", "indication": "MF stades IA-IIA", "approval_status": "AMM EMA (approbation 2017, SPC 2024 actualisé)", "manufacturer": "Recordati Rare Diseases (Orphan Europe)", "url": "https://ec.europa.eu/health/documents/community-register/2024/20240916163942/anx_163942_fr.pdf"},
          {"name": "Photothérapie UVB TL01 (bande étroite)", "type": "Photothérapie", "indication": "MF stades IA-IIA, plaques", "approval_status": "Standard of care France"},
          {"name": "PUVAthérapie (psoralène + UVA)", "type": "Photothérapie", "indication": "MF stades IIA-IIB", "approval_status": "Standard of care France"},
          {"name": "Radiothérapie localisée", "type": "Radiothérapie", "indication": "Lésions localisées tumorales IIB", "approval_status": "Standard of care France"}
        ]
      },
      "stage_IIA_IIB_intermediate": {
        "description": "MF stades IIA-IIB",
        "therapies": [
          {"name": "Bexarotène", "brand_name": "Targretin® 75 mg", "type": "Rétinoïde de 3e génération", "indication": "MF stades IB à IVB réfractaire", "approval_status": "AMM Europe", "manufacturer": "Eisai"},
          {"name": "Photochimiothérapie extracorporelle (ECP)", "type": "Immunothérapie extracorporelle", "indication": "MF stades avancés", "approval_status": "Remboursé pour SS France"}
        ]
      },
      "stage_III_SS_blood_advanced": {
        "description": "MF stade III-IV ou Syndrome de Sézary",
        "therapies": [
          {"name": "Mogamulizumab", "brand_name": "Poteligeo®", "type": "Anticorps monoclonal anti-CCR4", "indication": "MF/SS après au moins 1 traitement systémique antérieur", "approval_status": "AMM EMA 2018; Remboursé en France", "manufacturer": "Kyowa Kirin", "key_data": "MAVORIC Ph3: ORR 28% MF, 37% SS; PFS 7.7 vs 3.1 mois"},
          {"name": "Brentuximab védotine", "brand_name": "Adcetris®", "type": "ADC anti-CD30", "indication": "MF CD30+ (≥10%)", "approval_status": "AMM EMA 2017", "manufacturer": "Takeda / Seagen"}
        ]
      },
      "potentially_curative_advanced": {
        "description": "Traitement potentiellement curatif pour CTCL avancé",
        "therapies": [
          {"name": "Greffe allogénique (HSCT)", "type": "Greffe allogénique", "indication": "CTCL avancé", "approval_status": "Recommandé EORTC 2023", "key_evidence": "CUTALLO trial (Lancet 2023): HR OS 0.37 (p=0.018)"}
        ]
      }
    },
    "emerging_therapies": [
      {"name": "Lacutamab", "code": "IPH4102", "target": "KIR3DL2 (CD158k)", "type": "Anticorps monoclonal anti-KIR3DL2", "developer": "Innate Pharma (Marseille, France)", "stage": "Phase 3 (TELLOMAK 3) en cours de démarrage H1 2026", "indication": "SS R/R et MF R/R", "regulatory_status": "FDA Breakthrough Therapy Designation (SS); EMA PRIME designation", "key_data": "TELLOMAK Ph2: ORR 42.9% SS"},
      {"name": "Anti-CCR8 mAb (projet SPRINT)", "target": "CCR8", "type": "Anticorps monoclonal anti-CCR8", "developer": "Équipe de Masson — INSERM U976 / Saint-Louis", "stage": "Préclinique / Découverte", "indication": "CTCL (MF/SS)"}
    ],
    "clinical_trials_france": [
      {"trial_name": "CUTALLO", "nct_id": "NCT02520908", "phase": "Prospectif contrôlé", "status": "Terminé — publié Lancet 2023", "result": "Positif — HR OS 0.37 (p=0.018)"},
      {"trial_name": "MOGAT (mogamulizumab + TSEB)", "nct_id": "NCT04128072", "phase": "Phase 2", "status": "En cours", "url": "https://clinicaltrials.gov/study/NCT04128072"},
      {"trial_name": "TELLOMAK 3 (lacutamab confirmatory Phase 3)", "phase": "Phase 3 confirmatory", "status": "Démarrage H1 2026", "sponsor": "Innate Pharma (Marseille)"}
    ]
  },
  "trending_topics": [
    {"topic": "Lacutamab / KIR3DL2 — Phase 3 imminente (TELLOMAK 3)", "priority": "TRÈS HAUTE", "description": "La Phase 3 confirmatory (TELLOMAK 3) de lacutamab dans le SS/MF R/R va démarrer H1 2026. FDA Breakthrough Therapy Designation (SS) + EMA PRIME."},
    {"topic": "Dupilumab et risque de CTCL — Controverse majeure 2024-2025", "priority": "TRÈS HAUTE", "description": "Le dupilumab est associé à un risque de démasquage d'un MF préexistant."},
    {"topic": "CUTALLO trial — établissement de l'HSCT allogénique comme nouveau standard", "priority": "HAUTE", "description": "L'essai CUTALLO (Lancet 2023) a définitivement établi que la greffe allogénique améliore significativement la survie dans le CTCL avancé."},
    {"topic": "CCR8 comme nouvelle cible thérapeutique — Projet SPRINT", "priority": "HAUTE", "description": "L'équipe de Masson/INSERM U976 (Saint-Louis) a identifié CCR8 comme cible prometteuse dans le CTCL."}
  ],
  "gfelc": {
    "description": "Groupe Français d'Etude des Lymphomes Cutanés (GFELC) — réseau national de 47 centres",
    "national_chair": "Pr Martine Bagot (Hôpital Saint-Louis, Paris)",
    "website": "https://www.gfelc.org",
    "centres_france": [
      {"city": "Paris", "hospital": "AP-HP Hôpital Saint-Louis", "region": "Île-de-France", "type": "Centre national de référence", "key_physicians": ["Pr Martine Bagot", "Pr Jean-David Bouaziz", "Dr Adèle de Masson", "Dr Maxime Battistella", "Dr Caroline Ram-Wolff"]},
      {"city": "Bordeaux", "hospital": "CHU Hôpital Haut-Lévêque", "region": "Nouvelle-Aquitaine", "type": "Centre expert régional majeur", "key_physicians": ["Pr Marie Beylot-Barry", "Pr Anne Pham-Ledard", "Pr Béatrice Vergier"], "research_unit": "INSERM U1312 (BRIC)"},
      {"city": "Lyon", "hospital": "CHU Hôpital Lyon Sud", "region": "Auvergne-Rhône-Alpes", "type": "Centre expert", "key_physicians": ["Pr Stéphane Dalle"]},
      {"city": "Montpellier", "hospital": "CHU Hôpital Saint-Éloi", "region": "Occitanie", "type": "Centre expert", "key_physicians": ["Pr Olivier Dereure"]},
      {"city": "Marseille", "hospital": "AP-HM Hôpital Nord", "region": "PACA", "type": "Centre expert", "key_physicians": ["Pr Philippe Berbis", "Dr Florent Amatore"]},
      {"city": "Nantes", "hospital": "CHU Hôtel Dieu", "region": "Pays de la Loire", "type": "Centre expert", "key_physicians": ["Pr Gaëlle Quéreux-Baumgartner"]},
      {"city": "Rennes", "hospital": "CHU Hôpital Pontchaillou", "region": "Bretagne", "type": "Centre expert", "key_physicians": ["Pr Alain Dupuy"]},
      {"city": "Lille", "hospital": "CHRU Hôpital Claude Huriez", "region": "Hauts-de-France", "type": "Centre expert labellisé EURACAN", "key_physicians": ["Pr Laurent Mortier", "Pr Diala Staumont-Sallé"]},
      {"city": "Reims", "hospital": "CHU Hôpital Robert Debré", "region": "Grand Est", "type": "Centre expert", "key_physicians": ["Pr Florent Grange"]},
      {"city": "Rouen", "hospital": "CHU Hôpital Charles Nicolle", "region": "Normandie", "type": "Centre expert", "key_physicians": ["Pr Pascal Joly", "Dr Anne-Bénédicte Duval-Modeste"]},
      {"city": "Tours", "hospital": "CHRU Hôpital Trousseau", "region": "Centre-Val de Loire", "type": "Centre expert", "key_physicians": ["Pr Laurent Machet"]},
      {"city": "Strasbourg", "hospital": "CHU Clinique dermatologique", "region": "Grand Est", "type": "Centre expert", "key_physicians": ["Dr Mona Mitcov"]},
      {"city": "Besançon", "hospital": "CHRU Hôpital Jean Minjoz", "region": "Bourgogne-Franche-Comté", "type": "Centre expert", "key_physicians": ["Pr François Aubin"]},
      {"city": "Dijon", "hospital": "CHU Hôpital du Bocage", "region": "Bourgogne-Franche-Comté", "type": "Centre expert", "key_physicians": ["Dr Sophie Dalac-Rat"]}
    ],
    "centres_francophones": [
      {"city": "Bruxelles", "country": "Belgique", "hospital": "ULB Hôpital Erasme"},
      {"city": "Genève", "country": "Suisse", "hospital": "HUG Hôpitaux Universitaires Genève"},
      {"city": "Québec", "country": "Canada", "hospital": "CHUL / CHUQ Québec City"}
    ]
  }
};