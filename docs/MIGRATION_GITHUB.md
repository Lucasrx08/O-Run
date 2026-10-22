# Reprendre O’Run sur GitHub

O’Run fonctionne sans ChatGPT : React, TypeScript, Vite, fontes locales et PWA. Le dépôt contient les sources, les tests, les icônes et le schéma du serveur optionnel. Aucun abonnement ChatGPT n’est nécessaire au fonctionnement d’une installation indépendante.

## Dépôt du projet

Les sources sont transférées dans **https://github.com/Lucasrx08/O-Run** sur la branche **main**. Le dépôt a été créé public par son propriétaire. Il contient uniquement le code, des données de démonstration fictives et la documentation ; les préparations et résultats locaux ne sont pas transférés avec le code. Le site existant reste disponible pendant la transition vers le nouvel hébergement.

Pour reprendre le projet sur votre ordinateur :

```sh
git clone https://github.com/Lucasrx08/O-Run.git
cd O-Run
```

Ou utiliser **Code → Download ZIP** sur GitHub, puis ouvrir le dossier décompressé dans VS Code. Aucun fichier `.env` réel, identifiant d’hébergement ChatGPT ni historique de stockage d’élèves n’est inclus.

## 3. Travailler sans ChatGPT

Installer Node.js 22.12 ou plus récent et ouvrir le dossier dans VS Code.

```sh
npm ci
npm run dev
```

Puis ouvrir l’adresse locale affichée. Pour vérifier et fabriquer la version à héberger :

```sh
npm test
npm run build
```

La version autonome est dans **dist/**. Elle doit être servie par HTTP/HTTPS, pas ouverte en double-cliquant sur `index.html`.

## 4. Choisir l’hébergement

Le transfert du code et le changement d’adresse de l’application sont deux opérations distinctes. Le dépôt privé ne rend pas automatiquement le site privé : GitHub Pages n’est pas une protection d’accès équivalente à l’actuel site propriétaire. Vérifier l’audience souhaitée avant de publier. Conserver un hébergement avec contrôle d’accès si cet accès privé est nécessaire.

Pour GitHub Pages, si votre formule et votre choix d’audience le permettent :

1. Dans **Settings → Pages**, choisir **GitHub Actions**.
2. Dans **Actions**, lancer manuellement **Vérifier et publier O’Run**.
3. Utiliser l’adresse renvoyée par le déploiement réussi ; ne pas considérer une adresse supposée comme déjà en ligne.

Le workflow calcule automatiquement le chemin de base à partir du nom du dépôt. Les tests et le build sont exécutés avant le déploiement. Les pushes lancent uniquement les vérifications ; la publication Pages reste manuelle. Pour un autre hébergeur statique, publier `dist/` avec HTTPS, après `npm run build` (chemin relatif par défaut).

Documentation : https://vite.dev/guide/static-deploy.html et https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages

## 5. Transférer les préparations et résultats

Le stockage local est lié à chaque navigateur et à chaque adresse. Le code GitHub ne contient pas vos classes ni vos résultats locaux.

Sur l’ancienne application : **Réglages → Sauvegardes → Sauvegarder**. Garder ce JSON en lieu sûr. Sur la nouvelle adresse : **Réglages → Sauvegardes → Restaurer**. La restauration remplace les données locales du nouveau navigateur ; vérifier classes, cartes et résultats avant de retirer l’ancien accès. Les appareils ne se synchronisent pas par GitHub.

Le serveur Supabase optionnel conserve ses règles d’accès propres. Aucun serveur distant n’a été créé ni modifié pendant ce transfert. Voir les documents Supabase fournis avant une mise en service multi-appareils. Les variables `VITE_SUPABASE_URL` et `VITE_SUPABASE_PUBLISHABLE_KEY` sont publiques côté navigateur ; ne jamais utiliser une clé `service_role` dans une variable Vite.

## Classements inclus

La leçon et le cumul utilisent les mêmes six vues : réussite globale, par parcours, détail par élève, temps moyen, balises fausses, combiné.

- Réussite : total des balises réussies / total des balises attendues sur les parcours terminés et corrigés.
- Par parcours : meilleur passage de chaque élève, balises réussies puis temps brut. Une carte modifiée en distance ou nombre de balises forme un autre groupe. Les copies gardent leur filiation.
- Par élève : détail des parcours effectués, avec le meilleur rang par parcours.
- Temps moyen : temps brut moyen des passages corrigés. La longueur des parcours n’est pas normalisée.
- Balises fausses : taux de balises fausses ou manquantes croissant ; le total et la moyenne par parcours sont affichés.
- Combiné : réussite d’abord, temps brut moyen ensuite, sans pondération arbitraire.

Les absences et parcours non tentés ne produisent pas de zéro. Les passages non corrigés sont signalés sans entrer dans les moyennes ni les classements. Les répétitions comptent dans les moyennes et les taux généraux. Les classements par parcours retiennent le meilleur passage.
