# ZENITH.AI — AUDIT SYSTÈME COMPLET v2
## Architecture · Diagnostic · Roadmap d'évolution vers l'intelligence autonome
> Version 2.0 — 2026-06-23
> Méthode : lecture intégrale du code source (index.html ~8200 lignes, server.js, sop.json). Zéro hypothèse non vérifiée.

---

## PRÉAMBULE — CE QUE CET AUDIT EST ET N'EST PAS

Ce document n'est pas une vision idéale. C'est une radiographie du système réel, avec ses vraies forces, ses vraies failles, et une roadmap exécutable sans casser ce qui fonctionne. Chaque constat est ancré dans le code lu. Aucune affirmation n'est spéculative.

---

## PARTIE 1 — AUDIT GLOBAL

### Ce qui fonctionne bien (8/10 et plus)

**Decision Engine ASL** — Le waterfall P0→WAIT est propre, déterministe, inviolable. Les règles J1/J2/J4 sont fidèles à la méthode Zezinho. Le guard `_brainRunning` évite les doubles exécutions. Les anomalies (CPM ×1.5, CVR < 0.3%, fréquence ≥ 2.5) sont détectées avant toute autre règle. L'ordre de priorité est correct. C'est la brique la plus solide du système.

**Doctrine SOP v5** — L'injection du SOP dans le prompt Claude (hook engineering, matrice mood×intensité, levier psychologique, méthode 3i) est bien faite. Claude reçoit les règles métier, pas juste un brief vague. La méthode 3i (itération isolée vs big swing selon maturité de l'angle) est implémentée proprement.

**Scopage par produit** — creative_bank et angle_scores sont isolés par product_id. Changer de produit ne détruit plus l'historique du précédent. migrateMemoryIfNeeded() gère les anciens formats sans casser les données existantes.

**Confiance IA signalée** — analyzeProductIntelligence() retourne des niveaux de confiance (high/med/low) par champ. L'utilisateur sait visuellement quoi vérifier vs quoi accepter tel quel.

**SIGNAL_MIN_DAYS / SIGNAL_MIN_SPEND** — Les seuils de fiabilité du signal créatif (3 jours min, 15€ min) sont explicites et codifiés. buildCreativeSignalReport() ne présente aucun signal sous ces seuils. Bonne discipline.

**Simulate mode complet** — La simulation couvre maintenant le chemin complet : brief Claude → routing média → archivage (sans écriture mémoire). Toute la plomberie est testable gratuitement avant la moindre dépense API.

---

### Ce qui est dangereux ou fragile (priorité critique)

**Le ROAS breakeven est calculé avec une formule incomplète.** `ASL.computeRoasBe = price / (price - cogs)` ignore livraison, frais de paiement, et taux de retour. Sur un produit à 49€ vendu avec 8€ de livraison, 2.9% de frais Stripe et 5% de retours, la vraie marge nette peut être 30% plus faible que celle calculée. Conséquence directe : des campagnes J2 GO ou J4 OPTI sont prises alors que le compte perd de l'argent réellement.

**Le feedback loop n'est pas fermé.** buildCreativeSignalReport() existe, agrège correctement les données par attribut (angle/format/mood/levier), applique les bons seuils de fiabilité — mais son output n'est JAMAIS injecté dans callClaudeForBriefs(). Claude ne sait pas que "l'angle Transformation performe à 3.2x ROAS depuis 5 jours" et "l'angle Peur au 1.8x". Il génère en aveugle par rapport à l'historique réel. C'est le gap structurel le plus critique du système.

**Les confidence scores de l'onboarding ne sont pas persistés.** analyzeProductIntelligence() retourne pain_conf, desire_conf, usp_conf, etc. Ces scores sont affichés à l'utilisateur dans la phase review — mais ne sont PAS sauvegardés dans le schéma produit final. Après save, impossible de savoir quels champs du Product Brain sont des données solides vs des suppositions IA.

**allorigins.win comme scraper.** Le scraping produit et concurrents passe par un proxy public non authentifié qui ne rend pas JavaScript. La majorité des boutiques Shopify modernes utilisent du rendu côté client — le scrape retourne soit du HTML vide, soit une shell sans contenu réel. Aucun fallback si le scrape échoue. Si scrapeData est null, Claude invente tout depuis le nom du produit.

