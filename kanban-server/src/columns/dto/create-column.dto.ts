import { IsNotEmpty, IsNumber, IsString, MaxLength, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateColumnDto {
  @ApiProperty({ description: '列标题', example: '待办事项' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  title: string;

  @ApiProperty({ description: '列排序权重', example: 0 })
  @IsNumber()
  @Min(0)
  order: number;
}
