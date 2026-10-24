'use client';

import { Edit, PlusCircle, RefreshCw, Save, Star, X } from 'lucide-react';
import type { ChangeEvent, FormEvent } from 'react';

import { PublicationStatusSelector } from '@/components/admin/PublicationStatusSelector';
import { Button } from '@/components/ui';
import { DateTimeField } from '@/components/ui/DateTimeField';
import ImageDropzone from '@/components/ui/ImageDropzone';
import { MUSIC_TYPES } from '@/lib/utils/music-helpers';
import type { MusicPlatform, MusicType } from '@/lib/utils/types';

import { platformIcons, platformLabels } from '../constants';
import type { useImageUpload } from '../hooks/useImageUpload';
import type { useTrackForm } from '../hooks/useTrackForm';

interface TrackFormPanelProps {
  trackForm: ReturnType<typeof useTrackForm>;
  imageUpload: ReturnType<typeof useImageUpload>;
  handleSubmit: (e: FormEvent) => Promise<void>;
  handleAddGenre: () => void;
  handleRemoveGenre: (g: string) => void;
  handlePlatformChange: (p: MusicPlatform, url: string) => void;
  handleImageUpload: (e: ChangeEvent<HTMLInputElement>) => void;
  handleReCrop: () => Promise<void>;
  handleFileSelected: (file: File) => void;
  resetForm: () => void;
}

