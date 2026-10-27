# Audit et refonte de l’interface O’Run — 27 octobre 2026

> Cet audit décrit la première version. Les corrections demandées ensuite et leur validation sont détaillées dans [la refonte compacte](REFONTE_COMPACTE_2026-10-27.md).

## Périmètre

Analyse du code de la branche main, des parcours de classe, de leçon, des cartes, de l’organisation des appareils, du terrain, de la correction, des classements, des réglages et du kiosque élève. Refonte du système visuel partagé en conservant les données et les fonctions métier existantes. L’application reste hébergée sur GitHub Pages ; aucune migration vers un nouvel hébergement n’est nécessaire.

## Constats et corrections

| Priorité | Constat dans le code | Modification |
| --- | --- | --- |
| Haute | Zoom bloqué par la balise viewport et des événements tactiles | Suppression du blocage du zoom, conservation du viewport adapté aux encoches |
| Haute | Code enseignant de 4 à 6 chiffres | Nouveau code de 4 chiffres exactement, pavé tactile et confirmation |
| Haute | Risque de bloquer les appareils avec un ancien code long | Vérification de l’ancien code avant remplacement ; aucune suppression automatique du code |
| Haute | Terrain et kiosque en hauteur fixe avec débordement masqué | Contenu défilable et hauteur minimale des tuiles ; deux colonnes sur téléphone |
| Haute | Colonnes des résultats masquées entre 900 et 1320 pixels | Colonnes conservées et défilement horizontal local au tableau |
| Moyenne | Navigation de leçon absente depuis Organisation | Organisation, Cartes, Départs & arrivées et Résultats restent accessibles |
| Moyenne | Superposition de styles avec tailles et cibles différentes | Remplacement de la couche de finition par des règles communes de dimensions, couleurs et espacements |
| Moyenne | Texte de formulaire trop petit sur iPhone | Champs à 16 pixels, pour éviter notamment le zoom automatique lors de la saisie |
| Moyenne | Petites cibles de commande | Boutons usuels de 44 à 46 pixels minimum, pavé numérique de 60 pixels |
| Moyenne | Tuiles de cartes disproportionnées et grilles irrégulières | Trois colonnes sur ordinateur, deux sur tablette, une sur téléphone ; cartes de 185 à 205 pixels |
| Moyenne | Effets et titres hétérogènes | Fond neutre, surfaces blanches, bordures discrètes, orange d’action et vert de navigation |
| Moyenne | Dialogues peu pratiques sur petit écran | Largeur bornée par le viewport, défilement interne, actions en pied de fenêtre |
| Basse | Animations sans préférence utilisateur | Respect de prefers-reduced-motion |

## Organisation des vues

- Accueil : classes, action principale « Nouvelle classe », réglages dans l’en-tête.
- Classe : onglets Leçons / Élèves ; création, import et recherche conservés.
- Leçon : titre et contexte à gauche, navigation au même emplacement logique sur chaque vue. Sur écran étroit, navigation sous le titre.
- Cartes : grille homogène ; modification et suppression au même emplacement dans chaque carte.
- Appareils : choix 1 / 2 / 3 appareils conservé, dispositions fluides et cibles agrandies.
- Terrain : chronos tabulaires, noms lisibles, recherche et commandes conservées. Le défilement prime sur la réduction excessive des tuiles.
- Correction : grille fluide, commandes de fautes de 44 pixels minimum.
- Classement : tableau unique jusqu’à 1599 pixels, deux colonnes sur très grand écran ; aucune donnée supprimée pour gagner de la place.
- Réglages : panneaux fluides, champs lisibles et fonctions existantes conservées.
- Kiosque : accès enseignant au pavé numérique, élèves limités au terrain. Le déverrouillage des postes A/B conserve leurs restrictions existantes.

## Charte et dimensions

Orange principal : `#C94E0C`. Vert principal : `#216348`. Texte : `#173C30`. Fond : `#F4F7F4`. Surfaces : blanc. Les couleurs individuelles des cartes sont conservées pour leur identification pédagogique.

Les points de rupture principaux sont 600, 1000 et 1600 pixels. Ils suivent la largeur disponible, plutôt qu’une détection de marque d’appareil. Les dispositions s’appliquent donc aux Mac, PC, iPad et iPhone selon leur fenêtre, leur orientation et leur niveau de zoom.

## Vérification

- Contrôle TypeScript et build Vite/PWA.
- 150 tests automatisés réussis : les 148 existants et deux nouveaux parcours du code enseignant.
- Nouveaux tests : limitation à quatre chiffres avec confirmation puis déverrouillage ; vérification et migration d’un ancien code à six chiffres.
- Contrôle visuel dans Chrome de la création de classe, de l’import collé, de la création de leçon, des six cartes, du choix d’appareils, du terrain, des résultats et des réglages.

## Limites et suite de validation

Le contrôle visuel a été effectué dans le navigateur de prévisualisation disponible, pas sur des appareils physiques Apple. Les tests automatisés DOM ne constituent pas une validation de mise en page Safari. Avant une utilisation de classe, vérifier sur iPhone et iPad réels : portrait/paysage, clavier ouvert, zoom à 200 %, liste de 30 à 36 élèves, caméra QR et AirDrop. Aucun résultat d’essai physique n’est revendiqué.

Le code à quatre chiffres est un verrou contre les manipulations en mode élève. Il ne remplace pas le chiffrement des données ni une authentification serveur. Le chiffrement local existant conserve sa phrase secrète distincte. Cet audit porte sur l’interface et les parcours ; il ne constitue pas une certification RGPD ni un audit de sécurité du serveur.

Les deux feuilles historiques de structure restent chargées. La couche finale est remplacée, mais la suppression complète des règles historiques nécessiterait une extraction composant par composant et une campagne de tests visuels dédiée. La refonte ne prétend pas avoir réalisé cette extraction.
