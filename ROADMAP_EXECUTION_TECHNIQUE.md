# Prométhée — Roadmap d'exécution technique vers opérationnalité

> Audité comme du code réel, pas comme un concept. Chaque affirmation "ça existe" ou "ça n'existe pas" a été vérifiée dans `index.html` (~5700 lignes), `server.js`, `sop.json` (v5). Aucune extrapolation sur TikTok, Direct Response ou multi-tenant — hors scope confirmé par le fondateur.

---

## PHASE 1 — Audit structurel complet

### 1. Workflow logique end-to-end (réel, pas celui du brief)

```
Onboarding produit (manuel, formulaire) → Decision Engine (waterfall ASL P0-P9)
  → CREATE_BATCH → callClaudeForBriefs (1 appel Claude, prompt enrichi)
  → Quality Control (rejet doublons hooks, warnings mots/diversité)
  → génération média (fal.ai images / Higgsfield vidéo) → Creative Bank (status DRAFT→TESTING)
  → [SORTIE DE L'APP — lancement réel dans Meta Ads Manager, 100% manuel]
  → saisie quotidienne (compte + par créative) → ASL J1/J2/J4 → confirmExecuted → cycle suivant
```

Le workflow du brief ("Onboarding → Data boutique → Analyse marché → Angles → Hooks → Scripts → Créatives → Variations → Output") **existe en double** dans le code : une version complète et granulaire (`runCreativeStrategyChain` + `executeFormatGeneration`, Bloc 5/6) qui n'est *jamais appelée en production*, et une version compacte à un seul appel (`callClaudeForBriefs`) qui est le *seul chemin réellement utilisé*. C'est un choix délibéré (coût : la version granulaire fait ~16 appels Claude par batch contre 1), mais ça veut dire que la "hiérarchie concept > hook > script > ad" du Bloc 3 de ton brief existe dans le code à un endroit qui ne tourne jamais.

### 2. Architecture des données

- Stockage : `localStorage` côté navigateur (clé `promethee_v1`), aucune base de données, aucun backend persistant au-delà d'un fichier `sop.json` sur disque servi par `server.js`.
- Mono-produit actif (`active_product_id`), mono-utilisateur, mono-compte. Confirmé comme un choix, pas une limite à corriger.
- Schéma `creative_bank` : depuis aujourd'hui, chaque créative porte `angle/format/hook/awareness/mood/intensite/levier_psychologique_principal/strategie_objection` + une série temporelle `daily[]` (spend/ctr/cpm/atc/achats/CA/ROAS par jour). **Avant aujourd'hui, ces attributs étaient calculés puis jetés avant sauvegarde** — bug réel, corrigé dans la session en cours.
- Aucune table de correspondance avec un ad_id Meta réel — la liaison performance↔créative est 100% manuelle (l'utilisateur recopie les chiffres de Meta Ads Manager dans une interface guidée par Prométhée).

### 3. Qualité des inputs onboarding

**Aucune validation de complétude.** Le formulaire produit (douleur, désir, objections, USP, garantie) accepte d'être vide. Le prompt de génération insère silencieusement `"Non renseigné"` à la place — confirmé ligne par ligne dans `callClaudeForBriefs`. Conséquence directe et vérifiable : un onboarding bâclé ne bloque rien, ne prévient de rien, et produit des créatives génériques sans avertissement. C'est un vrai trou de qualité produit, pas une supposition.

### 4. Capacité réelle de génération créative

- Briefs texte (angle/hook/script/ad copy) : fonctionnels, enrichis aujourd'hui d'une vraie doctrine de copywriting (Hopkins, Schwartz, Hormozi, Ogilvy, taxonomie de hooks Mood×Intensité).
- **Génération média réelle (fal.ai, Higgsfield) : jamais testée avec de vraies clés API à ce jour.** C'est noté explicitement dans la mémoire système du projet depuis le début ("Higgsfield : endpoint API natif à valider", "fal.ai à tester avec un vrai batch"). Concrètement : **Prométhée n'a jamais produit une seule image ou vidéo réelle.** Tout ce qui existe est le texte du brief.
- ElevenLabs (voiceover) : clé API non configurée. Logique de voix off mentionnée dans les briefs mais jamais exécutable.

### 5. Cohérence des étapes IA

Le pipeline angle→hook→concept→brief est cohérent *en théorie de prompt* (chaque étape reçoit le contexte de la précédente). Il n'a **jamais été validé sur une réponse Claude réelle** — toute la validation faite aujourd'hui (et il y en a eu beaucoup) a tourné en mode simulation (`{simulate:true}`), zéro coût, zéro appel réel. La cohérence du JSON produit par le *vrai* Claude reste une inconnue empirique.

### 6. Dépendances entre modules

- `executeCreateBatch` dépend de `callClaudeForBriefs` → dépend de `loadSOP()` → dépend de `server.js` actif sur `localhost:4200` → dépend d'une clé Anthropic valide dans `.env`.
- `confirmExecuted` dépend de variables UI globales (`currentMission`, `instrStates`) plutôt que de paramètres explicites — fragile si l'UI et la logique se désynchronisent un jour (pas un bug aujourd'hui, mais un risque de couplage fort).
- Le Quality Control dépend de l'historique des hooks (`getProductBank`) — si la creative bank est corrompue ou vide à tort, le QC ne peut rien rejeter.

