import { LinkDialog } from './link-dialog.component';

describe('LinkDialog table columns', () => {
    const schema = { iri: '#s', fields: [
        { name: 'table', path: 'table', description: 'Results', customType: 'table', tableColumns: [{ key: 'co2', name: 'CO2' }, { key: 'net', name: 'Net' }] },
        { name: 'legacy', path: 'legacy', description: 'Legacy', customType: 'table' }
    ] };
    const build = (link?: any) => {
        const ref = { close: vi.fn() };
        const dialog = new LinkDialog(ref as any, { data: { schemas: [schema], link } } as any, {} as any);
        dialog.entityId = '#s';
        dialog.onNext();
        return { dialog, ref };
    };

    it('lists declared columns and the whole table while leaving legacy tables as leaves', () => {
        const { dialog, ref } = build();
        const table = dialog.items!.findOne(field => field.path === 'table' && !field.columnKey)!;
        expect(table.expandable).toBe(true);
        expect(table.children.map(child => child.data.description)).toEqual(['Whole table', 'CO2', 'Net']);
        expect(dialog.items!.findOne(field => field.path === 'legacy')!.expandable).toBe(false);
        dialog.onSelectField(table.children[1]);
        dialog.onSubmit();
        expect(ref.close).toHaveBeenCalledWith({ type: 'schema', entityId: '#s', item: 'table', columnKey: 'co2' });
        dialog.onSelectField(table.children[0]);
        dialog.onSubmit();
        expect(ref.close).toHaveBeenLastCalledWith({ type: 'schema', entityId: '#s', item: 'table' });
        expect(schema.fields[0]).not.toHaveProperty('fields');
    });

    it('reopens the saved column and clears its identity when changing schema', () => {
        const { dialog } = build({ type: 'schema', entityId: '#s', item: 'table', columnKey: 'net' });
        expect(dialog.columnKey).toBe('net');
        const selected = dialog.items!.findOne(field => field.columnKey === 'net')!;
        expect(selected.hidden).toBe(false);
        dialog.onSelectEntity({ iri: '#other' });
        expect(dialog.columnKey).toBeUndefined();
        expect(dialog.itemId).toBeNull();
    });
});
