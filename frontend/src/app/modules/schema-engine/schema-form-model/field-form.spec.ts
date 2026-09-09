import { UntypedFormGroup } from '@angular/forms';
import { Schema } from '@guardian/interfaces';
import { FieldForm, IFieldControl, IFieldIndexControl } from './field-form';

const link = {
    field: ['instances'],
    on: ['locations'],
    kind: 'array',
    title: ['instanceName'],
    valueMappings: [{ source: ['instanceName'], target: ['copiedName'] }],
};

const comment = (dependencies: any[]): string => JSON.stringify({
    '@id': 'ctx:#u-1&1.0.0',
    term: 'u-1&1.0.0',
    arrayDependencies: dependencies,
});

const arrayOf = (ref: string): any => ({ type: 'array', items: { $ref: ref } });

const subSchema = (id: string, property: string): any => ({
    $id: id,
    title: id,
    description: id,
    type: 'object',
    properties: { [property]: { type: 'string', title: property, description: property } },
    required: [],
});

const documentOf = (dependencies: any[], extra: boolean = false): any => {
    const properties: any = {
        locations: arrayOf('#loc'),
        instances: arrayOf('#inst'),
    };
    const defs: any = {
        '#loc': subSchema('#loc', 'instanceName'),
        '#inst': subSchema('#inst', 'copiedName'),
    };
    if (extra) {
        properties.reports = arrayOf('#rep');
        defs['#rep'] = subSchema('#rep', 'reportName');
    }
    return {
        $id: '#u-1&1.0.0',
        $comment: comment(dependencies),
        title: 'Root',
        description: 'Root',
        type: 'object',
        properties,
        required: [],
        $defs: defs,
    };
};

const buildForm = (document: any, preset?: any): FieldForm => {
    const schema = new Schema({ iri: '#u-1&1.0.0', document });
    const form = new FieldForm(new UntypedFormGroup({}));
    form.setData(preset ? { schema, preset } : { schema });
    form.build();
    return form;
};

const controlOf = (form: FieldForm, name: string): IFieldControl<any> =>
    (form.controls || []).find((item) => item.name === name) as IFieldControl<any>;

const entryValue = (
    item: IFieldControl<any>,
    index: number,
    path: string
): any => item.list?.[index]?.control?.get(path)?.value;

const setEntryValue = (
    item: IFieldControl<any>,
    index: number,
    path: string,
    value: string
): void => {
    item.list?.[index]?.control?.get(path)?.setValue(value);
};

describe('FieldForm — repeatable link graph', () => {
    let form: FieldForm;

    afterEach(() => form?.destroy());

    it('maps the source array to its dependent array', () => {
        form = buildForm(documentOf([link]));
        const dependents = form.getDependentArrays(controlOf(form, 'locations'));
        expect(dependents.length).toBe(1);
        expect(dependents[0].control).toBe(controlOf(form, 'instances'));
    });

    it('marks the dependent as managed and the source as not managed', () => {
        form = buildForm(documentOf([link]));
        expect(form.isManagedArray(controlOf(form, 'instances'))).toBe(true);
        expect(form.isManagedArray(controlOf(form, 'locations'))).toBe(false);
    });

    it('ignores a declaration that points at a missing array', () => {
        form = buildForm(documentOf([{ ...link, on: ['nowhere'] }]));
        expect(form.getArrayGroups().size).toBe(0);
    });

    it('ignores a self-link', () => {
        form = buildForm(documentOf([{ ...link, field: ['locations'] }]));
        expect(form.getArrayGroups().size).toBe(0);
    });
});

describe('FieldForm — a schema without repeatable links', () => {
    let form: FieldForm;

    afterEach(() => form?.destroy());

    it('has no groups and no managed arrays', () => {
        form = buildForm(documentOf([]));
        expect(form.getArrayGroups().size).toBe(0);
        expect(form.isManagedArray(controlOf(form, 'instances'))).toBe(false);
    });

    it('does not cascade when an entry is added', () => {
        form = buildForm(documentOf([]));
        form.addItem(controlOf(form, 'locations'));
        expect(controlOf(form, 'locations').list?.length).toBe(1);
        expect(controlOf(form, 'instances').list?.length).toBe(0);
    });
});

