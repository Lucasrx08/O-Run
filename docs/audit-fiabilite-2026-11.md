# Audit de fiabilité O’Run — 19 novembre 2026

Périmètre : source de la branche principale, données locales, mises à jour PWA, préparation/import A/B/C, chronométrage et erreurs de manipulation, sauvegardes, classements, pose-dépose et vérifications automatisées existantes. Les données d’un appareil physique de l’enseignant ne sont pas accessibles depuis cet audit.

## Constats corrigés

| Priorité | Constat vérifié dans le code | Correction |
| --- | --- | --- |
| Critique | Une commande de configuration ne vérifiait pas sa version de départ et pouvait remplacer des données plus récentes d’un autre écran. | Refus de l’enregistrement périmé, avec invitation à rouvrir la fiche. |
| Haute | Après le code enseignant, A/B restait dans une branche sans accès aux classes ou aux réglages de poste. | « Changer de poste / leçon », puis « Mes classes et leçons », sans effacement des résultats. |
| Haute | Le passage A/B vers C était interdit dès qu’un historique de chronos existait, même après les arrivées. | Changement permis après arrêt des chronos ; profils et clés conservés pour rouvrir les anciens postes. |
| Haute | L’organisation enregistrait les paramètres de leçon puis le rôle dans deux opérations indépendantes. Un refus pouvait laisser une configuration partielle. | Une seule transaction pour la leçon, le rôle et les profils. |
| Haute | Un QR de préparation pouvait remplacer des noms complets par leurs initiales. | Import non destructif : conservation des fiches présentes et de la liste complète de la leçon. |
| Haute | Une unique entrée principale était utilisée, sans copies de secours ni récupération automatique. | Copies tournantes et quotidiennes bornées, copie avant mise à jour, récupération si l’entrée manque ou est illisible. |
| Haute | Un nouvel espace vide pouvait être initialisé si l’entrée principale manquait. | Recherche des copies avant toute initialisation ; échec explicite si des données sont présentes mais illisibles. |
| Moyenne | Aucun import de sauvegarde utilisateur n’était proposé dans les réglages simplifiés. | Téléchargement complet, import contrôlé et récupération des données manquantes sans remplacer les éléments actuels. |
| Moyenne | L’actualisation était bloquée pendant les chronos mais pas pendant un enregistrement. | Blocage pendant les écritures et attente de leur fin avant la copie de mise à jour. |
| Moyenne | Le classement pose-dépose n’expliquait pas le volume de tâches réalisées. | Points nets/maximum validé, détail juste/faux par rôle et pourcentage coloré. Suppression de la colonne « À valider ». |

## Conservation et récupération

La base IndexedDB conserve son identifiant `orun-v1` et son magasin `workspace`. Les copies restent dans ce magasin. Aucun effacement de données n’est effectué par le service worker lors d’une mise à jour : il renouvelle uniquement ses caches d’interface.

Les copies respectent le chiffrement. L’activation ou le changement d’une phrase secrète rechiffre aussi toutes les copies existantes dans une transaction. Une mauvaise phrase secrète ne déclenche jamais une création d’espace vide.

La récupération ajoute les classes, élèves, leçons, attributions et résultats manquants. Les corrections déjà présentes restent prioritaires. Les postes récupérés sont proposés dans les profils enregistrés, sans activer automatiquement un kiosque. Les profils conservent les clés nécessaires aux anciens transferts. Les anciens fichiers de sauvegarde contenant directement les données sont acceptés.

Les copies internes protègent d’une entrée manquante ou d’un enregistrement erroné. Elles ne constituent pas un stockage externe : si le navigateur supprime l’ensemble des données du site, elles peuvent disparaître également. Une sauvegarde JSON téléchargée reste nécessaire pour récupérer ces données sur un autre appareil ou après un effacement complet. Les classes effacées avant l’existence de ces copies ne peuvent pas être recréées sans un fichier de sauvegarde.

## Changement de poste

Les élèves restent dans le kiosque protégé. Le menu des postes n’est accessible qu’après le code enseignant. Un changement qui cacherait un chrono actif est refusé ; des chronos terminés ne bloquent plus l’appareil. Les anciennes préparations et les résultats ne sont pas purgés lors d’un changement de poste ou de leçon. Une répartition A/B ne peut plus être modifiée après réception de chronos pour cette leçon.

## Classement pose-dépose

Chaque rôle conserve le barème demandé : +1 si juste, −1 si faux. Les maximums comptent les tâches validées uniquement. Par exemple, quatre balises justes et une fausse donnent `3 / 5`, soit 60 %. Un score net négatif conserve sa valeur en points, avec un pourcentage ramené à 0 %. Sans balise validée, le résultat reste neutre et aucun rang n’est affiché.

