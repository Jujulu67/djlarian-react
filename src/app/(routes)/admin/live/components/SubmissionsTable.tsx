'use client';

import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { User, FileAudio, Calendar, Clock } from 'lucide-react';

import { LiveSubmissionStatus } from '@/types/live';
import { SubmissionActions } from './SubmissionActions';

type SubmissionWithUser = {
  id: string;
  userId: string;
  fileName: string;
  fileUrl: string;
  title: string;
  description: string | null;
  status: LiveSubmissionStatus;
  createdAt: Date;
  updatedAt: Date;
  User: {
    id: string;
    name: string | null;
    email: string | null;
  };
};

interface SubmissionsTableProps {
  submissions: SubmissionWithUser[];
  onRefresh: () => void;
}

export function SubmissionsTable({ submissions, onRefresh }: SubmissionsTableProps) {
  const getStatusBadge = (status: LiveSubmissionStatus) => {
    switch (status) {
      case LiveSubmissionStatus.PENDING:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-yellow-800/70 text-yellow-100">
            <Clock className="h-3 w-3 mr-1" />
            En attente
          </span>
        );
      case LiveSubmissionStatus.APPROVED:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-800/70 text-green-100">
            <span className="mr-1">✓</span>
            Approuvée
          </span>
        );
      case LiveSubmissionStatus.REJECTED:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-800/70 text-red-100">
            <span className="mr-1">✗</span>
            Rejetée
          </span>
        );
      default:
        return null;
    }
  };

  if (submissions.length === 0) {
    return (
      <div className="bg-gray-800/50 rounded-lg shadow-xl p-12 text-center">
        <FileAudio className="h-12 w-12 text-gray-500 mx-auto mb-4" />
        <p className="text-gray-400 text-lg">Aucune soumission trouvée</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 rounded-lg shadow-xl overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-700/50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-purple-300 uppercase tracking-wider">
              Utilisateur
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-purple-300 uppercase tracking-wider">
              Titre
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-purple-300 uppercase tracking-wider">
              Description
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-purple-300 uppercase tracking-wider">
              Fichier
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-purple-300 uppercase tracking-wider">
              Statut
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-purple-300 uppercase tracking-wider">
              Date
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-purple-300 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-700">
          {submissions.map((submission) => (
            <tr key={submission.id} className="hover:bg-gray-700/30 transition-colors">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <User className="h-5 w-5 text-gray-400 mr-2" />
                  <div>
                    <div className="text-sm font-medium text-gray-100">
                      {submission.User.name || 'Utilisateur anonyme'}
                    </div>
                    <div className="text-xs text-gray-400">{submission.User.email}</div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="text-sm font-medium text-gray-100">{submission.title}</div>
              </td>
              <td className="px-6 py-4">
                <div className="text-sm text-gray-300 max-w-xs truncate">
                  {submission.description || '-'}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center text-sm text-gray-300">
                  <FileAudio className="h-4 w-4 text-gray-400 mr-2" />
                  <span className="truncate max-w-[200px]" title={submission.fileName}>
                    {submission.fileName}
                  </span>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(submission.status)}</td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center text-sm text-gray-300">
                  <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                  {format(new Date(submission.createdAt), 'dd MMM yyyy', { locale: fr })}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {format(new Date(submission.createdAt), 'HH:mm', { locale: fr })}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <div className="relative">
                  <SubmissionActions submission={submission} onStatusUpdate={onRefresh} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
