'use client';

import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  ArrowLeft,
  Calendar,
  Music,
  Tag,
  User,
  Info,
  ExternalLink,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import React, { useState, useEffect } from 'react';
import { FaSpotify, FaYoutube, FaSoundcloud, FaApple, FaMusic as FaDeezer } from 'react-icons/fa';

import { logger } from '@/lib/logger';
import { getImageUrl } from '@/lib/utils/getImageUrl';
import { Track } from '@/lib/utils/types'; // Utiliser le type Track existant

// Mapping icônes plateformes
const platformIcons: Record<string, React.ElementType> = {
  spotify: FaSpotify,
  youtube: FaYoutube,
  soundcloud: FaSoundcloud,
  apple: FaApple,
  deezer: FaDeezer,
};

interface TrackDetailViewProps {
  trackId: string;
  onClose?: () => void; // Optionnel pour fermer depuis l'intérieur
}

export default function TrackDetailView({ trackId, onClose }: TrackDetailViewProps) {
  const [track, setTrack] = useState<Track | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTrackDetails = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/music/${trackId}`);
        if (!response.ok) {
          throw new Error(`Morceau introuvable ou erreur serveur (ID: ${trackId})`);
        }
        const result = await response.json();
        // La réponse API utilise createSuccessResponse qui retourne { data: Track }
        const data: Track = result.data;
        if (!data) {
          throw new Error(`Données vides reçues pour le morceau (ID: ${trackId})`);
        }
        setTrack(data);
      } catch (err) {
        logger.error('Error fetching track details:', err);
        setError(err instanceof Error ? err.message : 'Erreur inconnue');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTrackDetails();
  }, [trackId]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <RefreshCw className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <h1 className="text-xl font-bold text-red-500 mb-4">Erreur</h1>
        <p className="text-gray-400 mb-4">{error}</p>
        {onClose && (
          <button onClick={onClose} className="text-purple-400 hover:text-purple-300">
            Fermer
          </button>
        )}
      </div>
    );
  }

  if (!track) {
    return <div className="text-center p-8 text-gray-400">Données du morceau indisponibles.</div>;
  }

  // Formater les données pour l'affichage
  const formattedReleaseDate = track.releaseDate
    ? format(new Date(track.releaseDate), 'd MMMM yyyy', { locale: fr })
    : 'N/A';
  const genres = track.genre?.join(', ') || 'Aucun';

  // Log debug pour publishAt et isPublished
  logger.debug('[DETAIL][TRACK] isPublished:', track.isPublished, 'publishAt:', track.publishAt);

  // Fonction utilitaire DRY pour l'état d'un morceau
  const getTrackStatus = (track: Track) => {
    const now = new Date();
    if (track.isPublished && (!track.publishAt || new Date(track.publishAt) <= now)) {
      return {
        label: 'Publié',
        icon: <CheckCircle className="w-4 h-4 mr-3 text-green-400 flex-shrink-0" />,
      };
    }
    if (track.publishAt && new Date(track.publishAt) > now) {
      return {
        label: `À publier le ${format(new Date(track.publishAt), 'd MMM yyyy HH:mm', { locale: fr })}`,
        icon: <Clock className="w-4 h-4 mr-3 text-blue-400 flex-shrink-0" />,
      };
    }
    return {
      label: 'Brouillon',
      icon: <XCircle className="w-4 h-4 mr-3 text-yellow-400 flex-shrink-0" />,
    };
  };

  return (
    <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-8">
      {/* Colonne Gauche: Image & Infos rapides */}
      <div className="md:col-span-1 flex flex-col items-center">
        {track.imageId ? (
          <Image
            src={
              getImageUrl(track.imageId, {
                cacheBust: track.updatedAt ? new Date(track.updatedAt).getTime() : Date.now(),
              }) || ''
            }
            alt={`Pochette de ${track.title}`}
            width={300}
            height={300}
            className="rounded-lg shadow-lg mb-6 aspect-square object-cover border-2 border-purple-500/30"
            priority
            unoptimized
          />
        ) : (
          <div className="w-[300px] h-[300px] bg-gray-800/50 rounded-lg flex items-center justify-center mb-6 border-2 border-purple-500/30">
            <Music className="w-20 h-20 text-gray-500" />
          </div>
        )}
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-300">Artiste: {track.artist}</p>
          <p className="text-sm text-gray-400">
            Type: <span className="capitalize">{track.type}</span>
          </p>
          {track.bpm && <p className="text-sm text-gray-400">BPM: {track.bpm}</p>}
        </div>
      </div>

      {/* Colonne Droite: Détails & Plateformes */}
      <div className="md:col-span-2">
        <h1 className="text-3xl font-audiowide text-white mb-2">
          <span className="text-gradient">{track.title}</span>
        </h1>
        <div className="bg-purple-500/30 h-0.5 w-16 rounded-full mb-6"></div>

        <div className="space-y-4 text-gray-300 mb-8">
          <div className="flex items-center">
            <Calendar className="w-4 h-4 mr-3 text-purple-400 flex-shrink-0" />
            <span>
              <span className="font-semibold text-gray-200">Date de sortie:</span>{' '}
              <span className="text-gray-400">{formattedReleaseDate}</span>
            </span>
          </div>
          <div className="flex items-center">
            <Tag className="w-4 h-4 mr-3 text-purple-400 flex-shrink-0" />
            <span>
              <span className="font-semibold text-gray-200">Genre(s):</span>{' '}
              <span className="text-gray-400">{genres}</span>
            </span>
          </div>
          {track.description && (
            <div className="flex items-start">
              <Info className="w-4 h-4 mr-3 mt-1 text-purple-400 flex-shrink-0" />
              <p className="whitespace-pre-wrap text-sm text-gray-300">{track.description}</p>
            </div>
          )}
          <div className="flex items-center">
            {getTrackStatus(track).icon}
            <span className="text-sm">
              <span className="font-semibold text-gray-200">Statut:</span>{' '}
              <span className="text-gray-400">{getTrackStatus(track).label}</span>
            </span>
          </div>
          {track.featured && (
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 mr-3 text-yellow-400 flex-shrink-0" />
              <span className="text-sm font-semibold text-gray-200">Mis en avant</span>
            </div>
          )}
          <div className="flex items-center">
            <Clock className="w-4 h-4 mr-3 text-purple-400 flex-shrink-0" />
            <span className="text-sm">
              <span className="font-semibold text-gray-200">Ajouté le:</span>{' '}
              <span className="text-gray-400">
                {track.createdAt
                  ? format(new Date(track.createdAt), 'd MMM yyyy HH:mm', { locale: fr })
                  : 'Date inconnue'}
              </span>
            </span>
          </div>
        </div>

        {/* Plateformes Groupbox */}
        <div className="mt-8 p-4 border border-purple-500/30 rounded-lg bg-black/20 relative">
          <h2 className="text-xl font-semibold text-white mb-4">Plateformes</h2>

          {track.platforms &&
          typeof track.platforms === 'object' &&
          Object.keys(track.platforms).length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.entries(track.platforms)
                .filter(([_, platformData]) => platformData?.url)
                .map(([platformKey, platformData]) => {
                  const Icon = platformIcons[platformKey] || Music;
                  return (
                    <a
                      key={platformKey}
                      href={platformData!.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-black/30 p-3 rounded-lg flex items-center justify-between border border-transparent hover:border-purple-500/50 hover:bg-black/40 transition-all duration-200"
                    >
                      <div className="flex items-center">
                        <Icon className="w-5 h-5 mr-2" />
                        <span className="capitalize text-sm text-gray-200">{platformKey}</span>
                      </div>
                      <ExternalLink className="w-4 h-4 text-gray-400" />
                    </a>
                  );
                })}
            </div>
          ) : (
            <p className="text-gray-500 italic text-sm">Aucune plateforme liée.</p>
          )}
        </div>
      </div>
    </div>
  );
}
