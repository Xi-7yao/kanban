import { ConflictException, ForbiddenException } from '@nestjs/common';
import { ColumnsService } from './columns.service';

describe('ColumnsService', () => {
  const prisma = {
    column: {
      findUnique: jest.fn(),
      delete: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const eventsGateway = {
    broadcastToBoard: jest.fn(),
  };

  let service: ColumnsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ColumnsService(prisma as never, eventsGateway as never);
  });

  it('broadcasts column:deleted only after delete succeeds', async () => {
    prisma.column.findUnique.mockResolvedValue({ id: 1, userId: 10 });
    prisma.column.delete.mockResolvedValue({ id: 1, userId: 10 });

    await service.remove(1, 10);

    expect(prisma.column.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(eventsGateway.broadcastToBoard).toHaveBeenCalledWith(10, 'board:event', {
      type: 'column:deleted',
      columnId: 1,
    });

    const deleteOrder = prisma.column.delete.mock.invocationCallOrder[0];
    const broadcastOrder = eventsGateway.broadcastToBoard.mock.invocationCallOrder[0];
    expect(deleteOrder).toBeLessThan(broadcastOrder);
  });

  it('does not broadcast when delete fails', async () => {
    prisma.column.findUnique.mockResolvedValue({ id: 1, userId: 10 });
    prisma.column.delete.mockRejectedValue(new Error('db fail'));

    await expect(service.remove(1, 10)).rejects.toThrow('db fail');
    expect(eventsGateway.broadcastToBoard).not.toHaveBeenCalled();
  });

  it('throws ForbiddenException when user does not own column', async () => {
    prisma.column.findUnique.mockResolvedValue({ id: 1, userId: 11 });

    await expect(service.remove(1, 10)).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.column.delete).not.toHaveBeenCalled();
    expect(eventsGateway.broadcastToBoard).not.toHaveBeenCalled();
  });

  it('throws ConflictException when expectedUpdatedAt does not match', async () => {
    prisma.column.findUnique.mockResolvedValue({
      id: 1,
      userId: 10,
      updatedAt: new Date('2026-03-12T10:00:01.000Z'),
    });

    await expect(
      service.update(1, 10, {
        title: 'Doing',
        expectedUpdatedAt: '2026-03-12T10:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(prisma.column.update).not.toHaveBeenCalled();
    expect(eventsGateway.broadcastToBoard).not.toHaveBeenCalled();
  });

  it('strips expectedUpdatedAt from db update and broadcasts fresh updatedAt', async () => {
    const newUpdatedAt = new Date('2026-03-12T10:05:00.000Z');
    prisma.column.findUnique.mockResolvedValue({
      id: 1,
      userId: 10,
      updatedAt: new Date('2026-03-12T10:00:00.000Z'),
    });
    prisma.column.update.mockResolvedValue({
      id: 1,
      userId: 10,
      title: 'Doing',
      order: 1024,
      updatedAt: newUpdatedAt,
    });

    await service.update(1, 10, {
      title: 'Doing',
      expectedUpdatedAt: '2026-03-12T10:00:00.000Z',
    });

    expect(prisma.column.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { title: 'Doing' },
    });
    expect(eventsGateway.broadcastToBoard).toHaveBeenCalledWith(10, 'board:event', {
      type: 'column:updated',
      columnId: 1,
      changes: { title: 'Doing', updatedAt: newUpdatedAt },
    });
  });
});
