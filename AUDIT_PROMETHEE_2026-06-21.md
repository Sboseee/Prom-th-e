# AUDIT CRITIQUE — PROMÉTHÉE
**Date :** 21 juin 2026
**Méthode :** lecture intégrale du code (`index.html`, `server.js`, `CLAUDE.md`), traçage des chemins d'exécution réels (pas de supposition sur ce que le code "devrait" faire).
**Cadrage validé avec Ecomnameo avant audit :** outil solo (pas de scalabilité multi-tenant à juger), aucune donnée de campagne réelle encore générée, données avatar/marché existantes ailleurs (hors du produit), horizon = usage personnel réel demain.

---

## 1. BUGS LOGIQUES & ARCHITECTURE

### Problème 1 — Le bouton principal de génération ne génère pas de créative
**Description.** Il existe DEUX implémentations différentes et non synchronisées du même événement (mission `CREATE_BATCH`) :
- `runBrain()` (auto-déclenché au chargement, après saisie métriques, après confirmation de décision, toutes les 60 min) : appelle `callClaudeForBriefs()` PUIS boucle sur `sendToCreativeEngine()` → `generateImage()`/`generateVideo()` → `displayCreative()`. C'est le seul chemin complet.
- `runMissionSequence()` : déclenché quand l'utilisateur clique sur le bouton **"Go — Générer"** de la Mission Board (`orbGo() → if(missionKey==='CREATE_BATCH') runMissionSequence(s)`). Cette fonction appelle `callClaudeForBriefs()` (texte uniquement) puis affiche "Mission terminée — X briefs générés et prêts à produire" après une animation factice de 7,2 secondes. **Elle n'appelle jamais `generateImage()` ni `generateVideo()`.**

Le texte `why` de la mission promet explicitement : *"Je vais générer les briefs via Claude et envoyer à Higgsfield."* C'est faux pour ce chemin.
**Impact.** Le clic utilisateur sur l'action principale du produit ne produit ni image ni vidéo. L'utilisateur croit avoir des créatives prêtes (message de succès affiché), ouvre la Creative Bank, et ne trouve que des briefs texte sans aucun média. Rupture de confiance immédiate dès la première vraie utilisation.
**Gravité.** Critique.
**Recommandation.** Supprimer `runMissionSequence()` ou la faire appeler exactement la même chaîne que `runBrain()` (Claude → boucle `sendToCreativeEngine` → `displayCreative`). Une seule implémentation de CREATE_BATCH, jamais deux qui divergent.
**Priorité.** Faire immédiatement.

### Problème 2 — Persistance silencieusement cassée par quota localStorage (base64 images)
**Description.** `memSet()` est l'unique mécanisme de sauvegarde de tout l'état (campagne, décisions, métriques, creative bank) :
```js
function memSet(data){try{localStorage.setItem(MEM_KEY,JSON.stringify(data))}catch(e){}}
```
Le `catch(e){}` est vide. Or `displayCreative()` stocke les images générées en base64 directement dans `creative_bank` (`entry.image_base64=result.base64`), et `saveProduct()` fait pareil pour les photos produit uploadées. `creative_bank` n'a **aucune limite de taille** (contrairement à `decisions_log` plafonné à 100 et `weekly_patterns` à 12). localStorage a un quota strict (~5-10 Mo par origine selon navigateur). Quelques dizaines d'images suffisent à le saturer.
**Impact.** Le jour où le quota est dépassé, **toute future sauvegarde échoue silencieusement** — campagne, métriques saisies, décisions, tout. L'app continue d'afficher un état cohérent en mémoire (RAM), mais rien n'est persisté. Au rechargement de la page, perte de tout ce qui s'est passé depuis le dernier `memSet()` réussi, sans aucun message d'erreur. C'est exactement le genre de bug qui ne se voit pas pendant 3 semaines puis fait perdre un cycle de décision ASL entier sans que tu comprennes pourquoi.
**Gravité.** Critique.
**Recommandation.** (1) Ne jamais stocker les images en base64 dans le même blob localStorage que l'état critique — soit ne pas les stocker du tout (juste l'URL fal.ai/Higgsfield), soit les mettre dans IndexedDB. (2) Faire échouer `memSet` bruyamment (`pushToMiniChat('⚠️ Sauvegarde échouée — quota dépassé')`) au lieu d'avaler l'erreur. (3) Ajouter un export JSON manuel (bouton "Exporter ma mémoire") comme filet de sécurité.
**Priorité.** Faire immédiatement.

