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
            formulasService, {} as any, {} as any, {} as any, () => {}, () => ''
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
});
