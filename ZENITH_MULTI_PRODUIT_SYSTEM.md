# ZENITH.AI — Logique multi-produit : analyse système
> Document de design stratégique · Sans code · Compatible ASL v9 / Zezinho / Decision Engine actuel
> Rédigé le 2026-06-23

---

## PRÉAMBULE — Ce que le code fait réellement

Avant de raisonner, poser les faits architecturaux exacts :

- `mem.products[]` : tableau de tous les produits enregistrés
- `mem.active_product_id` : ID du produit actif **à un instant T — un seul**
- `mem.creative_bank[]` : toutes les créas, chacune porte un `product_id` — jamais mélangées
- `mem.angle_scores{productId:{...}}` : un bucket de scoring par produit, préservé au switch
- `mem.campaign` : **état global unique** — une seule phase ASL, un seul spend_cycle, un seul J1/J2/J4
- `setActiveProduct(id)` : bascule le produit actif, met tous les autres en STANDBY, et **reset le cycle**

**Constat structurel :** Zenith est architecturellement **mono-produit actif**. Il peut stocker plusieurs produits, mais il ne sait piloter qu'un seul à la fois dans son Decision Engine.

Ce n'est pas un bug. C'est un choix implicite jamais formalisé — et c'est la source de toutes les ambiguïtés.

---

## 1. LOGIQUE PRODUIT — Qui est prioritaire et pourquoi

### Ce que Zenith fait aujourd'hui

Il n'y a pas de système de priorité produit. Le produit actif est celui que l'utilisateur a sélectionné manuellement. Si tu as 3 produits, Zenith attend que tu choisisses.

### Ce que ça devrait être

La logique Zezinho est claire : **on ne teste jamais deux produits en parallèle pendant la phase testing.**

Le principe fondamental : **une CBO = un produit = un résultat lisible.**

Si tu dilues le budget entre deux produits sans winner, tu n'as pas assez de data sur aucun des deux pour prendre une décision ASL valide.

**La règle de priorité produit doit donc être :**

```
RÈGLE 1 — Un seul produit en testing actif à la fois (budget < 200€ spend)
RÈGLE 2 — Un produit SCALING peut coexister avec un produit en TESTING (budgets séparés)
RÈGLE 3 — La priorité va toujours au produit le plus avancé dans l'ASL
```

**Hiérarchie de priorité (du plus au moins prioritaire) :**

1. **SCALING avec winner_locked** → ce produit ne se coupe jamais, son budget ne diminue pas
2. **OPTI (C1/C2/C3 en cours)** → on finit les cartouches avant de switcher
3. **TESTING avec J2 GO (100€ spend)** → on va jusqu'à J4 avant de démarrer un autre produit
4. **TESTING J1 (50€ spend)** → on peut démarrer un deuxième produit si budget total le permet
5. **STANDBY** → n'a pas encore reçu de spend, pas encore de décision

**Quand ignorer un produit :**
- Status CUT → archivé, ne revient jamais en rotation automatique
- ROAS < roas_minus20 trois jours de suite → signal d'abandon (déjà couvert par ASL)
- Produit en STANDBY depuis > 30 jours sans budget alloué → signal de déprioritisation

### La question de la marge

La marge brute du produit entre dans le roas_be et roas_target — elle pilote déjà l'ASL indirectement. Un produit à 60% de marge tolère plus d'itérations (roas_target plus bas) qu'un produit à 20% de marge.

**Il n'est pas nécessaire de rajouter un système de scoring de marge séparé.** Le roas_be fait déjà ce travail.

---

## 2. LOGIQUE BATCH CRÉATIF — La règle absolue

### Ce que Zenith fait aujourd'hui

`callClaudeForBriefs` est toujours appelé pour `mem.active_product_id`. Un batch = le produit actif. Point.

`getProductBank(mem)` filtre systématiquement par `product_id`. Les créas ne se mélangent jamais entre produits dans la bank.

### Ce que ça doit rester

**1 batch = 1 produit. Toujours. Sans exception.**

Un batch cross-produit est une erreur marketing, pas une optimisation. Les raisons :

- **L'angle est produit-spécifique.** Un angle "soulagement rapide douleur dorsale" ne fonctionne pas pour un autre produit dans la même CBO.
- **La décision ASL dépend d'une cohérence signal-produit.** Si deux produits sont dans la même CBO, tu ne sais pas lequel a généré les ventes — J1/J2/J4 deviennent illisibles.
- **La CLR (TEST/VALIDATION/SCALE) est scopée au ROAS du produit actif.** Le routing de format (image → UGC → vidéo) ne peut pas fonctionner cross-produit.