### 7. Risques de blocage utilisateur

- **Risque n°1, confirmé et corrigé aujourd'hui** : un produit fraîchement configuré, zéro métrique, déclenchait "Rentre les métriques du jour" au lieu de "Générons ton premier batch" — blocage total au tout premier lancement. Corrigé.
- **Risque n°2, non corrigé, réel** : si `server.js` n'est pas lancé ou que la clé API est invalide, le message d'erreur est correct (`callClaudeJSON` lève une erreur explicite) mais rien dans l'UI ne vérifie *proactivement* que le serveur tourne avant de proposer une action qui va échouer.
- **Risque n°3** : `_batchRunning` est un verrou global en mémoire JS — si l'onglet est rechargé pendant une génération, le verrou disparaît mais l'état de la creative bank peut rester incohérent (DRAFT sans média).

### 8. Scalabilité du système

**Non applicable au périmètre confirmé (mono-marque, solo).** Le système n'est pas conçu pour plusieurs utilisateurs : pas d'auth, pas de base de données partagée, `localStorage` est strictement local au navigateur. Je ne vais pas inventer une analyse "100/1000/10k users" pour un produit qui n'a pas vocation à être multi-tenant aujourd'hui — ce serait exactement le genre de supposition non justifiée que tu m'as demandé d'éviter.

### 9. UX et friction produit

