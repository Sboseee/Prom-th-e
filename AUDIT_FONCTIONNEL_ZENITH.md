# ZENITH.AI — AUDIT FONCTIONNEL COMPLET
> Version : 2026-06-23 · Basé sur SOP v5 × ASL v9 (Zezinho) × code index.html réel
> Ce document décrit le système fonctionnel — pas l'architecture technique.

---

## 1. LE CERVEAU GLOBAL DE ZENITH

### Ce qu'il est vraiment

Zenith n'est pas un tableau de bord. Ce n'est pas un outil qui attend qu'on l'interroge. C'est un opérateur autonome qui observe les données, prend des décisions selon une méthode stricte (ASL v9 — Zezinho), génère les créatives, et dit à l'utilisateur quoi faire ensuite. L'utilisateur confirme ou infirme. Jamais l'inverse.

**Analogie simple :** C'est un trader algorithmique qui gère des budgets Meta Ads. Il a des règles strictes, une grille de lecture précise, et ne dévie jamais — même quand l'instinct dit autre chose.

---

### Comment il pense

Le cerveau suit un waterfall (cascade) de priorités strictement ordonnées. À chaque "run" (toutes les heures, ou déclenché manuellement), il passe ces priorités dans l'ordre et s'arrête à la première qui s'applique :

```
P0  Pas de produit actif            → Demande de configuration
P1  Lundi matin, audit non fait     → Audit hebdomadaire
P2  Métriques absentes              → Demande les données
P3  Anomalie détectée               → Alerte immédiate
P4  2 cuts consécutifs              → Mode diagnostic
P5  Spend ≥ 50€ → J1 non décidé    → Décision J1 (GO ou CUT)
P6  Spend ≥ 100€ → J2 non décidé   → Décision J2 (GO ou CUT)
P7  Spend ≥ 200€ → J4 non décidé   → Décision J4 (SCALE / OPTI / CUT)
P8  Batch créatif vide ou épuisé    → Créer un nouveau batch
P9  Sinon                           → Attendre (WAIT)
```

Ce waterfall est inviolable. Il ne peut pas être réordonné. Il garantit que Zenith ne saute jamais une étape critique.

---

### Quelles données il utilise

**Données avec le plus de poids (décisions ASL) :**
- `roas_real` — ROAS réel = CA Shopify / Spend Meta. C'est LA source de vérité pour J2 et J4.
- `cost_per_atc` — Coût par ajout au panier (€). Utilisé dans J2 comme signal funnel de secours.
- `orders` — Nombre de commandes. Critère principal de J1.
- `cpc` — Coût par clic. Signal de secours J1 (si 0 ventes mais CPC < 1€).
- `spend` — Dépenses cumulées. Déclencheur des seuils J1/J2/J4.

**Données secondaires (contexte et anomalies) :**
- `cpm` — Coût pour 1000 impressions. Détection d'anomalie (×1.5 vs hier).
- `cvr` — Taux de conversion landing page. Anomalie si < 0.3%.
- `freq` — Fréquence. Anomalie si ≥ 2.5 (saturation créative).
- `thumbstop` — Taux d'arrêt du scroll. Qualité du hook.
- `checkout_init` — Paiement initié. Signal funnel avancé.
- `reach` — Couverture audience.

**Données produit (calibration des seuils) :**
- `roas_be` — Seuil breakeven (calculé depuis la marge nette réelle).
- `roas_target` — Seuil de marge nette 20% (objectif).
- `roas_minus20` — Seuil de perte −20% (plancher absolu J4).
- `atc_threshold` — 20% de l'AOV (seuil coût/ATC J2).

**Données créatives (décisions futures) :**
- `creative_bank` — Historique complet de toutes les créatives avec leurs performances.
- `angle_scores` — Score de confiance par angle (winners/tests).
- `roas_history` — ROAS des 3 derniers jours (tendance pour CLR).

---

### Ce qui est automatisé vs ce qui demande validation humaine

**Automatisé (Zenith fait seul) :**
- Calcul des 4 seuils ROAS depuis la marge nette réelle du produit
- Détection des anomalies (CPM, CVR, fréquence, budget)
- Déclenchement des décisions J1/J2/J4 selon le spend cumulé
- Routing des créatives vers le bon outil selon la performance (CLR)
- Génération des briefs créatifs (Claude Sonnet)
- Génération des images (fal.ai) et vidéos (Higgsfield)
- Scoring des angles et grisage automatique (< 20% confiance sur 150€+)
- Protection des winners (winner_locked = jamais coupé)
- Rappel COGS bi-mensuel en phase scaling
- Analyse KPI contextuelle après chaque saisie

**Validation humaine requise :**
- Saisie des métriques quotidiennes Meta Ads + Shopify
- Confirmation des décisions J1/J2/J4 (bouton "Exécuté ✓")
- Lancement physique des campagnes Meta (Zenith donne le plan, l'humain l'exécute)
- Configuration initiale du produit (prix, COGS, avatar)
- Upload des visuels et créatives concurrentes
- Choix du niveau business stage (0-1K€ / traction / scaling)

---

## 2. LA CHRONOLOGIE UTILISATEUR COMPLÈTE

### JOUR 0 — Onboarding

**Ce que fait l'utilisateur :**
1. Lance `node server.js` et ouvre `http://localhost:4200`
2. Va dans Réglages → Paramètres compte (budget total, budget journalier, URL boutique)
3. Ajoute son produit dans l'overlay : prix, COGS, livraison, frais de paiement, taux de retour
4. Renseigne l'avatar : douleur, désir, objections, niveau de conscience (1 à 6)
5. Renseigne l'offre : USP, garantie, headline, angles, concurrents
6. Upload les visuels produit et les créatives concurrentes

