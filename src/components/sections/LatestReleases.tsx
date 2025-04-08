'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { FaSpotify, FaApple, FaSoundcloud } from 'react-icons/fa';

const releases = [
  {
    id: 1,
    title: 'Neon Dreams',
    artist: 'DJ Larian',
    cover: '/images/releases/neon-dreams.jpg',
    date: 'March 2024',
    type: 'EP',
    links: {
      spotify: '#',
      apple: '#',
      soundcloud: '#',
    },
  },
  {
    id: 2,
    title: 'Digital Horizon',
    artist: 'DJ Larian',
    cover: '/images/releases/digital-horizon.jpg',
    date: 'February 2024',
    type: 'Single',
    links: {
      spotify: '#',
      apple: '#',
      soundcloud: '#',
    },
  },
  {
    id: 3,
    title: 'Future Pulse',
    artist: 'DJ Larian',
    cover: '/images/releases/future-pulse.jpg',
    date: 'January 2024',
    type: 'Album',
    links: {
      spotify: '#',
      apple: '#',
      soundcloud: '#',
    },
  },
];

const LatestReleases = () => {
  return (
    <section className="py-20 bg-black/50 backdrop-blur-lg">
      <div className="max-w-7xl mx-auto px-4">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-4xl font-bold text-center mb-12"
        >
          Latest Releases
        </motion.h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {releases.map((release, index) => (
            <motion.div
              key={release.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="bg-gray-900 rounded-lg overflow-hidden">
                <div className="relative aspect-square">
                  <Image
                    src={release.cover}
                    alt={`${release.title} cover art`}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="object-cover"
                  />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold mb-2">{release.title}</h3>
                  <div className="flex items-center gap-2 text-gray-400 mb-4">
                    <span>{release.artist}</span>
                    <span>•</span>
                    <span>{release.date}</span>
                  </div>
                  <div className="flex gap-4">
                    <a
                      href={release.links.spotify}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-2xl text-gray-400 hover:text-green-500 transition-colors"
                    >
                      <FaSpotify />
                    </a>
                    <a
                      href={release.links.apple}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-2xl text-gray-400 hover:text-pink-500 transition-colors"
                    >
                      <FaApple />
                    </a>
                    <a
                      href={release.links.soundcloud}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-2xl text-gray-400 hover:text-orange-500 transition-colors"
                    >
                      <FaSoundcloud />
                    </a>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default LatestReleases;
