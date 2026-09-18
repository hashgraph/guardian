import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { PolicyImportExport } from '../../dist/import-export/policy.js';

// Lock applyRefGroups (fast path) to the original replaceAll-per-key algorithm (oracle below).
// getPolicyHash needs byte-identical output; any divergence would silently change
// already-published policy hashes.

const buildRefGroups = (schemas, tokens) =>
    PolicyImportExport.buildRefGroups(schemas, tokens);
const applyFast = (json, groups, tokenIds) =>
    PolicyImportExport.applyRefGroups(json, groups, tokenIds);
// Original implementation kept here as the correctness oracle.
const applyLegacy = (json, groups, tokenIds) => {
    let result = json;
    for (const map of groups) {
        map.forEach((value, key) => { result = result.replaceAll(key, value); });
    }
    tokenIds.forEach((value, key) => { result = result.replaceAll(key, value); });
    return result;
};

const assertParity = (json, schemas, tokens) => {
    const { groups, tokenIds } = buildRefGroups(schemas, tokens);
    const fast = applyFast(json, groups, tokenIds);
    // buildRefGroups is pure, but rebuild for the oracle so the two calls do not share map state.
    const { groups: g2, tokenIds: t2 } = buildRefGroups(schemas, tokens);
    const legacy = applyLegacy(json, g2, t2);
    assert.equal(fast, legacy);
    return fast;
};

describe('PolicyImportExport reference normalization (fast vs legacy parity)', () => {
    it('normalizes every reference form for a single schema', () => {
        const uuid = crypto.randomUUID();
        const schemas = [{ uuid, version: '1.0.0', name: 'A' }];
        const json = JSON.stringify({
            a: `schema:${uuid}#${uuid}`,
            b: `schema:${uuid}&1.0.0`,
            c: `schema:${uuid}#`,
            d: `schema:${uuid}`,
            e: `#${uuid}&1.0.0`,
            f: `#${uuid}`,
            g: `${uuid}&1.0.0`,
            h: `${uuid}`,
        });
        const out = assertParity(json, schemas, []);
        // Sanity: the bare uuid must have been replaced by its positional tag.
        assert.ok(!out.includes(uuid));
    });

    it('handles cross-schema adjacency (schema:A#B with A !== B)', () => {
        const a = crypto.randomUUID();
        const b = crypto.randomUUID();
        const schemas = [
            { uuid: a, version: '1.0.0', name: 'A' },
            { uuid: b, version: '2.0.0', name: 'B' },
        ];
        const json = JSON.stringify({
            ref: `schema:${a}#${b}`,
            self: `schema:${a}#${a}`,
            frag: `#${b}`,
        });
        assertParity(json, schemas, []);
    });

    it('replaces token ids', () => {
        const uuid = crypto.randomUUID();
        const schemas = [{ uuid, version: '1.0.0', name: 'A' }];
        const tokens = [{ tokenId: '0.0.4321' }, { tokenId: '0.0.9999' }];
        const json = JSON.stringify({
            s: `#${uuid}`,
            t1: '0.0.4321',
            t2: '0.0.9999',
        });
        const out = assertParity(json, schemas, tokens);
        assert.ok(out.includes('@token0'));
        assert.ok(out.includes('@token1'));
    });

    it('keeps the later index for duplicate uuids', () => {
        const uuid = crypto.randomUUID();
        const schemas = [
            { uuid, version: '1.0.0', name: 'Z' },
            { uuid, version: '1.0.0', name: 'A' },
        ];
        const json = JSON.stringify({ ref: `#${uuid}` });
        assertParity(json, schemas, []);
    });

    it('replaces references embedded inside free text (substring semantics)', () => {
        const a = crypto.randomUUID();
        const b = crypto.randomUUID();
        const schemas = [
            { uuid: a, version: '1.0.0', name: 'A' },
            { uuid: b, version: '2.0.0', name: 'B' },
        ];
        const json = JSON.stringify({
            comment: `see schema:${a}&1.0.0 and also #${b} within this sentence`,
            nested: `prefix ${a} suffix`,
        });
        assertParity(json, schemas, []);
    });

    it('respects key precedence for prefix versions (1.0 vs 1.0.0)', () => {
        const uuid = crypto.randomUUID();
        const schemas = [
            { uuid, version: '1.0', name: 'Z' },
            { uuid, version: '1.0.0', name: 'A' },
        ];
        // Both orderings of appearance in the serialized string.
        assertParity(JSON.stringify({
            a: `schema:${uuid}&1.0.0`,
            b: `schema:${uuid}&1.0`,
            c: `#${uuid}&1.0`,
            d: `${uuid}&1.0.0`,
        }), schemas, []);
        assertParity(JSON.stringify({
            a: `schema:${uuid}&1.0`,
            b: `schema:${uuid}&1.0.0`,
        }), schemas, []);
    });

    it('leaves unrelated content untouched', () => {
        const uuid = crypto.randomUUID();
        const schemas = [{ uuid, version: '1.0.0', name: 'A' }];
        const json = JSON.stringify({
            title: 'Tom & Jerry',
            note: 'no refs here',
            hash: 'deadbeef1234',
        });
        assertParity(json, schemas, []);
    });

    it('matches on a large randomized policy body', () => {
        const count = 400;
        const schemas = [];
        for (let i = 0; i < count; i++) {
            schemas.push({
                uuid: crypto.randomUUID(),
                version: `1.${i}.0`,
                name: `Schema_${i}`,
            });
        }
        const tokens = [{ tokenId: '0.0.1000' }, { tokenId: '0.0.2000' }];

        const forms = [
            (s) => `schema:${s.uuid}#${s.uuid}`,
            (s) => `schema:${s.uuid}&${s.version}`,
            (s) => `schema:${s.uuid}#`,
            (s) => `schema:${s.uuid}`,
            (s) => `#${s.uuid}&${s.version}`,
            (s) => `#${s.uuid}`,
            (s) => `${s.uuid}&${s.version}`,
            (s) => `${s.uuid}`,
        ];

        const doc = {};
        for (let i = 0; i < schemas.length; i++) {
            const s = schemas[i];
            const form = forms[i % forms.length];
            doc[`field_${i}`] = form(s);
            // Cross reference (different uuids around a '#').
            if (i % 5 === 0) {
                const other = schemas[(i + 7) % schemas.length];
                doc[`ref_${i}`] = `schema:${s.uuid}#${other.uuid}`;
            }
            // Reference embedded inside free text (must still be substring-replaced).
            if (i % 7 === 0) {
                const other = schemas[(i + 1) % schemas.length];
                doc[`note_${i}`] = `some text ${forms[(i + 3) % forms.length](s)} and #${other.uuid} end`;
            }
            if (i % 50 === 0) {
                doc[`tok_${i}`] = '0.0.1000 and 0.0.2000';
            }
        }
        const json = JSON.stringify(doc);
        assertParity(json, schemas, tokens);
    });
});
