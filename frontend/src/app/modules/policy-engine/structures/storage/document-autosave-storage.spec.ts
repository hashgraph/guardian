import { DocumentAutosaveStorage, isAutosaveStale } from './document-autosave-storage';

describe('DocumentAutosaveStorage', () => {
    const create = (record: unknown) => {
        const registry = {
            registerStore: () => undefined,
            get: vi.fn().mockResolvedValue(record),
            put: vi.fn().mockResolvedValue(undefined),
            delete: vi.fn().mockResolvedValue(undefined),
        };
        return { registry, storage: new DocumentAutosaveStorage(registry as any) };
    };

    it('returns the value together with the time it was written', async () => {
        const { storage } = create({ documentId: 'a', value: { title: 'x' }, updatedAt: 1000 });
        expect(await storage.loadRecord('a')).toEqual({ value: { title: 'x' }, updatedAt: 1000, baseUpdateDate: undefined });
    });

    it('returns null when nothing is stored', async () => {
        const { storage } = create(undefined);
        expect(await storage.loadRecord('a')).toBeNull();
        expect(await storage.load('a')).toBeNull();
    });

    it('stores the update time of the record the autosave is based on', async () => {
        const { registry, storage } = create(undefined);
        await storage.save('a', { title: 'x' }, '2026-11-14T10:00:00.000Z');
        expect(registry.put.mock.calls[0][2]).toMatchObject({
            documentId: 'a',
            value: { title: 'x' },
            baseUpdateDate: '2026-11-14T10:00:00.000Z',
        });
    });

    it('returns the stored base update time', async () => {
        const { storage } = create({ documentId: 'a', value: { title: 'x' }, updatedAt: 1000, baseUpdateDate: '2026-11-14T10:00:00.000Z' });
        expect((await storage.loadRecord('a'))?.baseUpdateDate).toBe('2026-11-14T10:00:00.000Z');
    });

    describe('isAutosaveStale', () => {
        const base = '2026-11-14T10:00:00.000Z';

        it('is stale when the record was saved again after the autosave was based on it', () => {
            expect(isAutosaveStale(base, '2026-11-14T10:05:00.000Z')).toBe(true);
        });

        it('is fresh when the record is still the one the autosave was based on', () => {
            expect(isAutosaveStale(base, '2026-11-14T10:00:00.000Z')).toBe(false);
        });

        it('compares instants, not their text', () => {
            expect(isAutosaveStale(base, '2026-11-14T12:00:00.000+02:00')).toBe(false);
        });

        it('is fresh when either time is missing or unreadable', () => {
            expect(isAutosaveStale(undefined, base)).toBe(false);
            expect(isAutosaveStale(base, undefined)).toBe(false);
            expect(isAutosaveStale(base, 'not a date')).toBe(false);
        });
    });
});
