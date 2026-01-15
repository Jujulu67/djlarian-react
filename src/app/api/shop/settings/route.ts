import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

/**
 * GET /api/shop/settings
 * Public endpoint to get shop settings (for product pages)
 * Only returns non-sensitive data
 */
export async function GET() {
  try {
    const settings = await prisma.adminSettings.findMany({
      where: {
        key: {
          startsWith: 'shop_',
        },
      },
    });

    // Convert to object with only public fields
    const settingsObj: Record<string, string | number | boolean | unknown[]> = {
      stripePaymentLink: process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK || '',
      productPrice: 20,
      shopEnabled: true,
      productName: 'LarianCrusher',
      products: [],
    };

    settings.forEach((s) => {
      const key = s.key.replace('shop_', '');
      if (key === 'productPrice') {
        settingsObj[key] = parseInt(s.value, 10) || 20;
      } else if (key === 'shopEnabled') {
        settingsObj[key] = s.value === 'true';
      } else if (key === 'products') {
        try {
          settingsObj[key] = JSON.parse(s.value);
        } catch {
          settingsObj[key] = [];
        }
      } else {
        settingsObj[key] = s.value;
      }
    });

    return NextResponse.json(settingsObj);
  } catch (error) {
    console.error('[SHOP_SETTINGS_ERROR]', error);
    // Return defaults on error
    return NextResponse.json({
      stripePaymentLink: process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK || '',
      productPrice: 20,
      shopEnabled: true,
      productName: 'LarianCrusher',
      products: [],
    });
  }
}