**Winner status manuel.** Il n'existe pas de logique automatique pour passer une créative de TESTING à WINNER. L'utilisateur doit le faire manuellement via l'UI. Si l'utilisateur oublie, les angle_scores ne sont jamais mis à jour (updateAngleScore() est appelé uniquement dans confirmExecuted quand une créative est grised ou passée WINNER manuellement). Le système "apprend" uniquement si l'utilisateur discipline correctement ses actions.

**roas_history collecté mais non utilisé dans J4.** Collecté à chaque submitMetrics(), mais la décision J4 regarde uniquement metrics.roas_real (ROAS du moment), pas la tendance des 3 derniers jours. Une campagne à 2.8x ROAS sur 4 jours mais en forte baisse (2.8 → 2.4 → 2.0) reçoit un GO SCALE identique à une campagne stable à 2.8x. Le signal de tendance existe mais est ignoré.

---

### Ce qui est incomplet (zone grise)

**Higgsfield : endpoint et auth non validés.** Le payload est envoyé à `/api/higgsfield` → `https://api.higgsfield.ai/v1/generations`. La structure du payload (prompt, duration, resolution, aspect_ratio) et le mécanisme de polling (pollHiggsfield) sont codés mais n'ont jamais reçu de vraie réponse. Les noms de champs sont supposés d'après la doc lue — pas vérifiés sur une vraie réponse.

**fal.ai image references.** generateImage() tente de passer des base64 comme `styleRef` — mais la variable est construite sans jamais être ajoutée au payload envoyé à fal.ai. Les images produit uploadées ne servent à rien dans la génération actuelle.

**Saisie quotidienne par créative optionnelle.** La répartition des métriques par créative (renderDailyCreativeRows) est la fondation du feedback loop. Elle est correctement conçue — mais est facultative. Si l'utilisateur ne la remplit pas, daily[] reste vide sur toutes les créatives, et buildCreativeSignalReport() retournera has_enough_data: false indéfiniment. Le système dépend d'une discipline manuelle non forcée.

**market_intel jamais mis à jour après l'onboarding.** Le Market Intelligence Engine génère market_summary une fois, lors du premier onboarding. Deux semaines plus tard, les créatives concurrentes évoluent, les angles saturent, les prix changent — mais market_summary est figé. Aucune logique de refresh périodique.

**weekly_patterns insuffisants pour stratégie batch.** Les patterns hebdomadaires capturent format_dominant, angle_dominant, roas_average. C'est utilisé dans le prompt callClaudeForBriefs — mais pas le ROAS par format, pas le win rate par levier, pas la tendance relative. "UGC 20s dominant la semaine dernière" ne dit pas si c'est parce que c'est le seul format testé ou parce qu'il surperforme.

---

### Ce qui est incohérent structurellement

**Schéma produit divergent entre CLAUDE.md et le code.** Le schéma commenté dans le code (ligne 4188) ne contient pas desire dans avatar, ni voice_profile, ni livraison, frais_paiement, taux_retour dans l'économie. Ils sont mentionnés dans CLAUDE.md mais pas dans defaultMemory ni dans le schéma commenté. Les fonctions qui lisent ces champs (callClaudeForBriefs lit avatar.desire, buildCtxMarket lit voice_profile) fonctionnent uniquement si l'onboarding les a écrits — pas de garantie structurelle.

**campaign.budget_remaining vs account.budget_remaining.** Deux champs budget_remaining coexistent. submitMetrics() décrémente les deux. runDecisionEngine() lit account.budget_remaining pour l'anomalie BUDGET. Ce double-tracking est fragile : si un seul est mis à jour, l'autre diverge sans notification.

**spend_cycle ne correspond pas à la somme des métriques saisies.** spend_cycle s'incrémente uniquement dans confirmExecuted() (GO J1 et GO J2). last_metrics.spend est le spend de la dernière saisie du jour. runDecisionEngine() calcule spendCumul = spend_cycle + last_metrics.spend. Si l'utilisateur saisit les métriques sur plusieurs jours sans confirmer, spendCumul peut sous-estimer le vrai spend (last_metrics.spend ne contient que le dernier jour saisi, pas la somme). Risque de ne jamais atteindre les seuils J1/J2.

