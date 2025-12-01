'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Loader2, Trash2, Zap, ZapOff, Package, RefreshCw } from 'lucide-react';
import Image from 'next/image';
import {
  getInventory,
  getAllItems,
  addItemToUser,
  removeItemFromUser,
  activateItem,
  deactivateItem,
} from '@/actions/inventory';
import { toast } from 'sonner';
import type { UserLiveItem, LiveItem } from '@/types/live';
import type { Prisma } from '@prisma/client';

type LiveItemWithRelations = Prisma.LiveItemGetPayload<Record<string, never>>;
type UserLiveItemWithRelations = Prisma.UserLiveItemGetPayload<{
  include: { LiveItem: true };
}>;

interface InventoryContentProps {
  userId: string;
  userName?: string;
}

export function InventoryContent({ userId, userName }: InventoryContentProps) {
  const [inventory, setInventory] = useState<UserLiveItemWithRelations[]>([]);
  const [allItems, setAllItems] = useState<LiveItemWithRelations[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const loadData = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const [invRes, itemsRes] = await Promise.all([getInventory(userId), getAllItems()]);

        if (invRes.success && invRes.data) setInventory(invRes.data);
        if (itemsRes.success && itemsRes.data) setAllItems(itemsRes.data);
      } catch (error) {
        toast.error('Failed to load inventory data');
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [userId]
  );

  useEffect(() => {
    loadData();

    // Rafraîchissement automatique toutes les 30 secondes pour détecter les changements depuis /live
    refreshIntervalRef.current = setInterval(() => {
      loadData(true); // Silent refresh
    }, 30000);

    // Cleanup on unmount
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [loadData]);

  // Cleanup interval when component unmounts or userId changes
  useEffect(() => {
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [userId]);

  const handleAddItem = async (itemId: string) => {
    setActionLoading(itemId);
    try {
      const res = await addItemToUser(userId, itemId, 1);
      if (res.success) {
        toast.success('Item added');
        loadData(true); // Silent reload
      } else {
        toast.error('Failed to add item');
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    setActionLoading(itemId);
    try {
      const res = await removeItemFromUser(userId, itemId, 1);
      if (res.success) {
        toast.success('Item removed');
        loadData(true); // Silent reload
      } else {
        toast.error('Failed to remove item');
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleActivateItem = async (userItemId: string) => {
    setActionLoading(userItemId);
    try {
      const res = await activateItem(userItemId);
      if (res.success) {
        toast.success('Item activé');
        loadData(true); // Silent reload
      } else {
        toast.error(res.error || 'Failed to activate item');
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeactivateItem = async (userItemId: string) => {
    setActionLoading(userItemId);
    try {
      const res = await deactivateItem(userItemId);
      if (res.success) {
        toast.success('Item désactivé');
        loadData(true); // Silent reload
      } else {
        toast.error(res.error || 'Failed to deactivate item');
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleManualRefresh = async () => {
    setRefreshing(true);
    try {
      await loadData(false); // Show loading indicator
      toast.success('Inventory refreshed');
    } catch (error) {
      toast.error('Failed to refresh inventory');
    } finally {
      setRefreshing(false);
    }
  };

  const activatedItems = inventory.filter((i) => (i.activatedQuantity || 0) > 0);
  const inactiveItems = inventory.filter((i) => (i.activatedQuantity || 0) === 0);

  return (
    <div className="text-white flex flex-col">
      {/* Header */}
      <div className="h-10 md:h-12 shrink-0 flex items-center justify-between px-3 md:px-6 border-b border-gray-800">
        <h2 className="text-sm md:text-base font-bold">
          INVENTORY {userName && <span className="text-gray-500 font-normal">• {userName}</span>}
        </h2>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleManualRefresh}
          disabled={refreshing || loading}
          className="h-7 w-7 md:h-8 md:w-8 p-0 hover:bg-purple-500/20"
          title="Refresh inventory"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 md:h-4 md:w-4 text-gray-400 ${refreshing || loading ? 'animate-spin' : ''}`}
          />
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-6 w-6 md:h-8 md:w-8 animate-spin text-purple-500" />
        </div>
      ) : (
        <div className="p-2 md:p-4 space-y-3 md:space-y-4 pb-4">
          {/* Activated Items - Flexible height based on content */}
          {activatedItems.length > 0 && (
            <div className="md:shrink-0 flex flex-col">
              <h3 className="text-xs md:text-base font-semibold mb-2 md:mb-3 text-gray-300">
                ACTIVATED ITEMS
              </h3>
              <div className="rounded-lg border border-gray-800 bg-black/20 p-2 md:p-4">
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 md:gap-4">
                  {activatedItems.map((item) => (
                    <div key={item.id} className="relative group flex flex-col">
                      <div className="aspect-square rounded-lg bg-gradient-to-br from-purple-900/50 to-blue-900/50 border-2 border-purple-500/50 p-2 md:p-4 flex items-center justify-center relative overflow-hidden shadow-[0_0_8px_rgba(168,85,247,0.4)]">
                        <div className="absolute inset-0 bg-purple-500/10 animate-pulse" />
                        {failedImages.has(`activated-${item.id}`) ? (
                          <Package className="w-8 h-8 md:w-16 md:h-16 text-gray-600 z-10" />
                        ) : (
                          <Image
                            src={`/images/items/${item.LiveItem?.type.toLowerCase() || 'default'}.png`}
                            alt={item.LiveItem?.name || 'Unknown'}
                            width={64}
                            height={64}
                            className="w-8 h-8 md:w-16 md:h-16 object-cover z-10 drop-shadow-[0_0_4px_rgba(255,255,255,0.3)]"
                            onError={() => {
                              setFailedImages((prev) => new Set(prev).add(`activated-${item.id}`));
                            }}
                          />
                        )}
                        <div className="absolute bottom-1 right-1 md:bottom-2 md:right-2 z-20">
                          {item.quantity > 1 && (
                            <Badge
                              variant="secondary"
                              className="bg-black/70 backdrop-blur-md border-none text-[10px] md:text-sm px-1 md:px-2 py-0.5 md:py-1 leading-none"
                            >
                              x{item.quantity}
                            </Badge>
                          )}
                        </div>
                        <div className="absolute top-1 left-1 md:top-2 md:left-2 z-20">
                          <Zap className="w-3 h-3 md:w-6 md:h-6 text-yellow-400 fill-yellow-400" />
                        </div>
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 md:gap-2 rounded-lg backdrop-blur-sm z-30">
                          {(item.activatedQuantity || 0) > 0 && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 md:h-10 md:w-10 hover:bg-red-500/20 hover:text-red-400"
                              onClick={() => handleDeactivateItem(item.id)}
                              disabled={!!actionLoading}
                              title="Désactiver un item"
                            >
                              <ZapOff className="h-3 w-3 md:h-5 md:w-5" />
                            </Button>
                          )}
                          {(item.activatedQuantity || 0) < item.quantity && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 md:h-10 md:w-10 hover:bg-green-500/20 hover:text-green-400"
                              onClick={() => handleActivateItem(item.id)}
                              disabled={!!actionLoading}
                              title="Activer un item"
                            >
                              <Zap className="h-3 w-3 md:h-5 md:w-5" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <p className="text-[10px] md:text-sm text-center mt-1 md:mt-2 font-medium text-purple-300 w-full break-words min-h-[2rem] md:min-h-[3rem] flex items-center justify-center leading-tight">
                        {item.LiveItem?.name || 'Unknown'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Inventory - Flexible height based on content */}
          <div className="md:shrink-0 flex flex-col">
            <h3 className="text-xs md:text-base font-semibold mb-2 md:mb-3 text-gray-300">
              INVENTORY
            </h3>
            {inactiveItems.length > 0 ? (
              <div className="rounded-lg border border-gray-800 bg-black/20 p-2 md:p-4">
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 md:gap-4">
                  {inactiveItems.map((item) => (
                    <div key={item.id} className="relative group flex flex-col">
                      <div className="aspect-square rounded-lg bg-gray-900/50 border border-gray-800 p-2 md:p-4 flex items-center justify-center relative overflow-hidden hover:border-gray-600 transition-colors">
                        {failedImages.has(`inactive-${item.id}`) ? (
                          <Package className="w-8 h-8 md:w-16 md:h-16 text-gray-600 z-10" />
                        ) : (
                          <Image
                            src={`/images/items/${item.LiveItem?.type.toLowerCase() || 'default'}.png`}
                            alt={item.LiveItem?.name || 'Unknown'}
                            width={64}
                            height={64}
                            className="w-8 h-8 md:w-16 md:h-16 object-cover z-10 opacity-80 group-hover:opacity-100 transition-opacity"
                            onError={() => {
                              setFailedImages((prev) => new Set(prev).add(`inactive-${item.id}`));
                            }}
                          />
                        )}
                        <div className="absolute bottom-1 right-1 md:bottom-2 md:right-2 z-20">
                          {item.quantity > 1 && (
                            <Badge
                              variant="secondary"
                              className="bg-black/70 backdrop-blur-md border-none text-[10px] md:text-sm px-1 md:px-2 py-0.5 md:py-1 leading-none"
                            >
                              {(item.activatedQuantity || 0) > 0
                                ? `${item.activatedQuantity}/${item.quantity}`
                                : `x${item.quantity}`}
                            </Badge>
                          )}
                        </div>
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 md:gap-2 rounded-lg backdrop-blur-sm z-30">
                          {(item.activatedQuantity || 0) < item.quantity && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 md:h-10 md:w-10 hover:bg-green-500/20 hover:text-green-400"
                              onClick={() => handleActivateItem(item.id)}
                              disabled={!!actionLoading}
                              title="Activer un item"
                            >
                              <Zap className="h-3 w-3 md:h-5 md:w-5" />
                            </Button>
                          )}
                          {(item.activatedQuantity || 0) > 0 && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 md:h-10 md:w-10 hover:bg-red-500/20 hover:text-red-400"
                              onClick={() => handleDeactivateItem(item.id)}
                              disabled={!!actionLoading}
                              title="Désactiver un item"
                            >
                              <ZapOff className="h-3 w-3 md:h-5 md:w-5" />
                            </Button>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 md:h-10 md:w-10 hover:bg-red-500/20 hover:text-red-400"
                            onClick={() => item.LiveItem && handleRemoveItem(item.LiveItem.id)}
                            disabled={!!actionLoading}
                            title="Supprimer l'item"
                          >
                            <Trash2 className="h-3 w-3 md:h-5 md:w-5" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-[10px] md:text-sm text-center mt-1 md:mt-2 text-gray-400 w-full break-words min-h-[2rem] md:min-h-[3rem] flex items-center justify-center leading-tight">
                        {item.LiveItem?.name || 'Unknown'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 text-sm italic">Inventory empty</div>
            )}
          </div>

          {/* Item Shop / Add Item - Flexible height based on content */}
          <div className="md:shrink-0 flex flex-col">
            <h3 className="text-xs md:text-base font-semibold mb-2 md:mb-3 text-gray-300">
              ADD ITEM
            </h3>
            <div className="rounded-lg border border-gray-800 bg-black/20 p-2 md:p-4">
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 md:gap-4">
                {allItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleAddItem(item.id)}
                    disabled={!!actionLoading}
                    className="relative group flex flex-col cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent rounded-lg"
                  >
                    <div className="aspect-square rounded-lg bg-gray-900/50 border border-gray-800 p-2 md:p-4 flex items-center justify-center relative overflow-hidden hover:border-gray-600 transition-colors">
                      {failedImages.has(`shop-${item.id}`) ? (
                        <Package className="w-8 h-8 md:w-16 md:h-16 text-gray-600 z-10" />
                      ) : (
                        <Image
                          src={`/images/items/${item.type.toLowerCase()}.png`}
                          alt={item.name}
                          width={64}
                          height={64}
                          className="w-8 h-8 md:w-16 md:h-16 object-cover z-10 opacity-80 group-hover:opacity-100 transition-opacity"
                          onError={() => {
                            setFailedImages((prev) => new Set(prev).add(`shop-${item.id}`));
                          }}
                        />
                      )}
                    </div>
                    <p className="text-[10px] md:text-sm text-center mt-1 md:mt-2 text-gray-400 w-full break-words min-h-[2rem] md:min-h-[3rem] flex items-center justify-center leading-tight">
                      {item.name}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
