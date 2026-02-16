import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseIntPipe,
    Post,
    Put,
    Query
} from '@nestjs/common';
import { ApiOperation, ApiTags, ApiQuery } from '@nestjs/swagger';
import { CardsService } from './cards.service';
import { CreateCardDto } from './dto/create-card.dto';
import { UpdateCardDto } from './dto/update-card.dto';

@ApiTags('Cards')
@Controller('cards') // ✅ 路由前缀统一为 /cards
export class CardsController {
    constructor(private readonly cardsService: CardsService) { }

    @Get()
    @ApiOperation({ summary: '获取卡片列表 (支持搜索)' })
    @ApiQuery({ name: 'q', required: false, description: '搜索关键字 (标题或内容)' })
    findAll(@Query('q') search?: string) {
        // ✅ 改造点：从 URL Param 改为 Query Param (?q=xxx)
        // 这样不仅符合 RESTful，而且当前端没有传 q 时，prisma 会自动返回所有数据
        return this.cardsService.findAll(search);
    }

    @Post()
    @ApiOperation({ summary: '创建卡片' })
    create(@Body() body: CreateCardDto) {
        return this.cardsService.create(body);
    }

    @Put(':id')
    @ApiOperation({ summary: '更新卡片' })
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: UpdateCardDto
    ) {
        return this.cardsService.update(id, body);
    }

    @Delete(':id')
    @ApiOperation({ summary: '删除卡片' })
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.cardsService.remove(id);
    }
}