---

## PARTIE 2 — CARTOGRAPHIE SYSTÈME

### Flux de données complet

```
ENTRÉE UTILISATEUR
├── URL produit + nom
├── Assets produit (images base64)
├── Images ads concurrents (Tier 1)
└── URLs boutiques concurrents (Tier 2)
         │
         ▼
ONBOARDING PIPELINE (startProductAnalysis)
├── scrapeSite(url)  ──────────────────────── allorigins.win [FRAGILE]
│     → {headline, sub, cta, offer, guarantee, social_proof, description}
├── analyzeCompetitorCreatives(ads)  ───────── 1 appel Claude Vision
│     → [{format, angle, hook, awareness, mood, levier, offer_visible}] (Tier 1)
├── scrapeCompetitorSites(urls)  ──────────── allorigins.win × N [FRAGILE]
│     → [{headline, positioning, price_point, offer_structure}] (Tier 2)
├── analyzeProductIntelligence(scrapeData, assets)  ─── 1 appel Claude
│     → {pain+conf, desire+conf, objections+conf, usp+conf, awareness+conf,
│        angles_opportunities, angles_saturated, competitors, headline, guarantee}
│     [CONF SCORES NON PERSISTÉS APRÈS SAVE]
└── buildMarketSummary(tier1, tier2, legacy)
      → market_summary{signal_quality, saturated_angles, free_awareness_levels,
                       dominant_formats, dominant_hooks, price_landscape}
         │
         ▼
PRODUCT BRAIN (produit sauvegardé)
├── avatar{pain, desire, objections[], awareness_level}
├── {usp, headline, guarantee, notes}
├── {price, cogs, roas_be, roas_target, roas_target_low, roas_minus20}  [COGS SIMPLIFIÉ]
├── {angles_saturated[], angles_opportunities[]}
├── images[]  ← base64, non utilisées dans génération
└── market_intel{competitors[], market_summary, updated_at}  [FIGÉ APRÈS ONBOARDING]
         │
         ▼
DECISION ENGINE (runDecisionEngine — waterfall)
├── P0 : NO_PRODUCT
├── P1 : AUDIT_WEEKLY (lundi, is_monday_audit_done=false)
├── P2 : DATA_NEEDED (pas de métriques, campagne active)
├── P3 : ANOMALY (CPM×1.5, CVR<0.3%, freq≥2.5, budget<200€)
├── P4 : DIAGNOSTIC (cuts_count ≥ 2)
├── P5 : J1_GO/J1_CUT (spend_cycle+last_metrics.spend ≥ 50€)
├── P6 : J2_GO/J2_CUT (≥ 100€, j1_decided)
├── P7 : J4_GO/J4_OPTI/J4_CUT (≥ 200€, j2_decided)  [roas_history NON UTILISÉ]
├── P8 : CREATE_BATCH (nouveau batch requis)
└── P9 : WAIT
         │
         ▼
CREATIVE ENGINE (sur CREATE_BATCH)
├── buildCtxMarket(prod)  → contexte marché Tier1>Tier2>Tier3
├── callClaudeForBriefs(mem, batchSize)  ─── 1 appel Claude
│     Inputs : product brain + market intel + creative bank state
│               + SOP v5 condensé + site fresh scrape + weekly patterns
│               + méthode 3i (maturité des angles)
│     [buildCreativeSignalReport() NON INJECTÉ — BOUCLE OUVERTE]
│     Output : N briefs{script_complet, image_prompt, needs_text_overlay,
│                       higgsfield_brief, ad_copy, hook, angle, format...}
├── validateBatchDiversity()  → contrôle diversité (sauté en testing)
└── Quality Control hooks dupliqués
         │
         ▼
GÉNÉRATION MÉDIA
├── generateImage(brief, opts)  ──── fal.ai (Ideogram v3 | Flux Pro v1.1)
│     [JAMAIS TESTÉE EN PROD]
└── generateVideo(brief, opts)  ──── Higgsfield
      [JAMAIS TESTÉE EN PROD, PAYLOAD À VALIDER]
         │
         ▼
CREATIVE BANK (creative_bank[])
├── Entrées : {id, product_id, format, angle, hook, mood, intensite, levier,
│              type_media, status (DRAFT→TESTING→WINNER/LOSER/MID), roas, spend,
│              daily[], winner_locked, created_at}
├── daily[] : saisie manuelle quotidienne par créative [FACULTATIVE, NON FORCÉE]
└── angle_scores{productId:{angle:{tests, winners, confidence, status}}}
         │
         ▼
FEEDBACK ENGINE (construit, non branché)
├── aggregateCreativePerformance(mem, attribute, days)
│     → ROAS par angle/format/mood/levier sur fenêtre glissante
├── buildCreativeSignalReport(mem, days)
│     → {best, worst, écart ROAS, fiabilité} par attribut
│     [NON INJECTÉ DANS callClaudeForBriefs — BOUCLE OUVERTE]
└── weekly_patterns[]  → format/angle dominants, ROAS moyen
      [INJECTÉ dans callClaudeForBriefs — PARTIEL]
         │
         ▼
MEMORY (localStorage "promethee_v1")
├── Taille max ~5MB navigateur
├── Export/import JSON manuel (boutons UI)
└── /api/save-creative  → fichiers média sur disque local via server.js
```

