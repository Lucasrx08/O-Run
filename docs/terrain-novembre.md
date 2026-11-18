# Départs par vagues et appuis accidentels

- La première vague attend 60 secondes par défaut. Le champ Préparation permet d’adapter ce délai (5 à 600 secondes).
- L’intervalle entre les vagues est indépendant : raccourcis 30 s / 1 min, ou saisie personnalisée (5 à 600 secondes).
- Les champs acceptent une saisie vide pendant l’édition. Les valeurs sont contrôlées au lancement, sans imposer un chiffre à chaque frappe.
- L’affichage du décompte est en minutes:secondes. Une suspension conserve le délai restant, avec au moins cinq secondes à la reprise pour éviter un départ immédiat. Une tablette masquée ou quittée suspend toujours ses vagues.
- La répartition croissante/décroissante suit les tuiles de la tablette actuelle, de gauche à droite et de haut en bas. La rotation recommence au premier élève de chaque tablette. Elle n’utilise plus un second tri invisible. Les cartes terminées restent exclues des départs suivants.

## Corriger un départ

Dans la vue enseignant, « Corriger un départ » affiche les passages des élèves du poste courant, avec une recherche par prénom. Cette commande n’est pas présente dans la vue élèves protégée.

- « Annuler ce départ », puis confirmation : seul le dernier passage non corrigé de cet élève est retiré des chronos. La carte redevient disponible. Les autres passages, l’affectation A/B, les élèves et la clé de transfert restent conservés.
- « Rétablir le départ annulé » permet de revenir sur cette annulation. La copie du passage est conservée dans le journal local, y compris dans la sauvegarde. La restauration refuse de créer deux chronos actifs pour un élève.
- « Reprendre le chrono » annule une arrivée accidentelle. Les résultats déjà corrigés sont protégés.
- Corriger les erreurs sur A/B avant le transfert au poste C. Un QR de chronos déjà importé sur C n’est pas effacé par une annulation ultérieure sur A/B.
- La purge des résultats retire aussi les possibilités de restaurer leurs départs annulés.

Contrôles : décompte initial sans départ avant une minute, saisie effaçable, intervalle personnalisable, pause/reprise, rotation 1–6 et 6–1, rotation indépendante sur B, annulation/rétablissement, isolation des autres élèves, protection des résultats corrigés, droits enseignant et exclusion du transfert.
