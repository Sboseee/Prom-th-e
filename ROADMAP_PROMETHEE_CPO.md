# PROMÉTHÉE — ROADMAP D'EXÉCUTION (15% → 95%)
**Rôle adopté :** CPO chargé de transformer Prométhée d'un système fiable à ~15% de probabilité de produire des ads réellement performantes vers un système visant 90-95%+.
**Méthode :** chaque bloc est une fondation pour le suivant. Aucune amélioration ne repose sur une fondation qui n'existe pas encore. Ce document remplace `ROADMAP_PROMETHEE.md` (version simplifiée précédente) par une version exhaustive et réordonnée selon les dépendances réelles.

---

## BLOC 1 — FONDATIONS CRITIQUES

**Objectif.** Que le système ne mente jamais sur ce qu'il fait, ne perde jamais de données silencieusement, et n'expose aucune clé compromise. Rien dans les blocs suivants n'a de sens si la fondation elle-même n'est pas fiable.

**Pourquoi ce bloc passe avant tout.** Tous les blocs suivants ajoutent de l'intelligence (marché, stratégie, qualité) au-dessus du pipeline existant. Si le pipeline lui-même peut afficher un succès qui n'a pas eu lieu, ou perdre des données sans le signaler, alors toute l'intelligence ajoutée par-dessus est invérifiable — tu ne peux pas savoir si ce qui s'est passé reflète ce que les blocs suivants ont produit.

### Modification 1.1 — Unifier `CREATE_BATCH` (un seul chemin d'exécution)
Pourquoi obligatoire : le bouton "Go — Générer" (`runMissionSequence`) et le moteur automatique (`runBrain`) exécutent aujourd'hui deux logiques différentes pour le même événement — l'une génère vraiment des médias, l'autre non, tout en affichant le même message de succès.
Ce qui casse si on ne la fait pas : tu ne peux jamais savoir si une génération a réellement produit un média sans aller vérifier manuellement dans la Creative Bank — aucun bloc suivant ne peut s'appuyer sur "une génération réussie" comme signal fiable.
Temps estimé : 1-2h.
Difficulté : Faible.
Dépendances : aucune.
Critère de validation : cliquer "Go — Générer" produit systématiquement soit un média réel, soit un message d'erreur explicite — jamais un faux succès.

