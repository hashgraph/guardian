import { ConditionIfEditorComponent } from './condition-if-editor.component';

const field = (name: string, extra: any = {}): any => ({
    name, title: name, description: name, type: 'string', isArray: false, isRef: false, ...extra
});

function create(ifCondition: any, disabled = false) {
    const component = new ConditionIfEditorComponent();
    component.ifCondition = ifCondition;
    component.disabled = disabled;
    component.resolveField = (path: string) => field(path.split('.').pop() as string);
    component.firstEntry = () => ({ field: field('first'), fieldPath: ['first'] });
    const emitted: any[] = [];
    component.ifConditionChange.subscribe((v) => emitted.push(v));
    return { component, emitted };
}

describe('ConditionIfEditorComponent', () => {
    it('reads operator and rows', () => {
        expect(create(null).component.getIfOperator()).toBe('SINGLE');
        expect(create({ AND: [] }).component.getIfOperator()).toBe('AND');
        expect(create({ OR: [] }).component.getIfOperator()).toBe('OR');
        const single = { field: field('a'), fieldValue: 1 };
        expect(create(single).component.getIfRows()).toEqual([single]);
        expect(create(null).component.getIfRows().length).toBe(1);
    });

    it('keeps the first row when switching operator', () => {
        const row = { field: field('a'), fieldValue: 'v', comparator: 'contains' };
        const { component, emitted } = create(row);
        component.setConditionOperator('AND');
        expect(component.ifCondition.AND.length).toBe(1);
        expect(component.ifCondition.AND[0].field.name).toBe('a');
        expect(component.ifCondition.AND[0].fieldValue).toBe('v');
        expect(component.ifCondition.AND[0].comparator).toBe('contains');
        expect(emitted.length).toBe(1);
        expect(emitted[0]).toBe(component.ifCondition);

        component.setConditionOperator('SINGLE');
        expect(component.ifCondition.field.name).toBe('a');
    });

    it('falls back to the first entry when there is no usable row', () => {
        const { component } = create(null);
        component.setConditionOperator('OR');
        expect(component.ifCondition.OR[0].field.name).toBe('first');
    });

    it('does nothing while disabled', () => {
        const row = { field: field('a'), fieldValue: 'v' };
        const { component, emitted } = create({ AND: [row] }, true);
        component.setConditionOperator('SINGLE');
        component.setIfRowField(0, 'b');
        component.setIfRowValue(0, 'x');
        component.addIfRow();
        component.removeIfRow(0);
        component.setIfRowComparator(0, 'contains');
        expect(emitted.length).toBe(0);
        expect(component.ifCondition.AND[0]).toBe(row);
        expect(row).not.toEqual(jasmine.objectContaining({ comparator: 'contains' }));
    });

    it('sets the row field with a nested path and resets the value', () => {
        const { component, emitted } = create({ AND: [{ field: field('a'), fieldValue: 'v' }] });
        component.setIfRowField(0, 'sub.b');
        expect(component.ifCondition.AND[0].field.name).toBe('b');
        expect(component.ifCondition.AND[0].fieldPath).toEqual(['sub', 'b']);
        expect(component.ifCondition.AND[0].fieldValue).toBe('');
        expect(emitted.length).toBe(1);
    });

    it('creates a predicate when the condition is empty', () => {
        const { component } = create(null);
        component.setIfRowField(0, 'a');
        expect(component.ifCondition.field.name).toBe('a');
    });

    it('adds and removes rows but keeps at least one', () => {
        const { component } = create({ OR: [{ field: field('a'), fieldValue: '' }] });
        component.addIfRow();
        expect(component.ifCondition.OR.length).toBe(2);
        component.removeIfRow(0);
        expect(component.ifCondition.OR.length).toBe(1);
        component.removeIfRow(0);
        expect(component.ifCondition.OR.length).toBe(1);
    });

    it('sets values and emits', () => {
        const { component, emitted } = create({ field: field('a'), fieldValue: '' });
        component.setIfRowValue(0, 'x');
        expect(component.ifCondition.fieldValue).toBe('x');
        expect(emitted.length).toBe(1);
    });

    it('resets the comparator when set back to equals', () => {
        const { component } = create({ field: field('a', { isArray: true }), fieldValue: '', comparator: 'contains' });
        expect(component.getIfRowComparator(component.ifCondition)).toBe('contains');
        component.setIfRowComparator(0, 'equals');
        expect(component.ifCondition.comparator).toBeUndefined();
        component.setIfRowComparator(0, 'contains');
        expect(component.ifCondition.comparator).toBe('contains');
    });

    it('offers contains only for arrays', () => {
        const { component } = create(null);
        expect(component.getIfRowComparatorOptions({ field: field('a') }).length).toBe(1);
        expect(component.getIfRowComparatorOptions({ field: field('a', { isArray: true }) }).length).toBe(2);
    });

    it('resolves row paths', () => {
        const { component } = create(null);
        expect(component.getRowFieldPath({ fieldPath: ['a', 'b'], field: field('b') })).toBe('a.b');
        expect(component.getRowFieldPath({ field: field('b') })).toBe('b');
        component.resolveFieldPath = () => 'custom';
        expect(component.getRowFieldPath({})).toBe('custom');
    });
});
