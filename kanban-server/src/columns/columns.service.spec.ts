import { ForbiddenException } from '@nestjs/common';
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
});
