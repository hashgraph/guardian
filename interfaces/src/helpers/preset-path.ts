/**
 * One preset mapping of a request block (`presetFields` item).
 *
 * `name` is a field of the block schema, `value` is a field of the preset schema.
 * Both are plain names for old policies and may be dotted paths (`a.b.c`) for nested
 * fields. Arrays on the path are implicit: a path that crosses an array reads and
 * writes one value per entry, as nested arrays (the same convention as the Math block).
 */
export interface IPresetFieldMapping {
    name: string;
    value: string;
    title?: string;
    readonly?: boolean;
    /** Number of arrays on the `name` path. Stored only for nested mappings. */
    nameLevel?: number;
    /** Number of arrays on the `value` path. Stored only for nested mappings. */
    valueLevel?: number;
}

/**
 * Nested path helpers for request block presets.
 *
 * Plain (undotted) mappings are not handled here: callers keep their original
 * `doc[name] = source[value]` code for them, so existing policies behave as before.
 */
export class PresetPath {
    /**
     * True if the mapping uses a nested path on either side.
     * @param mapping
     */
    public static isNested(mapping: { name?: string, value?: string } | null | undefined): boolean {
        return !!mapping && (
            (typeof mapping.name === 'string' && mapping.name.includes('.')) ||
            (typeof mapping.value === 'string' && mapping.value.includes('.'))
        );
    }

    /**
     * First segment of a path (the top-level field of the document).
     * @param path
     */
    public static root(path: string): string {
        return String(path || '').split('.')[0];
    }

    /**
     * Read a path. Every array on the path adds one level of nesting to the result,
     * so `a.b` with `a` an array of objects gives `[b0, b1, ...]`.
     * @param doc
     * @param path
     */
    public static read(doc: any, path: string): any {
        if (!path || doc === null || doc === undefined) {
            return undefined;
        }
        return PresetPath._read(doc, path.split('.'), 0);
    }

    private static _read(value: any, keys: string[], index: number): any {
        if (index >= keys.length) {
            return value;
        }
        if (value === null || value === undefined || typeof value !== 'object') {
            return undefined;
        }
        const next = value[keys[index]];
        if (Array.isArray(next)) {
            return next.map((item) => PresetPath._read(item, keys, index + 1));
        }
        return PresetPath._read(next, keys, index + 1);
    }

    /**
     * Reduce the nesting of a value read from a deeper path, e.g. `[][].x` into `[].x`.
     * The outer levels are merged, the innermost grouping is kept.
     * @param value
     * @param from array levels of the value
     * @param to array levels wanted
     */
    public static flatten(value: any, from: number | undefined, to: number | undefined): any {
        if (!Number.isInteger(from) || !Number.isInteger(to) || (from as number) <= (to as number)) {
            return value;
        }
        if (!Array.isArray(value)) {
            return value;
        }
        return value.flat((from as number) - (to as number));
    }

    /**
     * True if the source can feed the target: a source with fewer arrays than the target
     * has no entries to spread over, and a target without arrays can not take an array.
     * @param mapping
     */
    public static isCompatible(mapping: IPresetFieldMapping): boolean {
        if (!Number.isInteger(mapping.nameLevel) || !Number.isInteger(mapping.valueLevel)) {
            return true;
        }
        const from = mapping.valueLevel as number;
        const to = mapping.nameLevel as number;
        // A target without arrays holds one value: a source with arrays has no single value to give
        return to === 0 ? from === 0 : from >= to;
    }

    /**
     * Value a mapping takes from the preset document, flattened to the target depth.
     * @param source preset credential subject
     * @param mapping
     */
    public static sourceValue(source: any, mapping: IPresetFieldMapping): any {
        const value = PresetPath.read(source, mapping.value);
        return PresetPath.flatten(value, mapping.valueLevel, mapping.nameLevel);
    }

    /**
     * Builds the form data of a preset: one value per mapping, taken from the preset document.
     * Plain mappings copy `source[value]` as before, nested ones are written into their objects
     * and array entries. `username` and `hederaAccountId` take the value from the user.
     * @param source preset credential subject
     * @param mappings `presetFields` of the block
     * @param fields fields of the block schema (they say which segments are arrays)
     * @param user current user
     */
    public static fill(
        source: any,
        mappings: IPresetFieldMapping[],
        fields: any[] | null | undefined,
        user: { username?: string, hederaAccountId?: string }
    ): any {
        const json: any = {};
        const writesInside = (mapping: IPresetFieldMapping) => typeof mapping.name === 'string' && mapping.name.includes('.');
        const apply = (mapping: IPresetFieldMapping) => {
            if (mapping.value === 'username' || mapping.value === 'hederaAccountId') {
                const value = mapping.value === 'username' ? user.username : user.hederaAccountId;
                if (writesInside(mapping)) {
                    PresetPath.write(json, fields, mapping.name, value);
                } else {
                    json[mapping.name] = value;
                }
                return;
            }
            if (PresetPath.isNested(mapping)) {
                // Nested path (object or array entries); plain names keep the code below
                if (PresetPath.isCompatible(mapping)) {
                    PresetPath.write(json, fields, mapping.name, PresetPath.sourceValue(source, mapping));
                }
                return;
            }
            // Objects are copied: a nested mapping into the same root writes into it
            const plain = source[mapping.value];
            json[mapping.name] = plain && typeof plain === 'object' ? JSON.parse(JSON.stringify(plain)) : plain;
        };
        const inside = (mapping: IPresetFieldMapping) => PresetPath.isNested(mapping) || writesInside(mapping);
        mappings.filter((mapping) => !inside(mapping)).forEach(apply);
        mappings.filter(inside).forEach(apply);
        return json;
    }

