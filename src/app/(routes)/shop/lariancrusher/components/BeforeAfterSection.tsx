import { AlertTriangle, Pause, Play, ToggleLeft, Waves } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { useSeamlessAudioLoop } from '@/hooks/useSeamlessAudioLoop';

import { getComparisonFileName } from './comparisonUtils';
import { COMPARISON_MODES } from './constants';

export function BeforeAfterSection() {
  const [gainMatch, setGainMatch] = useState(true);
  const [activeMode, setActiveMode] = useState('medium');
  const [playingType, setPlayingType] = useState<'original' | 'processed' | null>(null);

  // List all audio files to preload
  const audioFiles = useMemo(
    () => [
      'dry.wav',
      'dry_norm.wav',
      'medium.wav',
      'medium_norm.wav',
      'hard.wav',
      'hard_norm.wav',
      'very_hard.wav',
      'very_hard_norm.wav',
      'creative.wav',
      'creative_norm.wav',
    ],
    []
  );

  const { isLoaded, isPlaying, currentFile, play, stop, switchTo } = useSeamlessAudioLoop({
    basePath: '/audio/shop/lariancrusher',
    files: audioFiles,
    crossfadeDuration: 0.1, // 100ms smooth crossfade
  });

  // Get the correct file name based on state
  const getFileName = (type: 'original' | 'processed') =>
    getComparisonFileName(type, activeMode, gainMatch);

  // Handle mode or gain match changes while playing
  useEffect(() => {
    if (playingType && isPlaying) {
      const targetFile = getFileName(playingType);
      if (currentFile !== targetFile) {
        switchTo(targetFile);
      }
    }
  }, [activeMode, gainMatch, playingType, isPlaying, currentFile, switchTo]);

  const togglePlay = (type: 'original' | 'processed') => {
    if (playingType === type) {
      // Stop playback
      stop();
      setPlayingType(null);
    } else {
      // Start or switch playback
      const targetFile = getFileName(type);
      if (isPlaying) {
        switchTo(targetFile);
      } else {
        play(targetFile);
      }
      setPlayingType(type);
    }
  };

  return (
    <div className="glass-modern rounded-2xl p-6 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <h3 className="text-2xl font-bold text-white v2:text-display v2:font-normal">
          Hear the Difference
        </h3>
        <div className="flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-4">
          <div className="flex items-center gap-2 text-xs text-yellow-300 bg-yellow-500/10 px-3 py-1 rounded-md">
            <AlertTriangle className="w-4 h-4" />
            <span>Without gain match, volume can be really loud.</span>
          </div>
          <button
            onClick={() => setGainMatch(!gainMatch)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 self-start md:self-auto ${
              gainMatch
                ? 'bg-purple-600 text-white v2:bg-white v2:text-zinc-950'
                : 'bg-white/10 text-gray-400 hover:text-white v2:bg-white/[0.04] v2:text-white/70 v2:ring-1 v2:ring-inset v2:ring-white/10'
            } v2:rounded-full v2:active:scale-[0.98]`}
          >
            <ToggleLeft
              className={`w-5 h-5 transition-transform ${gainMatch ? 'rotate-180' : ''}`}
            />
            Gain Match {gainMatch ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {/* Mode Selector - Tabs Style */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
        {COMPARISON_MODES.map((mode) => (
          <button
            key={mode.id}
            onClick={() => setActiveMode(mode.id)}
            className={`
                            px-4 py-3 rounded-lg font-bold text-xs uppercase tracking-widest transition-all duration-300
                            ${
                              activeMode === mode.id
                                ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg v2:bg-none v2:bg-white v2:text-zinc-950 v2:shadow-none'
                                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/5 v2:border-transparent v2:bg-white/[0.04] v2:text-white/70 v2:ring-1 v2:ring-inset v2:ring-white/10 v2:hover:text-white'
                            }
                            v2:rounded-full v2:active:scale-[0.98]
                        `}
          >
            {mode.label}
          </button>
        ))}
      </div>

      {/* Mode Description Area */}
      <div className="text-center mb-8 px-4">
        <p className="text-gray-400 text-sm animate-in fade-in slide-in-from-top-1 duration-500 v2:text-white/60">
          <span className="text-purple-400 font-semibold mr-2">
            {COMPARISON_MODES.find((m) => m.id === activeMode)?.label}:
          </span>
          {COMPARISON_MODES.find((m) => m.id === activeMode)?.description}
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Original */}
        <button
          onClick={() => togglePlay('original')}
          className={`bg-black/50 rounded-xl p-6 text-center group transition-all duration-300 cursor-pointer hover:bg-black/70 border-2 w-full text-left outline-none v2:rounded-2xl v2:border v2:bg-white/[0.03] v2:hover:bg-white/[0.05] v2:active:scale-[0.99] ${playingType === 'original' ? 'border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.2)] v2:border-brand/60 v2:shadow-none' : 'border-transparent v2:border-white/[0.08]'}`}
        >
          <div className="aspect-[3/1] bg-gradient-to-r from-gray-700/50 to-gray-600/50 rounded-lg mb-4 flex items-center justify-center border border-white/5 v2:rounded-xl v2:bg-none v2:bg-white/[0.04]">
            <Waves
              className={`w-10 h-10 transition-all duration-300 ${playingType === 'original' ? 'text-purple-400 scale-110' : 'text-gray-400 group-hover:scale-110'}`}
            />
          </div>
          <h4 className="text-white font-semibold text-lg mb-1">Original Signal</h4>
          <p className="text-gray-500 text-sm italic">Clean reference input</p>
          <div className="text-purple-400 text-xs mt-3 flex items-center justify-center gap-2 font-bold uppercase tracking-widest">
            {playingType === 'original' ? (
              <>
                <Pause className="w-4 h-4" /> Playing
              </>
            ) : (
              <>
                <Play className="w-4 h-4" /> Listen Original
              </>
            )}
          </div>
        </button>

        {/* Processed */}
        <button
          onClick={() => togglePlay('processed')}
          className={`bg-black/50 rounded-xl p-6 text-center group transition-all duration-300 cursor-pointer hover:bg-black/70 border-2 overflow-hidden relative w-full text-left outline-none v2:rounded-2xl v2:border v2:bg-white/[0.03] v2:hover:bg-white/[0.05] v2:active:scale-[0.99] ${playingType === 'processed' ? 'border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.2)] v2:border-brand/60 v2:shadow-none' : 'border-transparent v2:border-white/[0.08]'}`}
        >
          <div
            className={`aspect-[3/1] rounded-lg mb-4 flex items-center justify-center transition-all duration-500 border border-white/10 ${
              gainMatch
                ? 'bg-gradient-to-r from-green-700/40 to-emerald-600/40 active-glow-green'
                : 'bg-gradient-to-r from-purple-700/40 to-blue-600/40 active-glow-purple'
            } v2:rounded-xl v2:bg-none ${gainMatch ? 'v2:bg-emerald-500/10' : 'v2:bg-brand/10'}`}
          >
            <Waves
              className={`w-10 h-10 transition-all duration-500 ${playingType === 'processed' ? 'scale-110' : 'group-hover:scale-110'} ${gainMatch ? 'text-green-400' : 'text-purple-400'} ${activeMode === 'creative' || playingType === 'processed' ? 'animate-pulse v2:animate-none' : ''}`}
            />
          </div>
          <h4 className="text-white font-semibold text-lg mb-1 text-center">
            Processed{' '}
            <span className="text-purple-400 ml-1">
              [{COMPARISON_MODES.find((m) => m.id === activeMode)?.label}]
            </span>
          </h4>
          <p className="text-gray-400 text-sm italic text-center">
            {gainMatch ? 'Gain matched' : 'Raw output'}
          </p>
          <div className="text-purple-400 text-xs mt-3 flex items-center justify-center gap-2 font-bold uppercase tracking-widest">
            {playingType === 'processed' ? (
              <>
                <Pause className="w-4 h-4" /> Playing
              </>
            ) : (
              <>
                <Play className="w-4 h-4" /> Preview Sound
              </>
            )}
          </div>
        </button>
      </div>
    </div>
  );
}
