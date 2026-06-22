# AUDIT DES INFORMATIONS MANQUANTES — BLOC 6 (Workflow de génération)
**But :** identifier tout ce qu'il manque pour construire le Bloc 6 sans hypothèse, sans méthode générique, sans invention. Ce document ne code rien.

---

## SECTION 1 — CE QUE JE SAIS DÉJÀ

### Cadre stratégique général (déjà intégré au Bloc 5 / SOP)
Formule diagnostic (Volume × Diversité × Qualité × Analyse × Double Down) ; Loi des 8% (8% winners = 60% du spend, ~100 créas pour 8 winners, mesurer le nombre de winners pas le win rate) ; matrice de dimensions (angles/niveaux de conscience/formats/avatars/styles de hook) ; règle "fond avant forme" ; empreinte créative Andromeda (5 éléments : hook visuel, texte/headline, audio/musique, format, angle central — minimum 3 changés pour ne pas être vu comme quasi-doublon) ; les 5 niveaux de conscience Schwartz avec approche créative par niveau ; les 10 types d'annonces avec win-rate/spend ratio/niveau de conscience cible (UGC Testimonial, Founder Story, Ugly Ads, US vs DM, Before/After+Social Proof, Offer First, Unboxing, Réponses aux Objections, Text-based Lettre, Creator Partnership) ; les 7 structures de copywriting mappées par niveau de conscience (AIDA, PAS, BAB, Rock Bottom→Inflection→Transformation, Objection First, Yes Ladder, Offre Irrésistible) ; UMP/UMS ; règle bénéfice vs feature ; power words par catégorie ; formule de headline ; squelette d'ad copy (hook → bénéfices en check marks → preuve sociale → offre+urgence, max 150 mots) ; 6 types de titre + règle de complémentarité créa/titre ; structure d'un avis impactant en 5 étapes ; règles de phase business (testing = copier le concurrent, scaling = recherche complète).

### Pipelines techniques décrits dans ton playbook
**Workflow A (Vidéo)** : Claude choisit l'angle + niveau de conscience → Claude écrit script + hook 2s (15-30s) → Higgsfield Seedance 2.0 génère la vidéo AVEC audio natif synchronisé (voix + musique) → CapCut pour montage + sous-titres → upload Meta ASC/Tribal v2 → analyse via Meta Ads MCP + Claude.

**Workflow B (Statique)** : Claude définit l'angle visuel (avant/après, bénéfice, lifestyle, hero) → Higgsfield GPT Images 2.0 ou ChatGPT Plus génère le visuel → Canva (avec brand kit) fait la mise en page + texte + CTA → export en 3 formats (1:1, 4:5, 9:16) → test parallèle → comparaison CTR/CPA via Polar + Claude.

**Note ElevenLabs** : Higgsfield génère l'audio nativement. ElevenLabs n'est utile que pour une voix de marque signature réutilisable identique sur tous les créatifs — pas nécessaire pour démarrer.

**Higgsfield** : Niveau 1 = Marketing Studio (photo produit → 9 variantes vidéo en <10 min, 3 styles UGC/CGI/cinématique, 40+ avatars prêts ou personnalisés, sorties auto 9:16/1:1/16:9). Niveau 2 = automation Claude Code + Playwright MCP pour des batchs de nuit sans intervention.

**Foreplay.co** : bibliothèque de swipe — sauvegarder les pubs concurrentes gagnantes (depuis Afterlib/Meta Ad Library), coller le lien comme référence visuelle/structurelle quand on brief Claude ou Higgsfield.

**Recyclage de créa concurrente** : changer la voix (ElevenLabs), réécrire les sous-titres, effet miroir (CapCut), filtre discret — technique de réutilisation rapide, distincte de la génération from scratch.

**SOP Creator Partnership / Gifting** : 5 étapes (identifier créateurs 5K-100K abonnés engagement >3%, outreach non-contraignant, sélectionner les meilleures vidéos sur ~30% de taux de retour exploitable, activer Partnership Ads Meta, transformer les meilleurs en in-house creators).

### Déjà construit dans Prométhée (Blocs 1-5)
Schéma produit complet (prix, COGS, ROAS BE/Target, avatar avec pain/desire/objections/awareness_level/voice_profile généré automatiquement, USP, garantie, market_intel avec concurrents structurés) ; SOP éditable (`sop.json`) ; moteur stratégique qui produit un objet "concept" structuré : `{angle, hook, awareness_level, hook_style, ump, ums, copywriting_structure, type_annonce_recommande, type_media, objection_handled, proof, benefice_principal, titre, ad_copy, cta}` ; architecture serveur (proxy local vers Claude/fal.ai/Higgsfield/ElevenLabs, fichiers sauvegardés sur disque dans `creatives/`, jamais en base64) ; creative_bank scopé par produit avec empreinte partielle déjà trackée (angle_central, texte_headline).

