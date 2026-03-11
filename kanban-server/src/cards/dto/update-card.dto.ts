import { PartialType } from '@nestjs/swagger';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';
import { CreateCardDto } from './create-card.dto';

export class UpdateCardDto extends PartialType(CreateCardDto) {
  @ApiPropertyOptional({
    description: 'Expected updatedAt timestamp used for optimistic concurrency control',
    example: '2026-03-11T10:45:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  expectedUpdatedAt?: string;
}
