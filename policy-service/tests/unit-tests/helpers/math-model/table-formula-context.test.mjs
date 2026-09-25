import assert from 'node:assert/strict';
import {
    DocumentMap,
    FieldLink,
    MathContext,
    MathFormula
} from '../../../../dist/policy-engine/helpers/math-model/index.js';

const marker = (overrides = {}) => ({
    type: 'table',
    fileId: 'table-file',
    columnKeys: ['year', 'area.total', 'factor', 'device'],
    columnNames: ['Year', 'Area', 'Factor', 'Device'],
    ...overrides
});

const rows = [
    { year: '2020', 'area.total': '10', factor: '2', device: 'A' },
    { year: '2021', 'area.total': 'n/a', factor: '3', device: 'B' },
    { year: '2022', 'area.total': '30', factor: '4', device: 'C' },
    { year: '2023', 'area.total': '', factor: '1.5', device: 'D' },
    { year: '2024', 'area.total': '50', factor: '2', device: 'E' },
    { year: '2025', 'area.total': '60', factor: '0.5', device: 'F' }
];

const tablePack = {
    'table-file': {
        columnKeys: ['year', 'area.total', 'factor', 'device'],
        rows
    }
};

function link(name, path, schema = 'schema') {
    const item = new FieldLink(name, path);
    item.schema = schema;
    item.update();
    return item;
}

function formula(name, body) {
    const item = new MathFormula(name, body);
    item.update();
    return item;
}

function documentMap(document) {
    const documents = new DocumentMap();
    documents.addDocument({ schema: 'schema', document });
    return documents;
}

