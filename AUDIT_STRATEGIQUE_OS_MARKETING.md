# Prométhée comme OS marketing autonome — Audit stratégique

> Périmètre de cet audit : l'état réel du code à ce jour (vérifié ligne par ligne pendant les sessions précédentes, pas supposé). Aucune validation de complaisance. Chaque affirmation sur "ce qui existe" a été vérifiée dans `index.html` / `server.js` / `sop.json`. Chaque affirmation sur "ce qui manque" est posée comme un fait, pas une nuance.

---

## 1. Audit de la vision actuelle

### Forces réelles

- **Le moteur de décision (ASL waterfall P0-P9) est un vrai squelette décisionnel**, pas un gadget. Il a une hiérarchie de priorités cohérente, des règles dures (LOI 1 : jamais de jugement sans données ; 2 cuts consécutifs = diagnostic obligatoire ; winner jamais coupé), et il a été testé aujourd'hui sur 13 scénarios réels (J1/J2/J4 GO/CUT/OPTI, audit hebdo, premier lancement) sans aucune exception. C'est rare d'avoir une logique de décision aussi exercée avant même le premier euro dépensé.
- **La couche de connaissance créative (sop.json) est objectivement plus riche que ce que la plupart des marques DTC à 7 chiffres ont formalisé par écrit.** Hormozi, Schwartz, Hopkins, Ogilvy, Matteo, Kahel — ce n'est pas du remplissage, c'est une vraie bibliothèque de doctrine marketing, structurée et exploitable par un LLM.
- **Le Quality Control (Bloc 7) empêche déjà la auto-duplication de Claude** avant que ça ne coûte de l'argent réel — un garde-fou que beaucoup de systèmes "IA + ads" n'ont pas.
- **Le système distingue déjà — au moins dans sa structure — diagnostic, création, et exécution.** C'est la bonne décomposition mentale, même si chaque brique est incomplète.

### Faiblesses réelles (pas des nuances — des trous)

- **Prométhée ne lit aucune donnée en direct.** Zéro connexion à l'API Meta Marketing, zéro connexion à l'API Shopify Admin. Tout — spend, CA, CPC, CPM, ROAS, fréquence, ATC — est **tapé à la main** par toi chaque jour dans un formulaire. Le système "comprend l'historique des performances" uniquement dans la mesure où tu as bien voulu, bien su, et bien eu le temps de le retranscrire sans erreur.
- **Prométhée ne sait pas si une décision a été exécutée.** Le bouton "Exécuté ✓" est une déclaration de confiance, pas une vérification. Si tu dis avoir coupé une CBO mais que tu ne l'as pas fait, le système continue comme si c'était vrai.
- **Prométhée ne peut rien faire lui-même.** Il recommande. Toi seul agis dans Meta Ads Manager et dans Shopify. Ce n'est donc pas un système autonome aujourd'hui — c'est un **conseiller qui dépend à 100% de la discipline manuelle de l'utilisateur** pour exister.
- **La granularité des données est fausse par rapport à la vision.** L'exemple que tu donnes ("les hooks émotionnels performent mieux que les hooks démonstration depuis 5 jours") suppose une série temporelle de performance **par hook, par type de hook, par créative individuelle**. Ce que Prométhée stocke aujourd'hui, c'est une **métrique agrégée par jour, au niveau du compte entier** (`last_metrics`). Il n'existe aucune table reliant "telle créative a tel style de hook" à "telle créative a fait tel ROAS sur telle fenêtre temporelle". C'est le trou le plus profond de tout l'audit — j'y reviens en section 3.
- **La "veille concurrentielle" et les "signaux de marché" sont déclaratifs, pas observés.** `market_intel.competitors` est une liste que tu remplis à la main. Rien n'observe automatiquement un concurrent qui scale ou qui coupe.
- **L'apprentissage existant (`angle_scores`, `weekly_patterns`, `decisions_log`) est un journal, pas un système d'apprentissage.** C'est du comptage et de la moyenne, pas de la pondération adaptative ni du scoring statistique. Appeler ça "apprentissage" serait te mentir.

### Angles morts

