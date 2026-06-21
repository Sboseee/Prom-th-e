# PROMÉTHÉE — CLAUDE.md
> Mémoire système pour Claude Code, Cowork, et toute IA qui travaille sur ce repo.
> Lis ce fichier en entier avant de toucher au code.

---

## QU'EST-CE QUE PROMÉTHÉE

Prométhée est un cerveau décisionnel e-commerce pour piloter des campagnes Meta Ads.
Il n'est PAS un dashboard classique. C'est un copilote qui décide, guide, et génère des créatives.

**Utilisateur unique** : Ecomnameo, e-commerçant solo, France.
**Usage** : usage personnel exclusif, pas de multi-utilisateurs pour l'instant.

---

## STACK TECHNIQUE

```
~/promethee/
├── index.html      # App complète (HTML + CSS + JS vanilla — tout en un seul fichier)
├── server.js       # Proxy Node.js local (Express) — gère les appels API sans CORS
├── .env            # Clés API (jamais committé sur Git)
├── package.json
└── CLAUDE.md       # Ce fichier
```

**Pas de framework.** Vanilla HTML/CSS/JS uniquement.
**Pas de build step.** On modifie `index.html` directement.
**Pas de base de données.** Tout est en `localStorage` clé `promethee_v1`.
**Serveur local** sur `http://localhost:4200`

---

## LANCER LE PROJET

```bash
cd ~/promethee
node server.js &
open http://localhost:4200
```

---

## ARCHITECTURE — index.html

Le fichier est structuré en 3 grandes parties :

### 1. CSS (lignes ~1 à ~550)
Variables CSS, design system, composants UI.
Couleurs principales :
- Rouge `#e03030` → alertes, actions système
- Vert `#22c55e` → succès, winners
- Orange `#f59e0b` → actions user, avertissements
- Violet `#a855f7` → insights, opportunités
- Gris `#9ca3af` → info, attente

### 2. HTML (lignes ~550 à ~780)
4 vues dans le dock :
- `view-mission` → Mission Board + Signal Feed (vue principale)
- `view-indicateurs` → saisie métriques KPI
- `view-memoire` → Creative Bank
- `view-parametres` → catalogue produits + réglages

### 3. JS (lignes ~780 à fin)
Ordre dans le script :
1. Config (`SERVER`, `KEYS`, `MEM_KEY`)
2. Design system UI (`ORB_TYPES`, `ORB_BUTTONS`, `renderOrb`)
3. Signal Feed (`pushSignal`, `renderSignalFeed`)
4. Action Flow (`startActionFlow`, `advanceActionFlow`, `resetActionFlow`)
5. Mémoire (`memGet`, `memSet`, `defaultMemory`, `migrateMemoryIfNeeded`)
6. ASL Engine (`ASL` object avec toutes les règles)
7. Decision Engine (`runDecisionEngine` — waterfall if/return)
8. Creative Engine (`callClaudeForBriefs`, `scrapeSite`, `generateImage`, `generateVideo`)
9. UI handlers (`submitMetrics`, `confirmExecuted`, `saveProduct`, etc.)
10. Init (tout en bas)

---

## MÉMOIRE PERSISTANTE (localStorage)

Clé : `promethee_v1`

```js
{
  account: { store_url, market, budget_total, budget_remaining, daily_budget },
  products: [],           // catalogue N produits
  active_product_id: null,
  campaign: {
    asl_phase,            // 'TESTING' | 'OPTI' | 'SCALING'
    cycle_number,
    spend_cycle,          // cumul des jours CONFIRMÉS uniquement
    j1_decided, j2_decided, j4_decided,
    cuts_count,
    is_monday_audit_done
  },
  last_metrics: {
    spend, ca_shopify, orders, ctr, cpc, cpm, thumbstop, freq, cvr, atc,
    roas_real,            // calculé : ca_shopify / spend
    saisie_at
  },
  creative_bank: [],
  angle_scores: {},
  decisions_log: [],      // max 100 entrées
  weekly_patterns: []     // max 12 semaines
}
```

**RÈGLE CRITIQUE** : `spend_cycle` ne s'incrémente PAS dans `submitMetrics`.
Il s'incrémente uniquement dans `confirmExecuted` lors des décisions GO (J1/J2).
`runDecisionEngine` calcule `spendCumul = spend_cycle + last_metrics.spend`.

---

## DECISION ENGINE — PRIORITÉS STRICTES

`runDecisionEngine()` est un waterfall if/return dans cet ordre exact :

```
P0 — Aucun produit actif          → NO_PRODUCT
P1 — Lundi matin + audit pas fait → AUDIT_WEEKLY
P2 — Métriques absentes           → DATA_NEEDED
P3 — Anomalie détectée            → ANOMALY_{TYPE}
     CPM ×1.5 vs hier → ELEVATE Mission Board
     CVR < 0.3%
     Fréquence ≥ 2.5 → ELEVATE Mission Board
     Budget < 200€   → ELEVATE Mission Board
P4 — 2 cuts consécutifs           → DIAGNOSTIC
P5 — Seuil J1 (50€)              → J1_GO / J1_CUT
P6 — Seuil J2 (100€)             → J2_GO / J2_CUT
P7 — Seuil J4 (200€)             → J4_GO / J4_OPTI / J4_CUT
P8 — Batch nécessaire             → CREATE_BATCH
P9 — Sinon                        → WAIT
```

