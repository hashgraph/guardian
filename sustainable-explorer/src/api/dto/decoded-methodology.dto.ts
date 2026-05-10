import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ---------------------------------------------------------------------------
// Sub-types
// ---------------------------------------------------------------------------

export class ResolvedFieldDto {
    @ApiProperty({ description: 'Schema field key (e.g. "G2")' })
    fieldKey: string;

    @ApiProperty({ description: 'Human-readable title from the schema (e.g. "Project Name")' })
    title: string;

    @ApiProperty({ description: 'Field description from the schema' })
    description: string;
}

export class ResolvedFieldsDto {
    @ApiPropertyOptional({ type: ResolvedFieldDto, nullable: true })
    name: ResolvedFieldDto | null;

    @ApiPropertyOptional({ type: ResolvedFieldDto, nullable: true })
    country: ResolvedFieldDto | null;

    @ApiPropertyOptional({ type: ResolvedFieldDto, nullable: true })
    developer: ResolvedFieldDto | null;

    @ApiPropertyOptional({ type: ResolvedFieldDto, nullable: true })
    category: ResolvedFieldDto | null;

    @ApiPropertyOptional({ type: ResolvedFieldDto, nullable: true })
    scale: ResolvedFieldDto | null;

    @ApiPropertyOptional({ type: ResolvedFieldDto, nullable: true })
    sector: ResolvedFieldDto | null;

    @ApiPropertyOptional({ type: ResolvedFieldDto, nullable: true })
    vintageRaw: ResolvedFieldDto | null;

    @ApiPropertyOptional({ type: ResolvedFieldDto, nullable: true })
    creditingPeriod: ResolvedFieldDto | null;

    @ApiPropertyOptional({ type: ResolvedFieldDto, nullable: true })
    sdgOrCobenefits: ResolvedFieldDto | null;
}

export class FieldMapEntryDto {
    @ApiProperty({ description: 'Schema field key (e.g. "G2")' })
    fieldKey: string;

    @ApiProperty({ description: 'Human-readable title' })
    title: string;

    @ApiProperty({ description: 'Field description' })
    description: string;

    @ApiPropertyOptional({
        nullable: true,
        description: 'Which resolved project property this field was mapped to, or null if not mapped',
    })
    resolvedAs: string | null;
}

export class SchemaFieldDto {
    @ApiProperty({ description: 'Schema field key (e.g. "G2", "field22")' })
    fieldKey: string;

    @ApiProperty({ description: 'Human-readable title' })
    title: string;

    @ApiProperty({ description: 'Field description' })
    description: string;

    @ApiProperty({ description: 'JSON-schema type (string, number, object, array, etc.)' })
    type: string;

    @ApiProperty({ description: 'True when the field is a structured GeoJSON geometry' })
    isGeoJson: boolean;
}

export class SchemaSummaryDto {
    @ApiProperty({ description: 'Schema UUID from policy_schema.schemaId' })
    schemaId: string;

    @ApiPropertyOptional({ nullable: true, description: 'Schema name' })
    schemaName: string | null;

    @ApiPropertyOptional({ nullable: true, description: 'Schema description' })
    schemaDescription: string | null;

    @ApiProperty({ description: 'True when this schema was confirmed as the project schema' })
    isProjectSchema: boolean;

    @ApiProperty({ description: 'True when this schema has any GeoJSON-typed field' })
    hasGeoJsonField: boolean;

    @ApiProperty({ type: [SchemaFieldDto], description: 'All top-level fields of this schema' })
    fields: SchemaFieldDto[];
}

export class ProjectSchemaDto {
    @ApiProperty({ description: 'UUID of the policy schema identified as the project schema' })
    schemaId: string;

    @ApiPropertyOptional({ nullable: true, description: 'Name of the schema from policy_schema.name' })
    schemaName: string | null;

    @ApiPropertyOptional({ nullable: true, description: 'Description of the schema from policy_schema.description' })
    schemaDescription: string | null;

    @ApiProperty({ description: 'Field key for the GeoJSON geometry field' })
    geoKey: string;

