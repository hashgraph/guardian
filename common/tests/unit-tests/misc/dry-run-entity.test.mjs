import { assert } from 'chai';
import { DryRun } from '../../../dist/entity/dry-run.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe('DryRun.setDefaults (no document/context/config)', () => {
    it('applies the full set of documented defaults', async () => {
        const d = new DryRun();
        await d.setDefaults();
        assert.isObject(d.option);
        assert.equal(d.option.status, 'NEW');
        assert.equal(d.status, 'NEW');
        assert.match(d.uuid, UUID_RE);
        assert.equal(d.codeVersion, '1.0.0');
        assert.equal(d.entity, 'NONE');
        assert.equal(d.readonly, false);
        assert.equal(d.iri, d.uuid);
        assert.equal(d.system, false);
        assert.equal(d.active, false);
        assert.equal(d.hederaStatus, 'NEW');
        assert.equal(d.signature, 0);
        assert.isUndefined(d.tableFileIds);
    });

    it('preserves provided option.status / status / uuid', async () => {
        const d = new DryRun();
        d.option = { status: 'Approved' };
        d.status = 'ISSUE';
        d.uuid = 'fixed-uuid';
        await d.setDefaults();
        assert.equal(d.option.status, 'Approved');
        assert.equal(d.status, 'ISSUE');
        assert.equal(d.uuid, 'fixed-uuid');
        assert.equal(d.iri, 'fixed-uuid');
    });

    it('coerces readonly to a boolean', async () => {
        const d = new DryRun();
        d.readonly = 1;
        await d.setDefaults();
        assert.strictEqual(d.readonly, true);
    });

    it('keeps an explicit iri', async () => {
        const d = new DryRun();
        d.iri = '#explicit';
        await d.setDefaults();
        assert.equal(d.iri, '#explicit');
    });

    it('extends BaseEntity (createDate present)', () => {
        const d = new DryRun();
        assert.instanceOf(d.createDate, Date);
    });
});
