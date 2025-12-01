'use client';

import { useState, useEffect, useCallback } from 'react';
import Modal from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
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
    setSearchQuery(''); // Reset search on select
  };

  const handleBack = () => {
    setSelectedUserId(null);
    setSelectedUser(null);
  };

  return (
    <>
      {isOpen && (
        <Modal onClose={onClose} maxWidth="max-w-full" fullscreenContent={true}>
          <div className="text-white h-full flex flex-col">
            <div className="mb-6 flex items-center justify-between shrink-0">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                GLOBAL INVENTORY MANAGER
              </h2>
              {selectedUserId && (
                <Button variant="ghost" onClick={handleBack}>
                  Back to Users
                </Button>
              )}
            </div>

            {!selectedUserId ? (
              <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                <div className="relative shrink-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-black/20 border border-gray-800 rounded-md pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-purple-500 transition-colors"
                    autoFocus
                  />
                </div>

                <div className="flex-1 overflow-y-auto border border-gray-800 rounded-md bg-black/20 p-4">
                  {loading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {users.map((user) => (
                        <button
                          key={user.id}
                          onClick={() => handleSelectUser(user)}
                          className="flex items-center gap-3 p-4 rounded-lg hover:bg-white/5 transition-colors text-left border border-transparent hover:border-purple-500/30 group bg-black/40"
                        >
                          <div className="h-12 w-12 rounded-full bg-purple-900/30 flex items-center justify-center border border-purple-500/20 group-hover:border-purple-500/50 overflow-hidden shrink-0">
                            {user.image ? (
                              <img
                                src={user.image}
                                alt={user.name || ''}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <User className="h-6 w-6 text-purple-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-200 truncate">
                              {user.name || 'Unknown'}
                            </p>
                            <p className="text-xs text-gray-500 truncate">{user.email}</p>
                          </div>
                        </button>
                      ))}
                      {users.length === 0 && (
                        <div className="col-span-full text-center py-8 text-gray-500">
                          No users found
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto">
                <InventoryContent
                  userId={selectedUserId}
                  userName={selectedUser?.name || undefined}
                />
              </div>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