    @ApiPropertyOptional({ nullable: true, description: 'Human-readable title of the geoKey field' })
    geoFieldTitle: string | null;

    @ApiPropertyOptional({ nullable: true, description: 'Wrapper property key when the project fields are nested one level deep' })
    section: string | null;

    @ApiProperty({ type: ResolvedFieldsDto, description: 'Resolved field mappings for each project property' })
    resolvedFields: ResolvedFieldsDto;

    @ApiProperty({
        type: [FieldMapEntryDto],
        description: 'All available fields in the schema (excluding geo fields). Includes which resolved property each field was mapped to.',
    })
    fieldMap: FieldMapEntryDto[];
}

// ---------------------------------------------------------------------------
// Top-level response DTO
// ---------------------------------------------------------------------------

export class DecodedMethodologyResponseDto {
    @ApiProperty({ description: 'Hedera policy topic ID of the methodology' })
    policyTopicId: string;

    @ApiProperty({
        enum: ['success', 'failed', 'pending', 'unknown'],
        description:
            '"unknown" when no policy_decode_status row exists yet; ' +
            'otherwise the status stored by the worker.',
    })
    decodeStatus: 'success' | 'failed' | 'pending' | 'unknown';

    @ApiPropertyOptional({ nullable: true, description: 'Error message from the last failed decode attempt' })
    decodeError: string | null;

    @ApiProperty({ description: 'Number of decode attempts made so far (0 when status is unknown)' })
    attempts: number;

    @ApiPropertyOptional({ nullable: true, description: 'ISO 8601 timestamp of the last decode attempt' })
    lastAttemptAt: string | null;

    @ApiPropertyOptional({
        type: ProjectSchemaDto,
        nullable: true,
        description:
            'Resolved project schema details. Null when no confirmed project schema exists ' +
            '(decode may still be pending or failed, or the policy has no matching schema).',
    })
    projectSchema: ProjectSchemaDto | null;

    @ApiProperty({
        type: [SchemaSummaryDto],
        description:
            'All schemas imported from this policy. Always populated when decode succeeded. ' +
            'Frontend can fall back to this when projectSchema is null to show what was decoded.',
    })
    availableSchemas: SchemaSummaryDto[];

    // ---------------------------------------------------------------------------
    // Static factory
    // ---------------------------------------------------------------------------

    static fromRow(row: DecodedMethodologyRow): DecodedMethodologyResponseDto {
        const dto = new DecodedMethodologyResponseDto();
        dto.policyTopicId = row.policyTopicId;
        dto.decodeStatus = row.decodeStatus;
        dto.decodeError = row.decodeError;
        dto.attempts = row.attempts;
        dto.lastAttemptAt = row.lastAttemptAt ? new Date(row.lastAttemptAt).toISOString() : null;
        dto.availableSchemas = (row.allSchemas ?? []).map(s => DecodedMethodologyResponseDto.summarizeSchema(s));

        if (!row.projectSchemaConfig) {
            dto.projectSchema = null;
            return dto;
        }

        const config = row.projectSchemaConfig;
        const fieldMap = (config.fieldMap ?? {}) as Record<string, { title: string; description: string; isGeoJson?: boolean }>;
        const resolvedFields = (config.resolvedFields ?? {}) as Record<string, string | null>;

        // Build reverse map: fieldKey → resolvedAs name
        const fieldKeyToResolvedAs = new Map<string, string>();
        for (const [propName, fieldKey] of Object.entries(resolvedFields)) {
            if (typeof fieldKey === 'string' && fieldKey) {
                fieldKeyToResolvedAs.set(fieldKey, propName);
            }
        }

        const geoKey = typeof config.geoKey === 'string' ? config.geoKey : '';
        const geoFieldDef = fieldMap[geoKey];

        const buildResolvedField = (fieldKey: string | null | undefined): ResolvedFieldDto | null => {
            if (!fieldKey) return null;
            const def = fieldMap[fieldKey];
            if (!def) return null;
            return { fieldKey, title: def.title ?? fieldKey, description: def.description ?? '' };
        };

        dto.projectSchema = {
            schemaId: row.schemaId ?? '',
            schemaName: row.schemaName ?? null,
            schemaDescription: row.schemaDescription ?? null,
            geoKey,
            geoFieldTitle: geoFieldDef ? (geoFieldDef.title ?? null) : null,
            section: typeof config.section === 'string' ? config.section : null,
            resolvedFields: {
                name: buildResolvedField(resolvedFields['name']),
                country: buildResolvedField(resolvedFields['country']),
                developer: buildResolvedField(resolvedFields['developer']),
                category: buildResolvedField(resolvedFields['category']),
                scale: buildResolvedField(resolvedFields['scale']),
                sector: buildResolvedField(resolvedFields['sector']),
                vintageRaw: buildResolvedField(resolvedFields['vintageRaw']),
                creditingPeriod: buildResolvedField(resolvedFields['creditingPeriod']),
                sdgOrCobenefits: buildResolvedField(resolvedFields['sdgOrCobenefits']),
            },
            fieldMap: Object.entries(fieldMap)
                .filter(([, def]) => !def.isGeoJson)
                .map(([fieldKey, def]) => ({
                    fieldKey,
                    title: def.title ?? fieldKey,
                    description: def.description ?? '',
                    resolvedAs: fieldKeyToResolvedAs.get(fieldKey) ?? null,
                })),
        };

        return dto;
    }

