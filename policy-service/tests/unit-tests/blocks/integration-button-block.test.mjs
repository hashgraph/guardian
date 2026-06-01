import { assert } from 'chai';
import { IntegrationButtonBlock } from '../../../dist/policy-engine/block-validators/blocks/integration-button-block.js';
import { IntegrationServiceFactory } from '@guardian/common';
import { ParseTypes } from '@guardian/interfaces';

class FakeValidator {
    constructor(opts = {}) {
        this.errors = [];
        this._schemaMissing = !!opts.schemaMissing;
    }
    addError(msg) { this.errors.push(msg); }
    async getArtifact() { return {}; }
    getErrorMessage(err) { return err?.message ?? String(err); }
    schemaNotExistByEntity() { return this._schemaMissing; }
}

const refWith = (options = {}) => ({ options, children: [] });

const methodWith = (params) => ({ myMethod: { parameters: { group: params } } });

const bothSet = (extra = {}) => ({
    integrationType: 'GFW',
    requestName: 'integration_myMethod',
    ...extra,
});

describe('IntegrationButtonBlock.validate', () => {
    let originalGetAvailableMethods;

    beforeEach(() => {
        originalGetAvailableMethods = IntegrationServiceFactory.getAvailableMethods;
    });

    afterEach(() => {
        IntegrationServiceFactory.getAvailableMethods = originalGetAvailableMethods;
    });

    it('exposes blockType "integrationButtonBlock"', () => {
        assert.equal(IntegrationButtonBlock.blockType, 'integrationButtonBlock');
    });

    it('rejects when both integrationType and requestName are missing', async () => {
        const v = new FakeValidator();
        await IntegrationButtonBlock.validate(v, refWith({}));
        assert.include(v.errors, 'Option "Integration" is not set');
        assert.include(v.errors, 'Option "Request type" is not set');
    });

    it('rejects when only integrationType is missing', async () => {
        const v = new FakeValidator();
        await IntegrationButtonBlock.validate(v, refWith({ requestName: 'integration_myMethod' }));
        assert.include(v.errors, 'Option "Integration" is not set');
        assert.notInclude(v.errors, 'Option "Request type" is not set');
    });

    it('rejects when only requestName is missing', async () => {
        const v = new FakeValidator();
        await IntegrationButtonBlock.validate(v, refWith({ integrationType: 'GFW' }));
        assert.include(v.errors, 'Option "Request type" is not set');
        assert.notInclude(v.errors, 'Option "Integration" is not set');
    });

    it('flags an outdated policy when the IntegrationDataV2 schema is unavailable', async () => {
        const v = new FakeValidator({ schemaMissing: true });
        await IntegrationButtonBlock.validate(v, refWith({}));
        assert.include(v.errors, 'Policy outdated. Re-import required — IntegrationDataV2 schema unavailable');
    });

    it('does not flag an outdated policy when the schema exists', async () => {
        const v = new FakeValidator({ schemaMissing: false });
        await IntegrationButtonBlock.validate(v, refWith({}));
        assert.notInclude(v.errors, 'Policy outdated. Re-import required — IntegrationDataV2 schema unavailable');
    });

    it('rejects when a required parameter has neither a path field nor a value', async () => {
        IntegrationServiceFactory.getAvailableMethods = () =>
            methodWith({ field: { name: 'Field A', value: 'fieldA', required: true } });
        const v = new FakeValidator();
        await IntegrationButtonBlock.validate(v, refWith(bothSet({ requestParams: {} })));
        assert.include(v.errors, 'Option "Path field for Field A" or "Value for Field A" is not set');
    });

    it('accepts a required parameter provided as a value', async () => {
        IntegrationServiceFactory.getAvailableMethods = () =>
            methodWith({ field: { name: 'Field A', value: 'fieldA', required: true } });
        const v = new FakeValidator();
        await IntegrationButtonBlock.validate(v, refWith(bothSet({ requestParams: { fieldA: 'hello' } })));
        assert.deepEqual(v.errors, []);
    });

    it('accepts a required parameter provided as a path field', async () => {
        IntegrationServiceFactory.getAvailableMethods = () =>
            methodWith({ field: { name: 'Field A', value: 'fieldA', required: true } });
        const v = new FakeValidator();
        await IntegrationButtonBlock.validate(v, refWith(bothSet({ requestParams: { path_fieldA: 'doc.a' } })));
        assert.deepEqual(v.errors, []);
    });

    it('rejects when both the path field and the value are filled', async () => {
        IntegrationServiceFactory.getAvailableMethods = () =>
            methodWith({ field: { name: 'Field A', value: 'fieldA', required: true } });
        const v = new FakeValidator();
        await IntegrationButtonBlock.validate(v, refWith(bothSet({ requestParams: { fieldA: 'v', path_fieldA: 'p' } })));
        assert.include(v.errors, 'Both fields are filled, but only one is allowed — either "Path field for Field A" or "Value for Field A"');
    });

    it('rejects a JSON parseType value that is not parseable', async () => {
        IntegrationServiceFactory.getAvailableMethods = () =>
            methodWith({ field: { name: 'Json F', value: 'jf', required: false, parseType: ParseTypes.JSON } });
        const v = new FakeValidator();
        await IntegrationButtonBlock.validate(v, refWith(bothSet({ requestParams: { jf: 'not json' } })));
        assert.include(v.errors, 'Option "Path field for Json F" or "Value for Json F" is not a stringify object');
    });

    it('accepts a JSON parseType value that is valid JSON', async () => {
        IntegrationServiceFactory.getAvailableMethods = () =>
            methodWith({ field: { name: 'Json F', value: 'jf', required: false, parseType: ParseTypes.JSON } });
        const v = new FakeValidator();
        await IntegrationButtonBlock.validate(v, refWith(bothSet({ requestParams: { jf: '{"a":1}' } })));
        assert.deepEqual(v.errors, []);
    });

    it('rejects a NUMBER parseType value that is not a number', async () => {
        IntegrationServiceFactory.getAvailableMethods = () =>
            methodWith({ field: { name: 'Num F', value: 'nf', required: false, parseType: ParseTypes.NUMBER } });
        const v = new FakeValidator();
        await IntegrationButtonBlock.validate(v, refWith(bothSet({ requestParams: { nf: 'abc' } })));
        assert.include(v.errors, 'Option "Path field for Num F" or "Value for Num F" is not a number');
    });

    it('accepts "0" as a valid NUMBER parseType value', async () => {
        IntegrationServiceFactory.getAvailableMethods = () =>
            methodWith({ field: { name: 'Num F', value: 'nf', required: false, parseType: ParseTypes.NUMBER } });
        const v = new FakeValidator();
        await IntegrationButtonBlock.validate(v, refWith(bothSet({ requestParams: { nf: '0' } })));
        assert.deepEqual(v.errors, []);
    });

    it('derives the method name from the last underscore-delimited segment', async () => {
        let receivedType = null;
        IntegrationServiceFactory.getAvailableMethods = (type) => {
            receivedType = type;
            return methodWith({ field: { name: 'Field A', value: 'fieldA', required: true } });
        };
        const v = new FakeValidator();
        await IntegrationButtonBlock.validate(v, refWith({
            integrationType: 'GFW',
            requestName: 'svc_group_myMethod',
            requestParams: {},
        }));
        assert.equal(receivedType, 'GFW');
        assert.include(v.errors, 'Option "Path field for Field A" or "Value for Field A" is not set');
    });

    it('captures an unhandled exception when the method lookup yields nothing', async () => {
        IntegrationServiceFactory.getAvailableMethods = () => ({});
        const v = new FakeValidator();
        await IntegrationButtonBlock.validate(v, refWith(bothSet({ requestParams: {} })));
        assert.equal(
            v.errors.some((e) => e.startsWith('Unhandled exception')),
            true,
            `expected an unhandled-exception error, got: ${JSON.stringify(v.errors)}`,
        );
    });

    it('passes a fully valid configuration with optional unset parameters', async () => {
        IntegrationServiceFactory.getAvailableMethods = () =>
            methodWith({ field: { name: 'Field A', value: 'fieldA', required: false } });
        const v = new FakeValidator();
        await IntegrationButtonBlock.validate(v, refWith(bothSet({ requestParams: {} })));
        assert.deepEqual(v.errors, []);
    });
});