### Dépendances critiques entre modules

```
runDecisionEngine() ←──── last_metrics (saisie manuelle)
                   ←──── campaign.spend_cycle (confirmExecuted uniquement)
                   ←──── getActiveProduct() (product brain)

callClaudeForBriefs() ←── product brain (pain/desire/usp/avatar)
                     ←── market_intel.market_summary (Tier1>Tier2)
                     ←── creative_bank (winners, usedHooks, angle_scores)
                     ←── SOP v5 (sop.json)
                     ×   buildCreativeSignalReport() [PAS BRANCHÉ]

updateAngleScore() ←── confirmExecuted() [déclenchement manuel uniquement]

buildCreativeSignalReport() ←── daily[] [saisie manuelle par créative]
```

### Points de friction principaux

**Friction 1 — Saisie manuelle critique.** La qualité des décisions dépend de la saisie quotidienne. Si non remplie : DATA_NEEDED perpétuel ou décisions sur données incomplètes. Aucun rappel automatique.

**Friction 2 — Confirmation d'exécution.** confirmExecuted() est le seul endroit où spend_cycle s'incrémente. Si l'utilisateur ne clique pas "Exécuté", le compteur ne bouge pas, les seuils J1/J2 ne sont jamais atteints.

**Friction 3 — Winner déclaration manuelle.** Le système ne déclare jamais automatiquement un winner. C'est l'utilisateur qui le fait via l'UI. Sans cette action, angle_scores restent vides, et le feedback loop ne tourne pas.

**Friction 4 — Onboarding fiabilité.** Si l'URL produit ne scrape pas correctement (JS-rendered), tout le Product Brain initial est généré sur des données inventées par Claude. L'utilisateur doit le détecter à la review et corriger champ par champ.

---

## PARTIE 3 — GAP ANALYSIS PAR MODULE

| Module | État actuel | État cible | Écart |
|--------|-------------|------------|-------|
| **Onboarding** | URL → Claude → review editable → save | URL → Claude → validation structured → save avec conf persisted | Manque : conf scores persistés, fallback si scrape JS vide, validation champs obligatoires avant save |
| **Product Brain** | avatar{pain, desire, objections}, usp, headline. ROAS = price/(price-cogs) | Tous champs with confidence persistée, ROAS avec formule complète (livraison, frais paiement, retours), auto-recalcul si prix change | Manque : champs économiques complets, formule ROAS exacte, conf persistée, recalcul auto |
| **Market Intelligence** | Tier1/Tier2/Tier3 à l'onboarding, buildMarketSummary pondéré | Market summary mis à jour périodiquement (hebdo ou avant chaque batch), signaux datés avec expiration | Manque : refresh périodique, date d'expiration des signaux, découverte automatique de nouveaux concurrents |
| **Creative Engine** | 1 call Claude avec SOP + product brain + market intel + 3i | Même architecture + injection buildCreativeSignalReport dans le prompt | Manque : injection signal report, enrichissement avec tendances créatives |
| **Génération Média** | fal.ai + Higgsfield codés, jamais testés en prod | Circuits validés en prod avec payloads corrects, retry logique, coût tracké | Manque : test prod (BLOC C/D), validation payload Higgsfield, retry, cost tracking |
| **Creative Bank** | Stockage correct, daily[] optionnel | daily[] guidé et résumé en UI, WINNER auto-déclaré sur seuils ROAS+j4 | Manque : prompt quotidien saisie, auto-winner detection post-J4, status transitions automatiques |
| **Feedback Loop** | buildCreativeSignalReport() existe, non branché | Signal report injecté dans callClaudeForBriefs, angle_scores alimentés automatiquement | Manque : injection signal report, alimentation auto angle_scores depuis daily[] |
| **Decision Engine** | Waterfall propre, roas_history collecté non utilisé | roas_history utilisé en J4, ROAS calcul exact (formule complète) | Manque : tendance ROAS dans J4, ROAS BE exact |
| **Memory** | localStorage only, export/import JSON | localStorage + backup server automatique périodique | Manque : backup auto server.js (route /api/memory), sync périodique |

