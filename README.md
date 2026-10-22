# O’Run — Course d’orientation · EPS

Application autonome React / TypeScript / Vite, développée pour L. RIGAUX. Site : **https://lucasrx08.github.io/O-Run/**. Sources : **https://github.com/Lucasrx08/O-Run**.

## Utiliser

L’accueil présente les classes. Créer une classe, choisir sa couleur, ajouter les élèves un par un ou importer un CSV/XLS/XLSX, puis préparer une leçon. Chaque nouvelle leçon contient six cartes de six balises, modifiables, avec carte jointe et barème facultatif. Les préparations peuvent être copiées entre classes.

Les départs simultanés ou par vagues utilisent de grandes tuiles. Toucher un prénom arrête le chrono ; toucher la tuile arrivée puis une carte restante relance un passage. Le poste départ n’affiche que les élèves disponibles, l’arrivée les chronos actifs, le pilotage les corrections, et le mode complet toutes les fonctions. Affichage terrain : prénom et initiale du nom.

**Mode local opérationnel.** Le bandeau indique « Local » tant qu’aucun espace partagé n’est rejoint. Une nouvelle installation démarre vide. Les données déjà présentes ne sont pas effacées ; les exemples peuvent être chargés explicitement dans les réglages.

## Correction et classement

Deux onglets distincts : **Correction** et **Classement**. La correction affiche d’abord les arrivées en attente et retire immédiatement un résultat validé. Les résultats corrigés restent accessibles.

Dans Classement, choisir **cette leçon** ou **toutes les leçons**, puis l’une des quatre vues :

- **Général** : nombre de cartes effectuées et corrigées décroissant, total de balises correctes décroissant, puis temps moyen croissant.
- **Par carte** : balises correctes décroissantes, puis temps brut croissant ; meilleur passage par élève.
- **Balises** : total de balises correctes décroissant, puis temps moyen croissant.
- **Par élève** : détail de ses cartes, balises correctes, balises fausses et temps.

Pour valoriser les cartes différentes, une carte ne compte qu’une fois par élève et par leçon ; une répétition retient le meilleur passage corrigé. Les absences et cartes non tentées ne produisent aucun zéro. Les résultats non corrigés ne reçoivent ni rang ni couleur de zéro.

Toutes les colonnes sont triables ; les rangs officiels restent ceux du classement choisi. Le PDF conserve l’ordre de tri affiché.

Couleurs iDoceo (reprises de la référence fournie) :

| Niveau couleur | Cartes | Balises fausses / manquantes |
|---|---|---|
| Vert | 4 ou plus | 0 |
| Jaune | 3 | 1–2 |
| Orange | 2 | 3–4 |
| Rouge | moins de 2 | plus de 4 |

Ces repères de participation et de précision sont distincts des niveaux d’évaluation d’un barème. Le CSV iDoceo contient les deux repères séparés, sans inventer une note globale. Le PDF comporte le nom de classe en grand, la leçon ou la dernière leçon comptabilisée, le décor d’orientation et les couleurs ; aucun en-tête générique ni pied de page de navigateur n’y est ajouté. Le bouton d’impression prépare ce PDF à imprimer.

## Connecter plusieurs appareils

Un serveur Supabase dédié est nécessaire. **Il n’a pas pu être créé lors de cette mise à jour : le compte a déjà ses deux projets gratuits actifs (AS Bon Sauveur et Gestion Cross).** Aucun de ces projets n’a été modifié, arrêté ou supprimé.

Quand un emplacement de projet est disponible : installer le schéma `supabase/schema.sql` sur un projet dédié en région UE, créer les comptes autorisés, puis renseigner l’URL et la clé **publishable** dans **Réglages → Appareils** de chaque appareil. Les variables Vite équivalentes sont aussi supportées. Ne jamais renseigner une clé secrète ou service_role dans le client.

L’enseignant doit chiffrer le stockage local avant sa connexion, partager les classes et leçons, puis autoriser les comptes départs/arrivées. Les comptes doivent rejoindre le même espace. L’interface seule et GitHub ne synchronisent pas les données. Les règles SQL contrôlent les droits et réduisent les noms transmis aux postes. Le serveur est préparé pour plusieurs leçons d’un même espace ; il reste à installer et à tester sur le projet réel.

## Développer et publier

Node.js 22.12+ et npm :

```sh
npm ci
npm test
npm run build
npm run dev
```

`dist/` contient la PWA et les fontes locales. GitHub Actions vérifie les tests et publie automatiquement les mises à jour de `main` sur GitHub Pages ; le lancement manuel reste disponible. Pour un autre hébergeur, publier `dist/` en HTTPS. Le chemin relatif par défaut permet un déploiement portable ; le workflow Pages adapte le chemin au nom du dépôt.

Voir [MIGRATION_GITHUB.md](docs/MIGRATION_GITHUB.md) pour reprendre le code et transférer les données via sauvegarde JSON, [TESTS.md](docs/TESTS.md) pour les vérifications, et les guides de sécurité et de protection des données pour la mise en service dans l’établissement.
