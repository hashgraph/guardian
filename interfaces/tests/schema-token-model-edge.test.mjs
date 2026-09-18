import assert from 'node:assert/strict';
import { Schema } from '../dist/models/schema.js';
import { Token } from '../dist/models/token.js';
import { SchemaEntity } from '../dist/type/schema-entity.type.js';
import { SchemaStatus } from '../dist/type/schema-status.type.js';
import { SchemaCategory } from '../dist/type/schema-category.type.js';

const silenceError = (fn) => {
    const original = console.error;
    console.error = () => undefined;
    try {
        return fn();
    } finally {
        console.error = original;
    }
};

describe('@unit Schema model — edge construction', () => {
    it('no-arg schema generates a fresh uuid each time', () => {
        assert.notEqual(new Schema().uuid, new Schema().uuid);
    });

    it('no-arg schema leaves category undefined', () => {
        assert.equal(new Schema().category, undefined);
    });

    it('no-arg schema seeds errors with an empty array', () => {
        assert.deepEqual(new Schema().errors, []);
    });

    it('empty-object source still generates a uuid', () => {
        assert.match(new Schema({}).uuid, /^[0-9a-f-]{36}$/i);
    });

    it('empty-object source derives contextURL from the generated uuid', () => {
        const s = new Schema({});
        assert.equal(s.contextURL, '');
    });

    it('no-arg source derives a schema: contextURL', () => {
        const s = new Schema();
        assert.equal(s.contextURL, `schema:${s.uuid}`);
    });

    it('keeps a provided uuid instead of generating one', () => {
        assert.equal(new Schema({ uuid: 'given-uuid' }).uuid, 'given-uuid');
    });

    it('falls back to default entity and status for a partial source', () => {
        const s = new Schema({ name: 'only-name' });
        assert.equal(s.entity, SchemaEntity.NONE);
        assert.equal(s.status, SchemaStatus.DRAFT);
    });

    it('coerces blank string fields to empty-string defaults', () => {
        const s = new Schema({ name: '', description: '', hash: '' });
        assert.equal(s.name, '');
        assert.equal(s.description, '');
        assert.equal(s.hash, '');
    });

    it('category POLICY for a non-system empty source', () => {
        assert.equal(new Schema({}).category, SchemaCategory.POLICY);
    });

    it('category SYSTEM when system flag is set', () => {
        assert.equal(new Schema({ system: true }).category, SchemaCategory.SYSTEM);
    });

    it('an explicit category overrides the system-derived default', () => {
        assert.equal(new Schema({ system: true, category: SchemaCategory.TOOL }).category, SchemaCategory.TOOL);
    });

    it('readonly/active/system default to false on a partial source', () => {
        const s = new Schema({ name: 'x' });
        assert.equal(s.readonly, false);
        assert.equal(s.active, false);
        assert.equal(s.system, false);
    });

    it('document defaults to null when absent', () => {
        assert.equal(new Schema({ name: 'x' }).document, null);
    });

    it('context defaults to null when absent', () => {
        assert.equal(new Schema({ name: 'x' }).context, null);
    });
});

describe('@unit Schema model — document/context parsing edges', () => {
    it('parses a JSON-string context into an object', () => {
        const s = new Schema({ context: '{"@context":{}}' });
        assert.deepEqual(s.context, { '@context': {} });
    });

    it('throws synchronously on a malformed JSON-string document', () => {
        assert.throws(() => new Schema({ document: '{not json' }));
    });

    it('Schema.from swallows malformed-document errors and returns null', () => {
        silenceError(() => assert.equal(Schema.from({ document: '{not json' }), null));
    });

    it('a numeric JSON-string document is stored as a number', () => {
        const s = new Schema({ document: '123' });
        assert.equal(s.document, 123);
        assert.equal(typeof s.document, 'number');
    });

    it('a numeric document yields empty fields and conditions', () => {
        const s = new Schema({ document: '123' });
        assert.deepEqual(s.fields, []);
        assert.deepEqual(s.conditions, []);
    });

    it('an empty-object document parses to empty fields', () => {
        const s = new Schema({ document: {} });
        assert.deepEqual(s.fields, []);
    });

    it('type is the bare uuid when version is empty', () => {
        const s = new Schema({ uuid: 'abc', document: {} });
        assert.equal(s.type, 'abc');
    });

    it('type joins uuid and version with an ampersand', () => {
        const s = new Schema({ uuid: 'abc', version: '1.0.0', document: {} });
        assert.equal(s.type, 'abc&1.0.0');
    });
});

