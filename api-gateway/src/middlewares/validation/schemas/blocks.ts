import { ApiExtraModels, ApiProperty } from '@nestjs/swagger';

export class BlockDTO {
    @ApiProperty({ type: 'string' })
    id: string;

    @ApiProperty({ type: 'string' })
    blockType: string;

    @ApiProperty({ type: () => BlockDTO, isArray: true })
    blocks: BlockDTO[];
}

@ApiExtraModels(BlockDTO)
export class ResponseDTOWithSyncEvents {
  @ApiProperty({
    type: 'object',
    nullable: true,
    additionalProperties: true,
  })
  response: Record<string, any> | null;

  @ApiProperty({
    type: 'object',
    nullable: true,
    additionalProperties: true,
  })
  result: Record<string, any> | null;

  @ApiProperty({
    type: 'object',
    isArray: true,
    additionalProperties: true,
  })
  steps: Record<string, any>[];
}

export class BlockErrorsDTO {
    @ApiProperty({ type: 'string' })
    id: string;

    @ApiProperty({ type: 'string' })
    name: string;

    @ApiProperty({ type: 'string', isArray: true })
    errors: string[];

    @ApiProperty({ type: 'string', isArray: true, required: false })
    warnings?: string[];

    @ApiProperty({ type: 'string', isArray: true, required: false })
    infos?: string[];

    @ApiProperty({ type: 'boolean' })
    isValid: boolean;
}

export class ValidationErrorsDTO {
    @ApiProperty({ type: () => BlockErrorsDTO, isArray: true, nullable: true })
    blocks?: BlockErrorsDTO[];

    @ApiProperty({ type: 'string', isArray: true, nullable: true })
    errors?: string[];

    @ApiProperty({ type: 'string', isArray: true, required: false })
    warnings?: string[];

    @ApiProperty({ type: 'string', isArray: true, required: false })
    infos?: string[];

    @ApiProperty({ type: 'string', required: false, description: 'Config block ID (for tool validation)' })
    id?: string;

    @ApiProperty({ type: 'array', items: { type: 'object' }, description: 'Tool-level errors (for tool validation)' })
    tools?: any[];

    @ApiProperty({ type: 'boolean', description: 'Overall validation result (for tool validation)' })
    isValid?: boolean;
}
