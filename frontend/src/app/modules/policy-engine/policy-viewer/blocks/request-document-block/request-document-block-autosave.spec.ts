import { RequestDocumentBlockComponent } from './request-document-block.component';

describe('request document block autosave offer', () => {
    const savedAt = Date.parse('2026-11-12T10:00:00.000Z');

    const create = (ref: unknown, record: { value: unknown; updatedAt: number } | null) => {
        const block = Object.create(RequestDocumentBlockComponent.prototype) as any;
        block.ref = ref;
        block.draft = !!(ref as any)?.draft;
        block.policyId = 'policy-1';
        block.id = 'block-1';
        block.user = { id: 'user-1' };
        block.storage = {
            loadRecord: jasmine.createSpy('loadRecord').and.resolveTo(record),
            delete: jasmine.createSpy('delete').and.resolveTo(undefined),
        };
        return block as { loadFreshAutosave(): Promise<unknown>; storage: { delete: jasmine.Spy } };
    };

    it('offers the autosave of an opened draft that is newer than the saved record', async () => {
        const block = create({ id: 'draft-1', draft: true, updateDate: '2026-11-12T09:00:00.000Z' }, { value: { a: 1 }, updatedAt: savedAt });
        expect(await block.loadFreshAutosave()).toEqual({ a: 1 });
        expect(block.storage.delete).not.toHaveBeenCalled();
    });

    it('drops the autosave of an opened draft that was saved again elsewhere', async () => {
        const block = create({ id: 'draft-1', draft: true, updateDate: '2026-11-12T11:00:00.000Z' }, { value: { a: 1 }, updatedAt: savedAt });
        expect(await block.loadFreshAutosave()).toBeNull();
        expect(block.storage.delete).toHaveBeenCalledWith('draft-1');
    });

    it('offers the autosave of a new request, which has no record to compare with', async () => {
        const block = create(null, { value: { a: 1 }, updatedAt: savedAt });
        expect(await block.loadFreshAutosave()).toEqual({ a: 1 });
        expect(block.storage.delete).not.toHaveBeenCalled();
    });

    it('does not compare the autosave of an edited document that is not a draft', async () => {
        const block = create({ id: 'doc-1', draft: false, updateDate: '2026-11-12T11:00:00.000Z' }, { value: { a: 1 }, updatedAt: savedAt });
        expect(await block.loadFreshAutosave()).toEqual({ a: 1 });
        expect(block.storage.delete).not.toHaveBeenCalled();
    });

    it('offers nothing when no autosave is stored', async () => {
        const block = create({ id: 'draft-1', draft: true, updateDate: '2026-11-12T11:00:00.000Z' }, null);
        expect(await block.loadFreshAutosave()).toBeNull();
    });
});
