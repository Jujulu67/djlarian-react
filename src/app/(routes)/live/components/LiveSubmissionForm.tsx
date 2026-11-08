'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, LayoutDashboard } from 'lucide-react';
import { useState, useRef, useCallback, useEffect, useEffectEvent, useLayoutEffect } from 'react';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useLiveSubmissions } from '../hooks/useLiveSubmissions';

import { SubmissionActions } from './submission/SubmissionActions';
import { SubmissionDropZone } from './submission/SubmissionDropZone';
import { SubmissionInfoModal } from './submission/SubmissionInfoModal';
import {
  validateAudioFile,
  generateAudioFileId,
  uploadAudioFileToBlob,
} from '@/lib/live/upload-client';
import { analyzeAudioFile, type AudioAnalysisResult } from '@/lib/live/audio-analysis';
import { fetchWithAuth } from '@/lib/api/fetchWithAuth';
import type { LiveSubmission } from '@/types/live';
import { useUiVersion } from '@/hooks/useUiVersion';
import { logger } from '@/lib/logger';

/** Attend que l'élément audio puisse jouer (ou échoue au chargement). */
function waitForAudioReady(audio: HTMLAudioElement | null): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (!audio) {
      reject(new Error('Audio ref not available'));
      return;
    }
    const cleanup = () => {
      audio.removeEventListener('canplay', onCanPlay);
      audio.removeEventListener('error', onError);
    };
    const onCanPlay = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error('Erreur lors du chargement audio'));
    };
    audio.addEventListener('canplay', onCanPlay);
    audio.addEventListener('error', onError);
    // HAVE_FUTURE_DATA : déjà prêt
    if (audio.readyState >= 3) onCanPlay();
  });
}

const SUBMISSIONS_STATUS_REFRESH_MS = 60_000;

/** Supprime les clés de brouillon du sessionStorage (erreurs journalisées). */
function clearLiveFormSession(): void {
  try {
    sessionStorage.removeItem('liveSubmissionForm');
    sessionStorage.removeItem('liveSubmissionDraftId');
  } catch (error) {
    logger.error('Erreur lors du nettoyage de sessionStorage:', error);
  }
}

/** Message d'erreur affiché quand l'envoi d'un brouillon échoue. */
function getDraftSubmitErrorMessage(status: number, errorData: { error?: string }): string {
  if (status === 503) return 'Les soumissions sont indisponibles pour le moment';
  return errorData.error || 'Erreur lors de la soumission';
}

/** Lit l'analyse audio mise en cache dans sessionStorage (null si absente ou illisible). */
function readCachedAnalysis(): AudioAnalysisResult | null {
  try {
    const cached = sessionStorage.getItem('liveSubmissionAnalysis');
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    logger.warn("Erreur lors de la lecture de l'analyse en cache:", error);
    return null;
  }
}

/** Fichier provisoire (vide) portant le nom du brouillon, le temps du téléchargement. */
function buildPlaceholderAudioFile(fileName: string): File {
  return new File([new Blob([''], { type: 'audio/mpeg' })], fileName, {
    type: 'audio/mpeg',
    lastModified: Date.now(),
  });
}

/** Sauvegarde l'analyse audio dans sessionStorage (erreurs journalisées). */
function saveAnalysisCache(analysis: AudioAnalysisResult): void {
  try {
    sessionStorage.setItem('liveSubmissionAnalysis', JSON.stringify(analysis));
  } catch (error) {
    logger.warn("Impossible de sauvegarder l'analyse:", error);
  }
}

/** Branche l'URL blob sur l'élément audio au prochain tick. */
function attachAudioSource(audioRef: { current: HTMLAudioElement | null }, audioUrl: string): void {
  setTimeout(() => {
    if (audioRef.current) {
      // Nettoyer l'ancienne source si elle existe
      if (audioRef.current.src?.startsWith('blob:')) {
        audioRef.current.pause();
        URL.revokeObjectURL(audioRef.current.src);
      }
      audioRef.current.src = audioUrl;
      audioRef.current.load();
    }
  }, 0);
}