- **On a passé plusieurs sessions à enrichir le cerveau créatif (copywriting, hooks, scaling) avant d'avoir réglé le problème d'ingestion de données.** C'est un ordre de priorité inversé par rapport à ce que la vision demande. Une stratégie créative brillante sans donnée de performance fiable en retour, c'est une boîte qui parle bien et qui n'apprend jamais.
- **La richesse du SOP donne une illusion de sophistication qui peut masquer l'absence de boucle de feedback.** Prométhée peut citer Eugene Schwartz avec précision. Il ne peut pas te dire si citer Eugene Schwartz a fait vendre une seule paire de chaussures de plus, parce qu'il n'a pas l'instrumentation pour relier "quel levier utilisé" à "quel résultat obtenu".
- **Le mono-produit, mono-marque, mono-utilisateur est une hypothèse implicite partout dans le code** (`active_product_id`, une seule mémoire locale, un seul compte). Si l'ambition est "système d'exploitation marketing", il faudra un jour repenser ce modèle de données — pas aujourd'hui, mais il faut le savoir.

### Risques

- **Risque de continuer à construire de la sophistication créative pendant que le vrai goulot d'étranglement (ingestion de données réelles) reste non résolu.** C'est le risque numéro 1 de cette conversation elle-même : il serait facile de répondre à ta demande en proposant encore plus de modules créatifs intelligents, alors que rien de tout cela ne vaut quoi que ce soit sans données vraies derrière.
- **Risque de sur-promettre l'autonomie.** Le scénario "mardi matin, Prométhée te dit quoi faire sans que tu n'aies rien demandé" implique soit (a) un déclenchement automatique récurrent (cron, notification) qui n'existe pas — l'app ne tourne que quand tu l'ouvres — soit (b) une infrastructure serveur permanente, ce que `server.js` en local sur ta machine n'est pas conçu pour être.
- **Risque financier et de compliance si on donne un jour à Prométhée un accès en écriture à Meta.** Couper une campagne, augmenter un budget, dupliquer une CBO — ce sont des actions irréversibles avec de l'argent réel. Un bug ou une hallucination du LLM à ce niveau coûte directement de l'argent, pas juste un mauvais brief créatif.

---

## 2. Vision finale idéale

Prométhée, dans sa forme la plus aboutie, n'est pas un générateur de créatives. C'est une **couche de raisonnement marketing posée sur trois flux de données vivants** :

1. **Flux de vérité produit/business** (Shopify) : commandes, CA, marge, stock, en temps réel.
2. **Flux de vérité média** (Meta, et plus tard TikTok/Google) : spend, impressions, CTR, hook rate, CPM, fréquence, ROAS — **par créative individuelle**, pas agrégé.
3. **Flux de vérité créative** (la creative bank elle-même) : quel angle, quel hook, quel format, quel niveau de conscience, quel levier psychologique, pour CHAQUE créative produite — déjà partiellement construit aujourd'hui dans le brief, mais jamais relié au flux n°2 après coup.

Le rôle de Prométhée est de **faire l'intersection continue de ces trois flux** et d'en sortir, sans qu'on le lui demande, un diagnostic priorisé : créatif, média, offre, ou landing page. C'est exactement l'exemple que tu donnes — et c'est un problème de **jointure de données dans le temps**, pas un problème de prompt plus intelligent.

L'autonomie n'est pas binaire (off/total). Le système idéal a des **paliers d'autonomie explicites et négociés avec toi** (voir section 4.4), où les décisions à faible risque (proposer une isolation de hook sur une winner confirmée) peuvent un jour s'exécuter seules, et où les décisions à fort risque (couper une CBO, dépenser plus) restent éternellement soumises à ta validation — pas parce que la technologie ne le permettrait pas, mais parce que **l'asymétrie de risque ne le justifie pas** pour un solo-opérateur.

---

## 3. Gap Analysis

