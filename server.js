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
  version: 2,
  updated_at: null,
  win_rates: { 'Unboxing': 0.10, 'Offer First': 0.09, 'UGC Testimonial': 0.076, 'Text-based': 0.05, 'Creator Partnership': 0.04 },
  rules_p4: [
    '1 seule variable changée par créa vs la précédente (angle OU format OU hook OU awareness)',
    'Jamais répéter un hook déjà testé',
    'Pour les vidéos UGC : fournir un SCRIPT COMPLET mot à mot (pas juste le hook), avec instructions de mise en scène précises',
    'Pour les statiques : décrire précisément la composition visuelle, le texte overlay, les couleurs',
    'Le message de la créa DOIT matcher le langage exact de la page produit (message match)'
  ],
  batch_mix_instruction: 'Mix obligatoire : au moins 1 vidéo UGC, 1 statique, 1 Offer First si possible.',
  diversity_rules: {
    min_angles_per_batch: 3, min_types_annonces_per_batch: 2, min_awareness_levels_per_batch: 2,
    priority: 'fond_avant_forme',
    priority_note: "Diversifier les angles/messages a plus d'impact que diversifier les formats."
  },
  andromeda_fingerprint: {
    elements: ['hook_visuel', 'texte_headline', 'audio_musique', 'format', 'angle_central'],
    min_elements_changed: 3, most_impactful: 'angle_central',
    rule: 'Changer minimum 3 des 5 éléments pour ne pas être vu comme quasi-doublon par Andromeda.'
  },
  awareness_levels: [
    { level: 1, name: 'Unaware', approche: 'Accroche choc / storytelling / hook curiosité → faire réaliser le problème' },
    { level: 2, name: 'Problem Aware', approche: 'Faire découvrir qu\'une solution existe — éducation, pain points' },
    { level: 3, name: 'Solution Aware', approche: 'Montrer le produit comme LA solution — expliquer pourquoi ça marche' },
    { level: 4, name: 'Product Aware', approche: 'Différenciation vs concurrents — USP, avis, comparatif' },
    { level: 5, name: 'Most Aware', approche: 'Urgence, promo, nouveauté — juste une raison d\'acheter maintenant' }
  ],
  angle_categories: ['Douleur', 'Curiosité', 'Transformation', 'Peur de rater', 'Bénéfice immédiat', 'Comparaison concurrents'],
  hook_styles: ['Question choc', 'Stat surprenante', 'Déclaration contre-intuitive', 'Pattern interrupt visuel'],
  power_words: {
    douleur: ['No more', 'Never again', 'Fed up with', 'Struggling with', 'Say goodbye', 'Stop'],
    urgence: ['Today only', 'Last chance', 'Limited', 'Until midnight', 'Final sale', 'Now'],
    confiance: ['Recommended by', 'Trusted by', '#1', 'Certified', 'Award-winning', 'Proven'],
    transformation: ['Boost', 'Reduce', 'Improve', 'Fast', 'Instant', 'Get', 'Up to', 'Revolutionary'],
    facilite: ['Effortless', 'Risk-free', 'Hassle-free', 'Instant', 'No learning curve']
  },
  headline_formula: '[Power Word] + [Pain Point] + [Contexte]',
  copywriting_structures: [
    { name: 'AIDA', usage: 'Tout format', logique: 'Attention → Intérêt → Désir → Action', awareness: [1,2,3,4,5] },
    { name: 'PAS', usage: 'Niveau 2-3', logique: 'Problem → Agitate → Solution', awareness: [2,3] },
    { name: 'BAB', usage: 'Before/After', logique: 'Before → After → Bridge', awareness: [2,3,4] },
    { name: 'Rock Bottom', usage: 'UGC testimonial, Founder Story', logique: 'Pire moment → découverte → résultat', awareness: [1,2,3] },
    { name: 'Objection First', usage: 'Niveau 4', logique: 'Objection → gestion → résolution', awareness: [4] },
    { name: 'Yes Ladder', usage: 'Audiences froides 1-2', logique: '3-5 questions oui → produit', awareness: [1,2] },
    { name: 'Offre Irrésistible', usage: 'Tous niveaux', logique: 'Dream Outcome → UMS+Time Delay → Probabilité de réussite → Zéro effort+Urgence', awareness: [1,2,3,4,5] }
  ],
  benefice_vs_feature: { formule: '[Bénéfice] grâce à [Feature]', regle: 'La feature justifie, le bénéfice vend.' },
  ump_ums: {
    ump_def: "Unique Mechanism Problem — d'où vient le problème, la cause réelle.",
    ums_def: 'Unique Mechanism Solution — pourquoi CE produit fonctionne, le mécanisme différenciant.'
  },
  ad_copy_skeleton: ['Hook (2 premières lignes)', 'Bénéfices en 3-5 check marks', 'Preuve sociale ou autorité', 'Offre + urgence en fin'],
  ad_copy_max_words: 150,
  titre_types: [
    { type: 'Promesse directe + délai', exemple: 'Dites adieu à la perte de cheveux en 3 semaines', usage: 'Toujours' },
    { type: 'Offre chiffrée', exemple: 'Jusqu\'à -35% — ce soir seulement', usage: 'Promos' },
    { type: 'Bénéfice fonctionnel simple (USP)', exemple: 'Soutient et stabilise vos genoux', usage: 'Créa minimaliste' },
    { type: 'Preuve sociale + chiffre', exemple: '50 000 clients satisfaits', usage: 'Marché aware' },
    { type: 'Autorité', exemple: 'Recommandé par les podologues', usage: 'Niche santé' },
    { type: 'Question intrigante', exemple: 'Et si votre douleur n\'était pas juste de la fatigue ?', usage: 'Unaware' }
  ],
  titre_complementarity_rule: 'Créa chargée → titre simple. Créa minimaliste → titre USP ou question. Jamais répéter dans le titre ce qui est déjà dans la créa.',
  types_annonces: [
    { type: 'UGC Testimonial authentique', awareness: [3,4], win_rate: 0.076, spend_ratio: 'Élevé', type_media: 'video', cle: 'Imperfection = confiance, structure avant/après.' },
    { type: 'Founder Story', awareness: [1,2], win_rate: null, spend_ratio: 'Élevé quand scale', type_media: 'video', cle: 'Connexion humaine, vulnérabilité, le pourquoi avant le quoi.' },
    { type: 'Ugly Ads', awareness: [1,2,3], win_rate: null, spend_ratio: 'Moyen', type_media: 'video', cle: "Low-fi délibéré (= équivalent 'native'), script doit être excellent." },
    { type: 'US vs DM (comparaison)', awareness: [3], win_rate: null, spend_ratio: 'Moyen', type_media: 'video', cle: 'Comparaison directe sans nommer le concurrent.' },
    { type: 'Before/After + Social Proof', awareness: [3,4], win_rate: null, spend_ratio: 'Moyen', type_media: 'flexible', cle: 'Spécificité des résultats, honnêteté sur le doute initial.' },
    { type: 'Offer First (BOFU)', awareness: [5], win_rate: 0.09, spend_ratio: '30% du spend total', type_media: 'flexible', cle: 'Urgence dès 3s, clarté absolue en <2s.' },
    { type: 'Unboxing', awareness: [3,4], win_rate: 0.10, spend_ratio: 'Moyen-élevé', type_media: 'video', cle: 'Sous-exploité malgré la performance.' },
    { type: 'Réponses aux Objections', awareness: [4], win_rate: null, spend_ratio: 'Moyen', type_media: 'video', cle: 'Facecam, vraies objections, honnêteté.' },
    { type: 'Text-based Lettre', awareness: [1,2,3], win_rate: null, spend_ratio: 'Très élevé quand ça marche', type_media: 'image', cle: "Ultra sous-utilisé (= équivalent 'native'), format le moins saturé." },
    { type: 'Creator Partnership', awareness: [1,2,3], win_rate: null, spend_ratio: 'Élevé quand scale', type_media: 'video', cle: 'Diffusé depuis le compte créateur, favorisé par l\'algo.' }
  ],
  types_annonces_priorite: 'Chercher bon win rate ET gros spend ratio — les vraies anomalies.',
  note_native: "Pas de catégorie 'Native' séparée — Ugly Ads et Text-based Lettre jouent ce rôle.",
  scaling_personas_prompt: 'Mon produit est [X]. Ma cible large validée est [démographie + comportement]. Génère 5 personas ultra-précis : description, ce qu\'ils ont déjà essayé, sentiment profond, résultat concret recherché, hook exact, niveau de conscience visé.',
  diagnostic_formula: {
    name: 'Volume x Diversité x Qualité x Analyse x Double Down',
    note: 'Si une variable est à 0, le résultat est 0. Mesurer le NOMBRE de winners, pas le win rate.',
    loi_8_pourcent: '8% des créatives sont winners (60% du spend). ~100 créas testées pour 8 winners.'
  },
  business_stage_rules: {
    note: 'Phase business (CA cumulé), distincte de campaign.asl_phase. Réglable par l\'utilisateur.',
    stages: [
      { id: 'testing_0_1kd', label: 'Testing — 0 à 1KD de CA cumulé', approche: 'Copier le concurrent bête et méchant — angle, format ET funnel déjà validés. Pas de nouvel angle inventé.', marketing_research: false },
      { id: 'opti_1kd_traction', label: 'Opti — 1KD+ avec traction', approche: '50% traduction concurrent + 50% début marketing research.', marketing_research: 'partial' },
      { id: 'scaling_1kd_stable', label: 'Scaling — 1KD+ stable', approche: 'Marketing research complète, créer avec sa propre data.', marketing_research: true }
    ]
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
