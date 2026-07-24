import { Injectable } from '@nestjs/common';
import { MappingPipelineService } from './mapping-pipeline.service';
import { SchemaInfo, FieldDescriptor } from './types';
import { PROJECT_EXTRACT_FIELDS } from '../project-mapper/project-fields';
import { derivePerPolicyProjectMeta } from './derive-project-meta';
import { flattenSchemaDocument } from './flatten-schema-fields';
import { classifySchemaTypeByName } from './classify-schema-type';
import { DocumentType } from '../project-mapper/types';
import { classifyDocumentType } from '../project-mapper/document-type-classifier';
import {
    FlattenedSchemaField,
    PolicyMapping,
    PolicyMappingEntry,
    PolicyMappingSchemaType,
    PolicyPipelineInput,
    PolicyPipelineOutput,
} from './policy-pipeline.types';

/**
 * Orchestrates the new policy-mapping pipeline used by the Phase-4 policy
 * decoder. Wraps `MappingPipelineService` so existing field-mapping logic is
 * reused; this layer adds policy.json extraction (categories / sectoral
 * scopes / emission reduction approach), schema flattening, and the grouped
 * `PolicyMapping` output shape.
 */
@Injectable()
export class PolicyMappingPipelineService {
    constructor(private readonly base: MappingPipelineService) {}

    async execute(input: PolicyPipelineInput): Promise<PolicyPipelineOutput> {
        const schemas = this.buildSchemaInfos(input.rawSchemas);
        const schemaTypes = this.buildSchemaTypeMap(schemas);

        const schemaFields = this.flattenAll(schemas, schemaTypes);

        // Per-schema field-title lists feed the (weak) doctype signal.
        const titlesBySchema = new Map<string, string[]>();
        for (const f of schemaFields) {
            const list = titlesBySchema.get(f.schemaIri);
            if (list) list.push(f.title);
            else titlesBySchema.set(f.schemaIri, [f.title]);
        }
        const docTypeBySchema = new Map<string, DocumentType>();
        for (const s of schemas) {
            docTypeBySchema.set(s.id, classifyDocumentType(s.name, s.id, titlesBySchema.get(s.id) ?? []));
        }

        const fieldDescriptors = this.fieldDescriptors();
        const { fieldMap } = await this.base.executePipeline(schemas, fieldDescriptors);
        const projectMeta = derivePerPolicyProjectMeta(fieldMap, schemas);
        if (projectMeta) schemaTypes.set(projectMeta.projectSchemaId, 'project');

        const policyMapping: PolicyMapping = {};
        this.attachSchemaMappings(policyMapping, fieldMap, schemas, schemaTypes, projectMeta?.projectSchemaId, docTypeBySchema);
        this.attachPolicyJsonMappings(policyMapping, input.rawPolicyJson);

        return { policyMapping, schemaFields };
    }

    // ---- schema preparation ------------------------------------------------

    private buildSchemaInfos(
        rawSchemas: Record<string, Record<string, unknown>>,
    ): SchemaInfo[] {
        const out: SchemaInfo[] = [];
        for (const [iri, doc] of Object.entries(rawSchemas)) {
            if (!doc || typeof doc !== 'object') continue;
            const name = (doc['name'] as string | undefined) || iri;
            const description = (doc['description'] as string | undefined) || undefined;
            out.push({
                id: iri,
                name,
                description,
                document: (doc['document'] as Record<string, unknown> | undefined) ?? doc,
                rawSchema: doc,
            });
        }
        return out;
    }

    private buildSchemaTypeMap(schemas: SchemaInfo[]): Map<string, PolicyMappingSchemaType> {
        const m = new Map<string, PolicyMappingSchemaType>();
        for (const s of schemas) m.set(s.id, classifySchemaTypeByName(s.name));
        return m;
    }

    // ---- flattening --------------------------------------------------------

    private flattenAll(
        schemas: SchemaInfo[],
        schemaTypes: Map<string, PolicyMappingSchemaType>,
    ): FlattenedSchemaField[] {
        const registry: Record<string, Record<string, unknown>> = {};
        for (const s of schemas) {
            registry[s.id] = (s.rawSchema ?? {}) as Record<string, unknown>;
        }
        const out: FlattenedSchemaField[] = [];
        for (const s of schemas) {
            const doc = (s.document ?? {}) as Record<string, unknown>;
            const type = schemaTypes.get(s.id) ?? 'other';
            out.push(...flattenSchemaDocument(s.id, s.name ?? s.id, type, doc, registry, schemaTypes));
        }
        return out;
    }

    // ---- field descriptors -------------------------------------------------

    private fieldDescriptors(): FieldDescriptor[] {
        return PROJECT_EXTRACT_FIELDS.map(f => ({
            fieldName: f.label,
            description: '',
            keywords: f.keywords,
            exclude: f.exclude,
        }));
    }

