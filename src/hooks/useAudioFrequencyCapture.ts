import { useEffect, useRef, useState, useCallback } from 'react';

import { logger } from '@/lib/logger';

interface UseAudioFrequencyCaptureProps {
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  isPlaying: boolean;
  isVisible: boolean;
}

interface UseAudioFrequencyCaptureReturn {
  frequencyData: Uint8Array | null;
  isCapturing: boolean;
}

type AudioCaptureRefs = {
  analyserRef: { current: AnalyserNode | null };
  sourceNodeRef: { current: MediaElementAudioSourceNode | null };
  streamRef: { current: MediaStream | null };
};

type AudioCaptureCallbacks = {
  startFrequencyLoop: (analyser: AnalyserNode, dataArray: Uint8Array<ArrayBuffer>) => void;
  setIsCapturing: (value: boolean) => void;
  setFrequencyData: (value: Uint8Array | null) => void;
};

type GlobalAudioWindow = typeof window & {
  globalAudioContext?: AudioContext;
  globalGainNode?: AudioNode;
};

// Réutilise le contexte audio global (celui du contrôle de volume) ou le crée
function getGlobalAudioContext(AudioContextClass: typeof AudioContext): AudioContext {
  const win = window as GlobalAudioWindow;
  if (win.globalAudioContext) {
    return win.globalAudioContext;
  }
  const audioContext = new AudioContextClass();
  win.globalAudioContext = audioContext;
  return audioContext;
}

// Crée l'analyser s'il n'existe pas encore
function ensureAnalyser(audioContext: AudioContext, analyserRef: AudioCaptureRefs['analyserRef']) {
  if (!analyserRef.current) {
    analyserRef.current = audioContext.createAnalyser();
    analyserRef.current.fftSize = 2048;
    analyserRef.current.smoothingTimeConstant = 0.1;
  }
  return analyserRef.current;
}

// Essaie de brancher l'élément média de l'iframe (bloqué par CORS la plupart du temps)
function tryConnectIframeMedia(
  iframe: HTMLIFrameElement,
  audioContext: AudioContext,
  refs: AudioCaptureRefs,
  startFrequencyLoop: AudioCaptureCallbacks['startFrequencyLoop'],
  setIsCapturing: AudioCaptureCallbacks['setIsCapturing']
): boolean {
  try {
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) return false;

    const audioElements = iframeDoc.querySelectorAll('audio, video');
    if (audioElements.length === 0) return false;

    // Found audio/video element - try to connect to it
    const mediaElement = audioElements[0] as HTMLMediaElement;
    const analyser = ensureAnalyser(audioContext, refs.analyserRef);

    // Create source from media element
    if (refs.sourceNodeRef.current) {
      refs.sourceNodeRef.current.disconnect();
    }
    refs.sourceNodeRef.current = audioContext.createMediaElementSource(mediaElement);

    // Connect to analyser for frequency analysis
    refs.sourceNodeRef.current.connect(analyser);

    // Also connect to global gain node if it exists (for volume control)
    const globalGainNode = (window as GlobalAudioWindow).globalGainNode;
    if (globalGainNode) {
      analyser.connect(globalGainNode);
    } else {
      // Fallback: connect directly to destination
      analyser.connect(audioContext.destination);
    }

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    setIsCapturing(true);
    startFrequencyLoop(analyser, dataArray);
    return true;
  } catch (iframeError) {
    // CORS error - can't access iframe content (expected)
    logger.debug('Cannot access iframe content (CORS - expected):', iframeError);
    return false;
  }
}