describe('FieldForm — synchronized entries', () => {
    let form: FieldForm;

    afterEach(() => form?.destroy());

    it('adding a source entry creates one dependent entry', () => {
        form = buildForm(documentOf([link]));
        form.addItem(controlOf(form, 'locations'));
        expect(controlOf(form, 'locations').list?.length).toBe(1);
        expect(controlOf(form, 'instances').list?.length).toBe(1);
    });

    it('removing a source entry removes the dependent entry at the same index', () => {
        form = buildForm(documentOf([link]));
        const locations = controlOf(form, 'locations');
        form.addItem(locations);
        form.addItem(locations);
        form.removeItem(locations, locations.list![0] as IFieldIndexControl<any>);
        expect(locations.list?.length).toBe(1);
        expect(controlOf(form, 'instances').list?.length).toBe(1);
    });

    it('leaves the values of the remaining entries with their own entries', () => {
        form = buildForm(documentOf([link]));
        const locations = controlOf(form, 'locations');
        form.addItem(locations);
        form.addItem(locations);
        setEntryValue(locations, 0, 'instanceName', 'first');
        setEntryValue(locations, 1, 'instanceName', 'second');
        form.removeItem(locations, locations.list![0] as IFieldIndexControl<any>);
        expect(entryValue(locations, 0, 'instanceName')).toBe('second');
        expect(entryValue(controlOf(form, 'instances'), 0, 'copiedName')).toBe('second');
    });

    it('cascades through a chain of two links', () => {
        const chain = [
            { field: ['instances'], on: ['locations'], kind: 'array' },
            { field: ['reports'], on: ['instances'], kind: 'array' },
        ];
        form = buildForm(documentOf(chain, true));
        form.addItem(controlOf(form, 'locations'));
        expect(controlOf(form, 'instances').list?.length).toBe(1);
        expect(controlOf(form, 'reports').list?.length).toBe(1);
    });

    it('terminates on a declaration that closes a cycle', () => {
        const cycle = [
            { field: ['instances'], on: ['locations'], kind: 'array' },
            { field: ['locations'], on: ['instances'], kind: 'array' },
        ];
        form = buildForm(documentOf(cycle));
        form.addItem(controlOf(form, 'locations'));
        expect(controlOf(form, 'locations').list?.length).toBe(1);
        expect(controlOf(form, 'instances').list?.length).toBe(1);
    });
});

describe('FieldForm — alignment when a document is opened', () => {
    let form: FieldForm;

    afterEach(() => form?.destroy());

    it('appends the dependent entries a stored document is missing', () => {
        form = buildForm(documentOf([link]), {
            locations: [{ instanceName: 'a' }, { instanceName: 'b' }],
        });
        expect(controlOf(form, 'locations').list?.length).toBe(2);
        expect(controlOf(form, 'instances').list?.length).toBe(2);
    });

    it('keeps extra dependent entries instead of deleting user data', () => {
        form = buildForm(documentOf([link]), {
            locations: [{ instanceName: 'a' }],
            instances: [{ copiedName: 'x' }, { copiedName: 'y' }],
        });
        expect(controlOf(form, 'instances').list?.length).toBe(2);
    });
});

describe('FieldForm — copied values', () => {
    let form: FieldForm;

    afterEach(() => form?.destroy());

    it('copies a mapped value into the dependent entry at the same index', () => {
        form = buildForm(documentOf([link]), {
            locations: [{ instanceName: 'first' }, { instanceName: 'second' }],
        });
        const instances = controlOf(form, 'instances');
        expect(entryValue(instances, 0, 'copiedName')).toBe('first');
        expect(entryValue(instances, 1, 'copiedName')).toBe('second');
    });

    it('disables the copied control so it cannot be typed into', () => {
        form = buildForm(documentOf([link]), { locations: [{ instanceName: 'first' }] });
        const copied = controlOf(form, 'instances').list?.[0]?.control?.get('copiedName');
        expect(copied?.disabled).toBe(true);
    });

    it('re-copies when the source value changes after the form is built', () => {
        form = buildForm(documentOf([link]));
        const locations = controlOf(form, 'locations');
        form.addItem(locations);
        setEntryValue(locations, 0, 'instanceName', 'typed later');
        expect(entryValue(controlOf(form, 'instances'), 0, 'copiedName')).toBe('typed later');
    });

    it('leaves the dependent untouched when the link declares no pairs', () => {
        const noPairs = [{ field: ['instances'], on: ['locations'], kind: 'array' }];
        form = buildForm(documentOf(noPairs), { locations: [{ instanceName: 'first' }] });
        const copied = controlOf(form, 'instances').list?.[0]?.control?.get('copiedName');
        expect(copied?.value).toBeFalsy();
        expect(copied?.disabled).toBe(false);
    });
});

