# Rapport de vérification — O’Run 2.0

Exécution du 22 octobre 2026, uniquement avec des données fictives. Ces vérifications locales ne remplacent ni une recette sur iPad ni un audit de l’infrastructure de production.

## Résultats automatisés

`npm test` : **107 tests réussis, 0 échec**, dans dix fichiers.

| Ensemble | Tests | Périmètre |
|---|---:|---|
| Règles métier | 31 | Départ individuel et simultané, doublons, idempotence, pauses, STOP, réouverture motivée, correction et révision, pénalités, niveaux, classements, homonymes, CSV et caractères de formule |
| Stockage | 7 | Rechargement, écritures concurrentes, chiffrement et mauvaise phrase secrète, restauration invalide, rôle conservé, reprise après conflit sans effacer une nouvelle opération |
| Serveur SQL | 19 | PostgreSQL PGlite : rôles, refus anonyme et hors séance, accès direct interdit, noms réduits, notifications RLS, commandes séquentielles de plusieurs comptes, doublons, révisions, expiration et purge |
| Classes et leçons | 9 | Classes vides, défaut 6 × 6, copie indépendante dans la même classe ou une autre, fichiers et historique préservés, anciennes leçons, renommage, ajout aux bons groupes, instant commun, arrêt/redépart et garde des vagues |
| Classements de réussite | 7 | Priorité aux balises puis au temps, meilleur passage, ex æquo, taux pondéré selon les balises attendues, répétitions, passages non corrigés/actifs, séparation des versions de parcours |
| Barème et grille | 10 | Temps seul, balises seules, combinaison, anciennes données, pénalités, refus sans critère ; grilles 24–36 élèves sur quatre dimensions de zones, UUID en aperçu HTTP |
| Interface | 9 | DOM jsdom : classe → élève → leçon → cartes → départ → arrêt → nouvelle carte → correction → copie et affichage des classements par parcours/général ; import sans colonne Classe ; simultané sur cartes différentes ; vagues espacées avec suspension et reprise après remontage ; choix de carte plein écran et marquage déjà fait ; barèmes indépendants en min/s ; navigation des réglages et choix du poste |

Le scénario DOM contrôle le comportement des composants React. Il ne vérifie pas le rendu de Safari, les gestes tactiles, le déclenchement réel d’un téléchargement ni la lecture du fichier dans iDoceo. Les tests SQL simulent le contexte Auth ; ils n’exercent pas un projet Supabase distant, son réseau, Auth hébergé ou Realtime.

`npm run build` : TypeScript sans erreur, bundle de production et service worker générés. Le service worker vise uniquement les fichiers statiques ; les réponses API ne sont pas ajoutées à son cache.

Audit de production du 22 octobre : zéro vulnérabilité signalée. Ajout des lecteurs XLS/XLSX et du générateur PDF.

## Vérification visuelle dans Chrome

Aperçu interne, fenêtre de 1363 × 936 px, données fictives : accueil, nouvelles fontes, cartes de leçon, import par collage CSV, tableau de course avec 24 puis 32 élèves. Les rectangles des 32 tuiles étaient tous à l’intérieur de la fenêtre ; la hauteur de page était égale à celle de la fenêtre, sans défilement. Le choix suivant occupait 1363 × 936 px, avec les cartes restantes uniquement. Les réglages ont été contrôlés visuellement. Cette vérification ne remplace pas un essai sur iPad ni le mode tactile natif.

## Éléments non encore vérifiés en conditions réelles

- Safari sur un iPad physique, en portrait et paysage : à vérifier. Les calculs de grille ont été testés sur des zones de dimensions 976 × 505 et 720 × 760, sans constituer une recette Safari.
- Installation PWA dans Safari, premier chargement, mode avion, suspension puis reprise, éviction du stockage et mise à jour de version.
- Fonctionnement sur deux puis trois appareils physiques, latence, perte de réseau, précision relative des horloges et notifications Realtime.
- Configuration Auth, habilitations, expiration, cron de purge, sauvegardes et restauration d’un projet Supabase dédié.
- Import du CSV dans la version d’iDoceo utilisée par l’établissement. Le CSV contient une ligne par passage ; vérifier l’association des colonnes et le traitement des passages multiples. Aucune reprise automatique des couleurs n’est promise.
- En-têtes HTTP/CSP, politique de cookies, journaux et contrôles de sécurité propres à l’hébergement retenu.

