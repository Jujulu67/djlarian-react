import { useState } from 'react';
import Image from 'next/image';
import { Music } from 'lucide-react';

interface UseTrackImageProps {
  coverUrl?: string | null;
  title?: string;
  size?: number;
  className?: string;
  testId?: string;
}

/**
 * Hook personnalisé pour gérer les images des pistes avec une fallback
 * en cas d'erreur de chargement
 */
export const useTrackImage = ({
  coverUrl,
  title = 'Track cover',
  size = 400,
  className = 'w-full h-full object-cover',
  testId = 'track-cover',
}: UseTrackImageProps) => {
  const [imageError, setImageError] = useState(false);

  // Composant fallback lorsque l'image ne peut pas être chargée
  const FallbackImage = (
    <div className="w-full h-full bg-gradient-to-r from-purple-900/30 to-blue-900/30 flex items-center justify-center">
      <Music className="w-16 h-16 text-gray-600" data-testid={`${testId}-fallback`} />
    </div>
  );

  // Fonction pour gérer l'erreur de chargement de l'image
  const handleImageError = () => setImageError(true);

  // Composant de l'image
  const ImageComponent =
    coverUrl && !imageError ? (
      <Image
        src={coverUrl}
        alt={title}
        width={size}
        height={size}
        className={className}
        onError={handleImageError}
        data-testid={testId}
      />
    ) : (
      FallbackImage
    );

  return {
    imageError,
    setImageError,
    handleImageError,
    ImageComponent,
  };
};