---

## PARTIE 4 — ROADMAP EXÉCUTABLE

### Phase 1 — Stabilisation (0€ budget API)

**Objectif :** rendre le système fiable sur ses fondations avant toute dépense.

**1.1 — Corriger la formule ROAS BE**
Remplacer `ASL.computeRoasBe = price/(price-cogs)` par la formule complète avec livraison, frais_paiement, taux_retour. Ajouter ces champs dans le formulaire produit (overlay) et dans le schema produit. Toutes les décisions J1/J2/J4 deviennent immédiatement plus fiables.
Impact : critique. Sans ça, certaines décisions GO sont prises sur des campagnes en perte réelle.

**1.2 — Persister les confidence scores**
Sauvegarder pain_conf, desire_conf, usp_conf, objections_conf, awareness_conf dans le schéma produit au moment de saveProductFromOnboarding(). Ajouter un badge de confiance visible dans l'overlay produit sur chaque champ. L'utilisateur sait en permanence où sa connaissance est solide vs supposée.
Impact : important. Crée une "source de vérité graduée" plutôt qu'un mélange opaque IA/vrai.

**1.3 — Consolider spend tracking**
Documenter et valider la logique spendCumul = spend_cycle + last_metrics.spend. Ajouter un indicateur visible dans l'UI : "Spend confirmé ce cycle : X€ / Dernier jour saisi : Y€ / Total décision : X+Y€". Évite la confusion sur pourquoi les seuils J1/J2 ne s'activent pas.
Impact : moyen. Évite les cas où l'utilisateur pense que le système ne fonctionne pas.

**1.4 — Injection buildCreativeSignalReport dans callClaudeForBriefs**
Appeler buildCreativeSignalReport(mem, 14) juste avant la construction du prompt. Si has_enough_data=true, injecter les signaux dans le contexte Claude sous forme de bloc dédié : "SIGNAUX CRÉATIFS VALIDÉS (X jours, Y€ min) : angle A = 3.2x ROAS (meilleur), angle B = 1.8x (à éviter)". Si insuffisant, ignorer silencieusement.
Impact : critique. C'est le gap structurel principal. Sans ça, Claude génère en aveugle.

**1.5 — Scraping fallback structuré**
Si scrapeSite() retourne un objet vide ou quasi-vide (< 2 champs non null), afficher un avertissement explicite : "Le scraping n'a pas fonctionné (page JavaScript non rendue). L'analyse sera basée uniquement sur le nom du produit — confiance faible sur tous les champs. Vérifie chaque champ manuellement." Ne pas laisser Claude inventer silencieusement.
Impact : important. Évite de créer un Product Brain fantaisiste présenté comme fiable.

---

### Phase 2 — Validation APIs réelles (quelques €)

**Objectif :** valider que les circuits de génération fonctionnent end-to-end.

**2.1 — BLOC C : premier vrai appel Claude**
Lancer callClaudeForBriefs(mem, 1) avec un vrai produit configuré. Vérifier que le JSON retourné contient image_prompt, needs_text_overlay, higgsfield_brief correctement remplis selon type_media. Valider le QC hooks et la sauvegarde en creative_bank.