### L'exception offre groupée

Un bundle (Produit A + Produit B vendus ensemble) n'est pas un batch cross-produit. C'est un **troisième produit** à part entière dans `mem.products[]`, avec son propre prix, sa propre marge, son propre roas_be, ses propres créas.

→ Règle : si tu fais un bundle, tu l'enregistres comme produit distinct.

---

## 3. LOGIQUE CRÉATIVE — Comment choisir le type de créa

### Le problème actuel

Zenith génère des briefs avec des champs `angle`, `hook`, `mood`, `format`, `awareness_level` — mais il ne formalise pas explicitement si la créa est **product-driven**, **problem-driven**, **offer-driven** ou **brand-driven**.

Ce choix est fait implicitement par Claude via le SOP et les angles. Mais il n'est pas décisionnel — ce n'est pas Zenith qui décide en amont, c'est Claude qui interprète.

### La hiérarchie des types de créas

```
ÉTAT DU COMPTE          → TYPE DE CRÉA PRIORITAIRE
────────────────────────────────────────────────────
Testing (< 100€)        → problem-driven + product-driven
                           Big swings. On cherche à savoir ce qui résonne.
                           On ne défend pas une offre qu'on ne sait pas encore vendre.

Opti (100-200€, ROAS    → offer-driven
  entre BE et target)     Le produit résonne mais ne convertit pas assez.
                           Le levier est l'offre : prix, bundle, garantie, upsell.
                           Changer l'offre dans la créa ET sur la fiche produit (Zezinho LOT 3).

Scaling (> 200€, ROAS   → product-driven + brand-driven
  ≥ target)               Le winner est connu. On itère sur le même angle fort
                           avec des variations de format (UGC → vidéo Higgsfield).
                           On commence à construire la marque autour du proof social.
```

**La règle de décision :**

Pour chaque batch, la directive créa (`→ Directive créa`) injectée dans `ctxCampaignState` (déjà présente dans le code) doit guider Claude vers le type de créa adapté à la phase. C'est déjà partiellement câblé — il faut s'assurer que cette directive inclut explicitement la nature du type de créa attendu.

### Cas limite — quand mixer les types

On peut (rarement) mixer dans un même batch si le batch est large (6+ créas) :
- 4 créas problem-driven pour explorer
- 2 créas offer-driven pour tester une nouvelle offre simultanément

Mais le signal doit rester lisible : si tu changes l'angle ET l'offre dans le même batch sans tracer ce qui a changé, tu ne peux pas attribuer le résultat.

---

## 4. LOGIQUE SITE / OFFRE / MARKETING — Trois couches distinctes

### Les trois couches que Zenith doit distinguer

```
COUCHE          COMPOSANTS                          LEVIER DE MODIFICATION
──────────────────────────────────────────────────────────────────────────
PRODUIT         Bénéfice direct, douleur résolue,   → Angle dans la créa
                mécanisme, preuve sociale            → Avatar dans le brief

OFFRE           Prix, bundle, garantie, livraison,  → Copywriting fiche produit
                upsell, discount                    → Script créa (CTA, accroche prix)
                                                    → Cartouche 2/3 OPTI

SITE/BRAND      UX, confiance, cohérence visuelle,  → A/B test hors Meta
                above-fold, hero section            → Big swing Cartouche 3
                                                    → Hors scope Zenith direct
```

### Quand Zenith optimise sur chaque couche

**Sur le produit (couche 1)** :
- Toujours, en testing. C'est le premier levier.
- La créa met en scène le bénéfice ou la douleur. Le produit est le héros.
- Si J1 = CUT sur 3 produits différents → c'est peut-être l'offre, pas le produit.

**Sur l'offre (couche 2)** :
- À partir de la cartouche 2 OPTI (Zezinho LOT 3).
- Si CPC < 0.70€ (la créa accroche) mais CVR < 2% (le site ne convertit pas) → c'est l'offre.
- Le levier : changer le prix visible, ajouter une garantie, créer un bundle.
- Le copywriting de la créa doit refléter le changement d'offre (CTA différent, accroche prix).

**Sur le site/brand (couche 3)** :
- Cartouche 3 uniquement (big swing). C'est le levier de dernier recours.
- Change la 1ère image carousel, le hero copywriting, la section above fold.
- Zenith l'indique dans les instructions Meta — mais ne pilote pas directement le site.
- Ce n'est pas un levier créatif Meta, c'est un levier CRO.

**La règle absolue :**
> Ne jamais toucher l'offre et les créas en même temps sans noter ce qu'on a changé. Un changement à la fois = un signal lisible. Deux changements simultanés = signal impossible à attribuer.

