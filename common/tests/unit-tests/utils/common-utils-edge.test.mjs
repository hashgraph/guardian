import assert from 'node:assert/strict';
import {
    findAllEntities,
    findAllBlocks,
    findAllTools,
    replaceAllEntities,
    replaceAllVariables,
    regenerateIds,
    getVCField,
    getVCIssuer,
    findOptions,
    replaceValueRecursive,
    getArtifactType,
    getArtifactExtention,
    replaceArtifactProperties,
    generateNumberFromString,
    toArrayBuffer,
    toBuffer,
    ensurePrefix,
    stripPrefix,
    findBlocks,
} from '../../../dist/helpers/utils.js';

describe('@unit common/utils.findAllEntities edge', () => {
    it('returns [] for empty names list even on a populated tree', () => {
        assert.deepEqual(findAllEntities({ schema: 'x', children: [{ schema: 'y' }] }, []), []);
    });

    it('dedupes by string coercion: numerically-equal string and number collapse', () => {
        const out = findAllEntities({ schema: 1, children: [{ schema: '1' }] }, ['schema']);
        assert.equal(out.length, 1);
    });

    it('collapses distinct objects sharing the same toString into one entry', () => {
        const out = findAllEntities(
            { schema: {}, children: [{ schema: {} }] },
            ['schema'],
        );
        assert.equal(out.length, 1);
    });

    it('keeps own null/undefined field values but keyed by their coercion', () => {
        const out = findAllEntities({ schema: null, inputSchema: undefined }, ['schema', 'inputSchema']);
        out.sort();
        assert.deepEqual(out, [null, undefined]);
    });

    it('does not descend when children is not iterable-of-objects (throws on non-array children)', () => {
        assert.throws(() => findAllEntities({ children: 5 }, ['schema']));
    });

    it('reads inherited prototype keys only via hasOwnProperty (ignores prototype field)', () => {
        const proto = { schema: 'proto' };
        const obj = Object.create(proto);
        assert.deepEqual(findAllEntities(obj, ['schema']), []);
    });

    it('handles a deeply nested chain without dedup loss', () => {
        let node = { schema: 'leaf' };
        for (let i = 0; i < 500; i++) {
            node = { schema: `s${i}`, children: [node] };
        }
        const out = findAllEntities(node, ['schema']);
        assert.equal(out.length, 501);
    });

    it('collects unicode values intact', () => {
        const out = findAllEntities({ schema: '\u{1F600}é', children: [{ schema: '中文' }] }, ['schema']);
        out.sort();
        assert.deepEqual(out, ['中文', '\u{1F600}é']);
    });
});

describe('@unit common/utils.findAllBlocks edge', () => {
    it('throws on a null root (no guard)', () => {
        assert.throws(() => findAllBlocks(null, 'tool'));
    });

    it('returns the root itself when the root matches', () => {
        const root = { blockType: 'tool' };
        const out = findAllBlocks(root, 'tool');
        assert.equal(out.length, 1);
        assert.equal(out[0], root);
    });

    it('matches by strict equality (case sensitive)', () => {
        assert.deepEqual(findAllBlocks({ blockType: 'Tool' }, 'tool'), []);
    });

    it('finds duplicate matches preserving each instance', () => {
        const tree = { blockType: 'x', children: [{ blockType: 'x' }, { blockType: 'x' }] };
        assert.equal(findAllBlocks(tree, 'x').length, 3);
    });

    it('iterates a string children value char-by-char without matching', () => {
        assert.deepEqual(findAllBlocks({ blockType: 'a', children: 'oops' }, 'b'), []);
    });
});

describe('@unit common/utils.findAllTools edge', () => {
    it('returns [] when no tool blocks exist', () => {
        assert.deepEqual(findAllTools({ blockType: 'root', children: [{ blockType: 'x' }] }), []);
    });

    it('maps a tool block missing a hash to undefined', () => {
        assert.deepEqual(findAllTools({ blockType: 'tool' }), [undefined]);
    });

    it('preserves duplicate hashes (no dedup)', () => {
        const tree = {
            blockType: 'root',
            children: [
                { blockType: 'tool', hash: 'h' },
                { blockType: 'tool', hash: 'h' },
            ],
        };
        assert.deepEqual(findAllTools(tree), ['h', 'h']);
    });
});

