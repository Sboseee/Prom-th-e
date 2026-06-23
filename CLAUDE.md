# ZENITH.AI — SYSTEM MEMORY v4
> Lis ce fichier EN ENTIER avant toute action. Dernière mise à jour : 2026-06-23

---

## ⛔ SECTION 1 — HARD CONSTRAINTS (LEVEL 1 — NEVER VIOLATE)

Ces règles ne se discutent pas. Aucune exception, aucune optimisation qui les contourne.

```
1. localStorage key = "promethee_v1"        → NE JAMAIS RENOMMER
2. spend_cycle                               → s'incrémente UNIQUEMENT dans confirmExecuted (GO J1/J2)
                                               JAMAIS dans submitMetrics
3. runDecisionEngine()                       → waterfall P0→P9 STRICT. Ne jamais réordonner.
4. winner_locked = true                      → une créative winner ne se coupe JAMAIS
5. migrateMemoryIfNeeded()                   → ne jamais supprimer cette fonction
6. API keys                                  → JAMAIS dans index.html. Toujours dans .env via server.js
7. getActiveProduct()                        → toujours utiliser cette fonction, jamais mem.product
8. ASL v9                                    → La décision finale vient toujours de l'ASL. Jamais contredire.
```

---

## SECTION 2 — SYSTEM OVERVIEW

**Zenith.ai** (anciennement Prométhée) : cerveau décisionnel e-commerce pour Meta Ads.
Pas un dashboard — un copilote qui décide, guide, et génère des créatives.

- Utilisateur : Ecomnameo, solo, France
- Objectif actuel : outil personnel opérationnel
- Objectif futur : SaaS

**État actuel (2026-06-23)** : frontend complet, backend jamais testé avec de vraies clés API.
Aucune image ou vidéo réelle n'a encore été produite. Blocs A+B+CLR+LOT1 implémentés, prêt pour BLOC C.

**Nouvelles features (session 2026-06-23) :**
- Market Intelligence Engine : Tier 1 (créatives concurrentes analysées par Claude, ×2) / Tier 2 (boutiques scrapées, ×1) / Tier 3 (pricing legacy)
- `buildCtxMarket(prod)` : remplace l'ancien inline ctxMarket — hiérarchise Tier1>Tier2>Tier3
- `checkServerHealth()` : vérification /health avant tout appel API réel
- Warning Product Brain incomplet (non-bloquant) avant CREATE_BATCH
- `image_prompt` : champ dédié fal.ai dans le brief (séparé de script_complet)
- `needs_text_overlay` : booléen explicit — remplace le fragile string-matching sur format
- `generateImage(brief, opts)` / `generateVideo(brief, opts)` : acceptent `{simulate:true}`
- `sendToCreativeEngine(brief, opts)` : propage opts vers les deux générateurs
- `opts.simulate_media` dans executeCreateBatch : deep simulate pipeline média sans API
- `importMemoryJSON()` : restauration depuis backup JSON (complète exportMemoryJSON)
- `runCreativeStrategyChain()` : commentée — réservée Phase 5, jamais appelée en prod
- **Creative Lifecycle Router (CLR) v1.0** : voir section 6b ci-dessous

**LOT 1 Zezinho — intégré (2026-06-23) :**
- `decideJ4(roas, roas_be, roas_target, roas_minus20)` : zone OPTI = roas_minus20 → roas_target (fix critique)
- `decideJ2(roas, roas_be, cost_per_atc, aov)` : utilise le coût/ATC en € (plus le count brut)
- Nuance J2 documentée Zezinho : si ROAS < 1 mais coût/ATC < 50% seuil → signal orange (CUT reste la règle)
- Nouveaux champs `last_metrics` : `cost_per_atc`, `checkout_init`, `reach` (colonnes Ads Manager Zezinho)
- `analyzeKPIs(metrics, prod)` : benchmarks CPM/CTR/CPC/Thumbstop/Freq/CVR/ROAS/ATC après chaque saisie
- `checkCogsReminder(mem)` : rappel COGS toutes les 2 semaines en phase SCALING (méthode Zezinho)
- `scaling_started_at` : timestamp J4 GO confirmé (campaign data model)
- Form métriques : 4 nouveaux champs — Coût/ATC (€), Paiement initié, Couverture, preview en temps réel

---

## SECTION 3 — ARCHITECTURE (RUNTIME)

