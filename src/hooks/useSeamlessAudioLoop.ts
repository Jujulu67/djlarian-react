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
  const getAudioContext = useCallback(() => {
    // Create new context if none exists or if previous one was closed
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      audioContextRef.current = new AudioContext();
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  }, []);

  // Load a single audio file
  const loadAudioBuffer = useCallback(
    async (url: string): Promise<AudioBuffer> => {
      const ctx = getAudioContext();
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
        const ctx = getAudioContext();

        const loadPromises = files.map(async (file) => {
          const url = `${basePath}/${file}`;
          try {
            const buffer = await loadAudioBuffer(url);
            if (mounted) {
              buffersRef.current.set(file, buffer);
            }
          } catch (err) {
            console.warn(`Failed to load ${url}:`, err);
          }
        });

        await Promise.all(loadPromises);

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
  }, [basePath, files, getAudioContext, loadAudioBuffer]);

  // Create a new audio source with gain node
  const createSource = useCallback(
    (buffer: AudioBuffer, startOffset: number = 0): AudioSource => {
      const ctx = getAudioContext();
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
      const nextAudio = createSource(buffer, loopStartOffset);
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
      const buffer = buffersRef.current.get(file);
      if (!buffer) {
        console.warn(`Buffer not loaded for ${file}`);
        return;
      }

      const ctx = getAudioContext();

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
      const audioSource = createSource(buffer);
      currentSourceRef.current = audioSource;
      nextSourceRef.current = null;
      isSchedulingRef.current = false;

      audioSource.source.start(0);
      audioSource.gain.gain.setValueAtTime(0, ctx.currentTime);
      audioSource.gain.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.05); // Quick fade in

      scheduledEndRef.current = ctx.currentTime + buffer.duration;

      setCurrentFile(file);
      setIsPlaying(true);
    },
    [getAudioContext, createSource]
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
    (file: string) => {
      if (!isPlaying) {
        play(file);
        return;
      }

      const buffer = buffersRef.current.get(file);
      if (!buffer) {
        console.warn(`Buffer not loaded for ${file}`);
        return;
      }

      const ctx = getAudioContext();

      const now = ctx.currentTime;
      const switchDuration = crossfadeDuration;

      // Calculate current position in the loop (normalized 0-1)
      let currentPosition = 0;
      if (currentSourceRef.current && currentFileRef.current) {
        const currentBuffer = buffersRef.current.get(currentFileRef.current);
        if (currentBuffer) {
          const elapsed = now - currentSourceRef.current.startTime;
          currentPosition = (elapsed % currentBuffer.duration) / currentBuffer.duration;
        }
      }

      // Create new source at the same relative position
      const startOffset = currentPosition * buffer.duration;
      const newAudio = createSource(buffer, startOffset);

      // Fade out current with equal-power curve
      if (currentSourceRef.current) {
        const currentGain = currentSourceRef.current.gain.gain;
        currentGain.cancelScheduledValues(now);
        currentGain.setValueAtTime(1, now);
        currentGain.setValueCurveAtTime(fadeOut, now, switchDuration);

        const oldSource = currentSourceRef.current;
        setTimeout(() => {
          try {
            oldSource.source.stop();
            oldSource.source.disconnect();
            oldSource.gain.disconnect();
          } catch (e) {
            // Ignore
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
      newAudio.source.start(0, startOffset);
      newAudio.gain.gain.setValueAtTime(0, now);
      newAudio.gain.gain.setValueCurveAtTime(fadeIn, now, switchDuration);

      newAudio.startTime = now - startOffset;
      newAudio.endTime = now + (buffer.duration - startOffset);
      scheduledEndRef.current = newAudio.endTime;

      currentSourceRef.current = newAudio;
      isSchedulingRef.current = false;

      setCurrentFile(file);
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
