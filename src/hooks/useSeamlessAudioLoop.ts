'use client';

import { useRef, useCallback, useEffect, useState, useMemo } from 'react';

// Generate smooth S-curve (sigmoid) crossfade for transparent transitions
function generateCrossfadeCurves(steps: number): {
  fadeIn: Float32Array;
  fadeOut: Float32Array;
} {
  const fadeIn = new Float32Array(steps);
  const fadeOut = new Float32Array(steps);

  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1); // 0 to 1

    // Smoothstep S-curve: 3t² - 2t³ (smoother than sin/cos)
    // Even smoother: smootherstep 6t⁵ - 15t⁴ + 10t³
    const smooth = t * t * t * (t * (t * 6 - 15) + 10);

    fadeIn[i] = smooth;
    fadeOut[i] = 1 - smooth;
  }

  return { fadeIn, fadeOut };
}

interface AudioSource {
  source: AudioBufferSourceNode;
  gain: GainNode;
  startTime: number;
  endTime: number;
}

interface UseSeamlessAudioLoopOptions {
  basePath: string;
  files: string[];
  crossfadeDuration?: number;
  /**
   * Time in seconds from the END of the sample where the loop region starts.
   * E.g., loopLastSeconds: 2 means the loop will play the last 2 seconds repeatedly.
   * This avoids the natural fade-in at the beginning of samples.
   * If not set or 0, loops from the beginning (full sample).
   */
  loopLastSeconds?: number;
}

interface UseSeamlessAudioLoopReturn {
  isLoaded: boolean;
  isPlaying: boolean;
  currentFile: string | null;
  play: (file: string) => void;
  stop: () => void;
  switchTo: (file: string) => void;
}

