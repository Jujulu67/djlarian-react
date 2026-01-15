#!/usr/bin/env node

/**
 * Audio Trim Script
 * Removes silence from the end of WAV files
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const SILENCE_THRESHOLD = 0.01; // -40dB threshold for silence detection
const MIN_SILENCE_MS = 50; // Minimum silence duration to trim (ms)

// WAV file parser
function parseWav(buffer) {
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);

  const riff = String.fromCharCode(...buffer.slice(0, 4));
  if (riff !== 'RIFF') throw new Error('Not a valid WAV file');

  const wave = String.fromCharCode(...buffer.slice(8, 12));
  if (wave !== 'WAVE') throw new Error('Not a valid WAV file');

  let offset = 12;
  let fmtChunk = null;
  let dataChunkStart = 0;
  let dataChunkSize = 0;

  while (offset < buffer.length) {
    const chunkId = String.fromCharCode(...buffer.slice(offset, offset + 4));
    const chunkSize = view.getUint32(offset + 4, true);

    if (chunkId === 'fmt ') {
      fmtChunk = {
        offset: offset,
        size: chunkSize,
        audioFormat: view.getUint16(offset + 8, true),
        numChannels: view.getUint16(offset + 10, true),
        sampleRate: view.getUint32(offset + 12, true),
        byteRate: view.getUint32(offset + 16, true),
        blockAlign: view.getUint16(offset + 20, true),
        bitsPerSample: view.getUint16(offset + 22, true),
      };
    }

    if (chunkId === 'data') {
      dataChunkStart = offset + 8;
      dataChunkSize = chunkSize;
      break;
    }

    offset += 8 + chunkSize;
    if (chunkSize % 2 !== 0) offset++;
  }

  if (!fmtChunk) throw new Error('No fmt chunk found');
  if (!dataChunkStart) throw new Error('No data chunk found');

  return {
    fmt: fmtChunk,
    dataStart: dataChunkStart,
    dataSize: dataChunkSize,
    headerEnd: dataChunkStart,
    buffer
  };
}

// Find the last non-silent sample
function findTrimPoint(buffer, wav) {
  const { fmt, dataStart, dataSize } = wav;
  const bytesPerSample = fmt.bitsPerSample / 8;
  const blockAlign = fmt.blockAlign;
  const sampleRate = fmt.sampleRate;
  const numChannels = fmt.numChannels;

  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const totalFrames = Math.floor(dataSize / blockAlign);

  // Scan from end to find last loud sample
  let lastLoudFrame = totalFrames;
  let silentFrames = 0;
  const minSilentFrames = Math.floor(sampleRate * MIN_SILENCE_MS / 1000);

  for (let frame = totalFrames - 1; frame >= 0; frame--) {
    const frameOffset = dataStart + frame * blockAlign;
    let maxSample = 0;

    // Check all channels
    for (let ch = 0; ch < numChannels; ch++) {
      const sampleOffset = frameOffset + ch * bytesPerSample;

      let sample;
      if (fmt.bitsPerSample === 16) {
        sample = Math.abs(view.getInt16(sampleOffset, true) / 32768);
      } else if (fmt.bitsPerSample === 24) {
        const b0 = buffer[sampleOffset];
        const b1 = buffer[sampleOffset + 1];
        const b2 = buffer[sampleOffset + 2];
        let val = (b2 << 16) | (b1 << 8) | b0;
        if (val & 0x800000) val |= ~0xFFFFFF;
        sample = Math.abs(val / 8388608);
      } else if (fmt.bitsPerSample === 32) {
        if (fmt.audioFormat === 3) { // IEEE float
          sample = Math.abs(view.getFloat32(sampleOffset, true));
        } else {
          sample = Math.abs(view.getInt32(sampleOffset, true) / 2147483648);
        }
      }

      if (sample > maxSample) maxSample = sample;
    }

    if (maxSample > SILENCE_THRESHOLD) {
      // Found loud sample
      if (silentFrames >= minSilentFrames) {
        lastLoudFrame = frame + 1;
        break;
      }
      silentFrames = 0;
      lastLoudFrame = frame + 1;
    } else {
      silentFrames++;
    }
  }

  // Add a small fade-out buffer (10ms)
  const fadeBuffer = Math.floor(sampleRate * 0.01);
  lastLoudFrame = Math.min(totalFrames, lastLoudFrame + fadeBuffer);

  return {
    originalFrames: totalFrames,
    trimmedFrames: lastLoudFrame,
    silentFrames: totalFrames - lastLoudFrame,
    silentMs: Math.round((totalFrames - lastLoudFrame) / sampleRate * 1000),
    originalDuration: totalFrames / sampleRate,
    trimmedDuration: lastLoudFrame / sampleRate,
  };
}

// Create trimmed WAV file
function createTrimmedWav(originalBuffer, wav, trimmedFrames) {
  const { fmt, dataStart } = wav;
  const blockAlign = fmt.blockAlign;
  const newDataSize = trimmedFrames * blockAlign;

  // Calculate new file size
  const headerSize = dataStart;
  const newFileSize = headerSize + newDataSize;

  // Create new buffer
  const newBuffer = Buffer.alloc(newFileSize);

  // Copy header
  originalBuffer.copy(newBuffer, 0, 0, headerSize);

  // Copy trimmed audio data
  originalBuffer.copy(newBuffer, headerSize, dataStart, dataStart + newDataSize);

  // Update RIFF chunk size (file size - 8)
  const view = new DataView(newBuffer.buffer, newBuffer.byteOffset, newBuffer.byteLength);
  view.setUint32(4, newFileSize - 8, true);

  // Update data chunk size
  view.setUint32(headerSize - 4, newDataSize, true);

  return newBuffer;
}

// Main
const audioDir = join(process.cwd(), 'public/audio/shop/lariancrusher');
const files = [
  'creative.wav',
  'creative_norm.wav',
  'dry.wav',
  'dry_norm.wav',
  'hard.wav',
  'hard_norm.wav',
  'medium.wav',
  'medium_norm.wav',
  'very_hard.wav',
  'very_hard_norm.wav',
];

console.log('═══════════════════════════════════════════════════════════════');
console.log('                    AUDIO TRIM REPORT');
console.log('═══════════════════════════════════════════════════════════════\n');

let totalTrimmed = 0;

for (const file of files) {
  const filePath = join(audioDir, file);

  try {
    const buffer = readFileSync(filePath);
    const wav = parseWav(buffer);
    const trim = findTrimPoint(buffer, wav);

    const needsTrim = trim.silentMs > 10; // More than 10ms of silence

    console.log(`▶ ${file}`);
    console.log(`  Original: ${trim.originalDuration.toFixed(3)}s`);
    console.log(`  Silence at end: ${trim.silentMs}ms`);

    if (needsTrim) {
      const trimmedBuffer = createTrimmedWav(buffer, wav, trim.trimmedFrames);
      writeFileSync(filePath, trimmedBuffer);
      console.log(`  ✅ TRIMMED → ${trim.trimmedDuration.toFixed(3)}s (removed ${trim.silentMs}ms)`);
      totalTrimmed++;
    } else {
      console.log(`  ✓ OK (no trim needed)`);
    }
    console.log('');

  } catch (err) {
    console.log(`▶ ${file}`);
    console.log(`  ❌ Error: ${err.message}\n`);
  }
}

console.log('═══════════════════════════════════════════════════════════════');
console.log(`Done! Trimmed ${totalTrimmed} file(s)`);
