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
const SOP_DEFAULT = {
  version: 1,
  updated_at: null,
  win_rates: { 'Unboxing': 0.10, 'Offer First': 0.09, 'UGC Testimonial': 0.076, 'Text-based': 0.05, 'Creator Partnership': 0.04 },
  rules_p4: [
    '1 seule variable changée par créa vs la précédente (angle OU format OU hook OU awareness)',
    'Jamais répéter un hook déjà testé',
    'Pour les vidéos UGC : fournir un SCRIPT COMPLET mot à mot (pas juste le hook), avec instructions de mise en scène précises',
    'Pour les statiques : décrire précisément la composition visuelle, le texte overlay, les couleurs',
    'Le message de la créa DOIT matcher le langage exact de la page produit (message match)'
  ],
  batch_mix_instruction: 'Mix obligatoire : au moins 1 vidéo UGC, 1 statique, 1 Offer First si possible.'
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
