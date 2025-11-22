# Guide d'Intégration des Hooks

## 📦 Hooks Disponibles

1. **useTracks** - Gestion des tracks (fetch, delete, toggle, filter)
2. **useTrackForm** - Gestion du formulaire (form state, edit, reset)
3. **useImageUpload** - Gestion des images (upload, crop, modal)
4. **useSuccessNotification** - Gestion des notifications de succès

## 🔗 Utilisation Combinée

```typescript
// Dans page.tsx
const trackForm = useTrackForm();
const imageUpload = useImageUpload();
const tracks = useTracks();
const success = useSuccessNotification();

// handleEdit avec callbacks
const handleEdit = (track: Track) => {
  trackForm.handleEdit(track, {
    setUploadedImage: imageUpload.setUploadedImage,
    setImageToUploadId: imageUpload.setImageToUploadId,
    setHighlightedTrackId: tracks.setHighlightedTrackId,
  });
};

// resetForm avec callbacks
const resetForm = () => {
  trackForm.resetForm({
    setCroppedImageBlob: imageUpload.setCroppedImageBlob,
    setUploadedImage: imageUpload.setUploadedImage,
    setImageToUploadId: imageUpload.setImageToUploadId,
    setHighlightedTrackId: tracks.setHighlightedTrackId,
  });
};

// handleSubmit adapté
const handleSubmit = async (e: FormEvent) => {
  e.preventDefault();
  trackForm.setIsSubmitting(true);

  try {
    // Utiliser trackForm.currentForm
    // Utiliser imageUpload.croppedImageBlob, originalImageFile, etc.
    // Appeler tracks.fetchTracks() après succès
    // Appeler success.setSuccess(trackId) après succès
    // Appeler resetForm() après succès
  } finally {
    trackForm.setIsSubmitting(false);
  }
};
```

## ✅ Vérifications Effectuées

- ✅ Tous les hooks compilent sans erreur
- ✅ Tous les types sont corrects
- ✅ Tests unitaires créés
- ✅ Correspondance avec le code original vérifiée
- ✅ Pas d'erreurs de lint

## ⚠️ À Tester Avant Intégration Complète

1. **Ajout de track** : Formulaire → Submit → Vérifier création
2. **Édition de track** : Cliquer Edit → Modifier → Submit → Vérifier mise à jour
3. **Suppression** : Cliquer Delete → Confirmer → Vérifier suppression
4. **Toggle Featured** : Cliquer étoile → Vérifier changement
5. **Toggle Publish** : Cliquer œil → Vérifier changement
6. **Refresh Cover** : Cliquer refresh → Vérifier nouvelle image
7. **Upload Image** : Sélectionner image → Crop → Vérifier upload
8. **Filtrage** : Taper dans recherche → Vérifier filtrage
9. **Édition depuis URL** : `?edit=track-id` → Vérifier ouverture formulaire