| Capacité visée | État réel aujourd'hui | Écart |
|---|---|---|
| Comprend l'état actuel du business | Lecture manuelle d'un formulaire de métriques, une fois par jour, au niveau compte | Aucune API Shopify/Meta. Écart total. |
| Comprend l'historique des performances | `decisions_log` (max 100), `weekly_patterns` (max 12 semaines) — agrégés, pas par créative | Pas de série temporelle par créative/hook/angle. Écart majeur. |
| Comprend les créatives existantes | `creative_bank` avec angle/format/hook/statut/ROAS | Existe, mais ROAS est celui du CYCLE entier, pas de la créative individuellement isolée dans Meta. Écart partiel. |
| Comprend les angles déjà testés | `angle_scores`, règle de saturation par niveau de conscience | Existe et fonctionne en l'état (comptage simple). Écart faible. |
| Comprend les offres | `script_value_equation`, bundles en "veille" déclarés à la main | Aucune donnée de performance par variante d'offre. Écart majeur. |
| Comprend les signaux de fatigue | Règles P3 (CPM ×1.5, fréquence ≥2.5) — mais sur données saisies à la main | La RÈGLE existe, la DONNÉE qui l'alimente est manuelle et non fiable dans le temps. Écart de fiabilité, pas de logique. |
| Comprend les signaux de scaling | Paliers Zezinho (50→500€/j), ASL J1/J2/J4 | Existe et a été testé aujourd'hui sans bug. Écart faible — **c'est la brique la plus mûre du système**. |
| Comprend les signaux de saturation | Saturation de niveau de conscience par concurrent déclaré à la main | Aucune observation automatique de la concurrence. Écart majeur. |
| Comprend les signaux de marché | Rien d'automatisé — seulement des cadres théoriques (`competitive_intelligence_automation`) jamais câblés | Écart total — c'est une doctrine écrite, pas un système qui tourne. |
| Décide quoi/quand/pourquoi | Décide QUOI (une recommandation), jamais QUAND (pas de déclenchement automatique récurrent), POURQUOI existe (champ `why`) mais limité à un seul signal à la fois (waterfall = premier match gagne) | Écart structurel : le moteur actuel ne peut pas produire un diagnostic multi-signaux simultané comme dans ton exemple. |
| Exécute les décisions | Jamais — 100% manuel, hors de l'app | Écart total, et probablement le bon choix pour l'instant (voir risques). |

**Le constat central de cette section : la majorité des écarts ne sont pas des écarts de "moteur de décision" (cette brique est la plus avancée), mais des écarts d'INGESTION DE DONNÉES.** Construire un meilleur cerveau de décision sans résoudre l'ingestion, c'est améliorer un cockpit d'avion qui n'a pas encore de capteurs.

---

## 4. Architecture complète

### 4.1 Modules (existants vs à construire)

**Existants et solides :**
- Moteur de décision ASL (waterfall P0-P9)
- Creative Bank (stockage local, scoping par produit)
- Moteur de génération créative (angles → hooks → concept → brief, enrichi du cerveau SOP)
- Quality Control (anti-doublon, garde-fou avant dépense média)
- Mémoire produit (avatar, USP, garantie, profil de voix généré)

