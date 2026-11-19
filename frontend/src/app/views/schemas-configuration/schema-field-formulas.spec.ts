import { NEVER, firstValueFrom, of } from 'rxjs';
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

    function create(doc: IFormula = createDoc()): {
        model: any;
        updates: any[];
    } {
        const updates: any[] = [];
        const formulasService: any = {
            getFormula: () => of(JSON.parse(JSON.stringify(doc))),
            updateFormula: (item: any) => { updates.push(item); return of(item); },
            createFormula: (item: any) => { updates.push(item); return of(item); },
            getFormulas: () => of({ body: [], headers: { get: () => '0' } }),
            parsePage: () => ({ page: [], count: 0 }),
        };
        const model: any = new SchemaFieldFormulas(formulasService, {} as any, {} as any, () => { }, () => '');
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

    it('keeps the saved link in the preview tree while the formulas reload', async () => {
        const { model } = create();
        model.formulasService.getFormulas = () => NEVER;
        model.assign(scope([], 'G7'), 'd1|f1');

        model.save().subscribe(() => {
            expect(model.hasPending).toBe(false);
            expect(model.previewTree([]).getFields('#root')['#root/G7']).toBeDefined();
            ;
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

    it('saves a binding with the prefix fixed when it was queued', async () => {
        const { model, updates } = create();
        const s = scope(['risks'], 'G7');
        model.assign(s, 'd1|f1');
        s.prefix.push('changed');
        s.field.name = 'G8';
        model.save().subscribe((ok: boolean) => {
            expect(ok).toBe(true);
            expect(updates[0].config.formulas[1].link).toEqual({ type: 'schema', entityId: '#root', item: 'risks.G8' });
            expect(model.hasPending).toBe(false);
            ;
        });
    });

    it('adds a link to an item that is already linked, and unlinks only that link', async () => {
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
            ;
        });
    });

    it('counts an item with two links to different fields on each of them', () => {
        const { model } = create();
        const schema: any = { id: 's1', iri: '#root' };
        model.assign(scope(['risks'], 'G7'), 'd1|v1');
        expect(model.count(schema, ['risks'], 'G6')).toBe(1);
        expect(model.count(schema, ['risks'], 'G7')).toBe(1);
    });

    it('counts only the formulas the field card lists, not those linked to its columns', () => {
        const doc = createDoc();
        (doc.config as any).formulas[1].links = [
            { type: 'schema', entityId: '#root', item: 'risks.T', columnKey: 'co2' },
            { type: 'schema', entityId: '#root', item: 'risks.T', columnKey: 'co2', rowIndex: 0 }
        ];
        const { model } = create(doc);
        const schema: any = { id: 's1', iri: '#root' };
        expect(model.count(schema, ['risks'], 'T')).toBe(0);
        expect(model.view(scope(['risks'], 'T'), true, false).rows).toEqual([]);
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
        expect(model.creating).toBe(false);
        expect(model.newDocument).toBe('');
        model.startCreate();
        model.view(scope(['risks'], 'G9'), true, false);
        expect(model.creating).toBe(false);
    });

    it('creates nothing until a formula document is chosen', () => {
        const { model } = create();
        const s = scope(['risks'], 'G7');
        model.view(s, true, false);
        model.startCreate();
        model.newName = 'New';
        expect(model.canCreate).toBe(false);
        model.create(s);
        expect(model.hasPending).toBe(false);
        model.newDocument = 'd1';
        expect(model.canCreate).toBe(true);
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
            expect(model.hasPending).toBe(false);
        });

        it('unbinds the saved link when the field is deleted', async () => {
            const { model, updates } = create();
            model.release(savedScope());
            model.save().subscribe(() => {
                expect(updates[0].config.formulas[0].link).toBeNull();
                ;
            });
        });

        it('unbinds the whole-table, column and cell links of a deleted table, keeping other fields', async () => {
            const doc = createDoc();
            (doc.config as any).formulas[0].link = null;
            (doc.config as any).formulas[0].links = [
                { type: 'schema', entityId: '#root', item: 'risks.G6' },
                { type: 'schema', entityId: '#root', item: 'risks.G6', columnKey: 'co2' },
                { type: 'schema', entityId: '#root', item: 'risks.G6', columnKey: 'co2', rowIndex: 0 },
                { type: 'schema', entityId: '#root', item: 'risks.G7', columnKey: 'co2' }
            ];
            const { model, updates } = create(doc);
            model.release(savedScope());
            expect(await firstValueFrom(model.save())).toBe(true);
            expect(updates[0].config.formulas[0].links).toEqual([{ type: 'schema', entityId: '#root', item: 'risks.G7', columnKey: 'co2' }]);
            expect(model.hasPending).toBe(false);
        });

        it('still unbinds only the whole-table link when it is removed from the field card', async () => {
            const doc = createDoc();
            (doc.config as any).formulas[0].link = null;
            (doc.config as any).formulas[0].links = [
                { type: 'schema', entityId: '#root', item: 'risks.G6' },
                { type: 'schema', entityId: '#root', item: 'risks.G6', columnKey: 'co2' }
            ];
            const { model, updates } = create(doc);
            const s = savedScope();
            const row = model.view(s, true, false).rows[0];
            model.unbind(s, row);
            expect(await firstValueFrom(model.save())).toBe(true);
            expect(updates[0].config.formulas[0].links).toEqual([{ type: 'schema', entityId: '#root', item: 'risks.G6', columnKey: 'co2' }]);
        });

        function tableAndColumnDoc(): IFormula {
            const doc = createDoc();
            (doc.config as any).formulas[0].link = null;
            (doc.config as any).formulas[0].links = [
                { type: 'schema', entityId: '#root', item: 'risks.G6' },
                { type: 'schema', entityId: '#root', item: 'risks.G6', columnKey: 'co2' }
            ];
            return doc;
        }

        it('moves the column link of a renamed table when its whole-table link is removed afterwards', async () => {
            const { model, updates } = create(tableAndColumnDoc());
            const s = savedScope();
            model.rename(s);
            s.field.name = 'G9';
            model.unbind(s, model.view(s, true, false).rows[0]);
            expect(await firstValueFrom(model.save())).toBe(true);
            expect(updates[0].config.formulas[0].links).toEqual([{ type: 'schema', entityId: '#root', item: 'risks.G9', columnKey: 'co2' }]);
        });

        it('moves the column link of a table renamed after its whole-table link was removed', async () => {
            const { model, updates } = create(tableAndColumnDoc());
            const s = savedScope();
            model.unbind(s, model.view(s, true, false).rows[0]);
            model.rename(s);
            s.field.name = 'G9';
            expect(await firstValueFrom(model.save())).toBe(true);
            expect(updates[0].config.formulas[0].links).toEqual([{ type: 'schema', entityId: '#root', item: 'risks.G9', columnKey: 'co2' }]);
        });

        it('queues nothing for a published schema', () => {
            const { model } = create();
            model.release(savedScope('G6', 'PUBLISHED'));
            model.rename(savedScope('G6', 'PUBLISHED'));
            expect(model.hasPending).toBe(false);
        });

        it('moves the saved link to the new key', async () => {
            const { model, updates } = create();
            const s = savedScope();
            model.rename(s);
            s.field.name = 'G9';
            model.save().subscribe(() => {
                expect(updates[0].config.formulas[0].link).toEqual({ type: 'schema', entityId: '#root', item: 'risks.G9' });
                ;
            });
        });

        it('unbinds the saved key when a renamed field is deleted', async () => {
            const { model, updates } = create();
            const s = savedScope();
            model.rename(s);
            s.field.name = 'G9';
            model.release(s);
            model.save().subscribe(() => {
                expect(updates[0].config.formulas[0].link).toBeNull();
                ;
            });
        });

        it('has no pending change after the key is typed back to the saved one', () => {
            const { model } = create();
            const s = savedScope();
            model.rename(s);
            s.field.name = 'G9';
            expect(model.hasPending).toBe(true);
            s.field.name = 'G6';
            expect(model.hasPending).toBe(false);
        });

        it('writes nothing when the key is typed back to the saved one', async () => {
            const { model, updates } = create();
            const s = savedScope();
            model.rename(s);
            s.field.name = 'G9';
            s.field.name = 'G6';
            model.save().subscribe((ok: boolean) => {
                expect(ok).toBe(true);
                expect(updates.length).toBe(0);
                ;
            });
        });

        it('queues nothing when the schema has no saved links', () => {
            const { model } = create();
            model.rename(savedScope('G7'));
            expect(model.hasPending).toBe(false);
        });

        it('keeps the unbind on the saved key when the key is renamed afterwards', async () => {
            const { model, updates } = create();
            const s = savedScope();
            const row = model.view(s, true, false).rows[0];
            model.unbind(s, row);
            model.rename(s);
            s.field.name = 'G9';
            model.save().subscribe(() => {
                expect(updates[0].config.formulas[0].link).toBeNull();
                ;
            });
        });

        it('unbinds the saved key when the key was renamed before the unbind', async () => {
            const { model, updates } = create();
            const s = savedScope();
            model.rename(s);
            s.field.name = 'G9';
            const row = model.view(s, true, false).rows[0];
            model.unbind(s, row);
            model.save().subscribe(() => {
                expect(updates[0].config.formulas[0].link).toBeNull();
                ;
            });
        });
        it('keeps the link on the old key when the new key is already used by another field', async () => {
            const { model, updates } = create();
            const s = savedScope();
            s.fields.push({ name: 'G9' } as any);
            model.rename(s);
            s.field.name = 'G9';
            model.save().subscribe(() => {
                expect(updates[0].config.formulas[0].link).toEqual({ type: 'schema', entityId: '#root', item: 'risks.G6' });
                ;
            });
        });

        describe('a renamed field and its renamed parent', () => {
            function nestedDoc(): IFormula {
                const doc = createDoc();
                (doc.config as any).formulas[0].link = { type: 'schema', entityId: '#root', item: 'X.a' };
                return doc;
            }

            function scopes() {
                const parent: any = { name: 'X' };
                const child: any = { name: 'a' };
                const schema: any = { id: 's1', iri: '#root', status: 'DRAFT', fields: [parent] };
                return {
                    parent,
                    child,
                    parentScope: (): IFieldScope => ({ schema, field: parent, prefix: [], fields: [parent] }),
                    childScope: (): IFieldScope => ({ schema, field: child, prefix: [parent.name], ancestors: [parent], fields: [child] })
                };
            }

            const link = (item: string) => ({ type: 'schema', entityId: '#root', item });

            it('follows the child rename and then the parent rename', async () => {
                const { model, updates } = create(nestedDoc());
                const f = scopes();
                model.rename(f.childScope());
                f.child.name = 'b';
                model.rename(f.parentScope());
                f.parent.name = 'Y';
                model.save().subscribe(() => {
                    expect(updates[0].config.formulas[0].link).toEqual(link('Y.b'));
                    ;
                });
            });

            it('follows the parent rename and then the child rename', async () => {
                const { model, updates } = create(nestedDoc());
                const f = scopes();
                model.rename(f.parentScope());
                f.parent.name = 'Y';
                model.rename(f.childScope());
                f.child.name = 'b';
                model.save().subscribe(() => {
                    expect(updates[0].config.formulas[0].link).toEqual(link('Y.b'));
                    ;
                });
            });

            it('unbinds the link of a child deleted after the parent rename', async () => {
                const { model, updates } = create(nestedDoc());
                const f = scopes();
                model.rename(f.parentScope());
                f.parent.name = 'Y';
                model.release(f.childScope());
                model.save().subscribe(() => {
                    expect(updates[0].config.formulas[0].link).toBeNull();
                    ;
                });
            });

            it('follows a second child rename after the parent rename', async () => {
                const { model, updates } = create(nestedDoc());
                const f = scopes();
                model.rename(f.childScope());
                f.child.name = 'b';
                model.rename(f.parentScope());
                f.parent.name = 'Y';
                model.rename(f.childScope());
                f.child.name = 'c';
                model.save().subscribe(() => {
                    expect(updates[0].config.formulas[0].link).toEqual(link('Y.c'));
                    ;
                });
            });
        });

        describe('pending change combinations on a nested table', () => {
            const whole = (item: string) => ({ type: 'schema', entityId: '#root', item });
            const column = (item: string) => ({ type: 'schema', entityId: '#root', item, columnKey: 'co2' });
            const other = { type: 'schema', entityId: '#other', item: 'G.X.a', columnKey: 'co2' };

            function linkedDoc(links: any[]): IFormula {
                const doc = createDoc();
                (doc.config as any).formulas[0].link = null;
                (doc.config as any).formulas[0].links = links;
                return doc;
            }

            function tree() {
                const g: any = { name: 'G' };
                const x: any = { name: 'X' };
                const a: any = { name: 'a' };
                const schema: any = { id: 's1', iri: '#root', status: 'DRAFT', fields: [g] };
                const fields: any[] = [a];
                const scopeOf = (field: any): IFieldScope => ({ schema, field, prefix: [g.name, x.name], ancestors: [g, x], fields });
                return {
                    g, x, a, fields, scopeOf,
                    gScope: (): IFieldScope => ({ schema, field: g, prefix: [], fields: [g] }),
                    xScope: (): IFieldScope => ({ schema, field: x, prefix: [g.name], ancestors: [g], fields: [x] }),
                    aScope: () => scopeOf(a)
                };
            }

            async function savedLinks(model: any, updates: any[]): Promise<any[]> {
                expect(await firstValueFrom(model.save())).toBe(true);
                expect(model.hasPending).toBe(false);
                return updates[updates.length - 1].config.formulas[0].links;
            }

            function removeFromCard(model: any, scope: IFieldScope): void {
                const row = model.view(scope, true, false).rows.find((r: any) => r.itemUuid === 'v1');
                expect(row).toBeDefined();
                model.unbind(scope, row);
            }

            const renameField = (model: any, scope: IFieldScope, field: any, name: string) => {
                model.rename(scope);
                field.name = name;
            };

            it('parent rename, removal, child rename, grandparent rename: only the column link moves', async () => {
                for (const [links, expected] of [
                    [[whole('G.X.a'), column('G.X.a'), whole('Q'), other], [column('H.Y.b'), whole('Q'), other]],
                    [[whole('G.X.a'), whole('Q')], [whole('Q')]]
                ]) {
                    const { model, updates } = create(linkedDoc(links));
                    const t = tree();
                    renameField(model, t.xScope(), t.x, 'Y');
                    removeFromCard(model, t.aScope());
                    renameField(model, t.aScope(), t.a, 'b');
                    renameField(model, t.gScope(), t.g, 'H');
                    expect(await savedLinks(model, updates)).toEqual(expected);
                }
            });

            it('removal first, then child, parent and grandparent renames: only the column link moves', async () => {
                for (const [links, expected] of [
                    [[whole('G.X.a'), column('G.X.a'), whole('Q'), other], [column('H.Y.b'), whole('Q'), other]],
                    [[whole('G.X.a'), whole('Q')], [whole('Q')]]
                ]) {
                    const { model, updates } = create(linkedDoc(links));
                    const t = tree();
                    removeFromCard(model, t.aScope());
                    renameField(model, t.aScope(), t.a, 'b');
                    renameField(model, t.xScope(), t.x, 'Y');
                    renameField(model, t.gScope(), t.g, 'H');
                    expect(await savedLinks(model, updates)).toEqual(expected);
                }
            });

            it('renamed several times and back to the saved name, with a removal in between', async () => {
                const { model, updates } = create(linkedDoc([whole('G.X.a'), column('G.X.a'), whole('Q'), other]));
                const t = tree();
                renameField(model, t.aScope(), t.a, 'b');
                removeFromCard(model, t.aScope());
                renameField(model, t.aScope(), t.a, 'c');
                renameField(model, t.aScope(), t.a, 'a');
                expect(await savedLinks(model, updates)).toEqual([column('G.X.a'), whole('Q'), other]);
            });

            it('deleted after a rename and a removal: no link of the table is left', async () => {
                const { model, updates } = create(linkedDoc([whole('G.X.a'), column('G.X.a'), whole('Q'), other]));
                const t = tree();
                renameField(model, t.xScope(), t.x, 'Y');
                removeFromCard(model, t.aScope());
                renameField(model, t.aScope(), t.a, 'b');
                model.release(t.aScope());
                expect(await savedLinks(model, updates)).toEqual([whole('Q'), other]);
            });

            it('parent deleted after a child removal: no link of the table is left', async () => {
                const { model, updates } = create(linkedDoc([whole('G.X.a'), column('G.X.a'), whole('Q'), other]));
                const t = tree();
                removeFromCard(model, t.aScope());
                renameField(model, t.aScope(), t.a, 'b');
                model.release(t.xScope());
                expect(await savedLinks(model, updates)).toEqual([whole('Q'), other]);
            });

            it('removed and assigned again on the same field: nothing changes', async () => {
                const { model, updates } = create(linkedDoc([whole('G.X.a'), column('G.X.a')]));
                const t = tree();
                removeFromCard(model, t.aScope());
                model.assign(t.aScope(), 'd1|v1');
                expect(model.hasPending).toBe(false);
                expect(await firstValueFrom(model.save())).toBe(true);
                expect(updates).toEqual([]);
            });

            it('deleted, recreated under the same key and assigned: only the new whole-table link', async () => {
                for (const links of [[column('G.X.a'), whole('Q'), other], [whole('G.X.a'), column('G.X.a'), whole('Q'), other]]) {
                    const { model, updates } = create(linkedDoc(links));
                    const t = tree();
                    model.release(t.aScope());
                    const recreated: any = { name: 'a' };
                    t.fields.splice(0, 1, recreated);
                    model.assign(t.scopeOf(recreated), 'd1|v1');
                    expect(await savedLinks(model, updates)).toEqual([whole('Q'), other, whole('G.X.a')]);
                }
            });

            it('deleted and recreated under another key and assigned: the old links do not follow', async () => {
                const { model, updates } = create(linkedDoc([whole('G.X.a'), column('G.X.a'), whole('Q'), other]));
                const t = tree();
                model.release(t.aScope());
                const recreated: any = { name: 'b' };
                t.fields.splice(0, 1, recreated);
                model.assign(t.scopeOf(recreated), 'd1|v1');
                expect(await savedLinks(model, updates)).toEqual([whole('Q'), other, whole('G.X.b')]);
            });
        });

        describe('fields inside a sub-schema field', () => {
            function nestedDoc(): IFormula {
                const doc = createDoc();
                (doc.config as any).formulas[0].link = { type: 'schema', entityId: '#root', item: 'risks.G6.child' };
                return doc;
            }

            it('moves the links inside the field to the new key', async () => {
                const { model, updates } = create(nestedDoc());
                const s = savedScope();
                model.rename(s);
                s.field.name = 'G9';
                model.save().subscribe(() => {
                    expect(updates[0].config.formulas[0].link).toEqual({ type: 'schema', entityId: '#root', item: 'risks.G9.child' });
                    ;
                });
            });

            it('unbinds the links inside the field when it is deleted', async () => {
                const { model, updates } = create(nestedDoc());
                model.release(savedScope());
                model.save().subscribe(() => {
                    expect(updates[0].config.formulas[0].link).toBeNull();
                    ;
                });
            });

            it('unbinds the column links of a table inside the field when it is deleted', async () => {
                const doc = createDoc();
                (doc.config as any).formulas[0].link = null;
                (doc.config as any).formulas[0].links = [
                    { type: 'schema', entityId: '#root', item: 'risks.G6.table', columnKey: 'co2' },
                    { type: 'schema', entityId: '#root', item: 'risks.G7', columnKey: 'co2' }
                ];
                const { model, updates } = create(doc);
                model.release(savedScope());
                expect(await firstValueFrom(model.save())).toBe(true);
                expect(updates[0].config.formulas[0].links).toEqual([{ type: 'schema', entityId: '#root', item: 'risks.G7', columnKey: 'co2' }]);
            });

            it('leaves the links of a field with a similar key alone', () => {
                const { model } = create(nestedDoc());
                model.release(savedScope('G'));
                expect(model.hasPending).toBe(false);
            });
        });
    });
});
