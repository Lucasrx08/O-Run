# Scan automatique des cartons — prototype du 6 novembre 2026

Accès : Résultats → Correction → ouvrir un élève → Scanner le carton. Également disponible pour chaque carte au poste C.

Cartons de six cases, modèles de la fiche de correction fournie par Lucas RIGAUX, cartes 1 à 6. La carte est préselectionnée à partir du nom du parcours lorsqu'il contient « Carte 1 » à « Carte 6 ». Le modèle reste visible et modifiable avant de démarrer ; aucune lecture du prénom ou numéro manuscrit n'est réalisée.

1. Démarrer le scan automatique et autoriser la caméra.
2. Présenter le carton entier, à plat et bien éclairé. La grille est détectée automatiquement ; après trois observations stables, une image est capturée et les six cases sont extraites.
3. Les poinçons reconnus sont préremplis « Bon ». Seules les cases incertaines demandent une décision « Bon » ou « Faux / absent ». Les décisions automatiques restent modifiables.
4. Reporter le total puis enregistrer normalement le résultat. Aucun résultat ni chrono n'est enregistré automatiquement.

Une photo peut aussi être choisie : cadrage et analyse démarrent automatiquement. Si la grille n'est pas détectée, une nouvelle photo ou le cadrage manuel restent possibles. Les cartes personnalisées, cartons incomplets, rotations importantes et grilles masquées ne sont pas garantis.

## Confidentialité et caméra

Analyse locale uniquement : aucun transfert réseau ni stockage des photos dans la base ou les exports. La caméra s'arrête après capture, à l'arrêt demandé et à la fermeture du composant. La capture nécessite HTTPS, une caméra et une autorisation du navigateur. Une photo choisie via le système peut rester dans la photothèque selon le navigateur.

## Vérification

Le détecteur de grille a repéré automatiquement les trois cartons réels fournis. Le parcours caméra → stabilité → capture → découpe → propositions → vérification des seules cases incertaines → report a été vérifié dans Chrome avec un flux caméra simulé alimenté par l'une des photos réelles. Sur ce flux : trois cases reconnues, trois à vérifier. Ce test ne remplace pas un essai caméra physique iPad/iPhone en extérieur.

La lecture des trous reste expérimentale : éclairage, texture du papier, trous partiels, annotation et poinçons retournés peuvent nécessiter une vérification. Le scan ne déclare jamais automatiquement une faute. Les tests couvrent les transformations géométriques, absences et ajouts de trous, motifs différents, annotations rouges, grille à six colonnes et rejet de cadre incomplet.

Les photos originales d'élèves et les fichiers temporaires ne sont pas publiés. L'aperçu montre uniquement les cases de poinçonnage, sans prénom.

## Correction de l’éclairage chaud

Le premier filtre couleur confondait la teinte chaude du papier avec une annotation rouge. Régression reproduite sur les six vignettes de la capture iPad IMG_0089 : aucun point auparavant. Après séparation de l’encre rouge par son contraste rouge/vert plutôt que la seule différence rouge/bleu, quatre cases sont reconnues ; les deux autres restent à vérifier. Il s’agit d’un essai sur la capture d’écran, pas d’une nouvelle mesure sur le fichier photo original. Un test synthétique sur papier chaud protège cette correction.

## Stabilisation du contraste et lecture iPad

Comparaison à cinq seuils de contraste ; une proposition « Bon » exige le même motif complet à au moins deux seuils, avec des points spatialement cohérents. Aucun point n’est retiré d’un jeu détecté pour forcer la correspondance. Sur les quatre vignettes entièrement visibles de la capture du 6 novembre à 22:15:55, les quatre motifs sont proposés « Bon », dont la case 1 précédemment perturbée par un point supplémentaire. Les cases 5 et 6 sont tronquées dans cette capture et n’ont pas été réévaluées à partir de celle-ci.

Les cases renseignées affichent une présentation compacte, avec « Voir le poinçon » pour rouvrir la comparaison. Les cases incertaines conservent leurs images. La fenêtre de scan s’élargit et utilise trois colonnes sur les écrans larges.
