# ZENITH.AI — SYSTEM MEMORY v7
> Lis ce fichier EN ENTIER avant toute action. Dernière mise à jour : 2026-06-25

---

## 🚀 PROCHAINE SESSION — LIRE EN PREMIER

**Ce qui a été fait en 2026-06-25 :** Refonte onboarding + grille produits (4 chantiers, tous vérifiés jsdom + self-test ASL 7/7).
1. **Nouveau parcours onboarding** : Étape 1 (URL/assets) → Étape 2 (finances) → analyse → grille. Le bouton Étape 1 ne lance plus l'analyse directement (`goToFinanceStep`), c'est l'Étape 2 (`onbFinanceCta`/`launchAnalysisFromFinance`) qui la lance.
2. **Option A** : le produit est créé MÊME si l'analyse IA échoue (pas de crédit Claude) → `enrichment_status:'pending'`. Plus jamais de formulaire vide. Quand le crédit revient, le chemin succès met `enrichment_status:'done'` + remplit avatar/angles/market_intel.
3. **Taux de retour facultatif** + bulle de relance dès les premières ventes (`checkReturnRateReminder`). **Bundles/offres** optionnels en Étape 2 (`pfBundles`/`buildBundlesPayload`) → MAJ AOV + stockés + injectés au moteur créatif.
4. **Grille produits premium** : centrage permanent (`justify-content:safe center`), repositionnement FLIP, gros "+" nu, carte brouillon au clic (`startProductDraft`/`_draftActive`), hover inclinaison 3D + bordure violette (ambré supprimé), bordure blanche en normal.

**Ce qu'on attaque ensuite : FICHE DÉTAIL PRODUIT EN DOSSIERS** (la seule pièce restante du parcours)

Cliquer une carte produit ouvre encore l'ANCIEN gros formulaire (`openProdOverlay('edit',id)`). À remplacer par une nouvelle interface `openProductFolder(prodId)` organisée en 3 dossiers :
- **Dossier 1 — Ce que toi tu fournis** : lien (`store_url`) + infos non-devinables (COGS, livraison, frais, taux retour, prix, bundles) + **bouton "Supprimer le produit" tout en bas de ce dossier**.
- **Dossier 2 — Assets** : `product.images`.
- **Dossier 3 — Ce que Zenith sait** : avatar (pain/desire/objections), USP, garantie, headline, angles, market_intel/market_summary. Si `enrichment_status==='pending'` → bouton **"Relancer l'enrichissement IA"** (rappelle `analyzeProductIntelligence`).
DA multivers conservée. Câbler le `onclick` de la carte (refreshParamView) vers `openProductFolder` une fois la fonction créée (ref déjà retirée pour ne pas casser).

**Puis : LOT 4 — Mission Engine** (spec Section 9).

Avant de coder, faire d'abord :
1. `node server.js` + ouvrir `http://localhost:4200` — vérifier que l'app tourne
2. Tester le parcours : "+" → carte brouillon → Étape 1 → Continuer → Étape 2 (COGS/prix) → "Analyser le produit" → (sans crédit) produit créé en `pending`, visible dans la grille avec photo.

**TODO câblé en attente :**
- `ctxCampaignState` dans `callClaudeForBriefs` (contexte phase ASL envoyé à Claude)
- `DRAFT_FAILED` sur échec média (fal.ai/Higgsfield → statut créative si API échoue)

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

**État actuel (2026-06-25)** : frontend complet, système de bulles corrigé, onboarding refait (parcours Étape 1→2→analyse→grille + Option A) et grille produits premium (centrage, FLIP, hover 3D). Backend jamais testé avec de vraies clés API (pas de crédit Claude actuellement → Option A active). Aucune image ou vidéo réelle produite. Architecture multi-produit complète (BLOCs 1-4) + bubble system v2. index.html ~10 500 lignes.

