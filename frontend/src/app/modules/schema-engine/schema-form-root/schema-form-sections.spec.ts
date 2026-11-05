import { UntypedFormGroup } from '@angular/forms';
import { Schema, SchemaDataTypes } from '@guardian/interfaces';
import { FieldForm } from '../schema-form-model/field-form';
import { buildSections, buildViewSections, promotedRootName, splitSections, viewPromotedRoot } from './schema-form-sections';

describe('buildSections', () => {
    const def = (id: string, title: string, properties: any, required: string[] = []) => ({
        $id: id, title, description: title, type: SchemaDataTypes.object, properties, required
    });
    const text = (title: string) => ({ type: SchemaDataTypes.string, title, description: title });
    const build = (properties: any, required: string[], defs: any, preset?: any): FieldForm => {
        const document: any = {
            $id: '#sections&1.0.0',
            $comment: JSON.stringify({ '@id': 'ctx:#sections&1.0.0', term: 'sections&1.0.0' }),
            type: SchemaDataTypes.object,
            properties,
            required,
            $defs: defs
        };
        const form = new FieldForm(new UntypedFormGroup({}));
        form.setData({ schema: new Schema({ iri: '#sections&1.0.0', document }), preset });
        form.build();
        return form;
    };
    const defs = {
        '#a': def('#a', 'Alpha', { one: text('One') }, ['one']),
        '#b': def('#b', 'Beta', { two: text('Two') }, ['two']),
    };

    it('collects simple fields until a sub-schema, which closes and titles the section', () => {
        const form = build({
            name: text('Name'),
            code: text('Code'),
            a: { $ref: '#a', title: 'Alpha', description: 'Alpha' },
            b: { $ref: '#b', title: 'Beta', description: 'Beta' },
        }, ['name'], defs, { a: {}, b: {} });
        const sections = buildSections(form);
        expect(sections.map(section => section.title)).toEqual(['Alpha', 'Beta']);
        expect(sections[0].controls.map(item => item.name)).toEqual(['name', 'code', 'a']);
        expect(sections[1].controls.map(item => item.name)).toEqual(['b']);
        expect(sections.every(section => section.owner === form)).toBeTrue();
        form.destroy();
    });

    it('puts the fields after the last sub-schema into "Other details"', () => {
        const form = build({
            a: { $ref: '#a', title: 'Alpha', description: 'Alpha' },
            tail: text('Tail'),
        }, [], defs, { a: {} });
        const sections = buildSections(form);
        expect(sections.map(section => section.title)).toEqual(['Alpha', 'Other details']);
        expect(sections[1].controls.map(item => item.name)).toEqual(['tail']);
        form.destroy();
    });

    it('has no sections for a flat schema', () => {
        const form = build({ name: text('Name'), code: text('Code') }, ['name'], {});
        expect(buildSections(form)).toEqual([]);
        expect(buildSections(null)).toEqual([]);
        form.destroy();
    });

    it('skips hidden controls and recomputes when a condition shows a sub-schema', () => {
        const form = build({
            name: text('Name'),
            a: { $ref: '#a', title: 'Alpha', description: 'Alpha' },
            b: { $ref: '#b', title: 'Beta', description: 'Beta' },
        }, [], defs, { a: {}, b: {} });
        const beta = form.controls!.find(item => item.name === 'b')!;
        beta.visibility = false;
        expect(buildSections(form).map(section => section.title)).toEqual(['Alpha']);
        beta.visibility = true;
        expect(buildSections(form).map(section => section.title)).toEqual(['Alpha', 'Beta']);
        form.destroy();
    });

    describe('single-root promotion', () => {
        const nested = {
            '#root': def('#root', 'Root', {
                head: text('Head'),
                a: { $ref: '#a', title: 'Alpha', description: 'Alpha' },
                b: { $ref: '#b', title: 'Beta', description: 'Beta' },
            }),
            ...defs,
        };
        const properties = { root: { $ref: '#root', title: 'Root', description: 'Root' } };

        it('builds the sections from the root sub-schema own controls', () => {
            const form = build(properties, ['root'], nested, { root: { a: {}, b: {} } });
            const sections = buildSections(form);
            expect(sections.map(section => section.title)).toEqual(['Alpha', 'Beta']);
            const root = form.controls![0];
            expect(sections.every(section => section.owner === root.model)).toBeTrue();
            expect(sections[0].controls.map(item => item.name)).toEqual(['head', 'a']);
            expect(promotedRootName(form)).toBe('Root');
            form.destroy();
        });

        it('does not promote an optional root sub-schema that was not added', () => {
            const form = build(properties, [], nested);
            expect(form.controls![0].model).toBeFalsy();
            expect(promotedRootName(form)).toBeNull();
            expect(buildSections(form).map(section => section.title)).toEqual(['Root']);
            form.destroy();
        });

        it('does not promote when the root holds no sub-schema of its own', () => {
            const form = build(properties, ['root'], {
                '#root': def('#root', 'Root', { head: text('Head') }),
            }, { root: {} });
            expect(promotedRootName(form)).toBeNull();
            expect(buildSections(form).map(section => section.title)).toEqual(['Root']);
            form.destroy();
        });

        it('does not promote when the form has more than one visible control', () => {
            const form = build({ ...properties, extra: text('Extra') }, ['root'], nested, { root: { a: {}, b: {} } });
            expect(promotedRootName(form)).toBeNull();
            form.destroy();
        });
    });

    describe('buildViewSections', () => {
        const schemaOf = (properties: any, required: string[], definitions: any): Schema => new Schema({
            iri: '#sections&1.0.0',
            document: {
                $id: '#sections&1.0.0',
                $comment: JSON.stringify({ '@id': 'ctx:#sections&1.0.0', term: 'sections&1.0.0' }),
                type: SchemaDataTypes.object,
                properties,
                required,
                $defs: definitions
            }
        } as any);
        const shown = (field: any) => !field.notCorrespondCondition;
        const titles = (list: { title: string }[]) => list.map(item => item.title);

        it('splits like the edit form, with "Other details"', () => {
            const properties = {
                name: text('Name'),
                a: { $ref: '#a', title: 'Alpha', description: 'Alpha' },
                b: { $ref: '#b', title: 'Beta', description: 'Beta' },
                tail: text('Tail'),
            };
            const form = build(properties, ['name'], defs, { a: {}, b: {} });
            const view = buildViewSections(schemaOf(properties, ['name'], defs).fields, shown);
            expect(titles(view)).toEqual(titles(buildSections(form)));
            expect(titles(view)).toEqual(['Alpha', 'Beta', 'Other details']);
            expect(view[0].fields.map(item => item.name)).toEqual(['name', 'a']);
            form.destroy();
        });

        it('promotes a single root sub-schema, like the edit form', () => {
            const nested: any = {
                '#root': def('#root', 'Root', {
                    head: text('Head'),
                    a: { $ref: '#a', title: 'Alpha', description: 'Alpha' },
                    b: { $ref: '#b', title: 'Beta', description: 'Beta' },
                }, ['head']),
                ...defs,
            };
            const properties = { root: { $ref: '#root', title: 'Root', description: 'Root' } };
            const form = build(properties, ['root'], nested, { root: { a: {}, b: {} } });
            const fields = schemaOf(properties, ['root'], nested).fields;
            expect(viewPromotedRoot(fields, shown)?.name).toBe('root');
            expect(titles(buildViewSections(fields, shown))).toEqual(titles(buildSections(form)));
            form.destroy();
        });

        it('leaves out fields that are not visible and returns [] for a flat document', () => {
            const fields: any[] = [
                { name: 'one', isRef: false, notCorrespondCondition: true },
                { name: 'two', isRef: false },
                { name: 'a', isRef: true, description: 'Alpha' },
            ];
            const view = buildViewSections(fields, shown);
            expect(view[0].fields.map(item => item.name)).toEqual(['two', 'a']);
            expect(buildViewSections([{ name: 'x', isRef: false } as any], shown)).toEqual([]);
        });

        it('does not count a hidden sub-schema as the one that closes a section', () => {
            const fields: any[] = [{ name: 'x', isRef: false }, { name: 'a', isRef: true, notCorrespondCondition: true }];
            expect(buildViewSections(fields, shown)).toEqual([]);
        });
    });

    describe('splitSections', () => {
        it('titles a section by the item that closes it', () => {
            const result = splitSections<string, string>(['x', 'S1', 'y'], item => item.startsWith('S'),
                (title, items, last) => `${last ?? title}:${items.join('+')}`);
            expect(result).toEqual(['S1:x+S1', 'Other details:y']);
        });
    });
});
