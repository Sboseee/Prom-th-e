require('dotenv').config()
const express = require('express')
const cors = require('cors')
const https = require('https')
const http = require('http')
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
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(req.body)
    })
    const data = await r.json()
    res.json(data)
  } catch(e) {
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
