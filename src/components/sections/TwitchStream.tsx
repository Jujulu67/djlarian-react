'use client';

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

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

const TwitchStream = () => {
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
        console.error('Error checking stream status:', error);
        setStreamStatus({ isLive: false });
      } finally {
        setIsLoading(false);
      }
    };

    checkStreamStatus();
    // Check every 60 seconds
    const interval = setInterval(checkStreamStatus, 60000);
    return () => clearInterval(interval);
  }, []);

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
                  {[...Array(isMobile ? 8 : 15)].map((_, i) => (
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

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          <motion.div
            whileHover={{ scale: 1.05, y: -5 }}
            className="glass-modern glass-modern-hover rounded-2xl p-6 text-center lift-3d"
            role="article"
            aria-label="Statistics: 24K+ Followers"
          >
            <div className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400 mb-2">
              24K+
            </div>
            <div className="text-gray-300 font-medium">Followers</div>
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.05, y: -5 }}
            className="glass-modern glass-modern-hover rounded-2xl p-6 text-center lift-3d"
            role="article"
            aria-label="Statistics: 150+ Hours Streamed"
          >
            <div className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 mb-2">
              150+
            </div>
            <div className="text-gray-300 font-medium">Hours Streamed</div>
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.05, y: -5 }}
            className="glass-modern glass-modern-hover rounded-2xl p-6 text-center lift-3d"
            role="article"
            aria-label="Statistics: 500+ Tracks Played"
          >
            <div className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-blue-400 to-purple-400 mb-2 animate-gradient-shift bg-[length:200%_100%]">
              500+
            </div>
            <div className="text-gray-300 font-medium">Tracks Played</div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default TwitchStream;