describe('@unit common/utils.replaceAllEntities edge', () => {
    it('descends into nested non-children object properties', () => {
        const tree = { meta: { inner: { schema: 'old' } } };
        replaceAllEntities(tree, ['schema'], 'old', 'new');
        assert.equal(tree.meta.inner.schema, 'new');
    });

    it('skips null array items without throwing', () => {
        const tree = { list: [null, { schema: 'old' }] };
        replaceAllEntities(tree, ['schema'], 'old', 'new');
        assert.equal(tree.list[1].schema, 'new');
    });

    it('only replaces exact (===) matches, not substrings', () => {
        const tree = { schema: 'old-value' };
        replaceAllEntities(tree, ['schema'], 'old', 'new');
        assert.equal(tree.schema, 'old-value');
    });

    it('replaces every matching occurrence across siblings', () => {
        const tree = { a: { schema: 'old' }, b: { schema: 'old' } };
        replaceAllEntities(tree, ['schema'], 'old', 'new');
        assert.equal(tree.a.schema, 'new');
        assert.equal(tree.b.schema, 'new');
    });

    it('throws on a null root (no guard)', () => {
        assert.throws(() => replaceAllEntities(null, ['schema'], 'a', 'b'));
    });

    it('is a no-op when names list is empty', () => {
        const tree = { schema: 'old' };
        replaceAllEntities(tree, [], 'old', 'new');
        assert.equal(tree.schema, 'old');
    });

    it('tolerates primitive entries in a children array and still replaces objects', () => {
        const tree = { children: [1, 'str', { schema: 'old' }] };
        assert.doesNotThrow(() => replaceAllEntities(tree, ['schema'], 'old', 'new'));
        assert.equal(tree.children[2].schema, 'new');
    });
});

describe('@unit common/utils.replaceAllVariables edge', () => {
    it('ignores non-module/non-tool blocks even if they declare variables', () => {
        const tree = { blockType: 'custom', x: 'old', variables: [{ type: 'T', name: 'x' }] };
        replaceAllVariables(tree, 'T', 'old', 'new');
        assert.equal(tree.x, 'old');
    });

    it('does nothing when variable type does not match', () => {
        const tree = { blockType: 'module', x: 'old', variables: [{ type: 'Other', name: 'x' }] };
        replaceAllVariables(tree, 'T', 'old', 'new');
        assert.equal(tree.x, 'old');
    });

    it('does nothing when current value differs from oldValue', () => {
        const tree = { blockType: 'module', x: 'different', variables: [{ type: 'T', name: 'x' }] };
        replaceAllVariables(tree, 'T', 'old', 'new');
        assert.equal(tree.x, 'different');
    });

    it('tolerates a module block whose variables is not an array', () => {
        const tree = { blockType: 'module', variables: 'nope', children: [] };
        assert.doesNotThrow(() => replaceAllVariables(tree, 'T', 'old', 'new'));
    });

    it('throws on a null root (no guard)', () => {
        assert.throws(() => replaceAllVariables(null, 'T', 'old', 'new'));
    });
});

describe('@unit common/utils.regenerateIds edge', () => {
    it('assigns an id even to a block without children', () => {
        const block = {};
        regenerateIds(block);
        assert.match(block.id, /^[0-9a-f-]{36}$/);
    });

    it('produces distinct ids across siblings', () => {
        const tree = { children: [{}, {}, {}] };
        regenerateIds(tree);
        const ids = new Set([tree.id, ...tree.children.map((c) => c.id)]);
        assert.equal(ids.size, 4);
    });

    it('ignores a non-array children value (no recursion)', () => {
        const block = { children: 'not-an-array' };
        regenerateIds(block);
        assert.ok(block.id);
        assert.equal(block.children, 'not-an-array');
    });

    it('throws on null block', () => {
        assert.throws(() => regenerateIds(null));
    });
});

describe('@unit common/utils.getVCField edge', () => {
    it('returns undefined when the named field is absent on subject[0]', () => {
        assert.equal(getVCField({ credentialSubject: [{ a: 1 }] }, 'missing'), undefined);
    });

    it('returns null when credentialSubject[0] is falsy', () => {
        assert.equal(getVCField({ credentialSubject: [null] }, 'a'), null);
    });

    it('reads only the first subject, ignoring later ones', () => {
        const vc = { credentialSubject: [{ a: 1 }, { a: 2 }] };
        assert.equal(getVCField(vc, 'a'), 1);
    });

    it('returns null for undefined document', () => {
        assert.equal(getVCField(undefined, 'a'), null);
    });
});

describe('@unit common/utils.getVCIssuer edge', () => {
    it('returns null when issuer.id is an empty string (falsy || null)', () => {
        assert.equal(getVCIssuer({ document: { issuer: { id: '' } } }), null);
    });

    it('returns the empty string verbatim when issuer is the empty string', () => {
        assert.equal(getVCIssuer({ document: { issuer: '' } }), '');
    });

    it('returns the id for a populated issuer object', () => {
        assert.equal(getVCIssuer({ document: { issuer: { id: 'did:x' } } }), 'did:x');
    });

    it('returns null for undefined document property', () => {
        assert.equal(getVCIssuer({ document: undefined }), null);
    });
});

