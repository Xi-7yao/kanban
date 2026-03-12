import { IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateColumnDto {
  @ApiProperty({ description: 'Column title', required: false, example: 'To Do' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  title?: string;

  @ApiProperty({ description: 'Column sort order', required: false, example: 1.5 })
  @IsNumber()
  @IsOptional()
  order?: number;

  @ApiProperty({
    description: 'Expected updatedAt for optimistic concurrency control',
    required: false,
    example: '2026-03-12T10:00:00.000Z',
  })
  @IsString()
  @IsOptional()
  expectedUpdatedAt?: string;
}