/** Formulaire d'ajout / modification d'une track (colonne de gauche de l'onglet Morceaux). */
export function TrackFormPanel({
  trackForm,
  imageUpload,
  handleSubmit,
  handleAddGenre,
  handleRemoveGenre,
  handlePlatformChange,
  handleImageUpload,
  handleReCrop,
  handleFileSelected,
  resetForm,
}: TrackFormPanelProps) {
  return (
    <div>
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700/50 p-6">
        <h2 className="text-xl font-bold mb-6 text-white flex items-center gap-2">
          {trackForm.isEditing ? (
            <>
              <Edit className="w-5 h-5" /> Modifier
            </>
          ) : (
            <>
              <PlusCircle className="w-5 h-5" /> Ajouter
            </>
          )}
        </h2>

        <form onSubmit={handleSubmit}>
          {/* titre */}
          <div className="mb-4">
            <label className="block text-gray-300 font-medium mb-2">
              Titre <span className="text-red-500">*</span>
            </label>
            <input
              value={trackForm.currentForm.title}
              onChange={(e) =>
                trackForm.setCurrentForm({
                  ...trackForm.currentForm,
                  title: e.target.value,
                })
              }
              className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white focus:ring-purple-500"
              required
            />
          </div>

          {/* artiste */}
          <div className="mb-4">
            <label className="block text-gray-300 font-medium mb-2">
              Artiste(s) <span className="text-red-500">*</span>
            </label>
            <input
              value={trackForm.currentForm.artist}
              onChange={(e) =>
                trackForm.setCurrentForm({
                  ...trackForm.currentForm,
                  artist: e.target.value,
                })
              }
              className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white focus:ring-purple-500"
              required
            />
          </div>

          {/* type + date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-300 font-medium mb-2">
                Type <span className="text-red-500">*</span>
              </label>
              <select
                value={trackForm.currentForm.type}
                onChange={(e) =>
                  trackForm.setCurrentForm({
                    ...trackForm.currentForm,
                    type: e.target.value as MusicType,
                  })
                }
                className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white focus:ring-purple-500"
              >
                {MUSIC_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-gray-300 font-medium mb-2">
                Date <span className="text-red-500">*</span>
              </label>
              <DateTimeField
                type="date"
                value={trackForm.currentForm.releaseDate}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  trackForm.setCurrentForm({
                    ...trackForm.currentForm,
                    releaseDate: e.target.value,
                  })
                }
                required
                className="w-full"
              />
            </div>
          </div>

          {/* genres */}
          <div className="mt-4">
            <label className="block text-gray-300 font-medium mb-2">Genres</label>
            <div className="flex gap-2 mb-2">
              <input
                value={trackForm.genreInput}
                onChange={(e) => trackForm.setGenreInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddGenre();
                  }
                }}
                className="flex-1 bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white focus:ring-purple-500"
                placeholder="Ajouter un genre"
              />
              <button
                type="button"
                onClick={handleAddGenre}
                className="px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
              >
                +
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {(trackForm.currentForm.genre || []).map((g) => (
                <span
                  key={g}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-600/30 text-purple-200"
                >
                  {g}
                  <button onClick={() => handleRemoveGenre(g)}>
                    <X className="w-3 h-3 ml-1" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* BPM + Clé musicale + featured */}
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div>
              <label className="block text-gray-300 font-medium mb-2">BPM</label>
              <input
                type="number"
                value={trackForm.currentForm.bpm || ''}
                onChange={(e) =>
                  trackForm.setCurrentForm({
                    ...trackForm.currentForm,
                    bpm: parseInt(e.target.value) || undefined,
                  })
                }
                className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white focus:ring-purple-500"
                placeholder="128"
              />
            </div>
            <div>
              <label className="block text-gray-300 font-medium mb-2">Clé musicale</label>
              <input
                type="text"
                value={trackForm.currentForm.musicalKey || ''}
                onChange={(e) =>
                  trackForm.setCurrentForm({
                    ...trackForm.currentForm,
                    musicalKey: e.target.value || undefined,
                  })
                }
                className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white focus:ring-purple-500"
                placeholder="Ex : C# min"
              />
            </div>
            <div>
              <label className="block text-gray-300 font-medium mb-2">Mise en avant</label>
              <button
                type="button"
                onClick={() =>
                  trackForm.setCurrentForm({
                    ...trackForm.currentForm,
                    featured: !trackForm.currentForm.featured,
                  })
                }
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg ${
                  trackForm.currentForm.featured ? 'bg-yellow-600/80' : 'bg-gray-700'
                }`}
              >
                <Star className="w-5 h-5" /> {trackForm.currentForm.featured ? 'Oui' : 'Non'}
              </button>
            </div>
          </div>

          {/* image */}
          <div className="mt-4">
            <ImageDropzone
              label="Pochette (carrée)"
              imageUrl={trackForm.coverPreview}
              onDrop={handleImageUpload}
              onRecrop={handleReCrop}
              onRemove={() => {
                imageUpload.setOriginalImageFile(null);
                imageUpload.setCroppedImageBlob(null);
                trackForm.setCoverPreview('');
                trackForm.setCurrentForm({
                  ...trackForm.currentForm,
                  imageId: null,
                });
                imageUpload.setCachedOriginalFile(null);
              }}
              onFileSelected={handleFileSelected}
              canRecrop={
                !!imageUpload.originalImageFile ||
                !!imageUpload.cachedOriginalFile ||
                !!trackForm.currentForm.imageId
              }
            />
          </div>

          {/* description */}
          <div className="mt-4">
            <label className="block text-gray-300 font-medium mb-2">Description</label>
            <textarea
              value={trackForm.currentForm.description || ''}
              onChange={(e) =>
                trackForm.setCurrentForm({
                  ...trackForm.currentForm,
                  description: e.target.value,
                })
              }
              className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white focus:ring-purple-500 resize-none h-20"
            />
          </div>

          {/* plateformes */}
          <div className="mt-4">
            <h3 className="text-white font-medium mb-3">Plateformes</h3>
            <div className="space-y-3">
              {(Object.keys(platformLabels) as MusicPlatform[]).map((p) => (
                <div key={p} className="flex items-center gap-2">
                  <span className="w-8 flex justify-center">{platformIcons[p]}</span>
                  <input
                    type="url"
                    value={trackForm.currentForm.platforms[p]?.url || ''}
                    onChange={(e) => handlePlatformChange(p, e.target.value)}
                    className="flex-1 bg-gray-700/80 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-purple-500 text-sm"
                    placeholder={`URL ${platformLabels[p]}`}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* publication status */}
          <div className="mt-4">
            <PublicationStatusSelector
              isPublished={trackForm.currentForm.isPublished}
              publishAt={trackForm.currentForm.publishAt}
              onChange={(status: 'published' | 'draft' | 'scheduled', date?: string) => {
                if (status === 'published') {
                  trackForm.setCurrentForm({
                    ...trackForm.currentForm,
                    isPublished: true,
                    publishAt: undefined,
                  });
                } else if (status === 'draft') {
                  trackForm.setCurrentForm({
                    ...trackForm.currentForm,
                    isPublished: false,
                    publishAt: undefined,
                  });
                } else if (status === 'scheduled' && date) {
                  trackForm.setCurrentForm({
                    ...trackForm.currentForm,
                    isPublished: false,
                    publishAt: date,
                  });
                }
              }}
            />
          </div>

          {/* boutons */}
          <div className="flex gap-3 mt-6">
            <Button
              type="submit"
              className="flex-1 flex items-center gap-2"
              disabled={trackForm.isSubmitting}
            >
              {trackForm.isSubmitting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {trackForm.isEditing ? 'Mettre à jour' : 'Ajouter'}
            </Button>
            {trackForm.isEditing && (
              <Button
                type="button"
                variant="outline"
                onClick={resetForm}
                className="flex items-center gap-2"
              >
                <X className="w-4 h-4" /> Annuler
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
