import { describe, expect, it } from 'vitest';
import { Schema } from '@guardian/interfaces';
import { RequestConfigComponent } from './request-config.component';

const field = (name: string, over: any = {}) => ({
    name, title: name, description: name, type: 'string', required: false,
    isArray: false, isRef: false, readOnly: false, fields: null, conditions: null, ...over
});

const makeSchema = (iri: string, fields: any[]) => {
    const schema: any = new Schema();
    schema.uuid = iri;
    schema.name = iri;
    schema.iri = iri;
    schema.contextURL = `ctx:${iri}`;
    schema.update(fields, []);
    return schema;
};

// block form: title, projectLocations[] { location, details { code } }
const blockFields = () => [
    field('title'),
    field('owner'),
    field('projectLocations', {
        isRef: true, isArray: true, type: '#Loc&1',
        fields: [field('location'), field('details', { isRef: true, type: '#Det&1', fields: [field('code')] })]
    })
];
// preset document: title, name, places[] { title, groups[] { tag } }
const presetFields = () => [
    field('title'),
    field('name', { description: 'owner' }),
    field('places', {
        isRef: true, isArray: true, type: '#Place&1',
        fields: [field('title'), field('groups', { isRef: true, isArray: true, type: '#Grp&1', fields: [field('tag')] })]
    })
];

function create(properties: any = {}) {
    const component = new RequestConfigComponent(null as any);
    const block: any = {
        moduleVariables: {
            schemas: [
                { value: '#Block', data: makeSchema('#Block', blockFields()) },
                { value: '#Preset', data: makeSchema('#Preset', presetFields()) }
            ]
        },
        properties: { schema: '#Block', presetSchema: '#Preset', ...properties },
        changed: false
    };
    (component as any).currentBlock = block;
    component.ngOnInit();
    return { component, block };
}

const names = (component: RequestConfigComponent) => component.rows.map((row) => row.name);

