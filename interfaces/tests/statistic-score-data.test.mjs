import assert from 'node:assert/strict';
import { ScoreData } from '../dist/validators/statistic-validator/score.js';
import { VariableData } from '../dist/validators/statistic-validator/variables.js';

const options = [
    { description: 'Low', value: 1 },
    { description: 'High', value: 2 },
    { description: 'Zero', value: 0 },
];

describe('ScoreData constructor', () => {
    it('copies id, type and description', () => {
        const s = new ScoreData({ id: 's1', type: 't', description: 'd' });
        assert.equal(s.id, 's1');
        assert.equal(s.type, 't');
        assert.equal(s.description, 'd');
    });

    it('defaults relationships and options to empty arrays', () => {
        const s = new ScoreData({ id: 's1' });
        assert.deepEqual(s.relationships, []);
        assert.deepEqual(s.options, []);
    });
});

describe('ScoreData.setRelationships', () => {
    it('maps relationship ids to variable instances and drops unknown ids', () => {
        const v1 = new VariableData({ id: 'v1' });
        const v2 = new VariableData({ id: 'v2' });
        const s = new ScoreData({ id: 's1', relationships: ['v2', 'missing'] });
        s.setRelationships([v1, v2]);
        assert.deepEqual(s._relationships, [v2]);
    });

    it('sets _relationships to [] when variables is not an array', () => {
        const s = new ScoreData({ id: 's1', relationships: ['v1'] });
        s.setRelationships(null);
        assert.deepEqual(s._relationships, []);
    });

    it('builds _options entries with generated ids', () => {
        const s = new ScoreData({ id: 's1', options });
        s.setRelationships([]);
        assert.equal(s._options.length, 3);
        assert.equal(s._options[0].description, 'Low');
        assert.equal(s._options[0].value, 1);
        assert.match(s._options[0].id, /^[0-9a-f-]{36}$/i);
    });

    it('generates a distinct id per option', () => {
        const s = new ScoreData({ id: 's1', options });
        s.setRelationships([]);
        const ids = new Set(s._options.map((o) => o.id));
        assert.equal(ids.size, 3);
    });

    it('sets _options to [] when options is not an array', () => {
        const s = new ScoreData({ id: 's1', options: { not: 'array' } });
        s.setRelationships([]);
        assert.deepEqual(s._options, []);
    });
});

describe('ScoreData value mapping', () => {
    it('setValue maps an option description to its value', () => {
        const s = new ScoreData({ id: 's1', options });
        s.setValue('High');
        assert.equal(s.value, 2);
    });

    it('setValue keeps the raw value when no option matches', () => {
        const s = new ScoreData({ id: 's1', options });
        s.setValue('Unknown');
        assert.equal(s.value, 'Unknown');
    });

    it('setValue falls back to the raw input when the matched option value is falsy', () => {
        const s = new ScoreData({ id: 's1', options });
        s.setValue('Zero');
        assert.equal(s.value, 'Zero');
    });

    it('getValue maps the stored value back to its description', () => {
        const s = new ScoreData({ id: 's1', options });
        s.setValue('Low');
        assert.equal(s.getValue(), 'Low');
    });

    it('getValue stringifies a value without a matching option', () => {
        const s = new ScoreData({ id: 's1', options });
        s.value = 42;
        assert.equal(s.getValue(), '42');
    });
});

describe('ScoreData.validate', () => {
    it('is true when the stored value equals the argument and matches an option', () => {
        const s = new ScoreData({ id: 's1', options });
        s.setValue('Low');
        assert.equal(s.validate(1), true);
    });

    it('is false when the stored value differs from the argument', () => {
        const s = new ScoreData({ id: 's1', options });
        s.setValue('Low');
        assert.equal(s.validate(2), false);
    });

    it('is false when the value matches but is not a known option', () => {
        const s = new ScoreData({ id: 's1', options });
        s.value = 99;
        assert.equal(s.validate(99), false);
    });
});

describe('ScoreData.from', () => {
    it('maps an array of configs to instances', () => {
        const list = ScoreData.from([{ id: 'a' }, { id: 'b' }]);
        assert.equal(list.length, 2);
        assert.ok(list[0] instanceof ScoreData);
        assert.equal(list[1].id, 'b');
    });

    it('returns [] for a non-array', () => {
        assert.deepEqual(ScoreData.from(undefined), []);
        assert.deepEqual(ScoreData.from({}), []);
    });
});
