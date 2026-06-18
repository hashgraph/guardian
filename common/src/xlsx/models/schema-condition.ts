import { SchemaCondition, SchemaField } from '@guardian/interfaces';

type SingleIf = { field: SchemaField; fieldValue: any; fieldPath?: string[] };
type GroupIf = { OR: SingleIf[] } | { AND: SingleIf[] };

function normalizePath(fieldPath?: string[]): string[] | undefined {
    return Array.isArray(fieldPath) && fieldPath.length > 1 ? fieldPath : undefined;
}

function sameValue(a: any, b: any): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
}

export class XlsxSchemaConditions {
    private readonly single?: { field: SchemaField; value: any; fieldPath?: string[] };
    private readonly group?: { op: 'OR' | 'AND'; items: { field: SchemaField; value: any; fieldPath?: string[] }[] };

    public readonly condition: SchemaCondition;

    constructor(field: SchemaField, value: any, fieldPath?: string[]);
    constructor(group: { op: 'OR' | 'AND'; items: { field: SchemaField; value: any; fieldPath?: string[] }[] });
    constructor(arg1: any, value?: any, fieldPath?: string[]) {
        if (typeof arg1 === 'object' && value === undefined && arg1?.op && Array.isArray(arg1.items)) {
            this.group = { op: arg1.op, items: arg1.items };
            const toPredicate = (i: any) => ({
                field: i.field,
                fieldValue: i.value,
                fieldPath: normalizePath(i.fieldPath)
            });
            const payload: GroupIf =
                arg1.op === 'OR'
                    ? { OR: arg1.items.map(toPredicate) }
                    : { AND: arg1.items.map(toPredicate) };
            this.condition = {
                ifCondition: payload as any,
                thenFields: [],
                elseFields: []
            };
        } else {
            this.single = { field: arg1 as SchemaField, value, fieldPath: normalizePath(fieldPath) };
            this.condition = {
                ifCondition: {
                    field: arg1 as SchemaField,
                    fieldValue: value,
                    fieldPath: normalizePath(fieldPath)
                } as any,
                thenFields: [],
                elseFields: []
            };
        }
    }

    public toJson(): SchemaCondition {
        return this.condition;
    }

    public equal(otherFieldOrGroup: any, otherValue?: any): boolean {
        if (this.group) {
            if (!(otherFieldOrGroup?.op && Array.isArray(otherFieldOrGroup.items))) {
                return false
            };
            if (this.group.op !== otherFieldOrGroup.op) {
                return false
            };
            if (this.group.items.length !== otherFieldOrGroup.items.length) {
                return false
            };
            const norm = (arr: any[]) =>
                arr
                    .map(i => `${i.field?.name}::${JSON.stringify(i.value)}`)
                    .sort()
                    .join('|');

            return norm(this.group.items) === norm(otherFieldOrGroup.items);
        } else {
            const of = otherFieldOrGroup as SchemaField;
            return of?.name === this.single.field.name && sameValue(otherValue, this.single.value);
        }
    }

    public addField(field: SchemaField, invert: boolean) {
        if (invert) {
            this.condition.elseFields.push(field);
        } else {
            this.condition.thenFields.push(field);
        }
    }

    public addTarget(field: SchemaField, targetFieldPath: string[], invert: boolean) {
        const target = { field, fieldPath: targetFieldPath };
        if (invert) {
            if (!this.condition.elseTargets) { this.condition.elseTargets = []; }
            this.condition.elseTargets.push(target);
        } else {
            if (!this.condition.thenTargets) { this.condition.thenTargets = []; }
            this.condition.thenTargets.push(target);
        }
    }
}
