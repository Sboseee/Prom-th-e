# ZENITH.AI — DOCUMENT D'INGÉNIERIE
## Transformation vers un système d'intelligence marketing autonome
> Version 1.0 — 2026-06-23 | Basé sur audit code réel index.html (~7900 lignes), server.js, sop.json, audits précédents
> Méthode : lecture intégrale du code. Aucune affirmation non vérifiée dans les sources.

---

## 1. AUDIT COMPLET DU SYSTÈME ACTUEL

### 1.1 Flux de données réel (pas le flux du brief)

```
[ONBOARDING] URL + nom produit
     │ scrapeSite() via allorigins.win
     │ analyzeProductIntelligence() — 1 appel Claude (Sonnet)
     │ Phase 1-4 : review → finance → saveProduct()
     ▼
[PRODUCT BRAIN] prod.avatar{pain, desire, objections, awareness_level}
                prod.{usp, headline, guarantee, angles_saturated, angles_opportunities}
                prod.market_intel{competitors[], market_summary}  ← NOUVEAU (session actuelle)
                prod.{roas_be, roas_target, roas_target_low, roas_minus20}
     │
     ▼
[DECISION ENGINE] runDecisionEngine() — waterfall P0→P9
     │ P0 : aucun produit actif → NO_PRODUCT
     │ P1 : lundi matin → AUDIT_WEEKLY
     │ P2 : métriques absentes → DATA_NEEDED
     │ P3 : anomalies (CPM×1.5, CVR<0.3%, freq≥2.5, budget<200€) → ANOMALY
     │ P4 : 2 cuts consécutifs → DIAGNOSTIC
     │ P5-P7 : seuils J1/J2/J4 → GO/CUT/OPTI
     │ P8 : batch vide → CREATE_BATCH
     │ P9 : attente → WAIT
     ▼
[CREATIVE ENGINE] callClaudeForBriefs(batchSize)
     │ loadSOP() depuis sop.json (1487 lignes)
     │ scrapeSite() pour message match
     │ buildCtxMarket(prod) → ctxMarket enrichi  ← NOUVEAU
     │ Contexte : Product Brain + Voice Profile + Market Intel + Creative Bank (hooks existants)
     │ 1 seul appel Claude → N briefs JSON
     │ Quality Control (doublons hooks, diversité)
     ▼
[MEDIA GENERATION] sendToCreativeEngine()
     │ generateImage() → fal.ai (Ideogram v3 / Flux Pro) ← JAMAIS TESTÉ RÉELLEMENT
     │ generateVideo() → Higgsfield API ← JAMAIS TESTÉ RÉELLEMENT
     ▼
[CREATIVE BANK] status DRAFT → TESTING → ACTIVE/CUT
     │ Attributs : angle/format/hook/awareness/mood/intensite/levier_psychologique
     │ daily[] : {spend, ca, ctr, cpm, atc, purchases, roas} par jour par créative
     ▼
[SAISIE MÉTRIQUES] submitMetrics() — entrée manuelle quotidienne
     │ Par créative : spend/CA/ATC/purchases/CTR/CPM
     │ Calcul ROAS réel = ca_shopify/spend
     ▼
[FEEDBACK LOOP] buildCreativeSignalReport() — CONSTRUIT, NON BRANCHÉ SUR UI
     │ aggregateCreativePerformance() par attribut
     │ angle_scores{productId:{angle:{wins,losses,roas_avg}}}
     │ SIGNAL_MIN_DAYS + SIGNAL_MIN_SPEND avant confiance
     ▼
[DECISION CYCLE SUIVANT] retour à Decision Engine
```

**Point critique :** deux chemins de génération coexistent dans le code.
- `callClaudeForBriefs()` → utilisé en production — 1 appel Claude
- `runCreativeStrategyChain()` + `executeFormatGeneration()` → ~16 appels Claude par batch — jamais appelé en production, code mort

### 1.2 Structure réelle du Product Brain

**Ce qui existe dans le schéma produit :**

```js
// CHAMPS FINANCIERS (solides, calculés automatiquement)
price, cogs, aov, livraison, frais_paiement, taux_retour
roas_be, roas_minus20, roas_target_low, roas_target, atc_threshold

// PRODUCT BRAIN (collectés au nouvel onboarding)
avatar: {
  pain: string,          // douleur principale
  desire: string,        // désir/transformation
  objections: string,    // objections
  awareness_level: 1-6,  // Schwartz
  voice_profile: {tone, phrases[], avoid}  // auto-généré par maybeRefreshVoiceProfile()
}
usp: string
headline: string
guarantee: string
angles_saturated: []
angles_opportunities: []

// MARKET INTELLIGENCE (nouveau — session actuelle)
market_intel: {
  competitors: [{
    id, name, url, type: 'primary'|'secondary',
    site_data: {headline, positioning, price_point, offer_structure},
    creative_signals: [{angle, format, hook_type, awareness, mood, levier, hook_text}],
    scraped_at: timestamp
  }],
  market_summary: {
    signal_quality: 'high'|'medium'|'low',
    tier1_available: bool,
    saturated_angles: [],
    saturated_awareness: [],
    free_awareness_levels: [],
    dominant_formats: [],
    dominant_hooks: [],
    dominant_levers: [],
    price_landscape: string,
    updated_at: timestamp
  }
}

// CREATIVE BANK
creative_bank: [{
  id, product_id, angle, format, hook, awareness, mood, intensite,
  levier_psychologique_principal, strategie_objection,
  script_complet, higgsfield_brief, ad_copy,
  status: 'DRAFT'|'TESTING'|'ACTIVE'|'CUT'|'WINNER',
  winner_locked: bool,
  daily: [{date, spend, ca, ctr, cpm, atc, purchases, roas}]
}]
```

