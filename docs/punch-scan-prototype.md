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
