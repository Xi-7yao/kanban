import { ForbiddenException } from '@nestjs/common';
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
});