**Ce qui est ABSENT ou INCOMPLET :**
- `store_url` existe dans `account` mais pas indexé dans le produit lui-même de façon fiable
- Aucun `ad_id` Meta → créative Bank ne sait pas à quelle ad correspond quelle performance
- `winner_locked` est dans le produit, pas dans la créative individuelle (incohérence avec HARD CONSTRAINT #4 qui devrait être sur `creative_bank[i].winner_locked`)
- Aucune table de correspondance temporelle angle → performance → date

### 1.3 Dépendances entre modules

```
runDecisionEngine()
  ├── getActiveProduct()           ← OBLIGATOIRE, hard constraint
  ├── ASL.detectAnomalies()       ← lit last_metrics (saisie manuelle)
  ├── ASL.decideJ1/J2/J4()        ← lit last_metrics (saisie manuelle)
  └── buildMission()              ← écrit currentMission + instrStates (état UI global)

callClaudeForBriefs()
  ├── loadSOP()                   ← dépend de server.js actif sur :4200
  ├── scrapeSite()                ← dépend de allorigins.win (service tiers gratuit)
  ├── buildCtxMarket()            ← lit market_intel (peut être vide → graceful fallback)
  ├── getProductBank()            ← lit creative_bank filtrée par product_id
  └── /api/claude                 ← dépend de clé Anthropic dans .env

confirmExecuted()
  └── spend_cycle += spend        ← HARD CONSTRAINT : SEUL endroit autorisé

saveProduct()
  └── setValue()                  ← lit ~18 champs DOM du formulaire caché prod-ov-body
```

### 1.4 Points de rigidité et limitations identifiées

**Rigidités critiques :**

1. **Tout passe par le DOM.** `saveProduct()` lit ses données depuis des champs HTML (`getElementById('pf-pain').value`). Si un champ est absent ou renommé, ça casse silencieusement — valeur vide sauvegardée, aucune erreur.

2. **localStorage comme seule persistance.** ~5-10 Mo selon navigateur. Le `memSet()` avale les erreurs silencieusement (`catch(e){}`). Risque de corruption silencieuse dès ~30-50 images base64 stockées.

3. **Saisie manuelle des métriques.** Toute la logique ASL repose sur `last_metrics` saisi à la main. Aucune validation de cohérence (ex: ROAS calculé = ca/spend mais les valeurs individuelles ne sont pas cross-vérifiées).

4. **Pas d'`ad_id` Meta.** La creative bank ne peut pas corréler une créative avec sa performance réelle dans Meta. L'agrégation par attribut (`angle_scores`) repose sur une correspondance déclarative, pas sur une jointure de données réelle.

5. **Waterfall P0→P9 : first match wins.** Le Decision Engine renvoie UNE mission, jamais plusieurs. Un diagnostic multi-signaux (ex: "CPM haut ET angle saturé ET ROAS borderline") est impossible à exprimer dans l'architecture actuelle.

6. **`_batchRunning` verrou JS.** Si l'onglet est rechargé pendant une génération, le verrou disparaît mais la creative bank peut rester incohérente (DRAFT sans média associé).

7. **`runMissionSequence()` ne génère pas de media.** Le clic sur "Go — Générer" appelle cette fonction qui ne fait que du texte. C'est `runBrain()` (auto-déclenché) qui fait la vraie génération. Les deux chemins divergent — bug critique de confiance.

---

## 2. DIAGNOSTIC PRODUIT

### 2.1 Ce qui fonctionne bien

**Decision Engine (ASL waterfall) — 8/10**
La brique la plus mûre du système. P0-P9 testé sur 13+ scénarios. Seuils ROAS calculés depuis la marge nette réelle. J1/J2/J4 cohérents avec ASL v9. `winner_locked` respecté. `spend_cycle` protégé dans `confirmExecuted()`. C'est solide.

**Doctrine créative (sop.json) — 9/10**
1487 lignes. Taxonomie hooks, mood×intensité, methode_3i, awareness 1-6, awareness-driven copywriting. La doctrine est réelle, structurée, exploitable par Claude. Le problème : aucune boucle de feedback ne vérifie que cette doctrine produit des créatives qui vendent réellement.

**Quality Control — 7/10**
Anti-doublon de hooks, warnings de diversité, méthode 3I. Fonctionne mais jamais validé sur des appels Claude réels (uniquement en simulation).

**Nouveau onboarding autonome — 7/10**
Analyse Claude en 1 appel, extraction avatar marketing, voice profile, angles, competitors. Réduit les inputs manuels de ~70%. Pas encore testé avec vraies APIs.

**Market Intelligence Engine (nouveau) — 6/10**
Architecture Tier 1>2>3 solide. Séparation Product Brain / Market Intel correcte. Pas encore intégré dans un vrai cycle prod.

### 2.2 Ce qui bloque l'évolution vers "IA autonome"

**BLOQUANT NIVEAU 1 — Absence de données automatisées**

Le problème fondamental : Zenith est un conseiller qui ne voit que ce que tu lui montres manuellement. Il ne lit pas Meta. Il ne lit pas Shopify. Toute la sophistication du Decision Engine et du Creative Engine repose sur des inputs manuels quotidiens. Un système autonome ne peut pas fonctionner sur ce modèle — c'est une contradiction structurelle.

**BLOQUANT NIVEAU 2 — Pas de jointure créative↔performance**

`angle_scores` est un compteur déclaratif. La vraie question — "quel angle produit quel ROAS, sur quelle fenêtre temporelle, comparé à quoi ?" — est impossible à répondre proprement sans `ad_id`. Sans cette jointure, le signal report est du bruit habillé en signal.

**BLOQUANT NIVEAU 3 — Waterfall incompatible avec diagnostic multi-signaux**

Un diagnostic autonome ("situation : CPM hausse × angle saturé × frequence 2.2 × ROAS borderline → recommandation priorisée") est incompatible avec un waterfall first-match-wins. Ce sont deux architectures différentes.

**BLOQUANT NIVEAU 4 — LocalStorage non scalable**

La mémoire du système (creative bank, décisions, patterns) vit dans un navigateur. Pas de backup. Pas d'export. Quota silencieux. Un système qui prétend apprendre dans le temps ne peut pas perdre sa mémoire au prochain nettoyage de cache.

**BLOQUANT NIVEAU 5 — Génération média jamais validée**

fal.ai et Higgsfield n'ont jamais été testés avec de vraies clés. Les formats de réponse attendus dans le code (`data.images[0].url`, `data.generation_id||data.request_id`) sont des hypothèses. Un bloc entier du système est théorique.

---

## 3. ARCHITECTURE CIBLE

### 3.1 Principes d'architecture

```
PRINCIPE 1 : Product Brain = source de vérité unique sur le PRODUIT
PRINCIPE 2 : Market Intelligence = source de vérité unique sur le MARCHÉ
PRINCIPE 3 : Ces deux sources ne se mélangent JAMAIS dans le même objet
PRINCIPE 4 : Tout ce que Zenith "sait" vient d'une de ces deux sources — jamais d'une règle hardcodée sur le contenu
PRINCIPE 5 : La décision finale vient toujours de l'ASL. Jamais contredite.
PRINCIPE 6 : Autonomie par palier — chaque action automatisée a un plafond de risque explicite
```

### 3.2 Schéma logique des modules cibles

```
┌─────────────────────────────────────────────────────────────────┐
│                    COUCHE D'INGESTION                           │
│                                                                 │
│  Onboarding ──┐                                                 │
│  (URL→Claude) │                                                 │
│               ▼                                                 │
│  [PRODUCT BRAIN]        [MARKET INTELLIGENCE LAYER]            │
│  prod.avatar             market_intel.competitors               │
│  prod.financials         market_intel.market_summary            │
│  prod.voice_profile      ← Tier 1 (ads uploadées)              │
│  prod.winner_locked      ← Tier 2 (boutiques scrapées)         │
│                          ← Tier 3 (pricing, branding)           │
│                                                                 │
│  [FEEDBACK LAYER — MANQUANT]                                   │
│  Meta API (read) → ad_id → creative_bank.daily[]               │
│  Shopify API (read) → orders → last_metrics                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    COUCHE DE RAISONNEMENT                       │
│                                                                 │
│  [CREATIVE SIGNAL ENGINE]                                       │
│  aggregateCreativePerformance() par attribut                    │
│  buildCreativeSignalReport() → signaux fiables seulement        │
│  SIGNAL_MIN_DAYS + SIGNAL_MIN_SPEND comme garde-fous            │
│                                                                 │
│  [SITUATION REPORT ENGINE — À CONSTRUIRE]                      │
│  Parallèle au waterfall. Multi-signaux simultanés.             │
│  Output : {diagnostic_creatif, diagnostic_media,               │
│            diagnostic_offre, priorité_action}                   │
│                                                                 │
│  [DECISION ENGINE ASL — WATERFALL P0→P9]                       │
│  Décision binaire finale (GO/CUT/WAIT). Inchangé.              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    COUCHE DE GÉNÉRATION                         │
│                                                                 │
│  [CREATIVE ENGINE]                                              │
│  callClaudeForBriefs()                                         │
│  Input : Product Brain + Market Summary + Signal Report +       │
│          Voice Profile + Creative Bank (hooks existants)        │
│  Output : N briefs JSON complets                                │
│                                                                 │
│  [MEDIA GENERATION]                                             │
│  generateImage() → fal.ai                                       │
│  generateVideo() → Higgsfield                                   │
│  Validation humaine avant dépense (brief review step)          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    COUCHE MÉMOIRE ÉVOLUTIVE                     │
│                                                                 │
│  creative_bank[].daily[] → série temporelle par créative        │
│  angle_scores{productId:{angle:{wins,losses,roas_avg,trend}}}   │
│  weekly_patterns[] → max 12 semaines                            │
│  decisions_log[] → max 100 entrées                              │
│                                                                 │
│  CIBLE : sortir du localStorage                                 │
│  → server.js peut écrire un fichier JSON local persistant       │
│  → pas de DB, mais pas de dépendance au navigateur              │
└─────────────────────────────────────────────────────────────────┘
```

### 3.3 Séparation des responsabilités (rôle exact de chaque module)

| Module | Responsabilité UNIQUE | Ne fait PAS |
|---|---|---|
| **Product Brain** | Qui est le client, quel est le produit, pourquoi il achète | Concurrence, angles marché, performance ads |
| **Market Intelligence** | Ce que le marché fait (ads, boutiques) | Data produit, data performance |
| **Creative Signal Engine** | Quel angle/format/hook a quel résultat dans LE TEMPS | Décision GO/CUT, génération |
| **Decision Engine (ASL)** | GO ou CUT ou WAIT — décision binaire finale | Analyse créative, diagnostic |
| **Situation Report** | Diagnostic multi-dimensionnel non-binaire | Décision finale |
| **Creative Engine** | Briefs exploitables par les APIs média | Décision business, data |
| **Mémoire** | Persistance fiable de tout l'état | Raisonnement, décision |

---

## 4. GAP ANALYSIS — ACTUEL vs VISION FINALE

### 4.1 Product Brain

| Aspect | État actuel | Vision finale | Gap |
|---|---|---|---|
| Pain/desire/objections | Saisi manuellement ou inféré par Claude (onboarding) | Inféré automatiquement depuis URL + assets | Onboarding autonome = **résolu** (session actuelle) |
| Voice profile | Auto-généré par Claude depuis avatar | Identique | **Résolu** |
| ROAS seuils | Calculés automatiquement | Identique | **Résolu** |
| Validation complétude | Aucune — garbage-in silencieux | Warning si champs critiques vides | **Manque** — 2 lignes de code |
| Séparation produit/marché | Mélangée avant (pas de market_intel layer) | Séparée strictement | **Partiellement résolu** (session actuelle) |
| Mise à jour auto | Jamais — statique après onboarding | Re-analyse périodique optionnelle | **Manque** — architecture à définir |

### 4.2 Onboarding

| Aspect | État actuel | Vision finale | Gap |
|---|---|---|---|
| Inputs requis | URL + 4 champs financiers | Identique | **Résolu** |
| Intelligence produit | 1 appel Claude + scrape | Identique + assets produit analysés | **Résolu** |
| Intelligence marché | Tier 1 (ads) + Tier 2 (boutiques) | Identique + auto-refresh périodique | Architecture Tier 1-3 **résolue**, refresh = **manque** |
| Formulaire fallback | Mode manuel complet | Identique | **Résolu** |
| Demo mode | Oui | Identique | **Résolu** |

### 4.3 Market Intelligence

| Aspect | État actuel | Vision finale | Gap |
|---|---|---|---|
| Tier 1 (ads concurrentes) | Upload manuel d'images → Claude analyse | Identique (source humaine toujours Tier 1) | **Résolu** (session actuelle) |
| Tier 2 (boutiques) | Scraping via allorigins.win → site_data | Identique | **Résolu** |
| market_summary | Calculé depuis Tier 1+2 | Identique + re-calcul automatique si nouveaux assets | Re-calcul = **manque** |
| Auto-observation concurrence | ABSENTE | Observation de Meta Library (API ou Chrome) | **Manque — scope à définir** |
| Injection dans creative prompt | buildCtxMarket() avec signal quality | Identique mais enrichi par Creative Signal Engine | Enrichissement dynamique = **manque** |

### 4.4 Creative Engine

| Aspect | État actuel | Vision finale | Gap |
|---|---|---|---|
| 1 appel Claude par batch | OUI | OUI (cohérent, pas de changement) | Pas un gap |
| SOP v5 injecté | OUI | OUI | Pas un gap |
| Contexte Product Brain | Pain+desire+objections+USP+voice | Identique + signal performance si disponible | Signal perf = **manque** |
| Contexte Market Intel | buildCtxMarket() avec Tier 1-3 | Identique | **Résolu** |
| Brief review avant dépense média | ABSENT | Étape de validation avant fal.ai/Higgsfield | **Manque critique** |
| Génération media validée en prod | JAMAIS TESTÉE | Validée et fiable | **Gap critique n°1** |
| Feedback loop fermé | OUVERT — signal report non branché sur génération | Signal report alimente le prochain prompt | Signal injection = **manque** |
| Variation intelligente | 3I + anti-doublon | Identique + priorisation par attribut gagnant | Priorisation = **manque** |

### 4.5 Decision Engine

| Aspect | État actuel | Vision finale | Gap |
|---|---|---|---|
| Waterfall P0-P9 ASL | FONCTIONNEL | INCHANGÉ — c'est la brique la plus mûre | Pas un gap |
| Anomalies | CPM, CVR, freq, budget | Identique + tendances (pas seuil statique) | Tendances = **manque** |
| Multi-signaux | IMPOSSIBLE (first match wins) | Situation Report parallèle | Architecture = **manque** |
| Diagnostic 2 cuts consécutifs | P4 DIAGNOSTIC — bloquant sans action suivante | P4 + proposition d'action corrective | Action suivante = **manque** |
| Déclenchement automatique | Seulement si l'app est ouverte | Cron local via server.js | Cron = **manque** |

### 4.6 Memory System

| Aspect | État actuel | Vision finale | Gap |
|---|---|---|---|
| Persistance | localStorage (~5-10 Mo, silencieux si plein) | Fichier JSON local via server.js + export manuel | **Gap critique n°2** |
| Série temporelle par créative | creative_bank[].daily[] → IMPLÉMENTÉ | Identique + relié à ad_id Meta | Liaison ad_id = **manque** |
| angle_scores | Comptage simple (wins/losses/roas_avg) | Scoring pondéré avec tendance temporelle | Pondération = **manque** |
| weekly_patterns | Agrégat compte → max 12 | Agrégat par produit + par attribut créatif | Granularité = **manque** |
| Backup | AUCUN | Export JSON + backup automatique | **Manque immédiat** |
| Ingestion données Meta | MANUELLE | Meta Marketing API en read-only | **Gap fondamental** |

---

## 5. ROADMAP D'EXÉCUTION

### PHASE 1 — STABILISATION (priorité absolue — 0€ de budget API nécessaire)

**Objectif :** Sécuriser ce qui existe. Corriger les bugs critiques. Rendre le système fiable avant de l'augmenter.

---

**Étape 1.1 — Fix `runMissionSequence()` / unicité du chemin CREATE_BATCH**

*Problème :* Deux chemins de génération divergents. Le clic utilisateur sur "Go — Générer" n'appelle pas `generateImage()`/`generateVideo()`. Seul `runBrain()` (auto-déclenché) fait la vraie génération.

*Fichiers impactés :* `index.html` — `runMissionSequence()`, `runBrain()`

*Modification exacte :*
```js
// AVANT : runMissionSequence() affiche une animation 7.2s puis "Mission terminée"
// APRÈS : supprimer runMissionSequence() ou la faire appeler le même chemin que runBrain()
// Option recommandée : dans orbGo(), si missionKey==='CREATE_BATCH', appeler executeCreateBatch() directement
// executeCreateBatch() = callClaudeForBriefs() → boucle sendToCreativeEngine() → displayCreative()
```

*Ordre :* Première modification à faire. Bloque la confiance utilisateur.
*Risque :* Aucun — correction d'un bug, pas d'ajout de logique.

---

**Étape 1.2 — Fix `memSet()` : erreur bruyante + export JSON**

*Problème :* `catch(e){}` vide. Quota localStorage peut exploser silencieusement.

*Fichiers impactés :* `index.html` — `memSet()`, barre de navigation

*Modification exacte :*
```js
function memSet(data){
  try{
    localStorage.setItem(MEM_KEY, JSON.stringify(data))
  } catch(e) {
    pushToMiniChat('⚠️ CRITIQUE : Sauvegarde échouée (quota dépassé ?). Exporte ta mémoire maintenant.')
    console.error('[memSet] FAILED:', e)
  }
}

// + Ajouter bouton "Exporter mémoire" dans view-parametres :
function exportMemory(){
  var blob = new Blob([JSON.stringify(memGet(), null, 2)], {type:'application/json'})
  var a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'zenith_backup_' + new Date().toISOString().slice(0,10) + '.json'
  a.click()
}

// + Ne jamais stocker les images en base64 dans creative_bank.
// Stocker uniquement l'URL fal.ai / Higgsfield retournée par l'API.
// Modifier displayCreative() : entry.image_url = result.url (pas entry.image_base64 = result.base64)
```

*Ordre :* Étape 1.2. Peut être faite en parallèle de 1.1.
*Risque :* Faible — amélioration défensive.

---

**Étape 1.3 — Validation complétude Product Brain avant génération**

*Problème :* Un onboarding incomplet génère des créatives génériques silencieusement.

*Fichiers impactés :* `index.html` — avant `callClaudeForBriefs()`, dans `runDecisionEngine()` path CREATE_BATCH

*Modification exacte :*
```js
function checkProductBrainCompleteness(prod){
  var missing = []
  if(!prod.avatar || !prod.avatar.pain || prod.avatar.pain.length < 10) missing.push('douleur (pain)')
  if(!prod.avatar || !prod.avatar.desire || prod.avatar.desire.length < 10) missing.push('désir (desire)')
  if(!prod.usp || prod.usp.length < 10) missing.push('USP')
  return missing
}
// Dans P8 (CREATE_BATCH), avant de lancer :
var missing = checkProductBrainCompleteness(prod)
if(missing.length) {
  pushSignal({type:'warning', text:'Product Brain incomplet', 
    sub:'Champs manquants : ' + missing.join(', ') + '. Les créatives seront génériques.',
    whyText:'Complète ces champs dans Réglages pour des créatives plus précises.'})
}
// Ne pas bloquer — juste avertir.
```

*Ordre :* Étape 1.3, après 1.1-1.2.
*Risque :* Nul — warning non-bloquant.

---

**Étape 1.4 — Vérification proactive de server.js avant mission**

*Problème :* Si server.js n'est pas lancé, l'échec est découvert après le clic.

*Fichiers impactés :* `index.html` — dans `runBrain()` ou `executeCreateBatch()`

*Modification exacte :*
```js
async function checkServerHealth(){
  try {
    var r = await fetch(SERVER + '/health', {method:'GET', signal: AbortSignal.timeout(3000)})
    return r.ok
  } catch(e) { return false }
}
// Dans server.js : ajouter app.get('/health', (req,res) => res.json({status:'ok'}))
// Dans executeCreateBatch() : if(!await checkServerHealth()) { pushToMiniChat('⚠️ server.js injoignable...'); return }
```

*Ordre :* Étape 1.4.
*Risque :* Faible. Timeout de 3s suffit.

---

**Étape 1.5 — Fix `winner_locked` : le mettre sur la créative, pas le produit**

*Problème :* `winner_locked` est dans le schéma produit dans CLAUDE.md mais dans `creative_bank[i]` dans le code réel. Vérifier et harmoniser.

*Fichiers impactés :* `index.html` — `confirmExecuted()`, Decision Engine, `computeSaturationLevels()`

*Modification exacte :* Vérifier que `getProductBank().filter(c => c.winner_locked)` est cohérent partout. Si `winner_locked` n'est pas dans chaque creative_bank entry, l'ajouter dans `callClaudeForBriefs()` response processing.

*Ordre :* Étape 1.5.
*Risque :* Faible — correction de cohérence.

---

### PHASE 2 — DÉCOUPLAGE (après validation media réelle)

**Objectif :** Séparer proprement les responsabilités. Réduire la dépendance aux inputs manuels. Fermer la boucle de feedback créatif.

---

**Étape 2.1 — Valider fal.ai + Higgsfield avec 1 vrai batch**

*C'est le seul prérequis qui coûte de l'argent (crédits API). Tout le reste dépend de ça.*

*Fichiers impactés :* `index.html` — `generateImage()`, `generateVideo()`, `displayCreative()`

*Ce qu'il faut vérifier :*
- Le format de réponse réel fal.ai (`data.images[0].url` est-il correct ?)
- Le format de réponse réel Higgsfield (`data.generation_id||data.request_id` — est-ce le bon champ ?)
- Le polling Higgsfield fonctionne-t-il réellement sur l'endpoint `/status/{id}` ?
- Le modèle Ideogram v3 vs Flux Pro : les `image_size` acceptés sont-ils `aspect_ratio_4_5` ou autre format ?

*Modification attendue :* corriger les formats de réponse dans `generateImage()` et `generateVideo()` selon ce que les vraies APIs retournent.

*Ordre :* Prérequis de toute la Phase 2.
*Risque :* Faible techniquement. Coût : quelques euros de crédits pour 1 image + 1 vidéo test.

---

**Étape 2.2 — Ajouter étape de validation brief avant dépense média**

*Problème :* Actuellement, un brief Claude mauvais déclenche immédiatement fal.ai/Higgsfield (~0.10-0.30$ par asset).

*Fichiers impactés :* `index.html` — `sendToCreativeEngine()`, UI Creative Bank

*Modification exacte :*
```js
// Dans sendToCreativeEngine() : ne pas appeler generateImage()/generateVideo() directement
// Sauvegarder le brief avec status='BRIEF_PENDING' dans creative_bank
// Afficher dans l'UI un panneau "Briefs en attente de validation"
// Bouton "Approuver et générer" → lance alors generateImage()/generateVideo()
// Bouton "Rejeter" → passe le brief en status='REJECTED', log la raison
```

*Ordre :* Étape 2.2. Dépend de 2.1.
*Risque :* Moyen — changement d'UX significatif. À faire après 2.1 confirmé.

---

**Étape 2.3 — Brancher Creative Signal Report sur le prompt callClaudeForBriefs()**

*Problème :* `buildCreativeSignalReport()` existe, produit des signaux fiables, mais n'est jamais injecté dans le prompt de génération suivant.

*Fichiers impactés :* `index.html` — `callClaudeForBriefs()`

*Modification exacte :*
```js
// Dans callClaudeForBriefs(), après buildCtxMarket() :
var signalReport = buildCreativeSignalReport(mem, 7) // 7 derniers jours
var ctxSignals = ''
if(signalReport.has_enough_data) {
  ctxSignals = '\n\nSIGNAUX DE PERFORMANCE RÉELS (sur 7 jours) :'
  signalReport.signals.forEach(function(s) {
    ctxSignals += '\n- ' + s.attribute + ' : "' + s.best.value + '" performe MIEUX (ROAS '
      + s.best.roas.toFixed(2) + ') vs "' + s.worst.value + '" (ROAS ' + s.worst.roas.toFixed(2) + ')'
    ctxSignals += ' — PRIORISE cet axe dans ce batch.'
  })
  ctxSignals += '\nNOTE : ces signaux viennent de données réelles. Ils ont la priorité sur les heuristiques génériques.'
} else {
  ctxSignals = '\n\nAucun signal de performance fiable disponible — utilise la doctrine SOP v5.'
}
// Injecter ctxSignals dans le prompt Claude (après ctxMarket)
```

*Ordre :* Étape 2.3. Dépend de données réelles accumulées (minimum SIGNAL_MIN_DAYS).
*Risque :* Faible — enrichissement du prompt, pas de changement d'architecture.

---

**Étape 2.4 — Persister la mémoire hors localStorage**

*Problème :* localStorage = bombe à retardement. Quota silencieux, dépendant du navigateur.

*Fichiers impactés :* `server.js`, `index.html` — `memGet()`, `memSet()`

*Modification exacte :*
```js
// server.js : ajouter deux routes
app.post('/api/memory/save', (req, res) => {
  fs.writeFileSync('./zenith_memory.json', JSON.stringify(req.body, null, 2))
  res.json({ok: true})
})
app.get('/api/memory/load', (req, res) => {
  if(fs.existsSync('./zenith_memory.json')) {
    res.json(JSON.parse(fs.readFileSync('./zenith_memory.json', 'utf8')))
  } else { res.json(null) }
})

// index.html : memSet() envoie aussi vers /api/memory/save (async, non-bloquant)
// memGet() au chargement : si localStorage vide, tente /api/memory/load
```

*Ordre :* Étape 2.4. Critique pour la longévité du système.
*Risque :* Moyen. Introduire une dépendance à server.js pour la persistance. Stratégie : localStorage reste le cache immédiat, server.js = backup fiable.

---

### PHASE 3 — INTELLIGENCE (après plusieurs semaines de données réelles)

**Objectif :** Faire apprendre Zenith depuis ses propres données. Construire le Situation Report multi-signaux.

---

**Étape 3.1 — Situation Report Engine (parallèle au waterfall)**

*Ce que c'est :* Un moteur de diagnostic qui tourne EN PARALLÈLE de runDecisionEngine(). Il ne remplace pas le waterfall — il lui ajoute une couche de contexte.

*Fichiers impactés :* `index.html` — nouveau module après Decision Engine

*Interface :*
```js
function runSituationReport(mem, prod) {
  var report = {
    diagnostic_creatif: null,
    diagnostic_media: null,
    diagnostic_offre: null,
    priorite: null,
    confidence: 'low' // low|medium|high selon volume de données
  }

  // Diagnostic créatif : signal report + saturation angles
  var signalReport = buildCreativeSignalReport(mem, 7)
  if(signalReport.has_enough_data) {
    report.diagnostic_creatif = {
      meilleur_attribut: signalReport.signals[0],
      angles_epuises: mem.angle_scores[mem.active_product_id] // ceux avec trop de variantes
    }
  }

  // Diagnostic media : tendances CPM/CTR (pas seuil statique)
  // Diagnostic offre : ATC ratio vs seuil atc_threshold
  // Priorité : quel diagnostic est le plus urgent

  return report
}
// Afficher dans Mission Board sous forme de "contexte enrichi" avant la décision waterfall
```

*Ordre :* Étape 3.1. Nécessite minimum 2-3 semaines de données réelles.
*Risque :* Moyen. Ne pas afficher un diagnostic "low confidence" comme une certitude.

---

**Étape 3.2 — Scoring d'angle pondéré (remplace comptage simple)**

*Problème :* `angle_scores{wins, losses, roas_avg}` est du comptage. Pas de pondération temporelle, pas de tendance.

*Fichiers impactés :* `index.html` — `ensureAngleScoresBucket()`, `updateAngleScore()`

*Modification exacte :*
```js
// Ajouter dans chaque angle_score entry :
// trend: 'improving'|'declining'|'stable'
// recency_weight: 1.0 → décroît pour les anciennes performances
// last_roas_delta: évolution ROAS J-7 à J-1

// Algorithme de recency_weight :
// score_pondaré = (roas_récent × 0.6) + (roas_historique × 0.4)
// Si moins de 5 observations → confiance 'low', ne pas utiliser pour prioriser
```

*Ordre :* Étape 3.2. Dépend de données accumulées.
*Risque :* Faible si les thresholds de confiance sont respectés.

---

**Étape 3.3 — Détection de fatigue créative par tendance (pas seuil statique)**

*Problème actuel :* Anomalie CPM = seuil statique (×1.5 vs hier). Fragile sur une seule journée atypique.

*Modification :* Remplacer le seuil one-day par une tendance 3-5 jours dans `ASL.detectAnomalies()`.
```js
// Au lieu de : if(metrics.cpm > (camp.spend_yesterday_cpm || metrics.cpm) * 1.5)
// Faire : calculer la moyenne glissante CPM sur 3 jours depuis weekly_patterns
// Anomalie si CPM J0 > moyenne 3j × 1.3 ET tendance haussière confirmée 2j consécutifs
```

*Ordre :* Étape 3.3.
*Risque :* Faible — amélioration de la logique existante.

---

### PHASE 4 — AUTONOMISATION (après Phase 3 validée)

**Objectif :** Paliers d'autonomie contrôlés. Jamais de décision à risque non supervisée.

---

**Étape 4.1 — Cron local via server.js (déclenchement automatique)**

*Problème :* Zenith ne tourne que si l'app est ouverte dans le navigateur. Les bulles "21h30 — métriques ?" ne déclenchent rien si l'onglet est fermé.

*Modification :*
```js
// server.js : ajouter node-cron
const cron = require('node-cron')
cron.schedule('30 21 * * *', () => {
  // Envoyer une notification locale (electron-notify ou écrire un fichier trigger)
  // que l'app détecte au prochain chargement
  fs.writeFileSync('./zenith_trigger.json', JSON.stringify({
    type: 'METRICS_REMINDER', at: Date.now()
  }))
})
// Dans init() de index.html : fetch('/api/pending-triggers') → afficher la bulle correspondante
```

*Ordre :* Étape 4.1.
*Risque :* Faible si le cron est lecture/notification uniquement (pas d'action sur Meta).

---

**Étape 4.2 — Connexion Meta Marketing API en lecture seule**

*Ce que c'est :* Récupérer spend/impressions/CTR/CPM/ROAS **par ad_id** depuis Meta Insights API. Remplace la saisie manuelle partielle.

*Prérequis :* App Meta for Developers avec permission `ads_read`. Token long-lived. Ad account ID.

*Fichiers impactés :* `server.js` — nouvelle route `/api/meta/insights`
```js
app.get('/api/meta/insights', async (req, res) => {
  const { since, until, level } = req.query
  const url = `https://graph.facebook.com/v19.0/act_${process.env.META_ACCOUNT_ID}/insights`
    + `?fields=ad_id,spend,impressions,clicks,ctr,cpm,actions,action_values`
    + `&time_range={"since":"${since}","until":"${until}"}`
    + `&level=${level || 'ad'}`
    + `&access_token=${process.env.META_ACCESS_TOKEN}`
  // ...
})
```

*Ce que ça change en profondeur :* Avec l'`ad_id`, on peut créer la table de correspondance `ad_id ↔ creative_bank[i].id`. Alors `buildCreativeSignalReport()` devient une vérité, pas une estimation.

*Ordre :* Étape 4.2 — gate de toute la vision autonome.
*Risque :* Élevé — process admin Meta, token à renouveler, rate limiting. Ne pas automatiser les écriture avant d'avoir validé la lecture.

---

**Étape 4.3 — Autonomie L3 : pause automatique plafonnée**

*Ce que c'est :* Zenith peut proposer d'exécuter lui-même UNE action à faible risque sur un périmètre strict.

*Règle stricte — ne jamais aller au-delà :*
```
Action autorisée : PAUSE d'une créative non-winner
Conditions : spend > 50€ ET roas < roas_minus20 ET pas winner_locked
Plafond : 1 action/jour maximum, jamais sur budget > 100€ engagé
Validation : bouton "Approuver la pause" obligatoire — jamais 100% automatique
Action interdite : augmenter un budget, supprimer une campagne, modifier une winner
```

*Fichiers impactés :* `index.html` — Decision Engine P3/P5/P7, `server.js` — route `/api/meta/action` (écriture)

*Ordre :* Étape 4.3 — dernière étape. Ne pas brûler vers ça.
*Risque :* Élevé. Un bug à ce niveau coûte de l'argent réel. Validation humaine obligatoire même en L3.

---

## 6. ÉVOLUTION VERS "LIBRE ARBITRE CONTRÔLÉ"

### 6.1 Définition opérationnelle

Le "libre arbitre contrôlé" de Zenith n'est pas une décision random IA. C'est la capacité à formuler une **hypothèse marketing non sollicitée** basée sur des signaux observés.

Exemple concret :
```
Zenith observe (depuis données réelles) :
  - Hook "Avez-vous essayé d'arrêter de ..." : CTR 3.2%, ROAS 2.8 — meilleure créative
  - Trend CPM haussier depuis 3 jours (+18%)
  - Niveau conscience 2 non saturé par la concurrence (market_summary)
  - Aucune créative sur "Hidden Fear" × niveau 2 dans le batch actuel

