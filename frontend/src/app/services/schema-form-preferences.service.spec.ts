import { SchemaFormPreferencesService } from './schema-form-preferences.service';
import { LAST_USER_STORAGE_KEY } from './app-theme.service';

describe('SchemaFormPreferencesService', () => {
    const clear = () => {
        for (const key of Object.keys(localStorage)) {
            if (key.startsWith('SCHEMA_FORM_FIELD_METADATA') || key.startsWith('SCHEMA_FORM_COMMENTS_WIDTH') || key === LAST_USER_STORAGE_KEY) {
                localStorage.removeItem(key);
            }
        }
    };
    beforeEach(clear);
    afterEach(clear);

    it('is off by default', () => {
        expect(new SchemaFormPreferencesService().showFieldMetadata).toBe(false);
    });

    it('stores the flag under the last signed-in user', () => {
        localStorage.setItem(LAST_USER_STORAGE_KEY, 'alice');
        const service = new SchemaFormPreferencesService();
        service.setShowFieldMetadata(true);
        expect(localStorage.getItem('SCHEMA_FORM_FIELD_METADATA:alice')).toBe('true');
        expect(new SchemaFormPreferencesService().showFieldMetadata).toBe(true);
        localStorage.setItem(LAST_USER_STORAGE_KEY, 'bob');
        expect(new SchemaFormPreferencesService().showFieldMetadata).toBe(false);
    });

    it('follows a user who signed in after the service was created', () => {
        localStorage.setItem('SCHEMA_FORM_FIELD_METADATA:bob', 'true');
        const service = new SchemaFormPreferencesService();
        expect(service.showFieldMetadata).toBe(false);
        localStorage.setItem(LAST_USER_STORAGE_KEY, 'bob');
        service.reload();
        expect(service.showFieldMetadata).toBe(true);
    });

    describe('discussions width', () => {
        it('is not set by default', () => {
            expect(new SchemaFormPreferencesService().getCommentsWidth()).toBeNull();
        });

        it('keeps the width per user', () => {
            localStorage.setItem(LAST_USER_STORAGE_KEY, 'alice');
            const service = new SchemaFormPreferencesService();
            service.setCommentsWidth(480);
            expect(localStorage.getItem('SCHEMA_FORM_COMMENTS_WIDTH:alice')).toBe('480');
            expect(service.getCommentsWidth()).toBe(480);
            localStorage.setItem(LAST_USER_STORAGE_KEY, 'bob');
            expect(service.getCommentsWidth()).toBeNull();
        });

        it('ignores a stored value that is not a number', () => {
            localStorage.setItem('SCHEMA_FORM_COMMENTS_WIDTH', 'abc');
            expect(new SchemaFormPreferencesService().getCommentsWidth()).toBeNull();
        });

        it('survives storage that throws', () => {
            const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied'); });
            const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
            try {
                expect(new SchemaFormPreferencesService().getCommentsWidth()).toBeNull();
            } finally {
                spy.mockRestore();
                error.mockRestore();
            }
        });
    });
});