**Ce que fait Zenith :**
- Calcule automatiquement les 4 seuils ROAS (roas_minus20, roas_be, roas_target_low, roas_target)
- Vérifie que le Product Brain est assez complet pour générer des créatives
- Lance le Market Intelligence Engine : analyse les créatives concurrentes uploadées (Tier 1), scrape les boutiques concurrentes (Tier 2)
- Détermine le business stage initial (0 à 1KD cumulé → copier le concurrent bête et méchant)

**Résultat en sortie :**
- Seuils ROAS personnalisés affichés
- Produit actif dans le catalogue
- Zenith lance `CREATE_BATCH` → génère le premier batch de créatives (mix obligatoire : 1 vidéo UGC, 1 statique, 1 Offer First)

---

### JOUR 0 (soir) — Premier batch créatif

**Ce que génère Zenith (stade TEST) :**
- Claude Sonnet reçoit : SOP v5 + avatar produit + analyse concurrents + contexte marché
- Génère N briefs JSON avec : angle, hook, format, awareness level, mood, image_prompt
- CLR route tous les briefs en stage TEST (pas encore de ROAS) → fal.ai Flux Pro → images statiques
- Budget recommandé : 5-10€/j par créative en phase TEST

**Ce que voit l'utilisateur :**
- Le plan Meta : nom de campagne `T [Produit] T1`, structure CBO, 1 adset Broad, objectif Achat
- La liste des créatives générées avec leurs attributs
- Les instructions exactes : "Lance le lendemain minuit. Ne touche rien avant 50€."

**Ce que l'utilisateur fait :**
- Lance la CBO Testing sur Meta Ads suivant le plan exact de Zenith

---

### JOUR 1 — Attente (50€ pas encore atteints)

**Ce que fait Zenith :**
- `runDecisionEngine()` → P9 (WAIT) : "Je surveille. Aucune intervention recommandée."
- Il vérifie les anomalies : si CPM ×1.5 vs hier, ou CVR < 0.3%, ou fréquence ≥ 2.5 → alerte immédiate (P3)
- `analyzeKPIs()` : si des métriques ont été saisies (même partielles), pousse une analyse contextuelle dans le Signal Feed

**Ce que fait l'utilisateur :**
- Rien. Il attend. Zezinho dit explicitement : "Ne touche à rien avant 50€."
- S'il saisit ses métriques intermédiaires, Zenith les commente mais ne décide pas

**Règle critique (LOI 1 Zezinho) :**
> Ne jamais toucher à la campagne avant le seuil décisionnel. Chaque modification remet le compteur d'apprentissage Meta à zéro.

---

### JOUR 2 (ou dès que spend ≥ 50€) — DÉCISION J1

**Ce que Zenith fait :**
- `runDecisionEngine()` → P5 : seuil J1 atteint
- `ASL.decideJ1(orders, cpc)` :
  - ≥ 1 commande → **GO J1** → continuer vers J2 (100€)
  - 0 commande + CPC < 1€ → **GO J1** → signal positif, Meta cherche encore
  - 0 commande + CPC ≥ 1€ → **CUT J1** → couper l'adset

**Ce que voit l'utilisateur :**
- Une bulle de décision claire : "GO J1 · ROAS X · CPC Y€ · [raison]"
- Les instructions exactes : "Aucune action. Laisse tourner. Prochain checkpoint J2 à 100€."
- ou : "Désactive l'adset (toggle off). NE PAS supprimer. Changer angle ou créas."

**Ce que l'utilisateur fait :**
- Confirme en cliquant "Exécuté ✓"
- `spend_cycle` s'incrémente du spend du jour

---

### JOUR 3-4 (dès que spend ≥ 100€) — DÉCISION J2

**Ce que Zenith fait :**
- `ASL.decideJ2(roas_real, roas_be, cost_per_atc, aov)` :
  - ROAS > roas_be → **GO J2** → continuer vers J4 (200€)
  - 1 ≤ ROAS ≤ roas_be + coût/ATC < 20% AOV → **GO J2** → signal funnel positif, continuer
  - ROAS < 1 + coût/ATC < 50% seuil → **CUT** + signal nuance orange (Zezinho)
  - Sinon → **CUT J2** → couper la CBO

**Ce que voit l'utilisateur :**
- Bulle J2 : verdict + raison détaillée + ROAS vs BE
- Signal KPI : analyse contextuelle CPM, CTR, CPC, Thumbstop...
- Instructions : "Aucune action. ROAS > BE. Laisse jusqu'à 200€." ou "Désactive CBO Testing. Analyse variable échouée."

---

### JOUR 4-6 (dès que spend ≥ 200€) — DÉCISION J4 (FINALE)

**Ce que Zenith fait :**
- `ASL.decideJ4(roas_real, roas_be, roas_target, roas_minus20)` :
  - ROAS ≥ roas_target → **SCALE** → winners en Master CBO, paliers Zezinho
  - ROAS ≥ roas_minus20 (zone OPTI) → **OPTI** → 3 cartouches P6 (prix / offre+créas / above fold)
  - ROAS < roas_minus20 → **CUT** → retour P0

**Zone OPTI — les 3 cartouches Zezinho :**
- Cartouche 1 : Agir sur le prix (test prix, bundle, garantie)
- Cartouche 2 : Agir sur l'offre + nouvelles créatives (angle différent)
- Cartouche 3 : Agir sur l'above fold (landing page, images principales)
- Durée : 3 jours par cartouche. Juger sur le profit, pas juste le ROAS.

**Ce que voit l'utilisateur :**
- Bulle J4 : verdict avec tous les seuils affichés (rm20, BE, Target)
- Plan Meta Execution : structure Master CBO si SCALE, plan cartouches si OPTI
- Instructions exactes selon le verdict

---