```
~/promethee/
├── index.html      ← app complète (HTML + CSS + JS vanilla, fichier unique ~8200 lignes)
├── server.js       ← proxy Express local, port 4200 (PORT = process.env.PORT || 4200)
├── .env            ← clés API (jamais committé)
├── sop.json        ← SOP v5 créative engine (1487 lignes, specs complètes)
├── package.json
└── CLAUDE.md
```

**Règles stack :**
- Vanilla JS uniquement — pas de framework, pas de import/export, pas de classes ES6
- Pas de build step — on modifie index.html directement
- Pas de base de données — tout en localStorage clé `promethee_v1`
- Serveur local sur `http://localhost:4200`

**Lancer :**
```bash
cd ~/promethee && node server.js & && open http://localhost:4200
```

**Structure index.html :**
- CSS : lignes ~1–550 (design system, variables, composants)
- HTML : lignes ~550–780 (3 vues : view-mission / view-memoire / view-parametres)
- JS : lignes ~780–fin (ordre dans le script ci-dessous)

**Ordre JS dans le script (ne pas réorganiser) :**
1. Config (SERVER, KEYS, MEM_KEY)
2. Design system UI (ORB_TYPES, ORB_BUTTONS, renderOrb)
3. Signal Feed (pushSignal, renderSignalFeed)
4. Action Flow (startActionFlow, advanceActionFlow, resetActionFlow)
5. Mémoire (memGet, memSet, defaultMemory, migrateMemoryIfNeeded)
6. ASL Engine (objet ASL avec toutes les règles)
7. Decision Engine (runDecisionEngine — waterfall if/return)
7b. Market Intelligence Engine (analyzeCompetitorCreatives, scrapeCompetitorSites, buildMarketSummary, buildCtxMarket)
8. Creative Engine (callClaudeForBriefs, simulateBriefsResponse, generateImage, generateVideo, sendToCreativeEngine)
8b. Creative Lifecycle Router (computeRoasTrend, detectCreativeFatigue, routeCreative, overrideBriefWithStage, applyCreativeLifecycleRouter)
9. UI handlers (submitMetrics, confirmExecuted, saveProduct, openProdOverlay, importMemoryJSON, exportMemoryJSON…)
9b. Meta Execution Engine (generateMetaExecutionPlan, getInstructions — strat Zezinho)
10. Daily bubbles + checkAndUpdateLevel
11. Init

---

## SECTION 4 — DATA MODEL

**localStorage clé `promethee_v1` :**
```js
{
  account: {
    store_url, market, budget_total, budget_remaining, daily_budget,
    level             // 'A' | 'B' | 'C' — géré par checkAndUpdateLevel()
  },
  products: [],       // voir schéma produit ci-dessous
  active_product_id: null,
  campaign: {
    asl_phase,        // 'TESTING' | 'OPTI' | 'SCALING'
    cycle_number,
    spend_cycle,      // cumul CONFIRMÉ uniquement (voir HARD CONSTRAINT #2)
    j1_decided, j2_decided, j4_decided,
    cuts_count,
    is_monday_audit_done,
    scaling_started_at, // timestamp J4 GO confirmé → déclenche rappel COGS à 14j
    roas_history: []    // [{roas, date}] — 3 derniers jours, sliding array
  },
  last_metrics: {
    spend, ca_shopify, orders, ctr, cpc, cpm, thumbstop, freq, impr, cvr,
    atc,              // count ATC (#) depuis Meta
    cost_per_atc,     // coût par ATC (€) — utilisé par ASL J2 (source de vérité)
    checkout_init,    // paiement initié (#) — colonne Zezinho Ads Manager
    reach,            // couverture (reach) — colonne Zezinho Ads Manager
    roas_real,        // calculé : ca_shopify / spend
    atc_ratio,        // ATCs par commande — indicateur funnel
    saisie_at
  },
  creative_bank: [],  // chaque créative porte angle/format/hook/awareness/mood + daily[]
  angle_scores: {},
  decisions_log: [],  // max 100 entrées
  weekly_patterns: [] // max 12 semaines
}
```