describe('@unit Schema model — setVersion boundaries', () => {
    it('rejects an empty-string version as an invalid format', () => {
        assert.throws(() => new Schema().setVersion(''), /Invalid version format/);
    });

    it('rejects a non-numeric version', () => {
        assert.throws(() => new Schema().setVersion('v1'), /Invalid version format/);
    });

    it('accepts a two-part version and bumps from an empty current', () => {
        const s = new Schema();
        s.setVersion('1.0');
        assert.equal(s.version, '1.0');
        assert.equal(s.previousVersion, '');
    });

    it('records the prior version as previousVersion on a bump', () => {
        const s = new Schema({ version: '1.0.0' });
        s.setVersion('2.0.0');
        assert.equal(s.previousVersion, '1.0.0');
    });

    it('rejects an equal version as not greater', () => {
        const s = new Schema({ version: '1.0.0' });
        assert.throws(() => s.setVersion('1.0.0'), /Version must be greater than 1.0.0/);
    });

    it('rejects a strictly lower version', () => {
        const s = new Schema({ version: '2.5.0' });
        assert.throws(() => s.setVersion('2.4.9'), /Version must be greater/);
    });

    it('leaves version untouched after a failed bump', () => {
        const s = new Schema({ version: '2.0.0' });
        try { s.setVersion('1.0.0'); } catch { /* expected */ }
        assert.equal(s.version, '2.0.0');
    });
});

describe('@unit Schema model — fields manipulation edges', () => {
    it('getFields returns an empty array when fields are undefined', () => {
        assert.deepEqual(new Schema().getFields(), []);
    });

    it('getField returns null when fields are undefined', () => {
        assert.equal(new Schema().getField('any'), null);
    });

    it('searchFields returns an empty array when fields are undefined', () => {
        assert.deepEqual(new Schema().searchFields(() => true), []);
    });

    it('getDeepFields returns an empty array when fields are undefined', () => {
        assert.deepEqual(new Schema().getDeepFields(), []);
    });

    it('getField returns the first match on duplicate paths', () => {
        const s = new Schema();
        s.setFields([{ name: 'first', path: 'p' }, { name: 'second', path: 'p' }], [], true);
        assert.equal(s.getField('p').name, 'first');
    });

    it('getField resolves unicode field paths', () => {
        const s = new Schema();
        s.setFields([{ name: 'naïve🚀', path: 'naïve🚀' }], [], true);
        assert.equal(s.getField('naïve🚀').name, 'naïve🚀');
    });

    it('getFields preserves duplicate-named entries', () => {
        const s = new Schema();
        s.setFields([{ name: 'dup', path: 'a' }, { name: 'dup', path: 'b' }], [], true);
        assert.equal(s.getFields().filter((f) => f.name === 'dup').length, 2);
    });

    it('setFields(force) coerces undefined fields and conditions to empty arrays', () => {
        const s = new Schema();
        s.fields = [{ name: 'old' }];
        s.conditions = [{ id: 'old' }];
        s.setFields(undefined, undefined, true);
        assert.deepEqual(s.fields, []);
        assert.deepEqual(s.conditions, []);
    });

    it('setFields without force ignores non-array arguments', () => {
        const s = new Schema();
        s.fields = [{ name: 'keep' }];
        s.setFields('not-an-array', 42);
        assert.deepEqual(s.fields, [{ name: 'keep' }]);
    });

    it('setFields without force accepts an empty fields array', () => {
        const s = new Schema();
        s.fields = [{ name: 'old' }];
        s.setFields([], undefined);
        assert.deepEqual(s.fields, []);
    });

    it('searchFields walks nested fields and assigns paths', () => {
        const s = new Schema();
        s.setFields([{ name: 'a', path: 'a', fields: [{ name: 'b', path: '' }] }], [], true);
        const found = s.searchFields((f) => f.name === 'b');
        assert.equal(found.length, 1);
        assert.equal(found[0].path, 'a.b');
    });

    it('searchFields with an always-false predicate returns nothing', () => {
        const s = new Schema();
        s.setFields([{ name: 'a', path: 'a' }], [], true);
        assert.deepEqual(s.searchFields(() => false), []);
    });
});

