'use client';

import { useState, useEffect, useCallback } from 'react';
import Modal from '@/components/ui/Modal';
import { InventoryContent } from './InventoryContent';
import { Search, User, Loader2 } from 'lucide-react';
import { searchUsers } from '@/actions/inventory';

interface GlobalInventoryManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SearchUser {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
}

export function GlobalInventoryManager({ isOpen, onClose }: GlobalInventoryManagerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<SearchUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<SearchUser | null>(null);

  // Simple debounce implementation if hook is not available
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const handleSearch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await searchUsers(debouncedQuery);
      if (res.success && res.data) {
        setUsers(res.data);
      } else {
        setUsers([]);
      }
    } catch (error) {
      console.error('Search failed', error);
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery]);

  useEffect(() => {
    if (isOpen) {
      handleSearch();
    }
  }, [handleSearch, isOpen]);

  const handleSelectUser = (user: SearchUser) => {
    setSelectedUserId(user.id);
    setSelectedUser(user);
  };

  return (
    <>
      {isOpen && (
        <Modal onClose={onClose} maxWidth="max-w-6xl" noScroll={false}>
          <div className="text-white flex flex-col">
            {/* Header */}
            <div className="h-10 md:h-12 shrink-0 flex items-center justify-between px-3 md:px-6 border-b border-gray-800">
              <h2 className="text-sm md:text-lg font-bold">GLOBAL INVENTORY MANAGER</h2>
            </div>

            {/* Layout en colonnes côte à côte */}
            <div className="flex flex-col lg:flex-row">
              {/* Colonne gauche: Recherche utilisateurs (1/3) */}
              <div className="w-full lg:w-1/3 lg:border-r border-b lg:border-b-0 border-gray-800 flex flex-col">
                {/* Search bar */}
                <div className="h-10 md:h-12 shrink-0 relative px-2 py-2 pr-2 md:pr-10">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 md:h-4 md:w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-full bg-black/20 border border-gray-800 rounded-lg pl-7 md:pl-8 pr-2 text-xs md:text-sm focus:outline-none focus:border-purple-500 transition-colors"
                    autoFocus
                  />
                </div>

                {/* Liste utilisateurs */}
                <div className="flex-1">
                  {loading ? (
                    <div className="flex justify-center items-center py-8">
                      <Loader2 className="h-5 w-5 md:h-6 md:w-6 animate-spin text-purple-500" />
                    </div>
                  ) : (
                    <div className="py-2 px-2 pr-2 md:pr-10">
                      <div className="space-y-2">
                        {users.map((user) => {
                          const isSelected = selectedUserId === user.id;
                          return (
                            <button
                              key={user.id}
                              onClick={() => handleSelectUser(user)}
                              className={`w-full flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-lg transition-colors text-left border ${
                                isSelected
                                  ? 'bg-purple-500/20 border-purple-500/50'
                                  : 'bg-black/40 border-transparent hover:border-purple-500/30 hover:bg-white/5'
                              } group`}
                            >
                              <div className="h-8 w-8 md:h-10 md:w-10 rounded-full bg-purple-900/30 flex items-center justify-center border border-purple-500/20 group-hover:border-purple-500/50 overflow-hidden shrink-0">
                                {user.image ? (
                                  <img
                                    src={user.image}
                                    alt={user.name || ''}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <User className="h-4 w-4 md:h-5 md:w-5 text-purple-400" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs md:text-sm font-medium text-gray-200 break-words">
                                  {user.name || 'Unknown'}
                                </p>
                                <p className="text-[10px] md:text-xs text-gray-500 break-words">
                                  {user.email}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                        {users.length === 0 && !loading && (
                          <div className="text-center py-8 text-gray-500 text-sm">
                            No users found
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Colonne droite: Inventaire (2/3) */}
              <div className="flex-1 w-full lg:w-auto flex flex-col">
                {selectedUserId ? (
                  <InventoryContent
                    userId={selectedUserId}
                    userName={selectedUser?.name || undefined}
                  />
                ) : (
                  <div className="flex items-center justify-center py-8 text-gray-500 text-sm md:text-base px-3 md:px-0 text-center">
                    Select a user to view inventory
                  </div>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
