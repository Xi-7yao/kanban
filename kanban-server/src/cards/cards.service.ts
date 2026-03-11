import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { CreateCardDto } from './dto/create-card.dto';
import { UpdateCardDto } from './dto/update-card.dto';

@Injectable()
export class CardsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  async findAll(userId: number, search?: string) {
    const where: any = { column: { userId } };

    if (search) {
      const trimmed = search.trim().slice(0, 100);
      if (trimmed) {
        where.OR = [
          { title: { contains: trimmed } },
          { content: { contains: trimmed } },
        ];
      }
    }

    return this.prisma.card.findMany({ where });
  }

  async create(userId: number, dto: CreateCardDto) {
    const column = await this.prisma.column.findUnique({
      where: { id: dto.columnId },
    });

    if (!column) {
      throw new NotFoundException(`Column with ID ${dto.columnId} not found`);
    }

    if (column.userId !== userId) {
      throw new ForbiddenException('You do not own this column');
    }

    const { columnId, ...rest } = dto;
    const card = await this.prisma.card.create({
      data: {
        ...rest,
        column: { connect: { id: columnId } },
      },
    });

    this.eventsGateway.broadcastToBoard(userId, 'board:event', { type: 'card:created', card });
    return card;
  }

  async update(id: number, userId: number, dto: UpdateCardDto) {
    const card = await this.prisma.card.findUnique({
      where: { id },
      include: { column: { select: { userId: true } } },
    });

    if (!card) {
      throw new NotFoundException(`Card with ID ${id} not found`);
    }

    if (card.column.userId !== userId) {
      throw new ForbiddenException('You do not own this card');
    }

    const { expectedUpdatedAt, ...changes } = dto;

    if (expectedUpdatedAt) {
      const expectedMs = new Date(expectedUpdatedAt).getTime();
      if (card.updatedAt.getTime() !== expectedMs) {
        throw new ConflictException('Card was updated by another user. Please refresh and try again.');
      }
    }

    if (changes.columnId && changes.columnId !== card.columnId) {
      const targetColumn = await this.prisma.column.findUnique({
        where: { id: changes.columnId },
      });
      if (!targetColumn || targetColumn.userId !== userId) {
        throw new ForbiddenException('Target column invalid or access denied');
      }
    }

    const updated = await this.prisma.card.update({
      where: { id },
      data: changes,
    });

    if (changes.columnId && changes.columnId !== card.columnId) {
      this.eventsGateway.broadcastToBoard(userId, 'board:event', {
        type: 'card:moved',
        cardId: id,
        fromColumnId: card.columnId,
        toColumnId: changes.columnId,
        order: updated.order,
      });
    } else {
      this.eventsGateway.broadcastToBoard(userId, 'board:event', {
        type: 'card:updated',
        cardId: id,
        changes: { ...changes, updatedAt: updated.updatedAt },
      });
    }

    return updated;
  }

  async remove(id: number, userId: number) {
    const card = await this.prisma.card.findUnique({
      where: { id },
      include: { column: { select: { userId: true } } },
    });

    if (!card) {
      throw new NotFoundException(`Card with ID ${id} not found`);
    }

    if (card.column.userId !== userId) {
      throw new ForbiddenException('You do not own this card');
    }

    const deleted = await this.prisma.card.delete({ where: { id } });

    this.eventsGateway.broadcastToBoard(userId, 'board:event', {
      type: 'card:deleted',
      cardId: id,
      columnId: card.columnId,
    });

    return deleted;
  }
}
