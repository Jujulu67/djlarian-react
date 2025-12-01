'use client';

import { motion } from 'framer-motion';
import { Package, ExternalLink } from 'lucide-react';
import { useLiveInventory } from '../hooks/useLiveInventory';
import { LiveItemType } from '@/types/live';

export function LiveInventory() {
  const { inventory, isLoading, updateItem } = useLiveInventory();

  const handleItemClick = async (itemId: string, isActivated: boolean) => {
    await updateItem({ itemId, isActivated: !isActivated });
  };

  const getItemIcon = (type: string) => {
    const icons: Record<string, string> = {
      [LiveItemType.SUBSCRIBER_BONUS]: '👑',
      [LiveItemType.LOYALTY_BONUS]: '💎',
      [LiveItemType.ETERNAL_TICKET]: '🎫',
      [LiveItemType.WAVEFORM_COLOR]: '🎨',
      [LiveItemType.BACKGROUND_IMAGE]: '🖼️',
      [LiveItemType.SUB_GIFT_BONUS]: '🎁',
      [LiveItemType.MARBLES_WINNER_BONUS]: '🎲',
    };
    return icons[type] || '📦';
  };

  const activatedItems = inventory?.activatedItems || [];
  const unactivatedItems = inventory?.unactivatedItems || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="glass-modern glass-modern-hover rounded-2xl p-3 sm:p-4 lg:p-4 h-full flex flex-col"
    >
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base sm:text-lg lg:text-base font-audiowide text-white">
          INVENTORY 📦
        </h2>
        <button className="text-purple-400 hover:text-purple-300 text-xs flex items-center gap-1">
          TRADES <ExternalLink className="w-3 h-3" />
        </button>
      </div>

      <p className="text-[10px] text-gray-400 mb-3">
        // ALL YOUR ITEMS & BONUSES IN ONE PLACE. SOME ITEMS MAY REQUIRE A TWITCH CHAT MESSAGE TO
        APPEAR. // ACTIVE TICKETS: {inventory?.totalTickets || 0} // LIST OF ALL ITEMS -&gt;
      </p>

      {/* Items activés */}
      <div className="mb-3">
        <h3 className="text-[10px] font-medium text-gray-300 mb-1.5">Activated Items</h3>
        <div className="grid grid-cols-5 gap-1">
          {Array.from({ length: 5 }).map((_, index) => {
            const item = activatedItems[index];
            return (
              <motion.div
                key={index}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => item && handleItemClick(item.itemId, true)}
                className={`
                  aspect-square rounded border p-0.5 flex flex-col items-center justify-center cursor-pointer relative
                  ${item ? 'border-purple-500/50 bg-purple-500/10' : 'border-gray-700 bg-gray-800/30'}
                `}
              >
                {item ? (
                  <>
                    <span className="text-2xl mb-0.5">
                      {getItemIcon(item.LiveItem?.type || '')}
                    </span>
                    <span className="text-[8px] text-white text-center line-clamp-2 leading-tight">
                      {item.LiveItem?.name || 'Item'}
                    </span>
                    {item.quantity > 1 && (
                      <span className="absolute bottom-0 right-0 text-[8px] text-purple-400 font-bold">
                        {item.quantity}
                      </span>
                    )}
                  </>
                ) : (
                  <Package className="w-6 h-6 text-gray-600" />
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Inventaire (non activé) - Toujours afficher une première ligne */}
      <div>
        <h3 className="text-[10px] font-medium text-gray-300 mb-1.5">Inventory</h3>
        <div className="grid grid-cols-5 gap-1">
          {Array.from({ length: 5 }).map((_, index) => {
            const item = unactivatedItems[index];
            return (
              <motion.div
                key={index}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => item && handleItemClick(item.itemId, false)}
                className={`
                  aspect-square rounded border p-0.5 flex flex-col items-center justify-center cursor-pointer relative
                  ${item ? 'border-gray-600 bg-gray-800/30 hover:border-purple-500/50' : 'border-gray-700 bg-gray-800/20'}
                `}
              >
                {item ? (
                  <>
                    <span className="text-2xl mb-0.5">
                      {getItemIcon(item.LiveItem?.type || '')}
                    </span>
                    <span className="text-[8px] text-gray-300 text-center line-clamp-2 leading-tight">
                      {item.LiveItem?.name || 'Item'}
                    </span>
                    {item.quantity > 1 && (
                      <span className="absolute bottom-0 right-0 text-[8px] text-purple-400 font-bold">
                        {item.quantity}
                      </span>
                    )}
                  </>
                ) : (
                  <Package className="w-6 h-6 text-gray-600" />
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Deuxième ligne d'inventaire - Afficher seulement si on a 5 items ou plus */}
      {unactivatedItems.length >= 5 && (
        <div className="mt-2">
          <div className="grid grid-cols-5 gap-1">
            {Array.from({ length: 5 }).map((_, index) => {
              const item = unactivatedItems[index + 5];
              return (
                <motion.div
                  key={index + 5}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => item && handleItemClick(item.itemId, false)}
                  className={`
                    aspect-square rounded border p-0.5 flex flex-col items-center justify-center cursor-pointer relative
                    ${item ? 'border-gray-600 bg-gray-800/30 hover:border-purple-500/50' : 'border-gray-700 bg-gray-800/20'}
                  `}
                >
                  {item ? (
                    <>
                      <span className="text-2xl mb-0.5">
                        {getItemIcon(item.LiveItem?.type || '')}
                      </span>
                      <span className="text-[8px] text-gray-300 text-center line-clamp-2 leading-tight">
                        {item.LiveItem?.name || 'Item'}
                      </span>
                      {item.quantity > 1 && (
                        <span className="absolute bottom-0 right-0 text-[8px] text-purple-400 font-bold">
                          {item.quantity}
                        </span>
                      )}
                    </>
                  ) : (
                    <Package className="w-6 h-6 text-gray-600" />
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
}
