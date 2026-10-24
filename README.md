# O’Run — Course d’orientation · EPS

Application autonome React / TypeScript / Vite, développée pour L. RIGAUX. Site : **https://lucasrx08.github.io/O-Run/**. Sources : **https://github.com/Lucasrx08/O-Run**.

## Utiliser

L’accueil présente les classes. Créer une classe, choisir sa couleur, ajouter les élèves un par un ou importer un CSV/XLS/XLSX, puis préparer une leçon. Chaque nouvelle leçon contient six cartes de six balises, modifiables, avec carte jointe et barème facultatif. Les préparations peuvent être copiées entre classes.

Les départs simultanés ou par vagues utilisent de grandes tuiles. Toucher un prénom arrête le chrono ; toucher la tuile arrivée puis une carte restante relance un passage. Le poste départ n’affiche que les élèves disponibles, l’arrivée les chronos actifs, le pilotage les corrections, et le mode complet toutes les fonctions. Affichage terrain : prénom et initiale du nom.

**Mode local uniquement.** O’Run n’utilise plus de synchronisation serveur. Une nouvelle installation démarre vide ; les données existantes restent enregistrées sur leur appareil. Le stockage local peut être protégé par une phrase secrète depuis Mon poste.

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

| Niveau couleur | Cartes | Balises fausses |
|---|---|---|
| Vert | 4 ou plus | 0 |
| Jaune | 3 | 1–2 |
| Orange | 2 | 3–4 |
| Rouge | moins de 2 | plus de 4 |

Ces repères de participation et de précision sont distincts des niveaux d’évaluation d’un barème. Le CSV iDoceo contient les deux repères séparés, sans inventer une note globale. Le PDF comporte le nom de classe en grand, la leçon ou la dernière leçon comptabilisée, le décor d’orientation et les couleurs ; aucun en-tête générique ni pied de page de navigateur n’y est ajouté. Le bouton d’impression prépare ce PDF à imprimer.

## Séance hors ligne sur trois appareils

Depuis **Réglages → Appareils**, choisir une leçon sur le Mac ou l’iPad central (poste **C**). O’Run partage les élèves en deux moitiés équilibrées dans l’ordre alphabétique des noms ; chaque élève peut être déplacé manuellement avant validation.

1. Configurer C puis envoyer par **AirDrop** la préparation « A » au premier iPad et « B » au second.
2. Sur chaque iPad, importer le fichier reçu depuis **Appareils**. L’iPad ne reçoit que les élèves de son groupe, affichés avec leur prénom et l’initiale du nom, et chronomètre leurs départs, arrivées et redéparts.
3. Sur C, corriger les cartons de contrôle au fur et à mesure : sélectionner l’élève, sa carte et le numéro de passage, puis saisir **uniquement le nombre de balises fausses**. Les chronos ne sont pas nécessaires à ce stade.
4. En fin de séance, arrêter tous les chronos sur A et B et choisir **Envoyer les chronos à C**. Le fichier de chronos chiffré est partagé manuellement par AirDrop, sans synchronisation automatique. Si le partage système n'est pas disponible, le fichier est téléchargé et peut être envoyé depuis l'application Fichiers.
5. Sur C, importer les deux fichiers reçus. Les résultats sont associés grâce aux identifiants de leçon, élève, carte et numéro de passage. Les réimportations identiques ne créent aucun doublon ; les fichiers incohérents sont refusés.

**Le mode appareil unique est conservé.** Le scanner de cartons poinçonnés est une piste future et ne fait pas partie de ce mode.

**Protection des données :** la préparation initiale contient uniquement les prénoms et initiales nécessaires aux tablettes ; le fichier de chronos utilise un chiffrement AES-GCM propre à la séance. Les fichiers de préparation doivent néanmoins être conservés dans un emplacement protégé et supprimés une fois importés. AirDrop est un transfert manuel entre appareils Apple, pas une synchronisation. La validation RGPD du traitement et la sécurité des appareils restent à organiser avec l’établissement.

L'ancien code de serveur situé dans `supabase/` et les anciens tests de connexion sont conservés uniquement comme références historiques : l’interface courante ne propose plus de connexion à ce service.

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
