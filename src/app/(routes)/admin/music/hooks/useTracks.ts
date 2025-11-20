import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';
import type { Track, MusicPlatform } from '@/lib/utils/types';
import { logger } from '@/lib/logger';

export function useTracks() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredTracks, setFilteredTracks] = useState<Track[]>([]);
  const [refreshingCoverId, setRefreshingCoverId] = useState<string | null>(null);
  const [highlightedTrackId, setHighlightedTrackId] = useState<string | null>(null);
  const fetchCountRef = useRef(0);

  // Auth check
  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated') return router.push('/login');
    if (session?.user?.role !== 'ADMIN') return router.push('/');
  }, [status, session, router]);

  // Fetch tracks
  const fetchTracks = async () => {
    setIsLoading(true);
    try {
      fetchCountRef.current += 1;
      const res = await fetch('/api/music');
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setTracks(data);
    } catch (err) {
      logger.error('Erreur:', err instanceof Error ? err.message : String(err));
      toast.error('Erreur de chargement');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (status !== 'authenticated') return;
    fetchTracks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // Filter tracks
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredTracks(tracks);
    } else {
      const term = searchTerm.toLowerCase();
      setFilteredTracks(
        tracks.filter(
          (track) =>
            track.title.toLowerCase().includes(term) ||
            track.artist.toLowerCase().includes(term) ||
            track.genre.some((g) => g.toLowerCase().includes(term)) ||
            track.type.includes(term)
        )
      );
    }
  }, [searchTerm, tracks]);

  // Handle edit from URL - returns the track ID to edit if found
  const getEditIdFromUrl = (): string | null => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    return params.get('edit');
  };

  useEffect(() => {
    const editId = getEditIdFromUrl();
    if (editId && tracks.some((t) => t.id === editId)) {
      setHighlightedTrackId(editId);
    }
  }, [tracks]);

  const refreshCover = async (id: string) => {
    setRefreshingCoverId(id);
    try {
      const res = await fetch(`/api/music/${id}/refresh-cover`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur API');
      // Mettre à jour localement
      setTracks((arr) =>
        arr.map((track) =>
          track.id === id
            ? {
                ...track,
                imageId: data.imageId,
                updatedAt: new Date().toISOString(),
              }
            : track
        )
      );
      toast.success('Cover rafraîchie !');
    } catch (err) {
      logger.error('Erreur:', err instanceof Error ? err.message : String(err));
      toast.error((err as Error).message || 'Erreur lors du refresh cover');
    } finally {
      setRefreshingCoverId(null);
    }
  };

  const deleteTrack = async (id: string) => {
    if (!window.confirm('Supprimer ?')) return;
    try {
      const res = await fetch(`/api/music/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
      await fetchTracks();
      toast.success('Supprimé');
    } catch (err) {
      logger.error('Erreur:', err instanceof Error ? err.message : String(err));
      toast.error('Erreur suppression');
    }
  };

  const toggleFeatured = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/music/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, featured: !currentStatus }),
      });
      if (!res.ok) throw new Error('Failed');
      setTracks((arr) => arr.map((t) => (t.id === id ? { ...t, featured: !currentStatus } : t)));
      toast.success('Statut mis à jour');
    } catch (err) {
      logger.error('Erreur:', err instanceof Error ? err.message : String(err));
      toast.error('Erreur mise à jour');
    }
  };

  const togglePublish = async (id: string, currentStatus: boolean | undefined) => {
    try {
      const res = await fetch(`/api/music/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublished: !currentStatus, publishAt: undefined }),
      });
      if (!res.ok) throw new Error('Failed');
      setTracks((arr) =>
        arr.map((t) =>
          t.id === id ? { ...t, isPublished: !currentStatus, publishAt: undefined } : t
        )
      );
      toast.success('Statut de publication mis à jour');
    } catch (err) {
      logger.error('Erreur:', err instanceof Error ? err.message : String(err));
      toast.error('Erreur publication');
    }
  };

  return {
    tracks,
    setTracks,
    filteredTracks,
    isLoading,
    searchTerm,
    setSearchTerm,
    refreshingCoverId,
    highlightedTrackId,
    setHighlightedTrackId,
    fetchTracks,
    refreshCover,
    deleteTrack,
    toggleFeatured,
    togglePublish,
    getEditIdFromUrl,
  };
}
