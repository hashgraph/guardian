import assert from 'node:assert/strict';
import { SchemaHelper } from '@guardian/interfaces';
import { incrementVersionByUuid } from '../../dist/helpers/import-helpers/schema/schema-helper.js';
import {
    DatabaseServer,
    restoreStubs,
    stub,
} from '../_handler-harness.mjs';

const UUID = 'b5f2a3c1-1111-4222-8333-944455556666';

function makeSchema(version, previousVersion) {
    const schema = {
        uuid: UUID,
        contextURL: `schema:${UUID}`,
        document: { $id: '', $comment: '{}' },
    };
    return SchemaHelper.setVersion(schema, version, previousVersion);
}

describe('incrementVersionByUuid', () => {
    afterEach(() => restoreStubs());

    it('queries schemas by the given uuid', async () => {
        let filter;
        stub(DatabaseServer, 'getSchemas', async (f) => {
            filter = f;
            return [];
        });

        await incrementVersionByUuid(UUID, '1.0.3');

        assert.deepEqual(filter, { uuid: UUID });
    });

    it('increments the previous version when no other version exists', async () => {
        stub(DatabaseServer, 'getSchemas', async () => [makeSchema('1.0.3', '1.0.2')]);

        assert.equal(await incrementVersionByUuid(UUID, '1.0.3'), '1.0.4');
    });

    it('skips a version already taken by an earlier draft', async () => {
        stub(DatabaseServer, 'getSchemas', async () => [
            makeSchema('1.0.3', '1.0.2'),
            makeSchema('1.0.4', '1.0.3'),
        ]);

        assert.equal(await incrementVersionByUuid(UUID, '1.0.3'), '1.0.5');
    });
});
