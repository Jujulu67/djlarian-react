# Création de la vidéo du gradient waveform

## Pourquoi utiliser une vidéo ?

L'animation CSS du gradient peut causer des stutters, surtout lors des refresh. Une vidéo pré-rendue est beaucoup plus fluide car :

- Le navigateur utilise le décodage matériel vidéo
- Pas de calculs JavaScript/CSS en temps réel
- Animation parfaitement fluide à 60fps
- Meilleure performance sur mobile

## Instructions pour créer la vidéo

### Option 1 : Avec After Effects / Premiere Pro

1. **Créer un projet**

   - Dimensions : 800x64 pixels (ratio du waveform)
   - Durée : 2-3 secondes (pour une boucle fluide)
   - Frame rate : 60fps

2. **Créer le gradient**

   - Gradient horizontal : `#a855f7` (purple-500) → `#3b82f6` (blue-500) → `#a855f7`
   - Largeur du gradient : 200% de la largeur (pour l'animation)

3. **Animer le gradient**

   - Position initiale : `x = 0%`
   - Position finale : `x = 100%` (ou `x = -100%` selon la direction)
   - Animation : Linear, 2-3 secondes
   - Boucle infinie

4. **Exporter**
   - Format : MP4 (H.264)
   - Qualité : Moyenne-Haute (pour garder un fichier léger)
   - Résolution : 800x64px
   - Nom du fichier : `waveform-gradient.mp4`
   - Placer dans : `/public/videos/waveform-gradient.mp4`

### Option 2 : Avec FFmpeg (ligne de commande)

```bash
# Créer une vidéo avec un gradient animé
ffmpeg -f lavfi -i testsrc2=size=800x64:rate=60 \
  -vf "geq=r='if(between(X/W*200,0,100),X/W*200/100*255,255)':g='if(between(X/W*200,100,200),(200-X/W*200)/100*255,0)':b='if(between(X/W*200,0,100),X/W*200/100*255,255)'" \
  -t 3 -loop 1 -pix_fmt yuv420p \
  public/videos/waveform-gradient.mp4
```

### Option 3 : Avec un outil en ligne

1. Utiliser un outil comme [Kapwing](https://www.kapwing.com/) ou [Canva](https://www.canva.com/)
2. Créer un gradient animé de 800x64px
3. Durée : 2-3 secondes
4. Exporter en MP4
5. Placer dans `/public/videos/waveform-gradient.mp4`

### Option 4 : Script Python avec PIL/MoviePy

```python
from moviepy.editor import *
import numpy as np

# Créer un gradient animé
def create_gradient_frame(t, width=800, height=64):
    frame = np.zeros((height, width, 3), dtype=np.uint8)
    for x in range(width):
        # Animation du gradient qui se déplace
        offset = int((t * width / 3) % (width * 2)) - width
        pos = (x + offset) % (width * 2)

        if pos < width:
            # Purple to Blue
            ratio = pos / width
            frame[:, x] = [
                int(168 * (1 - ratio) + 59 * ratio)),  # R
                int(85 * (1 - ratio) + 130 * ratio)),   # G
                int(247 * (1 - ratio) + 246 * ratio))   # B
            ]
        else:
            # Blue to Purple
            ratio = (pos - width) / width
            frame[:, x] = [
                int(59 * (1 - ratio) + 168 * ratio)),   # R
                int(130 * (1 - ratio) + 85 * ratio)),   # G
                int(246 * (1 - ratio) + 247 * ratio))   # B
            ]
    return frame

# Créer la vidéo
clip = VideoClip(create_gradient_frame, duration=3)
clip.write_videofile("public/videos/waveform-gradient.mp4", fps=60, codec='libx264')
```

## Spécifications recommandées

- **Résolution** : 800x64px (ou 1600x128px pour retina)
- **Durée** : 2-3 secondes (boucle fluide)
- **Frame rate** : 60fps
- **Format** : MP4 (H.264)
- **Taille du fichier** : < 500KB (optimisé pour le web)
- **Couleurs** :
  - Purple: `#a855f7` (rgb(168, 85, 247))
  - Blue: `#3b82f6` (rgb(59, 130, 246))

## Test

Une fois la vidéo créée, vérifier :

1. La vidéo se charge correctement
2. L'animation est fluide
3. La boucle est seamless
4. Le fichier n'est pas trop lourd

## Fallback

Si la vidéo n'est pas disponible, le code utilise automatiquement l'animation CSS comme fallback.
