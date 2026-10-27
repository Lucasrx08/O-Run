# O’Run — direction artistique validée

L’utilisateur a validé la proposition abricot le 27 octobre 2026. Elle est étendue à l’accueil, aux classes, aux élèves, aux leçons, aux cartes, aux appareils, au terrain, aux corrections, aux résultats, aux réglages et aux fenêtres de dialogue. Les postes élèves A/B partagent la charte du terrain.

Palette extraite de la référence et convertie de Display P3 en sRGB :

| Usage | Couleur |
| --- | --- |
| Neutre chaud | #EBE5DE |
| Orange abricot | #FFA74B |
| Orange vif | #F68710 |
| Crème jaune | #FEE4A7 |
| Jaune doré | #EEC95F |
| Surface | #FFFFFF |
| Anthracite | #333333 |

Barlow Condensed ExtraBold Italic est utilisée pour les titres et prénoms. Les chronos restent en Outfit et les textes de commande en Nunito Sans. Les polices sont hébergées dans le projet, avec leur licence. Les PNG d’installation et la balise SVG reprennent la palette, ainsi que les couleurs du manifeste PWA.

L’organisation du CSS distingue la couche de dimensions `orun-studio.css` et la charte validée `orun-theme.css`. Les variantes visuelles abandonnées ont été retirées de la couche de dimensions.

Validation : 155 tests réussis, contrôle TypeScript et build Vite/PWA. Contrôles Chrome dans des cadres aux dimensions exactes : 1280 × 650, 1024 × 768, 768 × 1024 et 390 × 844. Une classe fictive de 36 élèves a été vérifiée : absence de chevauchement prénom/chrono sur Mac et iPad paysage, aucune augmentation de la hauteur de page dans les quatre formats. Sur téléphone : six élèves par page, navigation et recherche conservées ; les six cartes et l’action finale restent visibles.

Ces contrôles reproduisent des tailles de fenêtre ; ils ne constituent pas des essais sur du matériel Apple physique. Les fonctions métier et le code enseignant à quatre chiffres sont conservés. Les couleurs personnalisées déjà associées aux classes et cartes ainsi que les repères d’évaluation restent liés aux données existantes.
