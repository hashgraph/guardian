import assert from 'node:assert/strict';
import { AnalyticsDocument } from '../dist/entity/analytics-document.js';
import { AnalyticsStatus } from '../dist/entity/analytics-status.js';
import { AnalyticsTokenCache } from '../dist/entity/analytics-token-cache.js';
import { AnalyticsTopicCache } from '../dist/entity/analytics-topic-cache.js';
import { DocumentType } from '../dist/interfaces/document.type.js';
import { ReportType } from '../dist/interfaces/report.type.js';

describe('AnalyticsDocument.setInitState', () => {
    it('defaults type to DocumentType.NONE when unset', () => {
        const doc = new AnalyticsDocument();
        doc.setInitState();
        assert.equal(doc.type, DocumentType.NONE);
    });

    it('preserves an explicit type', () => {
        const doc = new AnalyticsDocument();
        doc.type = 'VC';
        doc.setInitState();
        assert.equal(doc.type, 'VC');
    });
});

describe('AnalyticsStatus.setInitState', () => {
    it('defaults type to ReportType.ALL when unset', () => {
        const status = new AnalyticsStatus();
        status.setInitState();
        assert.equal(status.type, ReportType.ALL);
    });

    it('preserves an explicit type', () => {
        const status = new AnalyticsStatus();
        status.type = 'POLICIES';
        status.setInitState();
        assert.equal(status.type, 'POLICIES');
    });
});

describe('AnalyticsTokenCache.setInitState', () => {
    it('defaults balance to 0 when unset', () => {
        const cache = new AnalyticsTokenCache();
        cache.setInitState();
        assert.equal(cache.balance, 0);
    });

    it('preserves a non-zero balance', () => {
        const cache = new AnalyticsTokenCache();
        cache.balance = 42;
        cache.setInitState();
        assert.equal(cache.balance, 42);
    });

    it('leaves a zero balance at 0', () => {
        const cache = new AnalyticsTokenCache();
        cache.balance = 0;
        cache.setInitState();
        assert.equal(cache.balance, 0);
    });
});

describe('AnalyticsTopicCache.setInitState', () => {
    it('defaults index to 0 when unset', () => {
        const cache = new AnalyticsTopicCache();
        cache.setInitState();
        assert.equal(cache.index, 0);
    });

    it('preserves a non-zero index', () => {
        const cache = new AnalyticsTopicCache();
        cache.index = 7;
        cache.setInitState();
        assert.equal(cache.index, 7);
    });
});
