#!/usr/bin/env node

/**
 * Trim audio files to exactly 4 seconds (8 bars @ 120 BPM)
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const TARGET_DURATION = 4.0; // 8 bars @ 120 BPM
const audioDir = join(process.cwd(), 'public/audio/shop/lariancrusher');

function parseAndTrimWav(buffer, targetSeconds) {
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);

  // Parse header
  let offset = 12;
  let fmtChunk = null;
  let dataChunkOffset = 0;
  let dataChunkSize = 0;
  let headerEnd = 0;

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
      dataChunkOffset = offset;
      dataChunkSize = chunkSize;
      headerEnd = offset + 8;
      break;
    }

    offset += 8 + chunkSize;
    if (chunkSize % 2 !== 0) offset++;
  }

  const bytesPerSample = fmtChunk.bitsPerSample / 8;
  const blockAlign = bytesPerSample * fmtChunk.numChannels;
  const currentDuration = dataChunkSize / (fmtChunk.sampleRate * blockAlign);

  // Calculate new data size for target duration
  const targetFrames = Math.floor(targetSeconds * fmtChunk.sampleRate);
  const newDataSize = targetFrames * blockAlign;

  if (newDataSize >= dataChunkSize) {
    // File is already shorter or equal, no trim needed
    return { buffer, trimmed: false, duration: currentDuration };
  }

  // Create new buffer
  const newFileSize = headerEnd + newDataSize;
  const newBuffer = Buffer.alloc(newFileSize);

  // Copy header (everything up to data chunk content)
  buffer.copy(newBuffer, 0, 0, headerEnd);

  // Copy trimmed audio data
  buffer.copy(newBuffer, headerEnd, headerEnd, headerEnd + newDataSize);

  // Update RIFF chunk size
  const newView = new DataView(newBuffer.buffer, newBuffer.byteOffset, newBuffer.byteLength);
  newView.setUint32(4, newFileSize - 8, true);

  // Update data chunk size
  newView.setUint32(dataChunkOffset + 4, newDataSize, true);

  return {
    buffer: newBuffer,
    trimmed: true,
    oldDuration: currentDuration,
    newDuration: targetSeconds,
    removed: currentDuration - targetSeconds
  };
}

console.log('═══════════════════════════════════════════════════════════════');
console.log(`          TRIM TO ${TARGET_DURATION}s (8 bars @ 120 BPM)`);
console.log('═══════════════════════════════════════════════════════════════\n');

const files = [
  'dry.wav',
  'medium.wav',
  'hard.wav',
  'very_hard.wav',
  'creative.wav',
];

for (const file of files) {
  const filePath = join(audioDir, file);

  if (!existsSync(filePath)) {
    console.log(`⚠️  ${file} not found`);
    continue;
  }

  const buffer = readFileSync(filePath);
  const result = parseAndTrimWav(buffer, TARGET_DURATION);

  if (result.trimmed) {
    writeFileSync(filePath, result.buffer);
    console.log(`✅ ${file}: ${result.oldDuration.toFixed(3)}s → ${result.newDuration.toFixed(3)}s (removed ${(result.removed * 1000).toFixed(0)}ms)`);
  } else {
    console.log(`✓  ${file}: ${result.duration.toFixed(3)}s (no trim needed)`);
  }
}

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('Now regenerating normalized versions...\n');

// Regenerate normalized versions
const { execSync } = await import('child_process');
execSync('node scripts/normalize-audio.mjs', { stdio: 'inherit', cwd: process.cwd() });
