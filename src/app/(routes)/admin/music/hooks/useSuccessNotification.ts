import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function useSuccessNotification() {
  const router = useRouter();
  const [showSuccess, setShowSuccess] = useState(false);
  const [successTrackId, setSuccessTrackId] = useState<string | null>(null);

  // Gérer successId depuis l'URL
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const searchParams = new URLSearchParams(window.location.search);
    const successId = searchParams.get('success');
    setShowSuccess(!!successId);
  }, []);

  // Auto-hide après 3 secondes
  useEffect(() => {
    if (showSuccess) {
      const timeout = setTimeout(() => setShowSuccess(false), 3000);
      return () => clearTimeout(timeout);
    }
  }, [showSuccess]);

  // Nettoyer l'URL après 4 secondes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const searchParams = new URLSearchParams(window.location.search);
    const successId = searchParams.get('success');
    if (!successId) return;

    const timeout = setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      params.delete('success');
      router.replace(
        window.location.pathname + (params.toString() ? '?' + params.toString() : ''),
        { scroll: false }
      );
    }, 4000);
    return () => clearTimeout(timeout);
  }, [router]);

  const setSuccess = (trackId: string | null) => {
    setSuccessTrackId(trackId);
    setTimeout(() => setSuccessTrackId(null), 3000);
  };

  return {
    showSuccess,
    successTrackId,
    setSuccess,
  };
}

