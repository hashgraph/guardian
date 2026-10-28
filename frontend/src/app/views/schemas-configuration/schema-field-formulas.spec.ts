import { NEVER, of } from 'rxjs';
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

    it('builds the preview tree from the loaded formulas, including pending assignments', () => {
        const { model } = create();
        const tree = model.previewTree([]);
        expect(tree.getFields('#root')['#root/risks.G6']).toBeDefined();
        expect(tree.getFields('#root')['#root/G7']).toBeUndefined();

        model.assign(scope([], 'G7'), 'd1|f1');
        expect(model.previewTree([]).getFields('#root')['#root/G7']).toBeDefined();
    });

    it('keeps the saved link in the preview tree while the formulas reload', (done) => {
        const { model } = create();
        model.formulasService.getFormulas = () => NEVER;
        model.assign(scope([], 'G7'), 'd1|f1');

        model.save().subscribe(() => {
            expect(model.hasPending).toBeFalse();
            expect(model.previewTree([]).getFields('#root')['#root/G7']).toBeDefined();
            done();
        });
    });

    it('has no preview tree before the formulas are loaded', () => {
        const { model } = create();
        model.formulas.clear();
        expect(model.previewTree([])).toBeNull();
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
    describe('renames and deletes', () => {
        function savedScope(name: string = 'G6', status: string = 'DRAFT'): IFieldScope {
            const field: any = { name };
            const schema: any = { id: 's1', iri: '#root', status, fields: [] };
            return { schema, field, prefix: ['risks'], fields: [field] };
        }

        it('queues no unbind when the field only has a pending bind', () => {
            const { model } = create();
            const s = savedScope('G7');
            model.assign(s, 'd1|f1');
            model.release(s);
            expect(model.hasPending).toBeFalse();
        });

        it('unbinds the saved link when the field is deleted', (done) => {
            const { model, updates } = create();
            model.release(savedScope());
            model.save().subscribe(() => {
                expect(updates[0].config.formulas[0].link).toBeNull();
                done();
            });
        });

        it('queues nothing for a published schema', () => {
            const { model } = create();
            model.release(savedScope('G6', 'PUBLISHED'));
            model.rename(savedScope('G6', 'PUBLISHED'));
            expect(model.hasPending).toBeFalse();
        });

        it('moves the saved link to the new key', (done) => {
            const { model, updates } = create();
            const s = savedScope();
            model.rename(s);
            s.field.name = 'G9';
            model.save().subscribe(() => {
                expect(updates[0].config.formulas[0].link).toEqual({ type: 'schema', entityId: '#root', item: 'risks.G9' });
                done();
            });
        });

        it('unbinds the saved key when a renamed field is deleted', (done) => {
            const { model, updates } = create();
            const s = savedScope();
            model.rename(s);
            s.field.name = 'G9';
            model.release(s);
            model.save().subscribe(() => {
                expect(updates[0].config.formulas[0].link).toBeNull();
                done();
            });
        });

        it('has no pending change after the key is typed back to the saved one', () => {
            const { model } = create();
            const s = savedScope();
            model.rename(s);
            s.field.name = 'G9';
            expect(model.hasPending).toBeTrue();
            s.field.name = 'G6';
            expect(model.hasPending).toBeFalse();
        });

        it('writes nothing when the key is typed back to the saved one', (done) => {
            const { model, updates } = create();
            const s = savedScope();
            model.rename(s);
            s.field.name = 'G9';
            s.field.name = 'G6';
            model.save().subscribe((ok: boolean) => {
                expect(ok).toBeTrue();
                expect(updates.length).toBe(0);
                done();
            });
        });

        it('queues nothing when the schema has no saved links', () => {
            const { model } = create();
            model.rename(savedScope('G7'));
            expect(model.hasPending).toBeFalse();
        });

        it('keeps the unbind on the saved key when the key is renamed afterwards', (done) => {
            const { model, updates } = create();
            const s = savedScope();
            const row = model.view(s, true, false).rows[0];
            model.unbind(s, row);
            model.rename(s);
            s.field.name = 'G9';
            model.save().subscribe(() => {
                expect(updates[0].config.formulas[0].link).toBeNull();
                done();
            });
        });

        it('unbinds the saved key when the key was renamed before the unbind', (done) => {
            const { model, updates } = create();
            const s = savedScope();
            model.rename(s);
            s.field.name = 'G9';
            const row = model.view(s, true, false).rows[0];
            model.unbind(s, row);
            model.save().subscribe(() => {
                expect(updates[0].config.formulas[0].link).toBeNull();
                done();
            });
        });
        it('keeps the link on the old key when the new key is already used by another field', (done) => {
            const { model, updates } = create();
            const s = savedScope();
            s.fields.push({ name: 'G9' } as any);
            model.rename(s);
            s.field.name = 'G9';
            model.save().subscribe(() => {
                expect(updates[0].config.formulas[0].link).toEqual({ type: 'schema', entityId: '#root', item: 'risks.G6' });
                done();
            });
        });

        describe('fields inside a sub-schema field', () => {
            function nestedDoc(): IFormula {
                const doc = createDoc();
                (doc.config as any).formulas[0].link = { type: 'schema', entityId: '#root', item: 'risks.G6.child' };
                return doc;
            }

            it('moves the links inside the field to the new key', (done) => {
                const { model, updates } = create(nestedDoc());
                const s = savedScope();
                model.rename(s);
                s.field.name = 'G9';
                model.save().subscribe(() => {
                    expect(updates[0].config.formulas[0].link).toEqual({ type: 'schema', entityId: '#root', item: 'risks.G9.child' });
                    done();
                });
            });

            it('unbinds the links inside the field when it is deleted', (done) => {
                const { model, updates } = create(nestedDoc());
                model.release(savedScope());
                model.save().subscribe(() => {
                    expect(updates[0].config.formulas[0].link).toBeNull();
                    done();
                });
            });

            it('leaves the links of a field with a similar key alone', () => {
                const { model } = create(nestedDoc());
                model.release(savedScope('G'));
                expect(model.hasPending).toBeFalse();
            });
        });
    });
});
