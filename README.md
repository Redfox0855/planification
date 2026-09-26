# Calendrier personnel — V1

Calendrier personnel statique conçu pour GitHub Pages.

## Fonctionnalités

- Calendrier mensuel
- Navigation entre les mois
- Bouton « Aujourd'hui »
- Création, modification et suppression d'événements
- Date, heure, catégorie, description et couleur
- Liste des événements à venir
- Recherche
- Mode clair / sombre
- Interface responsive
- Stockage local dans le navigateur

## Installation GitHub Pages

1. Créer un dépôt GitHub.
2. Ajouter `index.html`, `style.css` et `script.js`.
3. Dans **Settings → Pages** :
   - Source : **Deploy from a branch**
   - Branch : `main`
   - Folder : `/ (root)`
4. Enregistrer.
5. GitHub fournira l'adresse du site.

## Important concernant la V1

Les événements sont actuellement enregistrés avec `localStorage`.

Cela signifie que :
- les données restent dans le navigateur utilisé ;
- elles ne sont pas synchronisées entre appareils ;
- vider les données du navigateur peut supprimer les événements.

La structure de cette V1 est volontairement préparée pour qu'une future V2 puisse remplacer le stockage local par une base distante/authentifiée sans refaire l'interface.
