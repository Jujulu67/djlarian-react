'use client';

// ======================================================================
// Volume Management
// ======================================================================

/**
 * Retrieves the initial volume from localStorage, defaulting to 0.8 if not found or inaccessible.
 * Ensures the returned volume is within the valid range [0, 1].
 */
export const getInitialVolume = (): number => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const savedVolume = localStorage.getItem('global-music-volume');
      if (savedVolume !== null) {
        const volume = Number(savedVolume);
        console.log(`Retrieved initial volume from localStorage: ${volume}`);
        // Ensure the retrieved volume is within the valid range [0, 1]
        return Math.max(0, Math.min(1, volume));
      }
    }
  } catch (error) {
    console.error('Error reading volume from localStorage:', error);
  }

  console.log('Using default initial volume: 0.8');
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
      console.log(`Volume saved to localStorage: ${volume}`);
    }
  } catch (error) {
    console.error('Error saving volume to localStorage:', error);
  }
};

// ======================================================================
// Player Command Utilities
// ======================================================================

type PlayerPlatform = 'youtube' | 'soundcloud';
type PlayerCommand = 'play' | 'pause' | 'setVolume' | 'seekTo'; // Added seekTo for future use

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
  if (!iframe || !iframe.contentWindow || !platform) {
    // console.warn(`Cannot send command: Iframe for ${platform} not ready or accessible.`);
    return;
  }

  try {
    let message: string;

    if (platform === 'youtube') {
      let func: string;
      let args: (string | number | boolean)[] = [];

      switch (command) {
        case 'play':
          func = 'playVideo';
          break;
        case 'pause':
          func = 'pauseVideo';
          break;
        case 'setVolume':
          // YouTube API expects volume from 0 to 100
          // We might apply amplification here or in the calling function
          func = 'setVolume';
          args = [value !== undefined ? Math.round(value * 100) : 50]; // Default to 50 if no value
          break;
        case 'seekTo':
          func = 'seekTo';
          args = [value !== undefined ? value : 0, true]; // time in seconds, allowSeekAhead=true
          break;
        default:
          console.error(`Unsupported YouTube command: ${command}`);
          return;
      }
      message = JSON.stringify({ event: 'command', func, args });
      iframe.contentWindow.postMessage(message, '*'); // Consider using specific target origin in production
      // console.log(`Sent command to YouTube: ${message}`);
    } else if (platform === 'soundcloud') {
      let method: string;
      let methodValue: string | number | undefined = value;

      switch (command) {
        case 'play':
          method = 'play';
          break;
        case 'pause':
          method = 'pause';
          break;
        case 'setVolume':
          // SoundCloud API expects volume from 0 to 100
          method = 'setVolume';
          methodValue = value !== undefined ? Math.round(value * 100) : 50;
          break;
        case 'seekTo':
          method = 'seekTo';
          methodValue = value !== undefined ? value * 1000 : 0; // time in milliseconds
          break;
        default:
          console.error(`Unsupported SoundCloud command: ${command}`);
          return;
      }
      message = JSON.stringify({ method, value: methodValue });
      iframe.contentWindow.postMessage(message, '*'); // Consider using specific target origin
      // console.log(`Sent command to SoundCloud: ${message}`);
    }
  } catch (error) {
    console.error(`Error sending command to ${platform} iframe:`, error);
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

  if (!(window as any).globalAudioContext) {
    try {
      (window as any).globalAudioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      (window as any).globalGainNode = (window as any).globalAudioContext.createGain();
      // Initial volume will be set by applyVolumeToAllPlayers
      (window as any).globalGainNode.connect((window as any).globalAudioContext.destination);
      console.log('Global AudioContext and GainNode created.');
    } catch (error) {
      console.error('Error creating global audio context:', error);
      return null;
    }
  }
  return (window as any).globalGainNode;
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
    console.log(`Applying global volume: ${safeVolume}`);

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
      const audioContext = (window as any).globalAudioContext as AudioContext;
      if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume().catch((err) => console.error('Error resuming AudioContext:', err));
      }
      gainNode.gain.value = safeVolume;
      console.log(`Applied volume ${safeVolume} to GainNode`);
    }

    // 4. Apply to iframes (conditionally)
    if (applyToIframes) {
      const youtubeIframes = document.querySelectorAll<HTMLIFrameElement>(
        'iframe[src*="youtube.com/embed"]'
      );
      youtubeIframes.forEach((iframe) => {
        const youtubeVolume = safeVolume;
        sendPlayerCommand(iframe, 'youtube', 'setVolume', youtubeVolume);
        console.log(
          `Sent volume command (${youtubeVolume}) to YouTube iframe: ${iframe.id || 'no id'}`
        );
      });

      const soundcloudIframes = document.querySelectorAll<HTMLIFrameElement>(
        'iframe[src*="soundcloud.com"]'
      );
      soundcloudIframes.forEach((iframe) => {
        const soundcloudVolume = safeVolume;
        sendPlayerCommand(iframe, 'soundcloud', 'setVolume', soundcloudVolume);
        console.log(
          `Sent volume command (${soundcloudVolume}) to SoundCloud iframe: ${iframe.id || 'no id'}`
        );
      });
    } else {
      console.log('Skipping volume application to iframes.');
    }

    return safeVolume;
  } catch (error) {
    console.error('Error setting global volume:', error);
    // Attempt to return the last known good volume from localStorage in case of error
    return getInitialVolume();
  }
};