**Session 2026-06-23 matin — features :**
- Market Intelligence Engine : Tier 1/Tier 2/Tier 3, `buildCtxMarket(prod)`
- `checkServerHealth()`, warning Product Brain incomplet
- `image_prompt` + `needs_text_overlay` dans brief
- `generateImage/Video(brief, opts)` avec `{simulate:true}`, `importMemoryJSON()`
- **CLR v1.0** : computeRoasTrend, detectCreativeFatigue, routeCreative, overrideBriefWithStage, applyCreativeLifecycleRouter
- **LOT 1 Zezinho** : fix J4/J2, cost_per_atc, analyzeKPIs, checkCogsReminder, scaling_started_at
- **LOT 2** : P7b Scaling Loop, 4 scénarios, paliers Zezinho, form budget
- **LOT 3** : diagnoseOptiFunnel(), OPTI_C1/C2/C3/EXHAUSTED/SUCCESS, 3 cartouches

**Session 2026-06-23 après-midi — Multi-produit complet (BLOCs 1-4) :**

**BLOC 1 — Migration mem.campaign → per-product**
- `defaultCampaignState()` : état campaign propre par produit
- `getActiveCampaign(mem)` : wrapper qui crée le bucket `mem.campaigns[productId]` et sync l'alias `mem.campaign` → tout le code existant continue sans modification
- `migrateMemoryIfNeeded()` : ajout migration `campaigns{}` + `product_groups[]`
- `resetCycle()` + `setActiveProduct()` : utilisent `getActiveCampaign` — switcher de produit ne reset PLUS l'autre produit
- `defaultMemory()` : `campaigns:{}`, `product_groups:[]`

**BLOC 2 — Product Relations Layer v1**
- `relations[]` sur chaque produit : `{type:'upsell|cross_sell|synergy', product_id, notes}`
- `product_groups[]` dans mem root : clusters marketing (PAS des entités ASL)
- Section 7 UI dans l'overlay produit
- `readRelationsFromForm()`, `renderProductRelationsUI()`, `addRelationRow()`
- **Règle absolue** : Cluster ≠ Produit. Cluster = couche marketing. ASL reste sur le produit seul.

**BLOC 3 — Batch types cluster/upsell/cross-sell**
- `buildCtxCluster(mem, primaryProd, batchType, clusterProductId)` : contexte Claude pour batches non-solo
- `callClaudeForBriefs()` : injection ctxCluster quand batch_type ≠ 'solo'
- `getInstructions()` : cas UPSELL_BATCH, CROSSSELL_BATCH, CLUSTER_BATCH (SCALING only)
- `maybeSpawnClusterBatchBubble(mem)` : bulle contextuelle en SCALING si relations définies
- `executeClusterBatch(batchType, linkedProdId)` : génère brief avec opts cluster
- `showClusterInstructions(batchType)` : instructions Meta dans mini chat
- creative_bank : chaque créa taguée `batch_type` (solo/upsell/cross_sell/cluster) + `cluster_product_id`
- Hookée dans `spawnDecisionBubbles()` après la queue principale

**BLOC 4 — Strategy Layer v1 (lecture + propositions, jamais exécution directe)**
- `detectClusterPerformance(mem)` : ROAS pondéré par spend, cluster vs solo, 4+ samples minimum → {status: BETTER/SAME/WORSE/INSUFFICIENT_DATA, delta_pct, clusterRoas, soloRoas}
- `rankProducts(mem)` : tri score de priorité SCALING winner=100 → standby=10
- `proposeClusterActions(mem)` : 3 propositions → VALIDATE_CLUSTER / TEST_NEXT_PRODUCT / LIBERTY_UPGRADE
- `validateCluster(groupId)` + `upgradeClusterLiberty(groupId, level)` : actions post-confirmation utilisateur
- `renderPortfolioView(mem)` : section dynamique dans Réglages — ranking + propositions — visible uniquement 2+ produits ou propositions actives
- `refreshParamView()` : sync `getActiveCampaign` + Portfolio View
- **Règle absolue** : proposeClusterActions = 90% lecture, 10% proposition. Jamais exécution sans confirmation.

