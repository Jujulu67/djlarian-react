'use client';

import { useState } from 'react';
import type { KeyboardEvent } from 'react';
import { motion } from 'framer-motion';
import { Package, ExternalLink, Zap } from 'lucide-react';
import Image from 'next/image';
import { Badge } from '@/components/ui/Badge';
import { useUiVersion } from '@/hooks/useUiVersion';
import { useLiveInventoryContext } from '../context/LiveInventoryContext';
import { toast } from 'sonner';

export function LiveInventory() {
  const { inventory, isLoading, updateItem } = useLiveInventoryContext();
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  const handleItemClick = async (itemId: string, isActivated: boolean) => {
    // Si l'item est activé, on désactive un item. Sinon, on active un item.
    const result = await updateItem({ itemId, action: isActivated ? 'deactivate' : 'activate' });

    // Afficher un message d'erreur si l'opération a échoué
    if (!result?.success) {
      const errorMessage = result?.error || "Erreur lors de la mise à jour de l'item";
      toast.error(errorMessage);
    }
  };

  const isV2 = useUiVersion() === 'v2';

  /** Accessibilité clavier des cases d'item (rendu inchangé) */
  const tileA11y = (
    item: { itemId: string; LiveItem?: { name?: string | null } | null } | undefined,
    isActivated: boolean
  ) =>
    item
      ? {
          role: 'button' as const,
          tabIndex: 0,
          'aria-label': `${item.LiveItem?.name || 'Item'} : ${isActivated ? 'désactiver' : 'activer'}`,
          onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              handleItemClick(item.itemId, isActivated);
            }
          },
        }
      : {};

  const activatedItems = inventory?.activatedItems || [];
  const unactivatedItems = inventory?.unactivatedItems || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className={
        isV2
          ? 'surface-1 flex h-full flex-col rounded-2xl p-5'
          : 'glass-modern glass-modern-hover rounded-2xl p-3 sm:p-4 lg:p-4 h-full flex flex-col'
      }
    >
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base sm:text-lg lg:text-base font-audiowide text-white v2:font-sans v2:font-semibold">
          {isV2 ? 'INVENTORY' : 'INVENTORY 📦'}
        </h2>
        <button className="text-purple-400 hover:text-purple-300 text-xs flex items-center gap-1 v2:rounded-full v2:bg-white/[0.04] v2:px-3 v2:py-1 v2:font-medium v2:text-white/70 v2:ring-1 v2:ring-inset v2:ring-white/10 v2:hover:text-white">
          TRADES <ExternalLink className="w-3 h-3" />
        </button>
      </div>

      <p className="text-[10px] text-gray-400 mb-3 v2:text-xs v2:text-white/50">
        {/* ALL YOUR ITEMS & BONUSES IN ONE PLACE. SOME ITEMS MAY REQUIRE A TWITCH CHAT MESSAGE TO
        APPEAR. */}{' '}
        ACTIVE TICKETS: {inventory?.totalTickets || 0} {/* LIST OF ALL ITEMS -&gt; */}
      </p>

      {/* Items activés */}
      <div className="mb-3">
        <h3 className="text-[10px] font-medium text-gray-300 mb-1.5 v2:text-xs v2:text-white/60">
          Activated Items
        </h3>
        <div className="grid grid-cols-5 gap-1 v2:gap-2">
          {Array.from({ length: 5 }).map((_, index) => {
            const item = activatedItems[index];
            return (
              <motion.div
                key={`activated-${index}-${item?.id || index}`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => item && handleItemClick(item.itemId, true)}
                {...tileA11y(item, true)}
                className="flex flex-col"
              >
                <div
                  className={`
                  aspect-square rounded-lg relative overflow-hidden flex flex-col cursor-pointer
                  ${item ? 'bg-gradient-to-br from-purple-900/50 to-blue-900/50 border-2 border-purple-500/50 shadow-[0_0_8px_rgba(168,85,247,0.4)] v2:border v2:border-brand/50 v2:bg-none v2:bg-brand/10 v2:shadow-none' : 'border border-gray-700 bg-gray-800/30 v2:border-white/[0.06] v2:bg-white/[0.02]'}
                  v2:rounded-xl
                `}
                >
                  {item && (
                    <>
                      {/* Animation pulse background */}
                      <div className="absolute inset-0 bg-purple-500/10 animate-pulse v2:hidden" />

                      {/* Image remplissant toute la div */}
                      <div className="absolute inset-0 w-full h-full">
                        {failedImages.has(`activated-${item.id}`) ? (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-8 h-8 text-gray-600 z-10" />
                          </div>
                        ) : (
                          <Image
                            src={`/images/items/${item.LiveItem?.type.toLowerCase() || 'default'}.png`}
                            alt={item.LiveItem?.name || 'Unknown'}
                            fill
                            className="object-cover z-10 drop-shadow-[0_0_4px_rgba(255,255,255,0.3)]"
                            onError={() => {
                              setFailedImages((prev) => new Set(prev).add(`activated-${item.id}`));
                            }}
                          />
                        )}
                      </div>

                      {/* Icône Zap en haut à gauche */}
                      <div className="absolute top-1 left-1 z-20">
                        <Zap className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                      </div>

                      {/* Badge quantité activée en bas à droite */}
                      {(item.quantity > 1 || (item.activatedQuantity || 0) > 0) && (
                        <div className="absolute bottom-1 right-1 z-20">
                          <Badge
                            variant="secondary"
                            className="bg-black/70 backdrop-blur-md border-none text-[10px] px-1 py-0.5 leading-none"
                          >
                            {item.quantity > 1
                              ? `${item.activatedQuantity || 0}/${item.quantity}`
                              : `${item.activatedQuantity || 0}`}
                          </Badge>
                        </div>
                      )}
                    </>
                  )}
                  {!item && (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-6 h-6 text-gray-600 v2:h-5 v2:w-5 v2:text-white/15" />
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-white text-center line-clamp-2 leading-tight mt-1 font-medium text-purple-300">
                  {item?.LiveItem?.name || ''}
                </span>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Inventaire (non activé) - Toujours afficher une première ligne */}
      <div>
        <h3 className="text-[10px] font-medium text-gray-300 mb-1.5 v2:text-xs v2:text-white/60">
          Inventory
        </h3>
        <div className="grid grid-cols-5 gap-1 v2:gap-2">
          {Array.from({ length: 5 }).map((_, index) => {
            const item = unactivatedItems[index];
            return (
              <motion.div
                key={`unactivated-${index}-${item?.id || index}`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => item && handleItemClick(item.itemId, false)}
                {...tileA11y(item, false)}
                className="flex flex-col"
              >
                <div
                  className={`
                  aspect-square rounded-lg relative overflow-hidden cursor-pointer
                  ${item ? 'bg-gray-900/50 border border-gray-800 hover:border-gray-600 transition-colors v2:border-white/[0.08] v2:bg-white/[0.03] v2:hover:border-white/20' : 'border border-gray-700 bg-gray-800/20 v2:border-white/[0.06] v2:bg-white/[0.02]'}
                  v2:rounded-xl
                `}
                >
                  {item ? (
                    <>
                      {/* Image remplissant toute la div */}
                      <div className="absolute inset-0 w-full h-full">
                        {failedImages.has(`inactive-${item.id}`) ? (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-8 h-8 text-gray-600 z-10" />
                          </div>
                        ) : (
                          <Image
                            src={`/images/items/${item.LiveItem?.type.toLowerCase() || 'default'}.png`}
                            alt={item.LiveItem?.name || 'Unknown'}
                            fill
                            className="object-cover z-10 opacity-80 hover:opacity-100 transition-opacity"
                            onError={() => {
                              setFailedImages((prev) => new Set(prev).add(`inactive-${item.id}`));
                            }}
                          />
                        )}
                      </div>

                      {/* Badge quantité restante en bas à droite */}
                      {(() => {
                        const remainingQuantity = item.quantity - (item.activatedQuantity || 0);
                        return (
                          remainingQuantity > 0 && (
                            <div className="absolute bottom-1 right-1 z-20">
                              <Badge
                                variant="secondary"
                                className="bg-black/70 backdrop-blur-md border-none text-[10px] px-1 py-0.5 leading-none"
                              >
                                {remainingQuantity > 1 ? `x${remainingQuantity}` : ''}
                              </Badge>
                            </div>
                          )
                        );
                      })()}
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-6 h-6 text-gray-600 v2:h-5 v2:w-5 v2:text-white/15" />
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-gray-300 text-center line-clamp-2 leading-tight mt-1">
                  {item?.LiveItem?.name || ''}
                </span>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Deuxième ligne d'inventaire - Afficher seulement si on a 5 items ou plus */}
      {unactivatedItems.length >= 5 && (
        <div className="mt-2">
          <div className="grid grid-cols-5 gap-1 v2:gap-2">
            {Array.from({ length: 5 }).map((_, index) => {
              const item = unactivatedItems[index + 5];
              return (
                <motion.div
                  key={`unactivated-${index + 5}-${item?.id || index + 5}`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => item && handleItemClick(item.itemId, false)}
                  {...tileA11y(item, false)}
                  className="flex flex-col"
                >
                  <div
                    className={`
                    aspect-square rounded-lg relative overflow-hidden cursor-pointer
                    ${item ? 'bg-gray-900/50 border border-gray-800 hover:border-gray-600 transition-colors v2:border-white/[0.08] v2:bg-white/[0.03] v2:hover:border-white/20' : 'border border-gray-700 bg-gray-800/20 v2:border-white/[0.06] v2:bg-white/[0.02]'}
                  v2:rounded-xl
                  `}
                  >
                    {item ? (
                      <>
                        {/* Image remplissant toute la div */}
                        <div className="absolute inset-0 w-full h-full">
                          {failedImages.has(`inactive-${item.id}`) ? (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="w-8 h-8 text-gray-600 z-10" />
                            </div>
                          ) : (
                            <Image
                              src={`/images/items/${item.LiveItem?.type.toLowerCase() || 'default'}.png`}
                              alt={item.LiveItem?.name || 'Unknown'}
                              fill
                              className="object-cover z-10 opacity-80 hover:opacity-100 transition-opacity"
                              onError={() => {
                                setFailedImages((prev) => new Set(prev).add(`inactive-${item.id}`));
                              }}
                            />
                          )}
                        </div>

                        {/* Badge quantité en bas à droite */}
                        {item.quantity > 1 && (
                          <div className="absolute bottom-1 right-1 z-20">
                            <Badge
                              variant="secondary"
                              className="bg-black/70 backdrop-blur-md border-none text-[10px] px-1 py-0.5 leading-none"
                            >
                              {item.activatedQuantity > 0
                                ? `${item.activatedQuantity}/${item.quantity}`
                                : `x${item.quantity}`}
                            </Badge>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-6 h-6 text-gray-600 v2:h-5 v2:w-5 v2:text-white/15" />
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-gray-300 text-center line-clamp-2 leading-tight mt-1">
                    {item?.LiveItem?.name || ''}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
}