### Modification 1.2 — Sortir les images base64 du blob localStorage critique
Pourquoi obligatoire : `creative_bank` stocke les images générées en base64 dans le même objet JSON que `campaign`, `decisions_log`, `last_metrics` — sans aucune limite de taille, alors que `localStorage` a un quota strict (~5-10 Mo).
Ce qui casse si on ne la fait pas : au-delà du quota, `memSet()` échoue silencieusement (`catch(e){}`) — campagne, métriques, décisions cessent d'être sauvegardées sans aucun signal. Tout le reste de la roadmap (data, stratégie, feedback loop) dépend d'un historique qui doit être garanti de ne jamais se vider en silence.
Temps estimé : 3-4h (migration vers IndexedDB ou suppression du stockage base64 au profit de l'URL distante uniquement).
Difficulté : Moyenne.
Dépendances : aucune.
Critère de validation : générer 50 créatives consécutives sans qu'aucune écriture `memSet` échoue, vérifié par un compteur d'erreurs explicite à 0.

### Modification 1.3 — `memSet()` doit échouer bruyamment
Pourquoi obligatoire : un système de décision qui prétend "zéro décision sans donnée" (LOI 1 de ton ASL) ne peut pas tolérer une persistance qui échoue sans le dire.
Ce qui casse si on ne la fait pas : même après 1.2, toute future cause d'échec d'écriture (quota, corruption, navigateur) reste invisible.
Temps estimé : 30 min.
Difficulté : Faible.
Dépendances : 1.2 (pour réduire la fréquence des échecs avant de les rendre visibles).
Critère de validation : un échec d'écriture simulé déclenche un signal visible dans le Signal Feed.

### Modification 1.4 — Export JSON manuel (filet de sécurité)
Pourquoi obligatoire : aucune sauvegarde n'existe en dehors du navigateur local — un changement de machine ou un cache vidé efface tout l'historique.
Ce qui casse si on ne la fait pas : toute la donnée accumulée dans les blocs suivants (data foundation, feedback loop) peut disparaître d'un coup, sans recours.
Temps estimé : 1h.
Difficulté : Faible.
Dépendances : aucune.
Critère de validation : un bouton "Exporter ma mémoire" télécharge un JSON complet et réimportable.

### Modification 1.5 — Régénérer les clés fal.ai et Higgsfield compromises
Pourquoi obligatoire : ces clés ont été commitées en clair dans l'historique Git avant la correction de la session précédente — elles restent valides et exploitables par quiconque a accès au repo.
Ce qui casse si on ne la fait pas : risque financier direct (usage frauduleux des APIs à tes frais), indépendant de tout le reste de la roadmap.
Temps estimé : 15 min.
Difficulté : Faible.
Dépendances : aucune.
Critère de validation : anciennes clés révoquées sur fal.ai/Higgsfield, nouvelles clés actives uniquement dans `.env`.

**Type d'impact dominant : Fiabilité.**
**Score d'impact : 90/100** — sans ce bloc, aucun autre score n'est mesurable de façon fiable.

---

## BLOC 2 — STABILITÉ SYSTÈME

**Objectif.** Prouver, avec de vraies clés et de vrais appels, que les 4 intégrations (Claude, fal.ai, Higgsfield, ElevenLabs) fonctionnent comme le code le suppose — et que toute erreur réelle est visible, jamais avalée.

**Pourquoi ce bloc passe en second.** Le Bloc 1 garantit que le système ne ment pas sur ce qu'il fait. Le Bloc 2 garantit que ce qu'il fait correspond à ce que le code suppose qu'il fait. Construire de la stratégie créative (Blocs 4-6) sur des intégrations jamais validées en conditions réelles, c'est construire sur du sable — le format exact des réponses API (`data.images[0].url`, `generation_id`, `video_url`...) n'a jamais été vérifié empiriquement.

### Modification 2.1 — Test réel des 4 intégrations
Pourquoi obligatoire : aucune des 4 intégrations créatives n'a tourné avec de vraies clés en conditions réelles à ce jour.
Ce qui casse si on ne la fait pas : tu découvres une incompatibilité de format de réponse au pire moment — en pleine phase TESTING avec budget réel engagé.
Temps estimé : 2-3h (1 appel par intégration + ajustement du code si le format diffère).
Difficulté : Moyenne.
Dépendances : Bloc 1 complet (sinon un échec d'intégration se confond avec un échec de persistance).
Critère de validation : une image, une vidéo, une voix générées et visibles dans l'app avec les vraies clés, sans erreur masquée.

### Modification 2.2 — Remplacer tous les `catch(e){}` silencieux
Pourquoi obligatoire : le code avale les erreurs à de multiples endroits (`scrapeSite`, `memSet`, `generateImage`, `generateVideo`) — chacun masque un échec potentiel qui devrait être visible.
Ce qui casse si on ne la fait pas : un échec partiel (ex. scraping qui échoue silencieusement) continue à produire un résultat "normal" en apparence mais incomplet, sans que tu puisses jamais le détecter dans l'usage courant.
Temps estimé : 2h.
Difficulté : Faible.
Dépendances : 1.3 (pattern de signal déjà établi).
Critère de validation : chaque point d'échec possible du pipeline créatif produit un signal visible et différencié dans le Signal Feed.

### Modification 2.3 — Indicateur de progression réel (suppression du timer factice)
Pourquoi obligatoire : l'animation "thinking" de `runMissionSequence` est un timer fixe de 7,2s déconnecté de l'état réel de l'appel Claude — l'interface peut afficher "terminé" avant que l'appel ait réellement répondu, ou après.
Ce qui casse si on ne la fait pas : aucun indicateur de l'app n'est fiable à 100% tant qu'un seul peut être découplé de la réalité — ça contamine la confiance dans tous les autres signaux (anomalies, GO/CUT).
Temps estimé : 1-2h.
Difficulté : Faible.
Dépendances : 1.1 (un seul chemin d'exécution à instrumenter, pas deux).
Critère de validation : l'état affiché (en cours / terminé / erreur) correspond toujours exactement à l'état réel de la promesse JS sous-jacente.

### Modification 2.4 — Timeout et retry cohérents sur tous les appels réseau
Pourquoi obligatoire : aucun `fetch()` du pipeline créatif n'a de timeout explicite — un appel qui ne répond jamais bloque indéfiniment l'UI (`orb.classList.add('thinking')` sans fin).
Ce qui casse si on ne la fait pas : une seule requête qui traîne (fal.ai surchargé, Higgsfield lent) gèle la mission en cours sans recours autre que recharger la page et perdre l'état.
Temps estimé : 2h.
Difficulté : Moyenne.
Dépendances : 2.2.
Critère de validation : tout appel API a un timeout (ex. 30-60s) après lequel un échec explicite est déclenché.

**Type d'impact dominant : Fiabilité.**
**Score d'impact : 75/100** — condition nécessaire pour que tout ce qui suit soit mesurable.

---

## BLOC 3 — DATA FOUNDATION

**Objectif.** Construire le modèle de données qui pourra porter l'intelligence stratégique (Blocs 4-5) — aujourd'hui, le schéma produit ne capture qu'une fraction de ce qui est nécessaire pour générer du Direct Response persuasif, et `creative_bank`/`angle_scores` ne distinguent même pas les produits entre eux.

**Pourquoi ce bloc passe en troisième.** On ne peut pas construire une "Intelligence Marché" (Bloc 4) ou un "Creative Strategy Engine" (Bloc 5) sur des champs qui n'existent pas. Le schéma doit exister avant que le contenu puisse y être injecté.

### Modification 3.1 — Champs structurés manquants sur la fiche produit
Pourquoi obligatoire : aujourd'hui seuls `pain` (texte libre) et `awareness_level` (1-5) décrivent l'avatar. Le champ `objections` existe dans le schéma mémoire mais n'a aucun input UI — il reste vide à vie. Aucun champ pour désirs/transformation, USP vs concurrents, structure d'offre (garantie, bonus).
Ce qui casse si on ne la fait pas : le Creative Strategy Engine (Bloc 5) générera du Direct Response sans objections à lever, sans désir à activer, sans USP à différencier — la persuasion plafonne structurellement.
Temps estimé : 3-4h.
Difficulté : Faible.
Dépendances : Bloc 1-2 complets (le formulaire doit persister de façon fiable).
Critère de validation : la fiche produit capture objections, désirs, USP, structure d'offre (Value Equation Hormozi : valeur perçue, probabilité de succès, délai, effort) — tous injectés dans le prompt.

### Modification 3.2 — Scoper `creative_bank` et `angle_scores` par `product_id`
Pourquoi obligatoire : ce sont aujourd'hui des structures globales au compte, pas par produit. Si tu gères plusieurs produits dans ton catalogue (le CLAUDE.md prévoit "catalogue N produits"), un angle grisé sur le Produit A grisera le même nom d'angle pour le Produit B, et les hooks "déjà testés à éviter" d'un produit pollueront la génération d'un autre produit totalement différent.
Ce qui casse si on ne la fait pas : dès que tu actives un deuxième produit, le scoring d'angles devient incohérent — c'est un bug latent qui n'est pas encore visible parce que tu n'as géré qu'un seul produit jusqu'ici, mais qui exploserait silencieusement au second.
Temps estimé : 3h.
Difficulté : Moyenne (migration de structure + mise à jour de tous les points de lecture/écriture).
Dépendances : 1.2 (éviter de migrer une structure de données pendant qu'on change aussi son stockage physique).
Critère de validation : deux produits actifs simultanément n'interfèrent jamais sur leurs scores d'angle ou leur historique créatif respectif.

### Modification 3.3 — Sortir le "SOP créatif" du code JS vers une donnée éditable
Pourquoi obligatoire : les règles ASL P4, les win-rates par format, la structure du prompt sont aujourd'hui hardcodés dans `index.html`. Tu dois pouvoir ajuster ta méthodologie sans toucher au JavaScript.
Ce qui casse si on ne la fait pas : chaque ajustement stratégique (Bloc 5, Bloc 8) nécessite une modification de code — lent, risqué, et mélange donnée stratégique et logique applicative.
Temps estimé : 4-5h.
Difficulté : Moyenne.
Dépendances : aucune technique, mais logiquement précède le Bloc 5 (qui va manipuler cette donnée).
Critère de validation : modifier un win-rate ou une règle de prompt ne nécessite plus d'éditer `index.html`.

### Modification 3.4 — Schéma de lignée créative (angle → hook → concept → script → créative finale)
Pourquoi obligatoire : aujourd'hui `creative_bank` stocke une entrée plate par créative, sans tracer quel angle a produit quel hook, quel hook a produit quel concept. Impossible de comprendre pourquoi une créative a marché ou échoué au niveau stratégique (angle) vs exécution (script/visuel).
Ce qui casse si on ne la fait pas : le Feedback Loop (Bloc 8) ne pourra jamais distinguer "l'angle était mauvais" de "l'exécution était mauvaise" — il optimisera au hasard.
Temps estimé : 3h.
Difficulté : Moyenne.
Dépendances : 3.1, 3.2.
Critère de validation : chaque créative finale est traçable jusqu'à l'angle stratégique qui l'a générée.

**Type d'impact dominant : Qualité stratégique** (fondation pour celle-ci, pas encore l'intelligence elle-même).
**Score d'impact : 55/100** — pas de gain direct visible sur une créative, mais bloquant pour tout ce qui suit.

---

## BLOC 4 — INTELLIGENCE MARCHÉ

**Objectif.** Connecter au produit l'intelligence marché/concurrence qui existe aujourd'hui uniquement dans ta tête ou tes notes externes, et qui n'est reliée à rien dans le système.

**Pourquoi ce bloc passe en quatrième.** Le Bloc 3 a créé les champs où cette intelligence peut vivre. Sans ce bloc, ces champs resteraient vides ou anecdotiques. Sans le Bloc 3 avant, il n'y aurait nulle part où mettre cette intelligence.

### Modification 4.1 — Intake structuré "Research marché/concurrence"
Pourquoi obligatoire : le seul champ "marché" actuel est un code pays à 2 lettres. Aucune donnée sur ce que font les concurrents, quels angles ils utilisent, ce qui marche déjà dans la niche.
Ce qui casse si on ne la fait pas : le Creative Strategy Engine (Bloc 5) génère des angles "à l'aveugle" par rapport à ce que le marché a déjà validé ou saturé.
Temps estimé : 2h (UI) + temps continu de ta part pour l'alimenter.
Difficulté : Faible (techniquement), Moyenne (process — nécessite une discipline de collecte de ta part).
Dépendances : 3.1.
Critère de validation : chaque produit a un champ research consultable et injecté dans le prompt de génération d'angles.

### Modification 4.2 — Extraction structurée de la voix du client (reviews, messages SAV, commentaires)
Pourquoi obligatoire : aucune donnée de ce type n'existe dans le système aujourd'hui. C'est pourtant la source la plus fiable du vocabulaire exact à utiliser dans une créative (Direct Response copywriting 101 : utiliser les mots du client, pas les tiens).
Ce qui casse si on ne la fait pas : le copywriting reste un exercice de style générique plutôt qu'un reflet du langage réel de l'avatar — risque direct sur le CTR/CVR.
Temps estimé : 4-6h (intake manuel au départ : un champ où tu colles des extraits de reviews/messages, classés positif/objection/désir).
Difficulté : Moyenne.
Dépendances : 4.1.
Critère de validation : le prompt de génération de hooks/scripts cite explicitement du vocabulaire extrait de vrais retours clients.

### Modification 4.3 — Structuration du positionnement (Schwartz appliqué à la concurrence)
Pourquoi obligatoire : tu sais positionner un message selon le niveau de conscience du prospect (Schwartz) — mais le système ne sait aujourd'hui appliquer ce cadre qu'à un seul niveau (`awareness_level` du produit), pas à ce que font déjà les concurrents à chaque niveau.
Ce qui casse si on ne la fait pas : risque de produire des créatives qui ciblent le même niveau de conscience que tout le monde déjà sur le marché, au lieu d'exploiter un niveau sous-exploité (souvent le plus rentable).
Temps estimé : 2-3h.
Difficulté : Moyenne.
Dépendances : 4.1.
Critère de validation : le système peut indiquer explicitement "ce niveau de conscience est saturé par la concurrence, voici un niveau sous-exploité" avant de générer un angle.

**Type d'impact dominant : Qualité stratégique.**
**Score d'impact : 70/100** — c'est le bloc qui transforme "le système génère du texte" en "le système génère du texte informé par le marché réel".

---

## BLOC 5 — CREATIVE STRATEGY ENGINE

**Objectif.** Remplacer le prompt monolithique actuel (un seul appel Claude qui sort hooks + script + ad copy + brief visuel d'un coup) par un moteur en étapes : angles → hooks → concepts → scripts, chacun nourri par les données des Blocs 3-4, avec des frameworks de persuasion explicitement imposés (AIDA/PAS, Value Equation Hormozi).

**Pourquoi ce bloc passe en cinquième.** Tant que les Blocs 3-4 n'existaient pas, il n'y avait rien à mettre dans des étapes séparées — un seul prompt générique était la seule option raisonnable. Maintenant que la donnée existe, le découpage en étapes spécialisées devient possible et nécessaire.

### Modification 5.1 — Découper la génération en étapes (angles → hooks → concepts)
Pourquoi obligatoire : aujourd'hui, `callClaudeForBriefs()` demande à Claude de produire angle + hook + script + ad copy + brief visuel en un seul appel — aucune étape de validation intermédiaire, aucune granularité de contrôle.
Ce qui casse si on ne la fait pas : impossible de valider qu'un angle est stratégiquement solide avant d'avoir déjà généré tout le script qui en découle — tu perds du temps/budget à découvrir tardivement qu'un angle ne tient pas.
Temps estimé : 1-2 jours.
Difficulté : Élevée (refonte du cœur du moteur créatif).
Dépendances : Blocs 3-4 complets.
Critère de validation : on peut visualiser et valider un angle généré avant que le système ne produise le hook, puis le hook avant le script.

### Modification 5.2 — Imposer explicitement AIDA/PAS dans la génération de copy
Pourquoi obligatoire : le prompt actuel demande un "ad_copy" sans structure de persuasion imposée — risque de copy qui raconte une histoire sans mécanique de vente.
Ce qui casse si on ne la fait pas : du Direct Response qui n'a que la forme du Direct Response, pas la mécanique de conversion réelle (absence de structure problème→agitation→solution ou attention→intérêt→désir→action).
Temps estimé : 2-3h.
Difficulté : Faible.
Dépendances : 5.1.
Critère de validation : chaque ad_copy généré peut être annoté rétrospectivement avec les étapes AIDA ou PAS qu'il contient — aucune ne manque.

### Modification 5.3 — Value Equation Hormozi appliquée à la génération d'angles
Pourquoi obligatoire : un bon angle ne vend pas juste un produit, il maximise la valeur perçue / minimise délai et effort perçus. Le système actuel ne raisonne pas explicitement dans ces termes.
Ce qui casse si on ne la fait pas : des angles qui décrivent des features plutôt que de construire une offre perçue comme irrésistible.
Temps estimé : 3-4h.
Difficulté : Moyenne.
Dépendances : 5.1, 3.1 (champs structure d'offre).
Critère de validation : chaque angle généré est accompagné d'une justification explicite en termes de valeur perçue / probabilité de succès / délai / effort.

### Modification 5.4 — Garde-fou anti-saturation programmatique (pas juste une instruction au LLM)
Pourquoi obligatoire : aujourd'hui, "ne pas répéter un hook déjà testé" est une instruction textuelle dans le prompt — Claude peut l'ignorer ou produire une reformulation trop proche.
Ce qui casse si on ne la fait pas : usure créative non détectée, angles "grisés" qui reviennent sous une forme à peine différente.
Temps estimé : 4-5h (similarité textuelle programmatique entre nouveaux hooks et hooks existants, rejet/regénération automatique si trop proche).
Difficulté : Moyenne.
Dépendances : 5.1, 3.4 (lignée créative).
Critère de validation : un hook trop similaire à un hook déjà en base est automatiquement détecté et régénéré avant validation.

**Type d'impact dominant : Qualité créative + Qualité stratégique.**
**Score d'impact : 85/100** — c'est le bloc qui transforme l'intelligence en stratégie créative exploitable.

---

## BLOC 6 — WORKFLOW DE GÉNÉRATION

**Objectif.** Construire un pipeline d'exécution distinct pour chaque format (Static, UGC, Native, Direct Response) — chacun avec sa propre IA, sa propre structure de script, ses propres contraintes techniques, au lieu d'un seul `sendToCreativeEngine()` qui ne distingue que image vs vidéo.

**Pourquoi ce bloc passe en sixième.** On ne peut spécialiser l'exécution par format qu'une fois que la Creative Strategy Engine (Bloc 5) produit des concepts suffisamment structurés pour alimenter chaque pipeline spécifique. Avant ça, il n'y avait qu'un brief générique à exécuter de façon générique.

### Modification 6.1 — Pipeline Static Ads complet
Pourquoi obligatoire : aujourd'hui, le choix du modèle fal.ai (Ideogram vs Flux) est déterminé par une heuristique fragile de mot-clé sur le format, et l'aspect ratio par défaut (1:1) n'est même pas un format cible documenté.
Ce qui casse si on ne la fait pas : des statiques mal formatées pour Meta/TikTok (mauvais ratio) avec un choix de modèle visuel parfois inadapté au besoin réel (texte vs lifestyle).
Temps estimé : 4-6h.
Difficulté : Moyenne.
Dépendances : 5.1 (concept structuré en entrée), `needs_text_overlay` comme champ structuré plutôt qu'inféré.
Critère de validation : chaque statique généré respecte le ratio cible (4:5 ou 9:16) et utilise le bon modèle selon un champ explicite, pas une déduction de texte.

### Modification 6.2 — Pipeline UGC Ads complet (script → voix → vidéo)
Pourquoi obligatoire : le script UGC est généré aujourd'hui mais jamais envoyé à ElevenLabs — la génération de voix est un pipeline câblé côté serveur (`/api/elevenlabs`) mais jamais appelé depuis le flux de génération créative. C'est une chaîne orpheline.
Ce qui casse si on ne la fait pas : tu dois produire la voix manuellement à chaque UGC, ce qui annule une bonne partie du gain de temps que l'automatisation est censée apporter.
Temps estimé : 1 jour.
Difficulté : Élevée (orchestration script → voix → injection dans le brief vidéo Higgsfield → vérification de synchronisation).
Dépendances : 6.1 non requis, mais 5.1 oui ; clé ElevenLabs valide (Bloc 2).
Critère de validation : un script UGC généré produit automatiquement une piste voix ElevenLabs intégrée à la vidéo finale, sans étape manuelle.

### Modification 6.3 — Pipeline Native Ads (inexistant aujourd'hui)
Pourquoi obligatoire : rien dans le code actuel ne traite spécifiquement les codes natifs de plateforme (pattern interruption, intégration visuelle au feed, codes spécifiques TikTok vs Meta) — chaque format se réduit aujourd'hui à "image" ou "vidéo".
Ce qui casse si on ne la fait pas : des créatives qui ont l'air de publicités plutôt que de contenu natif, ce qui dégrade Thumb Stop Rate/Hold Rate sur TikTok en particulier.
Temps estimé : 1 jour.
Difficulté : Élevée (nécessite de définir explicitement, dans le SOP — Bloc 3.3 — ce qu'est un brief "Native" pour chaque plateforme).
Dépendances : 3.3 (SOP éditable), 5.1.
Critère de validation : un brief généré pour le format Native contient des instructions de pattern interruption et de codes plateforme distincts d'un brief Static/UGC classique.

### Modification 6.4 — Pipeline Direct Response (copy long-form structuré)
Pourquoi obligatoire : aujourd'hui le champ `ad_copy` est générique (100-150 mots), sans framework de preuve/objection imposé.
Ce qui casse si on ne la fait pas : du Direct Response qui n'a que le nom, sans la mécanique de persuasion complète (stacking de preuves, levée d'objections explicite, CTA structuré).
Temps estimé : 4-6h.
Difficulté : Moyenne.
Dépendances : 5.2, 5.3, 3.1 (objections disponibles).
Critère de validation : chaque copy Direct Response généré lève explicitement au moins une objection capturée en 3.1 et utilise au moins une preuve issue de 4.2.

### Modification 6.5 — Persistance des assets finaux hors CDN éphémère
Pourquoi obligatoire : les URLs vidéo/image retournées par fal.ai/Higgsfield sont hébergées sur leur CDN — rien ne garantit qu'elles restent accessibles indéfiniment.
Ce qui casse si on ne la fait pas : tu reviens consulter une créative archivée dans 3 mois, le lien est mort, tu as perdu l'asset.
Temps estimé : 3h.
Difficulté : Faible.
Dépendances : 1.2 (où stocker l'asset téléchargé localement, qui ne doit pas être le même blob localStorage).
Critère de validation : chaque créative générée est téléchargée et stockée durablement, pas seulement référencée par une URL distante.

**Type d'impact dominant : Vitesse de production + Qualité créative.**
**Score d'impact : 80/100** — c'est le bloc qui répond directement à "6 créatives = 6 workflows différents, pas 6 variations du même prompt".

---

## BLOC 7 — QUALITY CONTROL

**Objectif.** Mettre des gates de validation entre "généré" et "considéré comme prêt à uploader sur Meta/TikTok" — humaines et automatiques.

**Pourquoi ce bloc passe en septième.** On ne peut contrôler la qualité d'un output que si cet output est déjà spécialisé par format (Bloc 6) et stratégiquement structuré (Bloc 5). Avant ça, il n'y avait rien de suffisamment précis à contrôler.

### Modification 7.1 — Validation humaine avant génération payante
Pourquoi obligatoire : dès qu'un brief est généré, la génération image/vidéo payante se déclenche immédiatement sans étape d'approbation — un mauvais brief coûte de l'argent avant que tu puisses le voir.
Ce qui casse si on ne la fait pas : gaspillage de budget créatif sur des briefs jamais validés, surtout en phase TESTING où le coût relatif d'une erreur est le plus élevé.
Temps estimé : 4h.
Difficulté : Moyenne.
Dépendances : Bloc 6 (un brief par format à approuver, pas un brief générique).
Critère de validation : aucune génération fal.ai/Higgsfield/ElevenLabs ne se déclenche sans validation explicite en phase TESTING.

### Modification 7.2 — Vérification automatique du message match
Pourquoi obligatoire : la règle "le hook doit matcher exactement le langage du site" est aujourd'hui une instruction textuelle au LLM, jamais vérifiée après génération.
Ce qui casse si on ne la fait pas : tu ne sais jamais si la règle a vraiment été respectée — tu dois vérifier manuellement chaque créative.
Temps estimé : 4-5h.
Difficulté : Moyenne.
Dépendances : 4.1, 4.2 (données de référence pour la comparaison).
Critère de validation : chaque créative générée est accompagnée d'un score de cohérence avec les données site/voix client, signalé si trop faible.

### Modification 7.3 — Checklist conformité plateforme (specs techniques + risque de claims)
Pourquoi obligatoire : aucun contrôle aujourd'hui sur le respect des specs techniques (durée, résolution, ratio) ni sur les risques de violation des politiques publicitaires (claims santé/financiers qui font bannir un compte Meta).
Ce qui casse si on ne la fait pas : risque opérationnel direct — compte Ads suspendu, pas juste une créative qui sous-performe.
Temps estimé : 1 jour.
Difficulté : Moyenne.
Dépendances : Bloc 6.
Critère de validation : chaque créative générée passe par une checklist automatique (specs + mots-clés à risque) avant d'être marquée "prête à uploader".

### Modification 7.4 — Pré-test de hooks à faible coût avant production complète
Pourquoi obligatoire : chaque brief va aujourd'hui directement en production complète (image finale ou vidéo entière) — aucun filtre à bas coût avant d'investir dans la production complète.
Ce qui casse si on ne la fait pas : tu payes le coût plein de génération pour des hooks qui auraient pu être éliminés à moindre coût.
Temps estimé : 1 jour (utile surtout à partir de la phase SCALING avec volume).
Difficulté : Moyenne.
Dépendances : 7.1.
Critère de validation : en phase SCALING, les hooks sont testés (texte/thumbnail léger) avant le déclenchement de la production vidéo/image complète.

**Type d'impact dominant : Taux de réussite publicitaire.**
**Score d'impact : 78/100** — c'est le bloc qui transforme "généré" en "prêt à performer, vérifié".

---

## BLOC 8 — FEEDBACK LOOP

**Objectif.** Remplacer les win-rates ASL statiques et génériques par tes propres données de performance réelles, une fois qu'elles existent en volume suffisant.

**Pourquoi ce bloc passe en huitième.** Une boucle de feedback n'a de sens que sur des créatives réellement produites (Bloc 6), contrôlées (Bloc 7), et tracées jusqu'à leur angle stratégique d'origine (Bloc 3.4). C'est littéralement le dernier bloc qui peut exister chronologiquement — il consomme tout ce qui précède.

### Modification 8.1 — Recalcul dynamique des win-rates par angle/format
Pourquoi obligatoire : le prompt utilise aujourd'hui des moyennes génériques ASL (Unboxing 10%, Offer First 9%...) identiques pour tous les produits/niches.
Ce qui casse si on ne la fait pas : le système continue à biaiser vers des formats génériquement performants même quand tes propres données prouvent le contraire pour ton produit/marché spécifique.
Temps estimé : 1 jour.
Difficulté : Moyenne.
Dépendances : 3.4 (lignée créative), volume de données réelles suffisant (10-15 tests minimum).
Critère de validation : après 15 tests réels, le système peut justifier un choix de format par tes propres taux de victoire, pas seulement par les chiffres ASL génériques.

### Modification 8.2 — Détection automatique de pattern hebdomadaire (renforcement de l'existant)
Pourquoi obligatoire : `weekly_patterns` existe déjà mais sert peu à orienter activement la génération suivante au-delà du format/angle dominant.
Ce qui casse si on ne la fait pas : l'audit hebdomadaire (lundi, P0 ASL) reste un constat plutôt qu'un input actif pour le batch suivant.
Temps estimé : 4-6h.
Difficulté : Moyenne.
Dépendances : 8.1.
Critère de validation : le batch généré après un audit lundi reflète explicitement les patterns de la semaine précédente, pas seulement le format dominant brut.

**Type d'impact dominant : Qualité stratégique + Taux de réussite publicitaire.**
**Score d'impact : 65/100** — gain réel mais seulement matérialisable après usage réel, pas par du code seul.

---

## BLOC 9 — OPTIMISATION PERFORMANCE

**Objectif.** Une fois que le système produit correctement (Blocs 1-8), optimiser la vitesse et le coût de production — pas la qualité, le débit.

**Pourquoi ce bloc passe en neuvième, pas plus tôt.** Optimiser la vitesse d'un pipeline qui va être restructuré (Blocs 5-6) est un gaspillage d'effort — on optimise une fois la forme finale stabilisée, pas avant.

### Modification 9.1 — Parallélisation des générations indépendantes
Pourquoi obligatoire : la boucle actuelle (`for(i<briefs.length) await sendToCreativeEngine(...)`) génère les créatives une par une, séquentiellement, alors qu'elles sont indépendantes entre elles.
Ce qui casse si on ne la fait pas : un batch de 6 créatives prend 6x le temps d'une génération unique, sans raison technique.
Temps estimé : 2-3h.
Difficulté : Faible.
Dépendances : Bloc 6 stable (paralléliser un pipeline encore en cours de refonte serait contre-productif).
Critère de validation : un batch de 6 créatives se génère en un temps proche de la durée d'une seule génération, pas 6 fois plus.

### Modification 9.2 — Cache du scraping site
Pourquoi obligatoire : chaque génération de batch re-scrape le site via allorigins.win — un service tiers gratuit, lent, et non garanti.
Ce qui casse si on ne la fait pas : chaque génération dépend d'un point de défaillance externe répété inutilement, alors que le contenu du site change rarement entre deux batchs.
Temps estimé : 2h.
Difficulté : Faible.
Dépendances : 2.4 (gestion de timeout déjà en place).
Critère de validation : le site n'est re-scrapé qu'au-delà d'une fréquence raisonnable (ex. 1x/jour), pas à chaque génération.

### Modification 9.3 — Suivi des coûts de génération créative (séparé du budget Ads)
Pourquoi obligatoire : `campaign.budget_remaining` suit le budget publicitaire Meta, mais rien ne suit le coût cumulé des appels Claude/fal.ai/Higgsfield/ElevenLabs eux-mêmes — un coût qui peut s'accumuler silencieusement.
Ce qui casse si on ne la fait pas : tu découvres en fin de mois une facture API surprenante, sans visibilité en amont.
Temps estimé : 3-4h.
Difficulté : Faible.
Dépendances : aucune technique, logiquement situé ici car lié à la vitesse/volume de production.
Critère de validation : un compteur visible de coût de génération créative, par batch et cumulé.

**Type d'impact dominant : Vitesse de production.**
**Score d'impact : 40/100** — utile, mais n'augmente pas directement la probabilité qu'une créative performe.

---

## BLOC 10 — VERSION 1.0 OPÉRATIONNELLE

**Objectif.** Intégration finale, validation bout-en-bout, mise à jour de la documentation, checklist de mise en production réelle.

**Pourquoi ce bloc passe en dernier.** Il ne contient aucune nouvelle capacité — il valide que l'ensemble des 9 blocs précédents fonctionne ensemble, sans régression, et que la documentation (CLAUDE.md) reflète la réalité du système.

### Modification 10.1 — Test end-to-end complet, un de chaque format
Pourquoi obligatoire : aucun test n'a jamais validé la chaîne complète pour les 4 formats (Static/UGC/Native/Direct Response) sur le même produit en une seule passe.
Ce qui casse si on ne la fait pas : une interaction non testée entre deux blocs (ex. Bloc 6 et Bloc 7) peut casser silencieusement malgré que chaque bloc soit individuellement validé.
Temps estimé : 1 jour.
Difficulté : Moyenne.
Dépendances : Blocs 1-9 complets.
Critère de validation : un batch contenant les 4 formats est généré, contrôlé (Bloc 7), et présenté sans aucune erreur non gérée.

### Modification 10.2 — Mise à jour de `CLAUDE.md`
Pourquoi obligatoire : la documentation actuelle décrit l'architecture d'avant cette roadmap — elle doit refléter la réalité du système final (multi-étapes, multi-format, schéma de données enrichi).
Ce qui casse si on ne la fait pas : toute intervention future (la tienne ou une IA) repart d'une doc obsolète et réintroduit les mêmes incohérences.
Temps estimé : 2-3h.
Difficulté : Faible.
Dépendances : 10.1.
Critère de validation : `CLAUDE.md` décrit exactement l'architecture en place, vérifié ligne par ligne contre le code réel.

### Modification 10.3 — Audit de sécurité final
Pourquoi obligatoire : vérifier qu'aucune clé n'est revenue en dur dans le code au fil des modifications des Blocs 1-9, et que l'historique Git ne contient plus de secret actif.
Ce qui casse si on ne la fait pas : tout le travail de sécurisation du Bloc 1 peut être silencieusement annulé par une modification ultérieure.
Temps estimé : 1h.
Difficulté : Faible.
Dépendances : tous les blocs précédents.
Critère de validation : recherche exhaustive de patterns de clés dans tout le code source + `.gitignore` vérifié, zéro résultat.

**Type d'impact dominant : Fiabilité.**
**Score d'impact : 50/100** — pas de nouvelle capacité, mais condition de confiance avant usage réel soutenu.

---

# ORDRE D'EXÉCUTION RÉEL

L'ordre 1→10 ci-dessus respecte déjà les dépendances techniques, produit, marketing et data — voici pourquoi, bloc par bloc, et où des parallélisations mineures sont possibles sans casser la logique :

1. **Bloc 1 avant tout** : dépendance technique absolue — aucun autre bloc n'est mesurable sur un système qui ment sur son propre état.
2. **Bloc 2 après Bloc 1** : dépendance technique — valider les intégrations n'a de sens que si les échecs de persistance ne se confondent pas avec des échecs d'intégration.
3. **Bloc 3 après Bloc 2** : dépendance produit — construire le schéma de données stratégiques sur un système dont on n'a pas encore prouvé la stabilité reviendrait à devoir tout retester après coup.
4. **Bloc 4 après Bloc 3** : dépendance data — l'intelligence marché a besoin des champs (3.1) pour exister quelque part.
   *Parallélisation possible* : 4.1 (intake research) peut démarrer dès que 3.1 seul est fini, sans attendre 3.2/3.3/3.4 — gain de temps mineur si pressé.
5. **Bloc 5 après Bloc 4** : dépendance marketing — un moteur de stratégie créative sans intelligence marché en entrée ne fait que reformuler du vide avec de meilleurs mots.
6. **Bloc 6 après Bloc 5** : dépendance produit — spécialiser l'exécution par format n'a de sens que si les concepts en entrée sont déjà stratégiquement structurés.
7. **Bloc 7 après Bloc 6** : dépendance technique — contrôler la qualité d'un output nécessite que cet output soit déjà spécialisé et prévisible par format.
8. **Bloc 8 après Bloc 7** : dépendance data — une boucle de feedback ne peut apprendre que de créatives déjà tracées (3.4) et contrôlées (Bloc 7) en conditions réelles.
9. **Bloc 9 après Bloc 8** : dépendance technique — optimiser la vitesse d'un pipeline encore en évolution stratégique (Blocs 5-8) gaspillerait l'effort.
10. **Bloc 10 en dernier** : par définition — c'est la validation que tout l'ensemble fonctionne ensemble.

**Aucune réorganisation majeure n'était nécessaire** — la seule erreur qu'un raisonnement moins rigoureux aurait pu commettre est de placer le Bloc 9 (Optimisation) plus tôt "pour aller plus vite" : ça aurait été une erreur, puisque ce qu'on optimiserait (Bloc 6) est encore en train de changer de forme jusqu'au Bloc 7.

---

# ROADMAP 15% → 95%

```
15% → 28% → 40% → 50% → 60% → 72% → 83% → 89% → 93% → 94% → 95%
```

| Étape | Probabilité | Pourquoi |
|---|---|---|
| Départ | 15% | Le chemin principal de génération ne produit aucun média réel ; aucune intégration validée ; données stratégiques quasi inexistantes. |
| Après Bloc 1 | 28% | Le système ne ment plus sur ce qu'il fait et ne perd plus de données silencieusement — mais la stratégie créative reste pauvre. |
| Après Bloc 2 | 40% | Les 4 intégrations sont prouvées fonctionnelles en conditions réelles — le pipeline technique existe vraiment, pas en théorie. |
| Après Bloc 3 | 50% | Le système peut capter objections/désirs/USP/offre — la matière première de la persuasion existe enfin dans le produit. |
| Après Bloc 4 | 60% | La génération est désormais informée par le marché et la concurrence réels, pas seulement par le produit isolé. |
| Après Bloc 5 | 72% | Les angles/hooks/concepts sont générés avec des frameworks de persuasion explicites (AIDA/PAS/Value Equation) — saut qualitatif majeur. |
| Après Bloc 6 | 83% | Chaque format (Static/UGC/Native/DR) a son pipeline propre et correct — la diversité et la pertinence technique des formats explose. |
| Après Bloc 7 | 89% | Rien n'est uploadé sans contrôle qualité/conformité — le risque de publier une créative mauvaise ou non conforme chute fortement. |
| Après Bloc 8 | 93% | Le système apprend de tes propres données réelles, pas seulement de moyennes génériques ASL. |
| Après Bloc 9 | 94% | Gain marginal sur la probabilité de succès d'une créative individuelle — l'impact principal est sur le volume/coût, pas la qualité. |
| Après Bloc 10 | 95% | Validation finale bout-en-bout — confirme que rien ne s'est cassé entre les blocs, sans ajouter de nouvelle capacité. |

**Pourquoi jamais 100%.** Le dernier delta (95%→100%) ne dépend plus du produit — il dépend de variables hors de portée du code : qualité d'exécution média réelle (acteurs UGC, qualité de production), conditions de marché changeantes, créativité humaine irremplaçable. Un système à 95% te donne un avantage structurel énorme sur un media buyer moyen — pas une garantie absolue, qui n'existe nulle part en publicité.

---

# CE QUE PROMÉTHÉE DEVRA FAIRE UNE FOIS TERMINÉ

**Workflow complet** (boucle fermée, jamais linéaire à sens unique) :

Onboarding (produit + offre + avatar structuré) → Analyse produit (Value Equation Hormozi) → Analyse offre (garantie, bonus, structure de prix) → Analyse marché (positionnement Schwartz par segment) → Analyse concurrence (angles déjà exploités, niveaux de conscience saturés vs disponibles) → Analyse avatar (douleur + désir + objections + voix du client réelle) → Extraction d'insights (synthèse Claude des 6 étapes précédentes en un brief stratégique unique) → Création d'angles (ancrés dans un niveau de conscience sous-exploité identifié) → Création de hooks (filtrés anti-saturation programmatique) → Création de concepts (angle + hook + preuve + mécanisme) → Création de scripts (spécifique par format : visuel pour Static, parlé pour UGC, copy AIDA/PAS pour Direct Response, pattern interruption pour Native) → Création des créatives (routage vers fal.ai / Higgsfield+ElevenLabs / templates Native / copy DR) → Validation (humaine en TESTING, automatique en SCALING) → Creative Bank (avec lignée complète angle→hook→concept→script→créative) → Tests (J1/J2/J4 ASL, déterministe, inchangé — c'est la partie du système déjà solide) → Feedback (performance réelle réinjectée dans les win-rates par angle/format, pas générique) → Nouvelle génération (informée par le cycle précédent, jamais reset à zéro).

**Données exploitées.** Fiche produit complète (prix, COGS, ROAS BE/Target, objections, désirs, USP, garantie) ; research marché/concurrence structuré ; voix du client réelle (reviews/SAV) ; scraping site avec fallback signalé ; historique complet de la Creative Bank avec lignée ; angle_scores et win-rates réels par produit (scopés, pas globaux) ; métriques Meta/Shopify quotidiennes.

**Décisions prises.** Toutes les décisions GO/CUT/OPTI/SCALE restent déterministes via l'ASL (waterfall P0→P9, inchangé — ce moteur est déjà solide) ; en plus : quel angle générer ensuite (informé par le marché + le feedback réel) ; quel format prioriser (informé par les win-rates réels, pas ASL génériques) ; quelle créative est prête à uploader (Quality Control) vs doit être régénérée.

**Analyses effectuées.** Schwartz (niveau de conscience, par produit ET par concurrent) ; Value Equation Hormozi (par angle généré) ; AIDA/PAS (vérifié après génération, pas juste demandé) ; similarité anti-saturation (programmatique, pas juste instructive) ; conformité plateforme (specs techniques + risque de claims).

**IA utilisées.** Claude (Sonnet) pour : synthèse stratégique, génération d'angles/hooks/concepts/scripts, vérification de cohérence (message match). fal.ai (Ideogram v3 / Flux Pro) pour les statiques, avec choix de modèle déterminé par un champ structuré. Higgsfield pour les vidéos UGC/Native, avec script + brief de mise en scène. ElevenLabs pour la voix, branchée automatiquement sur les scripts UGC qui en ont besoin — plus aucune chaîne orpheline.

**Génération par format.**
- *Static Ads* : concept validé → brief visuel structuré (composition, overlay texte, couleurs) → fal.ai avec le bon modèle et le bon ratio (4:5/9:16) → contrôle qualité automatique du ratio/texte avant validation.
- *UGC Ads* : concept validé → script mot-à-mot avec mise en scène → génération voix ElevenLabs → injection dans le brief vidéo Higgsfield → vidéo finale avec voix synchronisée, contrôlée avant validation.
- *Native Ads* : concept validé → brief avec codes spécifiques plateforme (pattern interruption TikTok vs intégration feed Meta) → génération adaptée → vérification qu'elle ne ressemble pas à une publicité classique.
- *Direct Response Ads* : concept validé → copy structuré AIDA ou PAS, objections levées explicitement (issues de la fiche produit), preuves citées (issues de la voix du client réelle) → vérification que chaque étape du framework est présente avant validation.

Un système ainsi construit ne bat pas un media buyer moyen par la quantité de créatives produites — il le bat parce que chaque créative part d'une stratégie vérifiable (angle ancré dans un niveau de conscience sous-exploité, preuve réelle, objection réellement levée) plutôt que d'une intuition, exactement le principe fondateur de l'ASL appliqué cette fois à la créativité elle-même, pas seulement à la décision média.
