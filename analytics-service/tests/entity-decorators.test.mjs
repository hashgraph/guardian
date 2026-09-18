import assert from 'node:assert/strict';
import { AnalyticsDashboard } from '../dist/entity/analytics-dashboard.js';
import { AnalyticsModule } from '../dist/entity/analytics-module.js';
import { AnalyticsPolicy } from '../dist/entity/analytics-policy.js';
import { AnalyticsPolicyInstance } from '../dist/entity/analytics-policy-instance.js';
import { AnalyticsSchema } from '../dist/entity/analytics-schema.js';
import { AnalyticsSchemaPackage } from '../dist/entity/analytics-schema-package.js';
import { AnalyticsTag } from '../dist/entity/analytics-tag.js';
import { AnalyticsToken } from '../dist/entity/analytics-token.js';
import { AnalyticsTopic } from '../dist/entity/analytics-topic.js';
import { AnalyticsUser } from '../dist/entity/analytics-user.js';

describe('analytics entity classes (decorator + construction)', () => {
    const cases = [
        ['AnalyticsDashboard', AnalyticsDashboard],
        ['AnalyticsModule', AnalyticsModule],
        ['AnalyticsPolicy', AnalyticsPolicy],
        ['AnalyticsPolicyInstance', AnalyticsPolicyInstance],
        ['AnalyticsSchema', AnalyticsSchema],
        ['AnalyticsSchemaPackage', AnalyticsSchemaPackage],
        ['AnalyticsTag', AnalyticsTag],
        ['AnalyticsToken', AnalyticsToken],
        ['AnalyticsTopic', AnalyticsTopic],
        ['AnalyticsUser', AnalyticsUser],
    ];

    for (const [name, Ctor] of cases) {
        it(`${name} is a constructable class`, () => {
            assert.equal(typeof Ctor, 'function');
            const instance = new Ctor();
            assert.ok(instance instanceof Ctor);
        });

        it(`${name} accepts assigned properties`, () => {
            const instance = new Ctor();
            instance.uuid = 'u-1';
            assert.equal(instance.uuid, 'u-1');
        });
    }

    it('AnalyticsToken holds token-specific fields', () => {
        const token = new AnalyticsToken();
        token.tokenId = '0.0.123';
        token.tokenName = 'Carbon';
        token.tokenSymbol = 'CO2';
        token.tokenType = 'fungible';
        assert.equal(token.tokenId, '0.0.123');
        assert.equal(token.tokenName, 'Carbon');
        assert.equal(token.tokenSymbol, 'CO2');
        assert.equal(token.tokenType, 'fungible');
    });

    it('AnalyticsDashboard holds a report payload and date', () => {
        const dashboard = new AnalyticsDashboard();
        const now = new Date();
        dashboard.date = now;
        dashboard.report = { foo: 'bar' };
        assert.equal(dashboard.date, now);
        assert.deepEqual(dashboard.report, { foo: 'bar' });
    });

    it('AnalyticsUser holds did/account/type', () => {
        const user = new AnalyticsUser();
        user.did = 'did:hedera:0.0.1';
        user.account = '0.0.2';
        user.type = 'STANDARD_REGISTRY';
        assert.equal(user.did, 'did:hedera:0.0.1');
        assert.equal(user.account, '0.0.2');
        assert.equal(user.type, 'STANDARD_REGISTRY');
    });
});