describe('RequestConfigComponent presets', () => {
    it('shows only mapped root fields of an old policy and keeps the others in the picker', () => {
        const { component } = create({
            presetFields: [
                { name: 'title', title: 'title', value: 'title', readonly: true },
                { name: 'owner', title: 'owner', value: '', readonly: false },
                { name: 'projectLocations', title: 'projectLocations', value: '', readonly: false }
            ]
        });
        expect(names(component)).toEqual(['title']);
        expect(component.mappedCount).toBe(1);
        const pickerValues = component.nestedTargetGroups.flatMap((g) => g.items.map((i) => i.value));
        expect(pickerValues).toContain('owner');
        expect(pickerValues).toContain('projectLocations');
        expect(pickerValues).toContain('projectLocations.location');
        expect(pickerValues).not.toContain('title');
    });

    it('does not change a plain mapping when saving', () => {
        const { component, block } = create({
            presetFields: [{ name: 'title', title: 'title', value: 'title', readonly: true }]
        });
        component.setReadonly(component.rows[0], false);
        expect(block.properties.presetFields).toEqual([{ name: 'title', title: 'title', value: 'title', readonly: false }]);
        expect(block.changed).toBe(true);
    });

    it('drops old entries without a source on the next change', () => {
        const { component, block } = create({
            presetFields: [
                { name: 'title', title: 'title', value: 'title', readonly: false },
                { name: 'owner', title: 'owner', value: '', readonly: false }
            ]
        });
        component.setSource(component.rows[0], 'name');
        expect(block.properties.presetFields.map((e: any) => e.name)).toEqual(['title']);
    });

    it('auto maps root fields by title when the preset schema is selected', () => {
        const { component, block } = create({ presetFields: [] });
        component.onSelectInput();
        expect(block.properties.presetFields).toEqual([
            { name: 'title', title: 'title', value: 'title', readonly: false },
            { name: 'owner', title: 'owner', value: 'name', readonly: false }
        ]);
        expect(names(component)).toEqual(['title', 'owner']);
    });

    it('adds an unmapped root field from the picker, then maps it', () => {
        const { component, block } = create({ presetFields: [] });
        component.addNestedTarget('owner');
        expect(names(component)).toEqual(['owner']);
        expect(block.properties.presetFields).toEqual([]);
        component.setSource(component.rows[0], 'name');
        expect(block.properties.presetFields[0]).toEqual({ name: 'owner', title: 'owner', value: 'name', readonly: false });
        expect(component.nestedTargetGroups.flatMap((g) => g.items.map((i) => i.value))).not.toContain('owner');
    });

    it('removing a mapped root field puts it back in the picker', () => {
        const { component, block } = create({
            presetFields: [{ name: 'title', title: 'title', value: 'title', readonly: false }]
        });
        component.clearSource(component.rows[0]);
        expect(block.properties.presetFields).toEqual([]);
        expect(component.rows).toEqual([]);
        expect(component.nestedTargetGroups.flatMap((g) => g.items.map((i) => i.value))).toContain('title');
    });

    it('stores array levels only for nested mappings', () => {
        const { component, block } = create({ presetFields: [] });
        component.addNestedTarget('projectLocations.location');
        const row = component.rows[0];
        expect(row.level).toBe(1);
        component.setSource(row, 'places.title');
        expect(block.properties.presetFields[0]).toEqual({
            name: 'projectLocations.location', title: 'location', value: 'places.title',
            readonly: false, nameLevel: 1, valueLevel: 1
        });
        component.addNestedTarget('title');
        component.setSource(component.rows.find((r) => r.name === 'title')!, 'title');
        const plain = block.properties.presetFields.find((e: any) => e.name === 'title');
        expect(plain.nameLevel).toBeUndefined();
        expect(plain.valueLevel).toBeUndefined();
    });

    it('offers only sources with at least as many arrays as the target', () => {
        const { component } = create({ presetFields: [] });
        component.addNestedTarget('projectLocations.location');
        const row = component.rows[0];
        const values = component.getSourceOptions(row).flatMap((g) => g.items.map((i) => i.value));
        expect(values).toContain('places.title');
        expect(values).toContain('places.groups.tag');
        expect(values).toContain('title');
        const rootRow = { ...row, level: 0 };
        expect(component.getSourceOptions(rootRow).length).toBeGreaterThan(0);
    });

    it('offers only array free sources to a target without arrays', () => {
        const { component } = create({ presetFields: [] });
        component.addNestedTarget('projectLocations.details.code');
        const nestedTarget = component.rows[0];
        expect(nestedTarget.level).toBe(1);
        const scalar = { ...nestedTarget, level: 0 };
        const values = component.getSourceOptions(scalar).flatMap((g) => g.items.map((i) => i.value));
        expect(values).toContain('title');
        expect(values).not.toContain('places.title');
        expect(values).not.toContain('places.groups.tag');
    });

    it('forgets picked fields when another block or other schemas are loaded', () => {
        const { component, block } = create({ presetFields: [] });
        component.addNestedTarget('owner');
        expect(names(component)).toEqual(['owner']);
        const other: any = { ...block, properties: { ...block.properties, presetFields: [] } };
        component.load(other);
        expect(names(component)).toEqual([]);
        component.addNestedTarget('owner');
        component.load(other);
        expect(names(component)).toEqual(['owner']);
        other.properties.presetSchema = '#Block';
        component.load(other);
        expect(names(component)).toEqual([]);
    });

    it('lists rows in the order of the saved mappings, picked fields last', () => {
        const { component } = create({
            presetFields: [
                { name: 'projectLocations.location', title: 'location', value: 'places.title', readonly: false, nameLevel: 1, valueLevel: 1 },
                { name: 'title', title: 'title', value: 'title', readonly: false }
            ]
        });
        expect(names(component)).toEqual(['projectLocations.location', 'title']);
        component.addNestedTarget('owner');
        component.addNestedTarget('projectLocations.details.code');
        expect(names(component)).toEqual(['projectLocations.location', 'title', 'owner', 'projectLocations.details.code']);
        component.setSource(component.rows.find((r) => r.name === 'owner')!, 'name');
        expect(names(component)).toEqual(['projectLocations.location', 'title', 'owner', 'projectLocations.details.code']);
        const saved = component.rows.filter((r) => component.isMapped(r)).map((r) => r.name);
        expect(saved).toEqual(['projectLocations.location', 'title', 'owner']);
    });

    it('flags a source of another type but still allows selecting it', () => {
        const { component, block } = create({ presetFields: [] });
        component.addNestedTarget('title');
        const row = component.rows[0];
        const options = component.getSourceOptions(row).flatMap((g) => g.items);
        // a string target takes strings, an object (places) does not fit
        expect(options.find((o) => o.value === 'title')!.mismatch).toBe(false);
        expect(options.find((o) => o.value === 'places')!.mismatch).toBe(true);
        expect(component.typeIssue(row)).toBeNull();

        component.setSource(row, 'places');
        expect(block.properties.presetFields[0].value).toBe('places');
        expect(component.typeIssue(row)).toContain('Type mismatch');

        component.setSource(row, 'name');
        expect(component.typeIssue(row)).toBeNull();
    });

    it('flags a plain source for an object target', () => {
        const { component } = create({ presetFields: [] });
        component.addNestedTarget('projectLocations.details');
        const row = component.rows[0];
        component.setSource(row, 'title');
        expect(component.typeIssue(row)).toContain('Type mismatch');
        expect(component.getSourceOptions(row).flatMap((g) => g.items).find((o) => o.value === 'title')!.mismatch).toBe(true);
    });

    it('hides an old root entry without a source but keeps it in the JSON until the next change', () => {
        const { component, block } = create({
            presetFields: [
                { name: 'owner', title: 'owner', value: '', readonly: false },
                { name: 'title', title: 'title', value: 'title', readonly: false }
            ]
        });
        expect(names(component)).toEqual(['title']);
        expect(block.properties.presetFields.map((e: any) => e.name)).toEqual(['owner', 'title']);
        component.setReadonly(component.rows[0], true);
        component.setSource(component.rows[0], 'title');
        expect(block.properties.presetFields.map((e: any) => e.name)).toEqual(['title']);
    });

    it('shows a nested entry without a source and ignores entries with a broken name', () => {
        const { component } = create({
            presetFields: [
                { name: 'projectLocations.location', title: 'location', value: '', readonly: false },
                { name: 42, title: 'broken', value: 'title', readonly: false },
                { name: 'title', title: 'title', value: 'title', readonly: false }
            ]
        });
        expect(names(component)).toEqual(['projectLocations.location', 'title']);
    });

    it('does not list a field twice when it is both saved and picked', () => {
        const { component } = create({
            presetFields: [{ name: 'title', title: 'title', value: 'title', readonly: false }]
        });
        component.addNestedTarget('title');
        expect(names(component)).toEqual(['title']);
    });

    it('keeps a mapping whose target left the schema as a stale row', () => {
        const { component } = create({
            presetFields: [{ name: 'gone', title: 'Gone', value: 'title', readonly: false }]
        });
        const row = component.rows.find((r) => r.name === 'gone')!;
        expect(row.stale).toBe(true);
        expect(row.title).toBe('Gone');
    });

    it('shortens a long path and keeps the first and last segments', () => {
        const { component } = create({
            presetFields: [{ name: 'a.b.c.d.e.f', title: 'f', value: 'title', readonly: false }]
        });
        const row = component.rows.find((r) => r.name === 'a.b.c.d.e.f')!;
        expect(row.pathParts).toEqual(['a', '…', 'e', 'f']);
        const root = create({ presetFields: [{ name: 'title', title: 'title', value: 'title', readonly: false }] });
        expect(root.component.rows[0].pathParts).toEqual(['title']);
    });

    it('clear preset removes the schema and every mapping', () => {
        const { component, block } = create({
            presetFields: [{ name: 'title', title: 'title', value: 'title', readonly: true }]
        });
        component.clearPreset();
        expect(block.properties.presetSchema).toBeUndefined();
        expect(block.properties.presetFields).toEqual([]);
        expect(component.rows).toEqual([]);
    });
});