### Problème 3 — Clés API compromises dans l'historique Git
**Description.** Avant la correction de cette session, `FAL_KEY` et `HIGGS_SECRET` étaient codées en dur dans `index.html` et commitées en clair (commit `bf59f32`). Les avoir retirées du fichier actuel ne les retire pas de l'historique Git.
**Impact.** Toute personne avec accès au repo (collaborateur futur, fork accidentel, repo qui passe en public) peut récupérer ces clés et les utiliser à tes frais.
**Gravité.** Critique.
**Recommandation.** Régénérer les clés fal.ai et Higgsfield maintenant, mettre les nouvelles uniquement dans `.env`. Envisager de nettoyer l'historique Git (`git filter-repo`) si le repo doit un jour être public ou partagé.
**Priorité.** Faire immédiatement.

### Problème 4 — Scraping du site échoue silencieusement
**Description.** `scrapeSite()` retourne `null` en cas d'erreur (`catch(e){return null}`), sans jamais notifier l'utilisateur. Le prompt envoyé à Claude présente le "message match" site comme une **"RÈGLE ABSOLUE"** — mais si le scrape échoue (timeout allorigins.win, site SPA en React/Vue dont le HTML brut ne contient pas le contenu rendu en JS, ou simplement le service tiers gratuit qui est down), cette règle absolue disparaît silencieusement du prompt et personne ne le sait.
**Impact.** Génération de créatives qui ne matchent pas le langage réel du site, sans que tu aies un signal pour le détecter — exactement le problème que cette règle est censée éviter.
**Gravité.** Élevée.
**Recommandation.** Si `scrapeSite` échoue, le signaler explicitement dans le Signal Feed ("Scraping site échoué — créas générées sans message match garanti") plutôt que de continuer silencieusement.
**Priorité.** Faire bientôt.

---

## 2. ARCHITECTURE DU WORKFLOW

