import Image from 'next/image';
import { useState } from 'react';

import { VIEW_GIFS, VIEW_MODES } from './constants';

export function ViewModeSelector() {
  const [activeView, setActiveView] = useState('oneknob');
  const activeGif = VIEW_GIFS[activeView] || VIEW_GIFS.oneknob;
  const activeViewMeta = VIEW_MODES.find((v) => v.id === activeView) || VIEW_MODES[0];

  return (
    <div className="glass-modern rounded-2xl p-6 md:p-8">
      {/* View tabs - equal width */}
      <div className="grid grid-cols-5 gap-2 mb-6">
        {VIEW_MODES.map((view) => (
          <button
            key={view.id}
            onClick={() => setActiveView(view.id)}
            className={`
              flex flex-col items-center justify-center gap-1 px-2 py-3 rounded-lg v2:rounded-xl v2:duration-300 v2:ease-[cubic-bezier(0.16,1,0.3,1)] v2:active:scale-[0.98] font-medium text-xs sm:text-sm transition-all duration-300
              ${
                activeView === view.id
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white v2:bg-none v2:bg-white v2:text-zinc-950'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white v2:bg-white/[0.04] v2:text-white/70 v2:ring-1 v2:ring-inset v2:ring-white/10 v2:hover:bg-white/[0.07] v2:hover:text-white'
              }
            `}
          >
            {view.icon}
            <span className="hidden sm:inline">{view.name}</span>
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-white/10 bg-black/40 px-4 sm:px-5 py-3 mb-6 v2:border-white/[0.06] v2:bg-white/[0.02]">
        <p className="text-gray-400 text-sm sm:text-base v2:text-white/60">
          {activeViewMeta.description}
        </p>
      </div>

      {/* View content */}
      <div className="rounded-xl overflow-hidden border border-white/10 bg-black/40 v2:border-white/[0.06] v2:bg-white/[0.02]">
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
