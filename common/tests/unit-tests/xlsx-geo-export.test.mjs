import assert from 'node:assert/strict';
import { JsonToXlsx } from '../../dist/xlsx/json-to-xlsx.js';
import { XlsxToJson } from '../../dist/xlsx/xlsx-to-json.js';
import { Dictionary, FieldTypes } from '../../dist/xlsx/models/dictionary.js';

function sheet() {
    const cells = new Map();
    return {
        cells,
        getCell(col, row) {
            const key = `${col}:${row}`;
            const cell = {
                setValue(value) {
                    cells.set(key, value);
                    return cell;
                },
                setStyle() {
                    return cell;
                },
                setFormat() {
                    return cell;
                },
                setLink() {
                    return cell;
                },
                setList2() {
                    return cell;
                }
            };
            return cell;
        },
        getPath(col, row) {
            return `${col}${row}`;
        },
        getFullPath(col, row) {
            return `TestGeo!${col}${row}`;
        }
    };
}

const table = {
    fieldHeaders: [],
    fieldItemStyle: null,
    subItemStyle: null,
    paramStyle: null,
    getCol(name) {
        return name;
    },
    hasCol() {
        return true;
    }
};

function writeCountry(dependency) {
    const worksheet = sheet();
    const field = {
        name: 'field_2',
        description: 'Country',
        type: 'string',
        format: undefined,
        pattern: undefined,
        isRef: false,
        unit: undefined,
        unitSystem: undefined,
        customType: 'country',
        examples: ['US'],
        dependency
    };
    JsonToXlsx.writeField(
        worksheet, table, field, new Map(), new Map(), new Map(), 6, new Map()
    );
    return worksheet.cells;
}

describe('Geographic fields on export', () => {
    it('writes the type name, the parent key and the display name', () => {
        const cells = writeCountry({ on: 'field_1', kind: 'geo' });

        assert.equal(cells.get(`${Dictionary.FIELD_TYPE}:6`), 'Country');
        assert.equal(cells.get(`${Dictionary.PARAMETER}:6`), 'field_1');
        assert.equal(cells.get(`${Dictionary.ANSWER}:6`), 'United States');
    });

    it('leaves the shared Parameter cell alone for a dependency of another kind', () => {
        const cells = writeCountry({ on: 'field_1', kind: 'time' });

        assert.equal(cells.get(`${Dictionary.PARAMETER}:6`), '');
    });

    it('leaves the Parameter cell empty when there is no dependency', () => {
        const cells = writeCountry(null);

        assert.equal(cells.get(`${Dictionary.PARAMETER}:6`), '');
    });

    it('round-trips: what export writes is what import resolves back', () => {
        const cells = writeCountry({ on: 'field_1', kind: 'geo' });
        const parameter = cells.get(`${Dictionary.PARAMETER}:6`);
        const answer = cells.get(`${Dictionary.ANSWER}:6`);

        const level = [
            {
                name: 'field_1',
                description: 'Continent',
                customType: 'continent',
                order: 5,
                dependency: null
            },
            {
                name: 'field_2',
                description: 'Country',
                customType: 'country',
                order: 6,
                dependency: { on: parameter, kind: 'geo' }
            }
        ];
        XlsxToJson.resolveGeoDependencies(
            { name: 'TestGeo', getPath: (c, r) => `${c}${r}` },
            table,
            level,
            { addError() { throw new Error('unexpected error'); } }
        );

        assert.deepEqual(level[1].dependency, { on: 'field_1', kind: 'geo' });
        assert.equal(FieldTypes.findByName('Country').pars(answer), 'US');
    });
});
