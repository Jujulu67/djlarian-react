import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

/**
 * GET /api/admin/shop
 * Returns all shop settings
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const settings = await prisma.adminSettings.findMany({
      where: {
        key: {
          startsWith: 'shop_',
        },
      },
    });

    // Convert to object
    const settingsObj: Record<string, string> = {};
    settings.forEach((s) => {
      settingsObj[s.key.replace('shop_', '')] = s.value;
    });

    return NextResponse.json(settingsObj);
  } catch (error) {
    console.error('[ADMIN_SHOP_GET_ERROR]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}

/**
 * POST /api/admin/shop
 * Update shop settings
 */
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await req.json();
    const { stripePaymentLink, productPrice, shopEnabled, productName, products } = body;

    // Upsert each setting
    const updates = [
      { key: 'shop_stripePaymentLink', value: stripePaymentLink || '' },
      { key: 'shop_productPrice', value: productPrice?.toString() || '20' },
      { key: 'shop_shopEnabled', value: shopEnabled ? 'true' : 'false' },
      { key: 'shop_productName', value: productName || 'LarianCrusher' },
    ];

    // Store products as JSON if provided
    if (products) {
      updates.push({ key: 'shop_products', value: JSON.stringify(products) });
    }

    for (const update of updates) {
      await prisma.adminSettings.upsert({
        where: { key: update.key },
        update: { value: update.value },
        create: { key: update.key, value: update.value },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[ADMIN_SHOP_POST_ERROR]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