describe('@unit Schema model — clone semantics', () => {
    it('clone drops category because it rebuilds from a no-arg Schema', () => {
        const s = new Schema({ system: true, category: SchemaCategory.TOOL });
        assert.equal(s.clone().category, undefined);
    });

    it('clone resets errors to the no-arg default', () => {
        const s = new Schema({});
        s.errors = [{ code: 1 }];
        assert.deepEqual(s.clone().errors, []);
    });

    it('clone shares the fields array by reference', () => {
        const s = new Schema();
        s.setFields([{ name: 'a', path: 'a' }], [], true);
        assert.equal(s.clone().fields, s.fields);
    });

    it('clone copies the uuid and identity fields', () => {
        const s = new Schema({ uuid: 'u9', owner: 'did:o', topicId: '0.0.5' });
        const c = s.clone();
        assert.equal(c.uuid, 'u9');
        assert.equal(c.owner, 'did:o');
        assert.equal(c.topicId, '0.0.5');
    });

    it('clone preserves topicCount but not codeVersion', () => {
        const s = new Schema({ topicCount: 7, codeVersion: 'cv9' });
        const c = s.clone();
        assert.equal(c.topicCount, 7);
        assert.equal(c.codeVersion, '');
    });
});

describe('@unit Schema model — owner/creator getters', () => {
    it('isOwner is falsy when owner is empty even if userDID is empty', () => {
        const s = new Schema({});
        assert.ok(!s.isOwner);
    });

    it('isOwner becomes true once setUser matches the owner', () => {
        const s = new Schema({ owner: 'did:o' });
        s.setUser('did:o');
        assert.equal(s.isOwner, true);
    });

    it('isCreator is independent of isOwner', () => {
        const s = new Schema({ owner: 'did:o', creator: 'did:c' });
        s.setUser('did:c');
        assert.equal(s.isCreator, true);
        assert.equal(s.isOwner, false);
    });

    it('isOwner stays falsy after setUser to a non-matching DID', () => {
        const s = new Schema({ owner: 'did:o' });
        s.setUser('did:x');
        assert.ok(!s.isOwner);
    });
});

describe('@unit Schema model — update/setExample edges', () => {
    it('update returns null when fields stay null', () => {
        const s = new Schema();
        s.fields = null;
        assert.equal(s.update(undefined, undefined), null);
    });

    it('updateDocument throws when fields are undefined', () => {
        const s = new Schema();
        s.fields = undefined;
        assert.throws(() => s.updateDocument(), TypeError);
    });

    it('setExample is a no-op when the document is null', () => {
        const s = new Schema();
        s.document = null;
        s.setExample({ a: 1 });
        assert.equal(s.document, null);
    });

    it('setExample with falsy data leaves the document untouched', () => {
        const s = new Schema({ document: { properties: {}, required: [] } });
        const before = JSON.stringify(s.document);
        s.setExample(undefined);
        assert.equal(JSON.stringify(s.document), before);
    });
});

describe('@unit Schema model — static factories edges', () => {
    it('fromDocument returns null for an unparsable string', () => {
        silenceError(() => assert.equal(Schema.fromDocument('{bad'), null));
    });

    it('fromVc returns null for a missing $defs', () => {
        assert.equal(Schema.fromVc({}), null);
    });

    it('fromVc returns null for an empty $defs object', () => {
        assert.equal(Schema.fromVc({ $defs: {} }), null);
    });

    it('fromVc swallows a throwing $defs accessor', () => {
        const trap = {};
        Object.defineProperty(trap, '$defs', { get() { throw new Error('boom'); } });
        silenceError(() => assert.equal(Schema.fromVc(trap), null));
    });
});

describe('@unit Token model — constructor error edges', () => {
    it('throws a TypeError when constructed with null', () => {
        assert.throws(() => new Token(null), TypeError);
    });

    it('throws a TypeError when constructed with undefined', () => {
        assert.throws(() => new Token(undefined), TypeError);
    });

    it('tolerates an empty object and base64-encodes the literal "undefined"', () => {
        const t = new Token({});
        assert.equal(t.url, btoa('undefined'));
    });

    it('base64-encodes the literal "null" for a null tokenId', () => {
        const t = new Token({ tokenId: null });
        assert.equal(t.url, btoa('null'));
    });

    it('base64-encodes an empty string tokenId to an empty string', () => {
        const t = new Token({ tokenId: '' });
        assert.equal(t.url, '');
    });
});

describe('@unit Token model — default and passthrough fields', () => {
    it('defaults policies to an empty array when absent', () => {
        assert.deepEqual(new Token({ tokenId: 'x' }).policies, []);
    });

    it('keeps a non-array falsy policies value via the || fallback', () => {
        assert.deepEqual(new Token({ tokenId: 'x', policies: 0 }).policies, []);
    });

    it('leaves decimals and initialSupply undefined when absent', () => {
        const t = new Token({ tokenId: 'x' });
        assert.equal(t.decimals, undefined);
        assert.equal(t.initialSupply, undefined);
    });

    it('leaves tokenType undefined when absent', () => {
        assert.equal(new Token({ tokenId: 'x' }).tokenType, undefined);
    });

    it('passes through draftToken/canDelete/wipeContractId unchanged', () => {
        const t = new Token({ tokenId: 'x' });
        assert.equal(t.draftToken, undefined);
        assert.equal(t.canDelete, undefined);
        assert.equal(t.wipeContractId, undefined);
    });
});

