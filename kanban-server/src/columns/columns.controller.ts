import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiOperation, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ColumnsService } from './columns.service';
import { CreateColumnDto } from './dto/create-column.dto';
import { UpdateColumnDto } from './dto/update-column.dto';
import { GetUser } from '../common/decorators/get-user.decorator';
import type { JwtPayload } from '../common/interfaces/jwt-payload.interface';

@ApiTags('Columns')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('columns')
export class ColumnsController {
  constructor(private readonly columnsService: ColumnsService) {}

  @Get()
  @ApiOperation({ summary: '获取当前用户的看板列（包含卡片）' })
  findAll(@GetUser() user: JwtPayload) {
    return this.columnsService.getBoard(user.userId);
  }

  @Post()
  @ApiOperation({ summary: '创建新列' })
  create(@GetUser() user: JwtPayload, @Body() dto: CreateColumnDto) {
    return this.columnsService.create(user.userId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新列' })
  update(
    @GetUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateColumnDto,
  ) {
    return this.columnsService.update(id, user.userId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除列' })
  remove(
    @GetUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.columnsService.remove(id, user.userId);
  }
}
