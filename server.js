require('dotenv').config()
const express = require('express')
const cors = require('cors')
const https = require('https')
const http = require('http')
const fs = require('fs')
const path = require('path')
const app = express()

app.use(cors())
app.use(express.json({ limit: '50mb' }))
app.use(express.static('.'))

/* Fetch natif Node 24 — pas besoin de node-fetch */
const fetchNative = globalThis.fetch

/* ── PROXY FAL.AI (images) ── */
app.post('/api/fal', async (req, res) => {
  try {
    const { model, payload } = req.body
    const r = await fetchNative(`https://fal.run/${model}`, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${process.env.FAL_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })
    const data = await r.json()
    res.json(data)
  } catch(e) {
    res.status(500).json({ error: e.message })
  }
})

/* ── PROXY HIGGSFIELD (vidéos) ── */
app.post('/api/higgsfield', async (req, res) => {
  try {
    const r = await fetchNative('https://api.higgsfield.ai/v1/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.HIGGS_ID}:${process.env.HIGGS_SECRET}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(req.body)
    })
    const data = await r.json()
    res.json(data)
  } catch(e) {
    res.status(500).json({ error: e.message })
  }
})

/* ── POLLING HIGGSFIELD ── */
app.get('/api/higgsfield/:jobId', async (req, res) => {
  try {
    const r = await fetchNative(`https://api.higgsfield.ai/v1/generations/${req.params.jobId}`, {
      headers: {
        'Authorization': `Bearer ${process.env.HIGGS_ID}:${process.env.HIGGS_SECRET}`
      }
    })
    const data = await r.json()
    res.json(data)
  } catch(e) {
    res.status(500).json({ error: e.message })
  }
})

/* ── PROXY ELEVENLABS (voix) ── */
app.post('/api/elevenlabs', async (req, res) => {
  try {
    const { text, voice_id } = req.body
    const r = await fetchNative(`https://api.elevenlabs.io/v1/text-to-speech/${voice_id}`, {
      method: 'POST',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: { stability: 0.5, similarity_boost: 0.8 }
      })
    })
    const buffer = await r.arrayBuffer()
    res.set('Content-Type', 'audio/mpeg')
    res.send(Buffer.from(buffer))
  } catch(e) {
    res.status(500).json({ error: e.message })
  }
})

/* ── PROXY CLAUDE ── */
app.post('/api/claude', async (req, res) => {
  try {
    const r = await fetchNative('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'x-api-key': process.env.ANTHROPIC_API_KEY
      },
      body: JSON.stringify(req.body)
    })
    const data = await r.json()
    res.json(data)
  } catch(e) {
    res.status(500).json({ error: e.message })
  }
})

/* ── SOP CRÉATIF (BLOC 3 / Modification 3.3) ──
   Avant : règles ASL P4 et win-rates par format codés en dur dans index.html.
   Maintenant : fichier sop.json sur disque, modifiable depuis l'UI Réglages (POST) sans
   jamais toucher au JavaScript, et versionné dans Git (contrairement à localStorage). */
const SOP_PATH = path.join(__dirname, 'sop.json')
/* BLOC 5 : enrichi avec le contenu réel du playbook ASL (diversité, empreinte Andromeda,
   structures de copywriting, types d'annonces avec win-rate/spend ratio réels, etc.).
   Ce fallback ne sert que si sop.json est absent du disque — sop.json (versionné dans Git)
   reste la source de vérité. */