- Friction positive (volontaire) : la saisie quotidienne par créative ajoutée aujourd'hui demande plus de travail manuel qu'avant (une ligne par créative active au lieu d'un seul total). C'est un compromis explicite — accepté par le fondateur en échange de la donnée nécessaire au feedback loop.
- Friction négative non résolue : aucun indicateur visuel de "complétude" de l'onboarding produit avant de lancer une génération. L'utilisateur ne sait pas qu'il manque des informations avant que la créative générique sorte.

### 10. Performance marketing output (CTR, CVR, ROAS potential)

**Aucune mesure réelle n'existe.** Zéro créative produite par le système n'a jamais tourné dans Meta. Toute estimation de CTR/CVR/ROAS potentiel à ce stade serait une fiction — je m'y refuse explicitement, conformément à ta propre contrainte n°1.

### 11. Angles morts système (fondateur blind spots)

- **Le plus important : la richesse de la doctrine créative (sop.json) crée une illusion de maturité.** Le système peut citer Eugene Schwartz avec précision et n'a pourtant jamais produit une seule image réelle. Sophistication théorique ≠ système opérationnel.
- Deux moteurs de stratégie créative coexistent (Bloc5/6 riche mais mort, callClaudeForBriefs compact mais vivant) — dette technique qu'il faudra trancher un jour (fusionner ou supprimer le mort), pas urgent mais à ne pas oublier.
- Aucun mécanisme ne vérifie qu'une action "Exécuté ✓" a réellement été faite dans Meta — confiance déclarative pure.

---

## PHASE 2 — Détection des gaps critiques

**Cassé ou incomplet :**
- Génération média réelle (fal.ai/Higgsfield) jamais validée avec de vraies clés → **le gap le plus critique de tout l'audit.**
- ElevenLabs non configuré → voiceover inexécutable.
- Aucune validation de complétude onboarding → garbage-in silencieux.

**Redondant ou inutile (à date) :**
- La chaîne Bloc5/6 (16 appels/batch) — pas inutile dans l'absolu, mais inutilisée en production, donc redondante avec `callClaudeForBriefs` tant qu'elle n'est pas branchée ou supprimée.

**Empêche de générer de vraies ads gagnantes :**
- Pas un problème de logique créative (la doctrine est solide) — **le problème est qu'aucune créative n'a jamais été produite ni testée en conditions réelles.** Une "ad gagnante" est un fait empirique (Meta + Shopify), jamais un fait théorique. Le système n'a pas encore eu une seule occasion de gagner ou perdre.

**Données manquantes critiques par type :**
- **Angles marketing** : couverts (catégories, saturation par niveau de conscience calculée depuis la concurrence déclarée à la main). Pas de gap technique ici.
- **Hooks** : couverts en profondeur (4 stratégies, matrice Mood×Intensité, 3 musts). Pas de gap technique.
- **Scripts** : structure hook→lead→body existe. Gap réel : aucun script n'a jamais été converti en vidéo réelle pour vérifier que les instructions de mise en scène sont exploitables par Higgsfield.
- **UGC** : dépend à 100% de Higgsfield non validé — gap critique.
- **Statics** : dépend à 100% de fal.ai non validé — gap critique.
- **Native ads** : taxonomie riche (`native_ads` dans sop.json) mais même dépendance non validée à fal.ai pour le visuel.

---

## PHASE 3 — Roadmap d'exécution

### BLOCK 1 — FOUNDATION (CRITICAL FIXES)

*Déjà fait aujourd'hui (vérifié, testé, commité) :*
- Bug du moteur de décision qui bloquait tout premier lancement (DATA_NEEDED au lieu de CREATE_BATCH).
- 9 clés de doctrine créative calculées mais jamais lues par le code (mortes) — câblées dans le chemin réel.
- `SOP_FALLBACK`/`SOP_DEFAULT` désynchronisés (gelés en v2 pendant que `sop.json` était en v5) — resynchronisés.
- Attributs créatifs (mood/levier/intensité) calculés puis jetés avant sauvegarde — corrigé.
- Quality Control inexistant sur le chemin réel (aucun garde-fou anti-doublon avant dépense média) — construit et testé.

*Restant, dans l'ordre :*
1. **Valider fal.ai et Higgsfield avec un batch réel minimal (1-2 créatives).** Rien dans le reste de la roadmap n'a de sens sans cette validation — c'est le seul vrai "Block 1" qui reste, et il ne peut être fait qu'avec du crédit API réel.
2. **Configurer ou désactiver explicitement ElevenLabs** — soit on configure la clé, soit on retire la mention voiceover des briefs pour ne pas promettre une fonctionnalité qui n'existe pas.
3. **Ajouter un indicateur de complétude onboarding** avant de permettre une génération (warning, pas blocage — éviter de générer du générique en silence).
4. **Vérifier proactivement que `server.js` répond avant de lancer une mission** plutôt que de laisser l'utilisateur découvrir l'échec après coup.

➡️ Sans ce bloc : aucune créative réelle ne sort jamais de l'app — tout reste du texte.

### BLOCK 2 — DATA LAYER (INTELLIGENCE INPUT)

*Déjà fait aujourd'hui :*
- Structure `creative.daily[]` par créative + interface de saisie guidée par Prométhée.
- Moteur d'agrégation par attribut créatif (`aggregateCreativePerformance`) — testé, fonctionnel.
- SOP créatif déjà riche et câblé dans le prompt réel.

*Restant :*
1. Brancher `buildCreativeSignalReport` sur une mission/UI visible — actuellement le moteur existe mais n'est jamais affiché (volontaire, en attendant suffisamment de jours de vraies données).
2. Définir un seuil minimum de données avant de présenter un signal comme fiable (ex: pas avant 5-7 jours et 2+ créatives par valeur d'attribut) — sinon risque de présenter du bruit comme une vérité.
3. Structurer la "data marché/concurrence" au-delà de la saisie manuelle libre actuelle (`market_intel.competitors`) — au minimum, un format imposé pour rendre le calcul de saturation plus fiable.

➡️ Sans ce bloc : les créatives restent génériques même avec une bonne génération média — c'est fait, mais incomplet (signal pas encore exploité).

### BLOCK 3 — CREATIVE ENGINE (CORE AI SYSTEM)

*Déjà fait :* génération d'angles, hooks, concepts — fonctionnelle dans `callClaudeForBriefs`, enrichie de la doctrine complète.

*Restant :*
1. Trancher le sort de la chaîne Bloc5/6 (16 appels) — la garder en réserve documentée pour un futur où le coût n'est plus une contrainte, ou la supprimer pour ne pas maintenir du code mort.
2. Une fois Block 1 validé (média réel fonctionnel), vérifier que la segmentation static/UGC/native produit effectivement des briefs *exploitables* par fal.ai/Higgsfield (pas juste valides en JSON).

➡️ Sans ce bloc : pas de stratégie créative — déjà acquis, le risque restant est la validation bout-en-bout avec de vrais appels média.

### BLOCK 4 — SCRIPT & PRODUCTION SYSTEM

*Déjà fait :* structure hook→lead→body, adaptation de format (4:5 par défaut, 9:16 stories), routage statique/vidéo/native selon le type d'annonce.

*Restant :*
1. Vérifier sur un vrai appel Higgsfield que `higgsfield_brief` (cadrage/mouvement caméra/éclairage/durée) est effectivement interprétable par l'API — c'est une description textuelle aujourd'hui, jamais confrontée à une vraie API vidéo.
2. Adaptation par plateforme : **non applicable, Meta uniquement, confirmé.** Pas un gap, un scope.

➡️ Dépend entièrement de Block 1 (validation média réelle).

### BLOCK 5 — OUTPUT OPTIMIZATION SYSTEM

*Déjà fait :* Quality Control (dédoublonnage hooks, warnings mots/diversité), méthode 3i (priorité d'itération hook→angle→avatar→format→CTA), moteur d'agrégation par attribut (Block 2).

*Restant :*
1. **Aucun scoring créatif prédictif n'existe.** Rien ne donne aujourd'hui une estimation de CTR/thumbstop/watch-time *avant* publication — uniquement du post-hoc une fois de vraies données saisies. C'est honnête de le dire : un scoring prédictif fiable nécessiterait des dizaines de créatives réelles avec résultats pour calibrer quoi que ce soit. Le construire maintenant sans données serait inventer un chiffre qui rassure sans rien mesurer.
2. Logique de variation testing : existe (Andromeda fingerprint, 3i) mais jamais exercée sur un vrai cycle de test Meta.

➡️ Dépend de Block 1 + plusieurs semaines de vraies données (Block 2 alimenté en continu).

### BLOCK 6 — SCALABILITY & PRODUCTIZATION

**Non traité — hors scope confirmé.** Mono-marque, solo, pas de couche multi-utilisateur, pas d'objectif de productisation immédiat. Je ne produis pas de chiffres de charge/coût/latence pour 100/1000/10k utilisateurs : ce serait répondre à une question qui n'a pas été posée par le fondateur sur ce produit, dans cette version. Si l'ambition SaaS future redevient active, ce bloc doit être audité à ce moment-là, avec de vraies contraintes (hébergement, base de données partagée, auth, facturation) — aucune de ces décisions n'est prise aujourd'hui.

---

## PHASE 4 — Priorisation absolue

### Ordre exact d'exécution

```
BLOCK 1 (fal.ai/Higgsfield validés en réel) 
   └─► BLOCK 3 (créative engine confirmé exploitable bout-en-bout)
          └─► BLOCK 4 (scripts confirmés interprétables par Higgsfield)
   └─► BLOCK 2 (signal report branché, alimenté en continu dès le premier batch réel)
          └─► BLOCK 5 (optimisation, seulement après plusieurs semaines de vraies données)
BLOCK 6 — en attente d'une décision produit qui n'a pas encore été prise
```

### Ordre interne par bloc

- **Block 1** : (1) batch réel minimal fal.ai/Higgsfield → (2) décision ElevenLabs → (3) garde-fou complétude onboarding → (4) vérification proactive serveur.
- **Block 2** : (1) seuil de fiabilité minimum → (2) branchement UI du signal report → (3) structuration data concurrence.
- **Block 3** : (1) décision sur la chaîne Bloc5/6 → (2) vérification briefs exploitables en conditions réelles.
- **Block 4** : (1) test réel `higgsfield_brief` → reste dépend de Block 1.
- **Block 5** : tout dépend de semaines de données réelles accumulées — aucun ordre interne avant ça, le travail est dans la patience, pas le code.

### Dependency graph (résumé)

`Block 1 (validation média réelle)` bloque **tout le reste**. `Block 2` (déjà largement construit) ne devient *utile* qu'une fois Block 1 fait (sinon aucune créative réelle à mesurer). `Block 5` ne peut pas commencer avant plusieurs semaines de Block 2 alimenté. `Block 6` ne dépend de rien techniquement — il dépend d'une décision produit qui n'existe pas encore.

---

## PHASE 5 — Sortie finale

| Étape | Score /10 | Justification |
|---|---|---|
| **Score actuel** | **4,5/10** | Decision engine, doctrine créative et Quality Control solides et testés. Mais zéro créative réelle jamais produite — le système n'a jamais été confronté au monde réel. On ne peut pas noter plus haut un système qui n'a jamais "joué le match". |
| **Après Block 1** | **6,5/10** | Si fal.ai/Higgsfield sont validés en réel : le système devient capable de produire une vraie créative de bout en bout. Reste à valider la qualité réelle des sorties Claude (jamais testée hors simulation) et l'absence de mesure de performance réelle. |
| **Après Block 2** | **7/10** | Le signal report branché et alimenté ajoute la capacité de diagnostic — mais sa fiabilité dépend entièrement du volume de vraies données accumulées, pas du code lui-même. |
| **Score final estimé (tous blocks pertinents faits)** | **8/10**, pas plus | Un score de 10 supposerait soit un scoring prédictif fiable (impossible sans des mois de données réelles), soit une autonomie d'exécution (explicitement refusée par le fondateur pour des raisons de risque, pas de capacité). 8/10 est le plafond honnête pour un système qui *aide à décider et à exécuter plus vite*, pas qui remplace le jugement humain ni qui élimine le risque marché. |

### Probabilité de générer des "ads performantes"

Je refuse de répondre à cette question telle qu'elle est posée, et je vais dire pourquoi plutôt que d'inventer un pourcentage : **ta propre doctrine, déjà dans `sop.json`, dit que 8% des créatives testées sont des winners — quel que soit le système qui les produit.** C'est une loi de marché (`diagnostic_formula.loi_8_pourcent`), pas une limite logicielle. Un système parfait ne fait pas monter ce chiffre à 50% — il fait en sorte qu'on atteigne les 8% plus vite, avec moins de budget gaspillé sur des erreurs évitables (doublons, briefs incomplets, mauvais ciblage d'awareness).

La question honnête n'est donc pas "quelle probabilité qu'une ad performe" (réponse : ~8%, plafond fixé par le marché, pas par Prométhée) mais **"quelle probabilité que Prométhée élimine les causes évitables d'échec avant le test"**. Sur celle-là, après Block 1 fait, je peux donner un avis fondé : élevée — le Quality Control empêche déjà la auto-duplication, le moteur de décision empêche déjà la panique sur des données absentes, et la doctrine créative empêche déjà le brief vague. Mais ça reste un plancher relevé, pas un plafond cassé.

---

## Informations critiques manquantes — je ne devine pas

Conformément à ta consigne : je continue l'analyse (j'ai assez d'information vérifiable pour les Blocks 1-5), mais ces points précis restent ouverts et je ne les invente pas :

1. **Aucune clé fal.ai/Higgsfield n'a jamais été testée avec un vrai appel.** Je ne peux pas savoir si le format des prompts/briefs actuels est compatible avec leurs API réelles tant qu'un test réel n'est pas fait.
2. **Le contenu réel produit par Claude (hors simulation) n'a jamais été lu par un humain.** Je ne peux pas juger la qualité réelle des angles/hooks/scripts sans au moins un batch réel à relire.
3. **Aucune décision n'a été prise sur le sort de la chaîne Bloc5/6** (la garder en réserve vs la supprimer) — ni urgent ni bloquant, mais non tranché.
4. **Le seuil de fiabilité du signal report (Block 2) n'est pas défini** — combien de jours/créatives minimum avant de l'afficher sans risquer de présenter du bruit comme un signal.