Zenith formule sans qu'on le lui demande :
  "Signal détecté : ton meilleur hook tourne depuis 5 jours (fatigue proche).
   Opportunité : niveau de conscience 2 libre + "Hidden Fear" non testé.
   Proposition : batch de 2 créatives sur cet axe avant la fenêtre de fatigue."
```

Ce n'est pas une décision autonome. C'est une **hypothèse formulée avec ses sources**. L'humain valide. C'est le niveau 2.5 entre conseiller et copilote.

### 6.2 Architecture pour le libre arbitre contrôlé

**Ce qui permet au système de formuler une hypothèse :**
1. `buildCreativeSignalReport()` → détecte les signaux de performance réels
2. `buildMarketSummary()` → détecte les opportunités marché (niveaux conscience libres, angles non saturés)
3. `buildCtxMarket()` → sait ce que la concurrence fait
4. `checkProductBrainCompleteness()` → sait si le produit est assez documenté

**La fonction qui manque : `generateMarketingHypothesis()`**
```js
function generateMarketingHypothesis(mem, prod) {
  var hypotheses = []

  var signals = buildCreativeSignalReport(mem, 7)
  var market = prod.market_intel && prod.market_intel.market_summary

  // Hypothèse 1 : attribut en hausse + opportunité libre
  if(signals.has_enough_data && market) {
    signals.signals.forEach(function(s) {
      if(s.best && market.free_awareness_levels && market.free_awareness_levels.length) {
        hypotheses.push({
          type: 'OPPORTUNITY_COMBINATION',
          attribute: s.attribute,
          best_value: s.best.value,
          free_awareness: market.free_awareness_levels[0],
          confidence: 'medium',
          rationale: s.attribute + ' "' + s.best.value + '" performe à ROAS '
            + s.best.roas.toFixed(2) + ' + niveau conscience ' + market.free_awareness_levels[0] + ' libre'
        })
      }
    })
  }

  // Hypothèse 2 : winner proche de la fatigue (trend CTR déclinant)
  // Hypothèse 3 : angle saturé dans la concurrence = éviter ce cycle

  return hypotheses
}
```

**Règle inviolable :** une hypothèse formulée par Zenith doit toujours afficher :
- La source des données (signal performance, market intel, product brain)
- Le niveau de confiance (low/medium/high)
- Ce qu'elle permet de tester, pas ce qu'elle "sait"

### 6.3 Paliers d'autonomie avec garde-fous

| Niveau | Description | Garde-fou |
|---|---|---|
| **L1 — Conseiller (aujourd'hui)** | Recommande, tu exécutes tout | Aucun risque |
| **L2 — Hypothèses proactives** | Génère des propositions non sollicitées (étape 3.1 + `generateMarketingHypothesis`) | Toujours sourcées + niveau confiance affiché |
| **L2.5 — Pré-remplissage** | Pré-remplit l'action dans Meta (texte CBO, structure campagne) sans l'exécuter | Validation humaine obligatoire |
| **L3 — Pause plafonnée** | Pause 1 créative/jour max, budget < 100€, non-winner seulement | Validation bouton obligatoire + log de toute action |
| **L4 — Interdit** | Budget, création, duplication autonomes | Risque trop élevé pour un solo-opérateur. Ne pas construire. |

---

## 7. RISQUES SYSTÈME

### 7.1 Risques de dérive logique

**Risque ROUGE — Décision sans données fiables**
Signal report présenté avec confiance "high" alors que les données sont insuffisantes.
*Mitigation :* `SIGNAL_MIN_DAYS` et `SIGNAL_MIN_SPEND` déjà dans le code. Ne jamais les abaisser pour "avoir quelque chose à montrer". Si pas de données fiables → afficher "Pas assez de données" explicitement.

**Risque ROUGE — Fatigue créative détectée sur données de 1 jour**
Anomalie CPM basée sur un seul jour peut déclencher un faux positif.
*Mitigation :* Étape 3.3 — remplacer le seuil one-day par une tendance 3j.

**Risque ORANGE — Waterfall silencieux sur scénario non couvert**
P9 = WAIT pour tout ce qui ne matche pas P0-P8. Si un scénario réel n'est pas couvert, Zenith dit "Attends" sans explication.
*Mitigation :* Ajouter dans P9 un diagnostic "je suis en WAIT parce que : [raison explicite]" plutôt qu'un silence.

### 7.2 Risques de duplication de systèmes

**Risque — Deux moteurs créatifs actifs non synchronisés**
`callClaudeForBriefs()` (production) et `runCreativeStrategyChain()` (mort) coexistent. Si un jour on branche le second par erreur, les deux tournent.
*Mitigation :* Supprimer ou marquer explicitement `runCreativeStrategyChain()` comme "réservé phase 5 — ne pas appeler en production". Commenter 3 lignes, pas supprimer le code complet.

**Risque — Signal report et Market Summary produisent des conclusions contradictoires**
`buildCreativeSignalReport()` dit "angle Social Proof performe". `market_summary` dit "Social Proof saturé chez la concurrence".
*Mitigation :* C'est intentionnel et correct — tes données > données marché. Documenter cette priorité explicitement dans le prompt Claude : "tes signaux réels de performance ont la priorité sur la saturation marché".

### 7.3 Risques de pollution du Product Brain

**Risque ROUGE — Market Intel injecté dans le Product Brain**
Si un concurrent fait X, et que Zenith l'absorbe dans `prod.avatar`, le Product Brain n'est plus ton produit — c'est un mix de ton produit et de la concurrence.
*Mitigation :* HARD CONSTRAINT déjà dans l'architecture : `market_intel` et `prod.avatar` sont des objets séparés, jamais fusionnés. `buildCtxMarket()` injecte le marché DANS LE PROMPT mais jamais dans `prod.avatar`. Documenter ce garde-fou dans CLAUDE.md.

**Risque ORANGE — Voice Profile régénéré sur mauvaise base**
`maybeRefreshVoiceProfile()` régénère le voice profile si les champs avatar ont changé. Si un onboarding mal fait écrase `prod.avatar.pain` par quelque chose de générique, le voice profile suivant sera générique.
*Mitigation :* Étape 1.3 — validation complétude avant tout re-calcul du voice profile.

### 7.4 Risques de mauvaise hiérarchie des données

**Risque — Tier 3 utilisé comme signal créatif**
`market_summary` peut inclure des données Tier 3 (prix, branding) dans `dominant_formats` si Tier 1 est absent.
*Mitigation :* `buildMarketSummary()` est codé avec fallback Tier 3 SEULEMENT si Tier 1 est absent. Ne pas modifier cette logique. Si Tier 1 absent → `signal_quality='low'` → Claude reçoit cette information et peut adapter.

**Risque — `angle_scores` pondéré trop tôt (pas assez de données)**
Si on ajoute la pondération temporelle (étape 3.2) trop tôt, on pondère du bruit.
*Mitigation :* Threshold minimum : 5 créatives distinctes sur l'attribut, minimum 7 jours de données. En dessous → comptage simple, pas pondération.

### 7.5 Risques de perte de performance créative

**Risque — Signal report devient une règle rigide**
Si le signal report dit "Mood Positif performe mieux" et que le prompt Claude interprète ça comme "TOUJOURS Positif", on brise la diversité.
*Mitigation :* Le signal report formule des tendances, pas des règles. Libellé du prompt : "PRIORISE cet axe" et non "UTILISE UNIQUEMENT cet axe". Maintenir la contrainte de diversité dans le QC.

**Risque — Contamination créative par les concurrents**
Analyser les créatives concurrentes (Tier 1) et les injecter dans le prompt peut pousser Claude à reproduire les codes visuels existants plutôt qu'à proposer une différenciation.
*Mitigation :* La règle est déjà dans `buildCtxMarket()` : "ces insights informent CE QUE TU NE DOIS PAS FAIRE, pas ce que tu dois faire". La maintenir explicitement dans chaque version du prompt.

---

## ANNEXE — Priorité exécutoire immédiate

Sans attendre aucun budget API, ces modifications peuvent être faites aujourd'hui :

1. **Fix memSet() bruyant + bouton export** — 20 lignes. Critique.
2. **Fix runMissionSequence()** — unification des deux chemins CREATE_BATCH. Critique.
3. **Validation complétude Product Brain** — warning non-bloquant. 10 lignes.
4. **Route /health dans server.js** — 2 lignes. Vérification proactive.
5. **Commenter runCreativeStrategyChain()** — documenter qu'elle est réservée. 3 lignes.

Ensuite, dès le premier budget test disponible :
6. **Valider fal.ai (1 image) + Higgsfield (1 vidéo)** — débloquer tout le reste.
7. **Ajouter étape validation brief** avant dépense média — avant tout scale.

---

*Document généré le 2026-06-23. Basé sur lecture intégrale du code réel. Aucune affirmation spéculative sur ce que le code "devrait" faire — uniquement ce qu'il fait réellement au moment de la rédaction.*
