import { IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger'; // 👈 引入这个

export class CreateColumnDto {
  @ApiProperty({ description: '列标题', example: '待办事项' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: '列排序权重', example: 1.5 })
  @IsNumber()
  order: number;
}