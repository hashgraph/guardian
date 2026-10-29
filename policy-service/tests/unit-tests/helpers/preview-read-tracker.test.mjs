import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { runInNewContext } from 'node:vm';
import { PREVIEW_SCRIPT_FILE, PreviewReadTracker } from '../../../dist/policy-engine/helpers/workers/preview-read-tracker.js';

describe('@unit PreviewReadTracker', () => {
    it('records nested reads with dotted paths', () => {
        const tracker = new PreviewReadTracker();
        const doc = tracker.track({ amount: 2, location: { lat: 1 } }, '#S');
        assert.equal(doc.amount + doc.location.lat, 3);
        assert.deepEqual(tracker.take(), [
            { schema: '#S', path: 'amount' },
            { schema: '#S', path: 'location' },
            { schema: '#S', path: 'location.lat' }
        ]);
    });

    it('records a read of a field that is not there', () => {
        const tracker = new PreviewReadTracker();
        const doc = tracker.track({}, '#S');
        assert.equal(doc.rate, undefined);
        assert.deepEqual(tracker.take(), [{ schema: '#S', path: 'rate' }]);
    });

    it('does not treat a presence check as a read', () => {
        const tracker = new PreviewReadTracker();
        const doc = tracker.track({ amount: 2, location: {}, values: [1] }, '#S');
        assert.equal('rate' in doc, false);
        assert.equal(Object.hasOwn(doc, 'total'), false);
        assert.equal(Object.prototype.hasOwnProperty.call(doc.location, 'lat'), false);
        assert.equal(0 in doc.values, true);
        assert.deepEqual(tracker.take().map((read) => read.path), ['location', 'values']);
    });

    it('does not record a write that puts the same input rows back', () => {
        const tracker = new PreviewReadTracker();
        const doc = tracker.track({ items: [{ value: 1 }] }, '#S');
        doc.items = doc.items.map((item) => item);
        assert.equal(doc.items[0].value, 1);
        assert.deepEqual(tracker.takeWrites(), []);
        assert.deepEqual(tracker.take().map((read) => read.path), ['items', 'items.value']);
        assert.deepEqual(structuredClone(tracker.unwrap(doc)), { items: [{ value: 1 }] });
    });

    it('leaves array indexes out of the path', () => {
        const tracker = new PreviewReadTracker();
        const doc = tracker.track({ items: [{ value: 1 }, { value: 2 }] }, null);
        const total = doc.items.map((item) => item.value).reduce((sum, value) => sum + value, 0);
        assert.equal(total, 3);
        assert.deepEqual(tracker.take().map((read) => read.path), ['items', 'items.value']);
    });

    it('returns each read once and clears on take', () => {
        const tracker = new PreviewReadTracker();
        const doc = tracker.track({ a: 1 }, null);
        const first = doc.a;
        const second = doc.a;
        assert.equal(first + second, 2);
        assert.equal(tracker.take().length, 1);
        assert.deepEqual(tracker.take(), []);
    });

    it('records writes with array indexes, including a write of the same value', () => {
        const tracker = new PreviewReadTracker();
        const doc = tracker.track({ temp: 0, items: [{ total: 1 }, {}] }, '#S');
        doc.temp = 0;
        doc.items[1].total = 2;
        doc.items.push({ total: 3 });
        assert.deepEqual(tracker.takeWrites(), [
            { schema: '#S', path: 'temp', document: null },
            { schema: '#S', path: 'items.1.total', document: null },
            { schema: '#S', path: 'items.2', document: null }
        ]);
        assert.deepEqual(tracker.takeWrites(), []);
        assert.deepEqual(tracker.take().map((read) => read.path), ['items']);
    });

    it('records which input document a write went to and which input a result is', () => {
        const tracker = new PreviewReadTracker();
        const documents = tracker.trackPolicyDocuments([
            { schema: '#S', document: { credentialSubject: [{ amount: 2 }] } },
            { schema: '#S', document: { credentialSubject: [{ amount: 3 }] } }
        ]);
        documents[0].document.credentialSubject[0].temp = 3;
        assert.deepEqual(tracker.takeWrites(), [{ schema: '#S', path: 'temp', document: 0 }]);
        assert.deepEqual(tracker.findSources(documents[1]), [1]);
        assert.deepEqual(tracker.findSources(tracker.unwrap([{ ...documents[1] }, documents[0], { amount: 2 }])), [1, 0, -1]);
        assert.deepEqual(tracker.findSources(tracker.unwrap(documents[1].document.credentialSubject[0])), [1]);
        assert.deepEqual(tracker.findSources(tracker.unwrap({ ...documents[1].document.credentialSubject[0] })), [-1]);
    });

    it('keeps the input document of each read site apart when the same field is read from two inputs', () => {
        const tracker = new PreviewReadTracker();
        tracker.configure('');
        const documents = tracker.trackPolicyDocuments([
            { schema: '#S', document: { credentialSubject: [{ amount: 2 }] } },
            { schema: '#S', document: { credentialSubject: [{ amount: 3 }] } }
        ]);
        assert.equal(documents[0].document.credentialSubject[0].amount + documents[1].document.credentialSubject[0].amount, 5);
        assert.deepEqual(tracker.takeSites().map((read) => [read.path, read.document]), [['amount', 0], ['amount', 1]]);
        const doc = tracker.track({ amount: 1 }, '#S');
        assert.equal(doc.amount, 1);
        assert.equal('document' in tracker.takeSites()[0], false);
    });

    it('does not record a read of a value the script wrote earlier, but keeps a read made before the write', () => {
        const tracker = new PreviewReadTracker();
        const doc = tracker.track({ amount: 2, rate: 3 }, '#S');
        doc.temp = doc.amount + 1;
        doc.final = doc.temp * 2;
        doc.rate = doc.rate * 2;
        assert.deepEqual(tracker.take().map((read) => read.path), ['amount', 'rate']);
    });

    it('still knows a value the script wrote after its writes were reported', () => {
        const tracker = new PreviewReadTracker();
        const doc = tracker.track({ amount: 2 }, '#S');
        doc.temp = doc.amount + 1;
        assert.deepEqual(tracker.takeWrites().map((write) => write.path), ['temp']);
        assert.deepEqual(tracker.take().map((read) => read.path), ['amount']);
        doc.total = doc.temp * doc.rate;
        assert.deepEqual(tracker.take().map((read) => read.path), ['rate']);
        assert.deepEqual(tracker.takeWrites().map((write) => write.path), ['total']);
    });

    it('keeps the read of a group the script walked through to write into it', () => {
        const tracker = new PreviewReadTracker();
        const doc = tracker.track({ location: {}, items: [{}, {}] }, '#S');
        doc.location.lat = 1;
        assert.equal(doc.location.lat, 1);
        doc.items[0].total = 1;
        doc.items.push({ total: 2 });
        assert.deepEqual(tracker.take().map((read) => read.path), ['location', 'items']);
    });

    it('keeps the read of a list of numbers when the script writes another element', () => {
        const tracker = new PreviewReadTracker();
        const doc = tracker.track({ values: [] }, '#S');
        const value = doc.values[1];
        doc.values[0] = 1;
        assert.equal(value, undefined);
        assert.deepEqual(tracker.take().map((read) => read.path), ['values']);
        assert.deepEqual(tracker.takeWrites().map((write) => write.path), ['values.0']);
    });

    it('still records a read of another row or another document than the one written', () => {
        const tracker = new PreviewReadTracker();
        const doc = tracker.track({ items: [{ value: 1 }, {}] }, '#S');
        doc.items[0].value = 5;
        assert.equal(doc.items[1].value, undefined);
        assert.deepEqual(tracker.take().map((read) => read.path), ['items', 'items.value']);

        const documents = tracker.trackPolicyDocuments([
            { schema: '#S', document: { credentialSubject: [{}] } },
            { schema: '#S', document: { credentialSubject: [{}] } }
        ]);
        documents[0].document.credentialSubject[0].temp = 3;
        assert.equal(documents[1].document.credentialSubject[0].temp, undefined);
        assert.deepEqual(tracker.take(), [{ schema: '#S', path: 'temp' }]);
    });

    it('tracks the value returned for a field path as a part of the document', () => {
        const tracker = new PreviewReadTracker();
        const location = tracker.trackField({ lat: 1 }, 'location');
        assert.equal(location.lng, undefined);
        location.lat = 2;
        assert.equal(location.lat, 2);
        assert.equal(tracker.trackField(5, 'amount'), 5);
        assert.deepEqual(tracker.take().map((read) => read.path), ['location', 'location.lng', 'amount']);
        assert.deepEqual(tracker.takeWrites(), [{ schema: null, path: 'location.lat', document: null }]);
    });

    it('records the script place of every field getter call', () => {
        const script = "const a = getField('rate') || 0;\nconst key = 'rate';\nconst b = getField(key);\n['rate'].map(getField);";
        const tracker = new PreviewReadTracker();
        tracker.configure(script);
        runInNewContext(script, { getField: path => tracker.trackField(1, path) }, { filename: PREVIEW_SCRIPT_FILE });
        assert.deepEqual(tracker.takeSites().map((read) => [read.path, read.site, read.call]), [
            ['rate', -2, script.indexOf("getField('rate')")],
            ['rate', -2, script.indexOf('getField(key)')],
            ['rate', -2, -1]
        ]);
    });

    for (const separator of ['\n', '\r\n', '\r', '\u2028', '\u2029']) {
        it(`maps a getter call to its script place after the line break ${JSON.stringify(separator)}`, () => {
            const script = `const a = 1;${separator}const b = getField('rate');${separator}${separator}const c = getField('bonus');`;
            const tracker = new PreviewReadTracker();
            tracker.configure(script);
            runInNewContext(script, { getField: path => tracker.trackField(1, path) }, { filename: PREVIEW_SCRIPT_FILE });
            assert.deepEqual(tracker.takeSites().map((read) => [read.path, read.call]), [
                ['rate', script.indexOf("getField('rate')")],
                ['bonus', script.indexOf("getField('bonus')")]
            ]);
        });
    }

    it('uses the given schema for a policy document that has none', () => {
        const tracker = new PreviewReadTracker();
        const documents = tracker.trackPolicyDocuments([
            { document: { credentialSubject: [{ amount: 2 }] } },
            { schema: '#R', document: { credentialSubject: [{ rate: 3 }] } }
        ], ['#S', '#X']);
        assert.equal(documents[0].document.credentialSubject[0].amount + documents[1].document.credentialSubject[0].rate, 5);
        assert.deepEqual(tracker.take(), [
            { schema: '#S', path: 'amount' },
            { schema: '#R', path: 'rate' }
        ]);
    });

    it('returns the same proxy for the same object', () => {
        const tracker = new PreviewReadTracker();
        const doc = tracker.track({ location: { lat: 1 } }, null);
        assert.equal(doc.location, doc.location);
    });

    it('unwraps tracked values so they can be sent between threads', () => {
        const tracker = new PreviewReadTracker();
        const doc = tracker.track({ amount: 2, location: { lat: 1 } }, null);
        const result = { copy: doc.location, total: doc.amount };
        assert.throws(() => structuredClone(result));
        assert.deepEqual(structuredClone(tracker.unwrap(result)), { copy: { lat: 1 }, total: 2 });
        assert.deepEqual(structuredClone(tracker.unwrap(doc)), { amount: 2, location: { lat: 1 } });
    });

    it('tracks the credential subjects of policy documents with their schema', () => {
        const tracker = new PreviewReadTracker();
        const documents = tracker.trackPolicyDocuments([
            { schema: '#S', document: { credentialSubject: [{ amount: 2 }] } },
            { schema: '#R', document: { credentialSubject: { rate: 3 } } },
            { document: null }
        ]);
        assert.equal(documents[0].document.credentialSubject[0].amount, 2);
        assert.equal(documents[1].document.credentialSubject.rate, 3);
        assert.deepEqual(documents[2], { document: null });
        assert.deepEqual(tracker.take(), [
            { schema: '#S', path: 'amount' },
            { schema: '#R', path: 'rate' }
        ]);
    });

    it('passes primitives and non-lists through', () => {
        const tracker = new PreviewReadTracker();
        assert.equal(tracker.track(5, null), 5);
        assert.equal(tracker.trackPolicyDocuments(null), null);
        assert.equal(tracker.unwrap('text'), 'text');
    });

    it('ignores an empty path', () => {
        const tracker = new PreviewReadTracker();
        tracker.add('#S', '');
        assert.deepEqual(tracker.take(), []);
    });

    it('loads the inspector only when coverage starts', () => {
        const module = new URL('../../../dist/policy-engine/helpers/workers/preview-read-tracker.js', import.meta.url).href;
        const output = execFileSync(process.execPath, ['--input-type=module', '-e', [
            `const { PreviewReadTracker } = await import(${JSON.stringify(module)});`,
            "const loaded = () => process.moduleLoadList.includes('NativeModule inspector');",
            'const tracker = new PreviewReadTracker();',
            'const before = loaded();',
            'tracker.startCoverage();',
            'console.log(JSON.stringify([before, loaded()]));'
        ].join('\n')], { encoding: 'utf8' });
        assert.deepEqual(JSON.parse(output), [false, true]);
    });
});