describe('@unit common/utils.findOptions edge', () => {
    it('returns null when document is provided but field is empty string', () => {
        assert.equal(findOptions({ a: 1 }, ''), null);
    });

    it("treats 'L' on a non-array as a normal property lookup", () => {
        assert.equal(findOptions({ L: 'literal' }, 'L'), 'literal');
    });

    it('returns the last element for an L tail on a single-element array', () => {
        assert.equal(findOptions({ items: [42] }, 'items.L'), 42);
    });

    it('throws when traversing through a primitive mid-path', () => {
        assert.throws(() => findOptions({ a: 5 }, 'a.b.c'));
    });

    it('returns undefined for a missing top-level key', () => {
        assert.equal(findOptions({ a: 1 }, 'nope'), undefined);
    });

    it('returns null when the document is 0 (falsy short-circuit)', () => {
        assert.equal(findOptions(0, 'a'), null);
    });
});

describe('@unit common/utils.replaceValueRecursive edge', () => {
    it('replaces values inside arrays at the top level', () => {
        const out = replaceValueRecursive(['old', 'keep'], new Map([['old', 'new']]));
        assert.deepEqual(out, ['new', 'keep']);
    });

    it('also rewrites matching object keys, not only values', () => {
        const out = replaceValueRecursive({ old: 1 }, new Map([['old', 'new']]));
        assert.deepEqual(out, { new: 1 });
    });

    it('treats the map key as an unescaped regex, corrupting JSON when the key is a metachar', () => {
        assert.throws(
            () => replaceValueRecursive({ a: 'x.y' }, new Map([['.', '-']])),
            SyntaxError,
        );
    });

    it('throws Unknown type for a number input', () => {
        assert.throws(() => replaceValueRecursive(42, new Map()), /Unknown type/);
    });

    it('throws Unknown type for undefined input', () => {
        assert.throws(() => replaceValueRecursive(undefined, new Map()), /Unknown type/);
    });

    it('returns null for a literal null document (object branch, no replacements)', () => {
        assert.equal(replaceValueRecursive(null, new Map()), null);
    });

    it('applies replacements globally (all occurrences)', () => {
        const out = replaceValueRecursive({ a: 'oo', b: 'o' }, new Map([['o', 'X']]));
        assert.equal(out.a, 'XX');
        assert.equal(out.b, 'X');
    });
});

describe('@unit common/utils.getArtifactType edge', () => {
    it('is case sensitive: JS uppercase yields null', () => {
        assert.equal(getArtifactType('JS'), null);
    });

    it('returns null for null/undefined extension', () => {
        assert.equal(getArtifactType(null), null);
        assert.equal(getArtifactType(undefined), null);
    });

    it('maps json to JSON exactly', () => {
        assert.equal(getArtifactType('json'), 'JSON');
    });
});

describe('@unit common/utils.getArtifactExtention edge', () => {
    it('returns the whole name when there is no dot', () => {
        assert.equal(getArtifactExtention('README'), 'README');
    });

    it('throws on a name with a trailing dot (regex finds no segment after the dot)', () => {
        assert.throws(() => getArtifactExtention('file.'));
    });

    it('returns the last non-empty segment for a leading-dot (hidden) file', () => {
        assert.equal(getArtifactExtention('.gitignore'), 'gitignore');
    });

    it('throws on an empty string (regex matches nothing, .toString on null)', () => {
        assert.throws(() => getArtifactExtention(''));
    });
});

describe('@unit common/utils.replaceArtifactProperties edge', () => {
    it('overwrites with undefined when the property value is not in the map', () => {
        const cfg = { artifacts: [{ uuid: 'unmapped' }] };
        replaceArtifactProperties(cfg, 'uuid', new Map([['other', 'x']]));
        assert.equal(cfg.artifacts[0].uuid, undefined);
    });

    it('is a no-op for a null mapping', () => {
        const cfg = { artifacts: [{ uuid: 'a' }] };
        replaceArtifactProperties(cfg, 'uuid', null);
        assert.equal(cfg.artifacts[0].uuid, 'a');
    });

    it('is a no-op for an empty (size 0) mapping', () => {
        const cfg = { artifacts: [{ uuid: 'a' }] };
        replaceArtifactProperties(cfg, 'uuid', new Map());
        assert.equal(cfg.artifacts[0].uuid, 'a');
    });

    it('does nothing when the object has no artifacts and no children', () => {
        const cfg = { foo: 1 };
        assert.doesNotThrow(() => replaceArtifactProperties(cfg, 'uuid', new Map([['a', 'b']])));
        assert.deepEqual(cfg, { foo: 1 });
    });

    it('recurses through nested children arrays', () => {
        const cfg = { children: [{ children: [{ artifacts: [{ uuid: 'old' }] }] }] };
        replaceArtifactProperties(cfg, 'uuid', new Map([['old', 'new']]));
        assert.equal(cfg.children[0].children[0].artifacts[0].uuid, 'new');
    });
});

