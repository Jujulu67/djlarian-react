/**
 * Types partagés du service SoundCloud (sous-ensemble minimal de l'API Puppeteer et modèles de données)
 */

// Types pour Puppeteer
export interface PuppeteerLike {
  launch: (options?: LaunchOptions) => Promise<Browser>;
}

export interface LaunchOptions {
  headless?: boolean;
  args?: string[];
  defaultViewport?: { width: number; height: number } | null;
  executablePath?: string;
  [key: string]: unknown;
}

export interface Browser {
  newPage: () => Promise<Page>;
  close: () => Promise<void>;
}

export interface Page {
  goto: (url: string, options?: { waitUntil?: string; timeout?: number }) => Promise<unknown>;
  setRequestInterception: (value: boolean) => Promise<void>;
  on: (event: 'request', handler: (request: HTTPRequest) => void) => void;
  setUserAgent: (userAgent: string) => Promise<void>;
  waitForSelector: (
    selector: string,
    options?: { timeout?: number; visible?: boolean }
  ) => Promise<unknown>;
  waitForFunction: (
    fn: (prevCount: number) => boolean,
    options?: { timeout?: number; polling?: number },
    ...args: unknown[]
  ) => Promise<unknown>;
  evaluate: <T>(fn: (profileName: string) => T, ...args: unknown[]) => Promise<T>;
  setExtraHTTPHeaders?: (headers: Record<string, string>) => Promise<void>;
  setViewport?: (viewport: {
    width: number;
    height: number;
    deviceScaleFactor?: number;
    isMobile?: boolean;
    hasTouch?: boolean;
    isLandscape?: boolean;
  }) => Promise<void>;
}

export interface HTTPRequest {
  resourceType: () => string;
  abort: () => void;
  continue: () => void;
}

export interface DebugData {
  rawHtml?: string;
  allTitleElements?: Array<{ selector: string; text: string; innerHTML: string }>;
  allDateElements?: Array<{
    selector: string;
    text: string;
    datetime?: string;
    title?: string;
  }>;
  soundBodyFound?: boolean;
  parentGroupFound?: boolean;
  finalTitle?: string;
  finalReleaseDate?: string;
}

export interface SoundCloudTrack {
  id: string;
  title: string;
  artist: string;
  url: string;
  embedId?: string;
  releaseDate?: string;
  imageUrl?: string;
  type?: 'single' | 'ep' | 'album' | 'remix' | 'live' | 'djset' | 'video';
}

/** Données brutes d'une track extraites du DOM, avant conversion en SoundCloudTrack */
export interface RawTrackData {
  url: string;
  title: string;
  imageUrl?: string;
  releaseDate?: string;
}
