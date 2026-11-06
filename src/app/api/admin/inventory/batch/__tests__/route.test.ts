/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

import prisma from '@/lib/prisma';

import { POST } from '../route';

jest.mock('@/lib/api/requireAuth', () => ({
  requireAdmin: jest.fn(async () => ({ session: { user: { id: 'admin' } }, error: null })),
}));

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    userLiveItem: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn((operations) => Promise.all(operations)),
  },
}));

jest.mock('@/lib/db-performance', () => ({
  createDbPerformanceLogger: jest.fn(() => ({
    start: jest.fn(() => 0),
    end: jest.fn(),
    logQuery: jest.fn(),
  })),
}));

const { userLiveItem } = jest.mocked(prisma);

const item = (overrides: Record<string, unknown> = {}) => ({
  id: 'ui1',
  userId: 'u1',
  itemId: 'i1',
  quantity: 2,
  activatedQuantity: 0,
  activatedAt: null,
  LiveItem: { type: 'OTHER', name: 'Boost' },
  ...overrides,
});

const queueSkip = { type: 'SKIP_QUEUE', name: 'Queue Skip' };

async function send(actions: unknown[]) {
  const response = await POST(
    new NextRequest('http://localhost/api/admin/inventory/batch', {
      method: 'POST',
      body: JSON.stringify({ actions }),
    })
  );
  const json = await response.json();
  return { status: response.status, results: (json.data ?? json).results };
}

describe('POST /api/admin/inventory/batch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    userLiveItem.findMany.mockResolvedValue([] as never);
  });

  it('active un item et fixe sa date d’activation', async () => {
    userLiveItem.findMany.mockResolvedValue([item()] as never);

    const { results } = await send([{ type: 'activate', userItemId: 'ui1' }]);

    expect(results[0]).toMatchObject({ success: true, updatedItem: { activatedQuantity: 1 } });
    const { data } = userLiveItem.update.mock.calls[0][0];
    expect(data).toMatchObject({ activatedQuantity: 1, isActivated: true });
    expect(data.activatedAt).toBeInstanceOf(Date);
  });

  it('refuse d’activer au-delà de la quantité, y compris dans le même batch', async () => {
    userLiveItem.findMany.mockResolvedValue([item({ quantity: 1 })] as never);

    const { results } = await send([
      { type: 'activate', userItemId: 'ui1' },
      { type: 'activate', userItemId: 'ui1' },
    ]);

    expect(results[0].success).toBe(true);
    expect(results[1]).toMatchObject({
      success: false,
      error: 'Tous les items sont déjà activés',
    });
  });

  it('signale un item introuvable', async () => {
    const { results } = await send([{ type: 'activate', userItemId: 'absent' }]);
    expect(results[0]).toMatchObject({ success: false, error: 'Item not found' });
  });

  it('n’autorise qu’un Queue Skip activé dans le même batch', async () => {
    userLiveItem.findMany.mockResolvedValue([item({ LiveItem: queueSkip })] as never);

    const { results } = await send([
      { type: 'activate', userItemId: 'ui1' },
      { type: 'activate', userItemId: 'ui1' },
    ]);

    expect(results[0].success).toBe(true);
    expect(results[1].error).toBe('Un seul Queue Skip peut être activé à la fois');
  });

  it('refuse un Queue Skip si l’utilisateur en a déjà un autre d’activé', async () => {
    userLiveItem.findMany.mockResolvedValue([
      item({ LiveItem: queueSkip }),
      item({ id: 'ui2', itemId: 'i2', activatedQuantity: 1, LiveItem: queueSkip }),
      item({ id: 'ui3', userId: 'u2', itemId: 'i3', activatedQuantity: 1, LiveItem: queueSkip }),
    ] as never);

    const { results } = await send([{ type: 'activate', userItemId: 'ui1' }]);

    expect(results[0].success).toBe(false);
    expect(results[0].error).toContain('Un Queue Skip est déjà activé');
  });

  it('ignore le Queue Skip activé d’un autre utilisateur', async () => {
    userLiveItem.findMany.mockResolvedValue([
      item({ LiveItem: queueSkip }),
      item({ id: 'ui3', userId: 'u2', itemId: 'i3', activatedQuantity: 1, LiveItem: queueSkip }),
    ] as never);

    const { results } = await send([{ type: 'activate', userItemId: 'ui1' }]);

    expect(results[0].success).toBe(true);
  });

  it('désactive un item et efface sa date quand il n’en reste aucun d’activé', async () => {
    userLiveItem.findMany.mockResolvedValue([
      item({ activatedQuantity: 1, activatedAt: new Date() }),
    ] as never);

    const { results } = await send([{ type: 'deactivate', userItemId: 'ui1' }]);

    expect(results[0].success).toBe(true);
    expect(userLiveItem.update.mock.calls[0][0].data).toMatchObject({
      activatedQuantity: 0,
      isActivated: false,
      activatedAt: null,
    });
  });

  it('refuse de désactiver un item qui n’est pas activé', async () => {
    userLiveItem.findMany.mockResolvedValue([item()] as never);

    const { results } = await send([{ type: 'deactivate', userItemId: 'ui1' }]);

    expect(results[0]).toMatchObject({ success: false, error: "Aucun item n'est activé" });
  });

  it('regroupe les ajouts d’un nouvel item en une seule création', async () => {
    const { results } = await send([
      { type: 'addItem', userId: 'u1', itemId: 'i1', quantity: 2 },
      { type: 'addItem', userId: 'u1', itemId: 'i1', quantity: 3 },
    ]);

    expect(userLiveItem.create).toHaveBeenCalledTimes(1);
    expect(userLiveItem.create.mock.calls[0][0].data).toMatchObject({ quantity: 5 });
    expect(results).toHaveLength(2);
  });

  it('incrémente un item déjà possédé', async () => {
    userLiveItem.findMany.mockResolvedValue([item()] as never);

    await send([{ type: 'addItem', userId: 'u1', itemId: 'i1', quantity: 3 }]);

    expect(userLiveItem.create).not.toHaveBeenCalled();
    expect(userLiveItem.update.mock.calls[0][0].data).toEqual({ quantity: { increment: 3 } });
  });

  it('supprime l’item quand on retire toute sa quantité, sinon décrémente', async () => {
    userLiveItem.findMany.mockResolvedValue([
      item(),
      item({ id: 'ui2', itemId: 'i2', quantity: 5 }),
    ] as never);

    const { results } = await send([
      { type: 'removeItem', userId: 'u1', itemId: 'i1', quantity: 2 },
      { type: 'removeItem', userId: 'u1', itemId: 'i2', quantity: 2 },
      { type: 'removeItem', userId: 'u1', itemId: 'absent', quantity: 1 },
    ]);

    expect(userLiveItem.delete).toHaveBeenCalledWith({ where: { id: 'ui1' } });
    expect(userLiveItem.update.mock.calls[0][0].data).toEqual({ quantity: { decrement: 2 } });
    expect(results[1].updatedItem.quantity).toBe(3);
    expect(results[2]).toMatchObject({
      success: false,
      error: 'Item not found in user inventory',
    });
  });

  it('refuse des données invalides', async () => {
    const { status } = await send([{ type: 'inconnu' }]);
    expect(status).toBe(400);
  });
});
