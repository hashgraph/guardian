import { SchemaCondition, SchemaField } from '@guardian/interfaces';

type SingleIf = { field: SchemaField; fieldValue: any };
type GroupIf = { OR: SingleIf[] } | { AND: SingleIf[] };

function sameValue(a: any, b: any): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
}

export class XlsxSchemaConditions {
    private readonly single?: { field: SchemaField; value: any };
    private readonly group?: { op: 'OR' | 'AND'; items: { field: SchemaField; value: any }[] };

    public readonly condition: SchemaCondition;

    constructor(field: SchemaField, value: any);
    constructor(group: { op: 'OR' | 'AND'; items: { field: SchemaField; value: any }[] });
    constructor(arg1: any, value?: any) {
        if (typeof arg1 === 'object' && value === undefined && arg1?.op && Array.isArray(arg1.items)) {
            this.group = { op: arg1.op, items: arg1.items };
            const payload: GroupIf =
                arg1.op === 'OR'
                    ? { OR: arg1.items.map((i: any) => ({ field: i.field, fieldValue: i.value })) }
                    : { AND: arg1.items.map((i: any) => ({ field: i.field, fieldValue: i.value })) };
            this.condition = {
                ifCondition: payload as any,
                thenFields: [],
                elseFields: []
            };
        } else {
            this.single = { field: arg1 as SchemaField, value };
            this.condition = {
                ifCondition: {
                    field: arg1 as SchemaField,
                    fieldValue: value
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
}
