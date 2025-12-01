/**
 * Client-side audio analysis utilities
 * Analyzes audio files to extract waveform data and metadata
 * SoundCloud-style natural waveform generation
 */

export interface AudioAnalysisResult {
  waveform: number[];
  duration: number;
  fileName: string;
}

/**
 * Analyse un fichier audio et génère une waveform style SoundCloud
 */
export async function analyzeAudioFile(file: File): Promise<AudioAnalysisResult> {
  return new Promise((resolve, reject) => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const fileReader = new FileReader();

    fileReader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        // Extraire la durée
        const duration = audioBuffer.duration;

        // Générer la waveform style SoundCloud (beaucoup plus de samples)
        const waveform = generateSoundCloudWaveform(audioBuffer);

        resolve({
          waveform,
          duration,
          fileName: file.name,
        });
      } catch (error) {
        reject(new Error("Erreur lors de l'analyse du fichier audio"));
      } finally {
        audioContext.close();
      }
    };

    fileReader.onerror = () => {
      reject(new Error('Erreur lors de la lecture du fichier'));
    };

    fileReader.readAsArrayBuffer(file);
  });
}

/**
 * Génère une waveform style Mofalk
 * 100% RMS - loudness perçue, zéro normalisation
 */
function generateSoundCloudWaveform(audioBuffer: AudioBuffer, samples: number = 200): number[] {
  // Combiner les canaux si stéréo
  const channelData: Float32Array[] = [];
  for (let c = 0; c < audioBuffer.numberOfChannels; c++) {
    channelData.push(audioBuffer.getChannelData(c));
  }

  const dataLength = channelData[0].length;
  const blockSize = Math.floor(dataLength / samples);
  const rmsValues: number[] = [];

  for (let i = 0; i < samples; i++) {
    const start = blockSize * i;
    const end = Math.min(start + blockSize, dataLength);

    let sumSquares = 0;
    let count = 0;

    // 100% RMS - calculer la moyenne quadratique
    for (let j = start; j < end; j++) {
      for (let c = 0; c < channelData.length; c++) {
        const sample = channelData[c][j];
        sumSquares += sample * sample;
        count++;
      }
    }

    const rms = count > 0 ? Math.sqrt(sumSquares / count) : 0;
    rmsValues.push(rms);
  }

  // Convertir directement en pourcentage - aucune normalisation
  // RMS est généralement entre 0 et ~0.3-0.4 pour de l'audio musical
  // On multiplie par 250 pour avoir une bonne amplitude visuelle
  const waveform: number[] = [];

  for (let i = 0; i < rmsValues.length; i++) {
    const percentage = Math.max(1, rmsValues[i] * 250);
    waveform.push(Math.min(100, percentage));
  }

  return waveform;
}

/**
 * Formate la durée en MM:SS
 */
export function formatDuration(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
