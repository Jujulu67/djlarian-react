'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Loader2, Plus, Trash2, Zap, ZapOff } from 'lucide-react';
import Image from 'next/image';
import {
  getInventory,
  getAllItems,
  addItemToUser,
  removeItemFromUser,
  toggleItemActivation,
} from '@/actions/inventory';
import { toast } from 'sonner';

interface InventoryContentProps {
  userId: string;
  userName?: string;
}

export function InventoryContent({ userId, userName }: InventoryContentProps) {
  const [inventory, setInventory] = useState<any[]>([]);
  const [allItems, setAllItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

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
  }, [loadData]);

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

  const handleToggleActivation = async (userItemId: string) => {
    setActionLoading(userItemId);
    try {
      const res = await toggleItemActivation(userItemId);
      if (res.success) {
        toast.success('Item status updated');
        loadData(true); // Silent reload
      } else {
        toast.error('Failed to update item status');
      }
    } finally {
      setActionLoading(null);
    }
  };

  const activatedItems = inventory.filter((i) => i.isActivated);
  const inactiveItems = inventory.filter((i) => !i.isActivated);

  return (
    <div className="text-white">
      <div className="mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          INVENTORY{' '}
          <span className="text-gray-500 text-sm font-normal">// {userName || userId}</span>
        </h2>
      </div>

      {loading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Activated Items */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-300">ACTIVATED ITEMS</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4">
              {activatedItems.map((item) => (
                <div key={item.id} className="relative group">
                  <div className="aspect-square rounded-xl bg-gradient-to-br from-purple-900/50 to-blue-900/50 border border-purple-500/50 p-2 flex flex-col items-center justify-center relative overflow-hidden shadow-[0_0_15px_rgba(168,85,247,0.4)]">
                    <div className="absolute inset-0 bg-purple-500/10 animate-pulse" />
                    <Image
                      src={`/images/items/${item.LiveItem.type.toLowerCase()}.png`}
                      alt={item.LiveItem.name}
                      width={80}
                      height={80}
                      className="object-cover z-10 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/images/placeholder.png';
                      }}
                    />
                    <div className="absolute bottom-2 right-2 z-20">
                      {item.quantity > 1 && (
                        <Badge
                          variant="secondary"
                          className="bg-black/50 backdrop-blur-md border-none text-xs"
                        >
                          x{item.quantity}
                        </Badge>
                      )}
                    </div>
                    <div className="absolute top-2 left-2 z-20">
                      <Zap className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 rounded-xl backdrop-blur-sm z-30">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 hover:bg-red-500/20 hover:text-red-400"
                      onClick={() => handleToggleActivation(item.id)}
                      disabled={!!actionLoading}
                    >
                      <ZapOff className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-center mt-2 font-medium text-purple-300 truncate w-full">
                    {item.LiveItem.name}
                  </p>
                </div>
              ))}
              {activatedItems.length === 0 && (
                <div className="col-span-full text-gray-500 text-sm italic">No active items</div>
              )}
            </div>
          </div>

          {/* Inventory */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-300">INVENTORY</h3>
            </div>
            <div className="w-full rounded-md border border-gray-800 bg-black/20 p-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
                {inactiveItems.map((item) => (
                  <div key={item.id} className="relative group">
                    <div className="aspect-square rounded-xl bg-gray-900/50 border border-gray-800 p-2 flex flex-col items-center justify-center relative overflow-hidden hover:border-gray-600 transition-colors">
                      <div className="relative">
                        <Image
                          src={`/images/items/${item.LiveItem.type.toLowerCase()}.png`}
                          alt={item.LiveItem.name}
                          width={80}
                          height={80}
                          className="object-cover z-10 opacity-80 group-hover:opacity-100 transition-opacity"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/images/placeholder.png';
                          }}
                        />
                      </div>
                      <div className="absolute bottom-2 right-2 z-20">
                        {item.quantity > 1 && (
                          <Badge
                            variant="secondary"
                            className="bg-black/50 backdrop-blur-md border-none text-xs"
                          >
                            x{item.quantity}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 rounded-xl backdrop-blur-sm z-30">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 hover:bg-green-500/20 hover:text-green-400"
                        onClick={() => handleToggleActivation(item.id)}
                      >
                        <Zap className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 hover:bg-red-500/20 hover:text-red-400"
                        onClick={() => handleRemoveItem(item.LiveItem.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-center mt-2 text-gray-400 truncate w-full">
                      {item.LiveItem.name}
                    </p>
                  </div>
                ))}
                {inactiveItems.length === 0 && (
                  <div className="col-span-full text-gray-500 text-sm italic">Inventory empty</div>
                )}
              </div>
            </div>
          </div>

          {/* Item Shop / Add Item */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-300">ADD ITEM</h3>
            <div className="w-full rounded-md border border-gray-800 bg-black/20 p-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
                {allItems.map((item) => (
                  <Button
                    key={item.id}
                    variant="outline"
                    className="h-auto flex-col gap-2 p-4 border-gray-800 hover:bg-gray-800/50 hover:border-gray-600"
                    onClick={() => handleAddItem(item.id)}
                  >
                    <div className="relative w-full aspect-square">
                      <Image
                        src={`/images/items/${item.type.toLowerCase()}.png`}
                        alt={item.name}
                        fill
                        className="object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/images/placeholder.png';
                        }}
                      />
                    </div>
                    <span className="text-xs text-gray-400 truncate w-full">{item.name}</span>
                    <Plus className="h-3 w-3 text-gray-500" />
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
