type Predicate = { field: any; fieldValue: any; fieldPath?: string[] };

interface IConditionField {
    name: string;
    fields?: IConditionField[];
    conditions?: any[];
    notCorrespondCondition?: boolean;
}

function isSingleIF(ic: any): ic is { field: any; fieldValue: any } {
    return ic && 'field' in ic && 'fieldValue' in ic;
}

function isAND(ic: any): ic is { AND: any[] } {
    return ic && 'AND' in ic && Array.isArray(ic.AND);
}

function isOR(ic: any): ic is { OR: any[] } {
    return ic && 'OR' in ic && Array.isArray(ic.OR);
}

export function getPredicates(ic: any): Predicate[] {
    if (isSingleIF(ic)) {
        return [{ field: ic.field, fieldValue: ic.fieldValue, fieldPath: (ic as any).fieldPath }];
    }
    if (isAND(ic)) {
        return ic.AND.map((p) => ({ field: p.field, fieldValue: p.fieldValue ?? p.const, fieldPath: p.fieldPath }));
    }
    if (isOR(ic)) {
        return ic.OR.map((p) => ({ field: p.field, fieldValue: p.fieldValue ?? p.const, fieldPath: p.fieldPath }));
    }
    return [];
}

export function evaluateIfCondition(ic: any, values: any): boolean {
    const predicates = getPredicates(ic);
    if (predicates.length === 0) {
        return false;
    }

    const check = (predicate: Predicate) => {
        // For nested sub-schema fields the predicate carries a full path; walk it from the values.
        const path = (predicate.fieldPath && predicate.fieldPath.length > 1)
            ? predicate.fieldPath
            : [predicate.field?.name];
        if (!path[0]) {
            return false;
        }
        let current = values;
        for (const segment of path) {
            if (current === null || current === undefined) {
                return false;
            }
            current = current[segment];
        }
        return current === predicate.fieldValue;
    };

    if (isSingleIF(ic)) {
        return check(predicates[0]);
    }
    if (isAND(ic)) {
        return predicates.every(check);
    }
    if (isOR(ic)) {
        return predicates.some(check);
    }
    return false;
}

/**
 * Marks the then/else fields of each condition with `notCorrespondCondition`,
 * judging the condition by `values`.
 */
export function applyViewConditions(
    fields: IConditionField[] | undefined,
    conditions: any[] | undefined,
    values: any
): void {
    if (!fields || !Array.isArray(conditions)) {
        return;
    }
    for (const condition of conditions) {
        const ic = condition?.ifCondition;
        if (!ic) {
            continue;
        }
        const condTrue = evaluateIfCondition(ic, values);
        for (const field of (condition.thenFields ?? [])) {
            const thenField = fields.find((f) => f.name === field.name);
            if (thenField) {
                thenField.notCorrespondCondition = !condTrue;
            }
        }
        for (const field of (condition.elseFields ?? [])) {
            const elseField = fields.find((f) => f.name === field.name);
            if (elseField) {
                elseField.notCorrespondCondition = condTrue;
            }
        }
    }
}

/**
 * The conditions that sit on sub-schema fields apply to the fields of that sub-schema,
 * and are judged by the values of the sub-schema.
 */
export function applyNestedConditions(fields: IConditionField[] | undefined, values: any): void {
    if (!fields) {
        return;
    }
    for (const item of fields) {
        if (!item.conditions || !Array.isArray(item.conditions)) {
            continue;
        }
        applyViewConditions(item.fields, item.conditions, values ? values[item.name] : {});
    }
}
