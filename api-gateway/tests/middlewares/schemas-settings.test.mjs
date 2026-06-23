import assert from 'node:assert/strict';
import { validate } from 'class-validator';
import {
    updateSettings,
    AboutResponseDTO,
    SettingsDTO,
} from '../../dist/middlewares/validation/schemas/settings.js';

const assignTo = (Cls, props) => Object.assign(new Cls(), props);

describe('updateSettings (yup)', () => {
    const schema = updateSettings();

    it('accepts a complete body', () => {
        assert.equal(schema.isValidSync({ body: { ipfsStorageApiKey: 'k', operatorId: '0.0.1', operatorKey: 'key' } }), true);
    });

    it('rejects a missing ipfsStorageApiKey', () => {
        assert.equal(schema.isValidSync({ body: { operatorId: '0.0.1', operatorKey: 'key' } }), false);
    });

    it('rejects a missing operatorId', () => {
        assert.equal(schema.isValidSync({ body: { ipfsStorageApiKey: 'k', operatorKey: 'key' } }), false);
    });

    it('rejects a missing operatorKey', () => {
        assert.equal(schema.isValidSync({ body: { ipfsStorageApiKey: 'k', operatorId: '0.0.1' } }), false);
    });

    it('rejects an empty body', () => {
        assert.equal(schema.isValidSync({ body: {} }), false);
    });
});

describe('AboutResponseDTO (class-validator)', () => {
    it('passes with a string version', async () => {
        const errs = await validate(assignTo(AboutResponseDTO, { version: '2.8.1' }));
        assert.equal(errs.length, 0);
    });

    it('rejects a non-string version', async () => {
        const errs = await validate(assignTo(AboutResponseDTO, { version: 281 }));
        assert.ok(errs.some((e) => e.property === 'version'));
    });
});

describe('SettingsDTO (class-validator)', () => {
    it('passes when all keys are non-empty strings', async () => {
        const errs = await validate(assignTo(SettingsDTO, { ipfsStorageApiKey: 'k', operatorId: '0.0.1', operatorKey: 'key' }));
        assert.equal(errs.length, 0);
    });

    it('reports errors for every missing key', async () => {
        const errs = await validate(new SettingsDTO());
        assert.equal(errs.length, 3);
    });

    it('rejects an empty operatorKey', async () => {
        const errs = await validate(assignTo(SettingsDTO, { ipfsStorageApiKey: 'k', operatorId: '0.0.1', operatorKey: '' }));
        assert.ok(errs.some((e) => e.property === 'operatorKey'));
    });
});
