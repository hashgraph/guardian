import { RequestDocumentBlockComponent } from './request-document-block.component';

describe('request document block autosave offer', () => {
    const SAVED = '2026-11-12T10:00:00.000Z';
    const SAVED_AGAIN = '2026-11-12T11:00:00.000Z';

    const create = (ref: unknown, record: { value: unknown; updatedAt?: number; baseUpdateDate?: string } | null) => {
        const block = Object.create(RequestDocumentBlockComponent.prototype) as any;
        block.ref = ref;
        block.draft = !!(ref as any)?.draft;
        block.policyId = 'policy-1';
        block.id = 'block-1';
        block.user = { id: 'user-1' };
        block.storage = {
            loadRecord: vi.fn().mockResolvedValue(record),
            delete: vi.fn().mockResolvedValue(undefined),
        };
        return block as { loadFreshAutosave(): Promise<unknown>; storage: { delete: ReturnType<typeof vi.fn> } };
    };

    it('offers the autosave of an opened draft that is still the record it was based on', async () => {
        const block = create({ id: 'draft-1', draft: true, updateDate: SAVED }, { value: { a: 1 }, baseUpdateDate: SAVED });
        expect(await block.loadFreshAutosave()).toEqual({ a: 1 });
        expect(block.storage.delete).not.toHaveBeenCalled();
    });

    it('drops the autosave of an opened draft that was saved again elsewhere', async () => {
        const block = create({ id: 'draft-1', draft: true, updateDate: SAVED_AGAIN }, { value: { a: 1 }, baseUpdateDate: SAVED });
        expect(await block.loadFreshAutosave()).toBeNull();
        expect(block.storage.delete).toHaveBeenCalledWith('draft-1');
    });

    it('does not depend on the browser clock: the time the autosave was written is not compared', async () => {
        // The browser clock is far behind the server, so the autosave looks older than the draft record
        const block = create(
            { id: 'draft-1', draft: true, updateDate: SAVED },
            { value: { a: 1 }, updatedAt: Date.parse(SAVED) - 5 * 60 * 1000, baseUpdateDate: SAVED }
        );
        expect(await block.loadFreshAutosave()).toEqual({ a: 1 });
        expect(block.storage.delete).not.toHaveBeenCalled();
    });

    it('offers an autosave that carries no base update time', async () => {
        const block = create({ id: 'draft-1', draft: true, updateDate: SAVED_AGAIN }, { value: { a: 1 }, updatedAt: 1 });
        expect(await block.loadFreshAutosave()).toEqual({ a: 1 });
        expect(block.storage.delete).not.toHaveBeenCalled();
    });

    it('offers the autosave of a new request, which has no record to compare with', async () => {
        const block = create(null, { value: { a: 1 } });
        expect(await block.loadFreshAutosave()).toEqual({ a: 1 });
        expect(block.storage.delete).not.toHaveBeenCalled();
    });

    it('does not compare the autosave of an edited document that is not a draft', async () => {
        const block = create({ id: 'doc-1', draft: false, updateDate: SAVED_AGAIN }, { value: { a: 1 }, baseUpdateDate: SAVED });
        expect(await block.loadFreshAutosave()).toEqual({ a: 1 });
        expect(block.storage.delete).not.toHaveBeenCalled();
    });

    it('offers nothing when no autosave is stored', async () => {
        const block = create({ id: 'draft-1', draft: true, updateDate: SAVED_AGAIN }, null);
        expect(await block.loadFreshAutosave()).toBeNull();
    });
});
