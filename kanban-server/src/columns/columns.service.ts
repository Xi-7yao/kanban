import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { CreateColumnDto } from './dto/create-column.dto';
import { UpdateColumnDto } from './dto/update-column.dto';

@Injectable()
export class ColumnsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  async getBoard(userId: number) {
    return this.prisma.column.findMany({
      where: { userId },
      include: {
        cards: {
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { order: 'asc' },
    });
  }

  async create(userId: number, dto: CreateColumnDto) {
    const column = await this.prisma.column.create({
      data: { ...dto, userId },
    });
    this.eventsGateway.broadcastToBoard(userId, 'board:event', { type: 'column:created', column });
    return column;
  }

  async update(id: number, userId: number, dto: UpdateColumnDto) {
    const column = await this.prisma.column.findUnique({ where: { id } });

    if (!column) {
      throw new NotFoundException(`Column with ID ${id} not found`);
    }

    if (column.userId !== userId) {
      throw new ForbiddenException('You do not own this column');
    }

    const { expectedUpdatedAt, ...changes } = dto;

    if (expectedUpdatedAt) {
      const expectedMs = new Date(expectedUpdatedAt).getTime();
      if (column.updatedAt.getTime() !== expectedMs) {
        throw new ConflictException('Column was updated by another user. Please refresh and try again.');
      }
    }

    const updated = await this.prisma.column.update({
      where: { id },
      data: changes,
    });
    this.eventsGateway.broadcastToBoard(userId, 'board:event', {
      type: 'column:updated',
      columnId: id,
      changes: { ...changes, updatedAt: updated.updatedAt },
    });
    return updated;
  }

  async remove(id: number, userId: number) {
    const column = await this.prisma.column.findUnique({ where: { id } });

    if (!column) {
      throw new NotFoundException(`Column with ID ${id} not found`);
    }

    if (column.userId !== userId) {
      throw new ForbiddenException('You do not own this column');
    }

    const deleted = await this.prisma.column.delete({ where: { id } });

    this.eventsGateway.broadcastToBoard(userId, 'board:event', {
      type: 'column:deleted', columnId: id,
    });

    return deleted;
  }
}
