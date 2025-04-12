import React from 'react';

interface TrackTitleProps {
  title: string;
  className?: string;
  testId?: string;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p';
  onClick?: () => void;
}

/**
 * Composant atomique pour afficher le titre d'une piste
 * avec les attributs data-testid appropriés
 */
const TrackTitle: React.FC<TrackTitleProps> = ({
  title,
  className = 'text-white font-bold text-sm truncate',
  testId = 'track-title',
  as: Component = 'h3',
  onClick,
}) => {
  return (
    <Component
      className={className}
      data-testid={testId}
      onClick={onClick}
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? 'button' : undefined}
      onKeyDown={
        onClick
          ? (e: React.KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      {title}
    </Component>
  );
};

export default TrackTitle;