**Schéma produit :**
```js
{
  id, name, price, cogs, aov, livraison, frais_paiement, taux_retour,
  roas_minus20,       // seuil perte −20%
  roas_be,            // breakeven
  roas_target_low,    // marge nette 15%
  roas_target,        // marge nette 20% ✦
  atc_threshold,      // AOV × 0.20
  pain, desire, objections, awareness_level,
  usp, guarantee, headline,
  angles_saturated, angles_opportunities, competitors,
  images: [], voice_profile,
  notes,
  winner_locked
}
```

**Calcul 4 seuils ROAS (marge nette réelle) :**
```js
effectiveCogs = cogs + livraison + price*(frais_paiement/100) + cogs*(taux_retour/100)
margeNette    = (price - effectiveCogs) / price
roas_be         = 1 / margeNette
roas_target_low = margeNette > 0.15 ? 1 / (margeNette - 0.15) : null
roas_target     = margeNette > 0.20 ? 1 / (margeNette - 0.20) : null
roas_minus20    = 1 / (margeNette + 0.20)
```

---

## SECTION 5 — DECISION ENGINE (CORE — NE PAS MODIFIER)

`runDecisionEngine()` = waterfall if/return, ordre strict P0→P9 :

```
P0  Aucun produit actif          → NO_PRODUCT
P1  Lundi matin, audit pas fait  → AUDIT_WEEKLY
P2  Métriques absentes           → DATA_NEEDED
P3  Anomalie détectée            → ANOMALY_{TYPE}
      CPM ×1.5 vs hier           → ELEVATE Mission Board
      CVR < 0.3%
      Fréquence ≥ 2.5            → ELEVATE Mission Board
      Budget < 200€              → ELEVATE Mission Board
P4  2 cuts consécutifs           → DIAGNOSTIC
P5  Seuil J1 (50€)               → J1_GO / J1_CUT
P6  Seuil J2 (100€)              → J2_GO / J2_CUT
P7  Seuil J4 (200€)              → J4_GO / J4_OPTI / J4_CUT
P8  Batch nécessaire             → CREATE_BATCH
P9  Sinon                        → WAIT
```

**Règles ASL (résumé — méthode Zezinho stricte) :**
```
J1 (50€)  : sales >= 1 → GO | sales==0 && cpc<1 → GO | sinon → CUT
J2 (100€) : roas > roas_be → GO
            | 1 ≤ roas ≤ roas_be ET cost_per_atc < 20% AOV → GO (signal funnel)
            | roas < 1 ET cost_per_atc < 50% seuil → CUT + signal nuance orange
            | sinon → CUT
J4 (200€) : roas >= roas_target → SCALE
            | roas >= roas_minus20 → OPTI (zone récupérable — 3 cartouches)
            | roas < roas_minus20 → CUT (perte nette confirmée)
Scaling   : paliers 50→100→150→200→300→400→500€/j
Winner    : winner_locked = true → jamais coupé
COGS      : rappel bi-mensuel automatique en phase SCALING (scaling_started_at)
```

**TODO câblé mais pas encore actif :** roas_history dans J4 (collecté dans submitMetrics, logique scaling non branché dans runDecisionEngine)

---

## SECTION 6 — CREATIVE ENGINE

**Chemin réel utilisé en prod (1 seul appel Claude) :**
```
CREATE_BATCH → callClaudeForBriefs(batchSize)
  → loadSOP() depuis sop.json
  → scrapeSite() pour message match
  → prompt enrichi avec creative_bank + angle_scores + product avatar
  → Claude retourne N briefs JSON (script_complet + higgsfield_brief)
  → Quality Control (doublons hooks, diversité)
  → generateImage() ou generateVideo() selon type_media
  → sauvegarde en creative_bank avec status DRAFT→TESTING
```

**Chemin alternatif (jamais appelé en prod) :** runCreativeStrategyChain + executeFormatGeneration
→ ~16 appels Claude par batch, trop coûteux, conservé dans le code mais inactif.

**Specs complètes du moteur créatif :** lire `~/promethee/sop.json` (SOP v5, 1487 lignes)
Ce fichier contient : taxonomie hooks, mood×intensité, leviers copywriting, methode_3i, awareness levels 1-6, format specs.

---

## SECTION 6b — CREATIVE LIFECYCLE ROUTER (CLR) v1.0

Intercède APRÈS `callClaudeForBriefs()`, AVANT `generateImage()`/`generateVideo()`.
Zéro appel API, zéro écriture mémoire — pure transformation de briefs.

