import React from 'react';

interface GameInstructionsProps {
  isActive: boolean;
  onPlayClick: () => void;
}

/**
 * Component to display game instructions and start button
 */
export const GameInstructions: React.FC<GameInstructionsProps> = ({ isActive, onPlayClick }) => {
  if (isActive) {
    return null;
  }

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-black bg-opacity-50 p-4 z-10">
      <h2 className="text-2xl mb-4 font-bold">Rhythm Wave Catcher</h2>
      <p className="mb-2">Attrapez les notes au rythme de la musique !</p>
      <ul className="mb-4 text-center">
        <li className="mb-1">
          🟣 Notes <span className="text-purple-400">violettes</span> : Points standard
        </li>
        <li className="mb-1">
          🟡 Notes <span className="text-yellow-400">dorées</span> : Points bonus
        </li>
        <li className="mb-1">
          🔵 Notes <span className="text-blue-400">bleues</span> : Boost de combo
        </li>
      </ul>
      <p className="mb-4 font-medium">Visez le timing parfait pour maximiser vos points !</p>
      <button
        onClick={onPlayClick}
        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-full transition-colors"
      >
        Appuyez pour jouer
      </button>
    </div>
  );
};

