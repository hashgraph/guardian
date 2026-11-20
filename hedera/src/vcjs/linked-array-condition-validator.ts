import { ISchemaArrayDependency, SchemaCondition, SchemaConditionTarget, SchemaField, SchemaHelper } from '@guardian/interfaces';
import { ArrayGroupValidationError } from './array-group-validator.js';

const keyOf = (path: string[]): string => path.join('.');

function readByPath(subject: any, path: string[]): any {
    let current = subject;
    for (const segment of path) {
        if (current === null || current === undefined) {
            return undefined;
        }
        current = current[segment];
    }
    return current;
}

function isPresent(value: any): boolean {
    return value !== undefined && value !== null && value !== '';
}

/**
 * Arrays tied together by repeatable links, so that entry N of one belongs with entry N of the rest.
 */
function buildGroups(dependencies: ISchemaArrayDependency[]): Map<string, string[]> {
    const parent = new Map<string, string>();
    const find = (key: string): string => {
        let root = key;
        while (parent.has(root) && parent.get(root) !== root) {
            root = parent.get(root) as string;
        }
        return root;
    };
    for (const dependency of dependencies) {
        const a = keyOf(dependency.on);
        const b = keyOf(dependency.field);
        for (const key of [a, b]) {
            if (!parent.has(key)) {
                parent.set(key, key);
            }
        }
        parent.set(find(a), find(b));
    }
    const groups = new Map<string, string[]>();
    for (const key of parent.keys()) {
        const root = find(key);
        groups.set(root, [...(groups.get(root) || []), key]);
    }
    return groups;
}

/**
 * Array of the group that a path runs through, by the longest strict prefix.
 */
function arrayOf(path: string[], members: string[]): string[] | null {
    for (let length = path.length - 1; length > 0; length--) {
        if (members.includes(keyOf(path.slice(0, length)))) {
            return path.slice(0, length);
        }
    }
    return null;
}

/**
 * Show a path with the entry index after its array: `child2[1].field_1`.
 */
function describePath(path: string[], array: string[], index: number): string {
    return path.map((segment, position) =>
        position === array.length - 1 ? `${segment}[${index}]` : segment
    ).join('.');
}

const MAX_NESTING = 12;

/**
 * Put a sub-schema's path in front of the paths of its condition, so they read from the document root
 * the same way its repeatable links do.
 */
function withPrefix(condition: SchemaCondition, prefix: string[]): SchemaCondition {
    const predicate = (item: any): any => ({
        ...item,
        fieldPath: [...prefix, ...((item?.fieldPath?.length || 0) > 1 ? item.fieldPath : [item?.field?.name])]
    });
    const ifCondition: any = condition.ifCondition;
    const shifted = Array.isArray(ifCondition?.AND) ? { AND: ifCondition.AND.map(predicate) }
        : Array.isArray(ifCondition?.OR) ? { OR: ifCondition.OR.map(predicate) }
            : predicate(ifCondition);
    const target = (item: SchemaConditionTarget): SchemaConditionTarget =>
        ({ ...item, fieldPath: [...prefix, ...item.fieldPath] });
    return {
        ...condition,
        ifCondition: shifted,
        thenTargets: condition.thenTargets?.map(target),
        elseTargets: condition.elseTargets?.map(target)
    };
}

/**
 * Conditions of a schema and of its single (non-repeatable) sub-schemas, all with paths from the
 * document root. This is where `collectArrayDependencies` looks for links, so a condition and the
 * links it relies on are found together.
 * @param conditions conditions of the schema
 * @param fields fields of the schema
 * @param prefix path of the schema from the document root
 */
export function collectConditionsFromRoot(
    conditions: SchemaCondition[],
    fields: SchemaField[],
    prefix: string[] = []
): SchemaCondition[] {
    const result = prefix.length ? (conditions || []).map(item => withPrefix(item, prefix)) : [...(conditions || [])];
    if (prefix.length >= MAX_NESTING) {
        return result;
    }
    for (const field of fields || []) {
        if (field?.isRef && !field.isArray) {
            result.push(...collectConditionsFromRoot(field.conditions || [], field.fields || [], [...prefix, field.name]));
        }
    }
    return result;
}

