import {
  Activity,
  CircleDot,
  Cpu,
  Grid3X3,
  Layers,
  Monitor,
  Music,
  Palette,
  Settings2,
  Waves,
  Zap,
} from 'lucide-react';

import type { Feature, ShowcaseSectionMeta, ViewMode } from './types';

export const FEATURES: Feature[] = [
  {
    icon: <Layers className="w-8 h-8" />,
    title: '5 Unique Views',
    description: 'Switch between OneKnob, Legacy, Modern, Crazy, and Draw views',
    details: [
      'OneKnob - Single macro for quick sound design (default)',
      'Legacy - Classic multi-knob controls',
      'Modern - Digital destruction tools (Bitcrush, Erosion)',
      'Crazy - XY morphing distortion',
      'Draw - Paint your own waveshaper',
    ],
  },
  {
    icon: <Music className="w-8 h-8" />,
    title: '27 Factory Presets',
    description: 'From subtle warmth to total destruction',
    details: [
      'Carefully crafted by sound designers',
      'Cover all genres and use cases',
      'Great starting points for your own sounds',
    ],
  },
  {
    icon: <Settings2 className="w-8 h-8" />,
    title: '3 LFOs + Custom Curves',
    description: 'Deep modulation system with 21 targets',
    details: [
      'Tempo sync or free running',
      'Custom drawable curves',
      'Envelope mode for one-shot modulation',
      'Retrigger on MIDI notes',
    ],
  },
  {
    icon: <Palette className="w-8 h-8" />,
    title: 'XY Morph Distortion',
    description: '4 algorithms blended via XY pad',
    details: ['Wavefolder', 'Bitcrush', 'Asymmetric Fuzz', 'Rectifier'],
  },
  {
    icon: <Grid3X3 className="w-8 h-8" />,
    title: 'Draw Canvas',
    description: 'Paint your own 32×32 waveshaper',
    details: [
      'SCAN mode - Grid modulates amplitude',
      'SHAPE mode - Custom transfer function',
      '12 random preset shapes',
    ],
  },
  {
    icon: <Monitor className="w-8 h-8" />,
    title: 'Cross-Platform',
    description: 'Native builds for macOS & Windows',
    details: ['macOS (AU, VST3)', 'Windows (VST3)'],
  },
];

export const VIEW_MODES: ViewMode[] = [
  {
    id: 'oneknob',
    name: 'OneKnob',
    description: 'Single macro knob controls everything - perfect for quick sound design',
    icon: <CircleDot className="w-5 h-5" />,
  },
  {
    id: 'legacy',
    name: 'Legacy',
    description: 'Classic multi-knob interface with individual distortion controls',
    icon: <Settings2 className="w-5 h-5" />,
  },
  {
    id: 'modern',
    name: 'Modern',
    description: 'Bitcrush, Erosion, Comb, Formant filters for digital destruction',
    icon: <Cpu className="w-5 h-5" />,
  },
  {
    id: 'crazy',
    name: 'Crazy',
    description: 'XY pad morphing between 4 distortion algorithms',
    icon: <Zap className="w-5 h-5" />,
  },
  {
    id: 'draw',
    name: 'Draw',
    description: 'Paint your own waveshaper on a 32×32 canvas',
    icon: <Palette className="w-5 h-5" />,
  },
];

export const SHOWCASE_SECTIONS: ShowcaseSectionMeta[] = [
  {
    id: 'lfo',
    title: 'LFO Modulation',
    description: '3 independent LFOs with tempo sync, custom curves, and 21 modulation targets',
    icon: <Activity className="w-5 h-5" />,
  },
  {
    id: 'visualizer',
    title: 'Real-time Visualizer',
    description: 'See your waveform transform in real-time with the built-in oscilloscope',
    icon: <Waves className="w-5 h-5" />,
  },
];

export const TECH_SPECS = [
  { label: 'Plugin Formats', value: 'VST3, AU', highlight: true },
  { label: 'Platforms', value: 'macOS 10.13+, Windows 10+', highlight: false },
  { label: 'Architecture', value: 'Apple Silicon + Intel, x64', highlight: false },
  { label: 'Technology', value: 'JUCE + WebView', highlight: true },
  { label: 'DAW Support', value: 'All major DAWs', highlight: false },
  { label: 'License', value: '1 user, 3 machines max', highlight: true },
];

export const GIFS_BASE_PATH = '/gifs/lariancrusher';

export const VIEW_GIFS: Record<
  string,
  { src: string; alt: string; width: number; height: number }
> = {
  oneknob: {
    src: `${GIFS_BASE_PATH}/Oneknob.gif`,
    alt: 'LarianCrusher OneKnob view demo',
    width: 1000,
    height: 700,
  },
  legacy: {
    src: `${GIFS_BASE_PATH}/Legacy.gif`,
    alt: 'LarianCrusher Legacy view demo',
    width: 1000,
    height: 700,
  },
  modern: {
    src: `${GIFS_BASE_PATH}/Modern.gif`,
    alt: 'LarianCrusher Modern view demo',
    width: 1000,
    height: 700,
  },
  crazy: {
    src: `${GIFS_BASE_PATH}/Crazy.gif`,
    alt: 'LarianCrusher Crazy view demo',
    width: 1000,
    height: 700,
  },
  draw: {
    src: `${GIFS_BASE_PATH}/Draw.gif`,
    alt: 'LarianCrusher Draw view demo',
    width: 1000,
    height: 700,
  },
};

export const SHOWCASE_GIFS: Record<
  string,
  { src: string; alt: string; width: number; height: number }
> = {
  lfo: {
    src: `${GIFS_BASE_PATH}/LFO.gif`,
    alt: 'LarianCrusher LFO modulation demo',
    width: 1000,
    height: 988,
  },
  visualizer: {
    src: `${GIFS_BASE_PATH}/Vizualizer.gif`,
    alt: 'LarianCrusher visualizer demo',
    width: 1000,
    height: 900,
  },
};

export const COMPARISON_MODES = [
  { id: 'medium', label: 'Medium', description: 'Standard balanced saturation' },
  { id: 'hard', label: 'Hard', description: 'OneKnob pushed to 100% saturation' },
  {
    id: 'very_hard',
    label: 'Very Hard',
    description: 'Multiple modules active with deep clipping',
  },
  { id: 'creative', label: 'Creative', description: 'Extreme modulation with active LFO curves' },
];
