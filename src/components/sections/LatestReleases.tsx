"use client";

import { motion } from "framer-motion";
import Image from "next/image";

const releases = [
  {
    id: 1,
    title: "Neon Dreams",
    cover: "/images/releases/neon-dreams.jpg",
    date: "2024",
    type: "EP",
    links: {
      spotify: "#",
      beatport: "#",
      soundcloud: "#",
    },
  },
  {
    id: 2,
    title: "Digital Horizon",
    cover: "/images/releases/digital-horizon.jpg",
    date: "2023",
    type: "Single",
    links: {
      spotify: "#",
      beatport: "#",
      soundcloud: "#",
    },
  },
  {
    id: 3,
    title: "Future Pulse",
    cover: "/images/releases/future-pulse.jpg",
    date: "2023",
    type: "Album",
    links: {
      spotify: "#",
      beatport: "#",
      soundcloud: "#",
    },
  },
];

const LatestReleases = () => {
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
          Latest Releases
        </motion.h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {releases.map((release) => (
            <motion.div
              key={release.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              whileHover={{ scale: 1.05 }}
              className="bg-gray-900 rounded-lg overflow-hidden"
            >
              <div className="relative aspect-square">
                <Image
                  src={release.cover}
                  alt={release.title}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold mb-2">{release.title}</h3>
                <div className="flex items-center gap-2 text-gray-400 mb-4">
                  <span>{release.date}</span>
                  <span>•</span>
                  <span>{release.type}</span>
                </div>
                <div className="flex gap-4">
                  {Object.entries(release.links).map(([platform, link]) => (
                    <a
                      key={platform}
                      href={link}
                      className="text-gray-400 hover:text-white transition-colors"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {platform.charAt(0).toUpperCase() + platform.slice(1)}
                    </a>
                  ))}
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
