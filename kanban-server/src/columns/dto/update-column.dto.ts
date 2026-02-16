import { IsString, IsNumber, IsOptional, MaxLength, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateColumnDto {
  @ApiProperty({ description: '列标题', required: false, example: '待办事项' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  title?: string;

  @ApiProperty({ description: '列排序权重', required: false, example: 1.5 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  order?: number;
}
