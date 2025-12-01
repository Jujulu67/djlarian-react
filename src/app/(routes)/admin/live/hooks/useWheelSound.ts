import { useCallback, useRef } from 'react';

export function useWheelSound() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  const playWheelSound = useCallback((duration: number = 4500) => {
    try {
      // Créer l'audio context si nécessaire
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const audioContext = audioContextRef.current;

      // Créer un oscillateur pour le son de roue
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      // Configurer l'oscillateur pour un son de roue qui tourne
      oscillator.type = 'sawtooth'; // Son plus riche, comme une roue mécanique
      oscillator.frequency.setValueAtTime(150, audioContext.currentTime); // Fréquence de départ

      // Configurer le gain (volume)
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime); // Volume initial

      // Connecter les nodes
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Sauvegarder les références
      oscillatorRef.current = oscillator;
      gainNodeRef.current = gainNode;

      // Animation de la fréquence : ralentit progressivement
      const startTime = audioContext.currentTime;
      const endTime = startTime + duration / 1000;

      // Ralentir progressivement la fréquence (de 150Hz à 50Hz)
      oscillator.frequency.exponentialRampToValueAtTime(50, endTime);

      // Fade out du volume à la fin
      const fadeOutStart = endTime - 0.3; // Commencer le fade out 300ms avant la fin
      gainNode.gain.setValueAtTime(0.3, startTime);
      gainNode.gain.linearRampToValueAtTime(0.1, fadeOutStart);
      gainNode.gain.linearRampToValueAtTime(0, endTime);

      // Démarrer le son
      oscillator.start(startTime);
      oscillator.stop(endTime);

      // Nettoyer après la fin
      oscillator.onended = () => {
        oscillatorRef.current = null;
        gainNodeRef.current = null;
      };
    } catch (error) {
      console.error('Erreur lors de la génération du son:', error);
      // Silencieusement ignorer les erreurs (par exemple si l'utilisateur n'a pas interagi avec la page)
    }
  }, []);

  const stopWheelSound = useCallback(() => {
    try {
      if (oscillatorRef.current) {
        oscillatorRef.current.stop();
        oscillatorRef.current = null;
      }
      if (gainNodeRef.current) {
        gainNodeRef.current = null;
      }
    } catch (error) {
      console.error("Erreur lors de l'arrêt du son:", error);
    }
  }, []);

  return {
    playWheelSound,
    stopWheelSound,
  };
}
