# Dossier de préparation RGPD — O’Run

Version de travail du 19 octobre 2026. À compléter et valider par le responsable de traitement et le DPO / référent RGPD de l’établissement. L’application n’est pas présentée comme « 100 % conforme ». Tant que la validation n’a pas eu lieu, utiliser exclusivement des données fictives.

## Fiche de registre proposée

| Champ | Éléments à instruire |
|---|---|
| Traitement | Organisation et évaluation des séances de course d’orientation en EPS |
| Responsable | Personne morale responsable du Bon Sauveur — à identifier et confirmer |
| Référent opérationnel | L. RIGAUX, enseignant d’EPS |
| DPO / contact droits | À compléter par l’établissement avant diffusion |
| Finalités | Préparer les séances, chronométrer, corriger les balises, suivre les progrès, produire les résultats et exports pédagogiques |
| Base juridique | À déterminer par le responsable de traitement avec le DPO ; aucun consentement n’est présumé par le logiciel |
| Personnes concernées | Élèves participants et enseignants/comptes de poste autorisés |
| Données élèves | Nom, prénom, classe, identifiant aléatoire, passages, départs/arrivées/pauses, balises fausses, résultats et niveaux |
| Données comptes | Identifiant Auth, adresse de connexion, habilitations, traces de modifications |
| Exclusions | Pas de santé, de GPS individuel, de biométrie, de sexe, de date de naissance ou de traceur marketing |
| Destinataires | Enseignants habilités ; postes terrain limités à la séance ; exports pédagogiques autorisés |
| Prestataires | Hébergement statique retenu, Supabase si activé, outils de sauvegarde retenus ; contractualisation et garanties à vérifier |
| Conservation | Proposition ci-dessous, à valider avant production |

## Notice d’information à compléter

L’établissement utilise O’Run pour organiser les séances de course d’orientation en EPS, enregistrer les passages et soutenir l’évaluation pédagogique. Les écrans de terrain affichent le prénom suivi de l’initiale du nom. Cet affichage réduit ne rend pas les données anonymes.

Les noms complets sont réservés aux enseignants habilités et aux exports pédagogiques. Les résultats ne sont pas publiés sur Internet. Les données conservées sont limitées à celles nécessaires à la séance et à son suivi.

Avant remise aux familles/élèves, compléter : identité et coordonnées du responsable, contact DPO, base juridique retenue, durée exacte, destinataires et sous-traitants, transferts éventuels, droits applicables et modalités d’exercice. Prévoir une information adaptée à l’âge des élèves et les voies de recours pertinentes. Ne pas diffuser cette notice incomplète comme une notice définitive.

## Flux de données

| Source | Destination | Contenu | Protection / état |
|---|---|---|---|
| GitHub Pages ou hébergement statique | Navigateur | Code, icônes, données fictives d’exemple | HTTPS ; aucun fichier d’élèves réel inclus |
| Fichier CSV enseignant | Navigateur local | Identités et classes | Import local ; en démo, confirmation explicite de données fictives |
| Actions de terrain | IndexedDB local | Chronos, pauses, corrections | Transactions ; chiffrement optionnel, obligatoire par l’interface avant partage |
| Navigateur authentifié | Supabase dédié si configuré | Commandes et séance autorisée | HTTPS ; Auth ; droits par espace ; SQL transactionnel |
| Supabase | Postes autorisés | État de la séance ; noms réduits pour les postes terrain | Filtrage serveur ; notifications sans identités |
| Espace enseignant | Téléchargement CSV/JSON | Résultats et identités complètes | Action explicite ; fichier en clair à protéger après téléchargement |
| Export CSV | iDoceo | Colonnes choisies lors de l’import | Opération manuelle de l’enseignant ; règles iDoceo à examiner séparément |

Aucun transfert à une IA externe n’est effectué par l’application. Cette affirmation concerne le fonctionnement d’O’Run ; les traitements propres aux services d’hébergement doivent être documentés indépendamment.