describe('@unit common/utils.generateNumberFromString edge', () => {
    it('is order sensitive: anagrams hash differently', () => {
        assert.notEqual(generateNumberFromString('ab'), generateNumberFromString('ba'));
    });

    it('stays within MAX_SAFE_INTEGER for a long input', () => {
        const v = generateNumberFromString('x'.repeat(10000));
        assert.ok(v >= 0 && v <= Number.MAX_SAFE_INTEGER);
    });

    it('is deterministic for unicode input', () => {
        assert.equal(
            generateNumberFromString('\u{1F4A9}abc'),
            generateNumberFromString('\u{1F4A9}abc'),
        );
    });

    it('returns a non-negative integer for arbitrary text', () => {
        const v = generateNumberFromString('Hello, World!');
        assert.ok(Number.isInteger(v));
        assert.ok(v >= 0);
    });

    it('throws when given null (no length property)', () => {
        assert.throws(() => generateNumberFromString(null));
    });
});

describe('@unit common/utils.toArrayBuffer / toBuffer edge', () => {
    it('round-trips an empty buffer (length 0)', () => {
        const ab = toArrayBuffer(Buffer.alloc(0));
        assert.ok(ab instanceof ArrayBuffer);
        assert.equal(ab.byteLength, 0);
        assert.equal(toBuffer(ab).length, 0);
    });

    it('respects byteOffset of a sliced buffer view', () => {
        const base = Buffer.from([9, 8, 7, 6, 5]);
        const view = base.subarray(2);
        const ab = toArrayBuffer(view);
        assert.deepEqual(Array.from(new Uint8Array(ab)), [7, 6, 5]);
    });

    it('toBuffer copies the underlying bytes of an ArrayBuffer', () => {
        const ab = new Uint8Array([10, 20, 30]).buffer;
        assert.deepEqual(Array.from(toBuffer(ab)), [10, 20, 30]);
    });

    it('toArrayBuffer returns undefined for missing arg, null for explicit null', () => {
        assert.equal(toArrayBuffer(), undefined);
        assert.equal(toArrayBuffer(null), null);
    });
});

describe('@unit common/utils.ensurePrefix / stripPrefix edge', () => {
    it('ensurePrefix with empty-string prefix in list always matches (no prepend)', () => {
        assert.equal(ensurePrefix('abc', ['', 'X-'], 'X-'), 'abc');
    });

    it('ensurePrefix on empty text prepends the default', () => {
        assert.equal(ensurePrefix('', ['Bearer '], 'Bearer '), 'Bearer ');
    });

    it('ensurePrefix matches the first applicable prefix in order', () => {
        assert.equal(ensurePrefix('ab', ['a', 'ab'], 'z-'), 'ab');
    });

    it('stripPrefix removes only the first matching prefix once', () => {
        assert.equal(stripPrefix('aaab', ['a']), 'aab');
    });

    it('stripPrefix with an empty-string prefix strips nothing', () => {
        assert.equal(stripPrefix('abc', ['']), 'abc');
    });

    it('stripPrefix returns the full text when prefix longer than text', () => {
        assert.equal(stripPrefix('ab', ['abcdef']), 'ab');
    });

    it('ensurePrefix is idempotent once a prefix is present', () => {
        const once = ensurePrefix('x', 'p:', 'p:');
        assert.equal(ensurePrefix(once, 'p:', 'p:'), 'p:x');
    });
});

describe('@unit common/utils.findBlocks edge', () => {
    it('returns [] for an undefined tree', () => {
        assert.deepEqual(findBlocks(undefined, () => true), []);
    });

    it('includes the root when it matches', () => {
        const root = { blockType: 'x' };
        assert.deepEqual(findBlocks(root, (b) => b.blockType === 'x'), [root]);
    });

    it('skips a non-array children value without throwing', () => {
        const tree = { blockType: 'x', children: 'nope' };
        assert.deepEqual(findBlocks(tree, () => true), [tree]);
    });

    it('traverses deeply nested children and matches all', () => {
        let node = { blockType: 'leaf' };
        for (let i = 0; i < 300; i++) {
            node = { blockType: 'leaf', children: [node] };
        }
        assert.equal(findBlocks(node, (b) => b.blockType === 'leaf').length, 301);
    });

    it('preserves discovery order (pre-order DFS)', () => {
        const tree = {
            id: 'root',
            children: [
                { id: 'a', children: [{ id: 'b' }] },
                { id: 'c' },
            ],
        };
        const ids = findBlocks(tree, () => true).map((n) => n.id);
        assert.deepEqual(ids, ['root', 'a', 'b', 'c']);
    });
});
