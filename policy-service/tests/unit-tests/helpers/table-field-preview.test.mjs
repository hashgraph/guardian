import assert from 'node:assert/strict';
import { hydrateTablesInObject } from '../../../dist/policy-engine/helpers/table-field.js';
import { PreviewScope } from '../../../dist/policy-engine/helpers/preview.js';
import { RecordActionStep } from '../../../dist/policy-engine/record-action-step.js';

const tableValue = () => JSON.stringify({
    type: 'table',
    fileId: 'preview-1',
    columnKeys: ['year'],
    csv: 'year\n2020\n2021'
});

describe('@unit table hydration in preview', () => {
    it('reads the table from the inline CSV during a preview', async () => {
        const root = { results: tableValue() };
        const loaded = [];
        const step = new RecordActionStep(() => {}, 0, true, true, undefined, true);
        await PreviewScope.run(step, () => hydrateTablesInObject(root, async (fileId) => {
            loaded.push(fileId);
            return '';
        }));
        assert.deepEqual(loaded, []);
        assert.deepEqual(root.results.rows, [{ year: '2020' }, { year: '2021' }]);
    });

    it('ignores an inline CSV outside a preview', async () => {
        const root = { results: tableValue() };
        const loaded = [];
        await hydrateTablesInObject(root, async (fileId) => {
            loaded.push(fileId);
            return 'year\n1999';
        });
        assert.deepEqual(loaded, ['preview-1']);
        assert.deepEqual(root.results.rows, [{ year: '1999' }]);
    });
});