**Session 2026-06-24 — Bubble System v2 (audit + 8 corrections) :**

**Root cause identifié :** `buildMission()` mappe les types de bulle en classes CSS orb. Certains états utilisaient `t-action` (→ `confirmExecuted()`) alors que ce n'était pas actionnable, ou `t-success` (→ bouton "Voir" → `orbView()`) alors que `confirmExecuted()` devait être appelée.

**Corrections :**
1. **NO_PRODUCT** : `t-action` → `t-info` + `customButtons` navigation pure (goView parametres) — `confirmExecuted()` n'était jamais pertinente ici
2. **DATA_NEEDED** : `t-action` → `t-info` + `customButtons` navigation pure (openMetrics) — même raison
3. **J1_GO** : `t-success` (bouton "Voir" → `orbView()`) → `t-mission` — CRITIQUE : `j1_decided` et `spend_cycle` n'étaient jamais enregistrés. Maintenant : "Go" → `showManualInstructions()` → "Fait ✓" → `confirmExecuted()` ✅
4. **J2_GO** : `t-success` → `t-mission` — CRITIQUE : même bug, `j2_decided` jamais enregistré. Fix identique ✅
5. **OPTI_SUCCESS** : `t-success` (bouton "Voir") → garde `t-success` (vert = signal positif) + `customButtons` avec `confirmExecuted()` — CRITIQUE : `asl_phase` ne repassait jamais en `'SCALING'` ✅
6. **renderOrb()** : ajout support `customButtons` — champ qui override complètement `ORB_BUTTONS[orbType]` sur l'orbe principal
7. **confirmExecuted()** : ajout guard `NAV_ONLY_STATES = ['NO_PRODUCT','DATA_NEEDED']` — retour early + navigation directe, jamais d'écriture mémoire pour ces états
8. **spawnDecisionBubbles()** : suppression des bulles secondaires doublons pour NO_PRODUCT et DATA_NEEDED

**Mapping type → comportement (référence définitive) :**
```
t-info    → bs-wait          (gris)   → "Saisir données" → orbInfo()       — attente, pas d'action
t-action  → bs-action-user   (amber)  → "Fait ✓" → confirmExecuted()       — action utilisateur manuelle
t-mission → bs-action-system (violet) → "Go" → orbGo() → showManualInstructions() → "Fait ✓" → confirmExecuted()
t-alert   → bs-alert         (rouge)  → "Agir" → orbGo() → showManualInstructions() → "Fait ✓" → confirmExecuted()
t-success → bs-success       (vert)   → "Voir" → orbView()                  — signal positif, SANS confirmExecuted() sauf customButtons
```

**Tableau complet — tous les états, type final correct :**
```
NO_PRODUCT      t-info    + customButtons nav     ✅
DATA_NEEDED     t-info    + customButtons nav     ✅
AUDIT_WEEKLY    t-action                          ✅ → confirme audit hebdo
DIAGNOSTIC      t-alert                           ✅ → 2 cuts consécutifs
J1_GO           t-mission                         ✅ FIXÉ → j1_decided + spend_cycle
J1_CUT          t-alert                           ✅
J2_GO           t-mission                         ✅ FIXÉ → j2_decided + spend_cycle
J2_CUT          t-alert                           ✅
J4_GO           t-mission                         ✅ → asl_phase=SCALING
J4_OPTI         t-action                          ✅ → asl_phase=OPTI
J4_CUT          t-alert                           ✅ → cuts_count++
SCALE_UP        t-mission                         ✅ → palier suivant
SCALE_DOWN      t-alert                           ✅ → budget réduit
SCALE_HOLD      t-info                            ✅ → ne pas toucher
SCALE_OPTI      t-action                          ✅ → budget=50€/j
OPTI_C1/C2/C3   t-action                          ✅ → cartouche lancée
OPTI_SUCCESS    t-success + customButtons         ✅ FIXÉ → asl_phase=SCALING
OPTI_EXHAUSTED  t-alert                           ✅ → décision manuelle
CREATE_BATCH    t-mission                         ✅ → génère batch
WAIT            t-info                            ✅ → système en équilibre
```

