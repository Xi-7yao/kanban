import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateColumnDto } from './dto/create-column.dto';
import { UpdateColumnDto } from './dto/update-column.dto';

@Injectable()
export class ColumnsService {
  constructor(private readonly prisma: PrismaService) {}

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
    return this.prisma.column.create({
      data: { ...dto, userId },
    });
  }

  async update(id: number, userId: number, dto: UpdateColumnDto) {
    const column = await this.prisma.column.findUnique({ where: { id } });

    if (!column) {
      throw new NotFoundException(`Column with ID ${id} not found`);
    }

    if (column.userId !== userId) {
      throw new ForbiddenException('You do not own this column');
    }

    return this.prisma.column.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: number, userId: number) {
    const column = await this.prisma.column.findUnique({ where: { id } });

    if (!column) {
      throw new NotFoundException(`Column with ID ${id} not found`);
    }

    if (column.userId !== userId) {
      throw new ForbiddenException('You do not own this column');
    }

    return this.prisma.column.delete({ where: { id } });
  }
}
