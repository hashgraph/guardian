import { FlattenedSchemaField, PolicyMappingSchemaType } from './policy-pipeline.types';
import { isGeoJsonProperty, findGeoJsonDefKey } from '../project-mapper/helpers';

/**
 * Walks a JSON-schema document and emits a flat list of leaf + container
 * fields. Recurses into nested `properties`, `items.properties`, AND into
 * cross-schema `$ref`s when a registry of policy schemas is supplied. Without
 * ref resolution, paths like `project_details.field6` are never produced for
 * schemas that pull a sub-schema in via `{$ref: "#<UUID>"}` (the Guardian
 * convention used by methodology schemas).
 */
export function flattenSchemaDocument(
    schemaIri: string,
    schemaName: string,
    schemaType: PolicyMappingSchemaType,
    doc: Record<string, unknown>,
    schemaRegistry?: Record<string, { document?: Record<string, unknown> } | Record<string, unknown>>,
    schemaTypes?: Map<string, PolicyMappingSchemaType>,
): FlattenedSchemaField[] {
    const geoDefKey = findGeoJsonDefKey(doc as Record<string, any>);
    const out: FlattenedSchemaField[] = [];
    walk({
        node: doc,
        pathPrefix: '',
        out,
        schemaIri,
        schemaName,
        schemaType,
        geoDefKey: geoDefKey ?? null,
        registry: schemaRegistry ?? {},
        registrySchemaTypes: schemaTypes ?? new Map(),
        rootDoc: doc,
        visited: new Set<string>(),
        depth: 0,
    });
    return out;
}

interface WalkCtx {
    node: Record<string, unknown>;
    pathPrefix: string;
    out: FlattenedSchemaField[];
    schemaIri: string;
    schemaName: string;
    schemaType: PolicyMappingSchemaType;
    geoDefKey: string | null;
    registry: Record<string, unknown>;
    registrySchemaTypes: Map<string, PolicyMappingSchemaType>;
    rootDoc: Record<string, unknown>;
    visited: Set<string>;
    depth: number;
}

function walk(ctx: WalkCtx): void {
    if (ctx.depth > 8) return;

    // Process the node itself first — descend into oneOf/anyOf/allOf compositions
    // at this level (each variant contributes properties as if inlined).
    walkComposition(ctx.node, ctx);

    const props = (ctx.node['properties'] ?? {}) as Record<string, unknown>;
    for (const [key, value] of Object.entries(props)) {
        if (!value || typeof value !== 'object') continue;
        const v = value as Record<string, unknown>;
        const path = ctx.pathPrefix ? `${ctx.pathPrefix}.${key}` : key;
        const type = typeof v['type'] === 'string' ? (v['type'] as string) : 'object';

        ctx.out.push({
            schemaIri: ctx.schemaIri,
            schemaName: ctx.schemaName,
            schemaType: ctx.schemaType,
            path,
            title: String(v['title'] ?? key),
            description: String(v['description'] ?? ''),
            type,
            isGeoJson: isGeoJsonProperty(v as Record<string, any>, ctx.geoDefKey ?? undefined),
        });

        // Composition branches on the property itself
        // (e.g. `{ allOf: [{ $ref: ... }, { properties: {...} }] }`).
        walkComposition(v, { ...ctx, pathPrefix: path, depth: ctx.depth + 1 });

        if (v['properties']) {
            walk({ ...ctx, node: v, pathPrefix: path, depth: ctx.depth + 1 });
            continue;
        }
        if (v['items'] && typeof v['items'] === 'object') {
            const items = v['items'] as Record<string, unknown>;
            if (items['properties']) {
                walk({ ...ctx, node: items, pathPrefix: path, depth: ctx.depth + 1 });
                continue;
            }
            // Composition inside items (e.g. `items: { oneOf: [...] }`).
            walkComposition(items, { ...ctx, pathPrefix: path, depth: ctx.depth + 1 });
            // Array-of-$ref: `locations: { type: 'array', items: { $ref: '#<UUID>' } }`.
            // Resolve and descend so child fields (e.g. `locations.country`)
            // are emitted at the array path — runtime getByPath iterates
            // implicitly across the array.
            const itemsRef = typeof items['$ref'] === 'string' ? (items['$ref'] as string) : '';
            if (itemsRef) {
                const resolvedItems = resolveRef(itemsRef, ctx);
                if (resolvedItems) {
                    const refKey = `${path}:items:${itemsRef}`;
                    if (!ctx.visited.has(refKey)) {
                        const nextVisited = new Set(ctx.visited);
                        nextVisited.add(refKey);
                        walk({
                            ...ctx,
                            node: resolvedItems,
                            pathPrefix: path,
                            visited: nextVisited,
                            depth: ctx.depth + 1,
                        });
                    }
                    continue;
                }
            }
        }

        // $ref resolution. Two cases:
        //   - Cross-schema: "$ref": "#<UUID>&<version>" — Guardian convention.
        //     Look up the target schema in the registry and descend into its
        //     document.properties (carrying the source schema's iri/name so
        //     the produced fields stay attributable to the parent).
        //   - Local: "$ref": "#/$defs/X" or "#/definitions/X" — resolve from
        //     the SOURCE schema's $defs.
        const ref = typeof v['$ref'] === 'string' ? (v['$ref'] as string) : '';
        if (!ref) continue;

        const resolved = resolveRef(ref, ctx);
        if (!resolved) continue;
        const refKey = `${path}:${ref}`;
        if (ctx.visited.has(refKey)) continue;
        const nextVisited = new Set(ctx.visited);
        nextVisited.add(refKey);
        walk({
            ...ctx,
            node: resolved,
            pathPrefix: path,
            visited: nextVisited,
            depth: ctx.depth + 1,
        });
    }
}

