import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseIntPipe,
    Post,
    Put,
    Req,
    UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiOperation, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ColumnsService } from './columns.service';
import { CreateColumnDto } from './dto/create-column.dto';
import { UpdateColumnDto } from './dto/update-column.dto';

@ApiTags('Columns')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('columns')
export class ColumnsController {
    constructor(private readonly columnsService: ColumnsService) { }

    @Get()
    @ApiOperation({ summary: '获取看板列 (包含卡片)' })
    findAll(@Req() req) {
        return this.columnsService.getBoard(req.user.userId);
    }

    @Post()
    @ApiOperation({ summary: '创建新列' })
    create(@Req() req, @Body() body: CreateColumnDto) {
        return this.columnsService.create(req.user.userId, body);
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