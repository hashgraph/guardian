import assert from 'node:assert/strict';
import { AnalyticsDocument } from '../dist/entity/analytics-document.js';
import { AnalyticsStatus } from '../dist/entity/analytics-status.js';
import { AnalyticsTokenCache } from '../dist/entity/analytics-token-cache.js';
import { AnalyticsTopicCache } from '../dist/entity/analytics-topic-cache.js';
import { DocumentType } from '../dist/interfaces/document.type.js';
import { ReportType } from '../dist/interfaces/report.type.js';

describe('AnalyticsDocument.setInitState', () => {
    it('defaults type to NONE', () => {
        const entity = new AnalyticsDocument();
        entity.setInitState();
        assert.equal(entity.type, DocumentType.NONE);
    });

    it('keeps an explicit type', () => {
        const entity = new AnalyticsDocument();
        entity.type = DocumentType.VC;
        entity.setInitState();
        assert.equal(entity.type, DocumentType.VC);
    });

    it('does not touch other fields', () => {
        const entity = new AnalyticsDocument();
        entity.uuid = 'u-1';
        entity.setInitState();
        assert.equal(entity.uuid, 'u-1');
    });
});

describe('AnalyticsStatus.setInitState', () => {
    it('defaults type to ALL', () => {
        const entity = new AnalyticsStatus();
        entity.setInitState();
        assert.equal(entity.type, ReportType.ALL);
    });

    it('keeps an explicit report type', () => {
        const entity = new AnalyticsStatus();
        entity.type = ReportType.TOKENS;
        entity.setInitState();
        assert.equal(entity.type, ReportType.TOKENS);
    });

    it('leaves progress untouched', () => {
        const entity = new AnalyticsStatus();
        entity.progress = 5;
        entity.setInitState();
        assert.equal(entity.progress, 5);
    });
});

describe('AnalyticsTokenCache.setInitState', () => {
    it('defaults balance to zero', () => {
        const entity = new AnalyticsTokenCache();
        entity.setInitState();
        assert.equal(entity.balance, 0);
    });

    it('keeps a positive balance', () => {
        const entity = new AnalyticsTokenCache();
        entity.balance = 12.5;
        entity.setInitState();
        assert.equal(entity.balance, 12.5);
    });

    it('keeps an existing zero balance as zero', () => {
        const entity = new AnalyticsTokenCache();
        entity.balance = 0;
        entity.setInitState();
        assert.equal(entity.balance, 0);
    });
});

describe('AnalyticsTopicCache.setInitState', () => {
    it('defaults index to zero', () => {
        const entity = new AnalyticsTopicCache();
        entity.setInitState();
        assert.equal(entity.index, 0);
    });

    it('keeps a positive index', () => {
        const entity = new AnalyticsTopicCache();
        entity.index = 42;
        entity.setInitState();
        assert.equal(entity.index, 42);
    });

    it('leaves timeStamp untouched', () => {
        const entity = new AnalyticsTopicCache();
        entity.timeStamp = '123.456';
        entity.setInitState();
        assert.equal(entity.timeStamp, '123.456');
    });
});