**2.2 — BLOC D : fal.ai image réelle**
Envoyer un brief image validé à fal.ai. Vérifier que le payload Ideogram v3 (aspect_ratio string) et Flux Pro v1.1 (image_size objet) sont acceptés. Vérifier que la URL retournée est accessible et sauvegardée correctement via /api/save-creative.

**2.3 — Valider Higgsfield payload**
Lire la documentation officielle de l'API Higgsfield v1/generations. Comparer avec le payload actuel {prompt, duration, resolution, aspect_ratio}. Corriger les noms de champs si nécessaire. Valider le mécanisme de polling (pollHiggsfield) sur une vraie réponse.

**2.4 — Connecter les images produit à fal.ai**
generateImage() prépare styleRef (les images produit) mais ne les envoie pas. Utiliser l'endpoint fal.ai storage pour uploader les base64 et récupérer des URLs accessibles, puis les passer dans le payload comme reference images.

---

### Phase 3 — Intelligence et feedback loop (après 2-3 semaines de données)

**Objectif :** faire apprendre le système de ses propres performances.

**3.1 — Auto-déclaration des winners**
Après J4_GO, ajouter une logique qui analyse la creative_bank du cycle et passe automatiquement en WINNER les créatives dont le ROAS cumulé (sur daily[]) dépasse roas_target. Déclencher updateAngleScore() automatiquement pour chaque winner/loser déclaré. Supprimer la dépendance au geste manuel.

**3.2 — Guidance saisie quotidienne**
Ajouter un prompt automatique au chargement (si saisie_at < hier) : "Hier tu as lancé X créatives. Renseigne leurs métriques pour que je puisse apprendre." Rendre la répartition par créative le chemin principal, pas optionnel.

**3.3 — Refresh périodique du Market Intelligence**
Ajouter un flag market_intel.updated_at et une logique de vieillissement : si updated_at > 14 jours, proposer un refresh de l'analyse concurrentielle avant le prochain batch. Ne pas forcer — proposer avec un signal visible.

**3.4 — Utiliser roas_history dans J4**
Dans decideJ4(), calculer la tendance sur les 3 derniers jours si roas_history a ≥ 2 entrées. Si tendance négative (baisse > 15% sur 2 jours consécutifs), dégrader le verdict : GO → OPTI, OPTI → CUT. Si tendance positive, maintenir. Ajouter la tendance dans le "why" affiché à l'utilisateur.

**3.5 — Score signal dans le prompt créatif**
Enrichir l'injection buildCreativeSignalReport dans callClaudeForBriefs avec : win rate par format, levier dominant, mood dominant. Permettre à Claude de raisonner non seulement sur "angle A performe mieux" mais sur "format UGC + levier autorité + mood négatif = combinaison gagnante récurrente."

---

### Phase 4 — Autonomie contrôlée (après Phase 3 stable)

**Objectif :** réduire progressivement la friction manuelle sans perdre le contrôle.

**4.1 — Backup mémoire automatique**
Route `/api/memory/save` et `/api/memory/load` dans server.js. Sauvegarder automatiquement le localStorage toutes les 30 minutes (ou à chaque memSet significatif) sur le disque local. Permet la récupération sans dépendre de l'export manuel.

**4.2 — Situation Report Engine**
Générer automatiquement chaque lundi (AUDIT_WEEKLY) un rapport de 5 lignes : ROAS semaine, angles gagnants, angles à couper, prochaine action recommandée. Envoyé dans le mini-chat + sauvegardé en decisions_log. Remplace l'audit manuel sans le supprimer.

**4.3 — Refresh concurrentiel automatisé**
Avant chaque batch CREATE_BATCH, scraper silencieusement les URLs concurrents connues pour détecter les changements de pricing et d'offre. Enrichir market_summary sans relancer l'onboarding complet.

**4.4 — Scoring multi-signal pour J4**
Remplacer la décision J4 binaire (ROAS seul) par un score composite : ROAS réel (50%), tendance 3j (25%), ratio ATC (15%), thumbstop (10%). Chaque composante est calculable depuis les données existantes. La décision reste déterministe mais plus riche.

