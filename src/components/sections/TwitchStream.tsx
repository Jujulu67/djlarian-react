'use client';

import { motion } from 'framer-motion';
import { Bell } from 'lucide-react';
import { useState, useEffect } from 'react';

import { Button } from '@/components/ui/Button';
import { SectionHeading } from '@/components/ui/PageHeader';
import SectionIndex from '@/components/v3/SectionIndex';
import { RevealGroup, RevealItem } from '@/components/ui/Reveal';
import { useSpotlight } from '@/hooks/useSpotlight';
import { useUiVersion } from '@/hooks/useUiVersion';
import { logger } from '@/lib/logger';

interface StreamStatus {
  isLive: boolean;
  stream?: {
    title: string;
    viewer_count: number;
    game_name: string;
    thumbnail_url: string;
  } | null;
  error?: string;
}

const TWITCH_URL = 'https://twitch.tv/larianmusic';
const TWITCH_PATH =
  'M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z';

function TwitchIcon({ className }: Readonly<{ className?: string }>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d={TWITCH_PATH} />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* UI v2                                                                      */
/* -------------------------------------------------------------------------- */

function TwitchStreamV2({
  isLoading,
  streamStatus,
}: Readonly<{
  isLoading: boolean;
  streamStatus: StreamStatus | null;
}>) {
  const introSpotlight = useSpotlight<HTMLDivElement>();

  return (
    <section className="relative py-16 md:py-24">
      <div className="mx-auto max-w-[1180px] px-4">
        <SectionHeading eyebrow="Live" title="Live Stream" />

        <RevealGroup className="grid items-stretch gap-5 md:grid-cols-2 md:gap-6">
          <RevealItem className="h-full">
            <div
              {...introSpotlight}
              className="surface-1 spotlight flex h-full flex-col justify-center rounded-2xl p-6 md:p-8"
            >
              <h3 className="text-xl font-semibold text-white md:text-2xl">
                Join the Live Experience
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-white/60 md:text-base">
                Tune in to my live streams where I share my creative process, perform exclusive
                sets, and interact with the community in real-time.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button asChild className="h-11 px-5">
                  <a href={TWITCH_URL} target="_blank" rel="noopener noreferrer">
                    <TwitchIcon className="h-4 w-4" />
                    Follow on Twitch
                  </a>
                </Button>
                <Button
                  variant="outline"
                  className="h-11 px-5"
                  aria-label="Get notified for streams"
                >
                  <Bell className="h-4 w-4" aria-hidden="true" />
                  Get Notified
                </Button>
              </div>
            </div>
          </RevealItem>

          <RevealItem className="h-full">
            <div className="surface-1 relative aspect-video min-h-[200px] overflow-hidden rounded-2xl md:min-h-0">
              {isLoading ? (
                <div className="h-full w-full animate-pulse bg-white/[0.04]">
                  <span className="sr-only">Checking status...</span>
                </div>
              ) : streamStatus?.isLive ? (
                <div className="relative h-full w-full">
                  <div className="absolute left-4 top-4 z-20 flex items-center gap-2">
                    <span className="flex items-center gap-2 rounded-full bg-red-600 px-3 py-1.5 text-xs font-bold text-white">
                      <span className="h-1.5 w-1.5 rounded-full bg-white" aria-hidden="true" />
                      {'LIVE'}
                    </span>
                    {streamStatus.stream?.viewer_count && (
                      <span className="rounded-full bg-black/50 px-3 py-1.5 text-xs font-medium text-white ring-1 ring-inset ring-white/15 backdrop-blur-md">
                        {streamStatus.stream.viewer_count.toLocaleString()} viewers
                      </span>
                    )}
                  </div>
                  <iframe
                    src={`https://player.twitch.tv/?channel=larianmusic&parent=${
                      typeof window !== 'undefined' ? window.location.hostname : 'localhost'
                    }&muted=true`}
                    allowFullScreen
                    scrolling="no"
                    className="h-full w-full border-0"
                    title="LarianMusic Twitch Stream"
                    allow="autoplay; fullscreen"
                  />
                </div>
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center px-6 py-8 text-center">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/[0.04] ring-1 ring-inset ring-white/10">
                    <TwitchIcon className="h-6 w-6 text-white/70" />
                  </span>
                  <h3 className="mt-4 text-lg font-semibold text-white md:text-xl">
                    Stream Offline
                  </h3>
                  <p className="mt-2 max-w-sm text-sm leading-relaxed text-white/60">
                    LarianMusic is not live at the moment. Check back soon for exclusive sets and
                    live interactions!
                  </p>
                  <Button asChild variant="outline" size="sm" className="mt-5 h-10 px-4">
                    <a
                      href={TWITCH_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Visit LarianMusic Twitch channel"
                    >
                      <TwitchIcon className="h-4 w-4" />
                      Visit Channel
                    </a>
                  </Button>
                </div>
              )}
            </div>
          </RevealItem>
        </RevealGroup>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* UI v3                                                                      */
/* -------------------------------------------------------------------------- */

/** Live de l'accueil v3 : un seul panneau de verre (statut, appel à suivre) et le lecteur */
function TwitchStreamV3({
  isLoading,
  streamStatus,
}: Readonly<{
  isLoading: boolean;
  streamStatus: StreamStatus | null;
}>) {
  const isLive = !!streamStatus?.isLive;
  const viewers = streamStatus?.stream?.viewer_count;

  return (
    <section className="relative mx-auto max-w-[1180px] px-4 py-12 md:py-16">
      <SectionIndex eyebrow="Live" label="En direct" />

      <div className="surface-1 mt-9 grid overflow-hidden rounded-[1.6rem] md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="flex flex-col p-6 md:p-9">
          <span className="inline-flex items-center gap-2 self-start rounded-full bg-white/[0.05] px-3 py-1.5 font-mono-signal text-[11px] uppercase text-white/80 ring-1 ring-inset ring-white/10">
            <span
              aria-hidden="true"
              className={`h-1.5 w-1.5 rounded-full ${
                isLive ? 'animate-pulse bg-red-500' : isLoading ? 'bg-white/30' : 'bg-white/50'
              }`}
            />
            {isLoading
              ? 'Statut…'
              : isLive
                ? viewers
                  ? `En direct · ${viewers.toLocaleString('fr-FR')} spectateurs`
                  : 'En direct'
                : 'Hors ligne'}
          </span>

          <h3 className="mt-5 text-display text-2xl text-white md:text-3xl">
            Sessions studio et sets en direct.
          </h3>
          <p className="mt-3 max-w-md leading-relaxed text-white/70">
            Je montre comment les morceaux se construisent, je joue des sets exclusifs et je réponds
            au chat. Abonne-toi pour être prévenu du prochain live.
          </p>

          <a
            href={TWITCH_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="chrome-pill mt-7 inline-flex h-12 items-center gap-2 self-start rounded-full px-7 text-[15px] font-bold transition-transform hover:-translate-y-0.5"
          >
            <TwitchIcon className="h-4 w-4" />
            Suivre sur Twitch
          </a>
        </div>

        <div className="relative aspect-video border-t border-white/10 bg-black/30 md:aspect-auto md:min-h-[360px] md:border-l md:border-t-0">
          {isLive ? (
            <iframe
              src={`https://player.twitch.tv/?channel=larianmusic&parent=${
                typeof window !== 'undefined' ? window.location.hostname : 'localhost'
              }&muted=true`}
              allowFullScreen
              scrolling="no"
              className="absolute inset-0 h-full w-full border-0"
              title="Live Twitch de Larian"
              allow="autoplay; fullscreen"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.2),transparent_65%)] px-6 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/[0.05] ring-1 ring-inset ring-white/10">
                <TwitchIcon className="h-6 w-6 text-white/75" />
              </span>
              <p className="mt-4 font-semibold text-white">
                {isLoading ? 'Vérification du live…' : 'Pas de live en ce moment'}
              </p>
              <p className="mt-1 font-mono-signal text-[11px] uppercase text-white/50">
                twitch.tv/larianmusic
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

const TwitchStream = () => {
  const uiVersion = useUiVersion();
  const isV2 = uiVersion !== 'legacy';
  const [streamStatus, setStreamStatus] = useState<StreamStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Check stream status
  useEffect(() => {
    const checkStreamStatus = async () => {
      try {
        const response = await fetch('/api/twitch/status');
        const data = await response.json();
        setStreamStatus(data);
      } catch (error) {
        logger.error('Error checking stream status:', error);
        setStreamStatus({ isLive: false });
      } finally {
        setIsLoading(false);
      }
    };

    void checkStreamStatus();
    // Check every 60 seconds
    const interval = setInterval(checkStreamStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  if (uiVersion === 'v3')
    return <TwitchStreamV3 isLoading={isLoading} streamStatus={streamStatus} />;
  if (isV2) return <TwitchStreamV2 isLoading={isLoading} streamStatus={streamStatus} />;

  return (
    <section className="py-20 relative overflow-hidden">
      {/* Animated Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-purple-900/15 to-black">
        <div className="absolute inset-0 bg-gradient-to-l from-[#9146FF]/10 via-transparent to-blue-900/10 animate-gradient-pulse" />
      </div>

      <div className="max-w-7xl mx-auto px-4 relative z-10">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-4xl md:text-5xl font-audiowide mb-12 text-center text-gradient-animated"
        >
          Live Stream
        </motion.h2>

        <div className="grid md:grid-cols-2 gap-6 md:gap-8 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="glass-modern rounded-xl md:rounded-2xl p-6 md:p-8"
          >
            <h3 className="text-xl md:text-2xl lg:text-3xl font-bold mb-3 md:mb-4 text-white">
              Join the Live Experience
            </h3>
            <p className="text-gray-200 mb-6 md:mb-8 leading-relaxed text-sm md:text-base">
              Tune in to my live streams where I share my creative process, perform exclusive sets,
              and interact with the community in real-time.
            </p>
            <div className="flex flex-col sm:flex-row flex-wrap gap-3 md:gap-4">
              <motion.a
                href="https://twitch.tv/larianmusic"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-modern px-5 py-2.5 md:px-6 md:py-3 bg-gradient-to-r from-[#9146FF] to-[#7a3dd1] hover:from-[#a855f7] hover:to-[#9146FF] text-white rounded-full transition-all duration-300 flex items-center justify-center gap-2 text-sm md:text-base font-semibold glow-purple micro-bounce"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <svg
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-4 h-4 md:w-5 md:h-5"
                >
                  <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z" />
                </svg>
                Follow on Twitch
              </motion.a>
              <motion.button
                className="btn-modern px-5 py-2.5 md:px-6 md:py-3 border-2 border-purple-500/50 hover:border-purple-500 hover:bg-purple-500/20 text-white rounded-full transition-all duration-300 text-sm md:text-base font-semibold glass-modern-hover micro-bounce focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-black"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                aria-label="Get notified for streams"
              >
                Get Notified
              </motion.button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="aspect-video rounded-xl md:rounded-2xl overflow-hidden glass-modern animate-glow-border border-2 border-purple-500/30 relative min-h-[200px] md:min-h-0"
          >
            {isLoading ? (
              <div className="w-full h-full flex items-center justify-center glass-modern">
                <div className="text-purple-400 animate-pulse font-semibold flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" />
                  <span>Checking status...</span>
                </div>
              </div>
            ) : streamStatus?.isLive ? (
              <div className="w-full h-full relative">
                {/* Live Badge */}
                <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', duration: 0.5 }}
                    className="flex items-center gap-2 bg-red-600 px-3 py-1.5 rounded-full shadow-lg"
                  >
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="w-2 h-2 bg-white rounded-full"
                    />
                    <span className="text-white font-bold text-sm">LIVE</span>
                  </motion.div>
                  {streamStatus.stream?.viewer_count && (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 }}
                      className="glass-modern px-3 py-1.5 rounded-full"
                    >
                      <span className="text-white text-sm font-medium">
                        {streamStatus.stream.viewer_count.toLocaleString()} viewers
                      </span>
                    </motion.div>
                  )}
                </div>
                <iframe
                  src={`https://player.twitch.tv/?channel=larianmusic&parent=${
                    typeof window !== 'undefined' ? window.location.hostname : 'localhost'
                  }&muted=true`}
                  frameBorder="0"
                  allowFullScreen
                  scrolling="no"
                  className="w-full h-full"
                  title="LarianMusic Twitch Stream"
                  allow="autoplay; fullscreen"
                ></iframe>
              </div>
            ) : (
              <div className="w-full h-full relative flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900/20 to-black overflow-hidden">
                {/* Animated background particles - reduced on mobile for performance */}
                <div className="absolute inset-0">
                  {Array.from({ length: isMobile ? 8 : 15 }, (_, i) => (
                    <motion.div
                      key={i}
                      className="absolute w-1 h-1 md:w-1.5 md:h-1.5 bg-purple-400/20 rounded-full"
                      initial={{
                        x: Math.random() * 100 + '%',
                        y: '100%',
                        opacity: 0,
                      }}
                      animate={{
                        y: ['100%', '-10%'],
                        opacity: [0, 0.6, 0],
                        scale: [0.5, 1, 0.5],
                      }}
                      transition={{
                        duration: Math.random() * 4 + 3,
                        repeat: Infinity,
                        delay: Math.random() * 3,
                        ease: 'easeOut',
                      }}
                    />
                  ))}
                </div>

                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                {/* Content - optimisé pour mobile */}
                <div className="relative z-10 text-center px-4 py-6 md:px-6 md:py-8">
                  {/* Twitch Icon - taille adaptée mobile */}
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', duration: 0.6 }}
                    className="mb-4 md:mb-6"
                  >
                    <svg
                      aria-hidden="true"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="w-12 h-12 md:w-20 md:h-20 text-purple-400 mx-auto"
                    >
                      <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z" />
                    </svg>
                  </motion.div>

                  {/* Status Text - taille adaptée mobile */}
                  <motion.h3
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-xl md:text-2xl lg:text-3xl font-bold text-white mb-2 md:mb-3 px-2"
                  >
                    Stream Offline
                  </motion.h3>

                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-gray-300 mb-4 md:mb-6 text-xs md:text-sm lg:text-base max-w-md mx-auto px-2 leading-relaxed"
                  >
                    LarianMusic is not live at the moment. Check back soon for exclusive sets and
                    live interactions!
                  </motion.p>

                  {/* CTA Button - taille adaptée mobile */}
                  <motion.a
                    href="https://twitch.tv/larianmusic"
                    target="_blank"
                    rel="noopener noreferrer"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 md:px-6 md:py-3 bg-gradient-to-r from-[#9146FF] to-[#7a3dd1] hover:from-[#a855f7] hover:to-[#9146FF] text-white rounded-full transition-all duration-300 text-sm md:text-base font-semibold glow-purple"
                    aria-label="Visit LarianMusic Twitch channel"
                  >
                    <svg
                      aria-hidden="true"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="w-4 h-4 md:w-5 md:h-5"
                    >
                      <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z" />
                    </svg>
                    <span className="whitespace-nowrap">Visit Channel</span>
                  </motion.a>
                </div>

                {/* Animated border glow */}
                <div className="absolute inset-0 rounded-2xl border-2 border-purple-500/30 animate-pulse" />
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default TwitchStream;