describe('@unit Token model — decimals/supply boundaries', () => {
    it('preserves zero decimals and zero supply without coercion', () => {
        const t = new Token({ tokenId: 'x', decimals: 0, initialSupply: 0 });
        assert.equal(t.decimals, 0);
        assert.equal(t.initialSupply, 0);
    });

    it('preserves negative decimals verbatim', () => {
        assert.equal(new Token({ tokenId: 'x', decimals: -3 }).decimals, -3);
    });

    it('preserves a max-safe-integer supply', () => {
        assert.equal(new Token({ tokenId: 'x', initialSupply: Number.MAX_SAFE_INTEGER }).initialSupply, Number.MAX_SAFE_INTEGER);
    });

    it('preserves string-typed decimals and supply', () => {
        const t = new Token({ tokenId: 'x', decimals: '8', initialSupply: '1000000' });
        assert.equal(t.decimals, '8');
        assert.equal(t.initialSupply, '1000000');
    });
});

describe('@unit Token model — enable flag passthrough', () => {
    it('stores each enable flag without boolean coercion', () => {
        const t = new Token({ tokenId: 'x', enableAdmin: 'yes', enableFreeze: 1, enableKYC: 0, enableWipe: null });
        assert.equal(t.enableAdmin, 'yes');
        assert.equal(t.enableFreeze, 1);
        assert.equal(t.enableKYC, 0);
        assert.equal(t.enableWipe, null);
    });

    it('leaves all enable flags undefined when omitted', () => {
        const t = new Token({ tokenId: 'x' });
        assert.equal(t.enableAdmin, undefined);
        assert.equal(t.enableFreeze, undefined);
        assert.equal(t.enableKYC, undefined);
        assert.equal(t.enableWipe, undefined);
    });

    it('carries an all-true flag combination', () => {
        const t = new Token({ tokenId: 'x', enableAdmin: true, enableFreeze: true, enableKYC: true, enableWipe: true });
        assert.deepEqual(
            [t.enableAdmin, t.enableFreeze, t.enableKYC, t.enableWipe],
            [true, true, true, true]
        );
    });

    it('carries an all-false flag combination', () => {
        const t = new Token({ tokenId: 'x', enableAdmin: false, enableFreeze: false, enableKYC: false, enableWipe: false });
        assert.deepEqual(
            [t.enableAdmin, t.enableFreeze, t.enableKYC, t.enableWipe],
            [false, false, false, false]
        );
    });
});

describe('@unit Token model — association and balance edges', () => {
    it('treats numeric-zero associated as not associated', () => {
        const t = new Token({ tokenId: 'x', associated: 0 });
        assert.equal(t.associated, 'No');
        assert.equal(t.frozen, 'n/a');
        assert.equal(t.kyc, 'n/a');
    });

    it('treats an empty-string associated as not associated', () => {
        assert.equal(new Token({ tokenId: 'x', associated: '' }).associated, 'No');
    });

    it('treats a non-empty string associated as associated', () => {
        assert.equal(new Token({ tokenId: 'x', associated: 'false' }).associated, 'Yes');
    });

    it('drops a numeric-zero balance to n/a via the || fallback', () => {
        assert.equal(new Token({ tokenId: 'x', associated: true, balance: 0 }).tokenBalance, 'n/a');
    });

    it('keeps a string-zero balance', () => {
        assert.equal(new Token({ tokenId: 'x', associated: true, balance: '0' }).tokenBalance, '0');
    });

    it('drops a numeric-zero hBarBalance to n/a via the || fallback', () => {
        assert.equal(new Token({ tokenId: 'x', associated: true, hBarBalance: 0 }).hBarBalance, 'n/a');
    });

    it('derives frozen/kyc only when associated', () => {
        const t = new Token({ tokenId: 'x', associated: true, frozen: true, kyc: false });
        assert.equal(t.frozen, 'Yes');
        assert.equal(t.kyc, 'No');
    });

    it('reports frozen/kyc n/a when associated is falsy despite frozen/kyc flags', () => {
        const t = new Token({ tokenId: 'x', associated: false, frozen: true, kyc: true });
        assert.equal(t.frozen, 'n/a');
        assert.equal(t.kyc, 'n/a');
    });
});
