import { ApiProperty } from '@nestjs/swagger';
import { SchemaDTO } from './schemas.dto.js';

export class SchemaDeletionPreviewDTO {
    @ApiProperty({
        type: () => SchemaDTO,
        isArray: true,
        nullable: true
    })
    deletableChildren: SchemaDTO[];

    @ApiProperty({
        type: () => ChildSchemaDeletionBlockDTO,
        isArray: true,
        nullable: true
    })
    blockedChildren: ChildSchemaDeletionBlockDTO[];
}

export class ChildSchemaDeletionBlockDTO {
    @ApiProperty({
        type: () => SchemaDTO,
        isArray: false,
        nullable: true
    })
    schema: SchemaDTO;

    @ApiProperty({
        type: () => SchemaDTO,
        isArray: false,
        nullable: true
    })
    blockingSchemas: SchemaDTO[];
}