// Capture du son système via getDisplayMedia (demande une permission ; lève une erreur si indisponible)
async function captureDisplayAudio(
  audioContext: AudioContext,
  refs: AudioCaptureRefs,
  callbacks: AudioCaptureCallbacks
): Promise<void> {
  // Check if getDisplayMedia is available
  if (!navigator.mediaDevices) {
    throw new Error('navigator.mediaDevices is not available (requires HTTPS)');
  }

  if (!navigator.mediaDevices.getDisplayMedia) {
    throw new Error('getDisplayMedia is not supported in this browser');
  }

  // Note: getDisplayMedia can only be called from a user interaction context
  logger.debug('Attempting to request audio capture permission via getDisplayMedia...');

  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: false, // We only need audio
    audio: {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
      suppressLocalAudioPlayback: false,
    } as MediaTrackConstraints,
  });

  // Check if audio track is available
  const audioTracks = stream.getAudioTracks();
  if (audioTracks.length === 0) {
    throw new Error('No audio track available - user may have selected video only');
  }

  // User granted permission - we can now capture audio
  logger.debug(
    'User granted audio capture permission via getDisplayMedia - real audio capture active!'
  );

  // Listen for track ending (user stops sharing)
  audioTracks[0].addEventListener('ended', () => {
    logger.debug('Audio track ended - user stopped sharing');
    callbacks.setIsCapturing(false);
    callbacks.setFrequencyData(null);
  });

  const analyser = ensureAnalyser(audioContext, refs.analyserRef);
  const dataArray = new Uint8Array(analyser.frequencyBinCount);

  // Connect stream to analyser
  const source = audioContext.createMediaStreamSource(stream);
  source.connect(analyser);
  refs.streamRef.current = stream;

  callbacks.setIsCapturing(true);
  callbacks.startFrequencyLoop(analyser, dataArray);
}

/**
 * Hook to capture real audio frequencies from YouTube/SoundCloud iframes
 * Attempts to hijack audio stream using Web Audio API
 */
export const useAudioFrequencyCapture = ({
  iframeRef,
  isPlaying,
  isVisible,
}: UseAudioFrequencyCaptureProps): UseAudioFrequencyCaptureReturn => {
  const [frequencyData, setFrequencyData] = useState<Uint8Array | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Lit le spectre à chaque image tant que le lecteur joue et reste visible
  const startFrequencyLoop = useCallback(
    (analyser: AnalyserNode, dataArray: Uint8Array<ArrayBuffer>) => {
      const tick = () => {
        if (!isPlaying || !isVisible) return;
        analyser.getByteFrequencyData(dataArray);
        setFrequencyData(new Uint8Array(dataArray));
        animationFrameRef.current = requestAnimationFrame(tick);
      };
      tick();
    },
    [isPlaying, isVisible]
  );

  useEffect(() => {
    if (!isVisible || !isPlaying || !iframeRef.current) {
      // Cleanup when not needed
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (sourceNodeRef.current) {
        try {
          sourceNodeRef.current.disconnect();
        } catch (e) {
          // Ignore disconnect errors
        }
        sourceNodeRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      setIsCapturing(false);
      setFrequencyData(null);
      return;
    }

    const setupAudioCapture = async () => {
      try {
        const iframe = iframeRef.current;
        if (!iframe) return;

        const AudioContextClass =
          window.AudioContext ||
          (window as typeof window & { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext;
        if (!AudioContextClass) {
          logger.warn('AudioContext not supported');
          return;
        }

        // Use or create the global audio context (same as used for volume control)
        const audioContext = getGlobalAudioContext(AudioContextClass);

        // Ensure audio context is running
        if (audioContext.state === 'suspended') {
          await audioContext.resume();
        }

        const refs = { analyserRef, sourceNodeRef, streamRef };
        if (tryConnectIframeMedia(iframe, audioContext, refs, startFrequencyLoop, setIsCapturing)) {
          return; // Success - exit early
        }

        // Direct iframe audio capture not possible due to CORS restrictions
        logger.debug('Direct iframe audio capture not possible due to CORS restrictions');

        try {
          await captureDisplayAudio(audioContext, refs, {
            startFrequencyLoop,
            setIsCapturing,
            setFrequencyData,
          });
        } catch (error) {
          // Fallback: If we can't capture real audio, we'll use enhanced simulation
          // (CORS, HTTPS/user interaction required, browser support, or permission denied)
          const errorMessage = error instanceof Error ? error.message : String(error);
          logger.debug(
            `Real audio capture not available (${errorMessage}). Using enhanced simulation for visualization.`
          );
          setIsCapturing(false);
        }
      } catch (error) {
        logger.error('Error setting up audio capture:', error);
        setIsCapturing(false);
      }
    };

    void setupAudioCapture();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (sourceNodeRef.current) {
        try {
          sourceNodeRef.current.disconnect();
        } catch (e) {
          // Ignore
        }
        sourceNodeRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [iframeRef, isPlaying, isVisible, startFrequencyLoop]);

  return {
    frequencyData,
    isCapturing,
  };
};
