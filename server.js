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
  "version": 5,
  "updated_at": "2026-06-22",
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
    "tolerance": "Même une itération trop proche d'une autre n'est PAS grave si on hésite — au pire elle ne dépense pas, ça ne tue pas les stats globales de la CBO. Mieux vaut envoyer et laisser le marché trancher que de se bloquer par sur-analyse.",
    "iteration_priority_order": [
      "1. Hook (~80% du focus — le plus gros levier de perf)",
      "2. Body + CTA ensemble (jamais le CTA seul, en gardant le hook winner)",
      "3. Content creator (si une créatrice convertit, lui donner plusieurs scripts/angles)",
      "4. Format (un angle winner en statique doit être testé en mashup/UGC/shortform et vice-versa — ouvre une nouvelle audience)"
    ],
    "methode_3i": {
      "source": "Kahel/Luma — méthode des 3i (Inspiration, Itération, Idéation), pilier de scaling créatif.",
      "seuil_avant_iteration": "Ne jamais itérer une créative tant qu'elle n'a pas au moins 12 'spins' (cycles de spend) avec un bon ROAS — avant ce seuil, la créative n'a pas encore fait ses preuves, ce n'est pas une vraie winner.",
      "2_types_iteration": {
        "isolee": "On modifie UNE seule chose (hook, avatar, angle, format ou concept). À privilégier une fois qu'une grosse winner confirmée dure dans le temps et maintient son ROAS — on isole variable par variable pour la décortiquer et la multiplier méthodiquement.",
        "big_swing": "On change beaucoup d'éléments en gardant l'ADN de la winner (comprendre l'essence profonde de ce qui fonctionne, s'inspirer sans trop s'éloigner). Utile en early phase pour tester large façon entonnoir, avant de passer à l'isolation fine sur les vraies grosses winners."
      },
      "ordre_isolation_priorite": [
        "1. Hook — impact le plus fort, n'a rien à voir avec le CTA",
        "2. Angle marketing (ex: passer de 'fasciite plantaire' à 'hallux valgus' sur le même produit chaussure)",
        "3. Avatar — sexe/âge/ethnie (changer d'ethnie suppose un TAM suffisant dans le pays ciblé pour que ça vaille le coup)",
        "4. Format (statique↔mashup↔VSL↔shortform)",
        "5. Painpoint / Dream outcome",
        "6. CTA — itéré EN DERNIER, jamais isolé en premier"
      ],
      "note_cumul_leviers": "Pas obligé de changer un seul levier à la fois — dépend du bon sens e-commerçant. Changer le niveau d'awareness entraîne souvent aussi un changement de script, voire de lieu de tournage.",
      "case_study_steppers": "2 créas, même script/audience/message/durée — SEUL changement : hook + footage (b-rolls et editing différents, même angle/structure). Résultat : quasi doublement de la perf (3M vs 2M impressions) juste en changeant le footage. Preuve que même sans changer la stratégie, le visuel seul peut faire basculer une créa.",
      "tactique_prix_clickbait": "Sur une offre bundle (ex: 1+1 à 50€), afficher dans la créative un prix unitaire 'réel' plus bas (ex: 24,99€) même si pas 100% exact vs la page produit — assez fort pour du clickbait, convertit quand même une fois sur la PDP car c'est le produit qui intéresse. Idem pour un pack de compléments (60 gélules à 30€ → afficher '0,49€ la gélule'). Pattern interrupt par le prix qui touche une frange d'audience sensible au prix — à utiliser avec discernement, cohérence minimum requise avec l'offre réelle."
    }
  },
  "awareness_levels": [
    {
      "level": 1,
      "name": "Unaware",
      "approche": "Accroche choc / storytelling / hook curiosité → faire réaliser le problème",
      "sub_niveaux": [
        "1A — Totalement aveugle : ne ressent même pas la gêne. Nécessite un pattern interrupt fort (visuel choc, hook controversé).",
        "1B — Ressent quelque chose mais ne l'a pas nommé : mettre un mot précis sur ce qu'il vit (ex: 'Tu as cette sensation au matin ? Ça s'appelle le brain fog matinal.')."
      ]
    },
    {
      "level": 2,
      "name": "Problem Aware",
      "approche": "Faire découvrir qu'une solution existe — éducation, pain points",
      "sub_niveaux": [
        "2A — Vaguement conscient ('je crois que je dors pas top') : nommer précisément la douleur pour qu'il la prenne au sérieux.",
        "2B — Clairement conscient mais passif ('je sais que je dors mal, mais bon') : amplifier les conséquences à long terme.",
        "2C — Conscient et frustré ('putain j'en peux plus') : il est mûr, on peut pitcher directement la catégorie de solution."
      ]
    },
    {
      "level": 3,
      "name": "Solution Aware",
      "approche": "Montrer le produit comme LA solution — expliquer pourquoi ça marche",
      "sub_niveaux": [
        "3A — Découvre les solutions, 0 préférence : pousser sa catégorie sans avoir à disqualifier les autres.",
        "3B — Hésite entre 2-3 catégories : disqualifier les concurrents de catégorie.",
        "3C — A déjà une catégorie préférée mais pas convaincu : peut jumper direct au niveau Product-aware."
      ]
    },
    {
      "level": 4,
      "name": "Product Aware",
      "approche": "Différenciation vs concurrents — USP, avis, comparatif",
      "sub_niveaux": [
        "4A — Découvre la catégorie, browse les marques, croyance neutre : poser le mécanisme unique + différencier, suffisant pour faire pencher avant qu'il regarde ailleurs.",
        "4B — A shortlisté 2-3 marques, compare activement (reviews, prix, ingrédients, forums) : disqualifier les concurrents spécifiques qu'il regarde, copy comparison-style ('pourquoi nous vs eux').",
        "4C — A décidé la catégorie mais hésite à passer à l'achat, freiné par UNE objection précise (prix / doute claims / peur de se faire avoir / timing) : lever cette objection précise avec la stratégie qui matche (faits, reversal, 'parce que', garantie risk-free)."
      ]
    },
    {
      "level": 5,
      "name": "Most Aware",
      "approche": "Urgence, promo, nouveauté — juste une raison d'acheter maintenant",
      "sub_niveaux": [
        "5A — A vu les ads plusieurs fois, hésite, manque une raison de basculer : empiler urgence + social proof massive + bonus.",
        "5B — Convaincu, attend juste une promo : plus besoin d'arguer, balancer l'offre direct.",
        "5C — Convaincu mais friction technique (a abandonné le checkout) : résoudre la friction précise (livraison, paiement, garantie) — retargeting checkout-abandoned."
      ]
    },
    {
      "level": 6,
      "name": "Customer-aware",
      "approche": "Le prospect a DÉJÀ acheté un produit de la catégorie (chez toi ou un concurrent) — il sort définitivement de la pyramide Schwartz classique. Son rapport à la catégorie n'est plus théorique, il est expérientiel (preuve dans son corps/sa vie). Copy radicalement différent : on ne convainc plus quelqu'un qui n'a jamais essayé, on parle à quelqu'un qui juge à travers le filtre de sa propre expérience. Stage que ni Schwartz ni 99% des formations n'enseignent — il pèse ~60% du profit en e-com 2026 si exploité (l'audience grossit mécaniquement avec le spend cumulé).",
      "detection": "Jamais deviner — détecter via : commentaires sous les ads ('j'ai essayé X et ça marche pas'), questionnaires post-achat ('qu'est-ce qui t'a empêché d'acheter avant ?'), SAV (objections récurrentes = stage raté).",
      "sub_niveaux": [
        "6A — Acheté chez TOI, expérience positive : c'est ton actif/fan. Job = retention, repeat, upsell, referral, advocacy. Canal privilégié : email (moins coûteux que ads). Ex: 'Tu as adoré le X. Voilà ce qu'on a créé spécifiquement pour les clients comme toi.'",
        "6B — Acheté chez TOI, expérience négative : c'est ton poison. Adresser explicitement la déception (ne pas fight, reposer). Canal privilégié : email. Ex: 'On a entendu ton retour. Voilà ce qu'on a changé.'",
        "6C — Acheté chez un CONCURRENT, expérience positive : loyaliste concurrent, le plus dur à convertir. Donner une raison NOUVELLE de switcher (un mécanisme que le concurrent n'a pas), jamais juste 'on est mieux'. Ex: 'Tu utilises [marque X] et tu en es content ? Voilà ce que [marque X] ne fait pas (et que nous on fait).'",
        "6D — Acheté chez un CONCURRENT, expérience moyenne (le sweet spot) : il pense que la catégorie fonctionne un peu, pas assez pour être satisfait. Montrer une différence dramatique. Ex: 'Tu as essayé X. Ça aide. Mais voilà pourquoi notre version va 3x plus loin.'",
        "6E — Acheté chez un CONCURRENT, expérience négative : croyance négative ciblée sur LA marque essayée (pas la catégorie). Réassigner la cause à un détail spécifique de cette marque. Ex: 'Tu as essayé X et c'est resté pareil. Voilà la VRAIE raison pour laquelle X a échoué, et ce qu'on fait différemment.'",
        "6F — Acheté PLUSIEURS marques de la catégorie, tout a échoué : croyance hyper-négative qui contamine toute la catégorie. Le seul move qui marche : changer la catégorie mentale ('pas un meilleur probiotique' mais 'une approche radicalement différente'). Ex: 'Tu as essayé 3 probiotiques et tout a échoué ? Le problème n'est pas les probiotiques, c'est qu'ils ne survivent pas à ton acide gastrique.'"
      ],
      "hook_exemple_most_vs_customer": "Most-aware : '40% off, aujourd'hui seulement.' / Customer-aware : 'Tu as eu une mauvaise expérience avec ce produit. Voilà pourquoi cette fois c'est différent.' — Ce sont deux audiences différentes, deux copy différents, ne jamais confondre."
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
    "Hidden Fear (peur cachée — tout le monde la partage, personne n'en parle)",
    "Hidden Desire (désir caché — plus puissant que la peur sur beauté/lifestyle/transformation)",
    "Did You Know (curiosité brute — stat choc ou fait insolite, la plus polyvalente)",
    "Debate (force le prospect à choisir un camp dans sa tête, l'engage avant même le body)",
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
    "name": "Volume x Diversité x Qualité x Feedback Loop x Double Down",
    "source": "Kahel (Luma) — système qui fait tourner des comptes à 1M+$/mois de manière stable, pas un framework théorique.",
    "principe": "C'est un MULTIPLICATEUR, pas une addition. Si une seule variable est à 0, le résultat est 0. La plupart des shops en ont 2-3 maximisées (et encore) — c'est pour ça qu'ils stagnent.",
    "note": "La question hebdo qui compte : combien de winners sortis cette semaine — pas le win rate.",
    "exercice_audit": "Noter chaque variable de 0 à 3 et multiplier. Ce qui est proche de zéro, c'est là qu'il faut travailler.",
    "loi_8_pourcent": "8% des créatives sont winners (60% du spend), 40% midrange (26% du spend), 52% perdantes (14% du spend, données d'apprentissage). Pour 8 winners il faut ~100 créas testées. Mesurer le NOMBRE de winners, pas le pourcentage.",
    "variables": [
      {
        "nom": "1. Volume",
        "principe": "Impossible de prédire une winneuse, c'est un jeu de probabilités — plus on teste, plus on en trouve. Étude Motion 2026 sur 578 750 créatives : les shops qui trouvent des winneuses lancent 3x plus de créatives que les autres. Ce n'est pas un hasard, c'est le dénominateur commun de tous ceux qui scalent.",
        "diagnostic": "5 créatives/semaine et aucune winneuse trouvée = problème de volume. Mais le volume seul ne suffit pas (90% des shops se plantent ici)."
      },
      {
        "nom": "2. Diversité",
        "principe": "20 créatives identiques (même format, même concept, même angle, même avatar) = 1 SEULE hypothèse testée 20 fois, pas 20 hypothèses. La diversité = couvrir large sur différents angles marketing, avatars, niveaux d'awareness, leviers psychologiques, formats (UGC/mashup/VSL/shortform/static), concepts (before-after/testimonial/founder/démo/unboxing).",
        "diagnostic": "Chaque combinaison ouvre une poche d'audience différente avec son propre TAM, et chaque poche peut contenir la prochaine super winneuse. Tester la même chose 50 fois sans comprendre pourquoi ça ne scale pas = problème de diversité, pas de volume."
      },
      {
        "nom": "3. Qualité",
        "principe": "50 créatives/semaine avec diversité parfaite mais message mauvais = volume élevé, zéro winneuse, juste du bruit. La qualité n'est PAS la production (4K, transitions, motion design) — c'est la qualité du MESSAGE, qui vient d'un seul endroit : les insights (verbatim client, pain points réels, désirs profonds, objections brutes).",
        "sources_insights": "PPS (questionnaire post-achat), reviews (les tiennes + concurrents sur Amazon/Trustpilot), commentaires Facebook sous les ads, SAV, Reddit, TikTok.",
        "exemple": "Verbatim collecté : 'je me réveille encore fatigué même après 8h de sommeil.' Hook générique (faible) : 'tu te sens fatigué ?'. Hook spécifique (fort) : 'et si le problème ce n'est pas la durée de ton sommeil, mais sa qualité ?'. Même source, qualité radicalement différente. Sans marketing research, on produit à l'aveugle ; avec, chaque créative est une hypothèse testable."
      },
      {
        "nom": "4. Feedback Loop (analyse)",
        "principe": "Sans analyse, on trouve des winneuses par hasard et on ne sait pas pourquoi elles performent — donc impossible de reproduire ce qu'on ne comprend pas. L'analyse transforme chaque batch en données exploitables pour le batch suivant.",
        "cycle": "recherche → création → test → analyse → pattern spotting → itération → nouvelle recherche (boucle qui ne s'arrête jamais).",
        "pattern_spotting": "Lire ce que les données disent sans leur poser la question. Si les winneuses partagent un format / un levier émotionnel / un avatar, ce n'est pas une coïncidence, c'est un insight fort qui dit quoi produire ensuite.",
        "diagnostic": "Un shop sans analyse stagne même avec volume + diversité + qualité au max, parce qu'il ne capitalise sur rien d'un batch à l'autre."
      },
      {
        "nom": "5. Double Down (itération)",
        "principe": "La variable la plus sous-exploitée et probablement la plus rentable. Une winneuse correctement itérée génère beaucoup plus que sa version originale. La plupart des shops confondent 'ça tourne' avec 'c'est exploité' : ils laissent la winneuse tourner et passent à la suivante — ils trouvent de l'or et changent de mine.",
        "definition_winneuse": "Une winneuse n'est pas une créative, c'est un INSIGHT validé par le marché : un angle qui résonne, un hook qui arrête le scroll, un avatar qui convertit.",
        "methode": "Itération variable par variable en gardant l'insight constant : changer la créatrice/le format/le hook en gardant le body → si on trouve un hook encore meilleur, on multiplie la winneuse. Changer l'avatar en gardant le hook et l'angle → ouvre une nouvelle poche d'audience avec un concept déjà validé.",
        "chiffres": "Une seule winneuse bien exploitée peut générer 20 à 25 itérations avant de passer en déclinaison complète. Laisser une winneuse tourner seule sans l'itérer = perdre ~80% de sa valeur potentielle."
      }
    ]
  },
  "hook_engineering": {
    "source": "Matteo — '14 Leviers Immuables de Copywriting', chapitres VI à VIII.",
    "fonction": "Le hook EST le targeting Meta. Meta (algo Andromeda) ne lit pas l'ad entière pour calibrer qui voit la pub — il lit les signaux des 3 premières secondes (qui s'arrête de scroller, qui regarde >3s, qui tap-to-watch, qui interagit) pour construire le profil psychologique de l'acheteur cible et aller chercher CE profil. Un hook qui ne parle qu'à un seul type d'avatar plafonne le scale même avec une offre/landing/produit parfaits — Meta n'ira jamais chercher les autres profils.",
    "consequence_pratique": "Les marques à 9 chiffres masterisent 40-100 hooks différents psychologiquement, pas pour le volume mais pour activer 40-100 segments psychologiques distincts (chaque hook ouvre une poche d'audience que Meta va chercher).",
    "3_musts": {
      "liste": [
        "Émotion (peur, espoir, surprise, dégoût, excitation, validation)",
        "Curiosity gap (information retenue, le cerveau veut combler le vide)",
        "Enjeu (quelque chose de gros à gagner ou à perdre)"
      ],
      "regle": "Minimum 2 des 3 éléments présents pour stopper le scroll. Les meilleurs hooks ont les 3. Si un hook n'a aucun des 3, ne pas perdre de temps à écrire le body."
    },
    "strategies_unaware": [
      {
        "nom": "Hidden Fear",
        "structure": "Mène avec la peur, raconte une histoire autour, fait le pont vers la solution.",
        "exemples": [
          "Your face is aging twice as fast on one side. Here's why. (peur de l'asymétrie non remarquée)",
          "What you're putting on your face is being stored in your liver. (peur du caché long terme)",
          "Why you're tired even after 8 hours of sleep. (peur du temps perdu malgré l'effort)",
          "The skincare ingredient banned in Europe but still in 80% of US products. (peur de l'autorité qui te ment)",
          "Sitting is the new smoking. Here's the proof on your body right now. (comparaison choc)",
          "Are you NOT brushing your dog's teeth? (culpabilité du parent absent, classique BarkBox)"
        ]
      },
      {
        "nom": "Hidden Desire",
        "structure": "Mène avec le désir, raconte une histoire autour, fait le pont vers la solution. Plus puissant que la peur sur beauté/lifestyle/transformation perso.",
        "exemples": [
          "3 signes que tu es plus attractive que tu ne le penses. (validation déguisée en révélation)",
          "Why some people look 10 years younger than their age. (désir anti-âge sans le nommer)",
          "The thing rich people do every morning that broke people don't. (statut + secret)",
          "What separates the people who get promoted from those who don't. (désir de réussite en observation)"
        ]
      },
      {
        "nom": "Did You Know",
        "structure": "Mène avec une question, une statistique ou une histoire qui peut être bridgée vers le problème. La plus polyvalente — marche presque pour toute niche à condition d'avoir une vraie info choc.",
        "exemples": [
          "Over half of dog owners don't restrain their beloved animal. (stat choc qui pose une question)",
          "97% of dust in your house is actually dead skin from your family. (stat dégoûtante)",
          "Why airline pilots never drink the coffee on planes. (insider secret avec autorité crédible)",
          "The average person spends 23 years sleeping. Most do it completely wrong. (stat + accusation cachée)"
        ]
      },
      {
        "nom": "Debate",
        "structure": "Mène avec une question ouverte ou une comparaison binaire, fait le pont vers le problème. Le cerveau ne peut pas s'empêcher de répondre dans sa tête — une fois qu'il a répondu, il est engagé.",
        "exemples": [
          "Coffee or tea: which one is actually killing you faster? (binaire + Hidden Fear combinés)",
          "Real butter or margarine? The answer changed in 2020. (binaire + Did You Know combinés)",
          "iPhone ou Samsung: which one will last 5 years? We tested both. (binaire + autorité du test)"
        ]
      }
    ],
    "alignement_awareness": {
      "regle": "Le hook doit matcher le stage d'awareness de l'audience visée, sinon Meta n'ira jamais la chercher. Hook Most-aware (promo) sur audience Unaware = scroll (il ne sait pas qu'il a un problème). Hook Unaware (éducatif long) sur audience Most-aware = scroll (il connaît déjà le produit, il attend juste une raison de cliquer).",
      "exemples_par_stage": {
        "Unaware": "Tu travailles assis 12h par jour ? Voilà ce que ton dos est en train de devenir. (tu nommes un problème qu'il ne nommait pas)",
        "Problem-aware": "Ton compte en banque a 174€ dedans. Et tu continues comme si de rien n'était. (tu amplifies la douleur)",
        "Solution-aware": "Most products help you fall asleep. This one helps your body STAY asleep. (tu différencies ta catégorie)",
        "Product-aware": "Voilà ce qui sépare les vrais [produit X] des knockoffs Amazon. (tu te poses comme l'évidence vs concurrents)",
        "Most-aware": "40% off, aujourd'hui seulement, code MERCI24. (tu pousses au déclencheur)",
        "Customer-aware": "Tu as eu une mauvaise expérience avec ce produit. Voilà pourquoi cette fois c'est différent. (tu adresses la relation existante)"
      }
    },
    "mood_x_intensite": {
      "definition": "Chaque hook active 2 dimensions psychologiques simultanément : le Mood (émotion dominante) et l'Intensité (charge émotionnelle). 9 combinaisons possibles (3×3).",
      "mood": [
        "Positif (espoir, joie, fierté, validation, excitation)",
        "Négatif (peur, frustration, colère, honte, dégoût)",
        "Neutre (curiosité, surprise, réflexion)"
      ],
      "intensite": [
        "Faible (ton calme, conversationnel, posé)",
        "Moyenne (tension présente mais maîtrisée)",
        "Haute (charge maximale, viscérale, presque inconfortable)"
      ],
      "pourquoi_critique": "Meta calcule un 'Creative Similarity Score' (algo Andromeda, 2025) qui regarde la PSYCHOLOGIE activée par l'ad, pas seulement le visuel. Si toutes les ads d'une marque activent la même case Mood×Intensité, Meta interprète ça comme 'cette marque ne couvre qu'un seul angle psychologique' → CPM x2 à x3 pour le même reach. Estimation : 70% du ROAS dépend de cette couverture.",
      "regle": "Couvrir au minimum 2-3 ads par combinaison Mood×Intensité différente sur le même produit/offre. Ne jamais épuiser une seule case même si elle convertit bien au début — la redondance psychologique fait monter le CPM en 2-3 semaines même en changeant les visuels.",
      "exemple_meme_produit_probiotiques": [
        "Négatif + Haute : 'Ton slip cause ton candida overgrowth. Voilà la preuve.' → recrute les frustrés/inquiets",
        "Positif + Faible : 'J'ai juste arrêté les ballonnements le matin. C'est cool.' → recrute les calmes/relax",
        "Neutre + Moyenne : 'Pourquoi 90% des probiotiques meurent avant d'atteindre les intestins.' → recrute les analytiques/curieux",
        "Positif + Haute : 'Ma vie a changé en 30 jours. Mon mari ne me reconnaît plus.' → recrute les optimistes/aspirants"
      ],
      "process_audit": [
        "Lister les 5-10 ads winners actives",
        "Classer chacune dans une case Mood×Intensité",
        "Identifier les cases vides",
        "Écrire 2-3 ads pour chaque case manquante",
        "Lancer sur 1 semaine et observer CPM/ROAS"
      ]
    },
    "targeted_vs_broad": {
      "targeted": "Filtre serré, cible un avatar précis ('Femmes de 40+ qui ont encore de l'acné, écoutez-moi 30 secondes'). Repousse 95% des gens, attire les 5% concernés qui convertissent très fort car ils se sentent ciblés direct. Construit une niche.",
      "broad": "Filtre large, vise tout le monde ('$1 vs $100,000,000 car' — Mr. Beast). Reach massif, partages viraux, peu importe âge/genre. Sert le top of funnel et le brand qui ratisse large.",
      "regle": "Les grosses marques utilisent les 2 en parallèle : targeted pour la conversion chirurgicale sur poches d'audience précises, broad pour le top of funnel."
    },
    "2_facons_ecrire": {
      "promesse_claire": "Donner l'info principale dès la 1ère seconde, et le contexte est tellement dingue que ça bat la curiosité (le viewer clique pour vérifier/voir). Marche quand le contexte est intrinsèquement WTF.",
      "open_loop": "Retenir l'info clé, ouvrir une boucle que le cerveau ne supportera pas de laisser vide ('Watch out for these ingredients when buying shampoo...' → quels ingrédients ?). Marche quand le contexte est moyen/banal.",
      "regle_ecom": "En e-commerce, l'open loop gagne ~80% du temps — on ne vend pas des Squid Games à 456k vues, on vend des produits déjà vus 100 fois par le prospect."
    }
  },
  "lead_techniques": {
    "source": "Matteo — '14 Leviers Immuables', chapitre X.",
    "definition": "Le hook attrape l'attention, le Lead la maintient. C'est la première phrase APRÈS le hook — la décision micro entre 'je continue' et 'je passe'. 95% des ads cassent ici : hook banger + lead nul = scroll, le spend est perdu.",
    "6_facons": [
      {
        "nom": "Introduire le mécanisme tout de suite",
        "hook": "Si tu as X problème, regarde ça.",
        "lead": "Le mécanisme Y est le seul qui s'attaque vraiment à la cause."
      },
      {
        "nom": "Escalader le problème",
        "hook": "What if everything you knew about dandruff is wrong?",
        "lead": "There's an uncomfortable truth about those embarrassing white flakes on your shoulders. And it's way grosser than you think."
      },
      {
        "nom": "Escalader le désir",
        "hook": "Voilà comment couper les griffes de ton chien sans qu'il bouge.",
        "lead": "Tu redoutes la séance de demain autant que ton chien. Mais imagine si ton chien s'endormait pendant la coupe ?"
      },
      {
        "nom": "Repositionner le problème (souvent avec une autorité)",
        "hook": "Stop starving me. You're making this worse. (l'estomac qui parle)",
        "lead": "I'm chubby because your cortisol is high. And now you're spiking it even higher because I'm hungry and stressed. (repositionne 'régime' en 'stress hormonal')"
      },
      {
        "nom": "Sous-entendre une nouvelle information",
        "hook": "The hollow fiber revolution that's making cardiologists trash their own compression socks happened completely by accident.",
        "lead": "So why do most compression socks feel so uncomfortable? It turns out we've been using the wrong materials for decades."
      },
      {
        "nom": "Poser une timeline",
        "hook": "Most people don't realize how fast mushroom coffee works.",
        "lead": "Here's what happens inside your body in the first 7 days."
      }
    ],
    "golden_nuggets": [
      "Montrer l'avatar en lead : mettre un visage de l'avatar juste après le hook aide Meta à mieux targeter (plus proche du hook = indique mieux qui chercher). Testé empiriquement sur de nombreuses ads winners.",
      "Tester une version qui zappe le hook ET démarre directement par le lead classique — pas de mise en place, pas d'intro, on débarque en pleine scène. Le cerveau cherche à comprendre et tant qu'il cherche, il regarde. Toujours prévoir une variante 'commence avec le lead' dans les scripts."
    ]
  },
  "copywriting_leviers": {
    "source": "Matteo — '14 Leviers Immuables de Copywriting Qui Décident si tu Fais -100k ou +3M par mois' (parties 1/2/3).",
    "principe_general": "Le copywriting n'est pas 'écrire', c'est 'parler à un cerveau humain'. Test ultime sur toute ligne de copy : 'Est-ce qu'un humain réel parlerait comme ça à un autre humain ?' Si non, réécrire. Lire son copy à voix haute reste le seul vrai test.",
    "test_hopkins": "Claude Hopkins (Scientific Advertising, 1923) : une seule question pour valider chaque ligne — 'Would this help a salesman sell the goods?'. Écrire comme on parlerait à un pote au bar, pas comme une dissertation. Écrire pour un enfant de 6 ans / une grand-mère : si elle ne comprend pas en une lecture, c'est trop compliqué. Cas Schlitz (Hopkins, 1919) : passée de 5e à 1ère place du marché de la bière sans changer le produit, juste en disant des faits ordinaires que personne ne disait ('Our bottles are washed with live steam' au lieu de 'pure, pure, pure').",
    "3_checks_avant_publication": {
      "source": "Harry Dry (Marketing Examples)",
      "checks": [
        {
          "nom": "Visualisable",
          "regle": "Le cerveau retient les images, pas les concepts.",
          "mauvais": "Optimiser votre proposition de valeur",
          "bon": "1000 songs in your pocket (Apple iPod, 2001) — même produit qu'un concurrent qui dit '5GB de stockage', mais tout le monde a compris et voulu."
        },
        {
          "nom": "Falsifiable",
          "regle": "Une phrase vérifiable (vraie ou fausse) communique plus que ce qu'elle dit — le cerveau perçoit la spécificité comme de la vérité.",
          "mauvais": "Il est intelligent (contestable, sans valeur)",
          "bon": "15 minutes could save you 15% or more on car insurance (GEICO) — 4 chiffres précis dans une phrase."
        },
        {
          "nom": "Personne d'autre ne peut le dire",
          "regle": "Test : remplace ton produit par celui d'un concurrent — si l'ad fonctionne encore, tu n'as rien d'unique.",
          "exemple": "Liquid Death : 'Don't be scared, it's just water.' Evian/Vittel/Cristaline ne pourraient JAMAIS dire ça. Avis : 'We're number two. We try harder.' (1962) — Hertz (n°1) ne pouvait pas le dire ; Avis est passé de 11% à 35% de part de marché en 4 ans."
        }
      ]
    },
    "faits_vs_opinions": {
      "regle": "Une opinion peut toujours être contestée ('Says who?'). Un fait, non — le prospect tire sa propre conclusion, 10x plus crédible qu'une conclusion imposée.",
      "exemple": "Mauvais : 'Nos cookies sont délicieux' → 'Says who?'. Bon : 'Nos cookies se sont retrouvés en rupture de stock 43 fois' → le client conclut lui-même qu'ils sont bons.",
      "process": [
        "Identifier chaque opinion dans le texte",
        "Trouver le fait vérifiable qui la soutient",
        "Remplacer l'opinion par le fait"
      ],
      "technique_credibilite_progressive": "Commencer par des faits vrais et incontestables ('c'est vrai'... 'encore vrai'...) puis glisser une opinion à la fin — la crédibilité accumulée la fait passer."
    },
    "belief_cycle": {
      "source": "Eugene Schwartz, Breakthrough Advertising (1966)",
      "citation": "Beliefs are as strong as desires. If you violate your customer's established beliefs even in the slightest, nothing you promise them will matter.",
      "principe": "Une croyance = un sentiment de certitude sur ce que quelque chose signifie, vraie ou fausse peu importe — pour le client c'est sa réalité. Ne JAMAIS violer une croyance établie : confirmer la croyance existante + ouvrir un mécanisme nouveau plutôt que la contredire.",
      "exemple": "Prospect qui croit 'je n'ai pas de volonté' face à une promesse minceur classique ('ça demande de la volonté') = mort immédiate. À dire plutôt : 'Ce n'est pas que tu manques de volonté. C'est que les solutions classiques sont mal conçues.' (confirme + ouvre un mécanisme nouveau).",
      "4_sources_de_croyances": [
        "Expérientielles — formées par l'expérience perso ('J'ai pris des probiotiques 3 fois, ça n'a jamais marché.')",
        "Influence/adoptées — acquises d'autres personnes ('Mon coach m'a dit que...')",
        "Intuitives/ressenties — internes, souvent inconscientes ('Je suis le genre de personne qui n'arrive pas à dormir profondément.')",
        "Mémorielles — souvenir incertain ('Je crois que... mais je suis pas sûr.')"
      ],
      "comment_cartographier": "Lire dans cet ordre : commentaires sous les ads, avis Amazon de produits similaires (1 et 2 étoiles surtout), Reddit/forums niche, emails SAV, questionnaires post-achat. Chercher les phrases qui commencent par 'Je pense que...', 'Pour moi c'est...', 'J'ai toujours cru que...', 'Le vrai problème c'est...' — ce sont des hooks et des angles déjà écrits."
    },
    "autorite": {
      "principe": "Si tu ne te poses pas comme autorité dans ta niche, quelqu'un d'autre le fera et gagnera. L'autorité = la croyance accélérée : le cerveau baisse sa garde, saute ~80% des objections avant même qu'elles arrivent.",
      "3_niveaux": [
        "Niveau 1 (le plus fort) — tu ES l'autorité : 'J'ai pris 15 kg de muscle à 45 ans.'",
        "Niveau 2 — tu as appris d'une autorité : 'Mon coach a pris 15 kg de muscle à 45 ans, voilà ce qu'il a fait.'",
        "Niveau 3 (le plus faible) — tu connais quelqu'un : 'Je connais un mec qui a pris 15 kg de muscle à 45 ans.'"
      ],
      "10_leviers_activables": [
        "Credentials — diplômes, certifications reconnues",
        "Following — influenceurs avec audience fidèle qui recommandent",
        "Médias et presse — vu dans Forbes/Time/BFM Business, une simple mention suffit",
        "Awards et brevets — '40+ patents that knockoffs cannot replicate', Michelin Stars, CES Awards",
        "Organisations — 'Official partner of Team USA', 'Trusted by Navy SEALs', 'As used by NASA'",
        "Titre — 'I'm the CEO and founder of [marque]. I spent 5 years perfecting...'",
        "Recherche — 'Clinically proven to reduce plaque by 52% more than just brushing'",
        "Expérience — 'Mère de 5 enfants', 'J'ai analysé 1000 publicités'",
        "Borrowed Authority — emprunter un protocole reconnu ('The Navy SEALs use cold exposure to recover. We applied that protocol to our products.')",
        "Visual Authority — apparaître sur podcasts, conférences, en blouse blanche dans un labo, setup pro"
      ],
      "2_boosters_caches": [
        "Relatability Authority — articuler la douleur du client mieux que lui-même : 'J'ai été dans tes chaussures. J'ai eu cette même galère pendant 6 ans.' Autorité par empathie.",
        "Transparency Authority — être transparent sur les LIMITES du produit, les prototypes ratés. Construit plus de confiance que de tout cacher : 'Si elle me dit ses limites, c'est qu'elle ne me cache rien.'"
      ],
      "case_study_camel": "R.J. Reynolds (années 1940) : 'More doctors smoke Camels than any other cigarette' — médecins sondés en conventions médicales (paquets gratuits). Masterclass d'autorité par crédentiels (controversé rétrospectivement, mais efficace marketing-wise)."
    },
    "mecanismes_uniques": {
      "principe": "'New' and 'Different' beats 'better'. Le cerveau catégorise tout — si ton produit tombe dans la même boîte que les autres, il filtre direct. Le mécanisme unique crée la croyance 'c'est vraiment différent, cette fois ça va peut-être marcher' — c'est pour ça que quelqu'un qui a essayé 10 produits achète quand même le 11e.",
      "3_types": [
        {
          "type": "1 — Le vrai nouveau mécanisme (fully unique, breveté)",
          "description": "Le plus fort : tu as inventé quelque chose qui n'existe pas ailleurs. Règle : le mécanisme doit être UTILE aux yeux de ce que le prospect désire (pas juste nouveau — des LED bleues sous un humidificateur c'est nouveau mais inutile).",
          "exemples": [
            "Kizik — chaussure où on appuie sur le talon pour la remonter, personne d'autre ne fait ça",
            "Care Pod — humidificateur en acier inoxydable vs concurrents en plastique (moisissure)",
            "P90X — invente le mot 'muscle confusion' pour de la simple variation d'exercices"
          ]
        },
        {
          "type": "2 — Le mécanisme non-dit (existe déjà chez les concurrents, mais personne n'en parle)",
          "description": "Le préféré de Matteo : rien à inventer, juste planter un drapeau sur un truc que les concurrents font aussi mais ne mentionnent pas. Question à se poser : 'Qu'est-ce que mon produit fait, que les concurrents font aussi, mais dont personne ne parle ?'",
          "exemples": [
            "Lucky Strike (1917) — 'It's toasted.' Toutes les cigarettes étaient grillées, personne ne le disait. Devenu n°1 aux US pendant 30 ans.",
            "Schlitz/Hopkins — 'Our bottles are washed with live steam.' Toutes les brasseries le faisaient, Schlitz l'a dit en premier."
          ]
        },
        {
          "type": "3 — Le mécanisme renommé (l'ordinaire devient extraordinaire)",
          "description": "Renommer un mécanisme connu pour qu'il paraisse nouveau. Nouveau = mieux dans le cerveau primitif.",
          "exemples": [
            "Apple iPod — '1000 songs in your pocket' au lieu de '5GB de stockage'",
            "Bone Broth — bouillon de poulet renommé, marché de centaines de millions créé",
            "'The American Parasite' (Golden Hippo/Keybiotics, 2013) — candida renommé, $1.1M en 48h, vu par 100M+ personnes",
            "'Lectins' (Dr. Gundry) — protéine connue renommée en coupable n°1 de la leaky gut, livre best-seller + supplément à succès"
          ]
        }
      ],
      "case_study_golden_hippo": "Évolution sur 6 ans, même équipe, produits proches : Keybiotics 2013 ('The American Parasite', $1.1M/48h) → Perfect Biotics 2015 ('4 Digestive Destroyers' après ban Google, 35M+ vues) → Vital Reds 2016 (Dr. Gundry comme autorité, marché passé solution-aware) → Lectin Shield 2017 (nouveau coupable : lectines) → Total Restore 2018 (all-in-one, 16 ingrédients) → Dr. Marty 2018 (même framework appliqué aux animaux : '3 Canine Distress Calls'). Pattern : à chaque évolution du marché d'un stage, ils inventent un nouveau mécanisme + un nouveau coupable nommé + un nouveau format. Le produit ne change jamais — c'est l'angle, le mécanisme, le nom qui changent.",
      "process_3_questions": [
        "As-tu un mécanisme totalement unique que personne n'a ? Si oui, pars de là.",
        "Quel mécanisme ton produit utilise mais dont les concurrents ne parlent pas ? Plante le drapeau.",
        "Quel mécanisme connu peux-tu renommer pour qu'il paraisse nouveau ?"
      ]
    },
    "open_loops": {
      "definition": "Un information gap — une démangeaison qu'on ne gratte pas tout de suite. Objectif : ouvrir une boucle dans les 5 premières secondes, ne la fermer qu'à la fin. Eugene Schwartz : 'Great copywriting is just a search for juxtaposition.'",
      "3_facons": [
        {
          "nom": "Juxtaposition (la plus puissante)",
          "regle": "Mettre côte à côte 2 choses qui ne devraient pas l'être — sans contraste, pas de tension.",
          "exemples": [
            "How a homeless person became a millionaire.",
            "Eat fat to burn fat.",
            "I quit the gym and lost 20 pounds.",
            "Comfrt : 'It's not a hoodie. It's a wearable blanket.' (catégorie repositionnée, 500M/an)"
          ]
        },
        {
          "nom": "La peur (utilisée éthiquement)",
          "regle": "Le subconscient alerte le conscient en cas de danger — 'Watch out for...' déclenche l'attention. Ne jamais inventer un danger : ça crame le brand long terme.",
          "exemples": [
            "Watch out for these ingredients when buying shampoo.",
            "Why your face cream is aging you faster, not slower."
          ]
        },
        {
          "nom": "Faire l'inverse de tout le monde",
          "regle": "Tout le monde fait X, fais l'inverse de X.",
          "exemples": [
            "Domino's (2009) — l'industrie dit 'notre pizza est la meilleure', Domino's sort 'Our pizza sucks' + montre les avis négatifs + refait toute la recette. Action $8→$400 en 10 ans.",
            "Volkswagen Beetle (1959) — l'industrie auto US vend 'bigger is better', VW sort 'Think small'. Campagne la plus iconique de l'histoire de la pub.",
            "Skool Master (2025) — l'industrie formation promet des résultats agressifs, ils font l'inverse : 'On ne te promet aucun résultat', laissent les résultats des membres parler."
          ]
        }
      ]
    },
    "show_dont_tell": {
      "principe": "Le cerveau ne ressent pas les concepts, il ressent les images/expériences/comportements. 'Ça booste ton énergie' ne fait rien ressentir ; 'tu te lèves avec l'envie de défoncer un mur' fait VOIR la scène.",
      "process": [
        "Identifier le bénéfice abstrait à communiquer",
        "Se demander : 'Comment je peux montrer ça visuellement ?'",
        "Écrire l'expérience/le comportement/la scène, pas la claim"
      ],
      "exemples": [
        "'Améliore le sommeil profond' → 'Tu te souviendras de tes rêves pour la première fois depuis des années'",
        "'Anti-âge efficace' → 'Ta fille va te demander quels produits tu utilises'",
        "'Réduit les pertes de cheveux' → 'Ta brosse sera vide après le coiffage'"
      ],
      "regle": "Le client doit pouvoir conclure le bénéfice tout seul. Une conclusion auto-générée vaut 10 affirmations imposées. Référence historique : Ogilvy/Rolls-Royce 1958 — 'At 60 miles an hour the loudest noise in this new Rolls-Royce comes from the electric clock' (falsifiable + visualisable, ventes +50% en 1958)."
    },
    "raise_the_stakes": {
      "principe": "Plus l'enjeu est élevé, plus le cerveau accroche. Une perte de 10€ = indifférence, une perte de 100 000€ = attention totale. Possible d'empiler 2-3 leviers sur la même phrase pour un message qui paralyse l'attention.",
      "5_leviers": [
        {
          "nom": "Make it bigger",
          "exemple": "'My dog peed in the house' → 'My dog peed in my Bugatti.' / 'Red Bull gives you energy' → 'Red Bull gives you wings.'"
        },
        {
          "nom": "Ajouter un témoin",
          "exemple": "'Mon chien a fait pipi' → 'Mon chien a fait pipi devant le propriétaire.' (transforme une scène privée en scène publique)"
        },
        {
          "nom": "Make it urgent",
          "exemple": "'Améliore tes dents' → 'The damage is happening RIGHT NOW.'"
        },
        {
          "nom": "Make it permanent",
          "exemple": "Le cerveau accorde 10x plus d'importance au permanent qu'au temporaire — 'Problèmes dentaires' → 'A lifetime of dental problems' ou 'A lifetime of compliments on your smile.'"
        },
        {
          "nom": "Make it cost more",
          "exemple": "'Le café te crashe' → 'Every morning, your coffee robs you of 3 productive hours. Over 20 years...'"
        }
      ]
    },
    "objections": {
      "principe": "Une objection qu'on attend, on la traite. Une objection qu'on PRÉVIENT, on la fait disparaître. Les objections sortent en cascade dans la tête du prospect — tant que l'objection #1 n'est pas réglée, l'objection #2 ne peut pas être entendue. Toujours traiter dans le bon ordre.",
      "3_types": [
        "Produit/marché : 'J'ai déjà essayé, ça marche pas.'",
        "Claim : 'Je crois pas. C'est trop beau pour être vrai.'",
        "Avatar/croyance : 'Ça marchera pas pour MOI.'"
      ],
      "4_strategies_par_ordre_de_puissance": [
        {
          "nom": "1 — Écrire en faits, pas en opinions",
          "exemple": "'J'ai des cookies délicieux' → 'Says who?' / 'Nos cookies se sont retrouvés en rupture 43 fois' → forcément bons."
        },
        {
          "nom": "2 — Reversals : transformer l'objection en argument",
          "exemples": [
            "Grunz (greens enfants) — Objection: 'Mes gamins vont voir que c'est sain et refuser.' Reversal: 'Kids know there's greens in these gummies. And they keep asking for more.'",
            "Ryze — Objection: 'I can't lose weight, I cheat too much.' Reversal: 'Lose weight, EVEN IF you cheat. Made for people who cheat.'"
          ]
        },
        {
          "nom": "3 — Le mot magique 'parce que'",
          "regle": "Le cerveau accepte 3x plus facilement une affirmation suivie d'une raison.",
          "exemple": "'It's the easiest humidifier to clean because it's made of one piece of stainless steel.'"
        },
        {
          "nom": "4 — Reassign : réassigner l'objection (casser la généralisation)",
          "exemple": "BioTrust Pro X10 — Objection: 'J'ai déjà pris des probiotiques, rien n'a changé.' Reassign: 'Most probiotics die in your stomach acid before reaching your intestines. Ours survive thanks to Microencapsulation Technology.' L'objection n'est plus 'les probiotiques', elle devient 'les capsules sans microencapsulation'."
        }
      ],
      "gradualization": {
        "source": "Eugene Schwartz",
        "principe": "Créer un flux d'acceptations qui mène le prospect à dire oui sans s'en rendre compte, étape par étape, avant le pitch final.",
        "exemple_grunz": [
          "'Greens are good for you.' → d'accord.",
          "'You should take them daily.' → encore d'accord.",
          "'But you don't. And here's why: the taste, the texture, the 30 seconds shaking the shaker.' → tu nommes ses objections avant lui.",
          "'That's why 74% of greens buyers quit within 3 weeks.' → preuve que ce n'est pas sa faute.",
          "'We fixed all 3 problems.' → promesse.",
          "'Gummy form. With freeze-dried strawberries and monk fruit.' → mécanisme + spécificité.",
          "'In a 60-day test, 89% took them every single day. 3x the adherence rate of leading greens powders.' → preuve + comparaison."
        ]
      }
    },
    "self_concept": {
      "principe": "On n'écrit pas pour qui le prospect EST (Self actuel) mais pour qui il VEUT ÊTRE (Self idéal). Toute décision d'achat passe par une question inconsciente : 'Est-ce que ce produit me rapproche de mon Self idéal ?' Si oui : achat. Si non : scroll. Le copy chirurgical adresse les 2 niveaux : Self actuel ('Tu galères avec X.') + Self idéal ('Tu deviens le mec qui [trait identitaire fort].').",
      "3_angles": [
        {
          "nom": "Self d'identité (qui je veux être)",
          "regle": "On ne vend pas un produit, on vend une identité que le viewer s'imagine endosser.",
          "exemples": [
            "La montre que les hommes successful portent.",
            "Le café que les vrais entrepreneurs boivent.",
            "Pour ceux qui refusent la médiocrité."
          ]
        },
        {
          "nom": "Self social (comment on me voit)",
          "regle": "On vend le regard des autres — câblage primal pour bien paraître socialement. Marche très bien en mode/beauté/accessoires.",
          "exemples": [
            "Tu rentres dans la pièce, tout le monde se retourne.",
            "Tes potes vont te demander d'où ça vient."
          ]
        },
        {
          "nom": "Self d'avenir (qui je serai)",
          "regle": "On vend le futur — le viewer projette une version améliorée de lui-même. Utilisé par les marques transformation (fitness, finance, dev perso).",
          "exemples": [
            "Toi dans 6 mois si tu commences aujourd'hui.",
            "Imagine la version de toi qui s'est levée tous les matins à 6h pendant 3 mois."
          ]
        }
      ],
      "test_ultime": "'Si quelqu'un achète mon produit, qui devient-il aux yeux du monde ?' Si la réponse est 'rien de spécial', le copy est faible. Si la réponse est 'le mec qui [trait identitaire fort]', le copy a une chance.",
      "marques_self_concept_fort": [
        "Apple : 'Celui qui pense différemment.'",
        "Rolex : 'Celui qui a réussi.'",
        "Tesla : 'Celui qui est en avance sur son époque.'",
        "Lululemon : 'Celle qui prend soin de son corps et de son esprit.'"
      ],
      "note_business": "Les marques avec un Self-Concept fort ont une LTV ~3x supérieure aux marques génériques — le client ne rachète pas un produit, il rachète une identité.",
      "process": [
        "Lister les 3 traits identitaires que le client veut signaler aux autres",
        "Choisir UN trait et planter le drapeau dessus dans tout le copy",
        "Cohérence sur tout le funnel : ad → landing → email → packaging",
        "Ne pas changer le Self-Concept tous les mois — sinon on n'en construit aucun"
      ]
    }
  },
  "scaling_revenue_stages": {
    "source": "Matteo — 'Transformer un produit banal en machine à cash'.",
    "note": "Complète business_stage_rules (qui couvre 0 à ~1KD cumulé, early testing). Ici on parle de paliers de RUN RATE journalier (0-10K/day, 10-50K/day, 50-100K/day+), donc une échelle largement supérieure — la suite logique une fois 'scaling_1kd_stable' atteint et dépassé.",
    "principe_general": "Chaque palier demande une obsession différente, pas les mêmes KPIs, pas les mêmes réflexes. Erreur de débutant : jouer les 3 paliers avec la même tête → gagner un peu, paniquer, casser, puis chercher un nouveau 'produit winner' alors que le problème n'est jamais le produit.",
    "paliers": [
      {
        "nom": "0 à 10K/day — l'instinct marché",
        "obsession": "Prouver le désir. Trouver une douleur exploitable et prouver qu'un marché réagit — pas besoin de marque/packaging/site parfaits à ce stade.",
        "recherche_produit": "Ne pas chercher un 'winner' déjà visible sur les spytools (= déjà rincé par 300 personnes, CPM cher, supply saturée). Chercher une douleur avec assez de tension émotionnelle : Amazon reviews, Reddit, TikTok Shop, forums de niche, marketplaces asiatiques, produits Amazon mal marketés, marques DTC étrangères sous-exploitées, catégories evergreen (beauté, sommeil, posture, cuisine, animaux, organisation, fitness, parents, confort maison). On n'invente pas le besoin, on intercepte une frustration déjà là.",
        "niche": "Poncer UNE niche jusqu'à connaître le persona mieux qu'il ne se connaît lui-même — c'est ce qui fait repérer les patterns invisibles (mêmes frustrations, mêmes objections, mêmes mots dans les reviews). Chaque nouveau produit dans la niche devient ensuite plus facile à lancer (intelligence marché accumulée).",
        "usage_spytools": "Servent à lire les formats gagnants (structures d'angles, hooks, transitions, types d'UGC, LP, offres, bundles, advertorials, VSL, native ads) — jamais à copier le produit déjà vu partout.",
        "rythme_creas": "20 à 40 créas/semaine. Pas des chefs-d'œuvre — des angles. Une créa = un angle (pain, shame, status, comparison, myth busting, founder, demonstration, reaction, problem-solution, enemy angle). L'IA (Higgsfield/CapCut/Runway/ElevenLabs/Canva/Descript) sert à produire plus vite, jamais à remplacer le brief.",
        "kpi": "Pas le ROAS parfait — la PREUVE DE TRACTION : CTR (l'angle attire), Hook rate (les 3 premières secondes stoppent le scroll), ATC (l'offre intrigue), CPA qui peut devenir rentable avec une meilleure page/bundle/email/créa. On cherche un signal, pas une machine parfaite. Couper trop vite à 1.4 ROAS au lieu de 2.5 peut tuer un bon produit ; continuer sans lire les métriques brûle juste du cash.",
        "conseil_carriere": "Le meilleur entraînement avant de lancer son propre produit : faire des créatives pour d'autres marques (même gratuit/perf au début). La créa est le vrai levier de 2026 — media buying = cliquer sur publish, n'importe qui peut le faire ; comprendre un avatar/écrire un hook/casser une objection, c'est une compétence qui rend indépendant des monteurs/créateurs/agences."
      },
      {
        "nom": "10 à 50K/day — la répétition système",
        "obsession": "Comprendre POURQUOI le produit vend, à QUI, avec QUEL angle/promesse/objection, et jusqu'où pousser sans dégrader la marge. Erreur fatale à ce palier : scaler le budget plus vite que sa compréhension (voir 8K/day, doubler le budget, CPA explose, stock part, support sature, RF montent, shipping détruit la confiance).",
        "creative_pipeline": "Ne plus dépendre d'une seule créa (une créa qui porte 70% du spend = bombe à retardement). Construire une matrice créative : 5 avatars × 5 douleurs × 5 niveaux de conscience × 5 mécanismes × 5 formats (UGC face cam, démo produit, founder story, street interview, green screen, native ad, fake podcast, problem montage, review compilation, objection handling, comparison ad).",
        "page_produit": "Devient une vraie machine de conversion : above the fold + promesse immédiate + bénéfice principal + social proof visible + mécanisme unique expliqué simplement + comparaison vs ancienne solution + FAQ orientée objections + garanties + bundles + urgency propre + reviews avec les mots du client. Multiplier les pages par angle (douleur / mécanisme / advertorial trafic froid / direct retargeting / quiz si personnalisation / presell si marché sceptique).",
        "finance_et_supply": "Cash conversion cycle devient critique : encaisser aujourd'hui mais payer stock/ads/3PL/refunds/taxes/chargebacks/prestataires/samples/créateurs/outils avant d'avoir récupéré sa marge. Vérifier : fournisseur (upfront % vs avant expédition), lead time, temps transport, jours de couverture stock — possible d'être rentable en théorie et mort en pratique. Anticiper avant de scaler, pas après : 2 fournisseurs capables de produire, contrôle qualité, samples validés, 3PL qui tient les pics, seuils de réappro basés sur run rate (pas intuition), plan air freight (sauver le momentum) vs sea freight (protéger la marge)."
      },
      {
        "nom": "50 à 100K/day et plus — l'exécution organisationnelle",
        "obsession": "On ne scale plus un produit, on scale une organisation. Le produit/l'offre/la demande sont validés — l'ennemi devient la COMPLEXITÉ : fatigue créa, attribution floue, CPM qui montent, RF, qualité support, retards logistiques, baisse de contribution margin, dépendance Meta, manque de cash, problèmes fournisseurs, copies concurrentes, saturation d'angle, baisse de confiance marché.",
        "pilotage": "Chaque décision passe par la marge nette, le LTV, le payback period, le MER, le CAC new customer, le repeat rate, le RF rate, le blended CPA, la contribution profit PAR COHORTE — plus de pilotage au ROAS plateforme seul.",
        "funnel_segmente": "TOF (angles larges, ouvrir le marché) → MOF (éduquer, comparer, rassurer, casser les objections) → BOF (convertir les hésitants : preuve, offre, urgence, garantie). Profondeur des angles : bénéfice évident → mécanisme → identité (le client ne veut plus acheter un produit, il veut rejoindre une nouvelle croyance).",
        "marche_plus_froid": "Les premiers acheteurs étaient chauds, les suivants sont plus sceptiques/moins conscients/plus lents à convaincre → il faut redescendre les niveaux de conscience : advertorials, quiz, VSL, pages longues, séquences email profondes, retargeting par objection, angles culturels/experts/preuve/transformation. Sophistication du marché centrale : si le marché a entendu 50x la même promesse, changer le mécanisme/la preuve/le véhicule, pas juste reformuler le bénéfice (ex: 'perdre du poids' n'est pas un angle, 'réactiver un signal métabolique ignoré' peut le devenir, à condition de rester crédible et conforme).",
        "multi_canal": "Meta reste souvent le moteur. TikTok = trouver angles/volume créatif. Google = capter l'intention. YouTube = pédagogie. Native ads = advertorials + marchés plus âgés. Email/SMS = LTV. Affiliés/influenceurs = contenu + confiance. Amazon = capture si demande brandée. Attention : plus de canaux = attribution qui ment davantage → piloter au MER/cash/contribution profit/cohortes, pas au ROAS par plateforme.",
        "danger_central": "Tout ce qui était tolérable à 10K/day devient dangereux à 100K/day (un RF un peu élevé = fuite massive, un délai shipping un peu long = centaines de tickets support, un fournisseur un peu instable = risque existentiel). Nécessite des dashboards, des rituels, des owners dédiés (créa / media buying / CRO / supply / finance / support) — le fondateur ne peut plus tout porter seul."
      }
    ],
    "synthese": "0-10K/day = voir une douleur que les autres ignorent. 10-50K/day = produire plus d'angles que les autres. 50-100K/day+ = tenir marge + stock + cash + créa + confiance + vitesse simultanément."
  },
  "creative_flywheel": {
    "source": "Méthode 'Creative Flywheel' — cycle infini pour scaler une marque ecom (utilisé sur des comptes qui produisent 100+ créas/weekend).",
    "principe": "Un cycle qui se répète à l'infini, le plus vite et avec le plus de vélocité possible sans perdre en qualité : Research → Idéation & Inspiration → Production → Test → Analyse & Learning → Itération → retour à Research. Certains font un tour complet en 1 mois, d'autres en 4-5 jours avec la même qualité voire mieux — la vélocité du flywheel détermine le succès.",
    "etapes": [
      {
        "nom": "1. Research",
        "veille_best_in_class": "Pas forcément ta niche — les MEILLEURS acteurs du marché ecom en général (ex: Obvi). Observer leurs créas, hooks, média mix, formats via des outils de spy comme Trendtrack (Meta) et Calodata (TikTok Shop).",
        "veille_externe": [
          "Créatifs concurrents (s'en inspirer pour ses propres créas)",
          "Trustpilot concurrent (vérifier que ce sont de vrais avis, comprendre les objections et satisfactions)",
          "Deep search (ChatGPT/Claude/Perplexity) pour mieux cerner la marque/le marché",
          "TikTok / TikTok Shop organique",
          "Amazon (mine d'or d'avis)",
          "Reddit",
          "SparkToro (creuser l'audience)",
          "X/Twitter — sous-coté : trouver le bon thread anglophone sur un painpoint = centaines de réponses/interactions exploitables, et du verbatim client réutilisable en continu",
          "Quora / Pinterest (moins pertinents mais sources d'appoint)",
          "Adspy — récupérer les vrais avis Facebook sous les pubs concurrentes (mine d'or, lent à remonter mais précieux)",
          "YouTube — commentaires sous une vidéo qui parle du painpoint/de la solution/du dream outcome"
        ],
        "extraits_de_la_recherche": [
          "Dream outcome",
          "Pain point",
          "UMS (unique mechanism solution) / UMP (unique mechanism problem)",
          "Deep desires / avatar(s)",
          "Market timing / saisonnalité (~90% des produits en ont une)",
          "Awareness",
          "Sophistication du marché",
          "Angles marketing"
        ]
      },
      {
        "nom": "2. Idéation & Inspiration",
        "principe": "Condenser la recherche + s'inspirer des meilleures créas vues (concurrents/best in class) → idéation BASÉE SUR LA DATA, jamais random."
      },
      {
        "nom": "3. Production",
        "formule_magique": "Volume × Diversité × Qualité × Analyse — confirme diagnostic_formula. Les ad libraries des meilleurs shops montrent 5000-7000 ads lancées depuis le début de la marque pour seulement 200-300 actives en même temps = le win rate reste faible même chez les meilleurs avec les meilleures agences. Le volume n'est pas optionnel.",
        "diversite": "Formats (statique/VSL/mashup/shortform/UGC), angles, concepts (en statique : collage, negative marketing, headline, benefits avec flèches/bullet points).",
        "copywriting": "Leviers psychologiques (social proof, autorité, rareté), power words, verbatim client, structures éprouvées (PAS/BAB/AIDA) — ne jamais rédiger au hasard."
      },
      {
        "nom": "4. Test",
        "principe": "Lancer avec un budget minimum suffisant pour générer de la data utile."
      },
      {
        "nom": "5. Analyse & Learning",
        "principe": "La phase la plus souvent skippée ('ça marche pas, je repasse en production' SANS analyser d'abord) — pourtant la plus importante.",
        "sources": [
          "Meta breakdown : démographie de qui a vu / qui a acheté",
          "Verbatim client via commentaires Facebook",
          "Média mix à affiner en continu (% statique vs UGC vs shortform vs VSL vs mashup) selon ce qui performe réellement pour CETTE marque",
          "Questionnaire post-achat — QUESTIONS OUVERTES obligatoires, but = découvrir, pas confirmer ce qu'on pense déjà (on est souvent surpris : le client achète pour une raison jugée insignifiante dans le script)",
          "Trustpilot — traité comme un commentaire de plus",
          "SAV — demander un rapport MARKETING bimensuel (pas que logistique) : painpoint récurrent, objections fréquentes, avis ultra-positifs post-achat"
        ]
      },
      {
        "nom": "6. Itération",
        "principe": "Itérer sur ce qui fonctionne (hook/body/angles) — clé du succès même post-Andromeda. Tout en netflix (jamais itérer) = win rate mauvais + comptes qui explosent."
      }
    ],
    "principes_complementaires": [
      "Ne pas réinventer la roue — tout se base sur la data (interne + externe + best in class), jamais sur une intuition de marque.",
      "Data versus ego — on ne 'connaît' pas son audience par supposition ('mon audience aime bien ça' ne veut rien dire), c'est la data qui parle (winners, hook rate, hold rate, ROAS).",
      "Feedback loop opérationnelle — le créatif stratégiste doit être 'dans les tranchées' avec la production, pas en tour d'ivoire : sinon la data/le learning ne redescend pas à 100% vers le vidéo éditeur/static maker, et il y a perte d'information malgré une bonne analyse en amont.",
      "Pattern spotter — analyser ce qui se répète à travers les winners (même footage, même hook, même angle, même avatar) et DOUBLE DOWN dessus. Ex: 11 vidéos winners sur 15 partagent le même style de hook = pattern à exploiter."
    ]
  },
  "content_sourcing_and_backend": {
    "source": "K — 'Comment scaler n'importe quel shop ecom de 10 à 50K/day'.",
    "footage_fatigue": "Utiliser tout le temps les mêmes b-rolls → les gens finissent par scroller en mode auto-pilote (le cerveau a appris à ignorer ces visuels). Le contenu scrappé peut monter à 10-40K/day pour les plus chanceux mais s'essouffle toujours — il faut à terme son propre contenu pour tester le fruit de sa recherche.",
    "3_sources_de_contenu": [
      {
        "nom": "UGC acheté",
        "principe": "Pas de débat, ça fonctionne. Acheter des b-rolls à mettre dans un drive pour faire du mashup, avec un script testable à l'unité — la SOMME des b-rolls accumulés constitue le vrai contenu vital pour les ads."
      },
      {
        "nom": "Gifting",
        "principe": "Offrir le produit pour récupérer du contenu, sans paiement au-delà du produit. Nécessite un très bon produit pour que les créateurs aient envie de le faire."
      },
      {
        "nom": "Product seeding",
        "principe": "Envoyer le produit à de nombreuses créatrices via un programme d'affiliation (pas juste un cadeau) — l'idée n'est PAS de faire de la marge sur le seeding mais d'inciter au volume de contenu.",
        "commission": "Minimum 30%, jusqu'au break-even (50-60%) si besoin pour maximiser le volume de contenu généré.",
        "clause_obligatoire": "Prévoir une clause de réutilisation du contenu sur Meta — les créatrices vendent en organique/TikTok Shop/leur communauté ET la marque récupère tout le contenu pour ses propres ads.",
        "objectif_final": "Accumuler un drive de 2000-4000 b-rolls pour scaler sans footage fatigue, en touchant tous les avatars/angles/désirs."
      },
      {
        "nom": "Micro-influence",
        "principe": "Peut être rentable seul (codes promo + stories). Bonus si la créatrice accepte de céder le contenu pour le paid."
      }
    ],
    "iteration_priorite": {
      "note": "Complète andromeda_fingerprint avec un ordre de priorité opérationnel pour itérer une winneuse.",
      "ordre": [
        "1. Hook — ~80% du focus d'itération, c'est le Pareto de la perf créative.",
        "2. Body + CTA ensemble — ne JAMAIS itérer le CTA de manière isolée. En gardant le hook winner, un meilleur CTA peut faire scaler une créa de 2000-3000€ à beaucoup plus.",
        "3. Content creator — si une créatrice convertit bien pour la marque, lui envoyer plusieurs scripts/concepts/angles différents (exploiter le creator winner, pas juste la créa winner).",
        "4. Format — un angle/statique winner doit être testé en mashup/UGC/shortform et vice-versa. Changer le format seul peut ouvrir une toute nouvelle audience (lecteurs vs amateurs de vidéo dynamique vs gens qui ont besoin de temps pour comprendre le produit)."
      ]
    },
    "reinvestissement_contenu": "Minimum 2-3% du CA réinvesti en production de contenu, en continu — sinon impossible de stabiliser un palier élevé dans la durée. Si la marge ne permet pas ce réinvestissement (rentable seulement à moins de 10-15% de marge sans investir), c'est un problème de fond (offre/CRO/COGS/backend à revoir), pas un problème de créa.",
    "fondations_au_dela_de_l_acquisition": {
      "market_timing": "Accepter la saisonnalité (~tous les produits en ont une) plutôt que de forcer un trimestre creux. Deux options : avoir plusieurs marques sur des saisonnalités complémentaires, OU préparer son momentum en amont et être prêt dès que ça remonte (pas 'arriver comme une fleur').",
      "offre_et_breakeven_mindset": "Ne pas raisonner en ROAS breakeven limitant. Une offre avec breakeven ROAS à 1.3 c'est bien, mais si une offre 1+1 fait monter le breakeven à 1.5 tout en doublant le volume vendu et en faisant doubler/tripler le ROAS réel, la rentabilité totale explose malgré un breakeven affiché plus haut.",
      "backend_spof": {
        "definition": "PSP (Payment Service Provider) = Single Point of Failure : si le PSP est bloqué, il n'y a plus de shop, point final.",
        "mitigations": [
          "SAV solide dès le scaling — un SAV qui tenait à petite échelle craque souvent en scaling, ce qui génère des chargebacks qui dégradent la réputation auprès du PSP/des banques.",
          "Logistique fiable — une mauvaise logistique met aussi le PSP à risque (retards = plaintes = chargebacks).",
          "Diversifier le banking — ne pas dépendre d'une seule banque (ex: Mercury) : ouvrir plusieurs comptes (Wise/Relay/banque physique), les 'chauffer' progressivement pour pouvoir basculer un volume important sans déclencher un blocage automatique en cas de problème sur l'un d'eux.",
          "Bon produit — base non négociable, scaler un mauvais produit est rarement une bonne idée.",
          "Email marketing — flows + campagnes essentiels pour la marge backend une fois à 30-50K/day+."
        ]
      }
    }
  },
  "competitive_intelligence_automation": {
    "source": "'31k/day grâce aux automatisations Claude x Trendtrack x Higgsfield' — décrit une architecture DIFFÉRENTE de celle de Prométhée (workflows Cowork + MCP officiels Trendtrack/Higgsfield connectés à Claude, vs le proxy server.js local de Prométhée qui appelle les API REST directement). À garder comme référence méthodologique / piste d'évolution future, pas comme implémentation à copier telle quelle dans index.html/server.js.",
    "outils": {
      "trendtrack": "Spy tool Meta — veille concurrentielle, MCP officiel disponible (docs.trendtrack.io/connect/claude).",
      "higgsfield": "Génération vidéo IA — MCP officiel disponible (higgsfield.ai/mcp). Déjà utilisé par Prométhée via /api/higgsfield (server.js) en appel REST direct, approche différente mais objectif similaire."
    },
    "cas_usage": [
      {
        "nom": "Recherche produit automatisée",
        "filtres_types": [
          "Shop lancé il y a moins de 6 mois",
          "Croissance de visites sur les 3 derniers mois",
          "Croissance de publicités sur les 3 derniers mois",
          "Minimum 30 publicités actives",
          "Entre 10 000 et 100 000 visites (assez de traction, pas trop saturé pour laisser une opportunité)"
        ],
        "principe": "Ces filtres ciblent des shops EN COURS de scaling (visites et ads en hausse) mais pas encore trop hauts — rapport automatique quotidien ou bihebdomadaire."
      },
      {
        "nom": "Veille concurrentielle continue",
        "donnees_suivies": [
          "Angles testés par les concurrents",
          "Nombre d'ads / concepts lancés",
          "Emails envoyés",
          "Arrivée de nouveaux concurrents",
          "Changements de stratégie (adcopy / offres / prix / LP)"
        ],
        "alerte": "Dès qu'un concurrent scale fort ou cut ses ads, ou qu'un nouveau concurrent arrive sur la niche/le produit, rapport immédiat — permet d'être 'à la page' en continu sans veille manuelle."
      },
      {
        "nom": "Détection du time to market",
        "signal": "Surveiller reach / spend / visites / nombre d'ads sur les leaders d'une niche. Quand ces indicateurs EXPLOSENT (pas une estimation Google Trends, de la vraie data de spend/reach), c'est le feu vert pour lancer ou pousser fort sur cette niche.",
        "exemple_chiffre": "Un shop tournait à ~1K/day. Time to market détecté et anticipé → ajustement de stratégie → 20K/day une semaine plus tard. Le time to market peut changer la rentabilité aussi radicalement en testing qu'en scaling sur une marque déjà active.",
        "regle": "Toujours croiser avec Google Trends et son propre jugement — l'automatisation multiplie les indices, elle ne remplace pas la décision finale."
      },
      {
        "nom": "Création publicitaire automatisée (pipeline complet)",
        "etapes": [
          "Créer un brandtracker regroupant tous les concurrents dans l'outil de spy",
          "Analyser les concepts/angles de créas qui performent le mieux dans la niche",
          "Générer les prompts de création à partir de ces concepts",
          "Génération automatique des créas par l'outil IA vidéo",
          "Réveil avec un batch de créas prêtes à lancer, adaptées au produit"
        ],
        "note": "Variante plus agressive évoquée par la source : reprendre directement les créas d'un concurrent qui a le même produit et les refaire quotidiennement adaptées à sa propre marque — mentionné à titre informatif, pas une pratique que Prométhée recommande sans nuance (zone grise compliance/originalité)."
      }
    ],
    "veille_directe_vs_indirecte": {
      "directe": "Marques vendant le MÊME produit ou des produits très similaires (concurrents directs) — décortiquer hook/script/format/avatar, traduire si autre marché, reproduire l'essence de ce qui marche. Logique : les concurrents dépensent leur propre budget testing sur angles/formats/concepts/avatars — on exploite leur data et leur learning au lieu de réinventer la roue. Outil : Trendtrack (Brand Tracker — folders de concurrents, vue top créas sur 14 jours, media mix, indicateurs ABO/CBO).",
      "indirecte_cross_niche": "Analyser les TOP PLAYERS e-commerce globaux, MÊME HORS NICHE, pour repérer des concepts/structures/façons de copywriter pas encore introduits dans sa propre niche — être le premier à les y importer = différenciation forte. Exemples de top players cross-niche à étudier : Groundlingwell, Obvi, Steppers, Comfort, The Ridge, Happy Mammoth (excellents en landing page + statiques avec dessins/headlines fortes), Crimy/Fabricinews (concepts plus organiques, formats vidéo courts — transposables même en problème-solution textile).",
      "repartition_inspiration_iteration_ideation": "Pas de ratio fixe — dépend de la sophistication du marché et du produit. Peu de concurrents → plus d'itération et d'idéation nécessaires (moins à copier). Beaucoup de concurrents/produits de substitution → plus d'inspiration (ils financent le testing à notre place : on récupère leur learning, on itère vite et mieux pour les 'out-scale'). Règle constante : faire les 3i EN CONTINU pendant tout le scaling — l'itération/isolation reste la phase la plus négligée alors qu'elle est la plus puissante."
    }
  }
};

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

/* ── HEALTH CHECK ──
   Permet à executeCreateBatch() de vérifier que le serveur répond AVANT de lancer
   un appel Claude ou média — évite de découvrir l'échec après le clic utilisateur. */
app.get('/health', (req, res) => {
  res.json({ status: 'ok', ts: Date.now(), port: PORT || 4200 })
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

const PORT = process.env.PORT || 4200
app.listen(PORT, () => {
  console.log(`Promethee server running → http://localhost:${PORT}`)
})