### SEMAINE 2 — Phase SCALING (si J4 GO)

**Ce que fait Zenith :**
- Phase = `SCALING` dans le data model
- CLR route les nouveaux briefs en stage SCALE → Higgsfield → vidéos UGC 9:16 10s
- Budget : paliers Zezinho → 50→100→150→200→300→400→500€/j (attendre 3 jours entre chaque palier)
- Les winners (roas ≥ roas_target) sont verrouillés : `winner_locked = true`, jamais coupés
- `computeRoasTrend()` surveille l'historique ROAS 3 jours → si DECLINING → retour en VALIDATION
- Rappel COGS activé : 14 jours après scaling_started_at → "Recalcule ton COGS"

**Audit hebdo (chaque lundi) :**
- `runDecisionEngine()` → P1 : AUDIT_WEEKLY
- Instructions : "Ads Manager → 3 derniers jours → désactive tout ce qui est sous BE (ROAS < roas_be)"
- Zenith donne la liste précise des créatives à couper

---

### SEMAINE 4+ — Maturité et feedback loop

**Ce que fait Zenith :**
- `angle_scores` : chaque angle a un score de confiance (winners/tests). Si < 20% sur 150€+ → GRISÉ automatiquement.
- `creative_bank` : toutes les créatives et leurs performances quotidiennes sont stockées
- Le prochain `CREATE_BATCH` reçoit : les angles qui ont marché, les hooks qui ont converti, les formats gagnants → Claude génère des variations sur les bases prouvées
- `detectCreativeFatigue()` : si une créative baisse de 25% en un jour (SHARP_DROP) ou stagne 3 jours (STAGNATION_3D) → signalée comme fatiguée

**Ce que ne fait pas encore Zenith (BLOC E — non codé) :**
- Réinjecter automatiquement les attributs gagnants dans les prompts Claude
- La boucle de feedback est fondée mais pas encore fermée — le Creative Signal Report existe, l'injection automatique non.

---

## 3. LE SYSTÈME DE BULLES — AUDIT COMPLET

### Architecture du système

Le système de bulles est l'interface principale. Ce n'est pas un dashboard de métriques — c'est un flux d'actions chronologiques. Chaque "bulle" (appelée Mission dans le code) est l'état courant du cerveau : ce qu'il a décidé et ce qu'il attend de l'utilisateur.

**Il n'y a qu'une seule bulle active à la fois.** Le waterfall P0→P9 garantit que Zenith présente toujours la décision la plus prioritaire. Les signaux secondaires (anomalies, KPI, nuances) passent par le Signal Feed, pas par la bulle principale.

---

### Inventaire complet des bulles

#### NO_PRODUCT
- **Quand :** Aucun produit actif dans le catalogue
- **Condition :** `getActiveProduct()` retourne null
- **Priorité :** P0 — toujours en premier
- **Action attendue :** Aller dans Réglages et configurer un produit
- **Disparition :** Dès qu'un produit est sauvegardé et activé
- **Réapparition :** Si l'utilisateur supprime le produit actif

#### AUDIT_WEEKLY
- **Quand :** Chaque lundi matin si l'audit hebdo n'a pas été validé
- **Condition :** `today.getDay() === 1 && !camp.is_monday_audit_done`
- **Priorité :** P1 — avant même les métriques
- **Action attendue :** Aller dans Ads Manager, désactiver tout ce qui est sous BE, confirmer
- **Disparition :** Confirmation de l'utilisateur (`is_monday_audit_done = true`)
- **Réapparition :** Le lundi suivant (reset automatique en début de semaine)
- **Contenu :** Instructions précises sur quoi regarder dans Ads Manager — colonnes à vérifier, seuil de coupure (ROAS < roas_be)

#### DATA_NEEDED
- **Quand :** Pas de métriques saisies depuis trop longtemps (ou jamais)
- **Condition :** `!metrics || !metrics.spend` après les premiers seuils
- **Priorité :** P2 — bloquant pour toutes les décisions
- **Action attendue :** Saisir le formulaire métriques (Spend, CA, Orders, CTR, CPC, CPM, Thumbstop, Freq, CVR, ATC, Coût/ATC, Paiement initié, Couverture)
- **Disparition :** Dès que `submitMetrics()` est validé
- **Note :** Sans données, Zenith ne peut rien décider. C'est intentionnel.

#### ANOMALY_CPM / ANOMALY_FREQ / ANOMALY_CVR / ANOMALY_BUDGET
- **Quand :** Détection d'un signal critique dans les métriques
  - CPM × 1.5 vs la veille → audience saturée, pas les créas
  - Fréquence ≥ 2.5 → saturation créative, refresh nécessaire
  - CVR < 0.3% → problème funnel, corriger le site avant de toucher les pubs
  - Budget restant < 200€ → mode conservateur
