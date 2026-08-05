import assert from 'node:assert/strict';
import { XlsxToJson } from '../../dist/xlsx/xlsx-to-json.js';

const worksheet = { name: 'TestGeo' };

function collector() {
    const errors = [];
    return {
        errors,
        addError(error) {
            errors.push(error);
        }
    };
}

function field(name, description, customType, parameter, order) {
    return {
        name,
        description,
        customType,
        order,
        dependency: parameter ? { on: parameter, kind: 'geo' } : null
    };
}

function chain(countryParameter, stateParameter) {
    return [
        field('field_1', 'Continent', 'continent', null, 5),
        field('field_2', 'Country', 'country', countryParameter, 6),
        field('field_3', 'State', 'state', stateParameter, 7)
    ];
}

describe('resolveGeoDependencies', () => {
    it('resolves a parent named by its key', () => {
        const level = chain('field_1', 'field_2');
        const result = collector();
        XlsxToJson.resolveGeoDependencies(worksheet, level, result);

        assert.deepEqual(level[1].dependency, { on: 'field_1', kind: 'geo' });
        assert.deepEqual(level[2].dependency, { on: 'field_2', kind: 'geo' });
        assert.equal(result.errors.length, 0);
    });

    it('resolves a parent named by its description, ignoring case and spaces', () => {
        const level = chain('  cOnTiNeNt  ', 'Country');
        const result = collector();
        XlsxToJson.resolveGeoDependencies(worksheet, level, result);

        assert.deepEqual(level[1].dependency, { on: 'field_1', kind: 'geo' });
        assert.deepEqual(level[2].dependency, { on: 'field_2', kind: 'geo' });
        assert.equal(result.errors.length, 0);
    });

    it('leaves an empty Parameter unlinked and unreported', () => {
        const level = chain(null, null);
        const result = collector();
        XlsxToJson.resolveGeoDependencies(worksheet, level, result);

        assert.equal(level[1].dependency, null);
        assert.equal(level[2].dependency, null);
        assert.equal(result.errors.length, 0);
    });

    it('clears and reports a reference that matches no field at this level', () => {
        const level = chain('field_99', 'field_2');
        const result = collector();
        XlsxToJson.resolveGeoDependencies(worksheet, level, result);

        assert.equal(level[1].dependency, null);
        assert.deepEqual(level[2].dependency, { on: 'field_2', kind: 'geo' });
        assert.equal(result.errors.length, 1);
        assert.equal(result.errors[0].text, 'Field "field_99" not found.');
        assert.equal(result.errors[0].worksheet, 'TestGeo');
        assert.equal(result.errors[0].row, 6);
    });

    it('clears and reports a parent of the wrong type', () => {
        const level = chain('field_3', null);
        const result = collector();
        XlsxToJson.resolveGeoDependencies(worksheet, level, result);

        assert.equal(level[1].dependency, null);
        assert.equal(result.errors.length, 1);
        assert.equal(result.errors[0].text, '"State" is not a valid parent for "Country".');
        assert.equal(result.errors[0].row, 6);
    });
});
