import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { GeoJsonFeatureCounter, KmlFeatureCounter } from '../../../dist/policy-engine/helpers/geo-file-counter.js';
const cases = JSON.parse(readFileSync(new URL('./fixtures/geo-counts/cases.json', import.meta.url), 'utf8'));
describe('file feature and vertex counts', () => {
    for (const fixture of cases) for (const size of [1, 7, fixture.text.length]) {
        it(`counts ${fixture.name} in chunks of ${size}`, () => {
            const counter = fixture.text.startsWith('<') ? new KmlFeatureCounter() : new GeoJsonFeatureCounter();
            for (let i = 0; i < fixture.text.length; i += size) counter.write(fixture.text.slice(i, i + size));
            assert.deepEqual(counter.finish(), fixture.expected);
        });
    }
});
