'use client';

import { FileAudio, Info, Loader2, Pause, Play, Upload, X } from 'lucide-react';
import type { Dispatch, SetStateAction, RefObject, DragEvent, ChangeEvent } from 'react';
import { toast } from 'sonner';

import { type AudioAnalysisResult, formatDuration } from '@/lib/live/audio-analysis';
import { type LiveSubmission } from '@/types/live';

interface SubmissionDropZoneProps {
  activeSubmission: LiveSubmission | null;
  audioAnalysis: AudioAnalysisResult | null;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  currentTime: number;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleDelete: () => Promise<void>;
  handleDragLeave: (e: React.DragEvent) => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent) => void;
  handleFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handlePlayPause: () => Promise<void>;
  handleWaveformClick: (e: React.MouseEvent<HTMLDivElement>) => Promise<void>;
  isAnalyzing: boolean;
  isDragging: boolean;
  isPlaying: boolean;
  selectedFile: File | null;
  setShowInfoModal: React.Dispatch<React.SetStateAction<boolean>>;
}

export function SubmissionDropZone({
  activeSubmission,
  audioAnalysis,
  audioRef,
  currentTime,
  fileInputRef,
  handleDelete,
  handleDragLeave,
  handleDragOver,
  handleDrop,
  handleFileInputChange,
  handlePlayPause,
  handleWaveformClick,
  isAnalyzing,
  isDragging,
  isPlaying,
  selectedFile,
  setShowInfoModal,
}: SubmissionDropZoneProps) {
  return (
    <div className="relative">
      <div className="flex items-center gap-2 mb-2">
        <label className="block text-sm font-medium text-gray-300">Audio File</label>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShowInfoModal(true);
          }}
          className="text-purple-400 hover:text-purple-300 transition-colors"
        >
          <Info className="w-4 h-4" />
        </button>
      </div>
      <div
        onDragOver={!activeSubmission ? handleDragOver : undefined}
        onDragLeave={!activeSubmission ? handleDragLeave : undefined}
        onDrop={!activeSubmission ? handleDrop : undefined}
        onClick={() => {
          // Ne pas ouvrir le sélecteur si une track est déjà chargée ou soumise
          if (!audioAnalysis && !activeSubmission) {
            fileInputRef.current?.click();
          }
        }}
        className={`
      relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200
      ${audioAnalysis || activeSubmission ? 'cursor-default' : 'cursor-pointer'}
      ${isDragging && !activeSubmission ? 'border-purple-500 bg-purple-500/10' : 'border-gray-600 hover:border-purple-500/50 v2:border-white/15 v2:bg-white/[0.02] v2:hover:border-brand/50'}
      v2:rounded-2xl v2:border-[1.5px] v2:duration-300
      ${activeSubmission ? 'border-purple-500/50 bg-purple-500/5' : ''}
    `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".mp3,.wav,audio/mpeg,audio/wav"
          onChange={handleFileInputChange}
          className="hidden"
          disabled={!!activeSubmission}
        />

        {isAnalyzing ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
            <p className="text-white">Analyzing audio file...</p>
          </div>
        ) : audioAnalysis ? (
          <div className="w-full space-y-3" onClick={(e) => e.stopPropagation()}>
            {/* Waveform style Mofalk */}
            <div
              className={`w-full h-20 rounded-lg relative group overflow-hidden ${
                selectedFile ? 'cursor-pointer' : 'cursor-not-allowed opacity-75'
              }`}
              onClick={selectedFile ? handleWaveformClick : undefined}
              style={{ backgroundColor: 'rgba(30, 30, 35, 0.9)' }}
            >
              {/* Waveform bars - style Mofalk */}
              <div
                className="w-full h-full flex items-center"
                style={{ padding: '6px 4px', gap: '1px' }}
              >
                {audioAnalysis.waveform.map((value, index) => {
                  // Hauteur brute sans trop de normalisation
                  const normalizedHeight = Math.max(3, Math.min(98, value));
                  const progress = currentTime / audioAnalysis.duration;
                  const barPosition = index / audioAnalysis.waveform.length;
                  const isPlayed = barPosition <= progress;

                  return (
                    <div
                      key={index}
                      className="relative h-full flex items-center justify-center"
                      style={{ flex: '1 1 0%' }}
                    >
                      {/* Barre centrée verticalement */}
                      <div
                        style={{
                          width: '100%',
                          height: `${normalizedHeight}%`,
                          background: isPlayed ? '#a855f7' : 'rgba(140, 140, 145, 0.85)',
                          borderRadius: '1px',
                          transition: 'background-color 0.03s linear',
                        }}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Durée affichée en bas à droite */}
              <div
                className="absolute bottom-1.5 right-3 font-mono pointer-events-none select-none"
                style={{
                  fontSize: '11px',
                  letterSpacing: '0.5px',
                  color: 'rgba(180, 180, 185, 0.9)',
                  textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                }}
              >
                {formatDuration(audioAnalysis.duration)}
              </div>
            </div>

            {/* Contrôles */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3 overflow-hidden">
                <button
                  type="button"
                  onClick={handlePlayPause}
                  disabled={!selectedFile}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors flex-shrink-0 ${
                    selectedFile
                      ? 'bg-purple-500 hover:bg-purple-600 cursor-pointer'
                      : 'bg-gray-600 cursor-not-allowed opacity-50'
                  }`}
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5 text-white" />
                  ) : (
                    <Play className="w-5 h-5 text-white ml-0.5" />
                  )}
                </button>
                <div className="text-white overflow-hidden">
                  <p className="text-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis">
                    {selectedFile?.name || 'Fichier non disponible - Rechargez votre fichier'}
                  </p>
                  <p className="text-xs text-gray-400 text-left font-mono">
                    {formatDuration(currentTime)} / {formatDuration(audioAnalysis.duration)}
                  </p>
                </div>
              </div>
            </div>

            {/* Audio element caché */}
            <audio
              ref={audioRef}
              preload="metadata"
              onLoadedMetadata={() => {
                if (audioRef.current) {
                  // Audio metadata loaded successfully
                  // Duration available: audioRef.current.duration
                }
              }}
              onError={(e) => {
                console.error('Audio error:', e);
                toast.error('Erreur lors du chargement audio');
              }}
            />
          </div>
        ) : selectedFile ? (
          <div className="flex items-center justify-center gap-3">
            <FileAudio className="w-8 h-8 text-green-400" />
            <div className="flex-1 text-left">
              <p className="text-white font-medium">{selectedFile.name}</p>
              <p className="text-sm text-gray-400">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete();
              }}
              className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-red-400" />
            </button>
          </div>
        ) : (
          <>
            <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400 v2:h-6 v2:w-6 v2:box-content v2:rounded-full v2:bg-white/[0.04] v2:p-4 v2:text-white/70" />
            <p className="text-white mb-2 v2:font-medium">Choose a file or drag and drop</p>
            <p className="text-sm text-gray-400 v2:text-white/50">MP3/WAV (128MB)</p>
          </>
        )}
      </div>
    </div>
  );
}
