import { assert } from 'chai';
import { BaseIntegrationService } from '../../../dist/integrations/base-integration-service.js';
import { FIRMSService } from '../../../dist/integrations/services/firms-service.js';
import { GlobalForestWatchService } from '../../../dist/integrations/services/global-forest-watch-service.js';
import { KanopioService } from '../../../dist/integrations/services/kanopio-service.js';
import { WorldBankService } from '../../../dist/integrations/services/world-bank-service.js';

describe('FIRMSService', () => {
    let savedToken;

    before(() => {
        savedToken = process.env.FIRMS_AUTH_TOKEN;
        delete process.env.FIRMS_AUTH_TOKEN;
    });

    after(() => {
        if (savedToken !== undefined) {
            process.env.FIRMS_AUTH_TOKEN = savedToken;
        }
    });

    it('throws without a token', () => {
        assert.throws(() => new FIRMSService(), 'API token is required.');
    });

    it('throws for a too short token', () => {
        assert.throws(() => new FIRMSService('abc'), 'API token is required.');
    });

    it('constructs with a valid token', () => {
        const service = new FIRMSService('valid-token');
        assert.instanceOf(service, BaseIntegrationService);
    });

    it('exposes the NASA FIRMS base url', () => {
        assert.equal(FIRMSService.getBaseUrl(), 'https://firms.modaps.eosdis.nasa.gov');
    });

    it('uses firm_map_key as the secret token param', () => {
        assert.equal(FIRMSService.secretTokenParamName, 'firm_map_key');
    });

    it('declares five available methods', () => {
        assert.lengthOf(Object.keys(FIRMSService.getAvailableMethods()), 5);
    });

    it('embeds the secret param into every endpoint', () => {
        for (const method of Object.values(FIRMSService.getAvailableMethods())) {
            assert.include(method.endpoint, ':firm_map_key');
        }
    });

    it('rejects unsupported methods with a wrapped error', async () => {
        const service = new FIRMSService('valid-token');
        try {
            await service.executeRequest('nope');
            assert.fail('expected rejection');
        } catch (error) {
            assert.include(error.message, 'not working right now');
        }
    });
});

describe('GlobalForestWatchService', () => {
    it('exposes the GFW base url', () => {
        assert.equal(GlobalForestWatchService.getBaseUrl(), 'https://data-api.globalforestwatch.org');
    });

    it('declares available methods with method and endpoint', () => {
        const methods = GlobalForestWatchService.getAvailableMethods();
        assert.isAbove(Object.keys(methods).length, 0);
        for (const method of Object.values(methods)) {
            assert.isString(method.method);
            assert.isString(method.endpoint);
        }
    });
});

describe('KanopioService', () => {
    it('exposes the Kanop base url', () => {
        assert.equal(KanopioService.getBaseUrl(), 'https://main.api.kanop.io');
    });

    it('declares available methods with method and endpoint', () => {
        const methods = KanopioService.getAvailableMethods();
        assert.isAbove(Object.keys(methods).length, 0);
        for (const method of Object.values(methods)) {
            assert.isString(method.method);
            assert.isString(method.endpoint);
        }
    });
});

describe('WorldBankService', () => {
    it('constructs without a token', () => {
        assert.instanceOf(new WorldBankService(), BaseIntegrationService);
    });

    it('exposes the World Bank base url', () => {
        assert.equal(WorldBankService.getBaseUrl(), 'https://api.worldbank.org');
    });

    it('declares seventeen available methods', () => {
        assert.lengthOf(Object.keys(WorldBankService.getAvailableMethods()), 17);
    });

    it('declares GET methods with endpoints', () => {
        for (const method of Object.values(WorldBankService.getAvailableMethods())) {
            assert.isString(method.method);
            assert.isString(method.endpoint);
        }
    });

    it('rejects unsupported method names', async () => {
        const service = new WorldBankService();
        try {
            await service.executeRequest('nope');
            assert.fail('expected rejection');
        } catch (error) {
            assert.include(error.message, 'Unsupported method');
        }
    });
});
