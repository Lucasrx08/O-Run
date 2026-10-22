# O’Run — Course d’orientation · EPS

Application React / TypeScript / Vite, orange et blanc, développée pour L. RIGAUX.

**Version 2.0 de démonstration : données fictives uniquement.** Le mode mono-appareil est opérationnel. Le mode Supabase est fourni avec son schéma et ses tests SQL ; son activation et sa recette sur un vrai réseau restent nécessaires.

## Essayer

L’accueil présente uniquement les classes. Ouvrez une classe, ajoutez ses élèves puis créez une leçon. Une nouvelle leçon contient **6 cartes de 6 balises**, entièrement modifiables. Les anciennes préparations et les résultats déjà enregistrés sont conservés.

Dans la leçon, choisissez **Départs**, puis un départ simultané ou par vagues. Chaque élève a une grande tuile : un appui arrête son chrono ; un nouvel appui ouvre les cartes ; choisir une carte lance immédiatement un nouveau passage. Les passages précédents restent disponibles dans **Résultats**.

Pour réutiliser une préparation : **Copier la leçon**, ouvrir la classe souhaitée, puis **Coller la leçon**. La copie utilise les élèves de la destination et des cartes indépendantes, sans reprendre les résultats.

La première ouverture ajoute deux classes fictives, des cartes et des exemples de résultats pour essayer l’application. Aucune course ne part automatiquement.

## Développer

Node 22.12+ recommandé, npm et navigateur récent.

```sh
npm ci
npm test
npm run build
npm run dev
```

Le build produit `dist/`, avec manifest et service worker. Les icônes PNG et SVG sont fournies ; aucune génération d’image ni police distante n’est nécessaire au build.

## Fonctionnalités

- Tableau de bord épuré, navigation par classe puis leçon, mise en page adaptative orange et blanc. Identité nature avec cartes topographiques, tracés d’orientation, titres Outfit et textes Nunito Sans, fontes hébergées dans l’application.
- Classes : création, couleur, renommage et suppression ; ajout, modification et import CSV/XLS/XLSX des élèves, même sans colonne Classe.
- Leçons : création, modification et copier-coller dans la même classe ou une autre ; 6 cartes de 6 balises par défaut.
- Cartes : ajout/retrait, couleur, nombre de balises, fichier PNG/JPEG/PDF ; distance, pénalité et barème facultatif dans les réglages avancés. Temps de barème en minutes et secondes ; critère temps et critère balises fausses indépendants. Paramètres figés dans chaque passage.
- Terrain : grille calculée pour afficher toute la classe dans la fenêtre sans défilement, zoom gestuel désactivé ; grandes tuiles prénom + initiale, homonymes numérotés ; départ simultané avec un instant commun même sur plusieurs cartes ; départ par vagues avec taille et intervalle réglables.
- Arrivée au toucher, puis choix d’une nouvelle carte pour repartir. Le choix de la nouvelle carte s’affiche en plein écran avec un marquage rouge des cartes déjà réalisées. Un élève ne peut avoir qu’un seul chrono actif. Les vagues se suspendent en arrière-plan, à la sortie de l’écran, en cas de retard ou de changement d’horloge ; reprise explicite.
- Classements : par parcours, meilleur passage de chaque élève selon les balises réussies puis le temps brut ; au général, total des balises réussies divisé par les balises attendues sur tous les passages corrigés. Les répétitions comptent au général ; les passages non corrigés sont signalés et exclus du taux. Ex æquo conservés, exports CSV propres à chaque vue.
- Résultats : grandes fiches par élève ou par parcours, correction des balises, annulation motivée d’une arrivée, historique des modifications, niveau selon le barème, PDF avec fontes intégrées, impression et export iDoceo avec noms complets et identifiants stables.
- Réglages : rubriques visuelles, choix explicite du poste puis bouton d’activation ; sauvegardes, protection, appareils et entretien accessibles séparément.
- Persistance IndexedDB, transactions avec contrôle de version, synchronisation entre onglets du même navigateur, chiffrement local optionnel AES-GCM, sauvegarde/restauration JSON.
- PWA et cache limité aux fichiers statiques de l’application. Les API et données des élèves ne passent jamais dans le cache du service worker.
- Synchronisation Supabase configurable : authentification, rôles par séance, commandes atomiques, reprise des envois, notifications Realtime et interrogation périodique de secours.

## Architecture

`src/domain` : règles de course, types, CSV et données fictives.
`src/services` : stockage, chiffrement, horloge, téléchargement et adaptateur Supabase.
`src/pages` : interfaces par usage.
`supabase/schema.sql` : source SQL à placer dans une migration générée par la CLI.
`tests` : règles métier, persistance, workflow utilisateur DOM, SQL et autorisations.
`docs` : installation, sécurité, RGPD, limites et recette terrain.

## Déploiement

Démo privée : https://o-run-eps.lucasrigaux8.chatgpt.site

Cible GitHub initialement demandée : `Lucasrx08/O-Run`, GitHub Pages à `https://lucasrx08.github.io/O-Run/`. Le workflow est prêt dans `.github/workflows/deploy.yml`. Cette URL est une **cible**, pas une preuve de publication.

Voir [installation](docs/INSTALLATION.md), [sécurité](docs/SECURITE.md), [dossier RGPD](docs/RGPD.md) et [tests](docs/TESTS.md). Aucun élève réel, secret, mot de passe ou export nominatif n’est inclus dans ce dépôt.

Après une mise à jour, fermer tous les onglets O’Run puis rouvrir l’application permet à la nouvelle version mise en cache de prendre la main. Ne pas effacer les données du navigateur.

Les classements cumulés regroupent les leçons disponibles de la classe. Les absences et cartes non tentées n’ajoutent aucun zéro. Les postes départs affichent les élèves disponibles, les arrivées uniquement les chronos actifs, et le pilotage uniquement les corrections. Le choix suivant ne présente que les cartes restantes.

## Projet autonome sur GitHub

Dépôt : **https://github.com/Lucasrx08/O-Run**.

Le guide [MIGRATION_GITHUB.md](docs/MIGRATION_GITHUB.md) explique l’import des sources, le développement avec VS Code et Node, les workflows et le transfert des données par sauvegarde. Le projet ne dépend pas de ChatGPT pour fonctionner. Les vérifications GitHub sont automatiques ; le déploiement Pages est manuel pour permettre de choisir l’audience avant publication.

## Corrections et classements

« À corriger » est la file initiale ; enregistrer un résultat le retire immédiatement. Les arrivées en attente sont traitées dans l’ordre, les corrigés restent accessibles dans leur onglet. Six vues sont disponibles sur la leçon comme sur le cumul : réussite globale, parcours, élève, temps moyen, balises fausses et combiné. Le combiné classe par réussite, puis temps moyen. Les fiches de correction sont compactes ; les classements utilisent des tableaux avec podium réduit.
