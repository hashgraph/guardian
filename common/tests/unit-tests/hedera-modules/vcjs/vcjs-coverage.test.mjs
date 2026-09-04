import { assert } from 'chai';

import { DefaultDocumentLoader } from '../../../../dist/hedera-modules/document-loader/document-loader-default.js';
import { LocalDidLoader } from '../../../../dist/document-loader/local-did-loader.js';
import { VCJS } from '../../../../dist/hedera-modules/vcjs/vcjs.js';
import { ContextHelper } from '../../../../dist/hedera-modules/vcjs/context-helper.js';
import { SignatureType } from '@guardian/interfaces';

void DefaultDocumentLoader;
void LocalDidLoader;

describe('VCJS coverage (offline paths)', function () {
    function makeVcjs() {
        return new VCJS('tenant-1');
    }

    describe('addContext', function () {
        it('pushes a context onto schemaContext', function () {
            const vcjs = makeVcjs();
            vcjs.addContext('ctx-a');
            vcjs.addContext('ctx-b');
            assert.deepEqual(vcjs.schemaContext, ['ctx-a', 'ctx-b']);
        });
    });

    describe('generateUUID', function () {
        it('returns the supplied uuid when present', function () {
            const vcjs = makeVcjs();
            assert.equal(vcjs.generateUUID({ uuid: 'fixed' }), 'fixed');
        });

        it('generates a urn:uuid prefix otherwise', function () {
            const vcjs = makeVcjs();
            assert.match(vcjs.generateUUID(), /^urn:uuid:/);
            assert.match(vcjs.generateUUID({}), /^urn:uuid:/);
        });
    });

    describe('addContextInSubject', function () {
        it('creates an array context when none exists', function () {
            const vcjs = makeVcjs();
            const s = vcjs.addContextInSubject({}, 'c1');
            assert.deepEqual(s['@context'], ['c1']);
        });

        it('pushes onto an existing array context', function () {
            const vcjs = makeVcjs();
            const s = vcjs.addContextInSubject({ '@context': ['c0'] }, 'c1');
            assert.deepEqual(s['@context'], ['c0', 'c1']);
        });

        it('wraps a scalar context into an array', function () {
            const vcjs = makeVcjs();
            const s = vcjs.addContextInSubject({ '@context': 'c0' }, 'c1');
            assert.deepEqual(s['@context'], ['c0', 'c1']);
        });
    });

    describe('addDryRunContext', function () {
        it('returns non-object inputs untouched', function () {
            const vcjs = makeVcjs();
            assert.equal(vcjs.addDryRunContext('str'), 'str');
            assert.equal(vcjs.addDryRunContext(null), null);
        });

        it('recurses over arrays', function () {
            const vcjs = makeVcjs();
            const arr = [{ type: 'A' }, { type: 'B' }];
            vcjs.addDryRunContext(arr);
            assert.deepEqual(arr[0]['@context'], ['schema:A']);
            assert.deepEqual(arr[1]['@context'], ['schema:B']);
        });

        it('returns object without type unchanged', function () {
            const vcjs = makeVcjs();
            const o = { foo: 1 };
            assert.strictEqual(vcjs.addDryRunContext(o), o);
            assert.isUndefined(o['@context']);
        });

        it('sets a default schema context and propagates to nested typed children', function () {
            const vcjs = makeVcjs();
            const o = { type: 'Root', child: { type: 'Child', v: 1 } };
            vcjs.addDryRunContext(o);
            assert.deepEqual(o['@context'], ['schema:Root']);
            assert.deepEqual(o.child['@context'], ['schema:Root']);
        });

        it('honours an explicit context override', function () {
            const vcjs = makeVcjs();
            const o = { type: 'Root' };
            vcjs.addDryRunContext(o, ['custom:ctx']);
            assert.deepEqual(o['@context'], ['custom:ctx']);
        });
    });

    describe('prepareSchema', function () {
        it('returns early when there are no $defs', function () {
            const vcjs = makeVcjs();
            const schema = { type: 'object' };
            assert.doesNotThrow(() => vcjs.prepareSchema(schema));
        });

        it('drops readOnly fields from a nested required list', function () {
            const vcjs = makeVcjs();
            const schema = {
                $defs: {
                    Foo: {
                        required: ['a', 'b'],
                        properties: { a: { readOnly: true }, b: { readOnly: false } }
                    },
                    Bar: { required: [], properties: {} }
                }
            };
            vcjs.prepareSchema(schema);
            assert.deepEqual(schema.$defs.Foo.required, ['b']);
            assert.deepEqual(schema.$defs.Bar.required, []);
        });

        it('strips templateFieldId, an editor-only annotation AJV strict mode rejects as unknown', function () {
            const vcjs = makeVcjs();
            const schema = {
                type: 'object',
                properties: {
                    root: { type: 'string', templateFieldId: 'root-id' },
                    // SchemaHelper writes templateFieldId on the array field itself,
                    // never on `items` directly; nested object fields get their own id.
                    list: {
                        type: 'array',
                        templateFieldId: 'list-id',
                        items: { type: 'object', properties: {
                            nested: { type: 'string', templateFieldId: 'nested-id' }
                        } }
                    }
                },
                $defs: {
                    Foo: {
                        type: 'object',
                        properties: { a: { type: 'string', templateFieldId: 'def-id' } }
                    }
                }
            };
            vcjs.prepareSchema(schema);
            assert.notProperty(schema.properties.root, 'templateFieldId');
            assert.notProperty(schema.properties.list, 'templateFieldId');
            assert.notProperty(schema.properties.list.items.properties.nested, 'templateFieldId');
            assert.notProperty(schema.$defs.Foo.properties.a, 'templateFieldId');
        });

        it('strips templateFieldId from a conditional field revealed in an allOf then/else branch', function () {
            const vcjs = makeVcjs();
            const schema = {
                type: 'object',
                properties: {
                    trigger: { type: 'string' }
                },
                allOf: [{
                    if: {
                        properties: { trigger: { const: 'yes' } },
                        required: ['trigger']
                    },
                    then: {
                        properties: {
                            condField: { type: 'string', templateFieldId: 'cond-id' }
                        }
                    },
                    else: {
                        properties: {
                            otherCondField: { type: 'string', templateFieldId: 'other-cond-id' }
                        }
                    }
                }]
            };
            vcjs.prepareSchema(schema);
            assert.notProperty(schema.allOf[0].then.properties.condField, 'templateFieldId');
            assert.notProperty(schema.allOf[0].else.properties.otherCondField, 'templateFieldId');
        });

        describe('shared sub-schema sibling isolation', function () {
            // Two root fields (`targeted` and `sibling`) both $ref the same #Sub entry.
            // A condition in allOf targets only `targeted`. The fix must clone #Sub
            // for `targeted` only — leaving `sibling` pointing at the unmodified original.
            function makeSharedRefSchema() {
                return {
                    type: 'object',
                    properties: {
                        targeted: { $ref: '#Sub' },
                        sibling:  { $ref: '#Sub' }
                    },
                    required: ['targeted', 'sibling'],
                    allOf: [{
                        if: {
                            properties: { targeted: { properties: { a: { const: 1 } }, required: ['a'] } },
                            required: ['targeted']
                        },
                        then: { properties: { targeted: { required: ['b'] } } },
                        else: { properties: { targeted: { properties: { b: false } } } }
                    }],
                    $defs: {
                        '#Sub': {
                            $id: '#Sub',
                            type: 'object',
                            properties: {
                                a: { type: 'number' },
                                b: { type: 'number' }
                            },
                            required: ['a', 'b']
                        }
                    }
                };
            }

            it('rewrites $ref only on the targeted container, not on sibling', function () {
                const vcjs = makeVcjs();
                const schema = makeSharedRefSchema();
                vcjs.prepareSchema(schema);

                assert.notEqual(schema.properties.targeted.$ref, '#Sub',
                    'targeted $ref should point to a per-container clone');
                assert.equal(schema.properties.sibling.$ref, '#Sub',
                    'sibling $ref must remain on the original entry');
            });

            it('clone receives a unique $id; original entry is untouched', function () {
                const vcjs = makeVcjs();
                const schema = makeSharedRefSchema();
                vcjs.prepareSchema(schema);

                const cloneKey = schema.properties.targeted.$ref;
                assert.exists(schema.$defs[cloneKey], 'clone must be present in $defs');
                assert.equal(schema.$defs[cloneKey].$id, cloneKey,
                    'clone $id must equal the clone key so AJV can resolve the rewritten $ref');
                assert.equal(schema.$defs['#Sub'].$id, '#Sub',
                    'original $id must not be changed');
            });

            it('strips conditional field from clone required without mutating the original', function () {
                const vcjs = makeVcjs();
                const schema = makeSharedRefSchema();
                vcjs.prepareSchema(schema);

                const cloneKey = schema.properties.targeted.$ref;
                assert.notInclude(schema.$defs[cloneKey].required ?? [], 'b',
                    'b should be stripped from the clone required array');
                assert.include(schema.$defs['#Sub'].required, 'b',
                    'original required must not be mutated — sibling still needs b');
            });

            it('condition TRUE: targeted.b required, sibling.b independently required', async function () {
                const vcjs = makeVcjs();
                const schema = makeSharedRefSchema();
                vcjs.schemaLoader = async () => schema;

                const result = await vcjs.verifySubject({
                    type: 'T',
                    targeted: { a: 1, b: 99 },
                    sibling:  { a: 2, b: 7 }
                });
                assert.isTrue(result.ok, 'both fields provided — should be valid');
            });

            it('condition TRUE: missing targeted.b fails validation', async function () {
                const vcjs = makeVcjs();
                const schema = makeSharedRefSchema();
                vcjs.schemaLoader = async () => schema;

                const result = await vcjs.verifySubject({
                    type: 'T',
                    targeted: { a: 1 },
                    sibling:  { a: 2, b: 7 }
                });
                assert.isFalse(result.ok, 'targeted.b is required when condition is true');
            });

            it('condition FALSE: targeted has no b, sibling.b still required from base schema', async function () {
                const vcjs = makeVcjs();
                const schema = makeSharedRefSchema();
                vcjs.schemaLoader = async () => schema;

                const result = await vcjs.verifySubject({
                    type: 'T',
                    targeted: { a: 2 },
                    sibling:  { a: 3, b: 5 }
                });
                assert.isTrue(result.ok, 'sibling.b provided — should be valid');
            });

            it('condition FALSE: missing sibling.b fails — strip must not leak to untargeted sibling', async function () {
                // Regression guard: the old IRI-keyed approach mutated the shared $defs entry,
                // making b optional on sibling too. With per-container cloning, the original
                // entry is never modified, so sibling.b remains required.
                const vcjs = makeVcjs();
                const schema = makeSharedRefSchema();
                vcjs.schemaLoader = async () => schema;

                const result = await vcjs.verifySubject({
                    type: 'T',
                    targeted: { a: 2 },
                    sibling:  { a: 3 }
                });
                assert.isFalse(result.ok,
                    'sibling.b must still be required — the required-strip must not leak from targeted to sibling');
            });
        });

        describe('array-typed sub-schema ref (items.$ref)', function () {
            // Regression guard: a sub-schema reference under an array property sits at
            // `items.$ref`, not `$ref` directly on the property. Before readRef/withRef
            // handled that shape, prepareSchema silently skipped the strip-and-clone pass
            // for any array-typed ref field entirely.
            function makeArrayRefSchema() {
                return {
                    type: 'object',
                    properties: {
                        targetedList: { type: 'array', items: { $ref: '#Sub' } }
                    },
                    required: [],
                    allOf: [{
                        if: {
                            properties: { targetedList: { properties: { a: { const: 1 } }, required: ['a'] } },
                            required: ['targetedList']
                        },
                        then: { properties: { targetedList: { required: ['b'] } } },
                        else: { properties: { targetedList: { properties: { b: false } } } }
                    }],
                    $defs: {
                        '#Sub': {
                            $id: '#Sub',
                            type: 'object',
                            properties: { a: { type: 'number' }, b: { type: 'number' } },
                            required: ['a', 'b']
                        }
                    }
                };
            }

            it('rewrites items.$ref to a per-container clone', function () {
                const vcjs = makeVcjs();
                const schema = makeArrayRefSchema();
                vcjs.prepareSchema(schema);

                assert.notEqual(schema.properties.targetedList.items.$ref, '#Sub',
                    'items.$ref should point to a clone, proving the array-typed ref was recognized');
            });

            it('strips the conditional field from the clone required, without mutating the original', function () {
                const vcjs = makeVcjs();
                const schema = makeArrayRefSchema();
                vcjs.prepareSchema(schema);

                const cloneKey = schema.properties.targetedList.items.$ref;
                assert.exists(schema.$defs[cloneKey], 'clone must be present in $defs');
                assert.notInclude(schema.$defs[cloneKey].required ?? [], 'b',
                    'b should be stripped from the clone required array');
                assert.include(schema.$defs['#Sub'].required, 'b',
                    'original required must not be mutated');
            });
        });
    });

    describe('verifySubject', function () {
        it('throws when no schema loader is configured', async function () {
            const vcjs = makeVcjs();
            await assertRejects(() => vcjs.verifySubject({ type: 'X' }), /Schema Loader not found/);
        });

        it('throws when the loader resolves no schema', async function () {
            const vcjs = makeVcjs();
            vcjs.schemaLoader = async () => null;
            await assertRejects(() => vcjs.verifySubject({ type: 'X' }), /Schema not found/);
        });

        it('validates a subject against a resolved schema (valid)', async function () {
            const vcjs = makeVcjs();
            vcjs.schemaLoader = async () => ({
                type: 'object',
                properties: { name: { type: 'string' } },
                required: ['name']
            });
            const result = await vcjs.verifySubject({ '@context': [], type: 'X', name: 'alice' });
            assert.isTrue(result.ok);
        });

        it('returns a failing CheckResult for an invalid subject', async function () {
            const vcjs = makeVcjs();
            vcjs.schemaLoader = async () => ({
                type: 'object',
                properties: { name: { type: 'string' } },
                required: ['name']
            });
            const result = await vcjs.verifySubject({ '@context': [], type: 'X' });
            assert.isFalse(result.ok);
        });
    });

    describe('verifySchema', function () {
        it('throws when credentialSubject is missing', async function () {
            const vcjs = makeVcjs();
            await assertRejects(() => vcjs.verifySchema({}), /credentialSubject/);
        });

        it('reads from toJsonTree when available', async function () {
            const vcjs = makeVcjs();
            const vcLike = { toJsonTree: () => ({ credentialSubject: null }) };
            await assertRejects(() => vcjs.verifySchema(vcLike), /credentialSubject/);
        });

        it('throws when no schema loader is configured', async function () {
            const vcjs = makeVcjs();
            await assertRejects(
                () => vcjs.verifySchema({ credentialSubject: { '@context': [], type: 'X' } }),
                /Schema Loader not found/
            );
        });

        it('throws when the loader resolves no schema', async function () {
            const vcjs = makeVcjs();
            vcjs.schemaLoader = async () => null;
            await assertRejects(
                () => vcjs.verifySchema({ credentialSubject: { '@context': [], type: 'X' } }),
                /Schema not found/
            );
        });

        it('compiles the resolved schema and returns a CheckResult', async function () {
            const vcjs = makeVcjs();
            vcjs.schemaLoader = async () => ({
                type: 'object',
                properties: { name: { type: 'string' } },
                required: ['name'],
                $defs: {}
            });
            const result = await vcjs.verifySchema({
                credentialSubject: { '@context': [], type: 'X', name: 'alice' }
            });
            assert.property(result, 'ok');
        });

        it('uses the first subject when credentialSubject is an array', async function () {
            const vcjs = makeVcjs();
            vcjs.schemaLoader = async () => ({
                type: 'object',
                properties: { name: { type: 'string' } },
                $defs: {}
            });
            const result = await vcjs.verifySchema({
                credentialSubject: [{ '@context': [], type: 'X', name: 'alice' }]
            });
            assert.property(result, 'ok');
        });

        // #1743: verifySchema used to restore ref-field type/@context (via
        // ContextHelper.setContext) for credentialSubject[0] only, so a
        // multi-subject VC was checked consistently for its first subject alone.
        it('rejects an empty credentialSubject array instead of passing vacuously', async function () {
            const vcjs = makeVcjs();
            await assertRejects(
                () => vcjs.verifySchema({ credentialSubject: [] }),
                /credentialSubject/
            );
        });

        it('rejects an array holding no usable subject', async function () {
            const vcjs = makeVcjs();
            await assertRejects(
                () => vcjs.verifySchema({ credentialSubject: [null] }),
                /credentialSubject/
            );
        });

        it('runs ContextHelper.setContext for every subject, not just the first', async function () {
            const vcjs = makeVcjs();
            vcjs.schemaLoader = async () => ({
                type: 'object',
                properties: {
                    credentialSubject: {
                        oneOf: [{ type: 'object' }, { type: 'array' }]
                    }
                },
                $defs: {}
            });

            const seen = [];
            const original = ContextHelper.setContext;
            ContextHelper.setContext = (vc, schema) => {
                seen.push(vc);
                return original(vc, schema);
            };
            try {
                await vcjs.verifySchema({
                    credentialSubject: [
                        { '@context': [], type: 'X', name: 'alice' },
                        { '@context': [], type: 'X', name: 'bob' }
                    ]
                });
            } finally {
                ContextHelper.setContext = original;
            }

            assert.equal(seen.length, 2, 'setContext must run once per subject, not once total');
            assert.equal(seen[0].name, 'alice');
            assert.equal(seen[1].name, 'bob');
        });

        it('still runs ContextHelper.setContext once for a non-array credentialSubject', async function () {
            const vcjs = makeVcjs();
            vcjs.schemaLoader = async () => ({ type: 'object', properties: {}, $defs: {} });

            const seen = [];
            const original = ContextHelper.setContext;
            ContextHelper.setContext = (vc, schema) => {
                seen.push(vc);
                return original(vc, schema);
            };
            try {
                await vcjs.verifySchema({
                    credentialSubject: { '@context': [], type: 'X', name: 'alice' }
                });
            } finally {
                ContextHelper.setContext = original;
            }

            assert.equal(seen.length, 1);
            assert.equal(seen[0].name, 'alice');
        });
    });

    describe('prepareSchema - conditional strip on the VC wrapper path (#1743)', function () {
        // prepareSchema's conditional-required strip used to require Array.isArray(schema.allOf)
        // on the object passed in directly. That holds when prepareSchema runs on a subject
        // schema (verifySubject), but verifySchema hands it the VC WRAPPER schema instead - the
        // wrapper's own root never carries allOf, only the subject schema nested in $defs does.
        // A cross-target field that's base-required in that nested sub-schema stayed
        // unconditionally required, so a document valid at request time could fail later on an
        // external-verify path. The strip must also walk each $defs entry that carries its own
        // allOf, not just the root.

        function wrapperWithSubjectConditions() {
            return {
                type: 'object',
                properties: {
                    credentialSubject: { $ref: '#Subject' }
                },
                required: ['credentialSubject'],
                // deliberately no allOf here - it lives one level down, in $defs['#Subject']
                $defs: {
                    '#Subject': {
                        $id: '#Subject',
                        type: 'object',
                        properties: {
                            trigger: { type: 'string' },
                            detail: { $ref: '#Detail' }
                        },
                        required: ['trigger', 'detail'],
                        allOf: [{
                            if: { properties: { trigger: { const: 'yes' } }, required: ['trigger'] },
                            then: { properties: { detail: { required: ['note'] } } },
                            else: { properties: { detail: { properties: { note: false } } } }
                        }]
                    },
                    '#Detail': {
                        $id: '#Detail',
                        type: 'object',
                        properties: { note: { type: 'string' } },
                        required: ['note'],
                        additionalProperties: false
                    }
                }
            };
        }

        it('accepts a document that omits the base-required field while the branch is inactive', async function () {
            const vcjs = makeVcjs();
            vcjs.schemaLoader = async () => wrapperWithSubjectConditions();
            const result = await vcjs.verifySchema({
                credentialSubject: { '@context': [], type: 'X', trigger: 'no', detail: {} }
            });
            assert.isTrue(result.ok, `expected valid, got ${JSON.stringify(result.error?.details ?? result.errors)}`);
        });

        it('still forbids the field when the inactive branch says so', async function () {
            const vcjs = makeVcjs();
            vcjs.schemaLoader = async () => wrapperWithSubjectConditions();
            const result = await vcjs.verifySchema({
                credentialSubject: { '@context': [], type: 'X', trigger: 'no', detail: { note: 'should not be here' } }
            });
            assert.isFalse(result.ok, 'an inactive branch must still forbid the field');
        });

        it('requires the field when the active branch says so', async function () {
            const vcjs = makeVcjs();
            vcjs.schemaLoader = async () => wrapperWithSubjectConditions();
            const missing = await vcjs.verifySchema({
                credentialSubject: { '@context': [], type: 'X', trigger: 'yes', detail: {} }
            });
            assert.isFalse(missing.ok, 'an active branch must still require the field');

            const present = await vcjs.verifySchema({
                credentialSubject: { '@context': [], type: 'X', trigger: 'yes', detail: { note: 'present' } }
            });
            assert.isTrue(present.ok, `expected valid, got ${JSON.stringify(present.error?.details ?? present.errors)}`);
        });

        it('leaves prepareSchema a no-op when neither the root nor any $defs entry carries allOf', function () {
            const vcjs = makeVcjs();
            const schema = {
                type: 'object',
                properties: { credentialSubject: { $ref: '#Subject' } },
                $defs: { '#Subject': { type: 'object', properties: {}, required: [] } }
            };
            assert.doesNotThrow(() => vcjs.prepareSchema(schema));
        });
    });

    describe('verifyVC', function () {
        it('delegates to the configured loader when none supplied', async function () {
            const vcjs = makeVcjs();
            let usedLoader;
            vcjs.loader = 'configured-loader';
            vcjs.verify = async (json, loader) => { usedLoader = loader; return true; };
            const res = await vcjs.verifyVC({ proof: {} });
            assert.isTrue(res);
            assert.equal(usedLoader, 'configured-loader');
        });

        it('uses an explicit loader and reads toJsonTree', async function () {
            const vcjs = makeVcjs();
            let usedLoader; let usedJson;
            vcjs.verify = async (json, loader) => { usedLoader = loader; usedJson = json; return true; };
            const res = await vcjs.verifyVC({ toJsonTree: () => ({ proof: {}, tree: 1 }) }, 'explicit');
            assert.isTrue(res);
            assert.equal(usedLoader, 'explicit');
            assert.deepEqual(usedJson, { proof: {}, tree: 1 });
        });
    });

    describe('createSuiteByMethod error branches', function () {
        function fakeDid(methodsByType) {
            return {
                getMethodByType(type) { return methodsByType[type] || null; },
                getDid() { return 'did:example:1'; }
            };
        }

        it('throws when no Ed25519 method exists (default branch)', async function () {
            const vcjs = makeVcjs();
            await assertRejects(
                () => vcjs.createSuiteByMethod(fakeDid({}), SignatureType.Ed25519Signature2018),
                /Verification method not found/
            );
        });

        it('throws when Ed25519 method has no private key', async function () {
            const vcjs = makeVcjs();
            const did = fakeDid({ Ed25519VerificationKey2018: { hasPrivateKey: () => false } });
            await assertRejects(
                () => vcjs.createSuiteByMethod(did, SignatureType.Ed25519Signature2018),
                /Private key not found/
            );
        });

        it('throws when no BBS method exists', async function () {
            const vcjs = makeVcjs();
            await assertRejects(
                () => vcjs.createSuiteByMethod(fakeDid({}), SignatureType.BbsBlsSignature2020),
                /Verification method not found/
            );
        });

        it('throws when BBS method has no private key', async function () {
            const vcjs = makeVcjs();
            const did = fakeDid({ Bls12381G2Key2020: { hasPrivateKey: () => false } });
            await assertRejects(
                () => vcjs.createSuiteByMethod(did, SignatureType.BbsBlsSignature2020),
                /Private key not found/
            );
        });
    });
});

async function assertRejects(fn, regex) {
    let threw = false;
    try {
        await fn();
    } catch (e) {
        threw = true;
        assert.match(e.message, regex);
    }
    assert.isTrue(threw, 'expected promise to reject');
}