## Hébergement, sauvegardes et transferts

La région du projet Supabase dédié reste à sélectionner : recommander une région UE, puis consigner la région effectivement provisionnée. Il n’existe pas encore de projet Supabase O’Run déployé. La localisation européenne d’une base ne démontre pas à elle seule l’absence de transfert international.

Avant production, recueillir les accords de sous-traitance, la liste des sous-traitants ultérieurs, les lieux de traitement des journaux/support/sauvegardes, les garanties de transfert éventuelles, les durées des sauvegardes et les modalités de suppression/restauration. Vérifier séparément l’hébergement GitHub Pages ou celui de la démonstration et iDoceo.

## Politique de conservation proposée — non validée

- Séances et passages : 90 jours par défaut dans le prototype serveur, à remplacer par la durée justifiée retenue par l’établissement. Les besoins d’évaluation, contestation et archivage doivent être distingués.
- Copies de terrain : suppression en fin de séquence après export autorisé et vérification de la reprise ; durée locale à formaliser.
- Journal sensible : même cycle de vie que l’espace partagé dans le prototype. Définir si une durée distincte est nécessaire, en minimisant les identifiants.
- Exports : emplacement institutionnel protégé, durée définie et suppression contrôlée ; ne pas les laisser sur les iPads partagés.
- Sauvegardes hébergeur : rétention à inventorier et aligner avec la politique validée ; suppression logique et disparition des sauvegardes ne sont pas simultanées.

L’expiration serveur bloque l’accès après la date prévue. La suppression physique nécessite une tâche d’administration planifiée ; elle n’est pas encore installée. Les copies locales et exports ne sont pas effacés à distance par ce mécanisme.

## Analyse initiale des risques

| Risque | Mesures prévues | Vérification / risque résiduel |
|---|---|---|
| Perte d’un iPad partagé | Chiffrement local, verrouillage, minimisation | Tester verrouillage système et récupération ; clé connue par les utilisateurs autorisés seulement |
| Lecture par un autre compte | RLS, appartenances, fonctions serveur | Tests SQL locaux positifs ; refaire sur l’infrastructure réelle |
| Divulgation d’un export | Export enseignant, absence de fichier serveur public | Fichier en clair après téléchargement : règle institutionnelle nécessaire |
| Écrasement ou double arrivée | ID de commande, verrou transactionnel, révision | Tests locaux ; essai de concurrence réseau indispensable |
| Erreur de chronométrage réseau / horloge | Instants persistants, calibration, file d’envoi | Coupure prolongée, dérive d’horloge et veille à tester |
| Conservation excessive | Expiration, outil de suppression, politique | Planifier la purge et inventorier les sauvegardes |
| Accès après retrait d’un droit | Vérification d’appartenance à chaque RPC | Copie hors ligne encore présente jusqu’à suppression de l’appareil |

## Évaluation du besoin d’AIPD

Le traitement concerne des mineurs et une évaluation pédagogique : ces éléments appellent une analyse explicite du risque et des critères applicables par le DPO. Il n’est pas possible de conclure automatiquement à l’obligation ou à l’absence d’obligation d’AIPD sur la seule base du code. Documenter l’ampleur, les usages, les destinataires, les croisements et la décision motivée. Si le risque résiduel demeure élevé, instruire les mesures et démarches nécessaires avant production.

Référence officielle consultée : [CNIL — Analyse d’impact relative à la protection des données](https://www.cnil.fr/fr/RGPD-analyse-impact-protection-des-donnees-aipd).

## Validation à renseigner

Responsable identifié : ______ ; contact DPO : ______ ; base juridique : ______ ; notice finalisée le : ______ ; hébergeurs/accords examinés le : ______ ; durées validées : ______ ; décision AIPD motivée : ______ ; recette sécurité signée le : ______ ; autorisation d’usage de données réelles : ______.
