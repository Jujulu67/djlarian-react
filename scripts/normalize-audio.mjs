#!/usr/bin/env node

/**
 * Audio Normalization Script
 * Creates gain-matched versions of processed files relative to dry signal
 */

import { readFileSync, writeFileSync, renameSync, existsSync } from 'fs';
import { join } from 'path';

const audioDir = join(process.cwd(), 'public/audio/shop/lariancrusher');

// WAV file parser
function parseWav(buffer) {
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);

  let offset = 12;
  let fmtChunk = null;
  let dataChunkOffset = 0;
  let dataChunkSize = 0;

  while (offset < buffer.length) {
    const chunkId = String.fromCharCode(...buffer.slice(offset, offset + 4));
    const chunkSize = view.getUint32(offset + 4, true);

    if (chunkId === 'fmt ') {
      fmtChunk = {
        audioFormat: view.getUint16(offset + 8, true),
        numChannels: view.getUint16(offset + 10, true),
        sampleRate: view.getUint32(offset + 12, true),
        bitsPerSample: view.getUint16(offset + 22, true),
      };
    }

    if (chunkId === 'data') {
      dataChunkOffset = offset + 8;
      dataChunkSize = chunkSize;
      break;
    }

    offset += 8 + chunkSize;
    if (chunkSize % 2 !== 0) offset++;
  }

  return { fmt: fmtChunk, dataOffset: dataChunkOffset, dataSize: dataChunkSize };
}

// Calculate RMS of entire file
function calculateRMS(buffer, wav) {
  const { fmt, dataOffset, dataSize } = wav;
  const bytesPerSample = fmt.bitsPerSample / 8;
  const numChannels = fmt.numChannels;
  const blockAlign = bytesPerSample * numChannels;
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);

  let sumSquares = 0;
  let count = 0;

  for (let i = 0; i < dataSize; i += blockAlign) {
    for (let ch = 0; ch < numChannels; ch++) {
      const offset = dataOffset + i + ch * bytesPerSample;
      if (offset + bytesPerSample > buffer.length) break;

      let sample;
      if (fmt.bitsPerSample === 32 && fmt.audioFormat === 3) {
        sample = view.getFloat32(offset, true);
      } else if (fmt.bitsPerSample === 16) {
        sample = view.getInt16(offset, true) / 32768;
      }

      sumSquares += sample * sample;
      count++;
    }
  }

  return Math.sqrt(sumSquares / count);
}

// Apply gain to audio data
function applyGain(buffer, wav, gainFactor) {
  const { fmt, dataOffset, dataSize } = wav;
  const bytesPerSample = fmt.bitsPerSample / 8;
  const numChannels = fmt.numChannels;
  const blockAlign = bytesPerSample * numChannels;

  const newBuffer = Buffer.from(buffer);
  const view = new DataView(newBuffer.buffer, newBuffer.byteOffset, newBuffer.byteLength);

  for (let i = 0; i < dataSize; i += blockAlign) {
    for (let ch = 0; ch < numChannels; ch++) {
      const offset = dataOffset + i + ch * bytesPerSample;
      if (offset + bytesPerSample > newBuffer.length) break;

      if (fmt.bitsPerSample === 32 && fmt.audioFormat === 3) {
        const sample = view.getFloat32(offset, true);
        view.setFloat32(offset, sample * gainFactor, true);
      } else if (fmt.bitsPerSample === 16) {
        const sample = view.getInt16(offset, true);
        const newSample = Math.max(-32768, Math.min(32767, Math.round(sample * gainFactor)));
        view.setInt16(offset, newSample, true);
      }
    }
  }

  return newBuffer;
}

// Main
console.log('═══════════════════════════════════════════════════════════════');
console.log('                AUDIO NORMALIZATION SCRIPT');
console.log('═══════════════════════════════════════════════════════════════\n');

// Step 1: Rename files to lowercase
const renameMap = [
  ['Creative.wav', 'creative.wav'],
  ['Dry.wav', 'dry.wav'],
  ['Hard.wav', 'hard.wav'],
  ['Medium.wav', 'medium.wav'],
  ['Very Hard.wav', 'very_hard.wav'],
];

console.log('Step 1: Renaming files to lowercase...\n');
for (const [from, to] of renameMap) {
  const fromPath = join(audioDir, from);
  const toPath = join(audioDir, to);

  if (existsSync(fromPath)) {
    renameSync(fromPath, toPath);
    console.log(`  ${from} → ${to}`);
  } else if (existsSync(toPath)) {
    console.log(`  ${to} (already exists)`);
  }
}

// Step 2: Read dry file and get reference RMS
console.log('\nStep 2: Calculating reference level from dry.wav...\n');
const dryPath = join(audioDir, 'dry.wav');
const dryBuffer = readFileSync(dryPath);
const dryWav = parseWav(dryBuffer);
const dryRMS = calculateRMS(dryBuffer, dryWav);
const dryDb = 20 * Math.log10(dryRMS);
console.log(`  Dry RMS: ${dryDb.toFixed(1)} dB (reference)`);

// Step 3: Create normalized versions
console.log('\nStep 3: Creating normalized versions...\n');

const filesToNormalize = ['medium.wav', 'hard.wav', 'very_hard.wav', 'creative.wav'];

for (const file of filesToNormalize) {
  const filePath = join(audioDir, file);
  const normPath = join(audioDir, file.replace('.wav', '_norm.wav'));

  if (!existsSync(filePath)) {
    console.log(`  ⚠️  ${file} not found, skipping`);
    continue;
  }

  const buffer = readFileSync(filePath);
  const wav = parseWav(buffer);
  const rms = calculateRMS(buffer, wav);
  const db = 20 * Math.log10(rms);

  // Calculate gain needed to match dry
  const gainDb = dryDb - db;
  const gainFactor = Math.pow(10, gainDb / 20);

  console.log(`  ${file}:`);
  console.log(`    Current: ${db.toFixed(1)} dB`);
  console.log(`    Gain needed: ${gainDb.toFixed(1)} dB (factor: ${gainFactor.toFixed(3)})`);

  const normalizedBuffer = applyGain(buffer, wav, gainFactor);
  writeFileSync(normPath, normalizedBuffer);

  // Verify
  const verifyWav = parseWav(normalizedBuffer);
  const verifyRMS = calculateRMS(normalizedBuffer, verifyWav);
  const verifyDb = 20 * Math.log10(verifyRMS);
  console.log(`    Result: ${verifyDb.toFixed(1)} dB → ${file.replace('.wav', '_norm.wav')} ✅\n`);
}

// Also create dry_norm (just a copy since it's the reference)
console.log('  dry.wav:');
console.log('    Reference file - creating dry_norm.wav as copy');
writeFileSync(join(audioDir, 'dry_norm.wav'), dryBuffer);
console.log('    → dry_norm.wav ✅\n');

console.log('═══════════════════════════════════════════════════════════════');
console.log('Done! All normalized files created.');
