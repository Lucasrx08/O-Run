# O’Run — correction des vues et de la charte

Cette mise à jour corrige les problèmes visibles dans les captures de l’utilisateur : orange trop sombre, carte de leçon étirée, six cartes débordant sous la fenêtre, élèves coupés et classements empilés inutilement.

## Changements

- Orange vif `#FF7900`, vert clair `#58B58A`, sélections vert pâle et texte foncé. Le texte sur les actions orange est foncé pour conserver sa lisibilité.
- Une leçon seule garde une largeur de carte de 280 à 340 pixels ; elle ne s’étire plus sur toute la ligne. Les métadonnées, la copie et la suppression restent dans la carte.
- Les actions « Copier la leçon » et « Ajouter une carte » partagent maintenant une vraie barre d’actions. Suppression du placement absolu de la copie.
- Sur ordinateur et tablette d’au moins 700 pixels de large et 500 pixels de haut, la leçon occupe la fenêtre. Les en-têtes sont compacts et les six cartes se partagent l’espace restant ; leur taille ne dépend plus d’une grande hauteur minimale fixe.
- La grille du terrain utilise le rectangle réellement disponible et peut monter à dix colonnes selon sa largeur. La typographie du prénom et du chrono tient compte de la hauteur de la tuile. Les deux éléments ne se compressent plus l’un sur l’autre.
- Sur téléphone, six élèves par page, recherche sur toute la classe et boutons précédent/suivant. La pagination ne change pas les élèves sélectionnés pour le départ collectif.
- À partir de 1100 pixels, les deux moitiés d’un classement sont côte à côte. Les barres de navigation et les exports restent visibles ; le classement défile dans sa propre zone si nécessaire. Sur les écrans plus étroits, les tableaux conservent leur défilement interne.
- Podiums réduits, lignes de tableaux compactes, repères de couleur moins saturés, noms complets accessibles par leur infobulle lorsqu’une colonne étroite impose une ellipse. Les couleurs et données des exports restent inchangées.
- Code enseignant à quatre chiffres et fonctions métier conservés.

## Contrôles réalisés

155 tests réussis, dont quatre cas supplémentaires de dimensionnement pour 25 et 36 élèves, et un parcours de pagination mobile qui vérifie que la sélection de la classe est conservée. Compilation TypeScript et build Vite/PWA réussis.

Contrôles de mise en page réalisés dans Chrome, à l’aide de fenêtres intégrées de dimensions exactes. Ce sont des formats simulés, pas des essais sur des appareils physiques :

| Format | Vérification |
| --- | --- |
| 1280 × 650 | Six cartes sans débordement de leur grille ; 36 élèves visibles ; hauteur de page égale à la fenêtre |
| 1024 × 768 | 36 élèves visibles, absence de chevauchement prénom/chrono, hauteur de page égale à la fenêtre |
| 768 × 1024 | 36 élèves visibles ; résultats accessibles sans débordement de la page |
| 390 × 844 | Six élèves par page, boutons de pagination visibles, passage aux élèves 7 à 12, quatre destinations de navigation visibles, hauteur de page égale à la fenêtre |

Un jeu de 36 arrivées a été créé, arrêté puis corrigé dans l’interface afin de contrôler les tableaux avec un effectif complet. Les données de contrôle sont fictives et restent dans le navigateur de prévisualisation.

Pour les classements volumineux, le défilement interne est volontaire : afficher tous les résultats sur un petit téléphone en conservant leur lisibilité n’est pas possible. Le zoom utilisateur reste autorisé et peut également rendre un défilement nécessaire.

Cette validation couvre l’interface et les parcours testés. Une publication commerciale demande aussi une validation sur Safari et les appareils visés, ainsi que les vérifications de service, de sécurité et de conformité adaptées au modèle de diffusion ; cette mise à jour ne prétend pas certifier ces éléments.
