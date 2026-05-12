import { IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateMappingDto {
    @ApiProperty({
        description:
            'Partial or full cross-schema field map. Each key is a project field label ' +
            '(e.g. "Project Title") and each value is either a fully-qualified schema path of the ' +
            'form "schemaId.fieldPath" (e.g. "abc123.projectName") OR `null`/empty string to ' +
            '*unset* that label. Only the keys present in this object are touched — other existing ' +
            'mappings are preserved, making this a PATCH-style merge.',
        example: { 'Project Title': 'abc123.projectName', 'Country': null },
        type: 'object',
        additionalProperties: { type: 'string', nullable: true },
    })
    @IsObject()
    fieldMap: Record<string, string | null>;
}
