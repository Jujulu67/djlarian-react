'use client';

import { motion } from 'framer-motion';

const TwitchStream = () => {
  return (
    <section className="py-20 bg-black">
      <div className="max-w-7xl mx-auto px-4">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-4xl md:text-5xl font-audiowide mb-12 text-center"
        >
          Live Stream
        </motion.h2>

        <div className="grid md:grid-cols-2 gap-8 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h3 className="text-2xl font-bold mb-4">Join the Live Experience</h3>
            <p className="text-gray-400 mb-6">
              Tune in to my live streams where I share my creative process, perform exclusive sets,
              and interact with the community in real-time.
            </p>
            <div className="flex flex-wrap gap-4">
              <a
                href="https://twitch.tv/djlarian"
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 bg-[#9146FF] hover:bg-[#7a3dd1] text-white rounded-full transition-colors duration-200 flex items-center gap-2"
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
              <button className="px-6 py-3 border-2 border-purple-500 hover:bg-purple-500 text-white rounded-full transition-colors duration-200">
                Get Notified
              </button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="aspect-video bg-gray-900 rounded-lg overflow-hidden"
          >
            <iframe
              src="https://player.twitch.tv/?channel=djlarian&parent=localhost"
              frameBorder="0"
              allowFullScreen
              scrolling="no"
              className="w-full h-full"
            ></iframe>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          <div className="bg-gray-900/50 backdrop-blur-lg rounded-lg p-6 text-center">
            <div className="text-3xl font-bold text-purple-400 mb-2">24K+</div>
            <div className="text-gray-400">Followers</div>
          </div>
          <div className="bg-gray-900/50 backdrop-blur-lg rounded-lg p-6 text-center">
            <div className="text-3xl font-bold text-purple-400 mb-2">150+</div>
            <div className="text-gray-400">Hours Streamed</div>
          </div>
          <div className="bg-gray-900/50 backdrop-blur-lg rounded-lg p-6 text-center">
            <div className="text-3xl font-bold text-purple-400 mb-2">500+</div>
            <div className="text-gray-400">Tracks Played</div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default TwitchStream;