### Problème 5 — Aucune étape d'analyse marché ou concurrence
**Description.** Le pipeline va directement de "douleur (texte libre) + niveau de conscience (1-5)" à la génération d'angles/hooks. Il n'existe ni champ, ni étape, ni appel API pour intégrer une analyse de marché ou de concurrence (spy tools, swipe file, benchmark). Le seul champ "marché" dans tout le schéma mémoire est une chaîne de 2 lettres (`market: 'FR'`).
**Impact.** Le système génère des angles "à l'aveugle" par rapport à ce que font tes concurrents et à ce qui marche réellement dans ta verticale. Tu as dit avoir cette donnée ailleurs (notes perso) — mais elle n'est **structurellement pas connectée au produit**. C'est le produit qui a le trou, pas toi.
**Gravité.** Critique.
**Recommandation.** Ajouter au minimum un champ "Research" libre dans la fiche produit (concurrents identifiés, angles qu'ils utilisent, ce qui marche déjà chez eux) injecté dans le prompt `callClaudeForBriefs`. Pas besoin d'un scraper de concurrents pour commencer — juste un intake manuel de ce que tu sais déjà.
**Priorité.** Faire immédiatement (c'est un ajout de quelques lignes, pas un projet).

### Problème 6 — Pas de boucle de feedback réelle entre performance et génération
**Description.** Le prompt Claude utilise des "win rates ASL" statiques et génériques (Unboxing 10%, Offer First 9%, UGC Testimonial 7,6%...) hardcodés dans le texte du prompt, identiques pour tous les produits, toutes les niches. Le seul feedback réellement spécifique à ton compte est "hooks déjà testés à éviter" et la liste des winners actifs.
**Impact.** Le système ne apprend pas vraiment de TES données — il applique une heuristique générique ASL à chaque génération. Pour un produit où Unboxing n'a aucun sens (service, infoproduit, produit non-physique), le système biaise quand même vers ce format.
**Gravité.** Élevée.
**Recommandation.** Une fois que tu as 10-15 tests réels, remplacer les win rates statiques par tes propres taux de victoire par format/angle stockés dans `angle_scores`.
**Priorité.** Faire plus tard (nécessite d'abord des données réelles — cohérent avec ta logique "valider avant scaler").

---

## 3. QUALITÉ DES DONNÉES

### Problème 7 — Onboarding produit anémique
**Description.** Champs collectés dans la fiche produit : nom, prix, COGS, douleur (texte libre), headline, niveau de conscience (1-5), images, market (2 lettres). Le champ `objections: []` existe dans le schéma mémoire (`defaultMemory`, ligne ~2104) mais **n'a aucun input UI pour le remplir** — il reste vide à vie, dans tous les produits.
**Impact.** Aucune donnée structurée sur : objections d'achat, désirs profonds (au-delà de la douleur), preuve sociale, USP différenciante, positionnement prix vs concurrents, ICP démographique/psychographique. Le prompt créatif tourne avec une fraction de l'info nécessaire pour produire du Direct Response vraiment persuasif.
**Gravité.** Critique.
**Recommandation.** Ajouter à la fiche produit : champ objections (3-5 lignes), champ désirs/transformation recherchée, champ USP vs concurrents. Même en texte libre non-structuré, ça vaut mieux qu'un champ qui n'existe pas dans l'UI.
**Priorité.** Faire immédiatement.

### Problème 8 — Dépendance fragile au scraping pour le seul ancrage "marché réel"
Voir Problème 4. Le scraping est la SEULE source de données externes au produit (le reste est saisi par toi). C'est un point de défaillance unique fragile pour ce qui devrait être une fondation solide.
**Gravité.** Élevée. **Priorité.** Faire bientôt.

---

## 4. ONBOARDING

L'onboarding actuel (fiche produit + réglages compte) permet de comprendre : le prix/marge (bien, calcul ROAS BE/Target automatique correct), un fragment de la douleur, et le niveau de conscience Schwartz (bon réflexe d'avoir ce champ). Il ne permet pas de comprendre : la marque (positionnement, ton, valeurs), l'offre au sens Hormozi (garantie, bonus, structure de l'offre — il y a un champ "guarantee" mais seulement côté scraping, jamais saisi manuellement), l'avatar en profondeur (démographie, psychographie, vocabulaire exact utilisé), les objections, le marché concurrentiel.

**Gravité globale onboarding.** Critique. C'est la fondation de tout ce qui suit (génération créative, scoring, decision engine ne sont pas affectés car ils sont déterministes/numériques — mais la couche créative en dépend entièrement).

---

## 5. GÉNÉRATION CRÉATIVE

### Problème 9 — Sélection du modèle fal.ai par heuristique de mot-clé fragile
**Description.** `generateImage()` choisit Ideogram v3 vs Flux Pro selon : `brief.format==='Offer First'||brief.format==='Text-based'||brief.script_complet.indexOf('texte')>=0`. C'est un test de string fragile sur un champ généré librement par Claude — aucune garantie que Claude utilise toujours exactement ces libellés.
**Gravité.** Moyenne.
**Recommandation.** Demander à Claude de renvoyer un champ structuré dédié `needs_text_overlay: true/false` dans le JSON de sortie plutôt que d'inférer depuis le format.
**Priorité.** Faire bientôt.

### Problème 10 — Aucune validation humaine avant consommation de crédits API coûteux
**Description.** Dès qu'un brief est généré par Claude, `sendToCreativeEngine()` lance immédiatement la génération image/vidéo réelle (Higgsfield = 30-60s de compute facturé). Il n'y a aucune étape d'approbation entre "voici le brief" et "voici, ça coûte de l'argent, c'est généré".
**Impact.** Si un brief Claude est mauvais (hors-sujet, répète un angle saturé malgré la consigne, script incohérent), tu le découvres après avoir payé la génération, pas avant.
**Gravité.** Élevée.
**Recommandation.** Ajouter un état "brief en attente d'approbation" avant l'appel fal.ai/Higgsfield, au moins pendant la phase TESTING (3-6 créas) où le coût relatif d'une erreur est plus élevé.
**Priorité.** Faire bientôt.

### Problème 11 — Incohérence aspect ratio entre code et doc
**Description.** Le code (`generateImage`) ne gère que deux ratios : 4:5 (si format === "Statique" exactement) ou 1:1 (tout le reste, y compris "Offer First", "Unboxing", "Text-based"). `CLAUDE.md` documente "Format ads : 4:5 (feed) ou 9:16 (stories/reels)" — le 1:1 généré par défaut pour la majorité des formats n'est même pas dans les formats cibles documentés.
**Gravité.** Moyenne.
**Recommandation.** Mapper explicitement chaque valeur de `format` à un ratio, avec un défaut raisonné (4:5, pas 1:1, qui n'est quasi jamais le bon ratio pour du feed Meta/TikTok).
**Priorité.** Faire bientôt.

### Capacité par type de format (évaluation)
- **Static Ads** : structurellement possible (Ideogram v3 gère le texte dans l'image), mais sans validation humaine pré-génération (P10) et avec un ratio par défaut probablement faux (P11).
- **UGC Ads** : le prompt demande un script mot-à-mot avec mise en scène — bonne pratique. Mais sans data de crédibilité/preuve sociale structurée (P7), le script reste générique côté preuve.
- **Native Ads / pattern interruption** : aucune mention de "pattern interruption" ou de codes plateforme (TikTok natif vs Meta) dans le prompt Claude actuel — c'est un angle marketing demandé par l'audit qui n'existe nulle part dans le code.
- **Direct Response** : la structure PAS/AIDA n'est pas explicitement imposée au prompt Claude — le prompt demande un "ad_copy" et un "script_complet" sans framework de persuasion explicite. Risque de copy qui raconte plutôt que qui vend.

---

## 6. PERFORMANCE MARKETING

**Constat.** Zéro donnée réelle de campagne à ce jour (confirmé). Impossible de juger empiriquement la capacité de Prométhée à générer du CTR/Hold Rate/Watch Time/Thumb Stop/CVR/ROAS — seule une évaluation des inputs est possible.

### Problème 12 — Pas de pré-filtrage des hooks à faible coût avant production complète
**Description.** Chaque brief généré va directement en production complète (image finale ou vidéo complète de 10s). Aucun mécanisme de test rapide de plusieurs hooks (texte/thumbnail) avant d'investir dans la production complète.
**Impact.** Tu vas payer le coût plein de Higgsfield/fal.ai pour chaque variation, y compris celles dont le hook seul aurait suffi à prédire l'échec. Le thumb-stop rate dépend à 80% du hook — produire la créa complète avant de valider le hook est un ordre des opérations qui maximise le coût pour l'info obtenue.
**Gravité.** Élevée.
**Recommandation.** Une fois en phase SCALING avec volume, envisager un test de hooks (texte ou image statique légère) avant de lancer la production vidéo complète.
**Priorité.** Faire plus tard (pas critique en phase TESTING à 3-6 créas/batch).

---

## 7. CREATIVE STRATEGY

### Problème 13 — Risque de recyclage superficiel plutôt que de vrais nouveaux angles
**Description.** Sans analyse marché/concurrence (P5) et avec des win rates génériques statiques (P6), le système a structurellement les moyens de produire des **variations** (nouveau hook, nouveau format, sur le même angle) bien plus que de vrais **nouveaux angles** stratégiques. La consigne ASL "1 seule variable changée par créa" — bonne discipline de test — combinée à l'absence d'input stratégique externe, pousse mécaniquement vers la variation incrémentale.
**Impact.** Risque de plateau créatif : après les premiers angles couverts, le système tourne en rond sur les variantes plutôt que de proposer une vraie rupture (nouvelle croyance, nouveau mécanisme, nouveau insight marché).
**Gravité.** Élevée.
**Recommandation.** Lié directement au Problème 5 — injecter manuellement de nouveaux insights marché/concurrence périodiquement (toi, en tant qu'opérateur, restes la source de vraie nouveauté stratégique ; le système est bon pour exécuter/varier, pas encore pour découvrir).
**Priorité.** Faire bientôt.

---

## 8. SCALABILITÉ (cadrage : outil solo uniquement, pas de jugement multi-tenant)

Voir Problème 2 (quota localStorage) — c'est LE risque de scalabilité qui compte ici, même pour un usage solo : pas un problème de "trop d'utilisateurs", mais de "trop de données dans un stockage qui n'a jamais été conçu pour stocker des médias".

### Problème 14 — Pas de sauvegarde/export, dépendance totale au navigateur local
**Description.** Toute la mémoire (`promethee_v1`) vit dans le localStorage d'un seul navigateur sur une seule machine. Pas d'export, pas de sync, pas de backup automatique.
**Impact.** Un changement de navigateur, un nettoyage de cache, une réinstallation d'OS = perte totale et définitive de tout l'historique (decisions_log, creative_bank, angle_scores, weekly_patterns).
**Gravité.** Critique pour un outil censé t'accompagner sur des mois.
**Recommandation.** Bouton "Exporter ma mémoire en JSON" + idéalement une sauvegarde automatique périodique vers un fichier local (Cowork/serveur local peut écrire un fichier `backup_promethee_YYYYMMDD.json`).
**Priorité.** Faire immédiatement.

---

## 9. UX

Le principe "une seule mission principale à la fois, signaux secondaires contextuels" est respecté dans l'architecture (`currentMission` unique, `instrStates`) — bon point, c'est rare qu'un outil solo résiste à la tentation d'afficher 10 choses à la fois.

### Problème 15 — États de succès trompeurs
**Description.** Conséquence directe du Problème 1 : l'utilisateur voit "Mission terminée", "X créatives prêtes", une bulle verte de succès — alors qu'aucune créative n'a été produite. L'animation "thinking" (5 étapes, delays fixes 700ms→6200ms) n'est connectée à aucun état réel de l'appel API — c'est une mise en scène, pas un indicateur de progression.
**Impact.** Érosion de la confiance dans TOUS les signaux du système, pas seulement celui-ci — si un message de succès peut être faux, l'utilisateur doit se mettre à douter de tous les autres signaux (anomalies, GO/CUT...), ce qui détruit la proposition de valeur centrale ("zéro décision à l'intuition, fais confiance au système").
**Gravité.** Critique (c'est un problème de confiance, pas juste un bug d'affichage).
**Priorité.** Faire immédiatement (lié au fix du Problème 1).

---

## 10. CE QU'UN FONDATEUR NE VOIT PAS

**Angle mort n°1 — La fiabilité perçue du système dépend d'un seul mensonge UI.** Tu as conçu tout l'outil autour de la promesse "zéro décision à l'intuition, fais confiance aux signaux". Le jour où tu découvres (probablement après plusieurs clics frustrants) que "Go — Générer" ne génère rien, c'est plus que un bug : c'est la preuve empirique que le système peut afficher un succès qui n'en est pas un. Ça contamine la confiance que tu places dans le Decision Engine lui-même, alors que celui-ci, lui, est solide et déterministe.

**Angle mort n°2 — Le localStorage est une bombe à retardement invisible.** Tant que `creative_bank` reste petit (texte), tout va bien. Le jour où tu génères ta 30e ou 50e image et que le quota explose, tu ne le sauras pas — `memSet` avale l'erreur. Tu continueras à saisir des métriques, prendre des décisions GO/CUT, pendant que rien ne se sauvegarde. Le bug le plus dangereux d'un système de décision n'est pas celui qui plante bruyamment — c'est celui qui continue de fonctionner en apparence pendant qu'il a cessé de mémoriser.

**Angle mort n°3 — Tu confonds (légitimement, pour l'instant) "j'ai fait l'analyse marché/concurrence dans ma tête" et "le système l'a".** Les deux ne sont pas équivalents pour la qualité de génération. Le système ne sait que ce qui est dans le prompt. Tant qu'il n'y a pas de champ pour transférer ton intelligence stratégique vers le prompt, Prométhée génère avec une fraction de ce que tu sais réellement sur ton marché.

**Angle mort n°4 — Risque systémique : aucune des 3 intégrations créatives (Claude/fal.ai/Higgsfield) n'a jamais été testée avec de vraies clés en conditions réelles.** Les formats de réponse attendus dans le code (`data.images[0].url`, `data.generation_id||data.request_id`, `data.video_url||data.output_url||data.url`) sont des suppositions sur la forme exacte des réponses API — jamais vérifiées. Il est tout à fait possible qu'un des trois pipelines casse au premier vrai test pour une raison de format de réponse, indépendamment de toute la logique métier autour.

**Angle mort n°5 — "Plus de créatives" n'est pas l'objectif si la stratégie en amont est vide.** Le risque à 6 mois n'est pas la panne technique, c'est la production fluide et continue de créatives "propres mais vides" — bien formatées, bien écrites, jamais vraiment ancrées dans un insight marché différenciant. Un système qui scale la médiocrité produit plus de médiocrité, pas plus de ROAS.

---

## SCORES

| Axe | Score /10 |
|---|---|
| Architecture | 4 |
| Workflow | 3 |
| Data Quality | 2 |
| Creative Strategy | 3 |
| Performance Marketing | 2 |
| UX | 5 |
| Scalabilité (solo) | 4 |

**Probabilité que Prométhée génère réellement de bonnes ads aujourd'hui : ~15%.**
Pas parce que le Decision Engine ASL est mauvais (il est solide, déterministe, cohérent avec ta Bible) — mais parce que (a) le chemin manuel principal de génération créative ne produit aucun média (Problème 1), et (b) même le chemin qui fonctionne (`runBrain`) tourne avec un input stratégique très mince et n'a jamais été validé avec de vraies clés API en conditions réelles.

---

## CE QUI MANQUE ABSOLUMENT AVANT QUE TU L'UTILISES EN RÉEL

1. Corriger le bug `runMissionSequence` vs `runBrain` — le bouton "Go — Générer" doit déclencher la vraie chaîne de génération média (Problème 1).
2. Retirer/limiter le stockage base64 dans localStorage + ajouter un export JSON manuel (Problèmes 2 et 14).
3. Régénérer les clés fal.ai et Higgsfield exposées dans l'historique Git (Problème 3).
4. Faire un test end-to-end réel (un seul brief, une seule image, une seule vidéo) pour valider que les 3 intégrations renvoient bien le format de réponse attendu par le code — actuellement jamais vérifié (Angle mort n°4).
5. Ajouter au minimum un champ texte libre "Research marché/concurrence/objections" dans la fiche produit, injecté dans le prompt Claude (Problèmes 5 et 7).

---

## LES 5 RISQUES LES PLUS DANGEREUX

1. Le bouton principal de génération créative ne génère pas de créative — rupture de la promesse produit dès la première utilisation réelle.
2. `localStorage` peut cesser silencieusement de sauvegarder toute donnée (campagne, décisions, métriques) dès que les images base64 saturent le quota — sans aucun avertissement.
3. Clés API fal.ai/Higgsfield compromises dans l'historique Git, toujours valides tant qu'elles ne sont pas régénérées.
4. Aucune des 3 intégrations créatives n'a jamais tourné avec de vraies clés — risque de cassure au premier vrai test pour une raison de format de réponse, jamais détectée jusqu'ici.
5. Génération créative sans aucune analyse marché/concurrence structurée dans le produit — risque de variations superficielles plutôt que de vrais nouveaux angles différenciants.

---

## LE PROCHAIN GOULOT D'ÉTRANGLEMENT

Ce n'est pas la génération technique d'images/vidéos (le pipeline existe, même si jamais validé). **Le vrai goulot, c'est l'absence d'un intake structuré de ton intelligence stratégique (marché, concurrence, voix du client, objections) dans le produit.** Même une fois tous les bugs ci-dessus corrigés et le pipeline 100% fiable, Prométhée produira des créatives "techniquement propres mais stratégiquement vides" sans cet intake. Scaler la quantité de créatives générées sans résoudre ce goulot ne fait qu'accélérer la production de contenu médiocre — pas la performance. C'est le problème à résoudre avant de penser volume.
