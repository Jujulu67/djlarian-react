'use client';

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

const TwitchStream = () => {
  const [showIframe, setShowIframe] = useState(false);

  // Charger l'iframe de façon différée pour éviter trop de requêtes à l'API Twitch
  useEffect(() => {
    // Attendre 2 secondes avant de charger l'iframe
    const timer = setTimeout(() => {
      setShowIframe(true);
    }, 2000);

    return () => clearTimeout(timer);
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

        <div className="grid md:grid-cols-2 gap-8 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="glass-modern rounded-2xl p-8"
          >
            <h3 className="text-2xl md:text-3xl font-bold mb-4 text-white">
              Join the Live Experience
            </h3>
            <p className="text-gray-300 mb-8 leading-relaxed">
              Tune in to my live streams where I share my creative process, perform exclusive sets,
              and interact with the community in real-time.
            </p>
            <div className="flex flex-wrap gap-4">
              <a
                href="https://twitch.tv/djlarian"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-modern px-6 py-3 bg-gradient-to-r from-[#9146FF] to-[#7a3dd1] hover:from-[#a855f7] hover:to-[#9146FF] text-white rounded-full transition-all duration-300 flex items-center gap-2 font-semibold glow-purple micro-bounce"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-5 h-5"
                >
                  <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z" />
                </svg>
                Follow on Twitch
              </a>
              <button className="btn-modern px-6 py-3 border-2 border-purple-500/50 hover:border-purple-500 hover:bg-purple-500/20 text-white rounded-full transition-all duration-300 font-semibold glass-modern-hover micro-bounce">
                Get Notified
              </button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="aspect-video rounded-2xl overflow-hidden glass-modern animate-glow-border border-2 border-purple-500/30"
          >
            {showIframe ? (
              <iframe
                src="https://player.twitch.tv/?channel=djlarian&parent=localhost&muted=true"
                frameBorder="0"
                allowFullScreen
                scrolling="no"
                className="w-full h-full"
              ></iframe>
            ) : (
              <div className="w-full h-full flex items-center justify-center glass-modern">
                <div className="text-purple-400 animate-pulse font-semibold flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" />
                  <span>Chargement du stream...</span>
                </div>
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
          >
            <div className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400 mb-2">
              24K+
            </div>
            <div className="text-gray-300 font-medium">Followers</div>
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.05, y: -5 }}
            className="glass-modern glass-modern-hover rounded-2xl p-6 text-center lift-3d"
          >
            <div className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 mb-2">
              150+
            </div>
            <div className="text-gray-300 font-medium">Hours Streamed</div>
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.05, y: -5 }}
            className="glass-modern glass-modern-hover rounded-2xl p-6 text-center lift-3d"
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