describe('FieldForm — entry titles', () => {
    let form: FieldForm;

    afterEach(() => form?.destroy());

    it('labels a dependent entry with the source value at the same index', () => {
        form = buildForm(documentOf([link]), {
            locations: [{ instanceName: 'first' }, { instanceName: 'second' }],
        });
        const instances = controlOf(form, 'instances');
        expect(form.getEntryTitle(instances, instances.list![1])).toBe('second');
    });

    it('labels a source entry with its own value', () => {
        form = buildForm(documentOf([link]), { locations: [{ instanceName: 'first' }] });
        const locations = controlOf(form, 'locations');
        expect(form.getEntryTitle(locations, locations.list![0])).toBe('first');
    });

    it('falls back to the numbered description when the source value is empty', () => {
        form = buildForm(documentOf([link]));
        const locations = controlOf(form, 'locations');
        form.addItem(locations);
        const instances = controlOf(form, 'instances');
        expect(form.getEntryTitle(instances, instances.list![0])).toMatch(/#1$/);
    });
});

const plainField = (name: string, extra: any = {}): any => ({
    name,
    title: name,
    description: name,
    type: 'string',
    isArray: false,
    isRef: false,
    required: false,
    readOnly: false,
    ...extra,
});

const ifEquals = (
    fieldName: string,
    fieldValue: string,
    thenFields: any[],
    elseFields: any[] = []
): any => ({
    ifCondition: { field: plainField(fieldName), fieldValue },
    thenFields,
    elseFields,
});

const buildFieldsForm = (fields: any[], conditions: any[]): FieldForm => {
    const form = new FieldForm(new UntypedFormGroup({}));
    form.setData({ fields, conditions });
    form.build();
    return form;
};

const orderedNames = (form: FieldForm): string[] =>
    (form.controls || []).map((item) => item.name);

const visibleNames = (form: FieldForm): string[] =>
    (form.controls || []).filter((item) => item.visibility).map((item) => item.name);

const answer = (form: FieldForm, name: string, value: string): void => {
    form.form.get(name)?.setValue(value);
};

describe('FieldForm — order of the fields a condition reveals', () => {
    let form: FieldForm;

    afterEach(() => form?.destroy());

    it('keeps the fields of one condition in declaration order', () => {
        form = buildFieldsForm(
            [plainField('country')],
            [ifEquals('country', 'US', [plainField('state'), plainField('zip')])]
        );
        answer(form, 'country', 'US');
        expect(visibleNames(form)).toEqual(['country', 'state', 'zip']);
    });

    it('attaches a nested condition to the field it reads, after the fields it is declared alongside', () => {
        form = buildFieldsForm(
            [plainField('country')],
            [
                ifEquals('country', 'US', [plainField('state'), plainField('zip')]),
                ifEquals('state', 'CA', [plainField('county')]),
            ]
        );
        answer(form, 'country', 'US');
        answer(form, 'state', 'CA');
        expect(visibleNames(form)).toEqual(['country', 'state', 'zip', 'county']);
    });

    it('keeps a whole reveal group together before descending into a nested condition, alongside unrelated root fields', () => {
        form = buildFieldsForm(
            [plainField('A'), plainField('F'), plainField('G'), plainField('H')],
            [
                ifEquals('A', '2', [plainField('B'), plainField('C'), plainField('D')]),
                ifEquals('B', '3', [plainField('E')]),
            ]
        );
        answer(form, 'A', '2');
        answer(form, 'B', '3');
        expect(visibleNames(form)).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']);
    });

    it('renders two conditions on the same field in declaration order', () => {
        form = buildFieldsForm(
            [plainField('type')],
            [
                ifEquals('type', 'A', [plainField('aThen')], [plainField('aElse')]),
                ifEquals('type', 'B', [plainField('bThen')], [plainField('bElse')]),
            ]
        );
        answer(form, 'type', 'A');
        expect(visibleNames(form)).toEqual(['type', 'aThen', 'bElse']);
    });

    it('anchors a revealed field after the last field its condition reads', () => {
        form = buildFieldsForm(
            [plainField('x'), plainField('y'), plainField('z')],
            [{
                ifCondition: {
                    AND: [
                        { field: plainField('x'), fieldValue: '1' },
                        { field: plainField('y'), fieldValue: '2' },
                    ],
                },
                thenFields: [plainField('revealed')],
                elseFields: [],
            }]
        );
        answer(form, 'x', '1');
        answer(form, 'y', '2');
        expect(visibleNames(form)).toEqual(['x', 'y', 'revealed', 'z']);
    });

    it('does not move a field while the form is being filled', () => {
        form = buildFieldsForm(
            [plainField('country'), plainField('city')],
            [
                ifEquals('country', 'US', [plainField('state')]),
                ifEquals('state', 'CA', [plainField('county')], [plainField('province')]),
            ]
        );
        const before = orderedNames(form);
        answer(form, 'country', 'US');
        answer(form, 'state', 'CA');
        expect(orderedNames(form)).toEqual(before);
        expect(before).toEqual(['country', 'state', 'county', 'province', 'city']);
    });

    it('keeps a field whose condition reads a field outside the form', () => {
        form = buildFieldsForm(
            [plainField('a')],
            [ifEquals('nowhere', '1', [plainField('orphan')])]
        );
        expect(orderedNames(form)).toEqual(['a', 'orphan']);
    });
});

describe('FieldForm — conditions that cannot be reached', () => {
    let form: FieldForm;

    // if A == 1 then B / if B == 2 then C / if C == 3 then D else E
    const chain = (): FieldForm => buildFieldsForm(
        [plainField('A')],
        [
            ifEquals('A', '1', [plainField('B')]),
            ifEquals('B', '2', [plainField('C')]),
            ifEquals('C', '3', [plainField('D')], [plainField('E')]),
        ]
    );

    afterEach(() => form?.destroy());

    it('hides both branches while the field the condition reads is not shown', () => {
        form = chain();
        expect(visibleNames(form)).toEqual(['A']);
    });

    it('keeps them hidden when the answer does not open the chain', () => {
        form = chain();
        answer(form, 'A', '9');
        expect(visibleNames(form)).toEqual(['A']);
    });

    it('keeps them hidden when the chain stops half way', () => {
        form = chain();
        answer(form, 'A', '1');
        answer(form, 'B', '9');
        expect(visibleNames(form)).toEqual(['A', 'B']);
    });

    it('reveals the else branch once the field it reads is shown', () => {
        form = chain();
        answer(form, 'A', '1');
        answer(form, 'B', '2');
        answer(form, 'C', '9');
        expect(visibleNames(form)).toEqual(['A', 'B', 'C', 'E']);
    });

    it('reveals the then branch when the condition holds', () => {
        form = chain();
        answer(form, 'A', '1');
        answer(form, 'B', '2');
        answer(form, 'C', '3');
        expect(visibleNames(form)).toEqual(['A', 'B', 'C', 'D']);
    });

    it('hides the else branch again when the chain is closed', () => {
        form = chain();
        answer(form, 'A', '1');
        answer(form, 'B', '2');
        answer(form, 'C', '9');
        answer(form, 'A', '9');
        expect(visibleNames(form)).toEqual(['A']);
    });

    it('shows the else branch of a condition on an ordinary field left empty', () => {
        form = buildFieldsForm(
            [plainField('A')],
            [ifEquals('A', '1', [plainField('B')], [plainField('C')])]
        );
        expect(visibleNames(form)).toEqual(['A', 'C']);
        answer(form, 'A', '9');
        expect(visibleNames(form)).toEqual(['A', 'C']);
        answer(form, 'A', '1');
        expect(visibleNames(form)).toEqual(['A', 'B']);
    });

    it('treats an OR as reachable while any field it reads is shown', () => {
        form = buildFieldsForm(
            [plainField('A')],
            [
                ifEquals('A', '1', [plainField('B')]),
                {
                    ifCondition: {
                        OR: [
                            { field: plainField('A'), fieldValue: '7' },
                            { field: plainField('B'), fieldValue: '2' },
                        ],
                    },
                    thenFields: [plainField('X')],
                    elseFields: [plainField('Y')],
                },
            ]
        );
        // A is always shown, so the OR stays answerable and its else branch applies.
        expect(visibleNames(form)).toEqual(['A', 'Y']);
        answer(form, 'A', '7');
        expect(visibleNames(form)).toEqual(['A', 'X']);
    });
});
