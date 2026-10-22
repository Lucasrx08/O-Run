# Sécurité, habilitations et incidents — O’Run 1.0

Document de conception et de recette, pas une certification. Démonstration exclusivement fictive. Le backend fourni doit encore être installé et vérifié sur Supabase avant usage partagé réel.

## Matrice des habilitations serveur

| Opération | Propriétaire / enseignant autorisé | Poste départs | Poste arrivées | Visiteur / autre compte |
|---|---|---|---|---|
| Voir la séance autorisée et les noms réduits | Oui | Oui | Oui | Non |
| Lire les noms complets | Oui | Non | Non | Non |
| Configurer les élèves, parcours et séance | Oui | Non | Non | Non |
| Lancer un départ | Oui | Oui | Non | Non |
| Pause, reprise, STOP | Oui | Non | Oui | Non |
| Corriger, rouvrir, ajuster un niveau | Oui | Non | Non | Non |
| Export nominatif / audit | Oui | Non | Non | Non |
| Accorder les droits | Propriétaire uniquement | Non | Non | Non |

Le choix « Mode complet / Départs / Arrivées / Pilotage » est un choix d’interface. Les droits du compte demeurent appliqués par les fonctions SQL, indépendamment de l’interface.

## Mesures mises en œuvre

- Aucune donnée réelle, secret serveur ou export utilisateur dans les fichiers statiques ni les sources Git.
- React échappe le texte affiché. Pas de `dangerouslySetInnerHTML`, script de suivi, police distante ou appel à un service IA.
- Les cartes importées sont limitées à PNG, JPEG ou PDF, 3 Mo par fichier. Aucun SVG importé n’est accepté. Les cartes ne doivent contenir aucune donnée personnelle.
- Export CSV échappé, avec neutralisation des préfixes de formule de tableur. Le CSV/JSON exporté reste en clair et relève ensuite des règles de stockage de l’établissement.
- IndexedDB avec numéro de révision et transaction compare-and-swap : un autre onglet ne peut pas écraser silencieusement une modification.
- Chiffrement local optionnel AES-GCM 256 bits ; clé dérivée par PBKDF2-SHA256 avec 310 000 itérations, sel aléatoire et nonce neuf à chaque écriture. La clé n’est pas persistée. Phrase secrète de 12 caractères minimum. Verrouillage après 10 minutes sans interaction. Le mode partagé exige l’activation de ce chiffrement dans l’interface.
- Le mode local non chiffré est réservé aux données fictives. Une personne possédant le profil navigateur peut accéder à ces données de démonstration.
- Authentification Supabase avec session en mémoire, sans mot de passe ni refresh token conservé dans les fichiers. Se déconnecter termine la session du poste, pas celles des autres appareils.
- RLS sur toutes les tables. Tables avec noms dans un schéma privé sans accès direct `anon` ou `authenticated`. Fonctions privilégiées dans ce schéma, contrôle explicite `auth.uid()`, appartenance et expiration, `search_path` fixé. Fonctions publiques simples en mode invoker ; droit d’exécution retiré à `PUBLIC` et `anon`.
- Les noms complets sont supprimés de la réponse serveur pour les postes terrain. Les notifications Realtime ne contiennent qu’un identifiant d’espace et une version.
- Verrouillage transactionnel de l’espace à chaque commande, déduplication par identifiant, contrôle de la chronologie et révision de correction. Une vague ne peut pas créer deux passages actifs pour le même élève.
- Service worker limité à l’interface statique. Pas de cache de réponses Auth, API ou cartes utilisateur.

## Limites et risques résiduels

Un outil utilisé dans le navigateur ne résiste pas à un système compromis, un accès à un appareil déverrouillé, une extension malveillante ou une capture d’écran. Un pseudonyme « Prénom I. » demeure une donnée personnelle. Le chiffrement local ne remplace pas le verrouillage du système ni les habilitations.

Le retrait d’un droit au serveur ne peut pas effacer à distance une copie d’un appareil hors ligne. Révoquer les sessions, récupérer les appareils et supprimer leurs copies conformément à la procédure de l’établissement. La rotation des clés et la gestion des sauvegardes doivent être définies lors de la mise en production.

La durée de conservation locale n’est pas automatiquement gouvernée par l’expiration serveur. Effacer les données des appareils partagés en fin de séquence, après transfert autorisé et contrôle de sauvegarde. Les exports sont indépendants de la purge serveur.

Une arrivée hors ligne peut être conservée mais entrer en conflit avec un autre poste. Aucun statut « synchronisé » n’est affiché tant que la file n’est pas confirmée. Les horloges des appareils doivent être automatiques et maintenues à l’heure. La suspension de Safari interrompt les comptes à rebours ; elle ne doit pas déclencher de vagues en retard.

## Conduite en cas d’incident

1. Suspendre les départs supplémentaires ; désigner un appareil de référence pour les arrivées et, si nécessaire, une feuille de secours.
2. Sauvegarder les données/commandes concernées dans un emplacement autorisé. Noter l’heure, les appareils, la version de l’application et les symptômes sans diffuser les noms.
3. En cas d’accès suspect, révoquer les sessions et les droits, isoler l’appareil et contacter le référent RGPD / DPO et le responsable du traitement.
4. Préserver les traces utiles, évaluer les données concernées, l’étendue et les conséquences. Le responsable du traitement décide des notifications éventuelles selon ses obligations.
5. Corriger et tester sur des données fictives. Réconcilier les passages, documenter les décisions et informer les personnes pertinentes selon la procédure validée.

## Avant ouverture aux élèves réels

Recette réseau sur deux puis trois appareils, contrôle de refus d’accès avec comptes étrangers, examen des advisors Supabase, contrôle de la purge planifiée, configuration des sauvegardes et de leur restauration, audit dépendances, vérification des en-têtes HTTPS/CSP de l’hébergement et validation par l’établissement. Les tests automatisés locaux ne constituent pas un audit de sécurité de l’infrastructure hébergée.