**Flux complet :**
```
ASL → CREATE_BATCH → callClaudeForBriefs() → applyCreativeLifecycleRouter()
  → overrideBriefWithStage() par brief → sendToCreativeEngine() → fal.ai OU Higgsfield
```

**Stage determination (routeCreative) :**
```
SCALE      → roas >= roas_target ET roas_trend ≠ DECLINING
VALIDATION → roas >= roas_be (zone BE→target, ou SCALE avec trend déclinant)
TEST       → tout le reste (pas de ROAS, ROAS < roas_be, spend < 50€)
Déclassement HARD : roas < roas_minus20 ET spend ≥ 30€ → TEST forcé
```

**Mapping STRICT (aucun chevauchement) :**
```
TEST       → fal.ai Flux Pro v1.1  → IMAGE_STATIC  → 5-10€/j par créa
VALIDATION → fal.ai Flux Pro v1.1  → UGC_IMAGE     → 10-20€/j par créa
SCALE      → Higgsfield            → VIDEO_UGC      → 20-50€/j par créa
```

**Règle absolue :** aucune vidéo Higgsfield sans stage SCALE. Double guard :
1. `overrideBriefWithStage()` met `type_media='image'` en TEST/VALIDATION
2. `sendToCreativeEngine()` contient un guard qui logge et fallback si stage ≠ SCALE

**Champ ajouté dans `creative_bank` :**
```js
stage: 'TEST' | 'VALIDATION' | 'SCALE'   // décidé par CLR à la génération, immuable ensuite
```

**Fonctions nouvelles (section 8b dans index.html) :**
```
computeRoasTrend(mem)              → 'DECLINING'|'IMPROVING'|'STABLE'|'INSUFFICIENT_DATA'
detectCreativeFatigue(creative)    → {fatigued:bool, reason:'SHARP_DROP'|'STAGNATION_3D'|'BELOW_MINUS20'|null}
routeCreative(params)              → {stage,tool,model,format,budget_level,next_action,rationale}
overrideBriefWithStage(brief,rout) → brief enrichi avec _routing, type_media overridé
applyCreativeLifecycleRouter(b,m,p)→ {briefs[],batch_stage,roas_trend,roas_at_routing,spend_at_routing}
```

**Claude informé du stage AVANT génération :**
`ctxStage` injecté dans le prompt de `callClaudeForBriefs` → Claude génère le bon contenu
(image_prompt pour TEST/VALIDATION, script_complet pour SCALE) avant que le router override.

---

## SECTION 7 — INTEGRATIONS

