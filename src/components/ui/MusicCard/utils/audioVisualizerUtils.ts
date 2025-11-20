const SAMPLE_RATE = 44100;
const NYQUIST = SAMPLE_RATE / 2;
const MIN_FREQ = 20;

/**
 * Calcule le mapping des fréquences pour les 20 barres (mémorisé)
 */
export function calculateFrequencyMapping(totalBins: number) {
  const logMin = Math.log10(MIN_FREQ);
  const logMax = Math.log10(NYQUIST);
  const logRange = logMax - logMin;

  return Array(20)
    .fill(0)
    .map((_, index) => {
      const barStart = logMin + (logRange * index) / 20;
      const barEnd = logMin + (logRange * (index + 1)) / 20;
      const freqStart = Math.pow(10, barStart);
      const freqEnd = Math.pow(10, barEnd);
      const binStart = Math.floor((freqStart / NYQUIST) * totalBins);
      const binEnd = Math.ceil((freqEnd / NYQUIST) * totalBins);

      return { binStart, binEnd, index };
    });
}

/**
 * Calcule la valeur d'une barre à partir des vraies données de fréquence
 */
export function calculateRealAudioBarValue(
  index: number,
  frequencyData: Uint8Array,
  previousAudioData: number[],
  frequencyMapping: ReturnType<typeof calculateFrequencyMapping>
): number {
  const mapping = frequencyMapping[index];
  if (!mapping) return 20;

  const { binStart, binEnd } = mapping;
  let weightedSum = 0;
  let weightSum = 0;

  for (let i = Math.max(0, binStart); i < Math.min(binEnd, frequencyData.length); i++) {
    const center = (binStart + binEnd) / 2;
    const distance = Math.abs(i - center);
    const width = (binEnd - binStart) / 2;
    const weight = Math.exp(-(distance * distance) / (2 * width * width));

    weightedSum += frequencyData[i] * weight;
    weightSum += weight;
  }

  const avg = weightSum > 0 ? weightedSum / weightSum : 0;
  let normalizedValue = (avg / 255) * 100;
  normalizedValue = Math.pow(normalizedValue / 100, 0.7) * 100;

  // Amplification par bande
  if (index < 7) {
    normalizedValue *= 1.5;
  } else if (index < 14) {
    normalizedValue *= 1.3;
  } else {
    normalizedValue *= 1.2;
  }

  // Smoothing adaptatif
  const currentValue = previousAudioData[index] || 20;
  let smoothing: number;

  if (index < 7) {
    const change = Math.abs(normalizedValue - currentValue);
    smoothing = change > 20 ? 0.5 : change > 10 ? 0.6 : 0.7;
  } else if (index < 14) {
    const change = Math.abs(normalizedValue - currentValue);
    smoothing = change > 25 ? 0.3 : change > 15 ? 0.4 : 0.5;
  } else {
    const change = Math.abs(normalizedValue - currentValue);
    smoothing = change > 30 ? 0.15 : change > 20 ? 0.2 : 0.3;
  }

  const smoothed = currentValue * smoothing + normalizedValue * (1 - smoothing);
  return Math.max(18, Math.min(92, smoothed));
}

/**
 * Calcule la valeur d'une barre pour la simulation audio
 */
export function calculateSimulatedAudioBarValue(
  index: number,
  time: number,
  previousAudioData: number[]
): number {
  const normalizedPosition = index / 19;
  const beat = Math.sin(time * 2 * Math.PI) * 0.5 + 0.5;
  const beatPower = Math.pow(beat, 2);
  let frequencyValue = 0;

  if (index < 7) {
    // BASSES
    const bassBase = 45 + 15 * beatPower;
    const bassVariation = Math.sin(time * 0.8 + index * 0.5) * 8;
    const bassKick = Math.sin(time * 1.2) > 0.85 ? 12 : 0;
    frequencyValue = bassBase + bassVariation + bassKick;
    const currentValue = previousAudioData[index] || bassBase;
    frequencyValue = currentValue * 0.85 + frequencyValue * 0.15;
  } else if (index < 14) {
    // MOYENNES
    const midBase = 30 + 20 * beatPower;
    const midWave1 = Math.sin(time * 2.5 + index * 0.8) * 12;
    const midWave2 = Math.sin(time * 4.0 + index * 1.2) * 8;
    const midVariation = midWave1 + midWave2;
    frequencyValue = midBase + midVariation;
    const currentValue = previousAudioData[index] || midBase;
    frequencyValue = currentValue * 0.7 + frequencyValue * 0.3;
  } else {
    // AIGUS
    const highBase = 20 + 25 * beatPower;
    const highness = (index - 14) / 5;
    const peakIntensity = 1 + highness * 1.5;
    const highWave1 = Math.sin(time * 6.0 + index * 1.5) * 15 * peakIntensity;
    const highWave2 = Math.sin(time * 9.0 + index * 2.0) * 10 * peakIntensity;
    const highWave3 = Math.sin(time * 12.0 + index * 3.0) * 8 * peakIntensity;
    const highVariation = highWave1 + highWave2 + highWave3;
    const randomPeak = Math.random() > 0.92 ? (15 + Math.random() * 20) * peakIntensity : 0;
    frequencyValue = highBase + highVariation + randomPeak;
    const currentValue = previousAudioData[index] || highBase;
    frequencyValue = currentValue * 0.5 + frequencyValue * 0.5;
  }

  const frequencyResponse = 1.0 - Math.abs(normalizedPosition - 0.5) * 0.1;
  frequencyValue *= frequencyResponse;

  return Math.max(20, Math.min(90, frequencyValue));
}

/**
 * Calcule la valeur d'une barre pour l'animation en pause
 */
export function calculatePauseAnimationBarValue(
  index: number,
  time: number,
  previousAudioData: number[]
): number {
  const position = index / 20;
  const baseValue = 40;
  const wave1 = 35 * Math.sin(time * 0.6 + position * 6);
  const wave2 = 25 * Math.sin(time * 1.2 + position * 4);
  const wave3 = 15 * Math.sin(time * 2.0 + position * 10);
  const wave4 = 10 * Math.sin(time * 3.5 + position * 15);

  const value = baseValue + wave1 + wave2 + wave3 + wave4;
  const currentValue = previousAudioData[index] || baseValue;
  const smoothed = currentValue * 0.3 + value * 0.7;

  return Math.max(15, Math.min(90, smoothed));
}
