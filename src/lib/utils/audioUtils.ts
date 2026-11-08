'use client';

import { logger } from '@/lib/logger';

// Extension de l'interface Window pour les propriétés audio globales
interface WindowWithAudio extends Window {
  globalAudioContext?: AudioContext;
  globalGainNode?: GainNode;
  webkitAudioContext?: typeof AudioContext;
}

// ======================================================================
// Volume Management
// ======================================================================

/**
 * Retrieves the initial volume from localStorage, defaulting to 0.8 if not found or inaccessible.
 * Ensures the returned volume is within the valid range [0, 1].
 */
/**
 * Origine du lecteur intégré (YouTube, youtube-nocookie, SoundCloud), tirée de son `src`.
 * postMessage vise cette origine plutôt que « * » : le message ne part pas si
 * l'iframe a été redirigée ailleurs.
 */
export const getIframeOrigin = (iframe: HTMLIFrameElement): string | null => {
  try {
    const origin = new URL(iframe.src, window.location.href).origin;
    return origin === 'null' ? null : origin;
  } catch {
    return null;
  }
};

export const getInitialVolume = (): number => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const savedVolume = localStorage.getItem('global-music-volume');
      if (savedVolume !== null) {
        const volume = Number(savedVolume);
        logger.debug(`Retrieved initial volume from localStorage: ${volume}`);
        // Ensure the retrieved volume is within the valid range [0, 1]
        return Math.max(0, Math.min(1, volume));
      }
    }
  } catch (error) {
    logger.error('Error reading volume from localStorage:', error);
  }

  logger.debug('Using default initial volume: 0.8');
  return 0.8; // Default value
};

/**
 * Saves the volume to localStorage.
 * @param volume The volume level (0 to 1).
 */
const saveVolumeToLocalStorage = (volume: number): void => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('global-music-volume', String(volume));
      logger.debug(`Volume saved to localStorage: ${volume}`);
    }
  } catch (error) {
    logger.error('Error saving volume to localStorage:', error);
  }
};

// ======================================================================
// Player Command Utilities
// ======================================================================

type PlayerPlatform = 'youtube' | 'soundcloud';
type PlayerCommand = 'play' | 'pause' | 'setVolume' | 'seekTo'; // Added seekTo for future use

/** Commande YouTube (postMessage) ; null si la commande n'est pas supportée. */
function buildYouTubeCommand(
  command: PlayerCommand,
  value?: number
): { func: string; args: (string | number | boolean)[] } | null {
  switch (command) {
    case 'play':
      return { func: 'playVideo', args: [] };
    case 'pause':
      return { func: 'pauseVideo', args: [] };
    case 'setVolume':
      return { func: 'setVolume', args: [value !== undefined ? Math.round(value * 100) : 50] };
    case 'seekTo':
      return { func: 'seekTo', args: [value ?? 0, true] };
    default:
      logger.error(`Unsupported YouTube command: ${command}`);
      return null;
  }
}

/** Commande SoundCloud (postMessage) ; null si la commande n'est pas supportée. */
function buildSoundCloudCommand(
  command: PlayerCommand,
  value?: number
): { method: string; value: string | number | undefined } | null {
  switch (command) {
    case 'play':
      return { method: 'play', value };
    case 'pause':
      return { method: 'pause', value };
    case 'setVolume':
      return { method: 'setVolume', value: value !== undefined ? Math.round(value * 100) : 50 };
    case 'seekTo':
      return { method: 'seekTo', value: value !== undefined ? value * 1000 : 0 };
    default:
      logger.error(`Unsupported SoundCloud command: ${command}`);
      return null;
  }
}

/**
 * Sends a command to a specific player iframe using postMessage.
 *
 * @param iframe The iframe element to send the command to.
 * @param platform The platform type ('youtube' or 'soundcloud').
 * @param command The command to send ('play', 'pause', 'setVolume', 'seekTo').
 * @param value Optional value associated with the command (e.g., volume level, time in seconds).
 */
