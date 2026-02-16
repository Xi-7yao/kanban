import { IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCardDto {
  @ApiProperty({ description: '卡片标题', example: '修复登录 Bug' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiProperty({ description: '卡片详情内容', required: false, example: '用户无法收到验证码...' })
  @IsString()
  @IsOptional()
  content?: string;

  @ApiProperty({ description: '排序权重', example: 0 })
  @IsNumber()
  @Min(0)
  order: number;

  @ApiProperty({ description: '所属列的 ID', example: 1 })
  @IsNumber()
  columnId: number;
}
