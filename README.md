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

## Une leçon, un à trois appareils — QR codes hors ligne

Dans **Mes classes → Leçon**, commencer par choisir l’organisation de la séance :

| Mode | Départs et arrivées | Correction / résultats | Répartition |
|---|---|---|---|
| **1 appareil** | Appareil principal | Même appareil | Aucune |
| **2 appareils** | **Tablette A** | **Poste C** (Mac ou iPad) | A gère la classe entière |
| **3 appareils** | **Tablettes A et B** | **Poste C** (Mac ou iPad) | A : première moitié alphabétique ; B : seconde moitié |

La répartition en trois appareils est **alphabétique, équilibrée et ajustable** dans la leçon. Elle reste enregistrée avec la leçon. Si un iPad ne fonctionne plus, **une même tablette peut scanner les préparations A et B**, sans perdre les chronos déjà saisis.

**Préparation des iPads (modes 2 et 3).** Sur C, choisir le mode, l'enregistrer, puis toucher « QR Tablette A » et, en mode 3, « QR Tablette B ». Sur l'iPad, ouvrir **Réglages → Mon poste → Tablette A/B**, puis scanner les QR codes affichés sur C. Si une préparation dépasse la capacité d'un seul code, O’Run affiche une courte série numérotée à scanner entièrement. L’ancienne importation de fichiers `.json` reste accessible dans le volet de secours des réglages.

**Pendant la séance.** Les grandes tuiles sur A/B servent à démarrer et arrêter les chronos. Sur C, ouvrir **Résultats → Correction** : les élèves apparaissent sous forme de tuiles, et leurs cartes sont corrigées à partir des cartons papier, y compris avant réception des chronos. Plusieurs cartons d’un élève peuvent être enregistrés ensemble.

**Fin de séance.** Sur chaque iPad, lorsque tous les chronos sont arrêtés, toucher **QR des chronos A** ou **QR des chronos B**. Sur C, ouvrir **Résultats → Correction → Scanner les chronos A / B**, puis scanner le ou les codes. Les temps se réunissent automatiquement avec les corrections déjà enregistrées ; un second scan identique ne crée pas de doublon. En cas d’impossibilité de lecture, utiliser **Fichier de secours (AirDrop)**. Les exports de chronos sont nommés `Chronos_Tablette_A.json` et `Chronos_Tablette_B.json`. Le **Classement** reste dans les résultats de cette même leçon, sans espace supplémentaire.

**Capacité des QR codes :** un seul QR code peut contenir les chronos d'une tablette pour une séance habituelle, grâce à une représentation compacte. Si le volume de données est trop important, l'application affiche plusieurs QR codes numérotés ; le fichier de secours reste disponible.

**Protection des données :** aucune donnée n’est envoyée à un serveur ni synchronisée automatiquement. La préparation QR ne contient que les prénoms et initiales nécessaires au terrain, mais ces informations restent des données personnelles. Les QR de chronos ne transportent ni noms ni clé secrète, et leur contenu est chiffré en AES-GCM avec une clé propre à la leçon. Protéger les appareils et leur stockage, limiter les personnes autorisées à scanner les préparations et organiser les durées de conservation avec l'établissement. L'absence de cloud ne suffit pas à elle seule à garantir la conformité RGPD.

Le scanner automatique des cartons poinçonnés reste une piste future, non activée dans cette version.

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