    /**
     * Coarse kind of a schema field, used to tell whether a value of one field can fill another.
     * @param field schema field
     */
    public static fieldKind(field: any): string {
        if (!field) {
            return '';
        }
        if (field.isRef) {
            return (field.type === '#GeoJSON' || field.context?.type === 'GeoJSON') ? 'geojson' : 'object';
        }
        const custom = field.customType;
        if (custom && custom !== 'enum') {
            return String(custom);
        }
        if (custom === 'enum' || field.enum || field.remoteLink) {
            return 'enum';
        }
        return String(field.type || '');
    }

    /**
     * True if a value of the source field can fill the target field. This is only a hint for the
     * editor: the same kind always fits, an integer fits a number, and plain values fit a string.
     * Objects, GeoJSON, files and the like fit only the same kind.
     * @param target field of the block schema
     * @param source field of the preset schema
     */
    public static isTypeCompatible(target: any, source: any): boolean {
        const to = PresetPath.fieldKind(target);
        const from = PresetPath.fieldKind(source);
        if (!to || !from || to === from) {
            return true;
        }
        if (to === 'number') {
            return from === 'integer';
        }
        if (to === 'string') {
            return ['integer', 'number', 'boolean', 'enum', 'country', 'continent', 'state'].includes(from);
        }
        return false;
    }

    /**
     * Find a field of a schema by its dotted path.
     * @param fields fields of the schema
     * @param path dotted path
     */
    public static findField(fields: any[] | null | undefined, path: string): any {
        let list = fields || [];
        let found: any = null;
        for (const key of String(path || '').split('.')) {
            found = list.find((item) => item.name === key);
            if (!found) {
                return null;
            }
            list = found.fields || [];
        }
        return found;
    }

    /**
     * Copy of a value without the system keys the platform adds to sub-schema objects
     * (`type` and `@context`, see `SchemaHelper.updateObjectContext`), so values from two
     * different schemas can be compared by their data only.
     *
     * A submitted document is already stamped with the block schema's keys while a stored
     * preset carries the preset schema's, so the two never match without this.
     * A `type` the sub-schema declares as its own field, or the `type` of GeoJSON, is data
     * and is kept.
     * @param value
     * @param field schema field that describes the value (the sub-schema is `field.fields`)
     */
    public static withoutSystemKeys(value: any, field: any): any {
        if (Array.isArray(value)) {
            return value.map((item) => PresetPath.withoutSystemKeys(item, field));
        }
        if (!field?.isRef || !value || typeof value !== 'object') {
            return value;
        }
        const children: any[] = field.fields || [];
        const result: any = {};
        const isGeo = field.context?.type === 'GeoJSON';
        const ownType = children.some((item) => item.name === 'type');
        for (const key of Object.keys(value)) {
            if (key === '@context') {
                continue;
            }
            if (key === 'type' && !isGeo && !ownType) {
                continue;
            }
            const child = children.find((item) => item.name === key);
            result[key] = child ? PresetPath.withoutSystemKeys(value[key], child) : value[key];
        }
        return result;
    }

    /**
     * Write a value to a nested path of a target document, creating objects and array
     * entries on the way. Array entries are created from the shape of the value.
     * @param target document to fill
     * @param fields fields of the target schema (they say which segments are arrays)
     * @param path dotted path
     * @param value value shaped as the path (one array level per array on the path)
     * @returns false if the path does not fit the schema or the value
     */
    public static write(target: any, fields: any[] | null | undefined, path: string, value: any): boolean {
        if (!target || !path) {
            return false;
        }
        return PresetPath._write(target, fields || [], path.split('.'), 0, value);
    }

    private static _write(parent: any, fields: any[], keys: string[], index: number, value: any): boolean {
        const key = keys[index];
        if (index === keys.length - 1) {
            parent[key] = value;
            return true;
        }
        const field = fields.find((item) => item.name === key);
        if (!field || !field.isRef) {
            return false;
        }
        if (field.isArray) {
            if (!Array.isArray(value)) {
                return false;
            }
            if (!Array.isArray(parent[key])) {
                parent[key] = [];
            }
            let ok = true;
            for (let i = 0; i < value.length; i++) {
                if (!parent[key][i] || typeof parent[key][i] !== 'object') {
                    parent[key][i] = {};
                }
                ok = PresetPath._write(parent[key][i], field.fields || [], keys, index + 1, value[i]) && ok;
            }
            return ok;
        }
        if (!parent[key] || typeof parent[key] !== 'object' || Array.isArray(parent[key])) {
            parent[key] = {};
        }
        return PresetPath._write(parent[key], field.fields || [], keys, index + 1, value);
    }
}