---

## SECTION 2 — CE QUI ME MANQUE

### Pipeline Static Ads
Logique de génération : le code actuel (écrit avant que tu me donnes le playbook) utilise fal.ai (Ideogram v3 / Flux Pro) pour produire l'image. Ton playbook dit Higgsfield GPT Images 2.0 / ChatGPT Plus. Contradiction non résolue.
Logique de sélection : comment choisir entre les 4 angles visuels du playbook (avant/après, bénéfice, lifestyle, hero) pour un concept donné — quel critère décide ?
Logique visuelle : aucune maquette/template de composition (où va le texte, hiérarchie, zones interdites, taille de police).
Charte de marque réelle pour CE produit/cette boutique : couleurs hex, typographie, logo — le playbook dit "Namelix → Canva" comme process pour la CRÉER, mais je n'ai pas le résultat.
Logique de copy : où est la frontière entre le texte qui va DANS l'image (overlay) et l'ad copy à côté (déjà définie par le squelette) ?
Logique de CTA visuel sur l'image elle-même — non spécifiée.
Logique d'offres à l'écran (badge promo, bandeau prix, structure de bundle affichée) — non spécifiée.
Logique de variantes : combien de statiques par concept, qu'est-ce qui varie précisément au-delà de la règle Andromeda générale ?
Mise en forme exacte du format "Text-based Lettre" (texte pur, aucune image) — police, structure visuelle d'une "lettre".

