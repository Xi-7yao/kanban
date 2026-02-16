import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger'; // 👈 引入这个

export class CreateCardDto {
    @ApiProperty({ description: '卡片标题', example: '修复登录 Bug' })
    @IsString()
    @IsNotEmpty()
    title: string;

    @ApiProperty({ description: '卡片详情内容', required: false, example: '用户无法收到验证码...' })
    @IsString()
    @IsOptional()
    content?: string;

    @ApiProperty({ description: '排序权重', example: 1.5 })
    @IsNumber()
    order: number;

    @ApiProperty({ description: '所属列的 ID', example: 1 })
    @IsNumber()
    columnId: number;
}