describe('Preview result snapshots', () => {
    for (const expression of [
        'let calls = 0; ({ get total() { return ++calls; } })',
        'let calls = 0; new class { constructor() { Object.defineProperty(this, "total", { enumerable: true, get: () => ++calls }); } }'
    ]) {
        it(`materializes a VM getter once and preserves the original accessor: ${expression}`, () => {
            const tracker = new PreviewReadTracker();
            const source = runInNewContext(expression, { Object });
            const result = tracker.unwrap(source);
            assert.notEqual(result, source);
            assert.equal(structuredClone(result).total, 1);
            assert.equal(Object.getOwnPropertyDescriptor(result, 'total').get, undefined);
            assert.equal(typeof Object.getOwnPropertyDescriptor(source, 'total').get, 'function');
            assert.equal(source.total, 2);
            assert.equal(tracker.original(result), source);
        });
    }

    it('materializes nested VM accessors without changing the source graph', () => {
        const tracker = new PreviewReadTracker();
        const source = runInNewContext('let calls = 0; ({ row: { get total() { return ++calls; } } })');
        assert.equal(structuredClone(tracker.unwrap(source)).row.total, 1);
        assert.equal(source.row.total, 2);
    });

    for (const populated of [false, true]) {
        it(`preserves trailing empty array slots (${populated ? 'partly filled' : 'empty'})`, () => {
            const tracker = new PreviewReadTracker();
            const source = new Array(3);
            if (populated) source[0] = 5;
            const result = tracker.unwrap(source);
            assert.equal(result.length, 3);
            assert.equal(2 in result, false);
            assert.deepEqual(structuredClone(result), structuredClone(source));
            assert.equal(source.length, 3);
        });
    }

    it('preserves cycles, shared references and original document identity', () => {
        const tracker = new PreviewReadTracker();
        const [source] = tracker.trackPolicyDocuments([{ schema: '#S', document: { credentialSubject: [{ amount: 5 }] } }]);
        const result = { first: source, second: source };
        result.self = result;
        const snapshot = tracker.unwrap(result);
        assert.equal(snapshot.self, snapshot);
        assert.equal(snapshot.first, snapshot.second);
        assert.deepEqual(tracker.findSources(snapshot.first), [0]);
        assert.equal(tracker.original(snapshot.first.document.credentialSubject[0]), tracker.original(source.document.credentialSubject[0]));
        assert.doesNotThrow(() => structuredClone(snapshot));
    });

    it('copies an own __proto__ value without changing the snapshot prototype', () => {
        const tracker = new PreviewReadTracker();
        const source = JSON.parse('{"__proto__":{"value":5}}');
        const snapshot = tracker.unwrap(source);
        assert.equal(Object.getPrototypeOf(snapshot), Object.prototype);
        assert.equal(Object.hasOwn(snapshot, '__proto__'), true);
        assert.deepEqual(structuredClone(snapshot), source);
    });

    for (const [name, expression] of [
        ['date', 'new Date(0)'], ['regular expression', '/value/gi'], ['map', 'new Map([["a", 5]])'],
        ['set', 'new Set([5])'], ['typed array', 'new Uint8Array([1, 2])'],
        ['array buffer', 'new Uint8Array([1, 2]).buffer'], ['boxed number', 'Object(5)'],
        ['error', 'new Error("invalid value")']
    ]) {
        it(`keeps native structured-clone behavior for a VM ${name}`, () => {
            const tracker = new PreviewReadTracker();
            const source = runInNewContext(expression);
            assert.deepEqual(structuredClone(tracker.unwrap(source)), structuredClone(source));
        });
    }

    for (const expression of ['Promise.resolve(5)', 'new WeakMap()', 'new WeakSet()', 'new Proxy({}, {})', '(function* () {})()']) {
        it(`keeps the ordinary clone error for ${expression}`, () => {
            const tracker = new PreviewReadTracker();
            const source = runInNewContext(expression);
            assert.throws(() => structuredClone(source), { name: 'DataCloneError' });
            assert.throws(() => structuredClone(tracker.unwrap(source)), { name: 'DataCloneError' });
        });
    }
});
