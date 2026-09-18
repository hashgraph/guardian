import assert from 'node:assert/strict';
import esmock from 'esmock';

const { ValidateConfiguration } = await esmock('../../../dist/helpers/validate-configuration.js', {
    '../../../dist/decorators/singleton.js': { Singleton: (t) => t }, // identity passthrough
});

describe('@unit ValidateConfiguration', () => {
    it('throws if validate() is called before any callback is set', async () => {
        const c = new ValidateConfiguration();
        await assert.rejects(() => c.validate(), /Callbacks was not set/);
    });

    it('throws if validate() is called with only validator set', async () => {
        const c = new ValidateConfiguration();
        c.setValidator(async () => true);
        await assert.rejects(() => c.validate(), /Callbacks was not set/);
    });

    it('throws if validate() is called with only one action set', async () => {
        const c = new ValidateConfiguration();
        c.setValidAction(async () => {});
        c.setValidator(async () => true);
        await assert.rejects(() => c.validate(), /Callbacks was not set/);
    });

    it('fires validAction when validator returns true', async () => {
        const c = new ValidateConfiguration();
        let validRan = false, invalidRan = false;
        c.setValidAction(async () => { validRan = true; });
        c.setInvalidAction(async () => { invalidRan = true; });
        c.setValidator(async () => true);
        await c.validate();
        assert.equal(validRan, true);
        assert.equal(invalidRan, false);
    });

    it('fires invalidAction when validator returns false', async () => {
        const c = new ValidateConfiguration();
        let validRan = false, invalidRan = false;
        c.setValidAction(async () => { validRan = true; });
        c.setInvalidAction(async () => { invalidRan = true; });
        c.setValidator(async () => false);
        await c.validate();
        assert.equal(validRan, false);
        assert.equal(invalidRan, true);
    });

    it('set-once: setValidAction throws when called twice', () => {
        const c = new ValidateConfiguration();
        c.setValidAction(async () => {});
        assert.throws(() => c.setValidAction(async () => {}), /OnValid action was set before/);
    });

    it('set-once: setInvalidAction throws when called twice', () => {
        const c = new ValidateConfiguration();
        c.setInvalidAction(async () => {});
        assert.throws(() => c.setInvalidAction(async () => {}), /OnInvalid action was set before/);
    });

    it('set-once: setValidator throws when called twice', () => {
        const c = new ValidateConfiguration();
        c.setValidator(async () => true);
        assert.throws(() => c.setValidator(async () => false), /Validator was set before/);
    });

    it('propagates rejection from validAction (not swallowed)', async () => {
        const c = new ValidateConfiguration();
        c.setValidAction(async () => { throw new Error('valid-blew-up'); });
        c.setInvalidAction(async () => {});
        c.setValidator(async () => true);
        await assert.rejects(() => c.validate(), /valid-blew-up/);
    });

    it('propagates rejection from invalidAction (not swallowed)', async () => {
        const c = new ValidateConfiguration();
        c.setValidAction(async () => {});
        c.setInvalidAction(async () => { throw new Error('invalid-blew-up'); });
        c.setValidator(async () => false);
        await assert.rejects(() => c.validate(), /invalid-blew-up/);
    });

    it('propagates rejection from validator (validator decides outcome — error is not silently treated as invalid)', async () => {
        const c = new ValidateConfiguration();
        c.setValidAction(async () => {});
        c.setInvalidAction(async () => {});
        c.setValidator(async () => { throw new Error('validator-blew-up'); });
        await assert.rejects(() => c.validate(), /validator-blew-up/);
    });

    it('validate() can be called multiple times; each call re-runs the validator', async () => {
        const c = new ValidateConfiguration();
        let validatorCalls = 0;
        let validRan = 0;
        c.setValidAction(async () => { validRan++; });
        c.setInvalidAction(async () => {});
        c.setValidator(async () => { validatorCalls++; return true; });
        await c.validate();
        await c.validate();
        await c.validate();
        assert.equal(validatorCalls, 3);
        assert.equal(validRan, 3);
    });
});
