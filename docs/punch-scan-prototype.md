# Scan assisté des cartons — prototype du 6 novembre 2026

Accès : Résultats → Correction → ouvrir un élève → Scanner le carton. Également disponible pour chaque carte au poste C.

Périmètre : cartons de six cases, modèles de la fiche de correction fournie par Lucas RIGAUX, cartes 1 à 6. Choisir explicitement le bon modèle ; les cartes personnalisées ne sont pas reconnues automatiquement.

1. Prendre ou choisir une photo nette. Sur ordinateur : choisir un fichier ; sur téléphone/tablette : la capture dépend du sélecteur de fichiers du navigateur.
2. Choisir la carte de référence.
3. Placer quatre repères sur la rangée des poinçons, sous les numéros, dans l'ordre haut gauche, haut droit, bas droit, bas gauche.
4. Comparer les six cases. La photo et le modèle sont affichés côte à côte.
5. Confirmer chaque case : Bon ou Faux / absent. Aucun état proposé ne vaut validation automatique.
6. Reporter le total puis enregistrer normalement la correction. Le chrono n'est pas modifié par le scan.

Analyse locale uniquement : aucun transfert réseau, aucun stockage de photo dans la base ou les exports. La photo est libérée à la fermeture du composant. La photo prise via le système peut rester dans la photothèque selon le navigateur.

## Limites observées

Essai initial sur les trois photos fournies, avec cadrage préparé et rectification de perspective : 7 propositions de correspondance sur 18 cases ; 11 cases à vérifier. Il ne s'agit pas d'un taux de précision ni d'une validation terrain. Aucune case n'est automatiquement déclarée fausse. La version demande encore la confirmation des six cases, y compris les correspondances proposées.

Détection sensible à l'éclairage, à la texture du papier, aux trous partiellement ouverts et aux annotations. Pas de reconnaissance de prénom ni de numéro manuscrit. Pas encore de cadrage automatique, de contrôle du flou ou de calibration par de nouvelles empreintes réelles. La comparaison est invariante en position, taille et rotation ; les motifs retournés ou partiellement visibles restent à vérifier.

Les tests vérifient les transformations géométriques, motifs différents, trous absents/supplémentaires, séparation des annotations rouges et les cas géométriques dégénérés. La suite complète (168 tests) passe. Contrôle navigateur limité au chargement de l'interface ; le sélecteur de fichier du navigateur de test a bloqué, donc la capture iPad/iPhone réelle reste à vérifier.

Les photos d'élèves et les fichiers temporaires de traitement ne sont pas publiés dans le dépôt.
