/**
 * VC "Detailed Information" decoder.
 *
 * A faithful backend port of the structuring logic that lived in
 * frontend/pages/projects/[id].vue. Given a VC `credentialSubject` and the
 * owning policy's schema title maps, it produces the `VcDocData`
 * (fields/tables/groups) that the project detail page's "Detailed Information"
 * tab renders. Kept as pure functions so both the worker (ingestion) and the
 * API (on-the-fly fallback) can reuse it.
 *
 * Parity is intentional: branch order, formatting, the one-level group flatten,
 * and the humanize fallbacks all match the original frontend behaviour.
 */

import type { VcDocData, VcField, VcGroup, VcTable, VcTitleMaps } from './vc-detail.types';

/** Keys that are JSON-LD / Guardian plumbing, never user-facing fields. */
const SYSTEM_KEYS = new Set(['@context', 'type', 'id', 'policyId', 'ref', 'uuid']);

/** Strip a schema IRI down to its bare UUID (drop leading `#` and `&version`). */
export function bareUuid(schemaId: string): string {
    return schemaId.replace(/^#/, '').replace(/&.*$/, '');
}

/** camelCase / snake_case / kebab-case → Title Case. */
export function humanizeKey(key: string): string {
    return key
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/[_-]/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Multi-format date formatting (ISO, unix seconds/ms, bare year). */
function formatDate(value: string | number | null | undefined): string {
    if (!value) return '—';
    const s = String(value).trim();
    if (/^\d{4}$/.test(s)) return s;
    let date: Date;
    if (/^\d+(\.\d+)?$/.test(s)) {
        const num = parseFloat(s);
        date = new Date(num < 1e12 ? num * 1000 : num);
    } else {
        date = new Date(s);
    }
    if (isNaN(date.getTime())) return s;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function isArrayOfObjects(val: unknown): val is Record<string, any>[] {
    return (
        Array.isArray(val) &&
        val.length > 0 &&
        typeof val[0] === 'object' &&
        val[0] !== null &&
        !Array.isArray(val[0])
    );
}

function formatCellValue(v: unknown): string {
    if (v == null || v === '') return '—';
    if (Array.isArray(v)) {
        if (v.length === 0) return '—';
        if (v.every((x) => typeof x === 'number')) {
            if (v.length <= 5) return v.map((n) => Number((n as number).toFixed(4))).join(', ');
            const first = Number((v[0] as number).toFixed(4));
            const last = Number((v[v.length - 1] as number).toFixed(4));
            return `${first} → ${last} (${v.length} values)`;
        }
        return v.map((x) => (typeof x === 'object' ? formatCellValue(x) : String(x))).join(', ');
    }
    if (typeof v === 'object') {
        const obj = v as Record<string, unknown>;
        const keys = Object.keys(obj).filter((k) => !SYSTEM_KEYS.has(k));
        if (keys.length === 0) return '—';
        return keys
            .map((k) => {
                const val = obj[k];
                const fv = Array.isArray(val)
                    ? val.length <= 3
                        ? val.join(', ')
                        : `[${val.length} items]`
                    : String(val ?? '—');
                return `${humanizeKey(k)}: ${fv}`;
            })
            .join(' · ');
    }
    return String(v);
}

function buildTable(label: string, arr: Record<string, any>[]): VcTable {
    const colSet = new Set<string>();
    for (const row of arr) {
        for (const k of Object.keys(row)) {
            if (!SYSTEM_KEYS.has(k)) colSet.add(k);
        }
    }
    const columns = Array.from(colSet);
    const rows = arr.map((row) => {
        const mapped: Record<string, string> = {};
        for (const col of columns) {
            mapped[col] = formatCellValue(row[col]);
        }
        return mapped;
    });
    return { label, columns, rows };
}

function isDateRange(val: Record<string, any>): boolean {
    const keys = Object.keys(val).filter((k) => !SYSTEM_KEYS.has(k));
    return keys.length === 2 && 'from' in val && 'to' in val;
}

function isCoordinates(val: Record<string, any>): boolean {
    return val['type'] === 'Point' && Array.isArray(val['coordinates']) && val['coordinates'].length >= 2;
}

function resolveTitle(key: string, schemaUuid: string, maps: VcTitleMaps): string {
    const titles = maps.titles[schemaUuid] ?? maps.titles[bareUuid(schemaUuid)];
    if (titles?.[key]) return titles[key];
    return key
        .replace(/^field(\d+)$/, 'Field $1')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/[_-]/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

function resolveDescription(key: string, schemaUuid: string, maps: VcTitleMaps): string | undefined {
    const descs = maps.descriptions[schemaUuid] ?? maps.descriptions[bareUuid(schemaUuid)];
    // Fall back to the policy-wide map so nested-group fields whose sub-schema
    // we couldn't resolve still get tooltips.
    return descs?.[key] ?? maps.allFieldDescriptions[key];
}

/**
 * Decode a single VC credentialSubject into the structured detail payload.
 * `schemaUuid` is the bare schema UUID the credentialSubject was issued against.
 */
export function structureVcData(
    obj: Record<string, any>,
    schemaUuid: string,
    maps: VcTitleMaps,
): VcDocData {
    const fields: VcField[] = [];
    const tables: VcTable[] = [];
    const groups: VcGroup[] = [];

    for (const [key, val] of Object.entries(obj)) {
        if (SYSTEM_KEYS.has(key)) continue;
        if (val == null || val === '') continue;

        const label = resolveTitle(key, schemaUuid, maps);
        const description = resolveDescription(key, schemaUuid, maps);

        if (isArrayOfObjects(val)) {
            tables.push(buildTable(label, val));
        } else if (typeof val === 'object' && !Array.isArray(val) && isDateRange(val)) {
            const from = formatDate(val['from'] as string);
            const to = formatDate(val['to'] as string);
            fields.push({ label, value: `${from} → ${to}`, description });
        } else if (typeof val === 'object' && !Array.isArray(val) && isCoordinates(val)) {
            const coords = val['coordinates'] as number[];
            fields.push({ label, value: `${coords[0]}, ${coords[1]}`, description });
        } else if (typeof val === 'object' && !Array.isArray(val)) {
            const nestedType = val['type'] as string | undefined;
            let nestedId: string;
            if (nestedType) {
                nestedId = bareUuid(nestedType);
            } else {
                // No type field — try matching the parent field's title to a known schema name
                nestedId = maps.schemaNameToUuid[label.toLowerCase()] ?? schemaUuid;
            }
            const groupTitle = maps.schemaNames[nestedId] ?? label;
            const nested = structureVcData(val, nestedId, maps);
            const allFields = [...nested.fields];
            for (const g of nested.groups) allFields.push(...g.fields);
            if (allFields.length > 0 || nested.tables.length > 0) {
                groups.push({ title: groupTitle, fields: allFields, tables: nested.tables });
            }
        } else if (Array.isArray(val)) {
            const displayable = val.filter((v) => v != null && v !== '');
            if (displayable.length > 0) {
                fields.push({ label, value: displayable.join(', '), description });
            }
        } else {
            fields.push({ label, value: String(val), description });
        }
    }
    return { fields, tables, groups };
}

/**
 * Build the per-policy title maps from `policy.rawSchemaJson` (`{ iri: schemaDoc }`).
 * Mirrors the frontend `schemaFieldTitles` / `schemaNames` / `schemaNameToUuid`
 * / `allFieldDescriptions` computeds, which derive from the same schema docs the
 * decoded-methodology endpoint exposes — guaranteeing the stored titles match
 * what the "Detailed Information" tab showed.
 */
export function buildVcTitleMaps(rawSchemaJson: Record<string, any> | null | undefined): VcTitleMaps {
    const maps: VcTitleMaps = {
        titles: {},
        descriptions: {},
        schemaNames: {},
        schemaNameToUuid: {},
        allFieldDescriptions: {},
    };
    if (!rawSchemaJson || typeof rawSchemaJson !== 'object') return maps;

    for (const [iri, schemaDocRaw] of Object.entries(rawSchemaJson)) {
        const schemaDoc = (schemaDocRaw ?? {}) as Record<string, any>;
        const uuid = bareUuid(iri);
        const name = typeof schemaDoc['name'] === 'string' ? (schemaDoc['name'] as string) : null;

        const document = (schemaDoc['document'] ?? {}) as Record<string, any>;
        const props = (document['properties'] ?? {}) as Record<string, any>;

        const titleMap: Record<string, string> = {};
        const descMap: Record<string, string> = {};
        for (const [fieldKey, defRaw] of Object.entries(props)) {
            if (SYSTEM_KEYS.has(fieldKey)) continue;
            const def = (defRaw ?? {}) as Record<string, any>;
            const title = typeof def['title'] === 'string' ? def['title'].trim() : '';
            const desc = typeof def['description'] === 'string' ? def['description'].trim() : '';
            // A field with no schema title (common on externally-fed/dMRV schemas) falls back to
            // the schema description, then a humanized key — never the raw camelCase/snake_case key.
            titleMap[fieldKey] = title || desc || humanizeKey(fieldKey);
            if (desc) {
                descMap[fieldKey] = desc;
                // First-seen wins so the most authoritative description sticks.
                if (!maps.allFieldDescriptions[fieldKey]) maps.allFieldDescriptions[fieldKey] = desc;
            }
        }
        maps.titles[uuid] = titleMap;
        maps.descriptions[uuid] = descMap;
        if (name) {
            maps.schemaNames[uuid] = name;
            maps.schemaNameToUuid[name.toLowerCase()] = uuid;
        }
    }
    return maps;
}

export interface MrvColumnDef {
    key: string;
    label: string;
    description: string | null;
    isDate: boolean;
}

export interface MrvSchemaLayout {
    /** Scalar fields — become table columns. Arrays are never flattened into columns. */
    columns: MrvColumnDef[];
    /** Key of the first date-formatted column, or null. Drives the default sort + time-range filter. */
    dateColumnKey: string | null;
    /** Key of the first array-of-objects field (e.g. a repeatable "device"/"block" group), or null. */
    deviceArrayKey: string | null;
    /** Key inside the device array's item schema used as its display label, or null. */
    deviceLabelKey: string | null;
    /**
     * True when the schema has NO top-level scalar fields at all (e.g. a bare
     * `{ readings: [{device_id, value, ...}] }` shape with no envelope data) —
     * `columns`/`dateColumnKey` were instead promoted from deviceArrayKey's own
     * item schema, and the caller must render/query one row PER ARRAY ITEM
     * rather than one row per VC.
     */
    flattenDeviceItems: boolean;
}

function findSchemaDocByUuid(rawSchemaJson: Record<string, any>, uuid: string): Record<string, any> | null {
    for (const [iri, doc] of Object.entries(rawSchemaJson)) {
        if (bareUuid(iri) === uuid) return (doc ?? {}) as Record<string, any>;
    }
    return null;
}

/** IWA/CADT dMRV schemas use `format: 'date-time'` for full timestamps and `format: 'date'` for bare dates — both are chronological and both should get the time-range filter. */
function isDateFormat(def: Record<string, any>): boolean {
    return def['format'] === 'date-time' || def['format'] === 'date';
}

/** Scalar (non-array) fields of a JSON-schema `properties` object → table columns, plus the first date-like column found. */
function extractColumns(props: Record<string, any>): { columns: MrvColumnDef[]; dateColumnKey: string | null } {
    const columns: MrvColumnDef[] = [];
    let dateColumnKey: string | null = null;
    for (const [key, defRaw] of Object.entries(props)) {
        if (SYSTEM_KEYS.has(key)) continue;
        const def = (defRaw ?? {}) as Record<string, any>;
        if (def['type'] === 'array') continue; // never a flat column, even one level in
        const title = typeof def['title'] === 'string' ? def['title'].trim() : '';
        const desc = typeof def['description'] === 'string' ? def['description'].trim() : '';
        const isDate = isDateFormat(def);
        if (isDate && !dateColumnKey) dateColumnKey = key;
        columns.push({ key, label: title || desc || humanizeKey(key), description: desc || null, isDate });
    }
    return { columns, dateColumnKey };
}

/**
 * Picks whichever candidate key best identifies a "device"/"sensor"/"meter" —
 * preferring an explicit name-like field, then a device/sensor/meter-themed
 * field, then any `..._id`/`id` field, and only falling back to the first
 * field when nothing in the schema hints at identity at all.
 */
function pickDeviceLabelKey(keys: string[]): string | null {
    if (keys.length === 0) return null;
    return keys.find((k) => /name/i.test(k))
        ?? keys.find((k) => /device|sensor|meter/i.test(k))
        ?? keys.find((k) => /(^|_)id$/i.test(k))
        ?? keys[0];
}

/**
 * Derives a business-friendly table layout for one schema — used by the MRV
 * External Data table view (as opposed to the free-form fields/tables/groups
 * "Detailed Information" rendering `structureVcData` produces). Scalar fields
 * become sortable/filterable columns; the first repeatable object array (e.g.
 * a policy's "blocks"/"devices"/"sensors" group) is treated as the record's
 * device/measurement-point dimension rather than a column. When the schema has
 * no top-level scalars at all (the array IS the whole schema), the item
 * schema's own fields are promoted into columns instead, and the caller
 * switches to one-row-per-item.
 */
export function detectMrvLayout(
    rawSchemaJson: Record<string, any> | null | undefined,
    schemaUuid: string,
): MrvSchemaLayout {
    const empty: MrvSchemaLayout = { columns: [], dateColumnKey: null, deviceArrayKey: null, deviceLabelKey: null, flattenDeviceItems: false };
    if (!rawSchemaJson || typeof rawSchemaJson !== 'object') return empty;

    const schemaDoc = findSchemaDocByUuid(rawSchemaJson, schemaUuid);
    if (!schemaDoc) return empty;
    const props = ((schemaDoc['document'] ?? {}) as Record<string, any>)['properties'] ?? {};

    let deviceArrayKey: string | null = null;
    let deviceRefUuid: string | null = null;
    for (const [key, defRaw] of Object.entries(props as Record<string, any>)) {
        if (SYSTEM_KEYS.has(key)) continue;
        const def = (defRaw ?? {}) as Record<string, any>;
        if (def['type'] !== 'array') continue;
        const itemRef = (def['items'] as Record<string, any> | undefined)?.['$ref'];
        if (!deviceArrayKey && typeof itemRef === 'string') {
            deviceArrayKey = key;
            deviceRefUuid = bareUuid(itemRef);
        }
    }

    const top = extractColumns(props as Record<string, any>);

    if (top.columns.length > 0) {
        let deviceLabelKey: string | null = null;
        if (deviceRefUuid) {
            const deviceDoc = findSchemaDocByUuid(rawSchemaJson, deviceRefUuid);
            const devProps = ((deviceDoc?.['document'] ?? {}) as Record<string, any>)['properties'] ?? {};
            deviceLabelKey = pickDeviceLabelKey(Object.keys(devProps as Record<string, any>).filter((k) => !SYSTEM_KEYS.has(k)));
        }
        return { columns: top.columns, dateColumnKey: top.dateColumnKey, deviceArrayKey, deviceLabelKey, flattenDeviceItems: false };
    }

    // No top-level scalar fields — the schema's real content lives entirely inside
    // the repeatable item array (e.g. a bare list of {device_id, date_from, date_to,
    // ...} readings with no envelope fields). Promote the item schema's own scalar
    // fields into columns; the device-identity field is excluded from columns since
    // it's surfaced separately as the row's device label instead.
    if (deviceRefUuid) {
        const deviceDoc = findSchemaDocByUuid(rawSchemaJson, deviceRefUuid);
        const devProps = ((deviceDoc?.['document'] ?? {}) as Record<string, any>)['properties'] ?? {};
        const nested = extractColumns(devProps as Record<string, any>);
        const deviceLabelKey = pickDeviceLabelKey(nested.columns.map((c) => c.key));
        const columns = nested.columns.filter((c) => c.key !== deviceLabelKey);
        return { columns, dateColumnKey: nested.dateColumnKey, deviceArrayKey, deviceLabelKey, flattenDeviceItems: true };
    }

    return empty;
}
