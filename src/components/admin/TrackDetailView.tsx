'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
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
import { FaSpotify, FaYoutube, FaSoundcloud, FaApple, FaMusic as FaDeezer } from 'react-icons/fa';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
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
        const data: Track = await response.json();
        if (!data) {
          throw new Error(`Données vides reçues pour le morceau (ID: ${trackId})`);
        }
        setTrack(data);
      } catch (err) {
        console.error('Error fetching track details:', err);
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
  const formattedCreatedAt = track.createdAt
    ? format(new Date(track.createdAt), 'd MMM yyyy HH:mm', { locale: fr })
    : 'Date inconnue';
  const genres = track.genre?.join(', ') || 'Aucun';

  return (
    <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-8">
      {/* Colonne Gauche: Image & Infos rapides */}
      <div className="md:col-span-1 flex flex-col items-center">
        {track.coverUrl ? (
          <Image
            src={track.coverUrl}
            alt={`Pochette de ${track.title}`}
            width={250} // Taille réduite pour la modale
            height={250}
            className="rounded-lg shadow-lg mb-6 aspect-square object-cover border-2 border-purple-500/30"
            priority
          />
        ) : (
          <div className="w-full h-[250px] bg-gray-800/50 rounded-lg flex items-center justify-center mb-6 border-2 border-purple-500/30">
            <Music className="w-16 h-16 text-gray-500" />
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

        <div className="space-y-3 text-gray-300 mb-6">
          <div className="flex items-center">
            <Calendar className="w-4 h-4 mr-3 text-purple-400 flex-shrink-0" />
            <span>Date de sortie: {formattedReleaseDate}</span>
          </div>
          <div className="flex items-center">
            <Tag className="w-4 h-4 mr-3 text-purple-400 flex-shrink-0" />
            <span>Genre(s): {genres}</span>
          </div>
          {track.description && (
            <div className="flex items-start">
              <Info className="w-4 h-4 mr-3 mt-1 text-purple-400 flex-shrink-0" />
              <p className="whitespace-pre-wrap text-sm">{track.description}</p>
            </div>
          )}
          <div className="flex items-center">
            {track.hasOwnProperty('isPublished') ? (
              track.isPublished ? (
                <CheckCircle className="w-4 h-4 mr-3 text-green-400 flex-shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 mr-3 text-red-400 flex-shrink-0" />
              )
            ) : null}
            <span className="text-sm">
              Statut:{' '}
              {track.hasOwnProperty('isPublished')
                ? track.isPublished
                  ? 'Publié'
                  : 'Non publié'
                : 'Inconnu'}
            </span>
          </div>
          {track.featured && (
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 mr-3 text-yellow-400 flex-shrink-0" />
              <span className="text-sm">Mis en avant</span>
            </div>
          )}
          {/* Afficher l'utilisateur si nécessaire (à adapter selon le type Track) */}
          {/* {track.user && (...) } */}
          <div className="flex items-center">
            <Clock className="w-4 h-4 mr-3 text-purple-400 flex-shrink-0" />
            <span className="text-sm">Ajouté le: {formattedCreatedAt}</span>
          </div>
        </div>

        {/* Plateformes */}
        <h2 className="text-xl font-semibold text-white mb-3">Plateformes</h2>
        {track.platforms &&
        typeof track.platforms === 'object' &&
        Object.keys(track.platforms).length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.entries(track.platforms)
              .filter(([_, platformData]) => platformData?.url) // Filtrer celles qui ont une URL
              .map(([platformKey, platformData]) => {
                const Icon = platformIcons[platformKey] || Music;
                return (
                  <a
                    key={platformKey}
                    href={platformData!.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-black/30 p-3 rounded-lg flex items-center justify-between hover:bg-black/50 transition-colors"
                  >
                    <div className="flex items-center">
                      <Icon className="w-5 h-5 mr-2" />
                      <span className="capitalize text-sm">{platformKey}</span>
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
  );
}
