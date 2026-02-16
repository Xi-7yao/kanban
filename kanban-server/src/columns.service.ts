import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { CreateColumnDto } from './dto/create-column.dto';
import { UpdateColumnDto } from './dto/update-column.dto';

@Injectable()
export class ColumnsService {
  constructor(private readonly prisma: PrismaService) {}

  // 1. 获取完整看板 (包含卡片)
  async getBoard() {
    return this.prisma.column.findMany({
      include: {
        cards: {
          orderBy: { order: 'asc' }, // 保证卡片按顺序返回
        },
      },
      orderBy: { order: 'asc' }, // 保证列按顺序返回
    });
  }

  async create(createColumnDto: CreateColumnDto) {
    return this.prisma.column.create({
      data: createColumnDto,
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