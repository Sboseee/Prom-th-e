# ZENITH.AI — VISION PRODUIT
> Ce fichier capture l'intention derrière le système, pas l'architecture.
> À lire AVANT de coder quoi que ce soit sur le creative engine ou les workflows.
> Dernière mise à jour : 2026-06-23

---

## CE QUE ZENITH.AI EST VRAIMENT

Zenith.ai n'est pas un générateur de créatives.
C'est un copilote qui a une mission : **faire vendre**.

Il reçoit un produit. Il comprend le marché. Il guide chaque décision jusqu'à la vente.
Il ne propose pas 30 stratégies. Il suit UNE ligne directrice, et il itère à l'infini dessus.

---

## CE QUE L'UTILISATEUR APPORTE

```
Produit :
  - prix, COGS, livraison, frais, retours
  - douleur, désir, objections du client
  - USP, garantie, headline

Visuels (pour nourrir le creative engine) :
  - photos produit (Shopify / studio)
  - visuels générés IA pour le site
  - photos concurrents
  - créatives concurrentes (ads qui tournent)
  - tout ce qui représente le produit visuellement

Budget Meta + objectif ROAS
```

C'est tout. L'utilisateur ne pense pas au reste. Le système décide.

---

## CE QUE ZENITH.AI PRODUIT

**Des créatives prêtes à tester sur Meta Ads.**

Pas des briefs PDF. Pas des suggestions. Des assets réels :
- Image statique (fal.ai : Ideogram v3 ou Flux Pro)
- Vidéo UGC (Higgsfield : 9:16, 10s, 720p)
- Voix off si nécessaire (ElevenLabs : eleven_multilingual_v2)

Chaque créative est tracée dans la Creative Bank avec :
- angle / hook / awareness level / mood / format
- performance quotidienne (spend, ROAS, CTR, ATC, achats)

---

## LE PRINCIPE DU WORKFLOW UNIQUE

**Une seule stratégie par type de créative. Pas plusieurs chemins.**

L'erreur à éviter : proposer 5 façons de faire une statique.
La bonne approche : UNE façon, profonde, qui permet des milliers de variations.

```
Pour les statiques :
  → 1 workflow : angle → hook → visuel (Offer First / Lifestyle) → format 4:5 ou 9:16
  → Les variables : angle (saturation, opportunité), mood, intensité, levier psychologique
  → Résultat : des milliers de créatives différentes depuis un seul pipeline

Pour les vidéos UGC :
  → 1 workflow : script (PAS ou AIDA) → voix off → brief Higgsfield → vidéo 9:16 10s
  → Les variables : hook style, énergie, acteur type, lieu, langue marketing
  → Résultat : idem

Pour les natives / memes :
  → 1 workflow : concept natif → texte court → image simple
```

La force du système = **profondeur sur un axe unique**, pas largeur sur tous les axes.

---

## LE RÔLE DES BULLES QUOTIDIENNES

Zenith.ai ne demande pas à l'utilisateur d'ouvrir l'app.
C'est l'app qui **pousse** au bon moment.

```
21h30 — "Tu n'as pas encore rentré tes métriques d'aujourd'hui."
23h30 — Si métriques saisies → runDecisionEngine → bulle de décision
Lundi matin — Audit hebdomadaire automatique

Décisions possibles :
  J1 (50€)  : GO ou CUT
  J2 (100€) : GO ou CUT
  J4 (200€) : SCALE / OPTI / CUT
  Anomalie  : alerte immédiate (CPM, fréquence, CVR, budget)
```

L'utilisateur ne cherche pas à savoir quoi faire. Le système lui dit.
La seule réponse attendue : confirmer ou infirmer la décision proposée.

---

## LA LIGNE DIRECTRICE ASL

Toutes les décisions creative et budget suivent l'ASL v9 (méthode Zezinho) :

```
TESTING  : 50€/j → J1 (50€ spend) → J2 (100€) → J4 (200€)
SCALING  : paliers 50→100→150→200→300→400→500€/j
OPTI     : 3 cartouches max avant CUT si ROAS entre BE et target
```

Les seuils ROAS sont calculés depuis la marge nette réelle du produit.
Ce n'est pas une règle générale. C'est une règle personnalisée par produit.

**Lire les fichiers source ASL :**
```
~/LOT 1/1 Étape 1 testing — Répliquer des ads.rtf   → J1/J2 en détail
~/LOT 1/1.3 Étape 2 scaling — Les itérations.rtf    → J4, scaling, winners
```

---

## LE CREATIVE ENGINE — PHILOSOPHIE

Le moteur créatif suit la SOP v5 (~/promethee/sop.json, 1487 lignes).

Points clés à respecter :

**1. Awareness-driven**
Chaque créative est calibrée sur le niveau de conscience du prospect (1 à 6).
Un prospect qui ne connaît pas le problème → messaging différent d'un prospect qui connaît la solution.

**2. Hook engineering**
Le hook est la décision la plus critique. Une créative = un hook unique.
Pas de doublons de hooks dans un même batch.

**3. Méthode 3I** (pour Quality Control)
Chaque brief doit passer : Insight / Intrigue / Impact.
Un brief sans tension dramatique = rejeté.

**4. Une seule émotion dominante par créative**
mood × intensité (SOP v5 : taxonomie complète)
Pas de créative "neutre". Chaque asset déclenche quelque chose.

**5. Le feedback loop**
Les attributs des créatives gagnantes (angle, hook type, mood, awareness)
doivent réinjecter dans le prochain batch automatiquement.
→ C'est le BLOC E — pas encore codé.

---

## QUALITÉ AUDIO / VIDÉO

```
Vidéo UGC  → Higgsfield en priorité (natif UGC, 9:16, 10s, 720p)
Voix off   → ElevenLabs si script narratif (eleven_multilingual_v2, français)
Ratio      → simplicité > qualité maximale. Un asset qui tourne > un asset parfait.
```

---

## CE QUE "LIBRE ARBITRE" VEUT DIRE ICI

Zenith.ai ne demande pas d'instructions pour chaque décision.
Il observe (métriques), il analyse (ASL), il décide (Engine), il propose (bulle).

L'utilisateur valide ou infirme. Jamais l'inverse.

Le système avance naturellement vers les ventes :
```
Pas de métriques → rappel 21h30
Métriques saisies → décision automatique 23h30
Batch vide → CREATE_BATCH déclenché
Winner identifié → jamais coupé, répliqué
Anomalie → alerte immédiate
```

---

## CE QUE CE SYSTÈME N'EST PAS

- Pas un outil qui attend qu'on lui demande quoi faire
- Pas un dashboard passif qu'on consulte
- Pas un générateur qui propose 10 options et laisse choisir
- Pas un système qui nécessite une expertise Meta Ads pour être utilisé

---

## RÉSUMÉ EN UNE PHRASE

Zenith.ai reçoit un produit, observe les données, génère des créatives suivant une seule
méthodologie profonde (SOP v5 × ASL v9), et guide chaque décision quotidiennement
jusqu'à ce que le produit vende de manière rentable et scalable.
