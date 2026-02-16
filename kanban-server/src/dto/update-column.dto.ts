import { IsString, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateColumnDto {
    @ApiProperty({ description: '列标题', required: false, example: '待办事项' })
    @IsString()
    @IsOptional()
    title?: string; // 允许只改标题

    @ApiProperty({ description: '列排序权重', required: false, example: 1.5 })
    @IsNumber()
    @IsOptional()
    order?: number; // 允许只改顺序
}