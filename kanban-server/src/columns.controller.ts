import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseIntPipe,
    Post,
    Put
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ColumnsService } from './columns.service';
import { CreateColumnDto } from './dto/create-column.dto';
import { UpdateColumnDto } from './dto/update-column.dto';

@ApiTags('Columns')
@Controller('columns') // ✅ 路由前缀统一为 /columns
export class ColumnsController {
    constructor(private readonly columnsService: ColumnsService) { }

    @Get()
    @ApiOperation({ summary: '获取看板列 (包含卡片)' })
    findAll() {
        return this.columnsService.getBoard();
    }

    @Post()
    @ApiOperation({ summary: '创建新列' })
    create(@Body() body: CreateColumnDto) {
        return this.columnsService.create(body);
    }

    @Put(':id')
    @ApiOperation({ summary: '更新列' })
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: UpdateColumnDto
    ) {
        return this.columnsService.update(id, body);
    }

    @Delete(':id')
    @ApiOperation({ summary: '删除列' })
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.columnsService.remove(id);
    }
}