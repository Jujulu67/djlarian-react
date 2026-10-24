'use client';

import { motion } from 'framer-motion';
import { X } from 'lucide-react';

interface SubmissionInfoModalProps {
  setShowInfoModal: React.Dispatch<React.SetStateAction<boolean>>;
}

export function SubmissionInfoModal({ setShowInfoModal }: SubmissionInfoModalProps) {
  return (
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
            <p className="text-gray-100 leading-relaxed">You can delete your file at any time.</p>
            <p className="text-gray-100 leading-relaxed">
              By uploading your file you do NOT transfer any rights to any third party or Larian.
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
  );
}
