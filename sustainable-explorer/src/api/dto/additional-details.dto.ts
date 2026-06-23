import { ApiProperty } from '@nestjs/swagger';

/**
 * Response shapes for GET /:id/additional-details.
 *
 * These mirror the precomputed `message.decodedDetails` payload
 * (src/shared/vc-detail/vc-detail.types.ts) — the structured "Detailed
 * Information" the project detail page renders, grouped by schema.
 */

export class VcFieldDto {
    @ApiProperty({ description: 'Human-readable field title (resolved from the policy schema)' })
    label: string;

    @ApiProperty({ description: 'Formatted field value' })
    value: string;

    @ApiProperty({ required: false, nullable: true, description: 'Field description (tooltip), when defined by the schema' })
    description?: string;
}

export class VcTableDto {
    @ApiProperty({ description: 'Table title (resolved from the policy schema)' })
    label: string;

    @ApiProperty({ type: [String], description: 'Raw column keys (humanize on display)' })
    columns: string[];

    @ApiProperty({
        type: 'array',
        items: { type: 'object', additionalProperties: { type: 'string' } },
        description: 'Row objects keyed by column',
    })
    rows: Record<string, string>[];
}

export class VcGroupDto {
    @ApiProperty({ description: 'Group title (nested schema name or parent field title)' })
    title: string;

    @ApiProperty({ type: [VcFieldDto] })
    fields: VcFieldDto[];

    @ApiProperty({ type: [VcTableDto] })
    tables: VcTableDto[];
}

export class VcDocDataDto {
    @ApiProperty({ type: [VcFieldDto] })
    fields: VcFieldDto[];

    @ApiProperty({ type: [VcTableDto] })
    tables: VcTableDto[];

    @ApiProperty({ type: [VcGroupDto] })
    groups: VcGroupDto[];
}

export class AdditionalDetailsSchemaDto {
    @ApiProperty({ description: 'Bare schema UUID these records were issued against' })
    schemaUuid: string;

    @ApiProperty({ nullable: true, description: 'Human-readable schema name from the policy zip; null when unmapped' })
    schemaName: string | null;

    @ApiProperty({ description: 'Coarse Guardian document type (pdd | monitoringReport | verificationReport | …)' })
    docType: string;

    @ApiProperty({ type: [VcDocDataDto], description: 'One decoded record per linked VC carrying this schema' })
    records: VcDocDataDto[];
}
