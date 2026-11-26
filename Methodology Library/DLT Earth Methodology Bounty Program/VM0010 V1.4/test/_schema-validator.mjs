/**
 * Dependency-free JSON Schema validator for the keyword subset used by the
 * VM0010 slice schemas.
 *
 * WHY THIS EXISTS: the repository's approved validator is ajv (declared as
 *   ^8.17.1 in common/package.json and interfaces/package.json, and used at
 *   common/src/hedera-modules/vcjs/vcjs.ts), but ajv is NOT installed in this
 *   workspace - there is no node_modules and no Yarn PnP loader. Installing it
 *   would require a full `yarn install` across 22 workspaces, which is out of
 *   scope. So this module implements the subset of JSON Schema that the slice
 *   schemas actually use, and `validateWithAjvIfAvailable` below will defer to
 *   the real ajv the moment dependencies are present.
 *
 * Keywords supported:
 *   $id, $ref (local "#name" resolved against the document's defs), type
 *   (string or array of strings), required, properties, items, enum,
 *   minimum, maximum, exclusiveMinimum, exclusiveMaximum, minLength,
 *   maxLength, minItems, maxItems, oneOf, anyOf, allOf
 *
 * Annotations ignored: title, description, $comment, readOnly, default,
 * examples, format.
 */

const ANNOTATIONS = new Set([
    '$id', '$schema', '$comment', 'title', 'description', 'readOnly',
    'default', 'examples', 'format', 'definitions',
]);

const TYPE_CHECKS = {
    object: (v) => v !== null && typeof v === 'object' && !Array.isArray(v),
    array: Array.isArray,
    string: (v) => typeof v === 'string',
    number: (v) => typeof v === 'number' && Number.isFinite(v),
    integer: (v) => typeof v === 'number' && Number.isInteger(v),
    boolean: (v) => typeof v === 'boolean',
    null: (v) => v === null,
};

function typeName(value) {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    return typeof value;
}

/**
 * @param {object} schema  the document containing `defs` (the slice schema file)
 * @returns {(value:any)=>Array<{path:string,message:string}>} error list, empty = valid
 */
export function makeValidator(schema) {
    const root = schema.document ? schema.document : schema;

    function resolveRef(ref) {
        if (!ref.startsWith('#')) {
            throw new Error(`only local refs are supported, got ${ref}`);
        }
        const key = ref.slice(1);
        const defs = root.defs || {};
        if (!Object.prototype.hasOwnProperty.call(defs, key)) {
            throw new Error(`unresolvable $ref ${ref}`);
        }
        return defs[key];
    }

    function walk(value, node, path, errors) {
        if (!node || typeof node !== 'object') return;

        if (typeof node.$ref === 'string') {
            walk(value, resolveRef(node.$ref), path, errors);
            return;
        }

        // type
        if (node.type !== undefined) {
            const types = Array.isArray(node.type) ? node.type : [node.type];
            const ok = types.some((t) => TYPE_CHECKS[t] && TYPE_CHECKS[t](value));
            if (!ok) {
                errors.push({
                    path,
                    message: `expected type ${types.join('|')} but received ${typeName(value)}`,
                });
                return;
            }
        }

        if (node.enum !== undefined && !node.enum.includes(value)) {
            errors.push({ path, message: `value ${JSON.stringify(value)} is not one of ${JSON.stringify(node.enum)}` });
        }

        for (const key of Object.keys(node)) {
            if (ANNOTATIONS.has(key)) continue;
        }

        if (typeof value === 'number') {
            if (node.minimum !== undefined && value < node.minimum) {
                errors.push({ path, message: `${value} is less than the minimum of ${node.minimum}` });
            }
            if (node.maximum !== undefined && value > node.maximum) {
                errors.push({ path, message: `${value} is greater than the maximum of ${node.maximum}` });
            }
            if (node.exclusiveMinimum !== undefined && value <= node.exclusiveMinimum) {
                errors.push({ path, message: `${value} must be greater than ${node.exclusiveMinimum}` });
            }
            if (node.exclusiveMaximum !== undefined && value >= node.exclusiveMaximum) {
                errors.push({ path, message: `${value} must be less than ${node.exclusiveMaximum}` });
            }
        }

        if (typeof value === 'string') {
            if (node.minLength !== undefined && value.length < node.minLength) {
                errors.push({ path, message: `string shorter than minLength ${node.minLength}` });
            }
            if (node.maxLength !== undefined && value.length > node.maxLength) {
                errors.push({ path, message: `string longer than maxLength ${node.maxLength}` });
            }
        }

        if (Array.isArray(value)) {
            if (node.minItems !== undefined && value.length < node.minItems) {
                errors.push({ path, message: `array has ${value.length} items, minItems is ${node.minItems}` });
            }
            if (node.maxItems !== undefined && value.length > node.maxItems) {
                errors.push({ path, message: `array has ${value.length} items, maxItems is ${node.maxItems}` });
            }
            if (node.items !== undefined) {
                value.forEach((item, i) => walk(item, node.items, `${path}[${i}]`, errors));
            }
        }

        if (TYPE_CHECKS.object(value)) {
            if (Array.isArray(node.required)) {
                for (const key of node.required) {
                    if (!Object.prototype.hasOwnProperty.call(value, key)) {
                        errors.push({ path, message: `missing required property "${key}"` });
                    }
                }
            }
            if (node.properties) {
                for (const [key, sub] of Object.entries(node.properties)) {
                    if (Object.prototype.hasOwnProperty.call(value, key)) {
                        walk(value[key], sub, `${path}.${key}`, errors);
                    }
                }
            }
        }

        for (const combiner of ['allOf', 'anyOf', 'oneOf']) {
            if (!Array.isArray(node[combiner])) continue;
            const branchErrors = node[combiner].map((sub) => {
                const local = [];
                walk(value, sub, path, local);
                return local;
            });
            const passing = branchErrors.filter((e) => e.length === 0).length;
            if (combiner === 'allOf') {
                branchErrors.flat().forEach((e) => errors.push(e));
            } else if (combiner === 'anyOf' && passing === 0) {
                errors.push({ path, message: `value does not match any of the anyOf branches` });
            } else if (combiner === 'oneOf' && passing !== 1) {
                errors.push({ path, message: `value matched ${passing} oneOf branches, expected exactly 1` });
            }
        }
    }

    return function validate(value) {
        const errors = [];
        walk(value, root, '', errors);
        return errors;
    };
}

/**
 * If ajv is installed (it is declared in common/ and interfaces/ but is not
 * materialised in this workspace), validate with the repository-approved
 * validator and return { validator: 'ajv', errors }. Otherwise return null so
 * the caller can fall back to the dependency-free validator.
 */
export async function validateWithAjvIfAvailable(schema, value) {
    let Ajv;
    let addFormats;
    try {
        ({ Ajv } = await import('ajv'));
        ({ default: addFormats } = await import('ajv-formats'));
    } catch {
        return null;
    }
    const ajv = new Ajv({ strict: false, allErrors: true });
    if (addFormats && typeof addFormats.default === 'function') addFormats.default(ajv);
    const validate = ajv.compile(schema.document ? schema.document : schema);
    const valid = validate(value);
    return {
        validator: 'ajv',
        errors: valid ? [] : (validate.errors || []).map((e) => ({
            path: e.instancePath || '',
            message: `${e.message}${e.params ? ' ' + JSON.stringify(e.params) : ''}`,
        })),
    };
}