**La Bible = ASL v9.** Ne jamais contredire l'ASL.
Décisions J1/J2/J4 basées sur la méthode Zezinho.
Paliers scaling : 50→100→150→200→300→400→500€/j

---

## RÈGLES ASL IMPLÉMENTÉES

```js
// J1 — 50€ spend
decideJ1(sales, cpc):
  sales >= 1 → GO
  sales == 0 && cpc < 1 → GO (signal CPC)
  sinon → CUT

// J2 — 100€ spend
decideJ2(roas, roas_be, atc, aov):
  roas > roas_be → GO
  roas >= 1 && atc_ratio < 0.20 → GO
  sinon → CUT

// J4 — 200€ spend
decideJ4(roas, roas_be, roas_target):
  roas >= roas_target → GO (scaling)
  roas >= roas_be → OPTI (P6, 3 cartouches)
  sinon → CUT (retour P0)

// Grisage angle
shouldGrisAngle: tests >= 3 && spend >= 150 && impressions >= 3000 && confidence < 0.20

// Winner Lock
winners ne sont JAMAIS coupés par un signal court terme
```

---

## PROXY SERVEUR LOCAL

Toutes les APIs passent par `server.js` sur `localhost:4200`.
Le HTML appelle `/api/*`, jamais directement les APIs externes.

```
/api/claude      → https://api.anthropic.com/v1/messages
/api/fal         → https://fal.run/{model}
/api/higgsfield  → https://api.higgsfield.ai/v1/generations
/api/elevenlabs  → https://api.elevenlabs.io/v1/text-to-speech/{voice_id}
/api/scrape      → https://api.allorigins.win/get?url=...
```

---

## PIPELINES CRÉATIFS

### Images → fal.ai
```
Offer First, Text-based → fal-ai/ideogram/v3  (texte dans l'image)
Lifestyle, fond blanc   → fal-ai/flux-pro/v1.1 (réalisme photo)
Format ads : 4:5 (feed) ou 9:16 (stories/reels)
```

### Vidéos → Higgsfield
```
UGC, Unboxing, vidéo    → api.higgsfield.ai
Polling toutes les 5s jusqu'à COMPLETED
Format : 9:16, 10s, 720p
```

### Voix → ElevenLabs
```
Script UGC → voix réaliste MP3
model: eleven_multilingual_v2
Retour : buffer audio base64
```

### Briefs → Claude (claude-sonnet-4-6)
```
callClaudeForBriefs() :
1. Scrape le site boutique (message match)
2. Lit la creative bank (hooks déjà testés, winners)
3. Lit les angle_scores (angles disponibles)
4. Génère N briefs JSON avec script_complet + higgsfield_brief
5. Route vers generateImage() ou generateVideo() selon type_media
```

---

## CONVENTIONS DE CODE

- **Vanilla JS uniquement** — pas de framework, pas de import/export
- **Pas de classes ES6** — fonctions classiques `function name(){}`
- **Pas d'arrow functions complexes** dans les boucles (bugs de closure)
- **Toujours utiliser `getActiveProduct()`** jamais `mem.product` (inexistant)
- **`memGet()` / `memSet()`** pour tout accès localStorage
- **`pushToMiniChat(text)`** pour afficher dans la barre de chat
- **`pushSignal({type, text, sub, whyText})`** pour le Signal Feed
- **`elevateToMissionBoard(missionData)`** pour les alertes critiques

---

## VARIABLES GLOBALES IMPORTANTES

```js
var SERVER = 'http://localhost:4200'  // proxy local
var KEYS = { fal, higgs_id, higgs_secret }  // dans .env, pas hardcodé
var currentMission = 'loading'        // missionKey actif
var instrStates = {}                  // {missionKey: missionData}
var _brainRunning = false             // guard contre double exécution
var signalStore = []                  // Signal Feed, max 8
```

---

## CE QUI NE FONCTIONNE PAS ENCORE

- ElevenLabs : clé API pas encore configurée dans .env
- Higgsfield : endpoint API natif à valider avec les vraies clés
- fal.ai : à tester avec un vrai batch CREATE_BATCH

---

## CE QU'IL NE FAUT PAS TOUCHER

- La logique `runDecisionEngine()` — elle suit l'ASL v9 strictement
- L'ordre des priorités P0→P9 dans le waterfall
- `spend_cycle` — ne jamais l'incrémenter dans `submitMetrics`
- `winner_locked` — un winner ne se coupe jamais
- `migrateMemoryIfNeeded()` — ne pas supprimer cette fonction

---

## POUR MODIFIER PROPREMENT

1. Modifier `index.html` ou `server.js` dans `~/promethee/`
2. Tester sur `http://localhost:4200`
3. Commiter :
```bash
git add .
git commit -m "feat: description courte"
git push
```

**Convention commits :**
- `feat:` nouvelle fonctionnalité
- `fix:` correction de bug
- `refactor:` restructuration sans changement de comportement
- `style:` CSS uniquement
- `docs:` documentation

---

## CONTACT / CONTEXTE

Propriétaire : Ecomnameo
Repo : https://github.com/Sboseee/Prom-th-e (privé)
Stack e-commerce : Shopify + Meta Ads + dropshipping → pivot brand
Objectif SaaS : outil solo → commercialisation future