Toutes les APIs passent par server.js. HTML appelle /api/*, jamais directement.

```
/api/claude      → https://api.anthropic.com/v1/messages        (claude-sonnet-4-6)
/api/fal         → https://fal.run/{model}
  needs_text_overlay=true OU Offer First/Text-based → fal-ai/ideogram/v3 (aspect_ratio:'4:5'|'9:16')
  Lifestyle / fond blanc  → fal-ai/flux-pro/v1.1 (image_size:{width,height})
  Prompt fal.ai = brief.image_prompt (fallback: script_complet si pas de tag [HOOK])
/api/higgsfield  → https://api.higgsfield.ai/v1/generations      (UGC 9:16 10s 720p)
/api/elevenlabs  → https://api.elevenlabs.io/v1/text-to-speech/  (eleven_multilingual_v2)
/api/scrape      → https://api.allorigins.win/get?url=...
```

**Statut APIs :**
- Claude : ✅ clé configurée, jamais testée en prod
- fal.ai : ✅ clé configurée, jamais testée (BLOC D)
- Higgsfield : ⚠️ endpoint à valider avec vraies clés
- ElevenLabs : ❌ clé non configurée dans .env

---

## SECTION 8 — DEV RULES

```
memGet() / memSet()                → tout accès localStorage
getActiveProduct()                 → jamais mem.product (inexistant)
pushToMiniChat(text)               → afficher dans la barre de chat
pushSignal({type,text,sub,whyText})→ Signal Feed
elevateToMissionBoard(missionData) → alertes critiques
_brainRunning                      → guard anti double-exécution, toujours vérifier

Commits :
feat:     nouvelle fonctionnalité
fix:      correction de bug
refactor: restructuration sans changement de comportement
style:    CSS uniquement
docs:     documentation
```

---

## SECTION 9 — ROADMAP (BLOCS A→G)

### ✅ BLOC A (0€) — IMPLÉMENTÉ
Frontend testé. Overlay produit, seuils ROAS, Mission Board, saisie créative.

### ✅ BLOC B (0€) — IMPLÉMENTÉ
`opts.simulate` dans generateImage / generateVideo / sendToCreativeEngine.
`opts.simulate_media=true` dans executeCreateBatch pour deep simulate bout-en-bout.
→ Tester : `testCreateBatchSimulation()` + inspecter le résultat console.

### 🔴 PROCHAIN : BLOC C (quelques centimes)

Un seul appel réel callClaudeForBriefs avec batchSize=1.
Vérifier que le JSON enrichi revient bien formé. Valider `image_prompt` + `needs_text_overlay` dans la réponse.

### BLOC D (crédits média)
Transformer un brief validé en vraie image (fal.ai) + vraie vidéo (Higgsfield).
Premier test bout-en-bout réel. Prérequis : BLOC C OK.

### BLOC E (0€)
Fermer la boucle Feedback Loop : réinjecter automatiquement les attributs gagnants
de buildCreativeSignalReport dans generateAngles / callClaudeForBriefs.
Aujourd'hui Bloc 8 = fondation, pas encore une vraie boucle fermée.

### BLOC F (après D en prod plusieurs semaines)
Optimisation Performance : scoring créatif, priorisation budget angles, calibration seuils.
Impossible à coder sans données réelles.

### BLOC G (dernier)
Version 1.0 : polish, vérification boutons, documentation usage.

---

## SECTION 10 — FICHIERS DE RÉFÉRENCE

**Lire dans cet ordre si début de session :**

```
1. ~/promethee/VISION.md                          → LIRE EN PREMIER — intention produit, philosophie,
                                                     ce que Zenith.ai doit être et ressentir
2. ~/promethee/sop.json                           → SOP v5 complet (créative engine, hooks, copywriting,
                                                     mood×intensité, methode_3i, awareness 1-6)
3. ~/LOT 1/1 Étape 1 testing — Répliquer des ads.rtf   → ASL v9 Testing (bible J1/J2 — source primaire)
4. ~/LOT 1/1.3 Étape 2 scaling — Les itérations.rtf    → ASL v9 Scaling (bible J4+ — source primaire)
```

**Référence technique approfondie :**
```
~/promethee/ROADMAP_EXECUTION_TECHNIQUE.md    → audit technique détaillé, risques, dépendances
~/promethee/AUDIT_PROMETHEE_2026-06-21.md     → audit complet du code réel (état à 2026-06-21)
~/promethee/AUDIT_STRATEGIQUE_OS_MARKETING.md → stratégie marketing, positionnement SaaS
~/LOT 1/Tester et Scaler sur Facebook Ads.rtf → guide complet Meta Ads 2026
```

---

## SECTION 11 — UI / DESIGN (NON-CRITIQUE)

```css
/* Variable principale (--red en CSS mais c'est du violet) */
--red: #8b5cf6;  --rdim: rgba(139,92,246,0.09);  --rborder: rgba(139,92,246,0.30);

/* Logo Zenith.ai — light pass premium */
@keyframes zenithLogo {
  0%   { background-position: 100% center }
  7%   { background-position: 82% center }
  93%  { background-position: 18% center }
  100% { background-position: 0% center }
}
.tb-logo {
  font-size: 25px; font-weight: 800;
  background: linear-gradient(90deg,
    #ffffff 0%, #ffffff 42%, #ede9fe 44%, #c4b5fd 46%,
    #a78bfa 48%, #8b5cf6 50%, #a78bfa 52%, #c4b5fd 54%,
    #ede9fe 56%, #ffffff 58%, #ffffff 100%);
  background-size: 300% auto;
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  animation: zenithLogo 9s ease-in-out infinite;
}

/* Vues actives (3 vues, Indicateurs SUPPRIMÉE) */
view-mission / view-memoire / view-parametres

/* Overlay produit #prod-overlay : position:fixed, transform:translateY(100%) → .open */
/* 6 sections : Économie / Avatar / Offre / Angles / Visuels / Notes */
```

---

## CONTACT

Propriétaire : Ecomnameo — ecomnameo@gmail.com
Repo : https://github.com/Sboseee/Prom-th-e (privé)
