import { useEffect, useState } from 'react';

import type { ShopSettings } from './types';

export function useShopSettings(): ShopSettings {
  const [settings, setSettings] = useState<ShopSettings>({
    stripePaymentLink: process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK || '',
    productPrice: 20,
    productName: 'LarianCrusher',
  });

  useEffect(() => {
    fetch('/api/shop/settings')
      .then((res) => res.json())
      .then((data) => {
        setSettings({
          stripePaymentLink:
            data.stripePaymentLink || process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK || '',
          productPrice: data.productPrice || 20,
          productName: data.productName || 'LarianCrusher',
        });
      })
      .catch(() => {
        // Keep defaults
      });
  }, []);

  return settings;
}
