# Calendrier personnel V2

Calendrier personnel statique destiné à être publié sur GitHub Pages.

## Fonctionnalités

- Calendrier mensuel.
- Création, modification et suppression d'événements.
- Recherche d'événements.
- Mode clair / sombre.
- Service par rotation configurable.
- Rotation normale : 6 jours de travail + 4 jours de repos.
- Horaires individuels pour les 6 jours :
  - Jour : 06:30–16:00
  - Soir : 14:30–00:00
  - Nuit : 21:30–07:00
- Service polyvalent : cycle de 8 jours avec 5 jours de travail et 3 jours de congé positionnables.
- Repos affichés avec de fines hachures rouges.
- Services affichés avec un fond bleu police transparent et l'horaire directement dans la cellule.
- Vacances affichées avec un jaune très clair et sobre.

## Utilisation

Ouvre `index.html` localement pour tester l'application.

Pour GitHub Pages :
1. Crée un dépôt GitHub.
2. Place `index.html`, `style.css` et `script.js` à la racine.
3. Dans GitHub : Settings → Pages.
4. Sélectionne la branche principale et le dossier `/root`.
5. Enregistre.

## Données

Cette V2 utilise `localStorage`. Les événements et la configuration de rotation sont donc stockés dans le navigateur utilisé.

Pour une utilisation réellement synchronisée entre plusieurs appareils, une V3 pourra conserver exactement cette interface tout en remplaçant `localStorage` par une base distante privée avec authentification.
