# Plan de Refactorisation de GestionImages.tsx

## 📊 État Initial
- **Lignes**: 1585
- **Complexité**: Très élevée (monolithique)

## ✅ Hooks Créés
1. `useImages` - Gestion du chargement, rafraîchissement et suppression des images
2. `useImageGrouping` - Regroupement crop/ori et mapping des liaisons
3. `useImageFilters` - Filtrage, tri, pagination
4. `useImageSelection` - Sélection multiple

## ✅ Utilitaires Créés
1. `extractImageId` - Extraction de l'ID de base d'une image
2. `getSortedGroups` - Tri des groupes d'images

## ⏳ Composants à Extraire
1. `FiltersBar` - Barre de filtres (lignes 472-611)
2. `ImageCard` - Carte d'image (lignes 952-1110)
3. `MultiSelectBar` - Barre de sélection multiple (lignes 614-701)
4. `FusionModal` - Modal de fusion des doublons (lignes 1367-1582)
5. `ImageDetailModal` - Modal de détail d'image (lignes 1124-1268)
6. `DeleteConfirmModal` - Modal de confirmation de suppression (lignes 1292-1365)

## 📋 Prochaines Étapes
1. Créer les composants extraits
2. Refactoriser le composant principal pour utiliser les hooks
3. Réexécuter les tests
4. Compter les lignes avant/après