/**
 * Validate conditions whose trigger sits in a repeatable field that is linked to the repeatable
 * field holding their cross-schema target.
 *
 * Linked entries belong together, so entry N of the trigger decides what entry N of the target must
 * hold. JSON Schema cannot pair entries of two arrays, so the compiled `if` does not do this and
 * the form's per-entry rule has to be applied here too.
 * @param subject credential subject
 * @param conditions conditions of the schema
 * @param dependencies repeatable links of the schema
 */
export function validateLinkedArrayConditions(
    subject: any,
    conditions: SchemaCondition[],
    dependencies: ISchemaArrayDependency[]
): ArrayGroupValidationError[] {
    const errors: ArrayGroupValidationError[] = [];
    if (!subject || !conditions?.length || !dependencies?.length) {
        return errors;
    }

    for (const members of buildGroups(dependencies).values()) {
        // Different lengths are reported by the length check, and there is nothing to pair then.
        const lengths = members.map(key => {
            const value = readByPath(subject, key.split('.'));
            return value === undefined ? 0 : Array.isArray(value) ? value.length : null;
        });
        if (lengths.some(length => length === null || length !== lengths[0])) {
            continue;
        }
        const count = lengths[0] as number;

        for (const condition of conditions) {
            const predicates = SchemaHelper.getConditionTriggerPredicates(condition?.ifCondition);
            const triggers = predicates
                .map(predicate => (predicate?.fieldPath?.length || 0) > 1
                    ? predicate.fieldPath as string[]
                    : [predicate?.field?.name])
                .filter(path => path[0])
                .map(path => ({ path, array: arrayOf(path, members) }))
                .filter(trigger => trigger.array);
            if (!triggers.length) {
                continue;
            }

            const targets = (list?: SchemaConditionTarget[]) => (list || [])
                .map(target => ({ target, array: arrayOf(target.fieldPath, members) }))
                .filter(item => item.array) as { target: SchemaConditionTarget; array: string[] }[];
            const thenTargets = targets(condition.thenTargets);
            const elseTargets = targets(condition.elseTargets);
            if (!thenTargets.length && !elseTargets.length) {
                continue;
            }

            const triggerPath = triggers[0].path;
            const triggerArray = triggers[0].array as string[];
            for (let index = 0; index < count; index++) {
                const entries = Object.fromEntries(members.map(key => [key, index]));
                const matched = SchemaHelper.evaluateIfCondition(
                    condition.ifCondition, subject, undefined, { entries }
                );
                const active = matched ? thenTargets : elseTargets;
                const inactive = matched ? elseTargets : thenTargets;
                const activeKeys = new Set(active.map(item => keyOf(item.target.fieldPath)));
                const from = describePath(triggerPath, triggerArray, index);

                const valueOf = (item: { target: SchemaConditionTarget; array: string[] }): any => {
                    const entry = readByPath(subject, item.array)?.[index];
                    return readByPath(entry, item.target.fieldPath.slice(item.array.length));
                };
                const report = (item: { target: SchemaConditionTarget; array: string[] }, message: string) => {
                    errors.push({
                        instancePath: `/${[...item.array, String(index), ...item.target.fieldPath.slice(item.array.length)].join('/')}`,
                        schemaPath: '#/allOf',
                        message,
                        keyword: 'arrayGroupCondition',
                        params: {}
                    });
                };

                for (const item of active) {
                    if (item.target.field?.required && !isPresent(valueOf(item))) {
                        report(item, `'${describePath(item.target.fieldPath, item.array, index)}' is required, ` +
                            `because the condition on '${from}' applies to this entry.`);
                    }
                }
                for (const item of inactive) {
                    if (!activeKeys.has(keyOf(item.target.fieldPath)) && isPresent(valueOf(item))) {
                        report(item, `'${describePath(item.target.fieldPath, item.array, index)}' is not allowed, ` +
                            `because the condition on '${from}' does not apply to this entry.`);
                    }
                }
            }
        }
    }
    return errors;
}