export function useSeamlessAudioLoop({
  basePath,
  files,
  crossfadeDuration = 0.2,
  loopLastSeconds = 0,
}: UseSeamlessAudioLoopOptions): UseSeamlessAudioLoopReturn {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFile, setCurrentFile] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const buffersRef = useRef<Map<string, AudioBuffer>>(new Map());
  const currentSourceRef = useRef<AudioSource | null>(null);
  const nextSourceRef = useRef<AudioSource | null>(null);
  const scheduledEndRef = useRef<number>(0);
  const isSchedulingRef = useRef(false);
  const animationFrameRef = useRef<number | null>(null);
  const currentFileRef = useRef<string | null>(null);

  // Pre-compute S-curve crossfade (256 steps for ultra-smooth transitions)
  const { fadeIn, fadeOut } = useMemo(() => generateCrossfadeCurves(256), []);

  // Keep ref in sync with state for use in callbacks
  useEffect(() => {
    currentFileRef.current = currentFile;
  }, [currentFile]);

  // Initialize AudioContext on first user interaction
  const getAudioContext = useCallback(async () => {
    // Create new context if none exists or if previous one was closed
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      const AudioContextClass =
        window.AudioContext ||
        (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) {
        throw new Error('Web Audio API is not supported in this browser');
      }
      audioContextRef.current = new AudioContextClass();
    }

    // Bypass iOS silent switch by playing a silent HTMLAudioElement
    // This only works within a user gesture
    try {
      const silentAudio = new Audio();
      // Use a tiny silent base64 WAV if possible, or just play/stop
      silentAudio.src =
        'data:audio/wav;base64,UklGRigAAABXQVZFav77vv77vv77vv77vv77vv77vv77vv77vv77vv77vv77vv77';
      await silentAudio.play();
      setTimeout(() => {
        silentAudio.pause();
        silentAudio.remove();
      }, 100);
    } catch (e) {
      // Ignore errors if gesture wasn't detected or other failures
    }

    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }

    return audioContextRef.current;
  }, []);

  // Load a single audio file
  const loadAudioBuffer = useCallback(
    async (url: string): Promise<AudioBuffer> => {
      const ctx = await getAudioContext();
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      return ctx.decodeAudioData(arrayBuffer);
    },
    [getAudioContext]
  );

  // Preload all audio files
  useEffect(() => {
    let mounted = true;

    const preloadAll = async () => {
      try {
        // Just warm up the buffers if we already have a context,
        // but don't force context creation here as it's not a user gesture
        files.map(async (file) => {
          const url = `${basePath}/${file}`;
          try {
            // Check if we already have the buffer
            if (buffersRef.current.has(file)) return;

            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();

            // We need a context to decode, but we shouldn't create/resume it here
            // if it's not a user gesture. We'll decode later in play() if needed.
            // However, if we ALREADY have a running context, we can decode now.
            if (audioContextRef.current && audioContextRef.current.state === 'running') {
              const buffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
              if (mounted) {
                buffersRef.current.set(file, buffer);
              }
            }
          } catch (err) {
            console.warn(`Failed to preload ${url}:`, err);
          }
        });

        if (mounted) {
          setIsLoaded(true);
        }
      } catch (err) {
        console.error('Failed to preload audio:', err);
      }
    };

    preloadAll();

    return () => {
      mounted = false;
    };
  }, [basePath, files]);

  // Create a new audio source with gain node
  const createSource = useCallback(
    async (buffer: AudioBuffer, startOffset: number = 0): Promise<AudioSource> => {
      const ctx = await getAudioContext();
      const source = ctx.createBufferSource();
      const gain = ctx.createGain();

      source.buffer = buffer;
      source.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.value = 0;

      const now = ctx.currentTime;
      const duration = buffer.duration - startOffset;

      return {
        source,
        gain,
        startTime: now,
        endTime: now + duration,
      };
    },
    [getAudioContext]
  );

  // Schedule the next loop iteration
  const scheduleNextLoop = useCallback(() => {
    if (!isPlaying || !currentFileRef.current || isSchedulingRef.current) return;

    const ctx = audioContextRef.current;
    if (!ctx || ctx.state === 'closed') return;

    const buffer = buffersRef.current.get(currentFileRef.current);
    if (!buffer) return;

    const now = ctx.currentTime;
    const timeUntilEnd = scheduledEndRef.current - now;

    // Schedule next loop when we're within 2x crossfade duration of the end
    if (timeUntilEnd <= crossfadeDuration * 2 && timeUntilEnd > 0) {
      isSchedulingRef.current = true;

      const crossfadeStart = scheduledEndRef.current - crossfadeDuration;

      // Calculate loop region: if loopLastSeconds is set, loop only the last N seconds
      const loopStartOffset =
        loopLastSeconds > 0 ? Math.max(0, buffer.duration - loopLastSeconds) : 0;
      const loopDuration = buffer.duration - loopStartOffset;

      // Create next source starting at loop point
      createSource(buffer, loopStartOffset).then((nextAudio) => {
        nextSourceRef.current = nextAudio;

        // Schedule crossfade for current source (fade out)
        if (currentSourceRef.current) {
          const currentGain = currentSourceRef.current.gain.gain;
          try {
            currentGain.cancelScheduledValues(crossfadeStart);
            currentGain.setValueAtTime(1, crossfadeStart);
            currentGain.setValueCurveAtTime(fadeOut, crossfadeStart, crossfadeDuration);
          } catch (e) {
            // Ignore scheduling conflicts
          }
        }

        // Schedule next source to start at loop offset and fade in
        try {
          nextAudio.source.start(crossfadeStart, loopStartOffset);
          nextAudio.gain.gain.cancelScheduledValues(crossfadeStart);
          nextAudio.gain.gain.setValueAtTime(0, crossfadeStart);
          nextAudio.gain.gain.setValueCurveAtTime(fadeIn, crossfadeStart, crossfadeDuration);
        } catch (e) {
          // Ignore scheduling conflicts
        }

        // Update timing based on loop region duration
        nextAudio.startTime = crossfadeStart;
        nextAudio.endTime = crossfadeStart + loopDuration;
        scheduledEndRef.current = nextAudio.endTime;

        // When crossfade is done, swap references
        setTimeout(
          () => {
            if (currentSourceRef.current) {
              try {
                currentSourceRef.current.source.stop();
                currentSourceRef.current.source.disconnect();
                currentSourceRef.current.gain.disconnect();
              } catch (e) {
                // Ignore if already stopped
              }
            }
            currentSourceRef.current = nextSourceRef.current;
            nextSourceRef.current = null;
            isSchedulingRef.current = false;
          },
          (crossfadeStart - now + crossfadeDuration) * 1000
        );
      });
    }
  }, [isPlaying, crossfadeDuration, createSource, fadeIn, fadeOut, loopLastSeconds]);

  // Animation loop to check scheduling
  useEffect(() => {
    if (!isPlaying) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    const tick = () => {
      scheduleNextLoop();
      animationFrameRef.current = requestAnimationFrame(tick);
    };

    animationFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isPlaying, scheduleNextLoop]);

  // Start playback
  const play = useCallback(
    (file: string) => {
      // Run async logic in a fire-and-forget IIFE so the public API stays sync
      (async () => {
        try {
          let buffer = buffersRef.current.get(file);

          // On some browsers (notably iOS Safari), preloading with WebAudio can fail
          // before a user gesture. If the buffer is missing on first play, lazily
          // load & decode it now within the click/tap handler.
          if (!buffer) {
            try {
              const url = `${basePath}/${file}`;
              buffer = await loadAudioBuffer(url);
              buffersRef.current.set(file, buffer);
            } catch (err) {
              console.warn(`Failed to lazily load buffer for ${file}:`, err);
              return;
            }
          }

          const ctx = await getAudioContext();

          // Stop any existing playback
          if (currentSourceRef.current) {
            try {
              currentSourceRef.current.source.stop();
              currentSourceRef.current.source.disconnect();
              currentSourceRef.current.gain.disconnect();
            } catch (e) {
              // Ignore
            }
          }
          if (nextSourceRef.current) {
            try {
              nextSourceRef.current.source.stop();
              nextSourceRef.current.source.disconnect();
              nextSourceRef.current.gain.disconnect();
            } catch (e) {
              // Ignore
            }
          }

          // Create and start new source
          const audioSource = await createSource(buffer);
          currentSourceRef.current = audioSource;
          nextSourceRef.current = null;
          isSchedulingRef.current = false;

          audioSource.source.start(0);
          audioSource.gain.gain.setValueAtTime(0, ctx.currentTime);
          audioSource.gain.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.05); // Quick fade in

          scheduledEndRef.current = ctx.currentTime + buffer.duration;

          setCurrentFile(file);
          setIsPlaying(true);
        } catch (err) {
          console.error('Error in play:', err);
        }
      })();
    },
    [basePath, getAudioContext, createSource, loadAudioBuffer]
  );

  // Stop playback
  const stop = useCallback(() => {
    const ctx = audioContextRef.current;
    if (!ctx || ctx.state === 'closed') return;

    const fadeOutDuration = 0.15;
    const now = ctx.currentTime;

    // Fade out current source
    if (currentSourceRef.current) {
      const currentGain = currentSourceRef.current.gain.gain;
      currentGain.cancelScheduledValues(now);
      currentGain.setValueAtTime(currentGain.value, now);
      currentGain.linearRampToValueAtTime(0, now + fadeOutDuration);

      setTimeout(() => {
        if (currentSourceRef.current) {
          try {
            currentSourceRef.current.source.stop();
            currentSourceRef.current.source.disconnect();
            currentSourceRef.current.gain.disconnect();
          } catch (e) {
            // Ignore
          }
          currentSourceRef.current = null;
        }
      }, fadeOutDuration * 1000);
    }

    // Fade out next source if scheduled
    if (nextSourceRef.current) {
      const nextGain = nextSourceRef.current.gain.gain;
      nextGain.cancelScheduledValues(now);
      nextGain.setValueAtTime(nextGain.value, now);
      nextGain.linearRampToValueAtTime(0, now + fadeOutDuration);

      setTimeout(() => {
        if (nextSourceRef.current) {
          try {
            nextSourceRef.current.source.stop();
            nextSourceRef.current.source.disconnect();
            nextSourceRef.current.gain.disconnect();
          } catch (e) {
            // Ignore
          }
          nextSourceRef.current = null;
        }
      }, fadeOutDuration * 1000);
    }

    setIsPlaying(false);
    setCurrentFile(null);
    isSchedulingRef.current = false;
  }, []);

  // Switch to a different file while maintaining playback
  const switchTo = useCallback(
    async (file: string) => {
      if (!isPlaying) {
        play(file);
        return;
      }

      const buffer = buffersRef.current.get(file);
      if (!buffer) {
        console.warn(`Buffer not loaded for ${file}`);
        return;
      }

      try {
        const ctx = await getAudioContext();
        const now = ctx.currentTime;
        const switchDuration = crossfadeDuration;

        // Calculate current position in the loop (normalized 0-1)
        let currentPosition = 0;
        if (currentSourceRef.current && currentFileRef.current) {
          const currentBuffer = buffersRef.current.get(currentFileRef.current);
          if (currentBuffer && currentBuffer.duration > 0) {
            const elapsed = now - currentSourceRef.current.startTime;
            currentPosition = (elapsed % currentBuffer.duration) / currentBuffer.duration;
          }
        }

        // Create new source at the same relative position
        const startOffset = currentPosition * buffer.duration;
        const safeStartOffset = isFinite(startOffset) ? startOffset : 0;

        const newAudio = await createSource(buffer, safeStartOffset);
        const switchNow = ctx.currentTime;

        // Fade out current with equal-power curve
        if (currentSourceRef.current) {
          const currentGain = currentSourceRef.current.gain.gain;
          try {
            currentGain.cancelScheduledValues(switchNow);
            currentGain.setValueAtTime(currentGain.value, switchNow);
            currentGain.setValueCurveAtTime(fadeOut, switchNow, switchDuration);
          } catch (e) {
            // Ignore scheduling conflicts
          }

          const oldSource = currentSourceRef.current;
          setTimeout(() => {
            try {
              oldSource.source.stop();
              oldSource.source.disconnect();
              oldSource.gain.disconnect();
            } catch (e) {
              // Ignore already stopped
            }
          }, switchDuration * 1000);
        }

        // Cancel any scheduled next source
        if (nextSourceRef.current) {
          try {
            nextSourceRef.current.source.stop();
            nextSourceRef.current.source.disconnect();
            nextSourceRef.current.gain.disconnect();
          } catch (e) {
            // Ignore
          }
          nextSourceRef.current = null;
        }

        // Start new source with fade in - equal power curve
        try {
          newAudio.source.start(0, safeStartOffset);
          newAudio.gain.gain.setValueAtTime(0, switchNow);
          newAudio.gain.gain.setValueCurveAtTime(fadeIn, switchNow, switchDuration);
        } catch (e) {
          console.error('Failed to start new audio source:', e);
        }

        newAudio.startTime = switchNow - safeStartOffset;
        newAudio.endTime = switchNow + (buffer.duration - safeStartOffset);
        scheduledEndRef.current = newAudio.endTime;

        currentSourceRef.current = newAudio;
        isSchedulingRef.current = false;

        setCurrentFile(file);
      } catch (err) {
        console.error('Error in switchTo:', err);
      }
    },
    [isPlaying, crossfadeDuration, createSource, play, getAudioContext, fadeIn, fadeOut]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (currentSourceRef.current) {
        try {
          currentSourceRef.current.source.stop();
          currentSourceRef.current.source.disconnect();
          currentSourceRef.current.gain.disconnect();
        } catch (e) {
          // Ignore
        }
      }
      if (nextSourceRef.current) {
        try {
          nextSourceRef.current.source.stop();
          nextSourceRef.current.source.disconnect();
          nextSourceRef.current.gain.disconnect();
        } catch (e) {
          // Ignore
        }
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return {
    isLoaded,
    isPlaying,
    currentFile,
    play,
    stop,
    switchTo,
  };
}