- **Priorité :** P3 — passe avant toutes les décisions J1/J2/J4
- **Action attendue :** Chaque anomalie a son action précise (ex. CPM : ne pas toucher aux créas, regarder l'audience)
- **Disparition :** Les métriques reviennent dans la normale + confirmation
- **Note importante :** Zezinho dit que le CPM (7-35€) n'est pas en soi un problème — l'anomalie doit être relative (×1.5 vs hier), pas absolue.

#### DIAGNOSTIC
- **Quand :** 2 cuts consécutifs sur le même produit
- **Condition :** `camp.cuts_count >= 2`
- **Priorité :** P4
- **Action attendue :** Analyse approfondie — le problème n'est pas les créas mais probablement le produit, l'offre, ou la landing page
- **Contenu :** Formule diagnostique (Volume × Diversité × Qualité × Feedback Loop × Double Down)
- **Disparition :** Confirmation de l'utilisateur

#### J1_GO / J1_CUT
- **Quand :** `spendCumul >= 50 && !camp.j1_decided`
- **Priorité :** P5
- **Données affichées :** ROAS actuel, commandes, CPC, seuil BE
- **Action attendue :** "Exécuté ✓ — Je continue" ou "Exécuté ✓ — CBO coupée"
- **Disparition :** `confirmExecuted()` → `j1_decided = true`
- **Réapparition :** Jamais dans ce cycle. Au cycle suivant (reset complet).

#### J2_GO / J2_CUT
- **Quand :** `spendCumul >= 100 && camp.j1_decided && !camp.j2_decided`
- **Priorité :** P6
- **Données affichées :** ROAS réel, ROAS BE, Coût/ATC vs seuil 20% AOV
- **Nuance :** Si CUT mais ATC très bas → signal orange annexe dans le Signal Feed
- **Action attendue :** Confirmation exécution
- **Disparition :** `j2_decided = true`

#### J4_GO (SCALE) / J4_OPTI / J4_CUT
- **Quand :** `spendCumul >= 200 && camp.j2_decided && !camp.j4_decided`
- **Priorité :** P7 — la décision la plus importante
- **Données affichées :** ROAS réel, roas_minus20, roas_be, roas_target, verdict
- **Si SCALE :** Plan Master CBO, paliers budget
- **Si OPTI :** Les 3 cartouches avec instructions précises
- **Si CUT :** Post-mortem, prochaine étape (nouveau produit ou angle)
- **Disparition :** `j4_decided = true` + `asl_phase` mis à jour

#### CREATE_BATCH
- **Quand :** Le batch créatif doit être renouvelé (J4 décidé, ou premier cycle)
- **Priorité :** P8
- **Ce qui se passe :** Appel Claude → N briefs → CLR routing → génération médias
- **Action attendue :** Validation du plan Meta (nom de campagne, budget, structure)
- **Disparition :** Batch généré et confirmé

#### WAIT
- **Quand :** Toutes les priorités P0→P8 sont vérifiées et aucune ne s'applique
- **Priorité :** P9 — état d'équilibre
- **Message :** "Je surveille. Aucune intervention recommandée."
- **Réapparition :** À chaque run horaire, si rien ne change
- **Action attendue :** Aucune. C'est intentionnel.

---

### Le Signal Feed (système secondaire)

En parallèle de la bulle principale, le Signal Feed collecte :
- Analyse KPI contextuelle après chaque saisie (`analyzeKPIs`)
- Nuance J2 ATC bas (signal orange)
- Rappel COGS bi-mensuel
- CLR routing (stage du batch)
- Plan Meta Execution (nom de campagne, structure)
- Alertes créatives (fatigue, CLR déclassement)

Le Signal Feed est un historique permanent — il ne disparaît pas quand la bulle principale change.

---

### Avis sur le système de bulles

**Ce qui est solide :**
Le principe d'une seule décision visible à la fois est correct et fidèle à Zezinho. L'utilisateur ne doit jamais hésiter sur quoi faire. Le waterfall garantit que la priorité la plus haute est toujours présentée.

**Ce qui manque :**
- Pas de timer/rappel automatique pour la saisie quotidienne des métriques. Zezinho dit "21h30 — tu n'as pas saisi tes métriques". Zenith le fait uniquement sur déclenchement manuel (runBrain horaire), mais aucune notification système ou badge.
- La bulle WAIT est passive. Elle pourrait afficher une projection : "À ce rythme, J2 dans ~2 jours". Ce serait utile sans être intrusif.
- Le système d'audit hebdo (AUDIT_WEEKLY) n'a pas de liste dynamique : il devrait lister les créatives à couper (celles sous roas_be depuis 3 jours) directement dans la bulle.

---

## 4. LA MÉMOIRE ZENITH

### Ce qui est stocké (localStorage `promethee_v1`)

**Compte :**
- URL boutique, marché, budget total, budget restant, budget journalier
- `level` : A (0-1K€ cumulé) / B (1K-10K€) / C (10K€+) — géré automatiquement

**Produit actif (parmi le catalogue) :**
- Données économiques : prix, COGS, livraison, frais paiement, taux retour
- 4 seuils ROAS calculés : roas_minus20, roas_be, roas_target_low, roas_target
- Seuil ATC : atc_threshold = AOV × 20%
- Avatar : douleur, désir, objections, niveau de conscience, USP, garantie, headline
- Intelligence : angles saturés, angles opportunités, concurrents, images, profil vocal

**Campagne (cycle en cours) :**
- Phase : TESTING / OPTI / SCALING
- spend_cycle : cumul confirmé uniquement (jamais au moment de la saisie)
- Décisions : j1_decided, j2_decided, j4_decided
- Compteurs : cycle_number, cuts_count
- Temporel : cycle_start, scaling_started_at (pour COGS reminder)
- Historique ROAS : roas_history[{roas, date}] — fenêtre glissante 3 jours

**Dernières métriques saisies (last_metrics) :**
- Meta : spend, CTR, CPC, CPM, thumbstop, fréquence, impressions, couverture
- Shopify : CA réel, commandes, CVR, ATC count, coût/ATC (€), paiement initié
- Calculés : roas_real (CA/spend), atc_ratio (ATC/commandes)

**Creative Bank (toutes les créatives jamais générées) :**
- Identité : angle, hook, format, awareness_level, mood, intensité, levier copywriting
- Routing CLR : stage (TEST/VALIDATION/SCALE), outil (fal.ai/Higgsfield), modèle
- Status : DRAFT → TESTING → WINNER / GRISED / RETIRED
- Performance globale : spend total, ROAS moyen, jours de diffusion
- Performance quotidienne : daily[{date, spend, CTR, CPM, ATC, purchases, CA, ROAS}]
- winner_locked : booléen — protège les winners de toute coupure
- Médias : media_path (local), remote_url (backup), generated_at

**Scores par angle (`angle_scores`) :**
- Pour chaque angle : tests effectués, winners obtenus, score de confiance (winners/tests)
- Status : ACTIVE / GRISED (< 20% confiance sur 150€+ de spend)
- Utilisé par Zenith pour orienter le prochain batch

**Historique décisions (`decisions_log`, max 100) :**
- Chaque décision ASL : timestamp, type, raison, métriques snapshot
- Plans Meta Execution archivés
- Utilisé pour la continuité narrative (bulle "hier je te disais X")

**Patterns hebdomadaires (`weekly_patterns`, max 12 semaines) :**
- Fondation pour futures analyses de tendances saisonnières

---

### Ce qui est appris par Zenith avec le temps

1. **Quels angles convertissent** (`angle_scores`) — chaque cycle enrichit le score de confiance. Après 5+ cycles, Zenith sait avec précision quels angles valent d'être testés.

2. **Quels hooks arrêtent le scroll** (via `thumbstop` dans `creative.daily[]`) — les hooks avec thumbstop > 25% sont les plus précieux. Cette donnée est stockée par créative.

3. **Quels formats scale** (via `stage` dans `creative_bank`) — les créatives qui ont passé de TEST → VALIDATION → SCALE forment la base des prochains batches.

4. **La tendance ROAS** (`roas_history`) — 3 points de données permettent de détecter DECLINING / IMPROVING / STABLE. Le CLR utilise cette information pour déclasser des créatives de SCALE à VALIDATION.

5. **Le comportement de l'audience** (`freq`, `reach`, `impressions`) — la fréquence croissante combinée à un ROAS stable signale une audience saine vs une audience épuisée.

---

### Comment Zenith devient plus intelligent

À chaque cycle complet (200€ dépensés, J4 décidé) :
- Les angles testés ont des scores mis à jour
- Les créatives gagnantes sont verrouillées et répliquées
- Les attributs des winners (hook_style, mood, format, awareness) alimentent le contexte du prochain appel Claude
- Claude génère des variations sur les bases prouvées, pas sur des hypothèses

**Ce qui manque encore (BLOC E non codé) :**
Le `buildCreativeSignalReport()` existe — il compile les patterns gagnants. Mais l'injection automatique dans le prompt `callClaudeForBriefs()` n'est pas encore faite. Actuellement, Claude reçoit la `creative_bank` brute, pas un résumé "ces 3 attributs ont le meilleur win rate — priorise-les". C'est la prochaine étape critique.

---

## 5. LE WORKFLOW CRÉATIF COMPLET

### De la décision de créer à l'asset généré

```
1. runDecisionEngine() → P8 → CREATE_BATCH

2. callClaudeForBriefs(batchSize)
   Contexte injecté dans le prompt Claude :
   ├── SOP v5 (sop.json) : hooks, moods, awareness, formats, leviers copywriting
   ├── Produit actif : prix, COGS, avatar, USP, garantie, headline
   ├── Stage courant (ctxStage) : TEST / VALIDATION / SCALE → Claude adapte le contenu
   ├── Creative bank existante : hooks déjà utilisés (éviter doublons)
   ├── Angle scores : quels angles ont marché, lesquels sont saturés
   ├── Market Intelligence : analyse créatives concurrentes + données boutiques scrappées
   └── Historique décisions : pourquoi on est ici

3. Claude retourne N briefs JSON :
   {
     angle, hook_style, hook_text, awareness_level,
     mood, intensite, levier_copywriting,
     format, type_media (image/video),
     image_prompt,          ← si stage TEST ou VALIDATION → fal.ai
     higgsfield_brief,      ← si stage SCALE → Higgsfield
     script_complet,        ← voix off si nécessaire
     needs_text_overlay,    ← booléen : texte sur l'image oui/non
     score_confiance
   }

4. Quality Control :
   - Zéro doublons de hook dans le batch
   - Diversité d'angles (pas 3 fois le même)
   - Chaque brief passe la méthode 3I : Insight / Intrigue / Impact

5. Creative Lifecycle Router (CLR) :
   ├── computeRoasTrend(mem) → DECLINING / IMPROVING / STABLE / INSUFFICIENT_DATA
   ├── routeCreative(params) → stage : TEST / VALIDATION / SCALE
   │   TEST       → fal.ai Flux Pro v1.1 → IMAGE_STATIC (5-10€/j)
   │   VALIDATION → fal.ai Flux Pro v1.1 → UGC_IMAGE (10-20€/j)
   │   SCALE      → Higgsfield → VIDEO_UGC 9:16 10s 720p (20-50€/j)
   ├── overrideBriefWithStage() → force type_media selon stage
   └── Règle absolue : aucune vidéo Higgsfield sans stage SCALE

6. Génération médias :
   ├── generateImage(brief) → /api/fal → fal.ai
   │   needs_text_overlay=true → Ideogram v3 (texte natif dans l'image)
   │   sinon → Flux Pro v1.1 (photo réaliste)
   └── generateVideo(brief) → /api/higgsfield → UGC 9:16

7. Sauvegarde dans creative_bank :
   { id, angle, hook, format, stage, tool, model, status:'TESTING',
     media_path, remote_url, generated_at, daily:[] }

8. Plan Meta Execution généré :
   { campaign_name:'T [Produit] T1', stage, daily_budget, creative_count,
     structure:'CBO · 1 adset Broad · Objectif Achat' }
```

---

### Comment Zenith choisit les angles

1. **Vérification des scores :** Les angles avec `status='GRISED'` sont exclus.
2. **Priorisation des opportunités :** Les angles définis dans `prod.angles_opportunities` sont favorisés.
3. **Saturation évitée :** Les angles dans `prod.angles_saturated` sont exclus.
4. **Diversité forcée :** Le batch ne peut pas avoir 2× le même angle.
5. **Business stage :** Si `testing_0_1kd` → copier l'angle du concurrent qui tourne le plus (pas inventer). Si `opti_1kd+` → commencer à explorer des angles différentiants.

---

### Comment Zenith choisit les hooks (SOP v5)

8 styles de hooks documentés dans la SOP :
- Hidden Fear (peur cachée — universelle, puissante)
- Hidden Desire (désir caché — fort sur lifestyle/transformation)
- Did You Know (curiosité brute — la plus polyvalente)
- Debate (force un choix mental → engagement avant le body)
- Question choc, Stat surprenante, Déclaration contre-intuitive, Pattern interrupt visuel

**Règle critique (Zezinho x Matteo) :** Le hook IS the targeting. Meta ne lit pas la pub entière — il calibre l'audience sur les 3 premières secondes. Un hook qui parle à un seul profil plafonne le scale. Les comptes à 9 chiffres masterisent 40-100 hooks différents psychologiquement.

---

### Comment Zenith utilise les winners vs losers

**Winners (roas ≥ roas_target, winner_locked = true) :**
- Ne sont jamais coupés, même en audit lundi
- Sont répliqués dans les prochains batches (même angle, variation du hook ou du format)
- Leurs attributs (hook_style, mood, format, awareness) forment la base des prochains briefs

**Losers (GRISED ou RETIRED) :**
- Leurs attributs sont stockés dans `creative_bank` pour analyse
- L'angle est noté comme ayant un faible win rate
- Cette information est disponible pour Claude lors du prochain batch (éviter les patterns perdants)
- La variable qui a échoué est identifiée : hook ? angle ? format ? mood ?

**Logique Andromeda (SOP v5 — Zezinho) :**
Les éléments valides pour une itération sont classés par couleur :
- Vert : FORMAT, CONCEPT, ANGLE_MARKETING, MESSAGE (itération forte — changer seul suffit)
- Orange : HOOK_STYLE, LEVIER_COPYWRITING, LEAD_TECHNIQUE (dépend de l'ampleur)
- Rouge : Langage, police, couleur, musique (ne compte pas comme itération seule)

---

### Win rates par type de format (SOP v5)

| Format | Win rate |
|--------|----------|
| Unboxing | 10% |
| Offer First | 9% |
| UGC Testimonial | 7.6% |
| Text-based | 5% |
| Creator Partnership | 4% |

**Note importante (SOP v5) :** Chercher les créas avec BON win rate ET gros spend ratio — les vraies anomalies. Un win rate correct qui explose en spend > un win rate élevé sur peu de spend.

---

## 6. LE WORKFLOW DÉCISIONNEL COMPLET

### TEST — Quand et comment

**Déclenchement :** Premier cycle, ou après un CUT (reset), ou CLR stage TEST
**Données requises :** Aucun ROAS historique (ou ROAS < roas_be)
**Ce que fait Zenith :**
- Budget : 50€/j recommandé (palier minimal Zezinho)
- Créatives : images statiques Flux Pro (5-10€/j par créa)
- CLR : stage TEST → fal.ai uniquement, jamais Higgsfield
- Décisions : J1 à 50€, J2 à 100€, J4 à 200€ — toutes basées sur ROAS réel Shopify

**Données précises utilisées :**
- J1 : `orders`, `cpc` — les deux seules métriques qui comptent à 50€
- J2 : `roas_real`, `roas_be`, `cost_per_atc`, `aov` — ROAS + signal funnel
- J4 : `roas_real`, `roas_be`, `roas_target`, `roas_minus20` — décision finale

---

### OPTI — Quand et comment

**Déclenchement :** J4 → roas_minus20 ≤ ROAS < roas_target
**Ce que fait Zenith :**
- 3 cartouches disponibles, dans l'ordre Zezinho
- Cartouche 1 : Prix (bundle, reduction, positionnement)
- Cartouche 2 : Offre + nouvelles créatives (angle différent)
- Cartouche 3 : Above fold landing page
- 3 jours par cartouche, juger sur le profit, pas le ROAS instantané
- Si après les 3 cartouches le ROAS ne passe pas roas_minus20 → CUT définitif

**Données précises utilisées :**
- ROAS réel Shopify (source de vérité)
- Budget restant (si < 200€ après OPTI → alerte)
- Historique des décisions passées (cartouche utilisée)

**CLR en OPTI :**
- ROAS ≥ roas_be → VALIDATION stage → UGC_IMAGE (10-20€/j)
- ROAS entre roas_minus20 et roas_be → TEST stage (déclassement hard)

---

### SCALE — Quand et comment

**Déclenchement :** J4 → ROAS ≥ roas_target
**Ce que fait Zenith :**
- `asl_phase = 'SCALING'`, `scaling_started_at` enregistré
- Budget : paliers 50→100→150→200→300→400→500€/j (attendre 3 jours entre chaque)
- Structure : Master CBO (winners only) en parallèle de la CBO Testing
- CLR : stage SCALE → Higgsfield → vidéos UGC
- Audit lundi : désactivation des créatives sous roas_be
- Rappel COGS à J+14

**Données précises utilisées :**
- `roas_history[3j]` : tendance ROAS (DECLINING → retour VALIDATION)
- `winner_locked` : protège les assets gagnants
- `scaling_started_at` : déclencheur du rappel COGS

---

### CUT — Quand et comment

**J1 CUT :**
- 0 vente + CPC ≥ 1€ après 50€
- Action : désactiver l'adset (toggle off), NE PAS supprimer
- `cuts_count++`, reset cycle si 2× consécutifs → DIAGNOSTIC

**J2 CUT :**
- ROAS < 1 (+ nuance possible si ATC très bas)
- ou ROAS entre 1 et BE + coût/ATC ≥ seuil
- Action : désactiver la CBO Testing complète

**J4 CUT :**
- ROAS < roas_minus20 (perte nette confirmée)
- Action : désactiver. Post-mortem. Relancer avec un angle radicalement différent ou changer de produit.

---

### WAIT — Quand et comment

**Déclenchement :** Toutes les conditions P0→P8 sont fausses
**Durée :** Jusqu'au prochain seuil de spend, ou prochaine anomalie
**Message :** "Je surveille. Aucune intervention recommandée."
**Données affichées :** ROAS courant, phase, cycle
**Action attendue :** Aucune

---

### DIAGNOSTIC — Quand et comment

**Déclenchement :** `cuts_count >= 2`
**Ce que fait Zenith :**
- Passe en revue la formule diagnostique (Volume × Diversité × Qualité × Feedback Loop × Double Down)
- Identifie le maillon le plus faible (Zenith peut noter 0→3 sur chaque variable)
- Si le diagnostic pointe vers le produit → reset complet, nouveau produit
- Si vers les créas → nouveau batch avec angle radicalement différent

---

## 7. LES ZONES ENCORE FAIBLES

### Ce qui manque

**CRITIQUE — Feedback Loop non fermée (BLOC E)**
`buildCreativeSignalReport()` compile les patterns gagnants mais cette compilation n'est pas injectée dans `callClaudeForBriefs()`. Claude reçoit la creative_bank brute mais pas un résumé "hook X a converti 3/3 fois, angle Y a un win rate de 0% — ne l'utilise plus". La boucle d'apprentissage existe structurellement mais n'est pas fermée.

**CRITIQUE — roas_history non utilisé dans J4**
`roas_history` est collecté dans `submitMetrics()` mais la logique de scaling (paliers, double-down si ROAS stable 3j) n'est pas branchée dans `runDecisionEngine()`. Le CLR l'utilise pour le trend, mais J4 ne l'utilise pas encore pour décider si on peut passer au palier supérieur.

**MANQUANT — Aucun rappel automatique métriques**
VISION.md dit "21h30 — tu n'as pas encore saisi tes métriques". Actuellement, Zenith tourne en mode polling horaire mais il n'y a aucun mécanisme de rappel (notification, badge). `DATA_NEEDED` s'affiche si les métriques sont absentes, mais seulement quand l'utilisateur ouvre l'app.

**MANQUANT — Liste dynamique dans AUDIT_WEEKLY**
La bulle du lundi donne des instructions génériques. Elle devrait lister dynamiquement les créatives dont le ROAS sur 3 jours est sous roas_be avec leur spend exact — pour que l'utilisateur sache exactement quoi couper dans Ads Manager.

**MANQUANT — Saisie par créative enrichie**
La saisie quotidienne granulaire par créative (zone DCE dans la form métriques) existe en UI mais n'est pas guidée. L'utilisateur doit savoir quelles colonnes lire dans Meta pour remplir les données par créa. Un guide colonnes (les 17 colonnes Zezinho) manque.

**MANQUANT — Phase OPTI — cartouches non trackées**
Quand Zenith dit "tu es en cartouche 1 (prix)", il n'y a pas de suivi automatique de si la cartouche a été essayée et sur combien de jours. `camp.cartouche` existe mais n'est pas utilisé pour la logique temporelle.

**MANQUANT — ElevenLabs non configuré**
La voix off (ElevenLabs) est dans l'architecture mais la clé API n'est pas configurée. Les briefs vidéo SCALE ont un `script_complet` mais aucune voix off générée automatiquement.

---

### Ce qui est fragile

**Higgsfield endpoint non validé**
L'endpoint `/api/higgsfield` est implémenté mais jamais testé avec de vraies clés. Le format exact des paramètres (acteur, lieu, émotion) peut différer de la doc officielle.

**Simulate mode toujours actif**
`opts.simulate_media = true` dans `executeCreateBatch()` signifie qu'aucune vraie image/vidéo n'a jamais été générée. BLOC C (premier vrai appel Claude) et BLOC D (premier vrai média) sont les deux prochains à valider.

**Données créatives par créative**
La zone de saisie granulaire (spend/CTR/CPM par créative) est manuelle — l'utilisateur doit recopier depuis Meta. Si Meta change son interface ou ses colonnes, les données ne rentrent plus. L'idéal serait une connexion API Meta Ads (non planifiée).

**Scaling_started_at si J4 GO dans une ancienne session**
Si une session ancienne n'avait pas `scaling_started_at` dans le data model, `migrateMemoryIfNeeded()` doit gérer ce champ — il est dans defaultMemory mais pas dans la migration. `checkCogsReminder()` est protégée par un check null mais le champ manquant ne déclenchera jamais de rappel pour les données existantes.

---

### Ce qui n'exploite pas encore la valeur des documents

**SOP v5 — Methode 3I non implémentée dans le QC**
Le Quality Control vérifie les doublons de hooks et la diversité mais ne passe pas chaque brief par la méthode 3I (Insight / Intrigue / Impact). Claude est instruit de la respecter via le prompt, mais il n'y a pas de vérification automatique programmatique.

**SOP v5 — Win rates par format non utilisés pour guider le batch mix**
La SOP dit "Unboxing 10%, Offer First 9%, UGC 7.6%". Ces win rates existent dans `sop.json` mais Zenith ne les utilise pas pour orienter la composition du batch (exemple : si on n'a pas encore testé Offer First, l'inclure en priorité dans le prochain batch).

**SOP v5 — Andromeda fingerprint non utilisé comme guide d'itération**
Les éléments vert/orange/rouge (quoi changer pour une vraie itération) existent dans `sop.json` mais ne sont pas utilisés pour guider les briefs d'itération. Quand Zenith génère un batch en OPTI, il devrait prioriser les éléments "vert" (format, concept, angle) plutôt que "rouge" (couleur, police).

**Diagnostic formula non automatisée**
La formule V × D × Q × FL × DD existe dans `sop.json` mais n'est pas calculée automatiquement depuis les données réelles de `creative_bank`. Zenith devrait pouvoir dire "ton Volume est 3/3, ta Qualité est 2/3, mais ton Feedback Loop est 0/3 — c'est ça qui te bloque."

---

## 8. VISION FINALE — Zenith parfaitement aligné avec les documents

*Strictement basé sur SOP v5 × ASL v9 (Zezinho) × Vision.md. Aucune invention.*

---

### Ce que fait Zenith chaque matin

L'utilisateur ouvre l'app. Zenith a déjà tourné (run horaire) et présente la décision du jour.

**Si métriques pas encore saisies :**
- Bulle DATA_NEEDED avec rappel contextuel du jour précédent ("hier ROAS 2.1x, encore 40€ avant J4")
- Pré-remplissage partiel si possible depuis l'historique

**Si métriques saisies :**
- Analyse KPI complète et contextualisée (CPM bon, CTR en baisse → hook fatigue ?)
- Décision ASL claire : GO / CUT / WAIT / ANOMALY
- Instructions Meta exactes si action requise
- Plan créatif si nouveau batch nécessaire

**Si lundi :**
- Liste dynamique des créatives à couper (ROAS < roas_be sur 3 jours)
- Bilan de la semaine : winners confirmés, angles grisés, ROAS tendance

---

### Ce que fait Zenith quand il génère un batch

1. Analyse la creative_bank : quels hooks ont convergé (thumbstop > 25%), quels angles ont un win rate > 0, quels formats ont scalé
2. Synthétise le Creative Signal Report : top 3 attributs gagnants, top 3 erreurs à éviter
3. Injecte ce rapport dans le prompt Claude
4. Claude génère des briefs calibrés sur les patterns prouvés (pas des hypothèses)
5. Le batch est composé selon les win rates SOP (Offer First en premier si jamais testé)
6. CLR route chaque brief selon le ROAS trend du moment
7. Les médias sont générés avec les bons outils (fal.ai ou Higgsfield)
8. Le plan Meta est généré avec le nom de campagne, la structure CBO, le budget

---

### Ce que fait Zenith à la fin du cycle (J4 décidé)

- Documente toutes les décisions dans `decisions_log`
- Met à jour les scores d'angles
- Identifie les variables qui ont causé le succès ou l'échec (format ? hook ? angle ? mood ?)
- Prépare le prochain cycle avec ces apprentissages pré-chargés
- Si SCALE : lance le Master CBO, surveille les paliers, protège les winners
- Si OPTI : prépare les cartouches dans l'ordre Zezinho
- Si CUT : post-mortem, recommendation produit/angle suivant

---

### Ce que devient Zenith avec 10 cycles de données

- Les angles avec > 2 winners ont un score de confiance élevé → priorisés automatiquement
- Les hooks qui convertissent → répliqués avec variations (format, mood, intensité)
- Les formats qui scalent → composent 60%+ du prochain batch
- Les anomalies récurrentes → détectées plus vite (Zenith apprend que le mardi matin a toujours un CPM élevé pour ce produit)
- La formule diagnostique → calculée automatiquement (Volume : 12 créas/semaine, Diversité : 4 angles actifs, Qualité : win rate 11%, Feedback Loop : ⚠️ pas encore automatisé, Double Down : winners × 3)

---

### La version Zenith terminée en une phrase

*Zenith reçoit un produit, observe les données quotidiennement, génère des créatives selon la SOP v5 calibrée sur les patterns gagnants, décide selon l'ASL v9 (Zezinho) sans jamais dévier, et guide chaque action jusqu'au scaling rentable — sans que l'utilisateur ait besoin de connaître le média buying.*

---

## RÉCAPITULATIF — Ce qui est implémenté vs ce qui reste

| Module | Statut | Priorité suivante |
|--------|--------|-------------------|
| ASL J1/J2/J4 | ✅ Complet (LOT 1) | — |
| CLR (routing créatif) | ✅ Complet | — |
| Meta Execution Engine | ✅ Complet | — |
| KPI Analysis (benchmarks Zezinho) | ✅ Complet | — |
| COGS reminder | ✅ Complet | — |
| Product Brain (overlay complet) | ✅ Complet | — |
| Market Intelligence (concurrents) | ✅ Complet | — |
| Premier vrai appel Claude (BLOC C) | 🔴 À faire | **Priorité 1** |
| Premiers vrais médias fal.ai (BLOC D) | 🔴 À faire | Après BLOC C |
| Feedback Loop — injection winners | 🔴 À faire | **Priorité 2** |
| roas_history dans J4 (paliers scaling) | 🔴 À faire | Après BLOC D |
| Liste dynamique AUDIT_WEEKLY | 🟡 Partiel | Priorité 3 |
| Saisie guidée colonnes Meta | 🟡 Manquant | Priorité 3 |
| Cartouches OPTI trackées | 🟡 Partiel | Priorité 4 |
| Andromeda fingerprint dans briefs | 🟡 Dans SOP, non guidé | Priorité 4 |
| Win rates SOP → composition batch | 🟡 Dans SOP, non guidé | Priorité 4 |
| Diagnostic formula automatisée | 🔴 Non codé | Priorité 5 |
| ElevenLabs voix off | 🔴 Non configuré | Priorité 5 |
| Higgsfield endpoint validé | ⚠️ À tester | Après BLOC D |