    /**
     * Splits `${schemaIri}.${fieldPath}` correctly even when the iri contains
     * dots (Guardian iris look like `#uuid&1.0.0`). Naive `indexOf('.')`
     * truncates the iri at the version separator.
     */
    private splitSchemaPath(
        raw: string,
        knownSchemaIds: string[],
    ): { schemaIri: string; fieldPath: string } | null {
        for (const iri of knownSchemaIds) {
            if (raw === iri) return { schemaIri: iri, fieldPath: '' };
            if (raw.startsWith(iri + '.')) {
                return { schemaIri: iri, fieldPath: raw.slice(iri.length + 1) };
            }
        }
        return null;
    }

    // ---- mapping assembly --------------------------------------------------

    private attachSchemaMappings(
        out: PolicyMapping,
        fieldMap: Record<string, string[]>,
        schemas: SchemaInfo[],
        schemaTypes: Map<string, PolicyMappingSchemaType>,
        projectSchemaId: string | undefined,
        docTypeBySchema: Map<string, DocumentType>,
    ): void {
        const schemaById = new Map(schemas.map(s => [s.id, s] as const));
        // Longest-first so e.g. "#uuid&1.0.0" matches before "#uuid&1".
        const schemaIdsByLength = [...schemaById.keys()].sort((a, b) => b.length - a.length);

        for (const field of PROJECT_EXTRACT_FIELDS) {
            const rawList = fieldMap[field.label];
            if (!Array.isArray(rawList) || rawList.length === 0) continue;
            for (const raw of rawList) {
                if (!raw) continue;
                const split = this.splitSchemaPath(raw, schemaIdsByLength);
                if (!split) continue;
                const { schemaIri, fieldPath } = split;
                const schema = schemaById.get(schemaIri);
                const entry: PolicyMappingEntry = {
                    source: 'schema',
                    schemaIri,
                    schemaName: schema?.name ?? schemaIri,
                    schemaType: schemaTypes.get(schemaIri) ?? 'other',
                    fieldPath,
                    isProjectSchema: schemaIri === projectSchemaId,
                    docType: docTypeBySchema.get(schemaIri) ?? 'unknown',
                    title: field.label,
                    description: '',
                };
                (out[field.key] ??= []).push(entry);
            }
        }
    }

    /**
     * Pulls policy.json-sourced fields (sectoral scopes, emission reduction
     * approach) into the same `PolicyMapping` shape so consumers don't need a
     * separate code path.
     */
    private attachPolicyJsonMappings(
        out: PolicyMapping,
        rawPolicyJson: Record<string, unknown>,
    ): void {
        const entries = rawPolicyJson['categoriesExport'];
        if (!Array.isArray(entries) || entries.length === 0) return;

        const sectoralScopes: string[] = [];
        const mitigationTypes: string[] = [];

        for (const e of entries) {
            if (!e || typeof e !== 'object') continue;
            const cat = e as Record<string, unknown>;
            const type = String(cat['type'] ?? '');
            const name = String(cat['name'] ?? '');
            if (!name) continue;
            if (type === 'SECTORAL_SCOPE') sectoralScopes.push(name);
            else if (type === 'MITIGATION_ACTIVITY_TYPE') mitigationTypes.push(name.toLowerCase());
        }

        if (sectoralScopes.length > 0) {
            (out['sectoralScopes'] ??= []).push({
                source: 'policyJson',
                policyJsonPath: 'categoriesExport[type=SECTORAL_SCOPE].name',
                title: 'Sectoral Scope',
                description: 'Derived from policy.json categoriesExport',
                // store the resolved value next to the path so consumers can
                // read it directly without re-parsing policy.json.
                score: sectoralScopes.length,
                schemaName: sectoralScopes.join(', '),
            });
        }

        const era = this.computeEmissionReductionApproach(mitigationTypes);
        if (era) {
            (out['emissionReductionApproach'] ??= []).push({
                source: 'policyJson',
                policyJsonPath: 'categoriesExport[type=MITIGATION_ACTIVITY_TYPE].name',
                title: 'Emission Reduction Approach',
                description: 'Derived from policy.json categoriesExport',
                schemaName: era,
            });
        }
    }

    private computeEmissionReductionApproach(types: string[]): string | null {
        const isAvoidance = types.some(t => t.includes('avoidance') || t.includes('efficiency'));
        const isRemoval = types.some(t =>
            t.includes('sequestration') || t.includes('removal') ||
            t.includes('reforestation') || t.includes('afforestation') || t.includes('restoration'),
        );
        return isAvoidance && isRemoval
            ? 'Avoidance & Removal'
            : isAvoidance ? 'Avoidance'
            : isRemoval  ? 'Removal'
            : null;
    }
}
