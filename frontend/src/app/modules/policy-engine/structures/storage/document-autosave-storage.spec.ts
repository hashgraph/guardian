import { DocumentAutosaveStorage, isAutosaveStale } from './document-autosave-storage';

describe('DocumentAutosaveStorage', () => {
    const create = (record: unknown) => {
        const registry = {
            registerStore: () => undefined,
            get: jasmine.createSpy('get').and.resolveTo(record),
            put: jasmine.createSpy('put').and.resolveTo(undefined),
            delete: jasmine.createSpy('delete').and.resolveTo(undefined),
        };
        return { registry, storage: new DocumentAutosaveStorage(registry as any) };
    };

    it('returns the value together with the time it was written', async () => {
        const { storage } = create({ documentId: 'a', value: { title: 'x' }, updatedAt: 1000 });
        expect(await storage.loadRecord('a')).toEqual({ value: { title: 'x' }, updatedAt: 1000 });
    });

    it('returns null when nothing is stored', async () => {
        const { storage } = create(undefined);
        expect(await storage.loadRecord('a')).toBeNull();
        expect(await storage.load('a')).toBeNull();
    });

    describe('isAutosaveStale', () => {
        const saved = Date.parse('2026-11-12T10:00:00.000Z');

        it('is stale when the server record was updated after the autosave', () => {
            expect(isAutosaveStale(saved, '2026-11-12T10:05:00.000Z')).toBeTrue();
        });

        it('is fresh when the autosave is newer than the server record', () => {
            expect(isAutosaveStale(saved, '2026-11-12T09:55:00.000Z')).toBeFalse();
        });

        it('is fresh when either time is missing or unreadable', () => {
            expect(isAutosaveStale(undefined, '2026-11-12T10:05:00.000Z')).toBeFalse();
            expect(isAutosaveStale(saved, undefined)).toBeFalse();
            expect(isAutosaveStale(saved, 'not a date')).toBeFalse();
        });
    });
});