Exception : cartouche 3 est délibérément un big swing — tout change en même temps parce qu'il ne reste qu'une cartouche.

---

## 5. CAS MULTI-PRODUIT — La stratégie de portefeuille

### La règle de Zezinho (implicite, non formalisée dans le système)

Zezinho teste un produit jusqu'à la décision J4. Si J4 = GO → scaling. Si J4 = CUT → produit suivant. On ne teste jamais deux produits en parallèle avec le même budget.

**Ce n'est pas une limite du système — c'est la méthode.**

### Les trois configurations multi-produit

**Configuration 1 : 1 produit en SCALING + 1 produit en TESTING**

```
Produit A : SCALING · 200€/j · winner_locked=true → jamais touché
Produit B : TESTING · 50€/j · cycle J1/J2 en cours
Budget total : 250€/j
```

C'est la configuration cible à moyen terme. Le produit A finance le test du produit B. Zenith gère Produit B comme produit actif. Les métriques de A sont suivies séparément (submit metrics manuel pour A en STANDBY).

**Limitation actuelle du système :** `mem.campaign` est unique. Si tu actives Produit B, le cycle de Produit A est mis en pause. Il faut noter manuellement les métriques de A dans un document externe ou alterner le produit actif.

**Configuration 2 : Produits complémentaires (non concurrents)**

Exemple : ceinture lombaire (Produit A) + coussin ergonomique (Produit B).

Ces produits ne s'adressent pas exactement au même avatar même s'ils partagent la même douleur. Leurs créas ne se mélangent pas — chaque produit a ses angles, ses hooks, son ROAS cible.

La règle : même si complémentaires, **le testing reste séquentiel**. Tester A → winner → tester B. Ne pas mettre les deux dans la même CBO.

Exception : si tu veux tester un bundle A+B, c'est un troisième produit distinct.

**Configuration 3 : Produits concurrents dans le même store**

Exemple : deux variantes d'un même produit à des prix différents.

C'est la configuration la plus risquée. Deux produits qui s'adressent au même avatar créent une compétition interne dans Meta — Meta peut montrer les deux pubs au même utilisateur et diluer l'attention.

Règle : n'avoir qu'un seul "héros" dans cette niche à la fois. L'autre est en STANDBY.

### Comment éviter la dispersion budget

La dispersion budget vient de deux erreurs :

1. **Lancer deux CBOs en testing simultanément.** → Règle : une seule CBO testing active par compte, scopée au produit actif.
2. **Ne pas couper les créas sous-performantes dans la CBO.** → ASL le gère déjà (J1 CUT, J2 CUT, winner_locked).

### Comment éviter les conflits de messaging

Les conflits de messaging arrivent quand deux produits différents utilisent le même angle dans des publicités qui tournent simultanément vers le même audience.

**Mécanisme de garde existant :** `getProductBank(mem, productId)` garantit que `usedHooks` dans le QC est scopé au produit actif — tu ne peux pas dupliquer un hook d'un autre produit dans le batch actuel.

**Ce qui manque :** un check cross-produit au moment du lancement Meta. Aujourd'hui Zenith ne vérifie pas si Produit A et Produit B utilisent des hooks proches. C'est une limite à gérer manuellement.

---

## 6. PROBLÈMES CRITIQUES DU SYSTÈME ACTUEL

### Risque 1 — Un seul `mem.campaign` pour N produits ⚠️ CRITIQUE

**Problème :** `campaign.asl_phase`, `spend_cycle`, `j1_decided`, `j2_decided`, `j4_decided`, `roas_history` sont des champs globaux. Si tu as deux produits et que tu switches le produit actif, tu perds l'état du cycle du produit précédent.

`setActiveProduct()` appelle `resetCycle(mem)` — ce qui efface j1/j2/j4/spend_cycle pour repartir de zéro.

**Conséquence concrète :** si tu es à J2 GO sur Produit A et que tu actives Produit B pour regarder ses métriques, tu viens de resetter le cycle de Produit A. La prochaine fois que tu reviens sur A, Zenith croit que tu es au début.

**Niveau de risque :** Élevé. C'est une perte de données silencieuse.

### Risque 2 — Absence de "product priority system" ⚠️ MOYEN

**Problème :** Il n'y a aucune logique qui dit à Zenith quel produit doit passer en actif si l'utilisateur a 3 produits en STANDBY et ne sait pas lequel tester en premier.

**Conséquence :** l'utilisateur décide au doigt mouillé, sans signal objectif de Zenith.

### Risque 3 — Métriques du produit STANDBY non suivies ⚠️ MOYEN

