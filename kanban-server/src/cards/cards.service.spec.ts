import { ConflictException, ForbiddenException } from '@nestjs/common';
import { CardsService } from './cards.service';

describe('CardsService', () => {
  const prisma = {
    card: {
      findUnique: jest.fn(),
      delete: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    column: {
      findUnique: jest.fn(),
    },
  };

  const eventsGateway = {
    broadcastToBoard: jest.fn(),
  };

  let service: CardsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CardsService(prisma as never, eventsGateway as never);
  });

  it('broadcasts card:deleted only after delete succeeds', async () => {
    prisma.card.findUnique.mockResolvedValue({ id: 1, columnId: 2, column: { userId: 10 } });
    prisma.card.delete.mockResolvedValue({ id: 1, columnId: 2 });

    await service.remove(1, 10);

    expect(prisma.card.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(eventsGateway.broadcastToBoard).toHaveBeenCalledWith(10, 'board:event', {
      type: 'card:deleted',
      cardId: 1,
      columnId: 2,
    });

    const deleteOrder = prisma.card.delete.mock.invocationCallOrder[0];
    const broadcastOrder = eventsGateway.broadcastToBoard.mock.invocationCallOrder[0];
    expect(deleteOrder).toBeLessThan(broadcastOrder);
  });

  it('does not broadcast when delete fails', async () => {
    prisma.card.findUnique.mockResolvedValue({ id: 1, columnId: 2, column: { userId: 10 } });
    prisma.card.delete.mockRejectedValue(new Error('db fail'));

    await expect(service.remove(1, 10)).rejects.toThrow('db fail');
    expect(eventsGateway.broadcastToBoard).not.toHaveBeenCalled();
  });

  it('throws ForbiddenException when user does not own card', async () => {
    prisma.card.findUnique.mockResolvedValue({ id: 1, columnId: 2, column: { userId: 11 } });

    await expect(service.remove(1, 10)).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.card.delete).not.toHaveBeenCalled();
    expect(eventsGateway.broadcastToBoard).not.toHaveBeenCalled();
  });

  it('throws ConflictException when expectedUpdatedAt does not match', async () => {
    prisma.card.findUnique.mockResolvedValue({
      id: 1,
      columnId: 2,
      updatedAt: new Date('2026-03-11T10:00:01.000Z'),
      column: { userId: 10 },
    });

    await expect(
      service.update(1, 10, {
        title: 'New title',
        expectedUpdatedAt: '2026-03-11T10:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(prisma.card.update).not.toHaveBeenCalled();
    expect(eventsGateway.broadcastToBoard).not.toHaveBeenCalled();
  });

  it('strips expectedUpdatedAt from db update and broadcasts fresh updatedAt', async () => {
    const newUpdatedAt = new Date('2026-03-11T10:05:00.000Z');
    prisma.card.findUnique.mockResolvedValue({
      id: 1,
      columnId: 2,
      updatedAt: new Date('2026-03-11T10:00:00.000Z'),
      column: { userId: 10 },
    });
    prisma.card.update.mockResolvedValue({
      id: 1,
      columnId: 2,
      order: 1024,
      title: 'Changed',
      updatedAt: newUpdatedAt,
    });

    await service.update(1, 10, {
      title: 'Changed',
      expectedUpdatedAt: '2026-03-11T10:00:00.000Z',
    });

    expect(prisma.card.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { title: 'Changed' },
    });
    expect(eventsGateway.broadcastToBoard).toHaveBeenCalledWith(10, 'board:event', {
      type: 'card:updated',
      cardId: 1,
      changes: { title: 'Changed', updatedAt: newUpdatedAt },
    });
  });
});