export const sendPlayerCommand = (
  iframe: HTMLIFrameElement | null,
  platform: PlayerPlatform | null, // Allow null platform for safety
  command: PlayerCommand,
  value?: number
): void => {
  if (!iframe?.contentWindow || !platform) {
    // logger.warn(`Cannot send command: Iframe for ${platform} not ready or accessible.`);
    return;
  }
  const targetOrigin = getIframeOrigin(iframe);
  if (!targetOrigin) return;

  try {
    if (platform === 'youtube') {
      const ytCommand = buildYouTubeCommand(command, value);
      if (!ytCommand) return;
      const message = JSON.stringify({
        event: 'command',
        func: ytCommand.func,
        args: ytCommand.args,
      });
      logger.remote(
        `[CMD-YT] ${command}${value !== undefined ? ' (' + value + ')' : ''} to ${iframe.id || 'unknown'}`
      );
      iframe.contentWindow.postMessage(message, targetOrigin);
    } else if (platform === 'soundcloud') {
      const scCommand = buildSoundCloudCommand(command, value);
      if (!scCommand) return;
      const message = JSON.stringify({ method: scCommand.method, value: scCommand.value });
      logger.remote(
        `[CMD-SC] ${command}${value !== undefined ? ' (' + value + ')' : ''} to ${iframe.id || 'unknown'}`
      );
      iframe.contentWindow.postMessage(message, targetOrigin);
    }
  } catch (error) {
    logger.remote(`[CMD-ERR] Error sending to ${platform}:`, error);
  }
};

// ======================================================================
// Global Volume Application (Refactored from SimpleMusicPlayer)
// ======================================================================

// Function to get or create the global audio context and gain node
// Note: Storing context/node on `window` is generally discouraged in React.
// This might be refactored later using Context API or Zustand.
const getOrCreateGlobalGainNode = (): GainNode | null => {
  if (typeof window === 'undefined') return null;

  const win = window as WindowWithAudio;

  if (!win.globalAudioContext) {
    try {
      const AudioContextClass = window.AudioContext || win.webkitAudioContext;
      if (!AudioContextClass) {
        logger.error('AudioContext not supported in this browser');
        return null;
      }
      win.globalAudioContext = new AudioContextClass();
      win.globalGainNode = win.globalAudioContext.createGain();
      // Initial volume will be set by applyVolumeToAllPlayers
      win.globalGainNode.connect(win.globalAudioContext.destination);
      logger.debug('Global AudioContext and GainNode created.');
    } catch (error) {
      logger.error('Error creating global audio context:', error);
      return null;
    }
  }
  return win.globalGainNode ?? null;
};

/**
 * Applies the specified volume level to all relevant audio outputs:
 * - HTML5 <audio> elements
 * - Web Audio API global GainNode (if available)
 * - YouTube and SoundCloud iframes
 * Also saves the volume to localStorage.
 *
 * @param newVolume The desired volume level (0 to 1).
 * @param applyToIframes Optional flag to control if volume is applied to iframes (defaults to true).
 * @returns The volume level actually applied (clamped between 0 and 1).
 */
export const applyVolumeToAllPlayers = (
  newVolume: number,
  applyToIframes: boolean = true
): number => {
  try {
    const safeVolume = Math.max(0, Math.min(1, newVolume));
    logger.debug(`Applying global volume: ${safeVolume}`);

    // 1. Save to localStorage
    saveVolumeToLocalStorage(safeVolume);

    // 2. Apply to HTML5 <audio> elements
    const audioElements = document.querySelectorAll('audio');
    audioElements.forEach((audio) => {
      audio.volume = safeVolume;
    });

    // 3. Apply to Web Audio API GainNode
    const gainNode = getOrCreateGlobalGainNode();
    if (gainNode) {
      // Ensure audio context is running (might be suspended by browser policy)
      const audioContext = (window as WindowWithAudio).globalAudioContext;
      if (audioContext?.state === 'suspended') {
        audioContext.resume().catch((err) => logger.error('Error resuming AudioContext:', err));
      }
      gainNode.gain.value = safeVolume;
      logger.debug(`Applied volume ${safeVolume} to GainNode`);
    }

    // 4. Apply to iframes (conditionally)
    if (applyToIframes) {
      const youtubeIframes = document.querySelectorAll<HTMLIFrameElement>(
        'iframe[src*="youtube.com/embed"]'
      );
      youtubeIframes.forEach((iframe) => {
        const youtubeVolume = safeVolume;
        sendPlayerCommand(iframe, 'youtube', 'setVolume', youtubeVolume);
        logger.debug(
          `Sent volume command (${youtubeVolume}) to YouTube iframe: ${iframe.id || 'no id'}`
        );
      });

      const soundcloudIframes = document.querySelectorAll<HTMLIFrameElement>(
        'iframe[src*="soundcloud.com"]'
      );
      soundcloudIframes.forEach((iframe) => {
        const soundcloudVolume = safeVolume;
        sendPlayerCommand(iframe, 'soundcloud', 'setVolume', soundcloudVolume);
        logger.debug(
          `Sent volume command (${soundcloudVolume}) to SoundCloud iframe: ${iframe.id || 'no id'}`
        );
      });
    } else {
      logger.debug('Skipping volume application to iframes.');
    }

    return safeVolume;
  } catch (error) {
    logger.error('Error setting global volume:', error);
    // Attempt to return the last known good volume from localStorage in case of error
    return getInitialVolume();
  }
};
