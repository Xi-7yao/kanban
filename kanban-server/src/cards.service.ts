import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { CreateCardDto } from './dto/create-card.dto';
import { UpdateCardDto } from './dto/update-card.dto';

@Injectable()
export class CardsService {
  constructor(private readonly prisma: PrismaService) { }

  async findAll(search?: string) {
    if (search) {
      return this.prisma.card.findMany({
        where: {
          OR: [
            { title: { contains: search } },
            { content: { contains: search } },
          ],
        },
      });
    }
    return this.prisma.card.findMany();
  }

  async create(createCardDto: CreateCardDto) {
    const { columnId, ...rest } = createCardDto;

    return this.prisma.card.create({
      data: {
        ...rest,
        column: {
          connect: { id: columnId },
        },
      },
    });
  }

  async update(id: number, updateCardDto: UpdateCardDto) {
    return this.prisma.card.update({
      where: { id },
      data: updateCardDto,
    });
  }

  async remove(id: number) {
    return this.prisma.card.delete({
      where: { id },
    });
  }
}