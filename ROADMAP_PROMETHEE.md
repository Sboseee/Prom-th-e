# ROADMAP PROMÉTHÉE — de 15% à opérationnel
**Base :** AUDIT_PROMETHEE_2026-06-21.md
**Logique :** chaque bloc dépend du précédent. On ne construit pas de stratégie créative sur un pipeline qui ment sur ce qu'il fait, et on ne raffine pas la stratégie créative avant d'avoir prouvé que les 4 intégrations marchent vraiment. Ordre strict, validation avant build avant scale.
**Note sur les %** : ce sont des estimations de ma part (pas une mesure), pour donner un ordre de grandeur de progression. Le seul vrai indicateur sera : ça génère des créatives correctes, sans mensonge d'interface, sans perte de données, avec un input stratégique réel.

---

## BLOC 1 — Stabiliser ce qui existe (fiabilité + sécurité)
**Objectif.** Que ce que l'app affiche soit toujours vrai. Zéro mensonge UI, zéro perte de données silencieuse, zéro clé compromise.

1. Unifier `CREATE_BATCH` : supprimer `runMissionSequence()` ou la faire appeler exactement la chaîne de `runBrain()` (Claude → génération média → affichage). Le bouton "Go — Générer" doit réellement produire une image ou une vidéo.
2. Stopper le stockage d'images base64 dans `localStorage`/`creative_bank` (qui n'a aucune limite de taille) — soit on ne garde que l'URL distante, soit on migre vers IndexedDB.
3. Faire échouer `memSet()` bruyamment (signal utilisateur) au lieu d'avaler l'erreur en silence.
4. Ajouter un bouton "Exporter ma mémoire (JSON)" comme filet de sécurité anti-perte.
5. Régénérer les clés fal.ai et Higgsfield (compromises dans l'historique Git).
6. Scraping site : si échec, le signaler dans le Signal Feed au lieu de continuer sans avertir.
7. Corriger le mapping aspect ratio (4:5/9:16 cohérent avec ta doc, pas de 1:1 par défaut).
8. Remplacer l'heuristique de mot-clé pour le choix du modèle fal.ai par un champ structuré renvoyé par Claude (`needs_text_overlay`).

**Critère de fin de bloc.** Tu cliques "Go — Générer", tu obtiens une vraie créative ou un vrai message d'erreur. Rien ne se perd silencieusement. Plus de clé exposée.
**Estimation d'impact.** ~15% → ~35-40% (le système dit la vérité, mais la stratégie créative reste pauvre).

---

## BLOC 2 — Prouver que les 4 intégrations marchent vraiment
**Objectif.** Ne plus rien supposer sur le format des réponses API — actuellement aucune des 4 (Claude, fal.ai, Higgsfield, ElevenLabs) n'a tourné avec de vraies clés en conditions réelles.

1. Test réel Claude via `/api/claude` (texte de briefs) — déjà partiellement validé, à refaire depuis ta machine.
2. Test réel fal.ai (1 image) — vérifier que `data.images[0].url` correspond vraiment à la réponse réelle d'Ideogram v3 / Flux Pro.
3. Test réel Higgsfield (1 vidéo) — vérifier `generation_id`/`request_id` et le format du polling (`status`, `video_url`/`output_url`).
4. Fournir ta clé ElevenLabs (actuellement placeholder) + tester une génération voix.
5. Corriger le code partout où la réponse réelle diffère de ce qui est supposé.

**Critère de fin de bloc.** Une image, une vidéo, une voix générées et visibles dans l'app, avec de vraies clés, sans erreur cachée.
**Estimation d'impact.** ~40% → ~50% (le système marche, prouvé — pas juste "censé marcher").

---

## BLOC 3 — Enrichir l'intake stratégique (le cerveau avant le bras)
**Objectif.** Donner au prompt Claude l'intelligence stratégique que tu as déjà (marché, concurrence, avatar profond) mais qui n'est pas connectée au produit aujourd'hui.

1. Ajouter à la fiche produit : objections (champ texte, le schéma existe déjà mais aucun input UI), désirs/transformation recherchée, USP vs concurrents.
2. Ajouter un champ "Research marché/concurrence" (texte libre que tu remplis toi-même au départ — pas besoin d'un scraper de concurrents pour commencer).
3. Sortir le "SOP créatif" (règles ASL P4, win rates par format, structure de prompt) du JS pour en faire une donnée éditable séparée du code — tu dois pouvoir ajuster ta méthodologie sans toucher à `index.html`.
4. Injecter tout ça dans `callClaudeForBriefs`.

**Critère de fin de bloc.** Le prompt envoyé à Claude contient explicitement : objections, désirs, USP, research marché — pas seulement douleur + niveau de conscience.
**Estimation d'impact.** ~50% → ~65-70%.

---

## BLOC 4 — Spécialiser les workflows par format (statique / UGC / vidéo voix)
**Objectif.** Répondre directement à ce que tu as décrit : générer 6 créatives ne doit pas être un seul prompt générique — chaque format a son propre pipeline (IA différente, structure de script différente, étapes différentes).

1. Découper le prompt monolithique actuel de `callClaudeForBriefs` en étapes séparées :
   - **Génération d'angles** (basée sur avatar + marché + concurrence + SOP)
   - **Génération de hooks** par angle retenu
   - **Génération de brief/script spécifique au format** :
     - Statique → composition visuelle + headline + overlay texte → fal.ai (Ideogram/Flux)
     - UGC/vidéo → script parlé mot-à-mot + brief de mise en scène → Higgsfield
     - Direct Response (copy) → structure imposée AIDA ou PAS, pas de "raconte sans vendre"
2. Brancher la génération voix ElevenLabs pour les scripts UGC qui en ont besoin (le script est généré aujourd'hui mais jamais envoyé à ElevenLabs — pipeline orphelin).
3. Vérifier que `sendToCreativeEngine()` route correctement chaque créative vers sa chaîne complète (texte → visuel/vidéo → voix si applicable).

**Critère de fin de bloc.** Demander 6 créatives produit 6 workflows réellement différents et corrects selon leur format — pas 6 variations du même prompt générique.
**Estimation d'impact.** ~70% → ~80-85%.

---

## BLOC 5 — Garde-fous coût et validation humaine
**Objectif.** Ne jamais payer pour une génération que tu n'as pas approuvée, surtout en phase TESTING où le coût relatif d'une erreur est plus élevé.

1. Étape d'approbation des briefs texte avant déclenchement de la génération image/vidéo payante (au moins en phase TESTING — 3-6 créas).
2. Pré-test de hooks à faible coût avant production complète, une fois en phase SCALING avec volume.

**Critère de fin de bloc.** Aucune génération fal.ai/Higgsfield ne se lance sans que tu aies validé le brief, sauf si tu choisis explicitement le mode automatique.
**Estimation d'impact.** ~85% → ~88%.

---

## BLOC 6 — UX / confiance
**Objectif.** Ce que l'interface affiche correspond toujours à ce qui s'est réellement passé (plus jamais de Problème 1/15 — succès affiché qui n'a pas eu lieu).

1. Remplacer l'animation "thinking" factice (timer fixe 7,2s) par un indicateur connecté à l'état réel de la requête.
2. Afficher les erreurs réelles au lieu de les avaler (`catch(e){}` silencieux partout dans le code).

**Critère de fin de bloc.** Plus aucun état affiché ne peut être faux.
**Estimation d'impact.** ~88% → ~90%.

---

## BLOC 7 — Boucle de feedback réelle (après usage réel, pas avant)
**Objectif.** Remplacer les win-rates ASL statiques et génériques par tes propres taux de victoire réels par angle/format.

1. Une fois 10-15 tests réels accumulés dans `angle_scores`/`creative_bank`, recalculer dynamiquement les win-rates au lieu d'utiliser les chiffres ASL génériques hardcodés dans le prompt.

**Critère de fin de bloc.** Le système apprend de TES données, pas seulement d'une moyenne générique ASL.
**Estimation d'impact.** ~90% → ~93-95% (le dernier % ne se gagne qu'avec du temps et des vraies données — aucun bloc de code ne peut l'accélérer).

---

## Ordre d'exécution recommandé
Bloc 1 → Bloc 2 → Bloc 3 → Bloc 4 → Bloc 5 → Bloc 6 → Bloc 7.
Chaque bloc se termine par un test réel sur ta machine avant de passer au suivant — pas de bloc validé sur ma seule affirmation que "le code est correct".
