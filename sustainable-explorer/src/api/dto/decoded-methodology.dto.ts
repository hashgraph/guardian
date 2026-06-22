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
    description: ResolvedFieldDto | null;

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
    creditingPeriodStart: ResolvedFieldDto | null;

    @ApiPropertyOptional({ type: ResolvedFieldDto, nullable: true })
    creditingPeriodEnd: ResolvedFieldDto | null;

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
    @ApiProperty({ description: 'Schema IRI / UUID from the policy zip' })
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

    @ApiPropertyOptional({ nullable: true, description: 'Name of the project schema from the policy zip' })
    schemaName: string | null;

    @ApiPropertyOptional({ nullable: true, description: 'Description of the project schema from the policy zip' })
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
            '"unknown" when no policy row exists yet; ' +
            'otherwise the decode status stored by the worker.',
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
        // Build a UUID → schema map so summarizeSchema can follow array-item
        // $refs (e.g. `locations: { items: { $ref: "#<UUID>" } }`) and surface
        // those nested fields as user-pickable paths in the editor.
        const schemasByUuid = new Map<string, PolicySchemaSummaryRow>();
        for (const s of row.allSchemas ?? []) {
            if (s.schemaId) schemasByUuid.set(s.schemaId, s);
        }
        dto.availableSchemas = (row.allSchemas ?? [])
            .map(s => DecodedMethodologyResponseDto.summarizeSchema(s, schemasByUuid));

        // Augment each schema's fields with deeply-nested paths from row.schemaFields
        // (e.g., projectDetails.projectLocation.projectSiteCountryarea). The
        // summarizeSchema walker only goes 1-2 levels deep; schemaFields was
        // already computed by the decoder with full ancestor chains and is the
        // authoritative source for user-pickable paths.
        if (Array.isArray(row.schemaFields) && row.schemaFields.length > 0) {
            const schemaByIri = new Map(dto.availableSchemas.map(s => [s.schemaId, s]));
            for (const sf of row.schemaFields) {
                if (!sf || !sf.path || !sf.schemaIri) continue;
                const target = schemaByIri.get(sf.schemaIri);
                if (!target) continue;
                if (target.fields.some(f => f.fieldKey === sf.path)) continue;
                target.fields.push({
                    fieldKey: sf.path,
                    title: sf.title || sf.path,
                    description: sf.description || '',
                    type: sf.type || '',
                    isGeoJson: !!sf.isGeoJson,
                });
            }
        }

        if (!row.projectSchemaConfig) {
            dto.projectSchema = null;
            return dto;
        }

        const config = row.projectSchemaConfig;
        const fieldMap = (config.fieldMap ?? {}) as Record<string, { title: string; description: string; isGeoJson?: boolean }>;
        const resolvedFields = (config.resolvedFields ?? {}) as Record<string, string | null>;

        const globalFieldIndex = new Map<string, { title: string; description: string }>();
        for (const s of dto.availableSchemas) {
            for (const f of s.fields) {
                if (!globalFieldIndex.has(f.fieldKey)) {
                    globalFieldIndex.set(f.fieldKey, { title: f.title, description: f.description });
                }
            }
        }
        const lookupFieldDef = (fieldKey: string): { title: string; description: string } | null => {
            const local = fieldMap[fieldKey];
            if (local) return { title: local.title ?? fieldKey, description: local.description ?? '' };
            const global = globalFieldIndex.get(fieldKey);
            if (global) return { title: global.title || fieldKey, description: global.description || '' };
            return null;
        };

        // Build reverse map: fieldKey → resolvedAs name
        const fieldKeyToResolvedAs = new Map<string, string>();
        for (const [propName, fieldKey] of Object.entries(resolvedFields)) {
            if (typeof fieldKey === 'string' && fieldKey) {
                fieldKeyToResolvedAs.set(fieldKey, propName);
            }
        }

        const geoKey = typeof config.geoKey === 'string' ? config.geoKey : '';
        const geoFieldDef = lookupFieldDef(geoKey);

        const buildResolvedField = (fieldKey: string | null | undefined): ResolvedFieldDto | null => {
            if (!fieldKey) return null;
            const def = lookupFieldDef(fieldKey);
            if (!def) return null;
            return { fieldKey, title: def.title, description: def.description };
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
                description: buildResolvedField(resolvedFields['description']),
                country: buildResolvedField(resolvedFields['country']),
                developer: buildResolvedField(resolvedFields['developer']),
                category: buildResolvedField(resolvedFields['category']),
                scale: buildResolvedField(resolvedFields['scale']),
                sector: buildResolvedField(resolvedFields['sector']),
                vintageRaw: buildResolvedField(resolvedFields['vintageRaw']),
                creditingPeriod: buildResolvedField(resolvedFields['creditingPeriod']),
                creditingPeriodStart: buildResolvedField(resolvedFields['creditingPeriodStart']),
                creditingPeriodEnd: buildResolvedField(resolvedFields['creditingPeriodEnd']),
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
     * Summarize a single schema entry into the SchemaSummaryDto shape.
     * Emits one entry per top-level property AND one entry per nested
     * property (one level deep), so the mapping editor can offer paths like
     * `location.country`. This mirrors the candidate-collection logic in
     * `CrossSchemaFuzzyMapperService`, which already understands the same
     * `<top>.<nested>` path shape on the worker side.
     */
    private static summarizeSchema(
        s: PolicySchemaSummaryRow,
        schemasByUuid?: Map<string, PolicySchemaSummaryRow>,
    ): SchemaSummaryDto {
        const doc = (s.document ?? {}) as Record<string, any>;
        const props = (doc.properties ?? {}) as Record<string, any>;
        const fields: SchemaFieldDto[] = [];
        let hasGeoJsonField = false;

        const NESTED_SKIP_KEYS = new Set(['@context', 'type', 'id', 'coordinates']);

        // Pull a child schema's properties when a $ref points at another
        // schema in this policy. Refs look like `#<UUID>&<version>`; we
        // extract the UUID and look it up in the map.
        const refToProps = (ref: string): Record<string, any> | null => {
            if (!ref || !schemasByUuid) return null;
            const m = ref.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
            const uuid = m?.[1];
            if (!uuid) return null;
            const target = schemasByUuid.get(uuid);
            const targetDoc = (target?.document ?? {}) as Record<string, any>;
            const targetProps = targetDoc.properties as Record<string, any> | undefined;
            return targetProps ?? null;
        };

        for (const [fieldKey, def] of Object.entries(props)) {
            if (!def || typeof def !== 'object') continue;
            const ref = String(def['$ref'] ?? '');
            const format = String(def['format'] ?? '').toLowerCase();
            const innerProps = (def['properties'] ?? {}) as Record<string, any>;
            const itemsRef = String(((def['items'] ?? {}) as Record<string, any>)['$ref'] ?? '');
            const isArray = def['type'] === 'array';
            const isGeoJson =
                ref.includes('GeoJSON') ||
                itemsRef.includes('GeoJSON') ||
                format === 'geojson' ||
                format === 'geo-json' ||
                ('type' in innerProps && 'coordinates' in innerProps);
            if (isGeoJson) hasGeoJsonField = true;

            const topTitle = typeof def.title === 'string' ? def.title : fieldKey;
            fields.push({
                fieldKey,
                title: topTitle,
                description: typeof def.description === 'string' ? def.description : '',
                type: typeof def.type === 'string' ? def.type : '',
                isGeoJson,
            });

            // Skip nested children of a GeoJSON-shaped field — those are
            // geometry internals (type/coordinates), not user-pickable fields.
            if (isGeoJson) continue;

            // Collect nested child properties to surface. We pull from three
            // possible sources, in order:
            //   1. Inline object: { properties: { … } }
            //   2. Array of inline objects: { items: { properties: { … } } }
            //   3. Array of another schema: { items: { $ref: "#<UUID>" } }
            // For (2) and (3) the path uses index "0" so getByPath can read
            // the first array element at runtime (locations.0.country).
            const itemsObj = (def['items'] ?? {}) as Record<string, any>;
            const itemsInline = (itemsObj['properties'] ?? null) as Record<string, any> | null;
            const refProps = refToProps(itemsRef) ?? refToProps(ref);

            // For array fields we surface TWO path options per nested child:
            //   - `<field>.0.<child>` → first element only
            //   - `<field>.*.<child>` → every element, joined as comma list
            // The wildcard variant is what the user wants when a project may
            // have multiple locations (e.g. multi-country projects). The
            // worker's `getByPath` understands both.
            type NestedSource = { props: Record<string, any>; pathPrefix: string; titleSuffix: string };
            const sources: NestedSource[] = [];
            if (Object.keys(innerProps).length > 0) {
                sources.push({ props: innerProps, pathPrefix: fieldKey, titleSuffix: '' });
            }
            const itemsSources: Array<{ props: Record<string, any> }> = [];
            if (isArray && itemsInline && Object.keys(itemsInline).length > 0) {
                itemsSources.push({ props: itemsInline });
            }
            if (isArray && refProps && Object.keys(refProps).length > 0) {
                itemsSources.push({ props: refProps });
            }
            for (const { props: itemsProps } of itemsSources) {
                sources.push({ props: itemsProps, pathPrefix: `${fieldKey}.0`, titleSuffix: ' [first]' });
                sources.push({ props: itemsProps, pathPrefix: `${fieldKey}.*`, titleSuffix: ' [all]' });
            }
            if (!isArray && refProps && Object.keys(refProps).length > 0) {
                sources.push({ props: refProps, pathPrefix: fieldKey, titleSuffix: '' });
            }

            for (const { props: nestedProps, pathPrefix, titleSuffix } of sources) {
                for (const [nestedKey, nestedDefRaw] of Object.entries(nestedProps)) {
                    if (NESTED_SKIP_KEYS.has(nestedKey)) continue;
                    if (!nestedDefRaw || typeof nestedDefRaw !== 'object') continue;
                    const nestedDef = nestedDefRaw as Record<string, any>;

                    const childTitle = typeof nestedDef.title === 'string' ? nestedDef.title : nestedKey;
                    fields.push({
                        fieldKey: `${pathPrefix}.${nestedKey}`,
                        title: `${topTitle} › ${childTitle}${titleSuffix}`,
                        description: typeof nestedDef.description === 'string' ? nestedDef.description : '',
                        type: typeof nestedDef.type === 'string' ? nestedDef.type : '',
                        isGeoJson: false,
                    });
                }
            }
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
    /** Flat list of every field path reachable from each schema's root.
     *  Each entry: { path, title, description, type, isGeoJson, schemaIri }.
     *  Used to expose deeply-nested paths (e.g., projectDetails.projectLocation.projectSiteCountryarea)
     *  as mappable options in the editor. */
    schemaFields: Array<{
        path: string;
        title: string;
        description?: string;
        type?: string;
        isGeoJson?: boolean;
        schemaIri: string;
    }>;
}
