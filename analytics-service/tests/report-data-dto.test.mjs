import assert from 'node:assert/strict';
import { ReportDataDTO, RateDTO } from '../dist/middlewares/validation/schemas/report-data.js';
import { DataContainerDTO } from '../dist/middlewares/validation/schemas/report-data.js';

describe('@unit ReportDataDTO — extended fields', () => {
    it('accepts all top-rate fields (RateDTO-shaped)', () => {
        const r = new ReportDataDTO();
        const rateFields = [
            'topSRByUsers', 'topSRByPolicies', 'topTagsByLabel',
            'topAllSchemasByName', 'topSystemSchemasByName', 'topSchemasByName',
            'topModulesByName', 'topPoliciesByName', 'topVersionsByName',
            'topPoliciesByDocuments', 'topPoliciesByDID', 'topPoliciesByVC',
            'topPoliciesByVP', 'topPoliciesByRevoked',
            'topTokensByName', 'topFTokensByName', 'topNFTokensByName',
            'topFTokensByBalance', 'topNFTokensByBalance',
        ];
        for (const f of rateFields) {
            const rate = new RateDTO();
            rate.name = `${f}-name`;
            rate.value = 42;
            r[f] = rate;
            assert.equal(r[f].name, `${f}-name`, `${f} should be assignable`);
            assert.equal(r[f].value, 42);
        }
    });

    it('accepts userTopic + fToken/nfToken split fields', () => {
        const r = new ReportDataDTO();
        r.userTopic = 5;
        r.tokens = 10;
        r.fTokens = 7;
        r.nfTokens = 3;
        r.tags = 12;
        r.schemas = 8;
        r.systemSchemas = 4;
        r.revokeDocuments = 1;
        r.fTotalBalances = 1000;
        r.nfTotalBalances = 50;
        r.topSize = 5;
        assert.equal(r.userTopic, 5);
        assert.equal(r.tokens, r.fTokens + r.nfTokens);
    });

    it('round-trips through JSON without losing fields', () => {
        const r = new ReportDataDTO();
        r.messages = 100;
        r.topics = 10;
        r.users = 5;
        const rate = new RateDTO();
        rate.name = 'top';
        rate.value = 42;
        r.topPoliciesByName = rate;

        const json = JSON.parse(JSON.stringify(r));
        assert.equal(json.messages, 100);
        assert.equal(json.topics, 10);
        assert.deepEqual(json.topPoliciesByName, { name: 'top', value: 42 });
    });
});

describe('@unit DataContainerDTO', () => {
    it('constructs with uuid + root + nested ReportDataDTO', () => {
        const c = new DataContainerDTO();
        c.uuid = 'r-1';
        c.root = '0.0.1';
        const report = new ReportDataDTO();
        report.messages = 1;
        c.report = report;
        assert.equal(c.uuid, 'r-1');
        assert.equal(c.root, '0.0.1');
        assert.equal(c.report.messages, 1);
    });

    it('does not throw when report is left unset', () => {
        const c = new DataContainerDTO();
        c.uuid = 'r-1';
        c.root = '0.0.1';
        assert.equal(c.report, undefined);
    });
});