/**
 * JSON Schema composition (`oneOf` / `anyOf` / `allOf`) flattens each variant
 * into the parent context: every variant's `properties` (or `$ref` target's
 * properties) is treated as if inlined at the same path. Without this, schemas
 * authored with discriminated unions or `allOf` mixins drop every field.
 */
function walkComposition(node: Record<string, unknown>, ctx: WalkCtx): void {
    for (const keyword of ['oneOf', 'anyOf', 'allOf'] as const) {
        const branches = node[keyword];
        if (!Array.isArray(branches)) continue;
        for (const branch of branches) {
            if (!branch || typeof branch !== 'object') continue;
            const b = branch as Record<string, unknown>;
            // Inline properties branch — recurse as-is at the same path.
            if (b['properties']) {
                walk({ ...ctx, node: b, depth: ctx.depth + 1 });
            }
            // $ref branch — resolve and recurse at the same path.
            const ref = typeof b['$ref'] === 'string' ? (b['$ref'] as string) : '';
            if (ref) {
                const resolved = resolveRef(ref, ctx);
                if (resolved) {
                    const refKey = `${ctx.pathPrefix}:${keyword}:${ref}`;
                    if (!ctx.visited.has(refKey)) {
                        const nextVisited = new Set(ctx.visited);
                        nextVisited.add(refKey);
                        walk({ ...ctx, node: resolved, visited: nextVisited, depth: ctx.depth + 1 });
                    }
                }
            }
            // Nested composition inside a branch.
            if (Array.isArray(b['oneOf']) || Array.isArray(b['anyOf']) || Array.isArray(b['allOf'])) {
                walkComposition(b, { ...ctx, depth: ctx.depth + 1 });
            }
        }
    }
}

function resolveRef(ref: string, ctx: WalkCtx): Record<string, unknown> | null {
    // Local $defs / definitions
    if (ref.startsWith('#/$defs/') || ref.startsWith('#/definitions/')) {
        const key = ref.split('/').pop() ?? '';
        const defs = (ctx.rootDoc['$defs'] ?? ctx.rootDoc['definitions'] ?? {}) as Record<string, unknown>;
        const target = defs[key];
        return (target && typeof target === 'object') ? (target as Record<string, unknown>) : null;
    }
    // Cross-schema $ref — Guardian uses `#<UUID>&<version>`.
    const key = Object.keys(ctx.registry).find(k => k === ref || k.endsWith(ref) || ref === k.replace(/^#/, ''));
    if (!key) return null;
    const target = ctx.registry[key];
    if (!target || typeof target !== 'object') return null;
    const t = target as Record<string, unknown>;
    const doc = (t['document'] && typeof t['document'] === 'object')
        ? (t['document'] as Record<string, unknown>)
        : t;
    return doc;
}
