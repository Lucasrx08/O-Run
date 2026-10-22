# Installation et déploiement — O’Run

## Démonstration sur un appareil

Ouvrir la démonstration en ligne une première fois. Les données fictives sont créées dans le navigateur, jamais partagées publiquement. Pour un appareil partagé, activer Réglages → Protéger cet appareil. Après verrouillage ou redémarrage, la phrase secrète déchiffre le stockage ; les chronos sont recalculés depuis leurs instants enregistrés.

Installer sur iPad depuis Safari → Partager → Sur l’écran d’accueil. Vérifier ensuite, avec des données fictives, le redémarrage en mode avion. La disponibilité hors ligne réelle doit être vérifiée sur les iPads de l’établissement ; le navigateur peut évincer son stockage et une sauvegarde demeure nécessaire.

## GitHub Pages

1. Créer le dépôt `Lucasrx08/O-Run` s’il n’existe pas, puis y pousser les sources et `package-lock.json`.
2. Dans Settings → Pages, choisir **GitHub Actions** comme source.
3. Le workflow installe les dépendances, exécute les tests et construit avec `VITE_BASE_PATH=/O-Run/` avant publication.
4. Vérifier le statut du workflow et ouvrir l’URL retournée par l’étape de déploiement. L’URL attendue est `https://lucasrx08.github.io/O-Run/`.

Un déploiement statique autonome peut utiliser le contenu de `dist/`. Les chemins sont relatifs hors GitHub Pages. Ne pas ouvrir directement `index.html` en `file://` : utiliser un hébergement HTTPS.

## Projet Supabase dédié

**Ne pas réutiliser les projets AS Bon Sauveur ou Gestion Cross sans décision explicite.** Choisir l’organisation et accepter son éventuel coût avant de créer O’Run. Une région européenne, par exemple Paris `eu-west-3`, est à faire valider. Aucun projet dédié n’a été créé pendant le développement.

1. Créer le projet dédié et configurer Supabase Auth. Désactiver l’inscription publique et l’authentification anonyme. Créer les comptes enseignants/postes depuis l’administration, sans stocker leurs mots de passe dans le code.
2. Avec la CLI Supabase disponible, consulter `supabase --help`, `supabase migration --help`, puis générer une migration avec `supabase migration new orun_initial`. Copier le contenu de `supabase/schema.sql` dans le fichier créé par la CLI, relire, puis appliquer au projet dédié via le flux `db push` documenté par la CLI.
3. Le SQL active RLS, restreint les permissions, crée les fonctions et ajoute `orun_notifications` à la publication Realtime si elle existe. Vérifier cette publication dans le tableau de bord et lancer les contrôles de sécurité Supabase.
4. Définir au build `VITE_SUPABASE_URL` et `VITE_SUPABASE_PUBLISHABLE_KEY`. Utiliser uniquement une clé publique publishable, jamais `service_role` ou une clé secrète. Ces valeurs publiques sont attendues côté navigateur. Dans GitHub, utiliser les variables de dépôt du même nom.
5. Reconstruire et redéployer l’application. Sur chaque poste, activer le chiffrement local puis se connecter dans Réglages.
6. Sur le poste enseignant, sélectionner la séance et cliquer « Partager cette séance ». Un espace isole **une séance**, ses élèves et ses parcours. Conserver l’identifiant retourné.
7. Dans « Autoriser un compte de poste », ajouter l’UUID Auth du compte et ses droits. Seul le propriétaire peut attribuer les droits. Rejoindre ensuite cet espace sur les autres appareils.
8. « Rejoindre » remplace la copie locale par celle du serveur. Sauvegarder les données locales utiles au préalable. Les commandes déjà en attente empêchent ce remplacement.

## Horloges et réseau

À la jonction, le client estime l’écart avec l’heure serveur avec un aller-retour. Un aller-retour supérieur à trois secondes est refusé. La précision dépend de l’asymétrie réseau ; ce système est un outil EPS, pas un dispositif homologué de chronométrage.

Les événements portent l’instant du geste, les corrections un numéro de révision. Les départs sont atomiques par vague et les opérations idempotentes. Les commandes sont conservées localement avant envoi ; le serveur confirme ensuite. La mention « Synchronisé » n’apparaît qu’après confirmation et récupération de l’état.

Les appareils déconnectés ne connaissent pas les départs effectués sur les autres postes pendant la coupure. Utiliser un poste unique comme référence pendant l’incident. Au retour du réseau, les conflits restent en attente. Dans Réglages, « Exporter la file » conserve les données et les commandes dans une copie JSON en clair. « Résoudre un conflit » exporte cette copie puis demande confirmation avant de reprendre l’état confirmé du serveur. Vérifier la présence du fichier téléchargé et la séance avec l’enseignant ; les commandes non acceptées devront être reportées manuellement depuis cette copie. Une nouvelle opération enregistrée après l’export bloque le remplacement pour éviter une perte silencieuse. Une opération vieille de plus de 24 heures exige une reprise supervisée ; elle n’est pas acceptée silencieusement par le serveur.

## Conservation technique

Les espaces partagés expirent après 90 jours dans le schéma fourni : valeur de démonstration à faire valider, non prescription légale. Un espace expiré n’est plus accessible. La suppression physique doit être planifiée via une tâche d’administration appelant `orun_private.purge_expired()`. Aucun cron n’a été créé sur un compte réel. Les sauvegardes de l’hébergeur ont leur propre rétention à inventorier.

## Références consultées

- Vite, déploiement statique et GitHub Pages : https://vite.dev/guide/static-deploy.html
- Supabase, sécurité des données : https://supabase.com/docs/guides/database/secure-data
- Supabase Realtime : https://supabase.com/docs/guides/realtime/postgres-changes
- Service workers : https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers
- Évolution TLS Supabase annoncée le 12 octobre 2026 : https://supabase.com/changelog/cbc-tls-ciphers-deprecated — prévoir des systèmes et navigateurs maintenus.
