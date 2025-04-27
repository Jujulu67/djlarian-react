'use client';

import { User, Mail } from 'lucide-react';
import UserActions from '@/components/admin/UserActions';

type UserData = {
  id: string;
  name?: string | null;
  email?: string | null;
  role: string | null;
  isVip?: boolean;
};

interface UserTableProps {
  users: UserData[];
}

export const UserTable = ({ users }: UserTableProps) => {
  return (
    <div className="bg-gray-800/50 rounded-lg shadow-xl overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-700/50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-purple-300 uppercase tracking-wider">
              Nom
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-purple-300 uppercase tracking-wider">
              Email
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-purple-300 uppercase tracking-wider">
              Rôle & Statut
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-purple-300 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-700">
          {users.map((user: UserData) => (
            <tr key={user.id} className="hover:bg-gray-700/30 transition-colors">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <User className="h-5 w-5 text-gray-400 mr-2" />
                  {user.name || 'N/A'}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <Mail className="h-5 w-5 text-gray-400 mr-2" />
                  {user.email || 'N/A'}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center space-x-2">
                  <span
                    className={`px-3 py-1 inline-flex items-center text-xs leading-5 font-semibold rounded-full ${
                      user.role === 'ADMIN'
                        ? 'bg-purple-800/70 text-purple-100'
                        : user.role === 'MODERATOR'
                          ? 'bg-blue-800/70 text-blue-100'
                          : 'bg-green-800/70 text-green-100'
                    }`}
                  >
                    {user.role === 'ADMIN' && <span className="mr-1">👑</span>}
                    {user.role === 'MODERATOR' && <span className="mr-1">🛡️</span>}
                    {user.role === 'USER' && <span className="mr-1">👤</span>}
                    {user.role || 'N/A'}
                  </span>
                  {user.isVip && (
                    <span
                      className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-700/70 text-amber-100"
                      title="Utilisateur VIP"
                    >
                      <span className="mr-1">⭐</span>
                      VIP
                    </span>
                  )}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <UserActions userId={user.id} userName={user.name} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