**Problème :** Si Produit A est en SCALING en STANDBY (parce que tu as activé Produit B en testing), ses métriques ne peuvent pas être saisies dans Zenith — `submitMetrics` est scopé au produit actif.

**Conséquence :** le winner locked qui tourne à 200€/j est piloté en aveugle pendant que tu testes un autre produit.

### Risque 4 — Duplication de créas cross-produit non détectée ✅ GÉRÉ

Ce risque est géré par `getProductBank(mem, productId)` qui scope le QC (hooks déjà utilisés) au produit actif.

### Risque 5 — Dilution budget non détectée ⚠️ FAIBLE (pour l'instant)

**Problème :** Zenith ne connaît pas le budget Meta réel par produit. Il gère `spend_cycle` pour le produit actif, mais n'a aucune visibilité sur le spend des CBOs en STANDBY.

**Conséquence :** si Produit A en STANDBY tourne encore sur Meta alors que Produit B est en testing, le budget total peut exploser sans signal dans Zenith.

---

## 7. AMÉLIORATIONS NÉCESSAIRES (sans refonte)

### Amélioration 1 — Séparer `campaign` par produit (CRITIQUE)

`mem.campaign` doit devenir `mem.campaigns{productId:{...}}`.

Chaque produit a son propre objet campaign. `setActiveProduct()` ne resette plus le cycle — il charge simplement le campaign du nouveau produit actif.

Cette modification est chirurgicale : `resetCycle(mem)` dans `setActiveProduct()` devient `/* noop : chaque produit conserve son cycle */`.

**Compatibilité :** ASL/Decision Engine n'a pas à changer — il lit `mem.campaign` via la campagne du produit actif, comme aujourd'hui.

### Amélioration 2 — Signal priorité produit (MOYEN)

Ajouter un signal dans la vue Mémoire qui indique, pour chaque produit en STANDBY, une recommandation de priorité basée sur :
- Présence d'un `roas_be` calculé (produit configuré = prêt à tester)
- Phase ASL historique (un produit qui a déjà été en J2 GO a plus de signal qu'un produit vierge)
- Date d'ajout (le plus récent = priorité test si rien d'autre)

Ce n'est pas un système de scoring complexe. C'est un tri simple de 3 critères.

### Amélioration 3 — Submit métriques multi-produit (MOYEN)

Permettre de soumettre les métriques d'un produit STANDBY (un winner qui tourne) sans switcher le produit actif.

Solution simple : un sélecteur de produit dans la feuille métriques (`m-product-selector`) qui override `active_product_id` pour la saisie uniquement, sans déclencher `setActiveProduct()`.

### Amélioration 4 — Warning budget multi-CBO (FAIBLE)

Un champ optionnel "Budget Meta global (€/j)" dans les paramètres compte. Si `spend_cycle actif + spend estimé des CBOs STANDBY > budget global`, Zenith lève un signal de dilution.

---

## 8. CE QUI NE DOIT PAS CHANGER

- `getProductBank(mem, productId)` → scoping créas par produit, déjà correct
- `ensureAngleScoresBucket(mem, productId)` → scoring angles par produit, déjà correct
- `creative_bank[]` global avec `product_id` par entrée → architecture saine
- Decision Engine waterfall P0→P9 → ne jamais réordonner
- ASL prime toujours → aucun système de priorité produit ne peut contredire une décision ASL active
- `winner_locked = true` → jamais coupé, indépendamment de quel produit est actif

---

## 9. SYNTHÈSE — Ce que Zenith doit être en multi-produit

```
Zenith n'est pas un portfolio manager.
Il est un copilote de campagne — un produit actif à la fois, piloté à fond.

La stratégie multi-produit n'est pas dans Zenith.
Elle est dans la tête de l'opérateur :
  · quel produit teste-t-il cette semaine ?
  · quel winner continue à scaler en fond ?
  · quel produit est à couper ?

Zenith exécute la stratégie d'un produit à la fois.
Il archive l'historique de tous les autres.
Il ne mélange jamais.
```

**L'objectif réaliste à 6 mois :**

```
1 produit HERO en SCALING (winner_locked, 200-500€/j)
+ 1 produit en TESTING (50€/j, cycle ASL en cours)
= configuration stable, data propre, décisions lisibles
```

Pas de portfolio de 10 produits. Pas de CBO cross-produit. Un hero, un challenger. Toujours.

---

*Document rédigé à partir du code réel de index.html (9496 lignes) et de la méthode Zezinho ASL v9.*
*Ne pas modifier sans relire les sections HARD CONSTRAINTS du CLAUDE.md.*
