import { assert } from 'chai';
import { RequestValidationAddon } from '../../../dist/policy-engine/block-validators/blocks/request-validation-addon.js';

class FakeValidator {
    constructor() { this.errors = []; }
    addError(msg) { this.errors.push(msg); }
    async getArtifact() { return {}; }
    getErrorMessage(err) { return err?.message ?? String(err); }
}

const refWith = (options = {}) => ({ options });

describe('RequestValidationAddon.validate', () => {
    it('exposes blockType "requestValidationAddon"', () => {
        assert.equal(RequestValidationAddon.blockType, 'requestValidationAddon');
    });

    it('passes for an empty options object', async () => {
        const v = new FakeValidator();
        await RequestValidationAddon.validate(v, refWith());
        assert.deepEqual(v.errors, []);
    });

    it('passes for a valid validations array', async () => {
        const v = new FakeValidator();
        await RequestValidationAddon.validate(v, refWith({
            validations: [{
                dbCollection: 'VcDocument',
                filters: [],
                conditions: [],
                failMessage: 'fail',
            }],
        }));
        assert.deepEqual(v.errors, []);
    });

    it('rejects when validations is not an array', async () => {
        const v = new FakeValidator();
        await RequestValidationAddon.validate(v, refWith({ validations: 'invalid' }));
        assert.include(v.errors, 'Option "validations" must be an array');
    });

    it('rejects an unknown dbCollection value', async () => {
        const v = new FakeValidator();
        await RequestValidationAddon.validate(v, refWith({
            validations: [{ dbCollection: 'UnknownCollection', filters: [], conditions: [] }],
        }));
        assert.include(v.errors, 'Option "dbCollection" must be one of VcDocument|VpDocument');
    });

    it('passes for VpDocument collection', async () => {
        const v = new FakeValidator();
        await RequestValidationAddon.validate(v, refWith({
            validations: [{ dbCollection: 'VpDocument', filters: [], conditions: [] }],
        }));
        assert.deepEqual(v.errors, []);
    });

    it('rejects when filters is not an array', async () => {
        const v = new FakeValidator();
        await RequestValidationAddon.validate(v, refWith({
            validations: [{ dbCollection: 'VcDocument', filters: 'bad', conditions: [] }],
        }));
        assert.include(v.errors, 'Option "filters" must be an array');
    });

    it('rejects when conditions is not an array', async () => {
        const v = new FakeValidator();
        await RequestValidationAddon.validate(v, refWith({
            validations: [{ dbCollection: 'VcDocument', filters: [], conditions: 'bad' }],
        }));
        assert.include(v.errors, 'Option "conditions" must be an array');
    });
});