## Recette terrain à réaliser avec des élèves fictifs

1. Sur un appareil : importer une petite classe, vérifier les homonymes, créer une leçon et vérifier ses six cartes de six balises ; modifier et retirer une carte, copier la leçon dans une autre classe puis enchaîner deux passages d’un même élève.
2. Lancer une vague puis suspendre/reprendre la file. Mettre l’application en arrière-plan : aucun départ en retard ne doit être lancé automatiquement. Vérifier chaque participant au retour.
3. Fermer puis rouvrir l’application pendant une course, toucher la tuile pour arrêter, puis la toucher de nouveau pour choisir une autre carte. La durée doit se recalculer à partir des instants enregistrés. Le second appui doit ouvrir le choix de carte ; aucun redépart ne doit avoir lieu sans choisir la carte.
4. Corriger les balises, vérifier la pénalité, réouvrir avec un motif puis fermer la course. Vérifier l’historique et la conservation des autres passages.
5. Exporter vers iDoceo, contrôler noms, identifiants, temps et passages multiples ; imprimer les résultats et relire les pages.
6. Installer la PWA, ouvrir une fois en ligne, passer en mode avion et refaire un départ/arrivée. Reconnecter sans perdre les résultats.
7. Sur deux puis trois appareils autorisés : dédier les rôles départs, arrivées et enseignant. Vérifier les refus d’accès, la suppression des noms complets des réponses terrain et les arrivées simultanées.
8. Couper le réseau d’un poste. Les opérations doivent rester signalées en attente. Reconnecter ; provoquer un conflit de correction, exporter la file, vérifier la copie téléchargée puis reprendre le serveur sous contrôle enseignant.
9. Chiffrer, verrouiller, tester une phrase incorrecte, rouvrir avec la bonne phrase et contrôler une sauvegarde. Purger les résultats puis vérifier la suppression sur les postes connectés.

Consigner l’appareil, la version du navigateur, l’heure, le scénario, le résultat attendu/observé et les anomalies. L’ouverture aux données réelles reste conditionnée à la recette et aux validations de l’établissement décrites dans le dossier RGPD.

## Dernière mise à jour

Neuf tests supplémentaires couvrent les couleurs, la suppression isolée de classes, les fichiers XLS/XLSX, la filiation des parcours copiés, le cumul sans zéros artificiels et iDoceo. Un test PDF vérifie la génération avec les fontes intégrées. Les nouveaux tests UI vérifient les postes distincts et la suppression après saisie du nom. Les deux tests SQL supplémentaires vérifient la suppression et ses gardes.

Les classements cumulés ont été contrôlés dans Chrome. Un PDF témoin a été généré et rendu pour vérifier sa typographie et sa mise en page. Le téléchargement via le navigateur distant n’a pas pu être confirmé (attente expirée) ; aucun essai sur iPad ni import dans iDoceo réel. Le schéma Supabase est fourni comme source ; aucun backend distant n’a été modifié.

## Corrections compactes et six classements

Cinq tests métier vérifient les moyennes, les taux de balises fausses, le combiné, les ex æquo et la priorité de correction. Un test UI vérifie le retrait immédiat des résultats corrigés, le maintien de la file par élève et les six vues sur la leçon comme sur le cumul.

Chrome, 1363 × 936 : dix fiches par élève tenaient dans la fenêtre de contrôle (4 colonnes, 3 lignes ; dernière ligne à 832 px). Sur les tuiles terrain contrôlées, noms de 38 px et chronos de 24 px. Tableaux par parcours et podiums compacts contrôlés visuellement. Aucun nouvel essai sur iPad physique. Les workflows GitHub ont été préparés, sans exécution distante ni nouveau site GitHub Pages : le dépôt cible a ensuite été créé et les sources y sont transférées ; le déploiement Pages reste à activer.
