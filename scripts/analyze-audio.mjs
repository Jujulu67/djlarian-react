#!/usr/bin/env node

/**
 * Audio Analysis Script
 * Analyzes WAV files to detect volume inconsistencies, fades, and potential crossfade issues
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

// WAV file parser
function parseWav(buffer) {
  const view = new DataView(buffer.buffer);

  // Check RIFF header
  const riff = String.fromCharCode(...buffer.slice(0, 4));
  if (riff !== 'RIFF') throw new Error('Not a valid WAV file');

  const wave = String.fromCharCode(...buffer.slice(8, 12));
  if (wave !== 'WAVE') throw new Error('Not a valid WAV file');

  // Find fmt chunk
  let offset = 12;
  let numChannels, sampleRate, bitsPerSample;

  while (offset < buffer.length) {
    const chunkId = String.fromCharCode(...buffer.slice(offset, offset + 4));
    const chunkSize = view.getUint32(offset + 4, true);

    if (chunkId === 'fmt ') {
      numChannels = view.getUint16(offset + 10, true);
      sampleRate = view.getUint32(offset + 12, true);
      bitsPerSample = view.getUint16(offset + 22, true);
    }

    if (chunkId === 'data') {
      const dataStart = offset + 8;
      const dataEnd = dataStart + chunkSize;
      const audioData = buffer.slice(dataStart, dataEnd);

      return {
        numChannels,
        sampleRate,
        bitsPerSample,
        audioData,
        duration: chunkSize / (sampleRate * numChannels * (bitsPerSample / 8))
      };
    }

    offset += 8 + chunkSize;
    if (chunkSize % 2 !== 0) offset++; // Padding
  }

  throw new Error('No data chunk found');
}

// Convert raw audio data to float samples
function toFloatSamples(audioData, bitsPerSample, numChannels) {
  const samples = [];
  const bytesPerSample = bitsPerSample / 8;
  const view = new DataView(audioData.buffer, audioData.byteOffset, audioData.byteLength);

  for (let i = 0; i < audioData.length; i += bytesPerSample * numChannels) {
    let sum = 0;
    for (let ch = 0; ch < numChannels; ch++) {
      const offset = i + ch * bytesPerSample;
      if (offset + bytesPerSample <= audioData.length) {
        let sample;
        if (bitsPerSample === 16) {
          sample = view.getInt16(offset, true) / 32768;
        } else if (bitsPerSample === 24) {
          const b0 = audioData[offset];
          const b1 = audioData[offset + 1];
          const b2 = audioData[offset + 2];
          sample = ((b2 << 16) | (b1 << 8) | b0) / 8388608;
          if (sample > 1) sample -= 2;
        } else if (bitsPerSample === 32) {
          sample = view.getFloat32(offset, true);
        }
        sum += Math.abs(sample);
      }
    }
    samples.push(sum / numChannels);
  }

  return samples;
}

// Calculate RMS for a segment (iterative to avoid stack overflow)
function calculateRMS(samples, start, end) {
  let sumSquares = 0;
  let count = 0;
  for (let i = start; i < end && i < samples.length; i++) {
    sumSquares += samples[i] * samples[i];
    count++;
  }
  if (count === 0) return 0;
  return Math.sqrt(sumSquares / count);
}

// Calculate peak for a segment (iterative to avoid stack overflow)
function calculatePeak(samples, start, end) {
  let peak = 0;
  for (let i = start; i < end && i < samples.length; i++) {
    if (samples[i] > peak) peak = samples[i];
  }
  return peak;
}

// Analyze a single file
function analyzeFile(filePath) {
  const buffer = readFileSync(filePath);
  const wav = parseWav(buffer);
  const samples = toFloatSamples(wav.audioData, wav.bitsPerSample, wav.numChannels);

  const totalSamples = samples.length;
  const msInSamples = Math.floor(wav.sampleRate / 1000);

  // Analyze different regions
  const regions = {
    // First 50ms
    start50ms: { start: 0, end: 50 * msInSamples },
    // First 100ms
    start100ms: { start: 0, end: 100 * msInSamples },
    // First 200ms
    start200ms: { start: 0, end: 200 * msInSamples },
    // Middle section (1s from center)
    middle: {
      start: Math.floor(totalSamples / 2 - 500 * msInSamples),
      end: Math.floor(totalSamples / 2 + 500 * msInSamples)
    },
    // Last 200ms
    end200ms: { start: totalSamples - 200 * msInSamples, end: totalSamples },
    // Last 100ms
    end100ms: { start: totalSamples - 100 * msInSamples, end: totalSamples },
    // Last 50ms
    end50ms: { start: totalSamples - 50 * msInSamples, end: totalSamples },
    // Last 2 seconds (loop region)
    last2s: { start: totalSamples - 2 * wav.sampleRate, end: totalSamples },
    // 2s mark (where loop would start)
    at2s: {
      start: Math.floor(totalSamples - 2 * wav.sampleRate),
      end: Math.floor(totalSamples - 2 * wav.sampleRate + 100 * msInSamples)
    },
  };

  const analysis = {
    duration: wav.duration.toFixed(3),
    sampleRate: wav.sampleRate,
    channels: wav.numChannels,
    bitsPerSample: wav.bitsPerSample,
    totalSamples,
    regions: {}
  };

  for (const [name, { start, end }] of Object.entries(regions)) {
    analysis.regions[name] = {
      rms: calculateRMS(samples, start, end).toFixed(4),
      peak: calculatePeak(samples, start, end).toFixed(4),
      rmsDb: (20 * Math.log10(calculateRMS(samples, start, end) || 0.0001)).toFixed(1),
      peakDb: (20 * Math.log10(calculatePeak(samples, start, end) || 0.0001)).toFixed(1),
    };
  }

  // Detect fade-in (compare start vs middle)
  const startRMS = parseFloat(analysis.regions.start100ms.rms);
  const middleRMS = parseFloat(analysis.regions.middle.rms);
  const endRMS = parseFloat(analysis.regions.end100ms.rms);
  const at2sRMS = parseFloat(analysis.regions.at2s.rms);

  analysis.fadeInDetected = startRMS < middleRMS * 0.7;
  analysis.fadeOutDetected = endRMS < middleRMS * 0.7;
  analysis.loopPointConsistent = Math.abs(at2sRMS - endRMS) / middleRMS < 0.2;

  // Calculate crossfade compatibility
  analysis.crossfadeIssue = null;
  if (analysis.fadeInDetected) {
    analysis.crossfadeIssue = 'FADE-IN detected at start - will cause volume dip on loop';
  }
  if (analysis.fadeOutDetected) {
    analysis.crossfadeIssue = (analysis.crossfadeIssue || '') + ' FADE-OUT detected at end';
  }

  return analysis;
}

// Main
const audioDir = join(process.cwd(), 'public/audio/shop/lariancrusher');
const files = readdirSync(audioDir).filter(f => f.endsWith('.wav')).sort();

console.log('═══════════════════════════════════════════════════════════════');
console.log('                    AUDIO ANALYSIS REPORT');
console.log('═══════════════════════════════════════════════════════════════\n');

const results = {};

for (const file of files) {
  const filePath = join(audioDir, file);
  console.log(`\n▶ ${file}`);
  console.log('─'.repeat(60));

  try {
    const analysis = analyzeFile(filePath);
    results[file] = analysis;

    console.log(`  Duration: ${analysis.duration}s | ${analysis.sampleRate}Hz | ${analysis.channels}ch | ${analysis.bitsPerSample}bit`);
    console.log('');
    console.log('  Volume Analysis (RMS in dB):');
    console.log(`    Start 100ms:  ${analysis.regions.start100ms.rmsDb} dB`);
    console.log(`    Middle:       ${analysis.regions.middle.rmsDb} dB`);
    console.log(`    End 100ms:    ${analysis.regions.end100ms.rmsDb} dB`);
    console.log(`    At 2s mark:   ${analysis.regions.at2s.rmsDb} dB`);
    console.log('');
    console.log('  Fade Detection:');
    console.log(`    Fade-in:  ${analysis.fadeInDetected ? '⚠️  YES' : '✅ No'}`);
    console.log(`    Fade-out: ${analysis.fadeOutDetected ? '⚠️  YES' : '✅ No'}`);
    console.log(`    Loop point (2s) consistent with end: ${analysis.loopPointConsistent ? '✅ Yes' : '⚠️  No'}`);

    if (analysis.crossfadeIssue) {
      console.log(`\n  ⚠️  ISSUE: ${analysis.crossfadeIssue}`);
    }

  } catch (err) {
    console.log(`  ❌ Error: ${err.message}`);
  }
}

// Summary comparison
console.log('\n\n═══════════════════════════════════════════════════════════════');
console.log('                    COMPARISON SUMMARY');
console.log('═══════════════════════════════════════════════════════════════\n');

console.log('File                      | Start dB | Middle dB | End dB | Loop OK?');
console.log('─'.repeat(75));

for (const [file, analysis] of Object.entries(results)) {
  const name = file.padEnd(25);
  const start = analysis.regions.start100ms.rmsDb.padStart(8);
  const middle = analysis.regions.middle.rmsDb.padStart(9);
  const end = analysis.regions.end100ms.rmsDb.padStart(8);
  const loopOk = analysis.loopPointConsistent ? '  ✅' : '  ⚠️';
  console.log(`${name} |${start} |${middle} |${end} |${loopOk}`);
}

// Check consistency between normal and _norm files
console.log('\n\n═══════════════════════════════════════════════════════════════');
console.log('                    NORMALIZATION CHECK');
console.log('═══════════════════════════════════════════════════════════════\n');

const pairs = ['dry', 'medium', 'hard', 'very_hard', 'creative'];
for (const name of pairs) {
  const normal = results[`${name}.wav`];
  const norm = results[`${name}_norm.wav`];

  if (normal && norm) {
    const normalMiddle = parseFloat(normal.regions.middle.rmsDb);
    const normMiddle = parseFloat(norm.regions.middle.rmsDb);
    const diff = (normMiddle - normalMiddle).toFixed(1);

    console.log(`${name}:`);
    console.log(`  Normal: ${normalMiddle.toFixed(1)} dB | Normalized: ${normMiddle.toFixed(1)} dB | Diff: ${diff} dB`);
  }
}
