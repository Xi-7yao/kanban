import { Transform } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCardDto {
  @ApiProperty({ description: 'Card title', example: 'Fix login bug' })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @MaxLength(200)
  title: string;

  @ApiProperty({
    description: 'Card details',
    required: false,
    example: 'Users are not receiving the verification code.',
  })
  @IsString()
  @IsOptional()
  @MaxLength(5000)
  content?: string;

  @ApiProperty({ description: 'Sort order', example: 0 })
  @IsNumber({ allowNaN: false, allowInfinity: false })
  order: number;

  @ApiProperty({ description: 'Owning column ID', example: 1 })
  @IsNumber({ allowNaN: false, allowInfinity: false })
  columnId: number;
}