| Total net / maximum possible | Couleur |
| --- | --- |
| 100 % | Vert |
| 80 % à moins de 100 % | Jaune |
| 60 % à moins de 80 % | Orange |
| Moins de 60 % | Rouge |

Les couleurs reprennent les quatre couleurs d’évaluation déjà utilisées par O’Run/iDoceo. Les seuils sont calculés sur le rapport exact avant l’affichage du pourcentage. Le classement conserve son ordre par points nets ; les détails permettent de comparer les volumes de pose et de vérification. Les deux périmètres, leçon et cumul, utilisent le même calcul.

## Validation

Tests ajoutés : retour du kiosque vers les classes puis C, conservation des profils, refus de sortie pendant un chrono actif, atomicité d’une organisation refusée, récupération d’entrée absente ou corrompue, absence d’initialisation destructive, récupération non destructive, chiffrement des copies et changement de phrase secrète, copie après fin des écritures, import de sauvegarde, conservation des noms complets après QR, calcul des points possibles et seuils 100/80/60.

Les tests existants couvrent également départs par vagues, pause/reprise, rotation des cartes, annulation de départ, sauvegarde chiffrée, imports/exports QR, corrections, classements, export PDF et règles de pose-dépose. La compilation TypeScript et la construction de production sont exécutées avant publication. Un contrôle sur iPad/Safari avec les données et conditions réelles de l’enseignant reste distinct de ces vérifications.

## Complément du 24 novembre 2026

- Intégration du témoin de stockage préparé le 21 novembre, jusque-là absent de `main`. Si un espace connu disparaît, l’application propose la récupération et n’initialise plus silencieusement une classe vide.
- Copie supplémentaire du dernier enregistrement dans un stockage local distinct de la base IndexedDB. Cette copie garde le chiffrement AES-GCM lorsqu’il est activé et change de clé avec les autres copies. Elle est limitée à 2 millions de caractères ; un dépassement de quota n’efface pas l’enregistrement principal. Sa disponibilité apparaît dans les réglages. Aucune transmission serveur.
- Récupération automatique depuis cette copie si la base n’est plus lisible ; restauration explicite d’un fichier vérifié si tous les enregistrements locaux ont disparu. Cette restauration ne peut pas remplacer un espace encore présent.
- Identité de l’application, adresse, base `orun-v1`, schéma 1, élèves, passages et classements inchangés. La mise à jour ne désinstalle pas l’application. La suppression de toutes les données du navigateur peut supprimer les deux stockages : seule une sauvegarde extérieure protège de ce cas.
- Actualisation automatique à l’accueil des classes uniquement, après copie et vérification des chronos ; pas d’actualisation automatique pendant un formulaire ouvert. Le bouton manuel reste disponible hors chrono/écriture.
- Groupes pose-dépose réutilisables en un toucher, retrouvés depuis les attributions sauvegardées, couleur stable quel que soit l’ordre des élèves et commune à la pose/vérification/validation. Un à trois élèves ; auto-vérification toujours interdite. Le groupe reste sélectionné après attribution pour enchaîner les balises.
- Grilles de corrections complètes sans pagination, hauteur minimale des tuiles, temps insécables, état/nom/chrono organisés séparément. Sur mobile ou écran court, défilement vertical accessible au lieu de couper les textes. Barres de commandes repliables et dialogues limités à l’écran.

Validation : suite complète de tests, compilation, construction de production et contrôle dans le navigateur avec une classe fictive de 32 élèves. Les appareils personnels de l’enseignant ne sont pas accessibles ; la cause exacte d’une perte passée n’est pas établie. Aucune récupération de données déjà totalement effacées n’est revendiquée.

### Ajustement après les captures du poste C et des 12 groupes

Les captures reçues après publication montrent que le cas mono-appareil ne couvrait pas l’empilement des commandes du poste C : QR, compteurs, explication et titre de panneau réduisaient fortement la grille des élèves. Le poste C utilise désormais un compteur compact et un menu facultatif pour les QR et fichiers. La correction par élève reste identique ; seuls les titres, compteurs et commandes sont réorganisés.

La pose-dépose utilise une zone de travail bornée en tablette/ordinateur. Les groupes se répartissent en tuiles compactes, les panneaux occupent la hauteur restante, et la barre d’attribution réserve son propre espace plutôt que de recouvrir les dernières balises. Sur téléphone, le défilement continu est conservé.

Cas de contrôle : 24 élèves fictifs, 12 cartes, 72 passages terminés, 12 groupes et 36 balises validées. Test ajouté : corriger une carte du dernier élève conserve les 24 fiches, les 12 cartes et les 72 heures de départ/arrivée, en ne changeant que la correction choisie. Aucun changement du schéma, du stockage, du barème ou du mécanisme de mise à jour.