describe('MathContext Table columns', () => {
    it('sums a dotted-key column and reports numeric replacements', () => {
        const table = JSON.stringify(marker());
        const context = new MathContext([
            link('area', 'siteTable.area.total'),
            formula('total', '\\sum{\\operatorname{area}}')
        ]);

        const result = context.setDocument(documentMap({ siteTable: table }), tablePack);

        assert.equal(result.scope.total, 150);
        assert.deepEqual(result.scope.area, ['10', 'n/a', '30', '', '50', '60']);
        assert.deepEqual(context.getWarnings(), [
            'Table column "Area" replaced 2 nonnumeric cells with 0.'
        ]);
        assert.equal(JSON.parse(table).rows, undefined);
    });

    it('returns numbers and text from Table-only Lookup', () => {
        const context = new MathContext([
            link('area', 'siteTable.area.total'),
            link('year', 'siteTable.year'),
            link('device', 'siteTable.device'),
            formula('areaResult', '\\mathrm{Lookup}\\left(\\operatorname{area},\\operatorname{year},\\text{2024}\\right)'),
            formula('combinedResult', '\\mathrm{Lookup}\\left(\\operatorname{area},\\operatorname{year},\\text{2020}\\right) + \\mathrm{Lookup}\\left(\\operatorname{area},\\operatorname{year},\\text{2024}\\right)'),
            formula('deviceResult', '\\mathrm{Lookup}\\left(\\operatorname{device},\\operatorname{year},\\text{2021}\\right)')
        ]);

        const result = context.setDocument(
            documentMap({ siteTable: JSON.stringify(marker()) }),
            tablePack
        );

        assert.equal(result.scope.areaResult, 50);
        assert.equal(result.scope.combinedResult, 60);
        assert.equal(result.scope.deviceResult, 'B');
        assert.deepEqual(context.getWarnings(), []);
    });

    it('uses numeric Table values through At without losing row alignment', () => {
        const context = new MathContext([
            link('area', 'siteTable.area.total'),
            link('factor', 'siteTable.factor'),
            formula(
                'total',
                '\\sum_{i=1}^{\\operatorname{Length}\\left(\\operatorname{area}\\right)} '
                + '\\operatorname{At}\\left(\\operatorname{area},i\\right) '
                + '\\cdot \\operatorname{At}\\left(\\operatorname{factor},i\\right)'
            )
        ]);

        const result = context.setDocument(
            documentMap({ siteTable: JSON.stringify(marker()) }),
            tablePack
        );

        assert.equal(result.scope.total, 270);
        assert.equal(result.scope.area.length, 6);
        assert.deepEqual(context.getWarnings(), [
            'Table column "Area" replaced 2 nonnumeric cells with 0.'
        ]);
    });

    it('keeps every tested non-Table result after a Table column is added', () => {
        const run = (withTableColumn) => {
            const items = [
                link('ordinary', 'ordinary'),
                link('ordinaryKeys', 'ordinaryKeys'),
                link('ordinaryText', 'ordinaryText'),
                formula('total', '\\sum{\\operatorname{ordinary}}'),
                formula(
                    'indexedTotal',
                    '\\sum_{i=1}^{2} \\operatorname{At}\\left(\\operatorname{ordinary},i\\right)'
                ),
                formula('selected', '\\operatorname{At}\\left(\\operatorname{ordinary},2\\right)'),
                formula('matched', '\\mathrm{Lookup}\\left(\\operatorname{ordinary},\\operatorname{ordinaryKeys},\\text{b}\\right)'),
                formula('missing', '\\mathrm{Lookup}\\left(\\operatorname{ordinary},\\operatorname{ordinaryKeys},\\text{z}\\right)'),
                formula('textValue', '\\mathrm{Lookup}\\left(\\operatorname{ordinaryText},\\operatorname{ordinaryKeys},\\text{b}\\right)')
            ];
            if (withTableColumn) {
                items.unshift(link('year', 'siteTable.year'));
            }
            const context = new MathContext(items);
            const result = context.setDocument(documentMap({
                siteTable: JSON.stringify(marker()),
                ordinary: [4, 5],
                ordinaryKeys: ['a', 'b'],
                ordinaryText: ['x', 'y']
            }), tablePack);
            return {
                values: {
                    total: result.scope.total,
                    indexedTotal: result.scope.indexedTotal,
                    selected: result.scope.selected,
                    matched: result.scope.matched,
                    missing: result.scope.missing,
                    textValue: result.scope.textValue
                },
                warnings: context.getWarnings()
            };
        };

        const withoutTable = run(false);
        const withTable = run(true);

        assert.deepEqual(withoutTable.values, {
            total: 9,
            indexedTotal: 9,
            selected: 5,
            matched: 5,
            missing: 0,
            textValue: 0
        });
        assert.deepEqual(withTable, withoutTable);
        assert.deepEqual(withTable.warnings, []);
    });

    it('leaves a Table without declared columns on the old path', () => {
        const stored = JSON.stringify({ type: 'table', fileId: 'legacy-file' });
        const context = new MathContext([link('legacy', 'siteTable')]);

        const result = context.setDocument(documentMap({ siteTable: stored }), {
            'legacy-file': { columnKeys: ['Year'], rows: [{ Year: '2020' }] }
        });

        assert.equal(result.scope.legacy, stored);
        assert.deepEqual(context.getWarnings(), []);
    });

    it('rejects a declared column when its packed rows are missing', () => {
        const context = new MathContext([link('area', 'siteTable.area.total')]);

        assert.throws(
            () => context.setDocument(
                documentMap({ siteTable: JSON.stringify(marker()) }),
                {}
            ),
            /Table column "Area" data is unavailable/
        );
    });

    it('rejects a declared column above the shared row limit', () => {
        const context = new MathContext([link('area', 'siteTable.area.total')]);
        const largeRows = Array.from({ length: 10001 }, (_, index) => ({
            'area.total': String(index)
        }));

        assert.throws(
            () => context.setDocument(
                documentMap({ siteTable: JSON.stringify(marker()) }),
                {
                    'table-file': {
                        columnKeys: ['area.total'],
                        rows: largeRows
                    }
                }
            ),
            /Table column "Area" has 10001 rows; General formulas are limited to 10000/
        );
    });
});