**4.5 — API Meta Marketing (read-only)**
Intégrer la lecture des métriques Meta via l'API officielle pour éviter la saisie manuelle quotidienne. Scope minimal : spend, impressions, achats, CPC, CPM par ad_id. Mapper les ad_id aux créatives de la creative_bank via un champ meta_ad_id ajouté à la création. Cela ferme la dernière boucle manuelle majeure.

---

## PARTIE 5 — TOP 5 PRIORITÉS ABSOLUES

### Priorité 1 : Corriger la formule ROAS BE
**Pourquoi en premier :** toutes les décisions J1/J2/J4 reposent dessus. Des GO sur des campagnes perdantes sont impossibles à détecter avec la formule actuelle. C'est la seule erreur qui coûte directement de l'argent réel.
**Effort :** 30 lignes (formulaire overlay + computeRoasBe + schéma produit).
**Risque :** nul (rétrocompatible — anciens produits conservent leurs valeurs, recalcul optionnel).

### Priorité 2 : Injecter buildCreativeSignalReport dans callClaudeForBriefs
**Pourquoi en deuxième :** le feedback loop est construit mais non branché. Chaque batch généré sans signal réel est une occasion manquée d'améliorer la qualité créative. C'est le gap qui transforme Zenith d'un "générateur de briefs" en un "système qui apprend".
**Effort :** 20 lignes (appel buildCreativeSignalReport, construction du bloc ctxSignal, injection dans le prompt).
**Risque :** nul (si has_enough_data=false, le bloc n'est pas injecté, comportement identique à aujourd'hui).

### Priorité 3 : Persister les confidence scores
**Pourquoi en troisième :** le Product Brain est la source de vérité de tout le système. Sans savoir quels champs sont sûrs vs supposés, l'utilisateur ne peut pas décider quoi vérifier et quoi faire confiance. C'est la fondation de la qualité des décisions.
**Effort :** 10 lignes (ajouter les champs _conf au schema produit dans saveProductFromOnboarding, afficher un badge dans l'overlay).
**Risque :** nul (additif, aucun champ existant n'est modifié).

### Priorité 4 : Valider le circuit fal.ai bout-en-bout (BLOC D)
**Pourquoi en quatrième :** tout le pipeline créatif est théorique jusqu'à ce qu'une vraie image soit générée et sauvegardée. Sans cette validation, les bugs de production sont invisibles. BLOC C doit précéder (vrai appel Claude), mais BLOC D est le premier vrai livrable utilisateur.
**Effort :** test + corrections payload (estimation 1-3 bugs à corriger selon la réponse de l'API).
**Risque :** faible (dépense quelques centimes, pas de modification architecturale).

### Priorité 5 : Auto-déclaration des winners post-J4
**Pourquoi en cinquième :** la boucle de feedback (angle_scores, weekly_patterns, signal report) ne tourne que si les statuts créatifs sont mis à jour. Aujourd'hui, 100% de cette mise à jour dépend d'un geste manuel que l'utilisateur peut oublier. L'automatiser ne retire aucun contrôle — ça enlève juste la friction.
**Effort :** 25 lignes dans confirmExecuted() (post-J4_GO : analyser daily[], identifier ROAS > roas_target, passer WINNER, appeler updateAngleScore).
**Risque :** faible (la logique existante est déjà en place, on l'exécute automatiquement plutôt que manuellement).

---

## CONCLUSION SYNTHÉTIQUE

Zenith.ai est architecturalement bien conçu. Le waterfall ASL est propre, la séparation des responsabilités entre modules est correcte, la base de données créatives est en place avec les bonnes structures. Le système a les bonnes briques.

Le problème n'est pas architectural — c'est que plusieurs boucles critiques sont construites mais non fermées. Le feedback loop existe dans le code mais ne tourne pas. La formule ROAS est simplifiée. Les confidence scores s'évaporent après onboarding. Ces gaps font que le système génère des créatives sans vraiment apprendre de ses performances, et prend des décisions sur des seuils financiers incorrects.

La roadmap ci-dessus est conçue pour fermer ces boucles progressivement, sans refactoring lourd, sans casse du code existant. La Priorité 1 et la Priorité 2 à elles seules transforment un système qui "ressemble à un outil intelligent" en un outil qui l'est réellement.

---

*Audit réalisé sur code réel — index.html ~8200 lignes, server.js, sop.json. Dernière mise à jour : 2026-06-23.*
