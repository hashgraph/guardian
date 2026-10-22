import { of } from 'rxjs';
import { EntityStatus, FormulaItemType, IFormula } from '@guardian/interfaces';
import { IFieldScope, SchemaFieldFormulas } from './schema-field-formulas';

describe('SchemaFieldFormulas', () => {
    function createDoc(): IFormula {
        return {
            id: 'd1',
            name: 'Doc',
            status: EntityStatus.DRAFT,
            config: {
                formulas: [
                    { uuid: 'v1', type: FormulaItemType.Variable, name: 'V', description: '', link: { type: 'schema', entityId: '#root', item: 'risks.G6' } },
                    { uuid: 'f1', type: FormulaItemType.Formula, name: 'F', description: '', link: null },
                ],
                files: []
            }
        };
    }

    function create(doc: IFormula = createDoc()): { model: any; updates: any[] } {
        const updates: any[] = [];
        const formulasService: any = {
            getFormula: () => of(JSON.parse(JSON.stringify(doc))),
            updateFormula: (item: any) => { updates.push(item); return of(item); },
            createFormula: (item: any) => { updates.push(item); return of(item); },
            getFormulas: () => of({ body: [], headers: { get: () => '0' } }),
            parsePage: () => ({ page: [], count: 0 }),
        };
        const model: any = new SchemaFieldFormulas(
            formulasService, {} as any, {} as any, () => {}, () => ''
        );
        model.policy = { id: 'p1', name: 'Policy' };
        model.canEdit = true;
        model.formulas.set('p1', [doc]);
        return { model, updates };
    }

    function scope(prefix: string[], name: string = 'G6'): IFieldScope {
        const field: any = { name };
        const schema: any = { id: 's1', iri: '#root', fields: [] };
        return { schema, field, prefix, fields: [field] };
    }

    it('lists the bindings of a drilled-into field by its path from the root schema', () => {
        const { model } = create();
        const view = model.view(scope(['risks']), true, false);
        expect(view.state).toBe('ready');
        expect(view.rows.map((r: any) => r.itemUuid)).toEqual(['v1']);
        expect(model.view(scope([]), true, false).rows).toEqual([]);
    });

    it('shows only a hint for a sub-schema opened directly', () => {
        const { model } = create();
        const view = model.view(scope([]), true, true);
        expect(view.state).toBe('sub-schema');
        expect(view.rows).toEqual([]);
        expect(view.groups).toEqual([]);
    });

    it('saves a binding with the prefix fixed when it was queued', (done) => {
        const { model, updates } = create();
        const s = scope(['risks'], 'G7');
        model.assign(s, 'd1|f1');
        s.prefix.push('changed');
        s.field.name = 'G8';
        model.save().subscribe((ok: boolean) => {
            expect(ok).toBeTrue();
            expect(updates[0].config.formulas[1].link).toEqual({ type: 'schema', entityId: '#root', item: 'risks.G8' });
            expect(model.hasPending).toBeFalse();
            done();
        });
    });

    it('adds a link to an item that is already linked, and unlinks only that link', (done) => {
        const { model, updates } = create();
        const s = scope(['risks'], 'G7');
        model.assign(s, 'd1|v1');
        model.save().subscribe(() => {
            const item = updates[0].config.formulas[0];
            expect(item.links).toEqual([
                { type: 'schema', entityId: '#root', item: 'risks.G6' },
                { type: 'schema', entityId: '#root', item: 'risks.G7' }
            ]);
            expect(item.link).toEqual(item.links[0]);
            done();
        });
    });

    it('counts an item with two links to different fields on each of them', () => {
        const { model } = create();
        const schema: any = { id: 's1', iri: '#root' };
        model.assign(scope(['risks'], 'G7'), 'd1|v1');
        expect(model.count(schema, ['risks'], 'G6')).toBe(1);
        expect(model.count(schema, ['risks'], 'G7')).toBe(1);
    });

    it('counts the formulas of a field, pending changes included', () => {
        const { model } = create();
        const schema: any = { id: 's1', iri: '#root' };
        expect(model.count(schema, ['risks'], 'G6')).toBe(1);
        expect(model.count(schema, ['risks'], 'G7')).toBe(0);
        model.assign(scope(['risks']), 'd1|f1');
        expect(model.count(schema, ['risks'], 'G6')).toBe(2);
        model.newName = 'New';
        model.newDocument = 'd1';
        model.create(scope(['risks'], 'G7'));
        expect(model.count(schema, ['risks'], 'G7')).toBe(1);
        expect(model.count({ iri: '#other' } as any, ['risks'], 'G6')).toBe(0);
    });

    it('closes the new formula form after creating and on another field', () => {
        const { model } = create();
        const s = scope(['risks']);
        model.view(s, true, false);
        model.startCreate();
        model.newName = 'New';
        model.newDocument = 'd1';
        model.create(s);
        expect(model.creating).toBeFalse();
        expect(model.newDocument).toBe('');
        model.startCreate();
        model.view(scope(['risks'], 'G9'), true, false);
        expect(model.creating).toBeFalse();
    });

    it('creates nothing until a formula document is chosen', () => {
        const { model } = create();
        const s = scope(['risks'], 'G7');
        model.view(s, true, false);
        model.startCreate();
        model.newName = 'New';
        expect(model.canCreate).toBeFalse();
        model.create(s);
        expect(model.hasPending).toBeFalse();
        model.newDocument = 'd1';
        expect(model.canCreate).toBeTrue();
    });
});
