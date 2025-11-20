import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface MusicCardVisualizerProps {
  isVisible: boolean;
  isPlaying?: boolean;
  frequencyData?: Uint8Array | null;
  isRealAudio?: boolean;
}

/**
 * Audio visualizer component that displays animated waveform bars
 * Positioned at the bottom of the music card when player is visible
 */
export const MusicCardVisualizer: React.FC<MusicCardVisualizerProps> = ({
  isVisible,
  isPlaying = false,
  frequencyData = null,
  isRealAudio = false,
}) => {
  const [audioData, setAudioData] = useState<number[]>(Array(20).fill(20));
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const beatRef = useRef<number>(0);
  const previousAudioDataRef = useRef<number[]>(Array(20).fill(20));

  useEffect(() => {
    if (isVisible) {
      startTimeRef.current = Date.now();
      beatRef.current = 0;

      // Réinitialiser les valeurs précédentes quand on passe de pause à play
      // pour éviter que l'animation de pause n'influence l'audio réel
      if (isPlaying && isRealAudio && frequencyData && frequencyData.length > 0) {
        // Réinitialiser pour une réaction immédiate à l'audio réel
        previousAudioDataRef.current = Array(20).fill(20);
      }

      const animateBars = () => {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        const time = elapsed;

        if (isPlaying && isRealAudio && frequencyData && frequencyData.length > 0) {
          // Utiliser les vraies données de fréquence
          // Les fréquences sont organisées : basses à gauche (index 0), aigus à droite (dernier index)
          // frequencyData contient 1024 valeurs (pour fftSize 2048)
          // On doit mapper ces 1024 valeurs vers nos 20 barres

          const newData = Array(20)
            .fill(0)
            .map((_, index) => {
              // Mapper les fréquences vers 20 barres avec distribution logarithmique
              // Organisation : Basses à gauche (index 0), Aigus à droite (index 19)
              // Utilisation d'une échelle logarithmique pour mieux représenter le spectre audio

              const totalBins = frequencyData.length; // Généralement 1024 pour fftSize 2048
              const sampleRate = 44100; // Fréquence d'échantillonnage standard
              const nyquist = sampleRate / 2; // 22050 Hz

              // Distribution logarithmique : chaque barre couvre une plage de fréquences
              // Basses (0-6) : 20-200 Hz
              // Moyennes (7-13) : 200-2000 Hz
              // Hautes (14-19) : 2000-22050 Hz

              // Convertir l'index en fréquence cible (échelle logarithmique)
              const minFreq = 20; // Hz minimum
              const maxFreq = nyquist; // Hz maximum

              // Calculer la fréquence de début et fin pour cette barre (logarithmique)
              const logMin = Math.log10(minFreq);
              const logMax = Math.log10(maxFreq);
              const logRange = logMax - logMin;

              const barStart = logMin + (logRange * index) / 20;
              const barEnd = logMin + (logRange * (index + 1)) / 20;

              const freqStart = Math.pow(10, barStart);
              const freqEnd = Math.pow(10, barEnd);

              // Convertir les fréquences en indices de bins FFT
              // Chaque bin représente: binIndex * sampleRate / fftSize
              const binStart = Math.floor((freqStart / nyquist) * totalBins);
              const binEnd = Math.ceil((freqEnd / nyquist) * totalBins);

              // Calculer la valeur moyenne pondérée dans cette plage
              // Utiliser une moyenne pondérée pour donner plus d'importance au centre de la bande
              let weightedSum = 0;
              let weightSum = 0;

              for (let i = Math.max(0, binStart); i < Math.min(binEnd, frequencyData.length); i++) {
                // Poids gaussien centré sur le milieu de la bande
                const center = (binStart + binEnd) / 2;
                const distance = Math.abs(i - center);
                const width = (binEnd - binStart) / 2;
                const weight = Math.exp(-(distance * distance) / (2 * width * width));

                weightedSum += frequencyData[i] * weight;
                weightSum += weight;
              }

              const avg = weightSum > 0 ? weightedSum / weightSum : 0;

              // Normaliser de 0-255 à 0-100 avec compression logarithmique
              // Utiliser une compression pour mieux visualiser les variations
              let normalizedValue = (avg / 255) * 100;

              // Appliquer une compression logarithmique pour améliorer la visibilité
              // Les valeurs faibles sont amplifiées, les valeurs fortes sont compressées
              normalizedValue = Math.pow(normalizedValue / 100, 0.7) * 100;

              // Amplification différenciée par bande de fréquences
              if (index < 7) {
                // Basses fréquences : boost important (1.5x) car souvent plus faibles
                normalizedValue *= 1.5;
              } else if (index < 14) {
                // Moyennes fréquences : boost modéré (1.3x)
                normalizedValue *= 1.3;
              } else {
                // Hautes fréquences : amplification légère (1.2x)
                normalizedValue *= 1.2;
              }

              // Smoothing exponentiel adaptatif par bande de fréquences
              const currentValue = previousAudioDataRef.current[index] || 20;

              if (index < 7) {
                // BASSES : Smoothing adaptatif pour stabilité mais réactivité
                // Plus réactif pour les changements importants, stable pour les petits
                const change = Math.abs(normalizedValue - currentValue);
                // Smoothing plus réactif : 0.5-0.7 au lieu de 0.75-0.9
                const bassSmoothing = change > 20 ? 0.5 : change > 10 ? 0.6 : 0.7;
                const smoothed =
                  currentValue * bassSmoothing + normalizedValue * (1 - bassSmoothing);
                return Math.max(18, Math.min(92, smoothed));
              } else if (index < 14) {
                // MOYENNES : Smoothing modéré pour bonne réactivité (0.3-0.5)
                const change = Math.abs(normalizedValue - currentValue);
                const midSmoothing = change > 25 ? 0.3 : change > 15 ? 0.4 : 0.5;
                const smoothed = currentValue * midSmoothing + normalizedValue * (1 - midSmoothing);
                return Math.max(18, Math.min(92, smoothed));
              } else {
                // HAUTES : Smoothing léger pour réactivité maximale (0.15-0.3)
                const change = Math.abs(normalizedValue - currentValue);
                const highSmoothing = change > 30 ? 0.15 : change > 20 ? 0.2 : 0.3;
                const smoothed =
                  currentValue * highSmoothing + normalizedValue * (1 - highSmoothing);
                return Math.max(18, Math.min(92, smoothed));
              }
            });

          previousAudioDataRef.current = newData;
          setAudioData(newData);
        } else if (isPlaying) {
          // Simulation réaliste basée sur un vrai spectre audio
          // Crée une courbe naturelle : basses stables, moyennes modérées, aigus prononcés
          const newData = Array(20)
            .fill(0)
            .map((_, index) => {
              const position = index / 20;
              const normalizedPosition = index / 19; // 0 à 1

              // Beat global pour synchroniser toutes les fréquences
              const beat = Math.sin(time * 2 * Math.PI) * 0.5 + 0.5;
              const beatPower = Math.pow(beat, 2);

              // Créer une courbe de réponse en fréquence réaliste
              // Les basses sont plus présentes et stables
              // Les aigus sont plus prononcés et varient plus

              let frequencyValue = 0;

              if (index < 7) {
                // BASSES (0-6) : Stables et continues, base élevée
                // Les basses sont généralement plus présentes dans la musique
                const bassBase = 45 + 15 * beatPower; // Base stable avec variation de beat
                const bassVariation = Math.sin(time * 0.8 + index * 0.5) * 8; // Variation lente
                const bassKick = Math.sin(time * 1.2) > 0.85 ? 12 : 0; // Kicks occasionnels
                frequencyValue = bassBase + bassVariation + bassKick;

                // Smoothing avec valeur précédente pour stabilité
                const currentValue = previousAudioDataRef.current[index] || bassBase;
                frequencyValue = currentValue * 0.85 + frequencyValue * 0.15;
              } else if (index < 14) {
                // MOYENNES (7-13) : Modérées, variation moyenne
                // Les moyennes varient plus que les basses mais moins que les aigus
                const midBase = 30 + 20 * beatPower;
                const midWave1 = Math.sin(time * 2.5 + index * 0.8) * 12;
                const midWave2 = Math.sin(time * 4.0 + index * 1.2) * 8;
                const midVariation = midWave1 + midWave2;
                frequencyValue = midBase + midVariation;

                // Smoothing modéré
                const currentValue = previousAudioDataRef.current[index] || midBase;
                frequencyValue = currentValue * 0.7 + frequencyValue * 0.3;
              } else {
                // AIGUS (14-19) : Prononcés et réactifs, comme dans le logo
                // Les aigus créent des pics prononcés et varient beaucoup
                const highBase = 20 + 25 * beatPower;

                // Créer des pics prononcés pour les aigus (comme dans le logo)
                // Plus on va vers la droite, plus les pics sont prononcés
                const highness = (index - 14) / 5; // 0 à 1 pour les aigus
                const peakIntensity = 1 + highness * 1.5; // Pics plus prononcés à droite

                const highWave1 = Math.sin(time * 6.0 + index * 1.5) * 15 * peakIntensity;
                const highWave2 = Math.sin(time * 9.0 + index * 2.0) * 10 * peakIntensity;
                const highWave3 = Math.sin(time * 12.0 + index * 3.0) * 8 * peakIntensity;
                const highVariation = highWave1 + highWave2 + highWave3;

                // Ajouter des pics aléatoires occasionnels pour plus de réalisme
                const randomPeak =
                  Math.random() > 0.92 ? (15 + Math.random() * 20) * peakIntensity : 0;

                frequencyValue = highBase + highVariation + randomPeak;

                // Smoothing léger pour réactivité
                const currentValue = previousAudioDataRef.current[index] || highBase;
                frequencyValue = currentValue * 0.5 + frequencyValue * 0.5;
              }

              // Appliquer une courbe de réponse en fréquence naturelle
              // Les fréquences extrêmes (très basses et très hautes) sont légèrement atténuées
              const frequencyResponse = 1.0 - Math.abs(normalizedPosition - 0.5) * 0.1;
              frequencyValue *= frequencyResponse;

              // Limiter les valeurs
              return Math.max(20, Math.min(90, frequencyValue));
            });

          previousAudioDataRef.current = newData;
          setAudioData(newData);
        } else {
          // Animation douce et smooth en pause - utilise toute la hauteur disponible
          const newData = Array(20)
            .fill(0)
            .map((_, index) => {
              const position = index / 20;
              // Animation smooth avec amplitude plus importante pour utiliser toute la hauteur
              const baseValue = 40;
              const wave1 = 35 * Math.sin(time * 0.6 + position * 6);
              const wave2 = 25 * Math.sin(time * 1.2 + position * 4);
              const wave3 = 15 * Math.sin(time * 2.0 + position * 10);
              const wave4 = 10 * Math.sin(time * 3.5 + position * 15);

              const value = baseValue + wave1 + wave2 + wave3 + wave4;

              // Smoothing léger pour transition fluide mais pas bloquante
              const currentValue = previousAudioDataRef.current[index] || baseValue;
              const smoothed = currentValue * 0.3 + value * 0.7; // Plus réactif pour animation fluide

              // Utiliser toute la hauteur disponible (15% à 90%)
              return Math.max(15, Math.min(90, smoothed));
            });

          previousAudioDataRef.current = newData;
          setAudioData(newData);
        }

        animationFrameRef.current = requestAnimationFrame(animateBars);
      };

      animateBars();

      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
      };
    } else {
      const resetData = Array(20).fill(20);
      previousAudioDataRef.current = resetData;
      setAudioData(resetData);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    }
  }, [isVisible, isPlaying, frequencyData, isRealAudio]);

  if (!isVisible) {
    return null;
  }

  return (
    <div className="w-full h-full flex items-end justify-center pt-3 pb-0">
      <div className="w-full h-full flex items-end justify-center px-2">
        <div className="flex items-end justify-between w-full h-full gap-[2px]">
          {audioData.map((value, index) => {
            const time = Date.now() / 1000;
            const hue = (index * 12 + time * 50) % 360;
            const saturation = 85 + Math.sin(time * 2 + index) * 10;
            const lightness = 60 + Math.sin(time * 1.5 + index) * 15;

            return (
              <motion.div
                key={`waveform-bar-${index}`}
                className="rounded-t-md flex-1"
                style={{
                  height: `${value}%`,
                  minWidth: '4px',
                  maxHeight: '100%',
                  background: `linear-gradient(to top, 
                    hsla(${hue}, ${saturation}%, ${lightness - 20}%, 0.9) 0%, 
                    hsla(${hue + 25}, ${saturation}%, ${lightness}%, 1) 50%, 
                    hsla(${hue + 50}, ${saturation}%, ${lightness + 15}%, 0.95) 100%)`,
                  boxShadow: `0 0 20px hsla(${hue}, 95%, 65%, 1)`,
                  filter: 'blur(0.5px)',
                }}
                initial={{ height: '30%', opacity: 0 }}
                animate={{
                  height: `${value}%`,
                  opacity: 1,
                }}
                transition={{
                  duration: 0.15,
                  ease: 'easeOut',
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};
