import Image from 'next/image';
import { useState } from 'react';

import { SHOWCASE_GIFS, SHOWCASE_SECTIONS } from './constants';

export function ShowcaseSection() {
  const [activeSection, setActiveSection] = useState('lfo');
  const activeGif = SHOWCASE_GIFS[activeSection] || SHOWCASE_GIFS.lfo;
  const activeSectionMeta =
    SHOWCASE_SECTIONS.find((s) => s.id === activeSection) || SHOWCASE_SECTIONS[0];

  return (
    <div className="glass-modern rounded-2xl p-6 md:p-8">
      {/* Section tabs - equal width */}
      <div className="grid grid-cols-2 gap-2 mb-6">
        {SHOWCASE_SECTIONS.map((section) => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            className={`
              flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium text-sm transition-all duration-300
              ${
                activeSection === section.id
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
              }
            `}
          >
            {section.icon}
            {section.title}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-white/10 bg-black/40 px-4 sm:px-5 py-3 mb-6">
        <p className="text-gray-400 text-sm sm:text-base">{activeSectionMeta.description}</p>
      </div>

      {/* Section content */}
      <div className="rounded-xl overflow-hidden border border-white/10 bg-black/40">
        <Image
          src={activeGif.src}
          alt={activeGif.alt}
          width={activeGif.width}
          height={activeGif.height}
          unoptimized
          className="w-full h-auto"
          priority={false}
        />
      </div>
    </div>
  );
}