### Pipeline UGC
Découpage temporel précis par type — le playbook donne "hook 2s", "15-30s" en général et "60-120s" pour Founder Story spécifiquement, mais pas de timeline détaillée (à quelle seconde l'agitation commence, où la preuve arrive, etc.) pour chaque type.
Quels avatars Higgsfield (parmi les 40+ disponibles, ou un avatar personnalisé) correspondent à ta marque/ton marché — aucune info.
Rythme de montage précis (durée des plans, fréquence des coupes) au-delà du hook 2s.
Règles de voix (accent, âge, genre, énergie) pour la sélection côté Higgsfield/ElevenLabs.
Ton exact différencié par type (Testimonial ≠ Founder Story ≠ Ugly Ads dans l'esprit, mais pas de spec fine par type).
Règles de sous-titrage CapCut (police, taille, couleur, position, timing d'apparition).
Règles de musique/ambiance sonore (genre, mood, quand il y en a une vs silence).
Personas exacts (au sens démographique/comportemental/psychographique du playbook) pour CE produit — confirmé non disponible, tu m'as dit "j'ai vraiment 0 là, on pose encore les fondations".

### Pipeline Native Ads
Confirmation de périmètre : ton playbook n'a pas de catégorie "Native" séparée — Ugly Ads et Text-based Lettre jouent ce rôle (ressemblent à du contenu organique). Je ne sais pas si tu veux que "Native" du Bloc 6 soit exactement ça, ou un pipeline distinct que tu as en tête sans qu'il soit dans le document fourni.
Différences Meta/TikTok : le système actuel (Meta Ads MCP, structure CBO, Andromeda) est 100% Meta. Aucune mention de TikTok dans ce que tu m'as donné. Je ne sais pas si TikTok fait partie du périmètre de Prométhée, maintenant ou plus tard.
Pattern interruption : techniques précises au-delà de "ressemble à de l'organique" (déjà capté pour Ugly Ads) — rien de plus spécifique fourni.
Contraintes techniques par plateforme (durée max, ratio obligatoire, sous-titres requis sur TikTok, etc.) — non fournies, et sans confirmation du périmètre TikTok, hors sujet pour l'instant.

### Pipeline Direct Response
Je ne sais pas si "Direct Response" est : (a) la méthodologie déjà appliquée à travers tous les formats via le Bloc 5 (AIDA/PAS/UMP-UMS/objections déjà dans le concept), ou (b) un format de LIVRABLE séparé et distinct (ex: une longue lettre de vente / advertorial qui ne ressemble à aucun des 10 types d'annonces déjà répertoriés).
Si c'est un livrable séparé : où vit-il (post Facebook très long, landing page, PDF, email) ? Ce n'est pas un format Meta Ads standard parmi les 10 déjà connus.
Longueur exacte attendue si format séparé.
Mécanismes de preuve spécifiques à ce format au-delà de ce qui est déjà dans le SOP.

### Transverse — documents personnels non encore fournis
Bibliothèque de hooks personnels (j'ai les power words génériques du playbook, pas TES hooks gagnants).
Bibliothèque d'angles personnels déjà validés (au-delà des catégories génériques du SOP).
Bibliothèque d'objections par produit/niche, plus riche que le champ texte actuel.
Bibliothèque d'offres / structures de bundle que tu utilises réellement.
Exemples de créatives gagnantes (le playbook mentionne Foreplay comme outil de swipe, mais pas le contenu de TA swipe file).
Spec technique réelle de l'API Higgsfield (format de prompt officiel, paramètres acceptés pour image-to-video, choix de voix/musique) — le code actuel envoie un prompt texte libre, construit avant d'avoir vu une documentation officielle Higgsfield.
Spec technique réelle de fal.ai pour les statiques si on garde cet outil (jamais testée avec une vraie clé, donc le format de payload exact n'est pas confirmé empiriquement).

---

## SECTION 3 — CLASSEMENT PAR CRITICITÉ

**Critique** (je refuse de construire sans ça — risque direct d'inventer une règle métier) :
Confirmation périmètre Native (= Ugly Ads/Text-based Lettre, ou pipeline distinct ?).
Confirmation périmètre Direct Response (méthodologie déjà couverte, ou livrable séparé — et si oui, lequel ?).
Confirmation périmètre plateforme (Meta uniquement, ou Meta+TikTok un jour ?).
Arbitrage outil image statique (fal.ai actuel vs Higgsfield Images du playbook).
Charte de marque minimale (couleurs/police/logo) — sans ça, aucun statique ne peut être cohérent avec ta marque.
Quels avatars/voix Higgsfield utiliser pour le UGC.

**Important** (je peux avancer avec une version minimale mais la qualité en dépend) :
Découpage temporel précis par type UGC.
Règles de sous-titrage/montage CapCut.
Logique de composition visuelle statique (zones, hiérarchie de texte).
Bibliothèques personnelles (hooks/angles/objections/offres) si elles existent.
Spec technique réelle Higgsfield/fal.ai.

**Utile** (améliore sans être bloquant) :
Swipe file de créatives gagnantes passées (Foreplay) pour calibrer le ton réel.
Règles musique/ambiance sonore.

**Bonus** (le playbook lui-même dit que ce n'est pas nécessaire pour démarrer) :
ElevenLabs voix de marque signature.
Spec TikTok détaillée (si le périmètre s'élargit plus tard).

---

## SECTION 4 — DOCUMENTS À FOURNIR

**Charte de marque (couleurs hex, typographie, logo)**
Pourquoi : sans elle, aucun statique généré ne peut avoir une identité visuelle cohérente d'une créative à l'autre.
Impact : conditionne directement la qualité et la cohérence de tout le pipeline Static Ads.
Si absent : je génère des statiques visuellement génériques/incohérents entre eux — exactement le type d'invention que tu m'as interdit.

**Bibliothèque de hooks personnels (si elle existe)**
Pourquoi : calibrer le ton réel plutôt que les power words génériques du playbook.
Impact : qualité et authenticité des hooks générés par le Bloc 5/6.
Si absent : le système continue avec les power words génériques déjà dans le SOP — fonctionnel, mais moins "toi".

**Bibliothèque d'angles personnels validés (si elle existe)**
Pourquoi : éviter de régénérer des angles que tu as déjà testés/écartés ailleurs que dans Prométhée.
Impact : pertinence stratégique des angles proposés.
Si absent : le système s'appuie uniquement sur sa propre creative_bank (qui démarre vide) et les catégories génériques.

**Bibliothèque d'objections personnelles par produit/niche (si elle existe, au-delà du champ actuel)**
Pourquoi : le champ "objections" actuel est un texte libre par produit — une bibliothèque plus riche (par niche, récurrente) améliorerait la levée d'objections dans l'ad copy.
Impact : qualité du Direct Response intégré aux concepts.
Si absent : le système utilise seulement les objections saisies manuellement par produit.

**Bibliothèque d'offres / structures de bundle (si elle existe)**
Pourquoi : le concept actuel a juste un champ "guarantee" — une vraie bibliothèque de structures d'offre (bundle 1+1, pack x3, paliers) enrichirait fortement le UMS/l'offre proposée.
Impact : qualité de l'offre dans chaque concept, donc de la conversion attendue.
Si absent : offre simple (prix + garantie), pas de structuration bundle.

**Exemples de créatives gagnantes / swipe file (Foreplay ou autre)**
Pourquoi : calibrer le système sur des preuves concrètes plutôt que sur des frameworks théoriques uniquement.
Impact : qualité perçue et authenticité du style produit.
Si absent : le système s'appuie uniquement sur le playbook théorique, sans preuve de ce qui a réellement marché pour toi.

**Documentation officielle Higgsfield (format de prompt, paramètres API réels)**
Pourquoi : le code actuel envoie un prompt texte libre construit avant d'avoir vu une doc officielle — risque de format de payload incorrect.
Impact : fiabilité technique du pipeline vidéo/image entier.
Si absent : je construis le brief sur la base des informations disponibles publiquement + je signale clairement que ça doit être validé au premier vrai test (cohérent avec le Bloc 2 — erreurs explicites, pas d'invention silencieuse).

---

## SECTION 5 — QUESTIONS OBLIGATOIRES

**Périmètre général**
1. Prométhée doit-il un jour produire pour TikTok, ou exclusivement Meta ?
2. "Native Ads" dans ta demande correspond-il exactement à Ugly Ads + Text-based Lettre (déjà dans le SOP), ou as-tu une définition différente en tête ?
3. "Direct Response" est-il un livrable séparé des 10 types d'annonces déjà connus, ou la méthodologie déjà intégrée au concept du Bloc 5 ?
4. Si Direct Response est un livrable séparé : à quoi ressemble-t-il concrètement (longueur, où il vit, à quoi il sert) ?
5. Le pipeline Static Ads doit-il utiliser fal.ai (déjà câblé) ou basculer vers Higgsfield Images/ChatGPT Plus comme décrit dans ton playbook ?
6. As-tu d'autres documents (SOP internes, frameworks créatifs, méthodes personnelles, règles de décision) au-delà de l'Ecom Playbook déjà fourni ?

**Charte de marque**
7. As-tu déjà une charte de marque (couleurs, typographie, logo) pour ta boutique actuelle, même provisoire ?
8. As-tu un brand kit Canva déjà créé, ou c'est encore à faire ?
9. Y a-t-il un ton de voix de marque déjà défini (au-delà du profil de voix généré automatiquement par produit au Bloc 4) ?

**Pipeline Static Ads**
10. Comment choisis-tu, pour un concept donné, parmi les 4 angles visuels (avant/après, bénéfice, lifestyle, hero) ?
11. As-tu une préférence ou règle sur la composition visuelle (où va le texte, la hiérarchie, les zones à ne jamais couvrir) ?
12. Comment doit s'afficher une offre/promo sur un statique (badge, bandeau, overlay prix barré, etc.) ?
13. Combien de variantes statiques génères-tu habituellement par concept/angle ?
14. As-tu des exemples de statiques que tu juges réussis, pour calibrer le style ?
15. Pour le format "Text-based Lettre" : as-tu une mise en forme précise en tête (police, couleur de fond, structure) ?

**Pipeline UGC**
16. As-tu un découpage temporel précis pour un script UGC (à quelle seconde l'agitation commence, où la preuve arrive, où le CTA arrive) ?
17. Parmi les 40+ avatars Higgsfield (ou un avatar personnalisé), lesquels correspondent à ta marque/ton marché ?
18. As-tu des préférences de voix (accent, âge, genre, énergie) ?
19. Le ton doit-il varier précisément entre les types (Testimonial vs Founder Story vs Ugly Ads) — si oui comment exactement ?
20. As-tu des règles de sous-titrage (police, couleur, position, timing) ?
21. Utilises-tu de la musique/ambiance sonore systématiquement, ou seulement pour certains types ?
22. As-tu des scripts UGC passés que tu juges réussis, à me donner comme référence ?
23. Le système doit-il respecter une durée précise par type (au-delà des deux exemples du playbook : 15-30s général, 60-120s Founder Story) ?

**Pipeline Native Ads**
24. Si tu veux un pipeline Native distinct d'Ugly Ads/Text-based Lettre : quelles sont ses règles créatives précises ?
25. Si TikTok est dans le périmètre : as-tu des contraintes techniques précises (durée, ratio, sous-titres obligatoires) ?
26. As-tu des exemples de native ads que tu juges réussies ?

**Pipeline Direct Response**
27. Si c'est un livrable séparé, sur quelle plateforme/format vit-il (post long Facebook, landing page, advertorial, email) ?
28. Quelle longueur vises-tu ?
29. As-tu des exemples de Direct Response que tu juges réussis ?

**Bibliothèques personnelles**
30. As-tu une bibliothèque de hooks gagnants à me fournir ?
31. As-tu une bibliothèque d'angles déjà validés à me fournir ?
32. As-tu une bibliothèque d'objections récurrentes par niche à me fournir ?
33. As-tu une bibliothèque de structures d'offre/bundle à me fournir ?
34. As-tu un compte Foreplay (ou équivalent) avec des swipes sauvegardés que tu peux me décrire/partager ?

**Technique**
35. As-tu accès à une documentation officielle Higgsfield (format de prompt, paramètres API) que tu peux me transmettre ?
36. As-tu déjà utilisé l'API fal.ai ou Higgsfield manuellement — sais-tu à quoi ressemble une vraie réponse de leur API ?

---

## SECTION 6 — RISQUES D'HYPOTHÈSES

**Assumer que "Native" = Ugly Ads/Text-based sans confirmation.** Si tu avais une définition différente en tête, je construirais soit un doublon inutile, soit je manquerais le vrai pipeline que tu veux.

**Assumer Meta-only sans confirmation.** Si TikTok est prévu, toute la structure de routage du Bloc 6 (et potentiellement les contraintes de format) devrait être repensée — coûteux à corriger après coup.

**Assumer une charte de marque générique (couleurs par défaut, police système).** Ça produirait des statiques visuellement incohérents avec ta vraie marque — exactement le genre d'invention que tu refuses.

**Garder fal.ai par défaut sans trancher avec Higgsfield Images.** Je construirais potentiellement le mauvais pipeline technique, à refaire si tu voulais suivre ton playbook à la lettre.

**Extrapoler un découpage temporel UGC générique (ex: 0-3s hook, 3-8s agitation...) à partir du PAS générique.** Risque de ne pas correspondre à ta structure réelle si tu en as une plus précise en tête — je préfère te le demander.

**Assumer des avatars/voix Higgsfield par défaut.** Risque de produire des vidéos avec des visages/voix qui ne correspondent pas à ta marque ou ton marché.

**Me rabattre uniquement sur les power words/structures génériques du SOP sans vérifier si tu as tes propres bibliothèques.** Je perdrais l'opportunité d'utiliser ta vraie data si elle existe, et je produirais quelque chose de plus générique que nécessaire.

**Décider seul que "Direct Response" est juste une étiquette pour ce qui existe déjà au Bloc 5.** Si tu veux un livrable concret distinct, je raterais complètement l'objectif de ce pipeline.

**Inventer des règles de sous-titrage/musique par défaut.** Incohérence de marque, et exactement le type de "complétion de trou par hypothèse" que tu as explicitement refusé.

---

## SECTION 7 — CHECKLIST FINALE (confiance >95% avant de développer le Bloc 6)

- [ ] Périmètre plateforme confirmé (Meta seul ou Meta+TikTok)
- [ ] Définition de "Native Ads" confirmée (= Ugly Ads/Text-based, ou pipeline distinct avec ses règles)
- [ ] Définition de "Direct Response" confirmée (méthodologie déjà couverte, ou livrable séparé défini précisément)
- [ ] Outil de génération d'image statique tranché (fal.ai ou Higgsfield Images/ChatGPT Plus)
- [ ] Charte de marque fournie (couleurs hex, typographie, logo) — même minimale
- [ ] Règles de composition visuelle statique (au moins les grandes lignes : où va le texte, le CTA, l'offre)
- [ ] Avatars/voix Higgsfield identifiés pour le UGC
- [ ] Découpage temporel par type UGC précisé (au moins pour les types prioritaires : UGC Testimonial, Offer First, Unboxing)
- [ ] Règles de sous-titrage/montage CapCut précisées (ou décision explicite de laisser un réglage par défaut simple)
- [ ] Confirmation explicite : bibliothèques personnelles (hooks/angles/objections/offres) existantes ou non — et si oui, transmises
- [ ] Swipe file / exemples de créatives gagnantes transmis (si disponibles)
- [ ] Documentation officielle Higgsfield/fal.ai transmise, ou décision explicite d'avancer sans et de valider au premier test réel

Tant que cette checklist n'est pas remplie, je ne commence pas le développement du Bloc 6 — je continuerai à poser des questions plutôt que d'inventer une seule règle métier.
