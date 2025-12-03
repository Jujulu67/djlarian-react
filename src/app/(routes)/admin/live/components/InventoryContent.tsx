'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Loader2, Trash2, Zap, ZapOff, Package, RefreshCw } from 'lucide-react';
import Image from 'next/image';
import { getInventory, getAllItems } from '@/actions/inventory';
import { toast } from 'sonner';
import type { UserLiveItem, LiveItem } from '@/types/live';
import type { Prisma } from '@prisma/client';
import { useBatchedInventoryActions } from '../hooks/useBatchedInventoryActions';

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
  const reloadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { queueAction } = useBatchedInventoryActions();

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
      if (reloadTimeoutRef.current) {
        clearTimeout(reloadTimeoutRef.current);
      }
    };
  }, [userId]);

  const handleAddItem = async (itemId: string) => {
    // Trouver l'item dans allItems pour avoir les infos
    const item = allItems.find((i) => i.id === itemId);
    if (!item) return;

    // Sauvegarder l'état actuel pour rollback
    const previousInventory = [...inventory];

    // Appeler queueAction IMMÉDIATEMENT (synchrone) pour permettre le batching
    // L'action est ajoutée à la queue avant que React ne traite le setState
    const actionPromise = queueAction({ type: 'addItem', userId, itemId, quantity: 1 });

    // Optimistic update : mettre à jour l'UI immédiatement (sans flushSync pour ne pas bloquer)
    setInventory((prev) => {
      const existingItem = prev.find((i) => i.itemId === itemId);
      if (existingItem) {
        // Item existe déjà, incrémenter la quantité
        return prev.map((i) =>
          i.itemId === itemId ? { ...i, quantity: i.quantity + 1, updatedAt: new Date() } : i
        );
      } else {
        // Nouvel item, l'ajouter en dernière position
        const newUserItem: UserLiveItemWithRelations = {
          id: `temp-${Date.now()}`,
          userId,
          itemId,
          quantity: 1,
          activatedQuantity: 0,
          isActivated: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          activatedAt: null,
          metadata: null,
          LiveItem: item,
        };
        return [...prev, newUserItem];
      }
    });

    // Ne PAS désactiver le bouton pour permettre le spam clic
    // L'optimistic update garde l'UI à jour instantanément
    // setActionLoading(itemId); // DÉSACTIVÉ pour permettre le spam clic

    // Ne pas attendre la promesse pour permettre le batching
    // La promesse se résoudra après le batch, mais on ne bloque pas l'UI
    actionPromise
      .then((res) => {
        if (!res.success) {
          // Rollback en cas d'erreur
          if (reloadTimeoutRef.current) {
            clearTimeout(reloadTimeoutRef.current);
            reloadTimeoutRef.current = null;
          }
          setInventory(previousInventory);
          toast.error(res.error || 'Failed to add item');
        }
        // Pas de reload ici : l'optimistic update garde l'UI à jour.
        // Le refresh manuel ou automatique (toutes les 30s) suffit pour resynchroniser avec le serveur.
      })
      .catch((error) => {
        // Rollback en cas d'erreur
        if (reloadTimeoutRef.current) {
          clearTimeout(reloadTimeoutRef.current);
          reloadTimeoutRef.current = null;
        }
        setInventory(previousInventory);
        toast.error(error instanceof Error ? error.message : 'Failed to add item');
      });
    // Pas de .finally() car on ne désactive plus le bouton
  };

  const handleRemoveItem = async (itemId: string) => {
    // Sauvegarder l'état actuel pour rollback
    const previousInventory = [...inventory];
    const userItem = inventory.find((i) => i.itemId === itemId);
    if (!userItem) return;

    // Appeler queueAction IMMÉDIATEMENT (synchrone) pour permettre le batching
    const actionPromise = queueAction({ type: 'removeItem', userId, itemId, quantity: 1 });

    // Optimistic update : mettre à jour l'UI immédiatement (sans flushSync pour ne pas bloquer)
    setInventory((prev) => {
      const item = prev.find((i) => i.itemId === itemId);
      if (!item) return prev;

      if (item.quantity <= 1) {
        // Supprimer complètement l'item
        return prev.filter((i) => i.itemId !== itemId);
      } else {
        // Décrémenter la quantité
        return prev.map((i) =>
          i.itemId === itemId ? { ...i, quantity: i.quantity - 1, updatedAt: new Date() } : i
        );
      }
    });

    // Ne PAS désactiver le bouton pour permettre le spam clic
    // setActionLoading(itemId); // DÉSACTIVÉ pour permettre le spam clic

    // Ne pas attendre la promesse pour permettre le batching
    // La promesse se résoudra après le batch, mais on ne bloque pas l'UI
    actionPromise
      .then((res) => {
        if (!res.success) {
          // Rollback en cas d'erreur
          if (reloadTimeoutRef.current) {
            clearTimeout(reloadTimeoutRef.current);
            reloadTimeoutRef.current = null;
          }
          setInventory(previousInventory);
          toast.error(res.error || 'Failed to remove item');
        }
        // Pas de reload ici : l'optimistic update garde l'UI à jour.
        // Le refresh manuel ou automatique (toutes les 30s) suffit pour resynchroniser avec le serveur.
      })
      .catch((error) => {
        // Rollback en cas d'erreur
        if (reloadTimeoutRef.current) {
          clearTimeout(reloadTimeoutRef.current);
          reloadTimeoutRef.current = null;
        }
        setInventory(previousInventory);
        toast.error(error instanceof Error ? error.message : 'Failed to remove item');
      });
  };

  const handleActivateItem = async (userItemId: string) => {
    // Sauvegarder l'état actuel pour rollback
    const previousInventory = [...inventory];
    const userItem = inventory.find((i) => i.id === userItemId);
    if (!userItem || (userItem.activatedQuantity || 0) >= userItem.quantity) return;

    const currentActivated = userItem.activatedQuantity || 0;
    const newActivatedQuantity = currentActivated + 1;

    // Appeler queueAction IMMÉDIATEMENT (synchrone) pour permettre le batching
    const actionPromise = queueAction({ type: 'activate', userItemId });

    // Optimistic update : mettre à jour l'UI immédiatement (sans flushSync pour ne pas bloquer)
    setInventory((prev) =>
      prev.map((i) =>
        i.id === userItemId
          ? {
              ...i,
              activatedQuantity: newActivatedQuantity,
              isActivated: true,
              activatedAt: currentActivated === 0 ? new Date() : i.activatedAt,
              updatedAt: new Date(),
            }
          : i
      )
    );

    // Ne PAS désactiver le bouton pour permettre le spam clic
    // setActionLoading(userItemId); // DÉSACTIVÉ pour permettre le spam clic

    // Ne pas attendre la promesse pour permettre le batching
    // La promesse se résoudra après le batch, mais on ne bloque pas l'UI
    actionPromise
      .then((res) => {
        if (!res.success) {
          // Rollback en cas d'erreur
          if (reloadTimeoutRef.current) {
            clearTimeout(reloadTimeoutRef.current);
            reloadTimeoutRef.current = null;
          }
          setInventory(previousInventory);
          toast.error(res.error || 'Failed to activate item');
        }
        // Pas de reload ici : l'optimistic update garde l'UI à jour.
        // Le refresh manuel ou automatique (toutes les 30s) suffit pour resynchroniser avec le serveur.
      })
      .catch((error) => {
        // Rollback en cas d'erreur
        if (reloadTimeoutRef.current) {
          clearTimeout(reloadTimeoutRef.current);
          reloadTimeoutRef.current = null;
        }
        setInventory(previousInventory);
        toast.error(error instanceof Error ? error.message : 'Failed to activate item');
      });
  };

  const handleDeactivateItem = async (userItemId: string) => {
    // Sauvegarder l'état actuel pour rollback
    const previousInventory = [...inventory];
    const userItem = inventory.find((i) => i.id === userItemId);
    if (!userItem || (userItem.activatedQuantity || 0) <= 0) return;

    const currentActivated = userItem.activatedQuantity || 0;
    const newActivatedQuantity = currentActivated - 1;

    // Appeler queueAction IMMÉDIATEMENT (synchrone) pour permettre le batching
    const actionPromise = queueAction({ type: 'deactivate', userItemId });

    // Optimistic update : mettre à jour l'UI immédiatement (sans flushSync pour ne pas bloquer)
    setInventory((prev) =>
      prev.map((i) => {
        if (i.id !== userItemId) return i;
        return {
          ...i,
          activatedQuantity: newActivatedQuantity,
          isActivated: newActivatedQuantity > 0,
          activatedAt: newActivatedQuantity === 0 ? null : i.activatedAt,
          updatedAt: new Date(),
        };
      })
    );

    // Ne PAS désactiver le bouton pour permettre le spam clic
    // setActionLoading(userItemId); // DÉSACTIVÉ pour permettre le spam clic

    // Ne pas attendre la promesse pour permettre le batching
    // La promesse se résoudra après le batch, mais on ne bloque pas l'UI
    actionPromise
      .then((res) => {
        if (!res.success) {
          // Rollback en cas d'erreur
          if (reloadTimeoutRef.current) {
            clearTimeout(reloadTimeoutRef.current);
            reloadTimeoutRef.current = null;
          }
          setInventory(previousInventory);
          toast.error(res.error || 'Failed to deactivate item');
        }
        // Pas de reload ici : l'optimistic update garde l'UI à jour.
        // Le refresh manuel ou automatique (toutes les 30s) suffit pour resynchroniser avec le serveur.
      })
      .catch((error) => {
        // Rollback en cas d'erreur
        if (reloadTimeoutRef.current) {
          clearTimeout(reloadTimeoutRef.current);
          reloadTimeoutRef.current = null;
        }
        setInventory(previousInventory);
        toast.error(error instanceof Error ? error.message : 'Failed to deactivate item');
      });
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

  // Un item peut être dans les deux listes s'il est partiellement activé
  // - Dans activatedItems si activatedQuantity > 0
  // - Dans inactiveItems si activatedQuantity < quantity
  const activatedItems = inventory.filter((i) => (i.activatedQuantity || 0) > 0);
  const inactiveItems = inventory.filter((i) => (i.activatedQuantity || 0) < i.quantity);

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
                              {(item.activatedQuantity || 0) > 0
                                ? `${item.activatedQuantity}/${item.quantity}`
                                : `x${item.quantity}`}
                            </Badge>
                          )}
                        </div>
                        <div className="absolute top-1 left-1 md:top-2 md:left-2 z-20">
                          <Zap className="w-3 h-3 md:w-6 md:h-6 text-yellow-400 fill-yellow-400" />
                        </div>
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 md:gap-2 rounded-lg backdrop-blur-sm z-30">
                          {/* Dans activatedItems : uniquement le bouton deactivate */}
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
                              {(() => {
                                // Afficher le nombre restant (non activé) au format "x58"
                                const remaining = item.quantity - (item.activatedQuantity || 0);
                                return `x${remaining}`;
                              })()}
                            </Badge>
                          )}
                        </div>
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 md:gap-2 rounded-lg backdrop-blur-sm z-30">
                          {/* Dans inactiveItems : uniquement le bouton activate + delete */}
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
