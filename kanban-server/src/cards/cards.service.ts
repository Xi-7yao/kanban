import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCardDto } from './dto/create-card.dto';
import { UpdateCardDto } from './dto/update-card.dto';

@Injectable()
export class CardsService {
  constructor(private readonly prisma: PrismaService) {}

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
    return this.prisma.card.create({
      data: {
        ...rest,
        column: { connect: { id: columnId } },
      },
    });
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

    // If moving to a different column, verify ownership of the target column
    if (dto.columnId && dto.columnId !== card.columnId) {
      const targetColumn = await this.prisma.column.findUnique({
        where: { id: dto.columnId },
      });

      if (!targetColumn) {
        throw new NotFoundException(`Target column with ID ${dto.columnId} not found`);
      }

      if (targetColumn.userId !== userId) {
        throw new ForbiddenException('You do not own the target column');
      }
    }

    return this.prisma.card.update({
      where: { id },
      data: dto,
    });
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

    return this.prisma.card.delete({ where: { id } });
  }
}
