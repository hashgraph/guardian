import { assert } from 'chai';
import { PolicyImport } from '../../dist/helpers/import-helpers/policy/policy-import.js';
import { ImportMode } from '../../dist/helpers/import-helpers/common/import.interface.js';

/**
 * Regression guard for #6369: a policy exported while DISCONTINUED carries a stale
 * `discontinuedDate`. If import / new-version create doesn't strip it, publishing
 * sets status=PUBLISH while discontinuedDate is in the past, and the hourly
 * `policy-discontinue` task immediately flips it to DISCONTINUED.
 *
 * dataPreparation() is private but dependency-light (pure field manipulation, no
 * DB/await in body), so we drive it via the prototype with only `mode` set.
 */
describe('PolicyImport.dataPreparation strips stale discontinuedDate (#6369)', () => {
    const user = { creator: 'did:creator', owner: 'did:owner' };
    const pastDate = new Date('2024-01-01T00:00:00.000Z');

    const run = async (mode) => {
        const importer = Object.create(PolicyImport.prototype);
        importer.mode = mode;
        const policy = {
            id: '6a567ce0c7892208461c1128',
            uuid: '16e4b361-07fd-493c-92e0-1bb0ae1831de',
            name: 'Sample Policy',
            version: '1.0',
            status: 'DISCONTINUED',
            discontinuedDate: pastDate,
            config: {}
        };
        return importer.dataPreparation(policy, user, null);
    };

    it('COMMON (normal import) mode removes discontinuedDate', async () => {
        const result = await run(ImportMode.COMMON);
        assert.notProperty(result, 'discontinuedDate');
    });

    it('DEMO mode removes discontinuedDate', async () => {
        const result = await run(ImportMode.DEMO);
        assert.notProperty(result, 'discontinuedDate');
    });
});