export function LiveSubmissionForm() {
  const { data: session } = useSession();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [isUploadingDraft, setIsUploadingDraft] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [audioAnalysis, setAudioAnalysis] = useState<AudioAnalysisResult | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [trackSubmissionsEnabled, setTrackSubmissionsEnabled] = useState(true);
  // En environnement de test/développement, on préfère par défaut le stockage local;
  // le fetch /api/live/storage-mode forcera à true si Blob doit être utilisé.
  const [useBlobStorage, setUseBlobStorage] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const {
    submitFile,
    isSubmitting,
    submissions,
    loadSubmissions,
    updateSubmission,
    deleteSubmission,
  } = useLiveSubmissions({ useBlobStorage });
  const [activeSubmission, setActiveSubmission] = useState<LiveSubmission | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const isAdmin = session?.user?.role === 'ADMIN';
  const isV2 = useUiVersion() !== 'legacy';

  // Charger le mode de stockage (Blob vs local) et l'état des soumissions
  useEffect(() => {
    // Charger le mode de stockage
    const loadStorageMode = async () => {
      try {
        const storageRes = await fetch('/api/live/storage-mode');
        if (storageRes.ok) {
          const data = await storageRes.json();
          setUseBlobStorage(!!data.useBlobStorage);
        } else {
          // En cas d'erreur, on reste sur la valeur par défaut (local en test)
          logger.warn('Impossible de charger le mode de stockage, utilisation valeur locale');
        }
      } catch (error) {
        logger.error('Erreur lors du chargement du mode de stockage:', error);
      }
    };

    void loadStorageMode();

    // Vérifier si les soumissions sont activées
    const checkTrackSubmissions = async () => {
      try {
        const response = await fetch('/api/live/submissions/status');
        if (response.ok) {
          const result = await response.json();
          setTrackSubmissionsEnabled(result.data?.trackSubmissions ?? true);
        } else {
          // En cas d'erreur, on considère que c'est activé par défaut
          setTrackSubmissionsEnabled(true);
        }
      } catch (error) {
        logger.error('Erreur lors de la vérification des soumissions:', error);
        // Par défaut, on considère que c'est activé
        setTrackSubmissionsEnabled(true);
      }
    };

    void checkTrackSubmissions();

    // Revérifier périodiquement et au retour sur l'onglet, mais jamais onglet masqué : chaque
    // appel interroge la base et consomme le quota gratuit de Vercel
    const refreshIfVisible = () => {
      if (document.visibilityState === 'visible') void checkTrackSubmissions();
    };
    const interval = setInterval(refreshIfVisible, SUBMISSIONS_STATUS_REFRESH_MS);
    document.addEventListener('visibilitychange', refreshIfVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', refreshIfVisible);
    };
  }, []);

  // Charger les soumissions existantes
  useEffect(() => {
    if (session?.user?.id) {
      loadSubmissions();
    }
  }, [session?.user?.id, loadSubmissions]);

  const hasAudioAnalysis = useEffectEvent(() => audioAnalysis !== null);

  // Vérifier si une soumission active existe
  useEffect(() => {
    if (submissions.length > 0) {
      const submission = submissions[0]; // Prendre la plus récente
      setActiveSubmission(submission);
      setTitle(submission.title);
      setDescription(submission.description || '');

      // Si on a une URL de fichier, on peut essayer de charger l'analyse
      // Note: On ne télécharge pas le fichier complet tout de suite pour économiser la bande passante
      // sauf si l'utilisateur veut jouer le son
      if (submission.fileUrl && !hasAudioAnalysis()) {
        // On pourrait charger l'analyse ici si on l'avait stockée côté serveur
        // Pour l'instant, on va simuler une analyse ou la charger à la demande
        // Option: Charger le fichier pour l'analyse
        fetch(submission.fileUrl)
          .then((res) => res.blob())
          .then((blob) => {
            const file = new File([blob], submission.fileName, { type: blob.type });
            setSelectedFile(file);

            // Préparer l'audio ref
            const audioUrl = URL.createObjectURL(file);
            if (audioRef.current) {
              audioRef.current.src = audioUrl;
            }
            return analyzeAudioFile(file);
          })
          .then((analysis) => setAudioAnalysis(analysis))
          .catch((err) => logger.error('Erreur chargement fichier soumis:', err));
      }
    } else {
      setActiveSubmission(null);
    }
  }, [submissions]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  // Uploader le fichier (Blob ou local selon le mode), puis créer/mettre à jour le draft
  const uploadDraft = useCallback(
    async (file: File, existingDraftId?: string | null) => {
      if (!session?.user?.id) {
        toast.error('Vous devez être connecté pour uploader un draft');
        return null;
      }

      // En mode local (pas de Blob), on ne crée pas de draft côté serveur pour éviter de
      // multiplier les fichiers; seul l'upload final passera par l'API serveur.
      if (!useBlobStorage) {
        return null;
      }

      try {
        setIsUploadingDraft(true);

        // Générer un ID unique pour le fichier
        const fileId = generateAudioFileId(session.user.id, file.name);

        // Upload directement vers Vercel Blob depuis le client
        const { url: fileUrl, size } = await uploadAudioFileToBlob(file, fileId);

        // Créer ou mettre à jour le draft avec l'URL du fichier
        const response = await fetchWithAuth('/api/live/submissions/draft', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fileUrl,
            fileName: file.name,
            fileSize: size,
            draftId: existingDraftId,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setDraftId(data.data.id);
          // Sauvegarder le draftId dans sessionStorage
          sessionStorage.setItem('liveSubmissionDraftId', data.data.id);
          return data.data.id;
        } else {
          const errorData = await response.json();
          toast.error(errorData.error || "Erreur lors de l'upload du draft");
          // Si l'API échoue, supprimer le fichier uploadé sur Blob
          try {
            // Note: On pourrait supprimer le fichier Blob ici, mais c'est optionnel
            // Le fichier sera nettoyé automatiquement plus tard si nécessaire
          } catch (cleanupError) {
            logger.warn('Erreur lors du nettoyage du fichier Blob:', cleanupError);
          }
          return null;
        }
      } catch (error) {
        logger.error('Erreur upload draft:', error);
        toast.error("Erreur de connexion lors de l'upload");
        return null;
      } finally {
        setIsUploadingDraft(false);
      }
    },
    [session?.user?.id, useBlobStorage]
  );

  const handleFileSelect = useCallback(
    async (file: File) => {
      const validation = validateAudioFile(file);
      if (!validation.valid) {
        toast.error(validation.error || 'Fichier invalide');
        return;
      }

      setSelectedFile(file);
      setIsAnalyzing(true);
      setAudioAnalysis(null);
      setCurrentTime(0);
      setIsPlaying(false);

      try {
        // Faire l'analyse audio en premier pour afficher le fichier rapidement
        const analysis = await analyzeAudioFile(file);

        // Afficher le fichier dès que l'analyse est prête (sans attendre l'upload)
        setAudioAnalysis(analysis);
        setIsAnalyzing(false); // Arrêter le loader dès que l'analyse est prête

        // Sauvegarder l'analyse dans sessionStorage pour éviter de la refaire après actualisation
        try {
          sessionStorage.setItem('liveSubmissionAnalysis', JSON.stringify(analysis));
        } catch (error) {
          logger.warn("Impossible de sauvegarder l'analyse dans sessionStorage:", error);
        }

        // Pré-remplir le titre avec le nom du fichier (sans extension)
        const fileNameWithoutExt = file.name.replace(/\.(mp3|wav)$/i, '');
        setTitle(fileNameWithoutExt);

        // Créer une URL pour l'audio et l'assigner
        const audioUrl = URL.createObjectURL(file);

        // Utiliser setTimeout pour s'assurer que l'audioRef est prêt
        setTimeout(() => {
          if (audioRef.current) {
            // Nettoyer l'ancienne URL si elle existe
            if (audioRef.current.src?.startsWith('blob:')) {
              URL.revokeObjectURL(audioRef.current.src);
            }
            audioRef.current.src = audioUrl;
            audioRef.current.load(); // Forcer le rechargement
          }
        }, 0);

        // Uploader le draft en arrière-plan (sans bloquer l'affichage)
        uploadDraft(file, draftId)
          .then((newDraftId) => {
            if (newDraftId) {
              setDraftId(newDraftId);
              sessionStorage.setItem('liveSubmissionDraftId', newDraftId);
            }
          })
          .catch((error) => {
            logger.warn('Upload draft échoué, continuation avec analyse locale:', error);
          });
      } catch (error) {
        toast.error("Erreur lors de l'analyse du fichier audio");
        logger.error('Erreur analyse audio:', error);
        setIsAnalyzing(false);
      }
    },
    [draftId, uploadDraft]
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  const submitEdit = useCallback(
    async (submissionId: string) => {
      if (!title.trim()) {
        toast.error('Veuillez entrer un titre');
        return;
      }

      const result = await updateSubmission(submissionId, {
        title: title.trim(),
        description: description.trim() || undefined,
      });

      if (result.success) {
        toast.success('Soumission mise à jour !');
        setIsEditing(false);
      } else {
        toast.error(result.error || 'Erreur lors de la mise à jour');
      }
    },
    [title, description, updateSubmission]
  );

  const submitDraft = useCallback(
    async (currentDraftId: string) => {
      const formData = new FormData();
      formData.append('draftId', currentDraftId);
      formData.append('title', title.trim());
      if (description.trim()) {
        formData.append('description', description.trim());
      }

      const response = await fetchWithAuth('/api/live/submissions', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        toast.error(getDraftSubmitErrorMessage(response.status, errorData));
        return;
      }

      toast.success('Soumission envoyée avec succès !');
      // Recharger les soumissions pour passer en mode "Submitted"
      await loadSubmissions();

      // Déclencher un événement pour recharger les chances immédiatement
      window.dispatchEvent(new CustomEvent('liveSubmissionSuccess'));

      // Nettoyer le formulaire
      setDraftId(null);
      // On garde title/desc/file pour l'affichage en mode "Submitted"

      clearLiveFormSession();
    },
    [title, description, loadSubmissions]
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (activeSubmission && isEditing) {
        // Mode édition : mise à jour
        await submitEdit(activeSubmission.id);
        return;
      }

      // Mode création
      if (!selectedFile && !draftId) {
        toast.error('Veuillez sélectionner un fichier audio');
        return;
      }

      if (!title.trim()) {
        toast.error('Veuillez entrer un titre');
        return;
      }

      try {
        // Si on a un draft, convertir le draft en soumission
        if (draftId) {
          await submitDraft(draftId);
          return;
        }

        // Comportement classique si pas de draft
        const result = await submitFile({
          file: selectedFile!,
          title: title.trim(),
          description: description.trim() || undefined,
        });

        if (!result.success) {
          toast.error(result.error || 'Erreur lors de la soumission');
          return;
        }

        toast.success('Soumission envoyée avec succès !');
        // Le hook a déjà rechargé les soumissions, donc l'effet va se déclencher

        // Déclencher un événement pour recharger les chances immédiatement
        window.dispatchEvent(new CustomEvent('liveSubmissionSuccess'));

        setDraftId(null);

        clearLiveFormSession();
      } catch (error) {
        logger.error('Erreur soumission:', error);
        toast.error('Erreur de connexion');
      }
    },
    [
      selectedFile,
      draftId,
      title,
      description,
      submitFile,
      activeSubmission,
      isEditing,
      submitEdit,
      submitDraft,
    ]
  );

  const handleDeleteSubmission = useCallback(async () => {
    if (!activeSubmission) return;

    if (confirm('Êtes-vous sûr de vouloir supprimer votre soumission ?')) {
      const result = await deleteSubmission(activeSubmission.id);
      if (result.success) {
        toast.success('Soumission supprimée');
        setActiveSubmission(null);
        setSelectedFile(null);
        setAudioAnalysis(null);
        setTitle('');
        setDescription('');
        setIsPlaying(false);
        setCurrentTime(0);
        if (audioRef.current) {
          audioRef.current.src = '';
        }
      } else {
        toast.error(result.error || 'Erreur lors de la suppression');
      }
    }
  }, [activeSubmission, deleteSubmission]);

  const handlePlayPause = useCallback(async () => {
    if (!audioRef.current) {
      logger.error('Audio ref not available');
      return;
    }

    if (!selectedFile) {
      toast.error('Aucun fichier sélectionné. Veuillez recharger votre fichier.');
      // Nettoyer audioAnalysis si le fichier n'est pas disponible
      setAudioAnalysis(null);
      return;
    }

    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        // S'assurer que la source est chargée
        if (!audioRef.current.src) {
          const audioUrl = URL.createObjectURL(selectedFile);
          audioRef.current.src = audioUrl;
          audioRef.current.load();

          // Attendre que l'audio soit prêt avant de jouer
          await waitForAudioReady(audioRef.current);
        }

        try {
          await audioRef.current.play();
          setIsPlaying(true);
        } catch (playError: unknown) {
          // Ignorer les erreurs d'interruption (AbortError)
          const error = playError as { name?: string };
          if (error.name !== 'AbortError' && error.name !== 'NotAllowedError') {
            logger.error('Erreur lecture audio:', playError);
            toast.error('Erreur lors de la lecture audio');
          }
          setIsPlaying(false);
        }
      }
    } catch (error) {
      logger.error('Erreur lecture audio:', error);
      setIsPlaying(false);
    }
  }, [isPlaying, selectedFile]);

  const handleWaveformClick = useCallback(
    async (e: React.MouseEvent<HTMLElement>) => {
      if (!audioRef.current || !audioAnalysis || !selectedFile) {
        if (!selectedFile) {
          toast.error('Aucun fichier sélectionné. Veuillez recharger votre fichier.');
          setAudioAnalysis(null);
        }
        return;
      }

      const waveformContainer = e.currentTarget;
      const rect = waveformContainer.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const percentage = Math.max(0, Math.min(1, clickX / rect.width));

      // Calculer la nouvelle position en secondes
      const newTime = percentage * audioAnalysis.duration;

      try {
        // S'assurer que la source est chargée
        if (!audioRef.current.src) {
          const audioUrl = URL.createObjectURL(selectedFile);
          audioRef.current.src = audioUrl;
          audioRef.current.load();

          // Attendre que l'audio soit prêt
          await waitForAudioReady(audioRef.current);
        }

        // Mettre à jour la position
        audioRef.current.currentTime = newTime;
        setCurrentTime(newTime);

        // Si on est en pause, lancer la lecture
        if (!isPlaying) {
          try {
            await audioRef.current.play();
            setIsPlaying(true);
          } catch (playError: unknown) {
            // Ignorer les erreurs d'interruption (AbortError)
            const error = playError as { name?: string };
            if (error.name !== 'AbortError' && error.name !== 'NotAllowedError') {
              logger.error('Erreur lecture audio:', playError);
              toast.error('Erreur lors de la lecture audio');
            }
          }
        }
      } catch (error) {
        logger.error('Erreur lors du clic sur la waveform:', error);
      }
    },
    [audioAnalysis, isPlaying, selectedFile]
  );

  const handleDelete = useCallback(async () => {
    // Supprimer le draft sur le serveur si il existe
    if (draftId) {
      try {
        await fetchWithAuth(`/api/live/submissions/draft?id=${draftId}`, {
          method: 'DELETE',
        });
      } catch (error) {
        logger.error('Erreur lors de la suppression du draft:', error);
      }
    }

    setSelectedFile(null);
    setDraftId(null);
    setAudioAnalysis(null);
    setTitle('');
    setDescription('');
    setIsPlaying(false);
    setCurrentTime(0);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      if (audioRef.current.src.startsWith('blob:')) {
        URL.revokeObjectURL(audioRef.current.src);
      }
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    // Nettoyer sessionStorage lors de la suppression
    try {
      sessionStorage.removeItem('liveSubmissionForm');
      sessionStorage.removeItem('liveSubmissionDraftId');
      sessionStorage.removeItem('liveSubmissionAnalysis');
    } catch (error) {
      logger.error('Erreur lors du nettoyage de sessionStorage:', error);
    }
  }, [draftId]);

  // Gérer les événements audio
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, [audioAnalysis]);

  const revokeAudioBlob = useEffectEvent(() => {
    if (audioRef.current?.src.startsWith('blob:')) {
      URL.revokeObjectURL(audioRef.current.src);
    }
  });

  // Nettoyer l'URL blob à la destruction. Effet de layout : au moment du nettoyage d'un
  // useEffect, React a déjà détaché la ref et l'URL ne serait jamais libérée.
  useLayoutEffect(() => () => revokeAudioBlob(), []);

  // Restaurer le draft depuis le serveur après actualisation
  useEffect(() => {
    const restoreDraft = async () => {
      try {
        // Récupérer le draftId depuis sessionStorage
        const savedDraftId = sessionStorage.getItem('liveSubmissionDraftId');
        if (!savedDraftId) return;

        // Vérifier d'abord si l'analyse est en cache pour restaurer immédiatement
        let cachedAnalysis = readCachedAnalysis();

        // Récupérer le draft depuis le serveur
        const response = await fetchWithAuth('/api/live/submissions/draft');
        if (!response.ok) return;
        const data = await response.json();
        const draft = data.data;
        if (draft?.id !== savedDraftId) return;

        setDraftId(draft.id);
        setTitle(draft.title || '');
        setDescription(draft.description || '');

        // Si l'analyse est en cache et correspond, l'afficher immédiatement
        if (cachedAnalysis && cachedAnalysis.fileName === draft.fileName) {
          setAudioAnalysis(cachedAnalysis);
          // Créer un fichier temporaire avec juste le nom pour éviter le flash de la zone de drop
          // Le vrai fichier sera remplacé une fois téléchargé
          setSelectedFile(buildPlaceholderAudioFile(draft.fileName));
          // Ne pas afficher le loader si l'analyse est en cache
        } else {
          cachedAnalysis = null; // L'analyse ne correspond pas, on la refait
          setIsAnalyzing(true);
        }

        // Télécharger le fichier en arrière-plan
        try {
          const fileResponse = await fetch(draft.fileUrl);
          if (fileResponse.ok) {
            const blob = await fileResponse.blob();
            const file = new File([blob], draft.fileName, { type: blob.type || 'audio/mpeg' });
            setSelectedFile(file); // Remplacer le fichier temporaire par le vrai fichier

            if (cachedAnalysis) {
              // L'analyse était en cache, on peut arrêter le loader
              setIsAnalyzing(false);
            } else {
              // Analyser le fichier (c'est la partie la plus lente)
              const analysis = await analyzeAudioFile(file);
              setAudioAnalysis(analysis);
              setIsAnalyzing(false);
              // Sauvegarder l'analyse pour la prochaine fois
              saveAnalysisCache(analysis);
            }

            // Créer une URL pour l'audio
            attachAudioSource(audioRef, URL.createObjectURL(file));
          }
        } catch (error) {
          logger.error('Erreur lors du téléchargement du fichier:', error);
          toast.error('Erreur lors de la restauration du fichier');
          setIsAnalyzing(false);
        }
      } catch (error) {
        logger.error('Erreur lors de la restauration du draft:', error);
        setIsAnalyzing(false);
      }
    };

    void restoreDraft();
  }, []); // Exécuter une seule fois au montage

  // Sauvegarder les données dans sessionStorage
  useEffect(() => {
    try {
      const dataToSave = {
        audioAnalysis,
        title,
        description,
        currentTime,
      };
      if (audioAnalysis || title || description) {
        sessionStorage.setItem('liveSubmissionForm', JSON.stringify(dataToSave));
      }
    } catch (error) {
      logger.error('Erreur lors de la sauvegarde dans sessionStorage:', error);
    }
  }, [audioAnalysis, title, description, currentTime]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className={
        isV2
          ? 'surface-1 flex h-full flex-col rounded-2xl p-5 sm:p-6'
          : 'glass-modern glass-modern-hover rounded-2xl p-4 sm:p-6 lg:p-5 h-full flex flex-col'
      }
    >
      {!trackSubmissionsEnabled ? (
        <div className="flex-1 flex items-center justify-center">
          <div
            className={
              isV2
                ? 'w-full max-w-md px-6 py-10 text-center'
                : 'glass-modern rounded-xl p-8 sm:p-12 text-center max-w-md w-full border border-red-500/30'
            }
          >
            <div className="mb-4 v2:mx-auto v2:mb-5 v2:flex v2:h-14 v2:w-14 v2:items-center v2:justify-center v2:rounded-full v2:bg-white/[0.04]">
              <X className="w-16 h-16 mx-auto text-red-400 v2:h-6 v2:w-6 v2:text-white/70" />
            </div>
            <h3 className="text-xl sm:text-2xl font-audiowide text-white mb-3 v2:mb-2 v2:font-sans v2:text-lg v2:font-semibold">
              Soumissions indisponibles
            </h3>
            <p className="text-gray-300 text-sm sm:text-base v2:text-sm v2:text-white/60">
              Les soumissions sont temporairement indisponibles pour le moment.
            </p>
            <p className="text-gray-400 text-xs sm:text-sm mt-2 v2:text-white/45">
              Veuillez réessayer plus tard.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg sm:text-xl lg:text-lg font-audiowide text-white v2:font-sans v2:text-base v2:font-semibold">
              SUBMISSION
            </h2>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {isAdmin && (
                <Link
                  href="/admin/live"
                  className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors v2:rounded-xl v2:bg-white/[0.04] v2:text-white/80 v2:ring-1 v2:ring-inset v2:ring-white/10 v2:hover:bg-white/[0.08] v2:hover:text-white"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </Link>
              )}
              <button
                disabled
                className="bg-gray-700/50 text-gray-400 py-2 px-4 rounded-lg font-medium cursor-not-allowed text-sm flex items-center gap-2 v2:rounded-xl v2:bg-white/[0.02] v2:text-white/35 v2:ring-1 v2:ring-inset v2:ring-white/[0.06]"
              >
                <Download className="w-4 h-4" />
                Download Sample
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 flex-1 flex flex-col">
            {/* Zone de drag & drop */}
            <SubmissionDropZone
              activeSubmission={activeSubmission}
              audioAnalysis={audioAnalysis}
              audioRef={audioRef}
              currentTime={currentTime}
              fileInputRef={fileInputRef}
              handleDelete={handleDelete}
              handleDragLeave={handleDragLeave}
              handleDragOver={handleDragOver}
              handleDrop={handleDrop}
              handleFileInputChange={handleFileInputChange}
              handlePlayPause={handlePlayPause}
              handleWaveformClick={handleWaveformClick}
              isAnalyzing={isAnalyzing}
              isDragging={isDragging}
              isPlaying={isPlaying}
              selectedFile={selectedFile}
              setShowInfoModal={setShowInfoModal}
            />

            {/* Inputs - Désactivés si soumis et pas en mode édition */}
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="livesubmissionform-title"
                  className="block text-sm font-medium text-gray-300 mb-1 v2:mb-2 v2:text-white/80"
                >
                  Title
                </label>
                <input
                  id="livesubmissionform-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Track Title"
                  disabled={!!(activeSubmission && !isEditing)}
                  className={`w-full bg-gray-800/50 border rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all v2:rounded-xl v2:bg-white/[0.03] v2:py-3 v2:placeholder-white/30 v2:focus:border-brand/70 v2:focus:ring-4 v2:focus:ring-brand/15 ${
                    activeSubmission && !isEditing
                      ? 'border-transparent cursor-default'
                      : 'border-gray-600 v2:border-white/10'
                  }`}
                />
              </div>

              <div>
                <label
                  htmlFor="livesubmissionform-description"
                  className="block text-sm font-medium text-gray-300 mb-1 v2:mb-2 v2:text-white/80"
                >
                  Description <span className="text-gray-500 text-xs">(Optional)</span>
                </label>
                <textarea
                  id="livesubmissionform-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell us about your track..."
                  rows={3}
                  disabled={!!(activeSubmission && !isEditing)}
                  className={`w-full bg-gray-800/50 border rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all resize-none v2:rounded-xl v2:bg-white/[0.03] v2:py-3 v2:placeholder-white/30 v2:focus:border-brand/70 v2:focus:ring-4 v2:focus:ring-brand/15 ${
                    activeSubmission && !isEditing
                      ? 'border-transparent cursor-default'
                      : 'border-gray-600 v2:border-white/10'
                  }`}
                />
              </div>
            </div>

            {/* Actions */}
            <SubmissionActions
              activeSubmission={activeSubmission}
              description={description}
              draftId={draftId}
              handleDelete={handleDelete}
              handleDeleteSubmission={handleDeleteSubmission}
              isEditing={isEditing}
              isSubmitting={isSubmitting}
              isUploadingDraft={isUploadingDraft}
              selectedFile={selectedFile}
              setDescription={setDescription}
              setIsEditing={setIsEditing}
              setTitle={setTitle}
              title={title}
            />
          </form>
        </>
      )}

      {/* Modal d'information */}
      <AnimatePresence>
        {showInfoModal && <SubmissionInfoModal setShowInfoModal={setShowInfoModal} />}
      </AnimatePresence>
    </motion.div>
  );
}