**Session 2026-06-25 — Onboarding refait + Grille produits premium (4 chantiers, vérifiés jsdom) :**

**A — Nouveau parcours onboarding (Étape 1 → Étape 2 finances → analyse → grille).**
- Phases existantes réordonnées : Phase 1 (URL/assets) → finances AVANT l'analyse → analyse → grille (plus de phase revue bloquante).
- `goToFinanceStep()` : bouton Étape 1 « Continuer → » (ne lance plus l'analyse).
- `onbFinanceCta()` : si `_onbIntel` déjà set (analyse/démo) → activer ; sinon → `launchAnalysisFromFinance()` (valide COGS+prix puis `startProductAnalysis()`).
- `finishOnboardingSave(enriched)` : `saveProductFromOnboarding()` (retourne false si invalide) → `goView('parametres')` + grille.

**B — Option A (produit créé même sans crédit Claude).**
- `startProductAnalysis` : succès → `finishOnboardingSave(true)` ; **catch** → `_onbIntel=null` + `finishOnboardingSave(false)` (plus de `openFullManualForm` qui dumpait un formulaire vide).
- `saveProductFromOnboarding` : gère `_onbIntel` nul (set `pf-name` + `pfImages` depuis `_onbAssets`). **Capture intel/url/bundles AVANT `saveProduct()`** (car `saveProduct`→`closeProdOverlay`→`clearProductForm` reset `_onbIntel`). Post-save merge : `store_url`, `enrichment_status` ('done'/'pending'), `market_intel`, `bundles`, `offer_summary`.

**C — Taux de retour facultatif + Bundles.**
- `onb-retour` laissé vide par défaut (label « optionnel »), non-bloquant. `checkReturnRateReminder(mem)` : bulle de relance dès `orders>=1` si `taux_retour` vide (anti-spam 7j), appelée dans submitMetrics à côté de `checkCogsReminder`.
- Section « Offres / Bundles » en Étape 2 : `pfBundles[]`, `addBundleRow/removeBundleRow/updateBundleField/setBundleAov/renderBundleRows`, `buildBundlesPayload()` → {bundles, offer_summary, aov}. AOV de référence (palier marqué) → `pf-aov`. `offer_summary` injecté dans `callClaudeForBriefs` (ctxSite). Reset/charge dans `clearProductForm`/`openProdOverlay('edit')`.

**D — Grille produits premium (`refreshParamView`).**
- Centrage permanent : `.zp-row` `display:flex; align-items:center; justify-content:safe center` → groupe toujours centré, scroll horizontal sans rogner.
- **FLIP** (`_flipCapture`/`_flipPlay`) : cartes existantes glissent (data-flip=id) ; nouvelles cartes entrent en scale+fade (`.zp-in`). Guard `offsetParent` (no-op si vue cachée → jsdom safe).
- Gros « + » nu (`#zp-plus`, sans carte/contour). Clic → `startProductDraft()` : `_draftActive=true` → carte brouillon (`.zp-draft` skeleton) avec FLIP, puis overlay s'ouvre après 380ms. `closeProdOverlay` retire le brouillon si annulé.
- Hover premium : inclinaison 3D fixe (`perspective rotateX/rotateY`) + bordure violette lumineuse. **Ambré supprimé** (plus de `.zp-card:hover::after` ni `zp-pop`). État normal : bordure blanche.

**Reste à faire (prochaine session)** : fiche détail produit en dossiers (`openProductFolder`) — voir bloc PROCHAINE SESSION en tête de fichier. Le `onclick` carte pointe encore sur `openProdOverlay('edit',id)`.

---

## SECTION 3 — ARCHITECTURE (RUNTIME)

```
~/zenith.ai/
├── index.html      ← app complète (HTML + CSS + JS vanilla, fichier unique ~10 500 lignes)
├── server.js       ← proxy Express local, port 4200 (PORT = process.env.PORT || 4200)
├── .env            ← clés API (jamais committé)
├── sop.json        ← SOP v5 créative engine (1487 lignes, specs complètes)
├── package.json
├── CLAUDE.md
├── ZENITH_MULTI_PRODUIT_SYSTEM.md   ← design doc architecture multi-produit
├── AUDIT_FONCTIONNEL_ZENITH.md      ← audit fonctionnel complet
└── ZENITH_AUDIT_v2.md               ← audit technique détaillé
```

**Règles stack :**
- Vanilla JS uniquement — pas de framework, pas de import/export, pas de classes ES6
- Pas de build step — on modifie index.html directement
- Pas de base de données — tout en localStorage clé `promethee_v1`
- Serveur local sur `http://localhost:4200`

**Lancer :**
```bash
cd ~/zenith.ai && node server.js & && open http://localhost:4200
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
    roas_history: [],   // [{roas, date}] — 3 derniers jours, sliding array
    _cogs_reminder_at,      // anti-spam rappel COGS (14j)
    _returnrate_reminder_at // anti-spam relance taux de retour (7j) — checkReturnRateReminder
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
  creative_bank: [],  // chaque créative porte angle/format/hook/awareness/mood + daily[] + stage + batch_type
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
  winner_locked,
  store_url,            // URL page produit/boutique saisie à l'onboarding (utilisée par les UTM)
  enrichment_status,    // 'done' (analyse IA OK) | 'pending' (Option A : créé sans crédit Claude)
  bundles: [],          // [{qty, pack_price, per_unit, discount_pct, is_aov}] — offres optionnelles
  offer_summary,        // résumé lisible des bundles (injecté au moteur créatif)
  market_intel          // {competitors, market_summary, updated_at} — mergé post-save
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

**Specs complètes du moteur créatif :** lire `~/zenith.ai/sop.json` (SOP v5, 1487 lignes)
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

**Champs dans `creative_bank` :**
```js
stage: 'TEST' | 'VALIDATION' | 'SCALE'   // décidé par CLR à la génération, immuable ensuite
batch_type: 'solo' | 'upsell' | 'cross_sell' | 'cluster'  // utilisé par detectClusterPerformance()
cluster_product_id: string | null  // produit lié pour les batches non-solo
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

## SECTION 9 — ROADMAP (BLOCS A→G + LOTs + Mission Engine)

### ✅ BLOC A (0€) — IMPLÉMENTÉ
Frontend testé. Overlay produit, seuils ROAS, Mission Board, saisie créative.

### ✅ BLOC B (0€) — IMPLÉMENTÉ
Simulate mode complet (generateImage/Video, executeCreateBatch).

### ✅ CLR v1.0 — IMPLÉMENTÉ
TEST→IMAGE / VALIDATION→UGC_IMAGE / SCALE→VIDEO. Double guard Higgsfield. 5 fonctions core.

### ✅ LOT 1 — IMPLÉMENTÉ
Fix J4/J2 ASL, cost_per_atc, analyzeKPIs, checkCogsReminder, scaling_started_at, 4 nouveaux champs métriques.

### ✅ LOT 2 — IMPLÉMENTÉ
P7b Scaling Loop, 4 scénarios (HOLD/PUSH/DOUBLE/BOOST), paliers Zezinho, form budget interactif.

### ✅ LOT 3 — IMPLÉMENTÉ
diagnoseOptiFunnel(), OPTI_C1/C2/C3/EXHAUSTED/SUCCESS dans Decision Engine, 3 cartouches, transitions ASL.

### ✅ MULTI-PRODUIT BLOCs 1-4 — IMPLÉMENTÉ (session 2026-06-23 après-midi)
Architecture complète per-product campaign state, relations/clusters, batch types cluster, Strategy Layer.
Voir Section 2 pour le détail de chaque BLOC.

### ✅ BUBBLE SYSTEM v2 — IMPLÉMENTÉ (session 2026-06-24)
8 corrections. Tous les états ASL ont maintenant le bon type, la bonne couleur, et la bonne chaîne confirmExecuted(). Voir Section 2 pour le tableau complet.

### ✅ ONBOARDING + GRILLE PREMIUM — IMPLÉMENTÉ (session 2026-06-25)
Parcours Étape 1→2→analyse→grille, Option A (créé sans crédit Claude), taux de retour facultatif + relance, bundles, grille centrée + FLIP + hover 3D + carte brouillon. Détails Section 2 (bloc 2026-06-25).

### 🟡 FICHE DÉTAIL PRODUIT EN DOSSIERS — À FAIRE (commencer par ça)
`openProductFolder(prodId)` : 3 dossiers (toi : lien+COGS+supprimer · assets · ce que Zenith sait + relancer enrichissement si pending). Câbler le onclick carte dessus. Voir bloc PROCHAINE SESSION en tête.

### 🔴 LOT 4 — Mission Engine (APRÈS la fiche détail)
**Dashboard opérationnel multi-produit.** Objectif : toutes les décisions du jour sur tous les produits actifs, en une vue unique, priorisées.

**Ce que ça fait :**
- Exécute `runDecisionEngine` logique sur tous les produits (pas juste le produit actif)
- Génère une Mission Queue : liste priorisée d'actions du jour (CUT adset X / CREATE batch Y / CHECK J2 Z)
- Chaque mission est markable done/skip — tracking manuel d'exécution Meta
- Quand tu rentres de nouvelles métriques, la queue se rafraîchit — corrélation entre actions

**Ce que ça n'est pas :**
- Pas de connexion Meta API (tout reste manuel)
- Pas de timestamp automatique (c'est toi qui choisis quand agir)
- Pas de modification de l'ASL — couche de lecture au-dessus uniquement

**Architecture :**
```
generateDailyMissions(mem) → missions[] filtrés + priorisés sur tous produits actifs
Mission Queue UI → vue dédiée ou section Mission dans view-mission
confirmMissionDone(missionId) / skipMission(missionId) → tracking état
```

### BLOC E (0€) — Feedback Loop
Réinjecter automatiquement les attributs gagnants de buildCreativeSignalReport dans callClaudeForBriefs.

### BLOC F (après D en prod)
Scoring créatif, priorisation budget angles. Impossible sans données réelles.

### BLOC G (dernier)
Version 1.0 : polish, vérification boutons, documentation usage.

---

## SECTION 10 — FICHIERS DE RÉFÉRENCE

**Lire dans cet ordre si début de session :**

```
1. ~/zenith.ai/VISION.md                          → LIRE EN PREMIER — intention produit, philosophie,
                                                     ce que Zenith.ai doit être et ressentir
2. ~/zenith.ai/sop.json                           → SOP v5 complet (créative engine, hooks, copywriting,
                                                     mood×intensité, methode_3i, awareness 1-6)
3. ~/LOT 1/1 Étape 1 testing — Répliquer des ads.rtf   → ASL v9 Testing (bible J1/J2 — source primaire)
4. ~/LOT 1/1.3 Étape 2 scaling — Les itérations.rtf    → ASL v9 Scaling (bible J4+ — source primaire)
```

**Référence technique approfondie :**
```
~/zenith.ai/ROADMAP_EXECUTION_TECHNIQUE.md    → audit technique détaillé, risques, dépendances
~/zenith.ai/AUDIT_PROMETHEE_2026-06-21.md     → audit complet du code réel (état à 2026-06-21)
~/zenith.ai/AUDIT_STRATEGIQUE_OS_MARKETING.md → stratégie marketing, positionnement SaaS
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