    /**
     * Summarize a single policy_schema row into the SchemaSummaryDto shape.
     * Reads the JSON-Schema document's top-level `properties` block and emits
     * one entry per field, marking GeoJSON-typed ones with isGeoJson = true.
     */
    private static summarizeSchema(s: PolicySchemaSummaryRow): SchemaSummaryDto {
        const doc = (s.document ?? {}) as Record<string, any>;
        const props = (doc.properties ?? {}) as Record<string, any>;
        const fields: SchemaFieldDto[] = [];
        let hasGeoJsonField = false;

        for (const [fieldKey, def] of Object.entries(props)) {
            if (!def || typeof def !== 'object') continue;
            const ref = String(def['$ref'] ?? '');
            const format = String(def['format'] ?? '').toLowerCase();
            const innerProps = (def['properties'] ?? {}) as Record<string, any>;
            const itemsRef = String(((def['items'] ?? {}) as Record<string, any>)['$ref'] ?? '');
            const isGeoJson =
                ref.includes('GeoJSON') ||
                itemsRef.includes('GeoJSON') ||
                format === 'geojson' ||
                format === 'geo-json' ||
                ('type' in innerProps && 'coordinates' in innerProps);
            if (isGeoJson) hasGeoJsonField = true;

            fields.push({
                fieldKey,
                title: typeof def.title === 'string' ? def.title : fieldKey,
                description: typeof def.description === 'string' ? def.description : '',
                type: typeof def.type === 'string' ? def.type : '',
                isGeoJson,
            });
        }

        return {
            schemaId: s.schemaId,
            schemaName: s.name,
            schemaDescription: s.description,
            isProjectSchema: s.isProjectSchema === true,
            hasGeoJsonField,
            fields,
        };
    }
}

// ---------------------------------------------------------------------------
// Internal row types returned by the repository
// ---------------------------------------------------------------------------

export interface PolicySchemaSummaryRow {
    schemaId: string;
    name: string | null;
    description: string | null;
    isProjectSchema: boolean | null;
    document: Record<string, unknown> | null;
}

export interface DecodedMethodologyRow {
    policyTopicId: string;
    decodeStatus: 'success' | 'failed' | 'pending' | 'unknown';
    decodeError: string | null;
    attempts: number;
    lastAttemptAt: string | null;
    /** UUID of the schema that was confirmed as the project schema, or null */
    schemaId: string | null;
    schemaName: string | null;
    schemaDescription: string | null;
    /** Parsed projectSchemaConfig jsonb, or null */
    projectSchemaConfig: Record<string, unknown> | null;
    /** All schemas imported for this policy. Empty when no schemas have been imported yet. */
    allSchemas: PolicySchemaSummaryRow[];
}
