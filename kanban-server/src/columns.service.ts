import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
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

  async create(userId: number, createColumnDto: CreateColumnDto) {
    return this.prisma.column.create({
      data: {
        ...createColumnDto,
        userId,
      },
    });
  }

  async update(id: number, updateColumnDto: UpdateColumnDto) {
    return this.prisma.column.update({
      where: { id },
      data: updateColumnDto,
    });
  }

  async remove(id: number) {
    return this.prisma.column.delete({
      where: { id },
    });
  }
}