**À construire, par ordre de dépendance technique (pas d'importance perçue) :**

1. **Connecteur Meta Marketing API (lecture)** — récupère spend/impressions/CTR/CPM/ROAS/fréquence **par ad_id**, à intervalle régulier. C'est le module fondateur : rien d'autre dans la vision ne peut exister sans lui.
2. **Connecteur Shopify Admin API (lecture)** — commandes, CA, AOV, en temps réel, remplace la saisie manuelle de `ca_shopify`/`orders`.
3. **Table de correspondance ad_id ↔ creative_bank entry** — sans ça, les deux connecteurs ci-dessus ne savent pas à QUELLE créative attribuer quelle performance. C'est un travail d'ingénierie de données pur, peu glamour, absolument indispensable.
4. **Moteur d'agrégation par attribut créatif** — capable de répondre à "quel ROAS moyen pour les hooks de type Hidden Fear sur les 5 derniers jours" en interrogeant la table ci-dessus. C'est CE module qui rend possible l'exemple que tu as donné.
5. **Moteur de diagnostic multi-signaux** — remplace ou complète le waterfall : au lieu de "premier match gagne", calcule et présente PLUSIEURS signaux simultanés (créatif, média, offre, LP) avec un score de confiance chacun, puis priorise. C'est un changement architectural, pas une amélioration incrémentale du waterfall actuel.
6. **Module de détection de fatigue créative réelle** — basé sur la tendance du CTR/hook-rate par créative dans le temps (pas un seuil statique comme aujourd'hui), une fois le flux Meta branché.
7. **Connecteur Meta Marketing API (écriture) — optionnel et risqué** — pause/budget/duplication automatisés, avec limites dures codées (montant max, fréquence max, jamais sur un winner verrouillé).
8. **Couche CRO/Landing Page** — totalement absente aujourd'hui. Nécessiterait soit une intégration Shopify theme + heatmap/analytics, soit un renoncement explicite à ce que Prométhée puisse un jour dire "le problème est la landing page" avec preuve, et pas par déduction.

### 4.2 Flux de données (cible)

```
Shopify Admin API ──┐
                     ├──► Couche d'ingestion (polling régulier, normalisation)
Meta Marketing API ──┘                │
                                       ▼
                         Table de correspondance créative ↔ ad_id
                                       │
                                       ▼
                    Moteur d'agrégation par attribut (angle, hook_style, mood,
                    intensité, levier psychologique, format, awareness)
                                       │
                                       ▼
                       Moteur de diagnostic multi-signaux (créatif/média/offre/LP)
                                       │
                         ┌─────────────┼─────────────┐
                         ▼             ▼             ▼
                  Recommandation   Génération    Journal d'apprentissage
                   priorisée       créative        (ce qui a marché,
                  (why explicite)  (Bloc 5-7        pourquoi, sous quel
                                   existant)         signal)
```

Le point clé : **la génération créative (ce qu'on a construit ces dernières sessions) devient une SORTIE du système, pas son centre.** Le centre, c'est la jointure de données.

### 4.3 Moteurs de décision — ce qui doit changer structurellement

Le waterfall ASL actuel retourne **une seule mission à la fois**, la première règle qui matche. C'est adapté à "que dois-je faire maintenant", inadapté à "explique-moi la situation sur plusieurs dimensions à la fois" (ton exemple du mardi matin). Il faut donc, sans détruire le waterfall existant (qui fonctionne et qui reste utile pour la décision finale J1/J2/J4) :
- Garder le waterfall pour les décisions **binaires et séquentielles** (GO/CUT, audit, anomalie bloquante).
- Ajouter une couche de **rapport de situation** qui tourne EN PARALLÈLE, calcule plusieurs signaux indépendants (tendance ROAS, fatigue par angle, performance comparée par style de hook, statut de l'offre), et les présente ensemble avant que le waterfall ne rende son verdict. C'est ce rapport qui produit le ton de ton exemple — pas le waterfall lui-même.

### 4.4 Niveaux d'autonomie (proposition, à valider avec toi — voir section 6)

| Niveau | Ce que ça veut dire | Statut |
|---|---|---|
| L0 — Carnet | Tu fais tout, l'app note | Dépassé |
| **L1 — Conseiller (état actuel)** | L'app recommande, tu saisis toutes les données à la main, tu exécutes tout ailleurs | **Ici aujourd'hui** |
| L2 — Copilote | L'app lit les données seule (Meta/Shopify API), recommande, tu valides en un clic, l'app peut pré-remplir l'action (ex: texte de la campagne à dupliquer) | Cible réaliste court-moyen terme |
| L3 — Autonomie bornée | L'app exécute SEULE des classes d'actions à faible risque et plafonnées (ex: pause auto si CPA > seuil ET budget < 50€ engagés, jamais plus) | Cible réaliste moyen terme, sur un périmètre étroit et négocié |
| L4 — Autonomie totale | L'app pilote budget et création sans supervision | **Je déconseille d'en faire un objectif.** Le risque (argent réel, politique Meta, marque) dépasse le gain pour un solo-opérateur. Ce n'est pas une limite technique, c'est un choix de gestion du risque. |

---

## 5. Roadmap — séquence de construction réelle

Pas une liste de souhaits triée par importance perçue. Une séquence où chaque étape déverrouille techniquement la suivante.

**Étape 1 — Connecteur Meta Marketing API en lecture seule.**
Sans ça, rien de la vision n'est vrai. C'est le prérequis absolu. Techniquement : token d'accès long-lived, ad account ID, appel régulier à l'Insights API au niveau `ad_id` (pas compte, pas campagne — ad_id, sinon l'étape 3 est impossible).

**Étape 2 — Connecteur Shopify Admin API en lecture seule.**
Remplace la saisie manuelle de CA/commandes. Plus simple que Meta techniquement, et indépendant — peut se faire en parallèle de l'étape 1.

**Étape 3 — Table de correspondance creative_bank ↔ ad_id Meta.**
Le chaînon manquant. Sans elle, les étapes 1 et 2 ne servent qu'à automatiser la saisie de `last_metrics` (déjà un vrai gain, mais pas la vision).

**Étape 4 — Moteur d'agrégation par attribut créatif.**
C'est ici que "les hooks émotionnels performent mieux depuis 5 jours" devient une phrase vraie et vérifiable, pas une simulation.

**Étape 5 — Rapport de situation multi-signaux (parallèle au waterfall).**
C'est ici que l'expérience "mardi matin" devient réelle.

**Étape 6 — Détection de fatigue réelle (tendance, pas seuil statique).**
Dépend entièrement des étapes 1-4.

**Étape 7 — Autonomie L3 sur un périmètre étroit (ex: pause automatique plafonnée).**
Seulement après plusieurs semaines de données réelles validant que le diagnostic est fiable. Ne pas brûler cette étape.

**Ce qui NE doit PAS être priorisé maintenant**, même si ça semble logique sur le papier :
- Continuer à enrichir le SOP créatif (déjà très riche, rendement marginal décroissant tant que la boucle de feedback n'existe pas).
- Veille concurrentielle automatisée (Trendtrack/Higgsfield) — utile, mais en aval des étapes 1-4, pas avant.
- Module CRO/Landing Page — trop tôt, dépend d'une infrastructure de test A/B qui n'existe pas et qui n'est pas la priorité d'un solo-opérateur à ce stade.
- Multi-marque / multi-tenant — pas avant que le modèle mono-marque fonctionne réellement avec données vivantes.

---

## 6. Questions critiques — je ne suppose rien

Je ne peux pas trancher ces points sans toi. Ce ne sont pas des détails.

1. **Es-tu prêt à créer une app Meta for Developers et à passer par le processus de demande d'accès `ads_management`/`ads_read` ?** C'est un vrai process administratif (formulaire, justification d'usage, parfois plusieurs jours d'attente), pas juste une clé API à copier-coller.
2. **Quel niveau d'écriture es-tu prêt à autoriser sur ton compte Meta, un jour ?** Lecture seule pour toujours, ou tu acceptes qu'un système puisse un jour pauser/dupliquer pour toi ? Ça change toute l'architecture de la section 4.4.
3. **Quel est le budget quotidien réel sur lequel on doit calibrer ce système ?** Un OS marketing pour 20€/jour de test et un pour 500€/jour de scaling n'ont pas le même niveau d'urgence ni les mêmes seuils de risque acceptable.
4. **Le scope reste mono-marque, mono-produit actif, pour combien de temps ?** Tu as mentionné un objectif SaaS futur dans le passé — est-ce que je dois construire dès maintenant un modèle de données qui anticipe le multi-tenant, ou est-ce une question pour plus tard que je ne dois pas résoudre prématurément (ce qui complexifierait inutilement le code aujourd'hui) ?
5. **Acceptes-tu qu'aucune des briques de cette roadmap (étapes 1 à 6) ne produise de "magie visible" avant plusieurs semaines de collecte de données réelles ?** La vision que tu décris est juste, mais elle ne s'allume pas comme un interrupteur — elle se construit par accumulation de données fiables. Si l'attente est un résultat impressionnant rapidement, il faut le dire maintenant pour ne pas se mentir dans 3 semaines.
6. **Est-ce que je dois explicitement abandonner ou mettre en pause les sessions de type "Lot 6, Lot 7..." (absorption de nouvelle doctrine créative)** tant que les étapes 1-4 ne sont pas faites ? Mon avis honnête : oui — mais c'est ta décision, pas la mienne à imposer.

---

*Document de travail — à challenger, pas à valider par défaut. Aucune section ci-dessus ne doit être lue comme "prête à construire" sans ta validation explicite sur les questions de la section 6.*
