import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiOperation, ApiTags, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { CardsService } from './cards.service';
import { CreateCardDto } from './dto/create-card.dto';
import { UpdateCardDto } from './dto/update-card.dto';
import { GetUser } from '../common/decorators/get-user.decorator';
import type { JwtPayload } from '../common/interfaces/jwt-payload.interface';

@ApiTags('Cards')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('cards')
export class CardsController {
  constructor(private readonly cardsService: CardsService) {}

  @Get()
  @ApiOperation({ summary: '获取卡片列表（支持搜索，仅返回当前用户的卡片）' })
  @ApiQuery({ name: 'q', required: false, description: '搜索关键字（标题或内容）' })
  findAll(@GetUser() user: JwtPayload, @Query('q') search?: string) {
    return this.cardsService.findAll(user.userId, search);
  }

  @Post()
  @ApiOperation({ summary: '创建卡片' })
  create(@GetUser() user: JwtPayload, @Body() dto: CreateCardDto) {
    return this.cardsService.create(user.userId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新卡片' })
  update(
    @GetUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCardDto,
  ) {
    return this.cardsService.update(id, user.userId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除卡片' })
  remove(
    @GetUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.cardsService.remove(id, user.userId);
  }
}
