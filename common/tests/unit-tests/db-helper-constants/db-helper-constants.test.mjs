import { assert } from 'chai';
import {
    MAP_DOCUMENT_AGGREGATION_FILTERS,
    MAP_REPORT_ANALYTICS_AGGREGATION_FILTERS,
    MAP_ATTRIBUTES_AGGREGATION_FILTERS,
    MAP_TASKS_AGGREGATION_FILTERS,
    MAP_TRANSACTION_SERIALS_AGGREGATION_FILTERS,
} from '../../../dist/helpers/db-helper.js';

describe('db-helper aggregation filter maps', () => {
    it('MAP_DOCUMENT_AGGREGATION_FILTERS exposes the canonical document filter keys', () => {
        assert.equal(MAP_DOCUMENT_AGGREGATION_FILTERS.BASE, 'base');
        assert.equal(MAP_DOCUMENT_AGGREGATION_FILTERS.HISTORY, 'history');
        assert.equal(MAP_DOCUMENT_AGGREGATION_FILTERS.SORT, 'sort');
        assert.equal(MAP_DOCUMENT_AGGREGATION_FILTERS.PAGINATION, 'pagination');
        assert.equal(MAP_DOCUMENT_AGGREGATION_FILTERS.VC_DOCUMENTS, 'vc-documents');
        assert.equal(MAP_DOCUMENT_AGGREGATION_FILTERS.VP_DOCUMENTS, 'vp-documents');
        assert.equal(MAP_DOCUMENT_AGGREGATION_FILTERS.APPROVE, 'approve');
        assert.equal(MAP_DOCUMENT_AGGREGATION_FILTERS.DRY_RUN_SAVEPOINT, 'dry-run-savepoint');
    });

    it('MAP_REPORT_ANALYTICS_AGGREGATION_FILTERS exposes document/instance/groups/schema_by_name', () => {
        assert.equal(MAP_REPORT_ANALYTICS_AGGREGATION_FILTERS.DOC_BY_POLICY, 'doc_by_policy');
        assert.equal(MAP_REPORT_ANALYTICS_AGGREGATION_FILTERS.DOC_BY_INSTANCE, 'doc_by_instance');
        assert.equal(MAP_REPORT_ANALYTICS_AGGREGATION_FILTERS.DOCS_GROUPS, 'docs_groups');
        assert.equal(MAP_REPORT_ANALYTICS_AGGREGATION_FILTERS.SCHEMA_BY_NAME, 'schema_by_name');
    });

    it('MAP_ATTRIBUTES_AGGREGATION_FILTERS / MAP_TASKS_AGGREGATION_FILTERS use the same RESULT key', () => {
        assert.equal(MAP_ATTRIBUTES_AGGREGATION_FILTERS.RESULT, 'result');
        assert.equal(MAP_TASKS_AGGREGATION_FILTERS.RESULT, 'result');
    });

    it('MAP_TRANSACTION_SERIALS_AGGREGATION_FILTERS exposes COUNT="count"', () => {
        assert.equal(MAP_TRANSACTION_SERIALS_AGGREGATION_FILTERS.COUNT, 'count');
    });
});
