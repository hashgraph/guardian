import { IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateMappingDto {
    @ApiProperty({
        description:
            'Partial or full cross-schema field map. Each key is a project field label ' +
            '(e.g. "Project Title") and each value is a fully-qualified schema path of the ' +
            'form "schemaId.fieldPath" (e.g. "abc123.projectName"). ' +
            'Only the keys present in this object are overwritten — other existing mappings ' +
            'are preserved, making this a PATCH-style merge.',
        example: { 'Project Title': 'abc123.projectName', 'Country': 'abc123.country' },
        type: 'object',
        additionalProperties: { type: 'string' },
    })
    @IsObject()
    fieldMap: Record<string, string>;
}