const SOP_DEFAULT = {
  "version": 2,
  "updated_at": null,
  "win_rates": {
    "Unboxing": 0.1,
    "Offer First": 0.09,
    "UGC Testimonial": 0.076,
    "Text-based": 0.05,
    "Creator Partnership": 0.04
  },
  "rules_p4": [
    "1 seule variable changée par créa vs la précédente (angle OU format OU hook OU awareness)",
    "Jamais répéter un hook déjà testé",
    "Pour les vidéos UGC : fournir un SCRIPT COMPLET mot à mot (pas juste le hook), avec instructions de mise en scène précises",
    "Pour les statiques : décrire précisément la composition visuelle, le texte overlay, les couleurs",
    "Le message de la créa DOIT matcher le langage exact de la page produit (message match)"
  ],
  "batch_mix_instruction": "Mix obligatoire : au moins 1 vidéo UGC, 1 statique, 1 Offer First si possible.",
  "diversity_rules": {
    "min_angles_per_batch": 3,
    "min_types_annonces_per_batch": 2,
    "min_awareness_levels_per_batch": 2,
    "priority": "fond_avant_forme",
    "priority_note": "Diversifier les angles/messages a plus d'impact que diversifier les formats. 5 angles x 3 messages = 15 combinaisons de fond AVANT de toucher au format."
  },
  "andromeda_fingerprint": {
    "note": "Taxonomie complète issue de Zezinho ('Les itérations') — remplace l'ancien modèle simplifié à 5 éléments. Couleur = validité de l'itération : vert = changer cet élément seul suffit, orange = ça dépend de l'ampleur du changement, rouge = ne compte pas comme itération seul.",
    "video_elements": [
      {
        "element": "format",
        "couleur": "vert",
        "note": "VSL / statique / short form-gif / mashup / UGC. Changer le format = itération forte."
      },
      {
        "element": "concept",
        "couleur": "vert",
        "note": "Ex: mashup voix-off+broll → témoignage client → founder story. Change tout."
      },
      {
        "element": "angle_marketing",
        "couleur": "vert",
        "note": "L'élément le plus impactant après le hook. Cible des personnes différentes."
      },
      {
        "element": "message",
        "couleur": "vert",
        "note": "Décliner un angle en différents messages = bonne itération même en gardant le même angle/concept/format."
      },
      {
        "element": "hook",
        "couleur": "vert",
        "note": "60-70% de la performance d'une créa. Changer les 3-4 premières secondes (visuel ET texte/voix) suffit — attention au simple paraphrasage qui ne change rien."
      },
      {
        "element": "body",
        "couleur": "vert",
        "note": "Même script+footages différents = bon. Même footages+script restructuré (plus de bénéfices, storytelling renforcé) = bon."
      },
      {
        "element": "duree_montage",
        "couleur": "orange",
        "note": "Changer significativement la durée (35s → 12s ou → 1min30) = bonne itération. Changement mineur = orange."
      },
      {
        "element": "footages_broll",
        "couleur": "orange",
        "note": "Changer la MAJORITÉ des plans = bon. Juste intervertir 2-3 plans sur 10 = ne compte pas."
      },
      {
        "element": "acteur",
        "couleur": "vert",
        "note": "Âge, sexe, ethnie différents = nouvelle poche d'audience (les gens achètent plus volontiers à quelqu'un qui leur ressemble)."
      },
      {
        "element": "lieu",
        "couleur": "vert",
        "note": "Changer le lieu/décor peut changer le script et l'ambiance entière."
      },
      {
        "element": "niveau_awareness",
        "couleur": "vert",
        "note": "Changer le niveau de conscience visé change presque tout le reste (script, footages)."
      }
    ],
    "video_not_an_iteration": [
      "Intervertir 1-3 plans B sur 10 sans rien changer d'autre",
      "Ajouter juste des transitions entre les mêmes plans",
      "Reformuler/paraphraser le hook en gardant le même visuel ET la même idée"
    ],
    "static_elements": [
      {
        "element": "concept",
        "couleur": "vert"
      },
      {
        "element": "angle_marketing",
        "couleur": "vert"
      },
      {
        "element": "message",
        "couleur": "vert"
      },
      {
        "element": "headline",
        "couleur": "vert",
        "note": "Attention à ne pas juste paraphraser — une headline qui cible un sous-problème différent (ex: fourches vs cheveux brillants) = vraie itération même sur la même image."
      },
      {
        "element": "acteurs_personnages",
        "couleur": "vert"
      },
      {
        "element": "lieu_decor",
        "couleur": "vert"
      },
      {
        "element": "niveau_awareness",
        "couleur": "vert"
      },
      {
        "element": "offre",
        "couleur": "orange",
        "note": "Pas un élément créatif en soi mais peut varier : 1+1 vs 2+2, prix unitaire vs prix bundle affiché."
      }
    ],
    "min_elements_changed": 3,
    "most_impactful": "hook (60-70% de la perf), puis angle_marketing",
    "rule": "Si une nouvelle créative change moins de 3 éléments vs la précédente sur le même angle, elle est vue comme quasi-doublon par Andromeda — cannibalisation au lieu de nouvelle poche d'audience.",
    "tolerance": "Même une itération trop proche d'une autre n'est PAS grave si on hésite — au pire elle ne dépense pas, ça ne tue pas les stats globales de la CBO. Mieux vaut envoyer et laisser le marché trancher que de se bloquer par sur-analyse."
  },
  "awareness_levels": [
    {
      "level": 1,
      "name": "Unaware",
      "approche": "Accroche choc / storytelling / hook curiosité → faire réaliser le problème"
    },
    {
      "level": 2,
      "name": "Problem Aware",
      "approche": "Faire découvrir qu'une solution existe — éducation, pain points"
    },
    {
      "level": 3,
      "name": "Solution Aware",
      "approche": "Montrer le produit comme LA solution — expliquer pourquoi ça marche"
    },
    {
      "level": 4,
      "name": "Product Aware",
      "approche": "Différenciation vs concurrents — USP, avis, comparatif"
    },
    {
      "level": 5,
      "name": "Most Aware",
      "approche": "Urgence, promo, nouveauté — juste une raison d'acheter maintenant"
    }
  ],
  "angle_categories": [
    "Douleur",
    "Curiosité",
    "Transformation",
    "Peur de rater",
    "Bénéfice immédiat",
    "Comparaison concurrents"
  ],
  "hook_styles": [
    "Question choc",
    "Stat surprenante",
    "Déclaration contre-intuitive",
    "Pattern interrupt visuel"
  ],
  "power_words": {
    "douleur": [
      "No more",
      "Never again",
      "Fed up with",
      "Struggling with",
      "Say goodbye",
      "Stop"
    ],
    "urgence": [
      "Today only",
      "Last chance",
      "Limited",
      "Until midnight",
      "Final sale",
      "Now"
    ],
    "confiance": [
      "Recommended by",
      "Trusted by",
      "#1",
      "Certified",
      "Award-winning",
      "Proven"
    ],
    "transformation": [
      "Boost",
      "Reduce",
      "Improve",
      "Fast",
      "Instant",
      "Get",
      "Up to",
      "Revolutionary"
    ],
    "facilite": [
      "Effortless",
      "Risk-free",
      "Hassle-free",
      "Instant",
      "No learning curve"
    ]
  },
  "headline_formula": "[Power Word] + [Pain Point] + [Contexte]",
  "copywriting_structures": [
    {
      "name": "AIDA",
      "usage": "Tout format vidéo ou statique",
      "logique": "Attention → Intérêt → Désir → Action",
      "awareness": [
        1,
        2,
        3,
        4,
        5
      ]
    },
    {
      "name": "PAS",
      "usage": "Niveau conscience 2-3 (problem aware)",
      "logique": "Problem → Agitate (enfoncer l'aiguille) → Solution",
      "awareness": [
        2,
        3
      ]
    },
    {
      "name": "BAB",
      "usage": "Before/After",
      "logique": "Before (pain) → After (dream outcome) → Bridge (le produit fait le lien)",
      "awareness": [
        2,
        3,
        4
      ]
    },
    {
      "name": "Rock Bottom",
      "usage": "UGC testimonial, Founder Story",
      "logique": "Pire moment → découverte du produit → résultat. Structure narrative la plus émotionnelle.",
      "awareness": [
        1,
        2,
        3
      ]
    },
    {
      "name": "Objection First",
      "usage": "Niveau de conscience 4 (product aware)",
      "logique": "Commencer par une objection → montrer comment la gérer → résoudre. Casse les freins à l'achat.",
      "awareness": [
        4
      ]
    },
    {
      "name": "Yes Ladder",
      "usage": "Audiences froides, niveau 1-2",
      "logique": "Enchaîner 3-5 questions auxquelles l'audience répond oui → introduire le produit logiquement",
      "awareness": [
        1,
        2
      ]
    },
    {
      "name": "Offre Irrésistible",
      "usage": "Tous niveaux — structure complète hook → CTA",
      "logique": "1. Dream Outcome (call out avatar + résultat rêvé) → 2. UMS + Time Delay (mécanisme + 'tu le sens dès le premier pas') → 3. Probabilité de réussite (preuve sociale chiffrée / autorité) → 4. Zéro effort + Risk Reversal + Urgence",
      "awareness": [
        1,
        2,
        3,
        4,
        5
      ]
    }
  ],
  "benefice_vs_feature": {
    "formule": "[Bénéfice] grâce à [Feature]",
    "regle": "La feature justifie le bénéfice mais ne le remplace pas. Les gens achètent le résultat, pas la caractéristique. Exception : marché ultra-aware où la feature EST le bénéfice connu."
  },
  "ump_ums": {
    "ump_def": "Unique Mechanism Problem — expliquer précisément d'où vient le problème pour que la personne comprenne la cause réelle et soit prête à entendre la solution.",
    "ums_def": "Unique Mechanism Solution — pourquoi CE produit fonctionne, le mécanisme qui le différencie d'une solution parmi d'autres."
  },
  "ad_copy_skeleton": [
    "Hook — les 2 premières lignes décident tout (témoignage entre guillemets / pain point direct / transformation chiffrée)",
    "Bénéfices en 3-5 check marks maximum, courts, en bénéfice pas en feature",
    "Preuve sociale ou autorité avec un chiffre",
    "Offre + urgence — en fin, jamais en début, une fois la valeur perçue construite"
  ],
  "ad_copy_max_words": 150,
  "titre_types": [
    {
      "type": "Promesse directe + délai",
      "exemple": "Dites adieu à la perte de cheveux en 3 semaines",
      "usage": "Toujours — le type le plus polyvalent"
    },
    {
      "type": "Offre chiffrée",
      "exemple": "Jusqu'à -35% sur nos packs — ce soir seulement",
      "usage": "French Days, BF, Q4, promos"
    },
    {
      "type": "Bénéfice fonctionnel simple (USP)",
      "exemple": "Soutient et stabilise vos genoux",
      "usage": "Créa minimaliste / peu de texte"
    },
    {
      "type": "Preuve sociale + chiffre",
      "exemple": "50 000 clients satisfaits — produit #1 en France",
      "usage": "Marché aware, Product Aware"
    },
    {
      "type": "Autorité",
      "exemple": "Recommandé par les podologues",
      "usage": "Niche santé, objection confiance"
    },
    {
      "type": "Question intrigante",
      "exemple": "Et si votre douleur n'était pas juste de la fatigue ?",
      "usage": "Unaware, audience froide"
    }
  ],
  "titre_complementarity_rule": "Créa chargée (vidéo explicative, statique avec texte) → titre simple (promo ou bénéfice direct). Créa minimaliste (image produit, peu de texte) → titre USP ou question qui complète. Jamais répéter dans le titre ce qui est déjà dans la créa.",
  "types_annonces": [
    {
      "type": "UGC Testimonial authentique",
      "awareness": [
        3,
        4
      ],
      "win_rate": 0.076,
      "spend_ratio": "Élevé",
      "type_media": "video",
      "cle": "Pas de production parfaite — lumière naturelle imparfaite, structure avant/après, manque de perfection = confiance."
    },
    {
      "type": "Founder Story",
      "awareness": [
        1,
        2
      ],
      "win_rate": null,
      "spend_ratio": "Élevé quand scale",
      "type_media": "video",
      "cle": "Format dominant 2026. Connexion humaine, vulnérabilité, le pourquoi avant le quoi. Ne vend pas — crée la connexion. 60-120s, facecam simple."
    },
    {
      "type": "Ugly Ads",
      "awareness": [
        1,
        2,
        3
      ],
      "win_rate": null,
      "spend_ratio": "Moyen",
      "type_media": "video",
      "cle": "Délibérément low-fi, ressemble à de l'organique (= équivalent 'native'). Script doit être excellent car rien ne masque les faiblesses."
    },
    {
      "type": "US vs DM (comparaison)",
      "awareness": [
        3
      ],
      "win_rate": null,
      "spend_ratio": "Moyen",
      "type_media": "video",
      "cle": "Comparaison directe sans nommer le concurrent. Différenciateurs réels et tangibles."
    },
    {
      "type": "Before/After + Social Proof",
      "awareness": [
        3,
        4
      ],
      "win_rate": null,
      "spend_ratio": "Moyen",
      "type_media": "flexible",
      "cle": "Spécificité des résultats (chiffres précis), représentativité du profil, honnêteté sur le doute initial. Vidéo ou carousel image."
    },
    {
      "type": "Offer First (BOFU)",
      "awareness": [
        5
      ],
      "win_rate": 0.09,
      "spend_ratio": "30% du spend total",
      "type_media": "flexible",
      "cle": "Urgence/rareté/nouveauté dès les 3 premières secondes. Clarté absolue en <2s. Non optionnel dans le mix."
    },
    {
      "type": "Unboxing",
      "awareness": [
        3,
        4
      ],
      "win_rate": 0.1,
      "spend_ratio": "Moyen-élevé",
      "type_media": "video",
      "cle": "Sous-exploité — peu de concurrents le font malgré la performance. Ouverture du colis, première impression."
    },
    {
      "type": "Réponses aux Objections",
      "awareness": [
        4
      ],
      "win_rate": null,
      "spend_ratio": "Moyen",
      "type_media": "video",
      "cle": "Facecam simple. Identifier les vraies objections (avis, SAV, Q&A). Reconnaître quand l'objection est légitime."
    },
    {
      "type": "Text-based Lettre",
      "awareness": [
        1,
        2,
        3
      ],
      "win_rate": null,
      "spend_ratio": "Très élevé quand ça marche",
      "type_media": "image",
      "cle": "Ultra sous-utilisé — aucune image/vidéo, juste du texte (= équivalent 'native'). Format le moins saturé."
    },
    {
      "type": "Creator Partnership",
      "awareness": [
        1,
        2,
        3
      ],
      "win_rate": null,
      "spend_ratio": "Élevé quand scale",
      "type_media": "video",
      "cle": "Diffusé depuis le compte créateur, pas la marque — favorisé algorithmiquement par Meta."
    }
  ],
  "types_annonces_priorite": "Chercher les créas avec BON win rate ET gros spend ratio quand elles gagnent — les vraies anomalies. Un bon win rate qui ne spend pas beaucoup est moins intéressant qu'un win rate correct qui explose en spend.",
  "note_native": "Pas de catégorie 'Native' séparée dans ce SOP — Ugly Ads et Text-based Lettre jouent ce rôle (ressemblent à du contenu organique). Ne pas inventer de catégorie supplémentaire.",
  "static_formats": [
    {
      "format": "Bullet Point flèches",
      "desc": "Bénéfices listés avec flèches visuelles. Très fort en chaussures/orthopédie."
    },
    {
      "format": "Bullet Point nombreux (5-8+)",
      "desc": "Beaucoup de bullet points, parfois 'ce que ça apporte' + 'ce que ça retire'."
    },
    {
      "format": "Bullet Point tout-texte",
      "desc": "Texte noir sur fond blanc, aucune headline, juste des points. Sous-estimé mais a généré des millions de vues."
    },
    {
      "format": "Bullet Point classique",
      "desc": "Headline + produit + bullets numérotés ou non."
    },
    {
      "format": "Split Problème/Solution explicite",
      "desc": "Deux zones étiquetées 'Problème' et 'Solution'."
    },
    {
      "format": "Split Problème/Solution implicite",
      "desc": "Même structure sans les mots explicites — juste le visuel + headline."
    },
    {
      "format": "Avant/Après narratif",
      "desc": "JAMAIS écrire 'avant/après' littéralement (risque de suppression Meta) — phraser en narratif ('Moi en 2024... moi en 2025...'). Peut être en 3 phases."
    },
    {
      "format": "Split + bénéfice mis en avant",
      "desc": "Bénéfices listés d'un côté, produit en action de l'autre."
    },
    {
      "format": "US vs Eux (comparaison)",
      "desc": "2 ou 3 colonnes. Ne jamais mettre 100% rouge chez le concurrent (rester crédible) — le vôtre nettement meilleur mais pas caricatural."
    },
    {
      "format": "Social proof Trustpilot",
      "desc": "1 à 3 avis Trustpilot affichés directement."
    },
    {
      "format": "Multi-avis stylisés",
      "desc": "Commentaires Facebook, conversation iMessage/WhatsApp simulée, avis 'acheteur vérifié' avec photo, format story Insta réutilisé."
    },
    {
      "format": "Offre en avant",
      "desc": "Vente secrète, 1+1 offert, bundle façon sélecteur du site, offre saisonnière contextualisée."
    },
    {
      "format": "Garantie/remboursement",
      "desc": "'Résultat en 2 minutes ou on vous rembourse' — promesse forte + risk reversal."
    },
    {
      "format": "Manuscrit/Post-it/Liquidation",
      "desc": "Papier/cahier manuscrit ou imprimé, post-it sur photo produit, fausse liquidation de stock ('Nous fermons')."
    },
    {
      "format": "Body-writing",
      "desc": "Texte écrit/incrusté directement sur une partie du corps pour localiser la douleur/bénéfice. Attention zones corporelles (risque policy nudité) — privilégier pieds/mains."
    },
    {
      "format": "Texte long façon lettre",
      "desc": "Pavé de texte, façon post Facebook organique, message fondateur, ou article de blog avec 'lire plus' → landing page."
    },
    {
      "format": "Produit simple",
      "desc": "Juste une photo produit propre. Fonctionne en fashion ou comme créative de rafraîchissement dans une CBO."
    },
    {
      "format": "Phrases barrées",
      "desc": "Lister les problèmes et les barrer ('Trop serré, c'est fini.')."
    },
    {
      "format": "Format iPhone",
      "desc": "Note iPhone (clair/sombre), popup de notification, AirDrop, écran iPad."
    },
    {
      "format": "Capture Google factice",
      "desc": "Reproduire visuellement une recherche Google avec le produit en résultat."
    },
    {
      "format": "Dessin IA",
      "desc": "Illustration au lieu d'une photo réelle — utile pour produits 'touchy' (zones corporelles intimes) où une vraie photo risquerait un refus Meta."
    },
    {
      "format": "Collage multi-variantes",
      "desc": "Plusieurs couleurs/contextes d'usage du même produit affichés ensemble — lève des objections spécifiques par contexte."
    },
    {
      "format": "Statistiques chiffrées",
      "desc": "Un chiffre fort mis en avant ('97% efficace après 4 semaines', '98.8% recommandent la marque')."
    },
    {
      "format": "Éléments visuels symboliques",
      "desc": "Icônes superposées (flammes=chaleur, flocon=froid, marteau=résistance) pour faire passer un message sans texte."
    }
  ],
  "static_selection_criteria": "Win rate minimum pour juger un produit 'statique friendly' : tester au moins 70 statiques, viser 7%+ de win rate (statique qui a dépassé le testing et dépensé 500-700€+ en scaling). 3 sources : (1) itérer sur les statiques GAGNANTES des concurrents, (2) veille générale tous secteurs des concepts statiques qui performent (peu importe la niche d'origine), (3) itérer sur VOS propres statiques gagnantes (changer 3-6 éléments).",
  "product_page_readiness": "Avant de pousser du volume statique/native, vérifier que la page produit porte elle-même painpoints/bénéfices/preuve sociale/objections — sinon les statiques 'ne marchent pas' simplement parce que la page (contrairement à une vidéo qui éduque déjà) ne finit pas le travail de persuasion. Utiliser les données déjà scrapées du site (Bloc 4) comme diagnostic.",
  "video_mashup_types": [
    {
      "type": "Voix off + b-roll",
      "desc": "Classique. La voix guide/appuie les points, empile les preuves rapidement. Coût de production quasi nul (récupération + assemblage)."
    },
    {
      "type": "Sous-titres + b-roll SANS voix off",
      "desc": "Pour audiences en lieu public/bruyant (transports). Meta adapte le format diffusé au contexte de la personne."
    },
    {
      "type": "Voix off SANS sous-titres",
      "desc": "Pour audiences posées chez elles, qui peuvent écouter."
    },
    {
      "type": "Diaporama image",
      "desc": "Séquence d'images (peut être 100% généré IA) avec storytelling, souvent combiné à une trame Founder Story. Sous-exploité."
    }
  ],
  "video_mashup_script_method": "Transcrire le script d'une pub gagnante (même hors niche) via outil de transcription, le donner à Claude avec : le produit complet, la marketing research, la langue/audience cible. Demander de répliquer le MÊME framework narratif sur le nouveau produit — jamais copier le texte, toujours réadapter. Framework universel détecté : Hook/choc → Bénéfices/painpoints → Témoignage (~70% de la vidéo, pour rassurer) → Réassurance/Trust (avis, '+ de X avis positifs') → Offre + urgence.",
  "video_concept_catalog": [
    "Mashup voix-off+b-roll",
    "Mashup sans voix (sous-titres seuls)",
    "Mashup sans sous-titres (voix seule)",
    "Diaporama image storytelling",
    "Founder Story (storyteller, vulnérabilité, le pourquoi avant le quoi)",
    "Témoignage micro-trottoir (interview courte, même 5s)",
    "Podcast clip réutilisé",
    "EGC (Employee Generated Content)",
    "VSL (Video Sales Letter)",
    "Discréditer les concurrents (sans les nommer)",
    "X raisons pourquoi (listicle, ex: '3 raisons')",
    "Utiliser l'autorité indirectement (ex: 'mon orthopédiste m'a recommandé')",
    "Démonstration produit"
  ],
  "video_diversity_warning": "Varier le TYPE de mashup (voix-off / sans voix / diaporama / founder story) sans varier l'angle/le message sous-jacent n'est PAS de la vraie diversité — c'est tourner en rond sur le même angle avec un emballage différent. La diversité de fond (angle, message, sous-segment d'audience) prime toujours sur la diversité de forme (format du mashup).",
  "script_value_equation": {
    "source": "Kahel — opérationnalise l'équation de valeur d'Hormozi pour un script e-commerce.",
    "formule": "Value = (Dream Outcome × Perceived Likelihood) / (Time Delay × Effort & Sacrifice)",
    "principe": "Maximiser le numérateur, minimiser le dénominateur. 4 principes universels, pas un template à recopier — s'adaptent à tout marché, ce qui change vraiment c'est le niveau de sophistication du marché et l'awareness du prospect.",
    "variables": [
      {
        "nom": "Dream Outcome",
        "ou": "Hook — 2-3 premières secondes",
        "regle": "Doit faire 2 choses en même temps : call out l'audience + projeter le résultat rêvé. Construit à partir du VERBATIM CLIENT RÉEL, jamais inventé.",
        "formule_hook": "[Call out audience] + [Dream outcome concret] + [introduction produit qui suggère zéro effort]",
        "exemple": "Tu bosses 12h debout ? Imagine finir ta journée sans douleur, juste en changeant tes chaussures.",
        "sources_verbatim": [
          "Questionnaire post-achat — 'Qu'est-ce qui vous a convaincu ?' (sous-exploité par 90% des shops)",
          "Commentaires Facebook sous les ads — prospects chauds, objections brutes",
          "Reviews Amazon sur produits similaires — les avis 1, 3 et 5 étoiles disent tout",
          "Reddit / Quora — prospects plus froids, douleurs sans filtre"
        ]
      },
      {
        "nom": "Perceived Likelihood",
        "ou": "Après le hook — crédibiliser la promesse",
        "regle": "Un bon Dream Outcome ne suffit pas ('ok mais ça ne marchera pas sur moi'). Choisir UN SEUL des 3 leviers ci-dessous par créative — jamais les empiler.",
        "leviers": [
          {
            "nom": "Test social segmenté",
            "exemple": "On a fait essayer le produit à 100 [avatar précis] qui utilisent déjà [alternative]. 92 ont dit : ça n'a rien à voir.",
            "effet": "Reconnaissance de soi + anticipation de l'objection 'c'est mieux que ce que j'ai déjà'."
          },
          {
            "nom": "Effet bandwagon",
            "exemple": "Plus de 10 000 [avatar] nous ont fait confiance et nous ont noté 4.2 sur Trustpilot.",
            "effet": "Volume + audience spécifique + autorité de plateforme."
          },
          {
            "nom": "Figure d'autorité (le plus puissant)",
            "exemple": "Des milliers de [figure d'autorité du secteur] recommandent désormais notre produit à leurs patients/clients.",
            "effet": "Crédibilité maximale — choisir la figure pertinente pour la niche (podologue pour chaussures, dermato pour skincare)."
          }
        ]
      },
      {
        "nom": "Time Delay",
        "ou": "Après la crédibilisation — minimiser l'attente perçue",
        "regle": "Plus le délai perçu est faible, plus la valeur perçue explose. Réponse médiocre = 'résultats en 2 mois' (le prospect scroll). Réponse forte = immédiate ('dès le premier pas'). C'est ici qu'on introduit l'UMS nommé.",
        "structure_ums": [
          "Un nom qui sonne scientifique/technique (ex: 'OrthoRelief')",
          "Une explication spécifique du mécanisme qui justifie la promesse",
          "Un délai explicite qui casse l'objection 'ça va prendre du temps'"
        ],
        "exemple": "Le secret c'est [UMS nommé]. Il [bénéfice mécanique spécifique]. Dès le premier [usage]."
      },
      {
        "nom": "Effort & Sacrifice",
        "ou": "CTA final — casser le risque restant",
        "regle": "Dernière barrière : 'et si ça ne marche pas pour moi ?'. Montrer zéro effort, zéro sacrifice, zéro risque. 3 composants obligatoires dans le CTA.",
        "composants": [
          "Zéro effort (ex: 'juste en les enfilant' — aucune routine/discipline à mettre en place)",
          "Risk reversal explicite (garantie remboursement claire, sans question)",
          "Urgence/rareté (stock limité, offre qui expire) — 90% des CTA qui scalent en utilisent"
        ],
        "exemple": "Si tu ne sens pas de vrai soulagement dès le premier jour, tu as 30 jours pour le renvoyer gratuitement, sans question. Profite de l'offre [X], les stocks fondent vite."
      }
    ]
  },
  "native_ads": {
    "definition": "Une pub qui ne ressemble pas à une pub — ressemble à un témoignage, un post organique, une note iPhone, un commentaire, une conversation. Contourne le filtre anti-pub du cerveau parce qu'il ne la catégorise pas comme telle.",
    "mecanique_attention": "L'image se scanne en 1 seconde (volontairement non-éditée, pas d'esthétisme recherché) — l'attention va donc directement vers l'ad copy, qui doit être soit très court soit très long, rarement entre les deux.",
    "formats": [
      {
        "nom": "Post Facebook organique réutilisé",
        "desc": "Reprendre le fond visuel d'un vrai post Facebook organique — sentiment de contenu non-publicitaire."
      },
      {
        "nom": "Note iPhone",
        "desc": "Capture d'une note iPhone, claire ou sombre — a quelque chose d'intime, 'écrit pour soi à 23h'."
      },
      {
        "nom": "Conversation WhatsApp/iMessage",
        "desc": "Une amie partage une découverte à une autre, qui hésite, la première convainc avec des détails — résultat visible, CTA naturel."
      },
      {
        "nom": "Témoignage long forme",
        "desc": "800-1500 mots, narration à la première personne, le produit n'apparaît qu'au tiers ou à la moitié du texte. Meilleur CVR sur cold traffic quand bien écrit."
      }
    ],
    "categories_visuelles": [
      {
        "nom": "Painpoint brut",
        "desc": "Photo non-éditée façon post Reddit — double menton, pieds gonflés, vêtement froissé. Le problème quotidien montré naturellement."
      },
      {
        "nom": "Pattern interrupt",
        "desc": "Image délibérément 'WTF'/intrigante qui casse le scroll (objet incongru, photo à l'envers qui reste compréhensible, disposition confuse du produit)."
      },
      {
        "nom": "Post-it/manuscrit",
        "desc": "Respecte quand même les codes d'une bonne statique (rouge pour headline, jaune pour mot clé) malgré le visuel organique."
      },
      {
        "nom": "Produit en contexte",
        "desc": "Le contexte suggère le bénéfice/USP SANS l'écrire (lunettes en montagne = protection soleil ; complément + tenue de sport = avatar qualifié)."
      },
      {
        "nom": "Dream outcome",
        "desc": "Montrer directement le résultat aspirationnel (personne âgée fit, souriante, bien dans sa peau) → déclenche 'pourquoi pas moi'."
      },
      {
        "nom": "Avatar seul",
        "desc": "Juste montrer la personne-cible, souriante — tout le travail de qualification se fait dans l'ad copy."
      }
    ],
    "patterns_copy": [
      {
        "nom": "Témoignage personnel authentique",
        "desc": "Ton conversationnel, vulnérabilité, pas surjoué, verbatim client. Ouvertures type 'Mon mari m'a dit, je ne poste jamais ça...'. Très fort chez les audiences seniors (femmes 50+)."
      },
      {
        "nom": "Émotion forte",
        "desc": "Frustration, peur, joie mises en avant explicitement. TESTER LARGE d'abord (5-10-15 créas par émotion, jamais 2-3) avant d'itérer sur celles qui marchent."
      },
      {
        "nom": "Problème en premier",
        "desc": "Choisir un problème à forte prévalence (touche beaucoup de monde) pour que la créa scale. Peut se combiner avec une auto-qualification de l'avatar ('je l'ai vécu en tant que femme de 45 ans')."
      },
      {
        "nom": "Autorité scientifique/médicale",
        "desc": "Médecin, podologue, physio, 'FDA approved' — syndrome de la blouse blanche, rassure massivement. Peut aussi citer les ingrédients de façon quasi-scientifique."
      },
      {
        "nom": "Garantie/Risk reversal",
        "desc": "Money-back 30-90 jours, livraison gratuite, retour sans question. À utiliser souvent (pas sur 100% des créas) — pattern gagnant très récurrent. Couvre aussi la levée d'objections classiques (taille, qualité)."
      },
      {
        "nom": "Transformation",
        "desc": "Avant/après même non-visuel — peut être émotionnel/ressenti, pas seulement physique."
      }
    ],
    "structure_universelle": "Problème (callout) → Agitation → Introduction produit → Bénéfices/soulagement → Garantie en fin de copie. Doit contenir : émotion (captive), évidence (convertit — autorité médicale particulièrement efficace), curiosité (mécanisme 'oublié'/'recette de grand-mère' = UMS qui existe déjà mais a été oublié).",
    "outil_recommande": "Récupérer des dizaines d'ad copies gagnantes (boards par catégorie), les donner à Claude pour identifier les patterns, puis fournir les ressources de marque (objections, commentaires clients, scripts gagnants, painpoints, dream outcomes) et demander d'adapter les patterns à la marque — jamais reprendre le texte tel quel, toujours reformuler.",
    "garde_fou_originalite": "Vérifier que la créative générée ne reproduit jamais une créa concurrente à un niveau quasi-identique (risque légal/éthique) — s'assurer que Claude s'inspire du PATTERN, pas du texte verbatim d'un concurrent.",
    "redirection": "Pas obligatoire de rediriger vers un advertorial/listicle — une bonne image native + bon copy vers la page produit directe fonctionne très bien aussi. Mais si le compte tourne surtout en vidéo, la page produit doit être retravaillée (gifs, preuve sociale, avant/après, structure AIDA) pour que les statiques/natives décollent — la vidéo éduque déjà, l'image statique a besoin que la page finisse le travail."
  },
  "titre_ad_copy_insights": [
    "Un titre ne doit porter qu'UN SEUL levier : angle, offre, émotion OU curiosité — jamais mélangés.",
    "Titre compris en 2 secondes — court, sans virgule, sans explication complexe.",
    "Règle de complémentarité (la plus importante) : regarder la créative d'abord, se demander ce qui manque — le titre doit combler ce vide, jamais répéter ce qui est déjà visible. Créa chargée → titre simple. Créa minimaliste → titre USP/question.",
    "Check marks utilisés dans 80% des ads gagnantes analysées — standard du marché, 3 à 5 maximum, bénéfices pas features.",
    "L'offre va en FIN d'ad copy (près du CTA), jamais en début — contrairement au titre qui peut la mettre en avant directement. Construire la valeur perçue avant de révéler l'offre+urgence.",
    "Pattern surprenant mais validé : l'humour/ton décalé fonctionne dans les hooks d'ad copy si le ton de marque le permet (ex: 'My mom said cellulite forever. I proved her wrong.')."
  ],
  "scaling_personas_prompt": "Mon produit est [X]. Ma cible large validée est [démographie + comportement]. Mes winners actuels parlent à [avatar actuel]. Génère 5 nouveaux personas ultra-précis issus de cette cible large. Pour chaque persona : (1) description précise, (2) ce qu'elles ont déjà essayé sans succès, (3) le sentiment profond que leur procure le problème, (4) le résultat concret et spécifique recherché, (5) le hook exact à tester, (6) le niveau de conscience visé. Priorise les personas les plus distincts de ceux déjà testés.",
  "business_stage_rules": {
    "note": "Phase business (CA cumulé), distincte de campaign.asl_phase (TESTING/OPTI/SCALING qui suit un seul cycle J1/J2/J4). Réglable par l'utilisateur dans Réglages — Prométhée ne peut pas la déduire seul sans connaître le CA réel cumulé.",
    "stages": [
      {
        "id": "testing_0_1kd",
        "label": "Testing — 0 à 1KD de CA cumulé",
        "approche": "Copier le concurrent bête et méchant. Reprendre l'angle, le format ET le funnel déjà validés par la concurrence observée (Bloc 4). Ne pas inventer de nouvel angle. Traduire, envoyer, observer.",
        "marketing_research": false
      },
      {
        "id": "opti_1kd_traction",
        "label": "Opti — 1KD+ avec traction",
        "approche": "50% traduction créas concurrent + 50% début de marketing research (angles, messages, painpoints) — diversité progressive.",
        "marketing_research": "partial"
      },
      {
        "id": "scaling_1kd_stable",
        "label": "Scaling — 1KD+ stable",
        "approche": "Marketing research complète : tous les angles, UMP/UMS, verbatim client, personas. Arrêter de traduire le concurrent — créer avec sa propre data.",
        "marketing_research": true
      }
    ]
  },
  "diagnostic_formula": {
    "name": "Volume x Diversité x Qualité x Analyse x Double Down",
    "note": "Multiplicateur — si une variable est à 0, le résultat est 0. La question hebdo qui compte : combien de winners sortis cette semaine — pas le win rate.",
    "loi_8_pourcent": "8% des créatives sont winners (60% du spend), 40% midrange (26% du spend), 52% perdantes (14% du spend, données d'apprentissage). Pour 8 winners il faut ~100 créas testées. Mesurer le NOMBRE de winners, pas le pourcentage."
  }
}

