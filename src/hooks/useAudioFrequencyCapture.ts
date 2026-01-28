import { useEffect, useRef, useState } from 'react';

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

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const win = window as any;
        let audioContext: AudioContext;

        if (win.globalAudioContext) {
          audioContext = win.globalAudioContext;
        } else {
          audioContext = new AudioContextClass();
          win.globalAudioContext = audioContext;
        }

        // Ensure audio context is running
        if (audioContext.state === 'suspended') {
          await audioContext.resume();
        }

        // Try to find audio element in iframe (may be blocked by CORS)
        // This approach won't work due to CORS, but we try anyway
        try {
          const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
          if (iframeDoc) {
            // Try to find audio/video elements in the iframe
            const audioElements = iframeDoc.querySelectorAll('audio, video');

            if (audioElements.length > 0) {
              // Found audio/video element - try to connect to it
              const mediaElement = audioElements[0] as HTMLMediaElement;

              // Create analyser
              if (!analyserRef.current) {
                analyserRef.current = audioContext.createAnalyser();
                analyserRef.current.fftSize = 2048;
                analyserRef.current.smoothingTimeConstant = 0.1;
              }

              // Create source from media element
              if (sourceNodeRef.current) {
                sourceNodeRef.current.disconnect();
              }

              sourceNodeRef.current = audioContext.createMediaElementSource(mediaElement);

              // Connect to analyser for frequency analysis
              sourceNodeRef.current.connect(analyserRef.current);

              // Also connect to global gain node if it exists (for volume control)
              const globalGainNode = win.globalGainNode;
              if (globalGainNode) {
                analyserRef.current.connect(globalGainNode);
              } else {
                // Fallback: connect directly to destination
                analyserRef.current.connect(audioContext.destination);
              }

              const analyser = analyserRef.current;
              const bufferLength = analyser.frequencyBinCount;
              const dataArray = new Uint8Array(bufferLength);

              setIsCapturing(true);

              // Update frequency data continuously
              const updateFrequencyData = () => {
                if (!isPlaying || !isVisible) {
                  return;
                }

                analyser.getByteFrequencyData(dataArray);
                setFrequencyData(new Uint8Array(dataArray));

                animationFrameRef.current = requestAnimationFrame(updateFrequencyData);
              };

              updateFrequencyData();
              return; // Success - exit early
            }
          }
        } catch (iframeError) {
          // CORS error - can't access iframe content (expected)
          logger.debug('Cannot access iframe content (CORS - expected):', iframeError);
        }

        // Alternative approach: Try to use the global gain node's input
        // If we can access the source connected to the global gain node, we can analyze it
        // However, this requires modifying the audioUtils to expose the source
        // For now, we'll note that direct iframe audio capture is not possible due to CORS
        logger.debug('Direct iframe audio capture not possible due to CORS restrictions');

        // Fallback: Try to use Web Audio API with system audio capture
        // This requires user permission via getDisplayMedia
        // This is the ONLY way to capture audio from iframes due to CORS restrictions
        //
        // Note: Due to browser security (CORS), we cannot directly access audio from
        // YouTube/SoundCloud iframes. The only workaround is to use getDisplayMedia
        // which captures system audio but requires explicit user permission.
        //
        // getDisplayMedia requires:
        // - HTTPS (or localhost)
        // - User interaction (cannot be called automatically)
        // - Browser support (Chrome 72+, Edge 79+, Firefox 66+, Safari 13+)
        try {
          // Check if getDisplayMedia is available
          if (!navigator.mediaDevices) {
            throw new Error('navigator.mediaDevices is not available (requires HTTPS)');
          }

          if (!navigator.mediaDevices.getDisplayMedia) {
            throw new Error('getDisplayMedia is not supported in this browser');
          }

          // Note: getDisplayMedia can only be called from a user interaction context
          // If called automatically, it may fail. We'll try anyway but expect it might fail.
          logger.debug('Attempting to request audio capture permission via getDisplayMedia...');
          logger.debug(
            'Note: This requires HTTPS and user interaction. If it fails, enhanced simulation will be used.'
          );

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
            setIsCapturing(false);
            setFrequencyData(null);
          });

          // Create analyser
          if (!analyserRef.current) {
            analyserRef.current = audioContext.createAnalyser();
            analyserRef.current.fftSize = 2048;
            analyserRef.current.smoothingTimeConstant = 0.1;
          }

          const analyser = analyserRef.current;
          const bufferLength = analyser.frequencyBinCount;
          const dataArray = new Uint8Array(bufferLength);

          // Connect stream to analyser
          const source = audioContext.createMediaStreamSource(stream);
          source.connect(analyser);
          streamRef.current = stream;

          setIsCapturing(true);

          // Update frequency data continuously
          const updateFrequencyData = () => {
            if (!isPlaying || !isVisible) {
              return;
            }

            analyser.getByteFrequencyData(dataArray);
            setFrequencyData(new Uint8Array(dataArray));

            animationFrameRef.current = requestAnimationFrame(updateFrequencyData);
          };

          updateFrequencyData();
        } catch (error) {
          // Fallback: If we can't capture real audio, we'll use enhanced simulation
          //
          // Why real audio capture fails:
          // 1. CORS restrictions prevent direct iframe audio access (security)
          // 2. getDisplayMedia requires HTTPS and user interaction
          // 3. Browser may not support getDisplayMedia
          // 4. User may deny permission
          //
          // The enhanced simulation provides a realistic visualization that mimics
          // real audio frequency patterns (bass stable, mids moderate, highs pronounced)
          const errorMessage = error instanceof Error ? error.message : String(error);
          logger.debug(
            `Real audio capture not available (${errorMessage}). Using enhanced simulation for visualization.`
          );
          setIsCapturing(false);

          // Note: This is expected behavior - direct audio capture from iframes
          // is blocked by browser security. The simulation is designed to look realistic.
        }
      } catch (error) {
        logger.error('Error setting up audio capture:', error);
        setIsCapturing(false);
      }
    };

    setupAudioCapture();

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
  }, [iframeRef, isPlaying, isVisible]);

  return {
    frequencyData,
    isCapturing,
  };
};
