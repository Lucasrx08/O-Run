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

## Parcours centré sur le score

Le résultat affiche désormais un grand score sur six. Tant qu’une empreinte est incertaine, le score est explicitement partiel (« points reconnus » et nombre de poinçons restant à vérifier). Les poinçons reconnus ne sont plus montrés.

Un seul doute est présenté à la fois : photo et modèle attendu, avec « Bon · +1 point » et « Faux / absent · 0 ». Après décision, ce doute disparaît et le suivant prend sa place. Le résultat final affiche seulement le score et son action d’enregistrement. Une rubrique repliée permet de rectifier une décision.

Dans la correction classique, le bouton enregistre directement le résultat via la commande habituelle, sans repasser par une deuxième validation. Au poste C, le score est reporté dans le brouillon de la carte et l’enregistrement groupé des cartons est conservé. Le chrono n’est pas modifié par cette action.

La caméra recherche la grille toutes les 300 ms et exige toujours plusieurs observations stables. Cette cadence n’est pas une garantie de temps de lecture en conditions réelles.

### Cartons à envisager pour les prochains essais

Des repères de cadrage contrastés dans les quatre coins, des cases plus grandes et vides de décor, un identifiant imprimé de carte/version et un papier non brillant pourraient faciliter le scan. Un QR de carte demanderait son lecteur et une association explicite aux modèles. Ces pistes ne sont pas encore des fonctionnalités de reconnaissance de nouveaux cartons et leur gain doit être mesuré avant de remplacer les cartons existants. Le contraste des véritables trous et la netteté restent déterminants ; un fond sombre mat sous la feuille est une configuration à tester.

## Compensation des ombres et enchaînement

La lecture conserve d’abord son résultat sur l’image d’origine. En cas de doute, elle retente la comparaison après normalisation de l’éclairage local (gain plafonné). Le repérage de grille dispose du même recours. Une image entièrement noire ne permet pas de reconstruire des trous : elle reste à vérifier.

La capture automatique conserve trois images successives d’un carton stable et choisit la plus nette selon un indicateur relatif calculé sur la bande de poinçonnage. Cet indicateur n’est pas un pourcentage de fiabilité. La caméra est coupée après capture et les images restent en mémoire temporaire.

Dans la correction classique, « Enregistrer et scanner le suivant » valide le résultat courant, sélectionne le prochain passage de six balises encore à corriger et relance la caméra. Le prénom reste celui du passage ouvert dans l’en-tête. Le résultat du suivant n’est pas modifié avant sa propre validation. Les autres types de cartons et le poste C conservent leur parcours habituel.

Vérification : motif faible sous un gradient sombre, cadre sous ombre uniforme, rejet d’un bord d’ombre vide, image noire, sélection relative d’une image nette, enregistrement/enchaînement sans correction anticipée de l’élève suivant. La suite complète comporte 177 tests réussis. Le parcours caméra est contrôlé avec un flux simulé ; un essai extérieur sur iPad reste nécessaire.

Pistes suivantes, non implémentées : identifiant QR anonyme par carton (élève, carte, tentative) pour éviter la sélection et les doublons ; étalonnage à partir de véritables poinçons de référence ; file de doutes à reprendre en fin de passage ; retour sonore discret de fin de lecture ; exploitation des quatre repères du prototype P1.

## Cartes 6 balises - références réelles du 12 novembre 2026

Le menu « Modèle de correction » est disponible à la création d'une leçon et à la création/modification d'une carte. « Cartes 6 balises » contient les 36 motifs des six nouveaux cartons photographiés. Le numéro de référence est enregistré séparément du nom, copié avec la leçon et conservé dans l'instantané du passage. Les transferts existants transportent ce champ avec la carte. Les anciennes cartes restent lisibles ; « Ancien modèle 6 balises » reste disponible dans le scan. Aucun résultat existant n'est recalculé automatiquement.

« Cartes 3 balises » et « Cartes 4 balises » règlent le nombre de balises et conservent la correction manuelle : aucune référence photographique n'a été fournie pour ces variantes. Ne pas prétendre qu'elles disposent du scan automatique.

Le cadrage ignore désormais les contours dégénérés du décor, au lieu de laisser leur homographie interrompre toute la lecture. La comparaison explore aussi des seuils de contraste plus élevés, en exigeant toujours un motif entier concordant sur deux seuils ; aucune suppression de trou pour forcer une validation.

Vérification sur les six photos sources : 32 cases reconnues et quatre à vérifier (carte 1 case 3 ; carte 3 cases 2 et 3 ; carte 5 case 6). Ce sont des références d'étalonnage, pas une mesure indépendante de fiabilité. Les photos et leurs extraits de validation restent locaux et ne sont pas publiés dans le dépôt. Tester d'autres cartons physiques et la caméra Safari/iPad reste nécessaire. Les ronds d'identification élève/carte et les quatre repères noirs ne sont pas encore décodés : le scan utilise la grille et le numéro de référence choisi. Les numéros imprimés de balise ne sont pas inférés à partir des photos ; le nouveau modèle affiche seulement la case à vérifier.
