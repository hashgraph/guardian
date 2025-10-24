import { ApiProperty } from '@nestjs/swagger';

export class BlockDTO {
    @ApiProperty({ type: 'string' })
    id: string;

    @ApiProperty({ type: 'string' })
    blockType: string;

    @ApiProperty({ type: () => BlockDTO, isArray: true })
    blocks: BlockDTO[];
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
}