app.get('/api/sop', (req, res) => {
  try {
    if (!fs.existsSync(SOP_PATH)) {
      fs.writeFileSync(SOP_PATH, JSON.stringify(SOP_DEFAULT, null, 2))
      return res.json(SOP_DEFAULT)
    }
    const raw = fs.readFileSync(SOP_PATH, 'utf8')
    res.json(JSON.parse(raw))
  } catch (e) {
    res.status(500).json({ error: 'lecture sop.json échouée : ' + e.message })
  }
})

app.post('/api/sop', (req, res) => {
  try {
    const body = req.body
    if (!body || typeof body !== 'object' || !body.win_rates || !body.rules_p4) {
      return res.status(400).json({ error: 'SOP invalide : win_rates et rules_p4 sont requis' })
    }
    body.updated_at = new Date().toISOString()
    fs.writeFileSync(SOP_PATH, JSON.stringify(body, null, 2))
    res.json(body)
  } catch (e) {
    res.status(500).json({ error: 'écriture sop.json échouée : ' + e.message })
  }
})

/* ── SAUVEGARDE DES CRÉATIVES GÉNÉRÉES (fichiers locaux, pas de base64 en localStorage) ──
   Le serveur télécharge lui-même l'asset distant (fal.ai/Higgsfield) et l'écrit dans ./creatives/.
   Nommage : <product_id>__<creative_id>.<ext> → traçabilité directe par le nom de fichier.
   Servi automatiquement par app.use(express.static('.')) à /creatives/<fichier>. */
app.post('/api/save-creative', async (req, res) => {
  try {
    const { url, ext, name } = req.body
    if (!url || !ext || !name) return res.status(400).json({ error: 'url, ext et name requis' })
    const safeName = String(name).replace(/[^a-zA-Z0-9_-]/g, '_')
    const dir = path.join(__dirname, 'creatives')
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    const r = await fetchNative(url)
    if (!r.ok) return res.status(502).json({ error: 'téléchargement asset échoué : HTTP ' + r.status })
    const buf = Buffer.from(await r.arrayBuffer())
    const filename = safeName + '.' + ext
    fs.writeFileSync(path.join(dir, filename), buf)
    res.json({ path: '/creatives/' + filename })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

/* ── PROXY SCRAPER SITE ── */
app.get('/api/scrape', async (req, res) => {
  try {
    const url = req.query.url
    const r = await fetchNative(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`)
    const data = await r.json()
    res.json(data)
  } catch(e) {
    res.status(500).json({ error: e.message })
  }
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`Promethee server running → http://localhost:${PORT}`)
})
