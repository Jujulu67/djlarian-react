'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  FileAudio,
  X,
  Loader2,
  Send,
  Info,
  Download,
  Play,
  Pause,
  Trash2,
  LayoutDashboard,
  Edit,
  Save,
  Lock,
  Unlock,
} from 'lucide-react';
import { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useLiveSubmissions } from '../hooks/useLiveSubmissions';
import {
  validateAudioFile,
  generateAudioFileId,
  uploadAudioFileToBlob,
} from '@/lib/live/upload-client';
import {
  analyzeAudioFile,
  formatDuration,
  type AudioAnalysisResult,
} from '@/lib/live/audio-analysis';
import { fetchWithAuth } from '@/lib/api/fetchWithAuth';

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const {
    submitFile,
    isSubmitting,
    submissions,
    loadSubmissions,
    updateSubmission,
    deleteSubmission,
  } = useLiveSubmissions();
  const [activeSubmission, setActiveSubmission] = useState<any | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const isAdmin = session?.user?.role === 'ADMIN';

  // Vérifier si les soumissions sont activées
  useEffect(() => {
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
        console.error('Erreur lors de la vérification des soumissions:', error);
        // Par défaut, on considère que c'est activé
        setTrackSubmissionsEnabled(true);
      }
    };
    checkTrackSubmissions();

    // Vérifier périodiquement (toutes les 5 secondes) pour mettre à jour l'état
    const interval = setInterval(checkTrackSubmissions, 5000);
    return () => clearInterval(interval);
  }, []);

  // Charger les soumissions existantes
  useEffect(() => {
    if (session?.user?.id) {
      loadSubmissions();
    }
  }, [session?.user?.id, loadSubmissions]);

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
      if (submission.fileUrl && !audioAnalysis) {
        // On pourrait charger l'analyse ici si on l'avait stockée côté serveur
        // Pour l'instant, on va simuler une analyse ou la charger à la demande
        // Option: Charger le fichier pour l'analyse
        fetch(submission.fileUrl)
          .then((res) => res.blob())
          .then((blob) => {
            const file = new File([blob], submission.fileName, { type: blob.type });
            setSelectedFile(file);
            analyzeAudioFile(file).then((analysis) => {
              setAudioAnalysis(analysis);
            });

            // Préparer l'audio ref
            const audioUrl = URL.createObjectURL(file);
            if (audioRef.current) {
              audioRef.current.src = audioUrl;
            }
          })
          .catch((err) => console.error('Erreur chargement fichier soumis:', err));
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

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  }, []);

  // Uploader le fichier directement vers Blob, puis créer/mettre à jour le draft
  const uploadDraft = useCallback(
    async (file: File, existingDraftId?: string | null) => {
      if (!session?.user?.id) {
        toast.error('Vous devez être connecté pour uploader un draft');
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
            console.warn('Erreur lors du nettoyage du fichier Blob:', cleanupError);
          }
          return null;
        }
      } catch (error) {
        console.error('Erreur upload draft:', error);
        toast.error("Erreur de connexion lors de l'upload");
        return null;
      } finally {
        setIsUploadingDraft(false);
      }
    },
    [session?.user?.id]
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
          console.warn("Impossible de sauvegarder l'analyse dans sessionStorage:", error);
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
            if (audioRef.current.src && audioRef.current.src.startsWith('blob:')) {
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
            console.warn('Upload draft échoué, continuation avec analyse locale:', error);
          });
      } catch (error) {
        toast.error("Erreur lors de l'analyse du fichier audio");
        console.error('Erreur analyse audio:', error);
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

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (activeSubmission && isEditing) {
        // Mode édition : mise à jour
        if (!title.trim()) {
          toast.error('Veuillez entrer un titre');
          return;
        }

        const result = await updateSubmission(activeSubmission.id, {
          title: title.trim(),
          description: description.trim() || undefined,
        });

        if (result.success) {
          toast.success('Soumission mise à jour !');
          setIsEditing(false);
        } else {
          toast.error(result.error || 'Erreur lors de la mise à jour');
        }
        return;
      }

      // Mode création (code existant)
      if (!selectedFile && !draftId) {
        toast.error('Veuillez sélectionner un fichier audio');
        return;
      }

      if (!title.trim()) {
        toast.error('Veuillez entrer un titre');
        return;
      }

      try {
        // Note: isSubmitting est géré par useLiveSubmissions

        // Si on a un draft, convertir le draft en soumission
        if (draftId) {
          const formData = new FormData();
          formData.append('draftId', draftId);
          formData.append('title', title.trim());
          if (description.trim()) {
            formData.append('description', description.trim());
          }

          const response = await fetchWithAuth('/api/live/submissions', {
            method: 'POST',
            body: formData,
          });

          if (response.ok) {
            const data = await response.json();
            toast.success('Soumission envoyée avec succès !');
            // Recharger les soumissions pour passer en mode "Submitted"
            await loadSubmissions();

            // Nettoyer le formulaire
            setDraftId(null);
            // On garde title/desc/file pour l'affichage en mode "Submitted"

            // Nettoyer sessionStorage
            try {
              sessionStorage.removeItem('liveSubmissionForm');
              sessionStorage.removeItem('liveSubmissionDraftId');
            } catch (error) {
              console.error('Erreur lors du nettoyage de sessionStorage:', error);
            }
          } else {
            const errorData = await response.json();
            if (response.status === 503) {
              toast.error('Les soumissions sont indisponibles pour le moment');
            } else {
              toast.error(errorData.error || 'Erreur lors de la soumission');
            }
          }
        } else {
          // Comportement classique si pas de draft
          const result = await submitFile({
            file: selectedFile!,
            title: title.trim(),
            description: description.trim() || undefined,
          });

          if (result.success) {
            toast.success('Soumission envoyée avec succès !');
            // Le hook a déjà rechargé les soumissions, donc l'effet va se déclencher

            setDraftId(null);

            // Nettoyer sessionStorage
            try {
              sessionStorage.removeItem('liveSubmissionForm');
              sessionStorage.removeItem('liveSubmissionDraftId');
            } catch (error) {
              console.error('Erreur lors du nettoyage de sessionStorage:', error);
            }
          } else {
            toast.error(result.error || 'Erreur lors de la soumission');
          }
        }
      } catch (error) {
        console.error('Erreur soumission:', error);
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
      updateSubmission,
      loadSubmissions,
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
      console.error('Audio ref not available');
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
          await new Promise<void>((resolve, reject) => {
            if (!audioRef.current) {
              reject(new Error('Audio ref not available'));
              return;
            }

            const onCanPlay = () => {
              audioRef.current?.removeEventListener('canplay', onCanPlay);
              audioRef.current?.removeEventListener('error', onError);
              resolve();
            };

            const onError = () => {
              audioRef.current?.removeEventListener('canplay', onCanPlay);
              audioRef.current?.removeEventListener('error', onError);
              reject(new Error('Erreur lors du chargement audio'));
            };

            audioRef.current.addEventListener('canplay', onCanPlay);
            audioRef.current.addEventListener('error', onError);

            // Si déjà prêt, résoudre immédiatement
            if (audioRef.current.readyState >= 3) {
              // HAVE_FUTURE_DATA
              onCanPlay();
            }
          });
        }

        try {
          await audioRef.current.play();
          setIsPlaying(true);
        } catch (playError: any) {
          // Ignorer les erreurs d'interruption (AbortError)
          if (playError.name !== 'AbortError' && playError.name !== 'NotAllowedError') {
            console.error('Erreur lecture audio:', playError);
            toast.error('Erreur lors de la lecture audio');
          }
          setIsPlaying(false);
        }
      }
    } catch (error) {
      console.error('Erreur lecture audio:', error);
      setIsPlaying(false);
    }
  }, [isPlaying, selectedFile]);

  const handleWaveformClick = useCallback(
    async (e: React.MouseEvent<HTMLDivElement>) => {
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
          await new Promise<void>((resolve, reject) => {
            if (!audioRef.current) {
              reject(new Error('Audio ref not available'));
              return;
            }

            const onCanPlay = () => {
              audioRef.current?.removeEventListener('canplay', onCanPlay);
              audioRef.current?.removeEventListener('error', onError);
              resolve();
            };

            const onError = () => {
              audioRef.current?.removeEventListener('canplay', onCanPlay);
              audioRef.current?.removeEventListener('error', onError);
              reject(new Error('Erreur lors du chargement audio'));
            };

            audioRef.current.addEventListener('canplay', onCanPlay);
            audioRef.current.addEventListener('error', onError);

            // Si déjà prêt, résoudre immédiatement
            if (audioRef.current.readyState >= 3) {
              // HAVE_FUTURE_DATA
              onCanPlay();
            }
          });
        }

        // Mettre à jour la position
        audioRef.current.currentTime = newTime;
        setCurrentTime(newTime);

        // Si on est en pause, lancer la lecture
        if (!isPlaying) {
          try {
            await audioRef.current.play();
            setIsPlaying(true);
          } catch (playError: any) {
            // Ignorer les erreurs d'interruption (AbortError)
            if (playError.name !== 'AbortError' && playError.name !== 'NotAllowedError') {
              console.error('Erreur lecture audio:', playError);
              toast.error('Erreur lors de la lecture audio');
            }
          }
        }
      } catch (error) {
        console.error('Erreur lors du clic sur la waveform:', error);
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
        console.error('Erreur lors de la suppression du draft:', error);
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
      console.error('Erreur lors du nettoyage de sessionStorage:', error);
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

  // Nettoyer l'URL blob à la destruction
  useEffect(() => {
    return () => {
      if (audioRef.current?.src.startsWith('blob:')) {
        URL.revokeObjectURL(audioRef.current.src);
      }
    };
  }, []);

  // Restaurer le draft depuis le serveur après actualisation
  useEffect(() => {
    const restoreDraft = async () => {
      try {
        // Récupérer le draftId depuis sessionStorage
        const savedDraftId = sessionStorage.getItem('liveSubmissionDraftId');
        if (!savedDraftId) return;

        // Vérifier d'abord si l'analyse est en cache pour restaurer immédiatement
        let cachedAnalysis: AudioAnalysisResult | null = null;
        try {
          const cached = sessionStorage.getItem('liveSubmissionAnalysis');
          if (cached) {
            cachedAnalysis = JSON.parse(cached);
          }
        } catch (error) {
          console.warn("Erreur lors de la lecture de l'analyse en cache:", error);
        }

        // Récupérer le draft depuis le serveur
        const response = await fetchWithAuth('/api/live/submissions/draft');
        if (response.ok) {
          const data = await response.json();
          const draft = data.data;

          if (draft && draft.id === savedDraftId) {
            setDraftId(draft.id);
            setTitle(draft.title || '');
            setDescription(draft.description || '');

            // Si l'analyse est en cache et correspond, l'afficher immédiatement
            if (cachedAnalysis && cachedAnalysis.fileName === draft.fileName) {
              setAudioAnalysis(cachedAnalysis);
              // Créer un fichier temporaire avec juste le nom pour éviter le flash de la zone de drop
              // Le vrai fichier sera remplacé une fois téléchargé
              const tempFile = new File([new Blob([''], { type: 'audio/mpeg' })], draft.fileName, {
                type: 'audio/mpeg',
                lastModified: Date.now(),
              });
              setSelectedFile(tempFile);
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

                // Si l'analyse n'est pas en cache, l'analyser (c'est la partie la plus lente)
                if (!cachedAnalysis) {
                  const analysis = await analyzeAudioFile(file);
                  setAudioAnalysis(analysis);
                  setIsAnalyzing(false);
                  // Sauvegarder l'analyse pour la prochaine fois
                  try {
                    sessionStorage.setItem('liveSubmissionAnalysis', JSON.stringify(analysis));
                  } catch (error) {
                    console.warn("Impossible de sauvegarder l'analyse:", error);
                  }
                } else {
                  // L'analyse était en cache, on peut arrêter le loader
                  setIsAnalyzing(false);
                }

                // Créer une URL pour l'audio
                const audioUrl = URL.createObjectURL(file);
                setTimeout(() => {
                  if (audioRef.current) {
                    // Nettoyer l'ancienne source si elle existe
                    if (audioRef.current.src && audioRef.current.src.startsWith('blob:')) {
                      audioRef.current.pause();
                      URL.revokeObjectURL(audioRef.current.src);
                    }
                    audioRef.current.src = audioUrl;
                    audioRef.current.load();
                  }
                }, 0);
              }
            } catch (error) {
              console.error('Erreur lors du téléchargement du fichier:', error);
              toast.error('Erreur lors de la restauration du fichier');
              setIsAnalyzing(false);
            }
          }
        }
      } catch (error) {
        console.error('Erreur lors de la restauration du draft:', error);
        setIsAnalyzing(false);
      }
    };

    restoreDraft();
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
      console.error('Erreur lors de la sauvegarde dans sessionStorage:', error);
    }
  }, [audioAnalysis, title, description, currentTime]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="glass-modern glass-modern-hover rounded-2xl p-4 sm:p-6 lg:p-5 h-full flex flex-col"
    >
      {!trackSubmissionsEnabled ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="glass-modern rounded-xl p-8 sm:p-12 text-center max-w-md w-full border border-red-500/30">
            <div className="mb-4">
              <X className="w-16 h-16 mx-auto text-red-400" />
            </div>
            <h3 className="text-xl sm:text-2xl font-audiowide text-white mb-3">
              Soumissions indisponibles
            </h3>
            <p className="text-gray-300 text-sm sm:text-base">
              Les soumissions sont temporairement indisponibles pour le moment.
            </p>
            <p className="text-gray-400 text-xs sm:text-sm mt-2">Veuillez réessayer plus tard.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg sm:text-xl lg:text-lg font-audiowide text-white">SUBMISSION</h2>
            <div className="flex items-center gap-2">
              {isAdmin && (
                <Link
                  href="/admin/live"
                  className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </Link>
              )}
              <button
                disabled
                className="bg-gray-700/50 text-gray-400 py-2 px-4 rounded-lg font-medium cursor-not-allowed text-sm flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download Sample
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 flex-1 flex flex-col">
            {/* Zone de drag & drop */}
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
              ${isDragging && !activeSubmission ? 'border-purple-500 bg-purple-500/10' : 'border-gray-600 hover:border-purple-500/50'}
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
                            {selectedFile?.name ||
                              'Fichier non disponible - Rechargez votre fichier'}
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
                          console.log('Audio metadata loaded:', audioRef.current.duration);
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
                    <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-white mb-2">Choose a file or drag and drop</p>
                    <p className="text-sm text-gray-400">MP3/WAV (128MB)</p>
                  </>
                )}
              </div>
            </div>

            {/* Inputs - Désactivés si soumis et pas en mode édition */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Track Title"
                  disabled={activeSubmission && !isEditing}
                  className={`w-full bg-gray-800/50 border rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all ${
                    activeSubmission && !isEditing
                      ? 'border-transparent cursor-default'
                      : 'border-gray-600'
                  }`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Description <span className="text-gray-500 text-xs">(Optional)</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell us about your track..."
                  rows={3}
                  disabled={activeSubmission && !isEditing}
                  className={`w-full bg-gray-800/50 border rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all resize-none ${
                    activeSubmission && !isEditing
                      ? 'border-transparent cursor-default'
                      : 'border-gray-600'
                  }`}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              {activeSubmission ? (
                <>
                  {isEditing ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditing(false);
                          // Restaurer les valeurs originales
                          setTitle(activeSubmission.title);
                          setDescription(activeSubmission.description || '');
                        }}
                        className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 px-6 rounded-xl font-audiowide transition-all duration-200 flex items-center justify-center gap-2"
                      >
                        <X className="w-5 h-5" />
                        CANCEL
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex-1 bg-purple-600 hover:bg-purple-500 text-white py-3 px-6 rounded-xl font-audiowide transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-900/20"
                        aria-label="Sauvegarder les modifications"
                      >
                        {isSubmitting ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Save className="w-5 h-5" />
                        )}
                        SAVE CHANGES
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={handleDeleteSubmission}
                        className="bg-red-500/10 hover:bg-red-500/20 text-red-500 py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center"
                        title="Delete Submission"
                        aria-label="Supprimer la soumission"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setIsEditing(true);
                        }}
                        className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 px-6 rounded-xl font-audiowide transition-all duration-200 flex items-center justify-center gap-2"
                        aria-label="Modifier les informations"
                      >
                        <Edit className="w-5 h-5" />
                        EDIT DETAILS
                      </button>
                      <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 rounded-lg border border-green-500/20">
                        <Lock className="w-4 h-4 text-green-500" />
                        <span className="text-green-500 font-medium text-sm">SUBMITTED</span>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <>
                  {/* Bouton Delete Draft (si draft existe) */}
                  {(draftId || selectedFile) && (
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="bg-red-500/10 hover:bg-red-500/20 text-red-500 py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center"
                      title="Clear Form"
                      aria-label="Effacer le formulaire"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}

                  {/* Bouton Submit */}
                  <button
                    type="submit"
                    disabled={(!selectedFile && !draftId) || isSubmitting || isUploadingDraft}
                    className={`
                  flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500
                  text-white py-3 px-6 rounded-xl font-audiowide transition-all duration-200
                  flex items-center justify-center gap-2 shadow-lg shadow-purple-900/20
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
                    aria-label="Soumettre la piste"
                  >
                    {isSubmitting || isUploadingDraft ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        {isUploadingDraft ? 'UPLOADING...' : 'SENDING...'}
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        SUBMIT TRACK
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </form>
        </>
      )}

      {/* Modal d'information */}
      <AnimatePresence>
        {showInfoModal && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowInfoModal(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-md z-50"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              onClick={() => setShowInfoModal(false)}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                className="bg-gray-900/95 backdrop-blur-xl border border-purple-500/30 rounded-2xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto shadow-2xl"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-audiowide text-white">File uploads info</h3>
                  <button
                    onClick={() => setShowInfoModal(false)}
                    className="text-gray-400 hover:text-white transition-colors"
                    aria-label="Fermer les informations"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-3 text-sm">
                  <p className="text-gray-100 leading-relaxed">
                    All uploads are stored securely and privately. Only you and Larian have access.
                  </p>
                  <p className="text-gray-100 leading-relaxed">
                    You can delete your file at any time.
                  </p>
                  <p className="text-gray-100 leading-relaxed">
                    By uploading your file you do NOT transfer any rights to any third party or
                    Larian.
                  </p>
                  <p className="text-gray-100 leading-relaxed">
                    The uploaded file will potentially be played live on stream.
                  </p>
                  <p className="text-gray-100 leading-relaxed">
                    If Larian downloads your file, it is only to do in-depth analysis in FL Studio.
                  </p>
                  <p className="text-gray-100 leading-relaxed">
                    Please do not upload a file if you disagree with any of the above uses.
                  </p>
                </div>

                <button
                  onClick={() => setShowInfoModal(false)}
                  className="mt-6 w-full bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Continue
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
