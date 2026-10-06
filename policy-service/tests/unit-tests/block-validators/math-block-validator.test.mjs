import { assert } from 'chai';
import { MathBlock } from '../../../dist/policy-engine/block-validators/blocks/math-block.js';

const tableColumns = [
    { name: 'Year', key: 'year' },
    { name: 'CO2', key: 'co2' }
];

const outputSchema = (columns) => ({
    iri: '#out',
    name: 'Out',
    contextURL: 'ctx',
    document: JSON.stringify({
        $id: '#out',
        title: 'Out',
        type: 'object',
        properties: {
            results: {
                title: 'results',
                description: 'Results',
                type: 'string',
                readOnly: false,
                $comment: JSON.stringify({ term: 'results', customType: 'table', tableColumns: columns })
            },
            total: {
                title: 'total',
                description: 'Total',
                type: 'number',
                readOnly: false,
                $comment: JSON.stringify({ term: 'total' })
            }
        },
        required: []
    })
});

const inputSchema = {
    iri: '#in',
    name: 'In',
    contextURL: 'ctx',
    document: JSON.stringify({
        $id: '#in',
        title: 'In',
        type: 'object',
        properties: {
            a: {
                title: 'a',
                description: 'A',
                type: 'number',
                readOnly: false,
                $comment: JSON.stringify({ term: 'a' })
            }
        },
        required: []
    })
};

class FakeValidator {
    constructor(columns = tableColumns) {
        this.errors = [];
        this.schema = outputSchema(columns);
    }
    addError(message) { this.errors.push(message); }
    async getArtifact() { return {}; }
    getErrorMessage(error) { return error?.message ?? String(error); }
    validateSchemaVariable(name, value, required) {
        return !value && required ? `Option "${name}" is not set` : null;
    }
    getSchema(iri) { return iri === '#in' ? inputSchema : this.schema; }
}

const ref = (output) => ({
    options: {
        inputSchema: '#in',
        outputSchema: '#out',
        expression: {
            variables: [{ type: 'link', name: 'y', description: '', field: 'a', schema: '#in' }],
            formulas: [],
            outputs: [{ type: 'link', name: '', description: '', field: 'results', schema: '#out', ...output }]
        }
    },
    children: []
});

describe('MathBlock.validate table outputs', () => {
    it('accepts grid cells and column bindings under declared columns', async () => {
        const cells = new FakeValidator();
        await MathBlock.validate(cells, ref({ rows: [{ year: 'y', co2: '' }] }));
        assert.deepEqual(cells.errors, []);

        const columns = new FakeValidator();
        await MathBlock.validate(columns, ref({ columns: { year: 'y' } }));
        assert.deepEqual(columns.errors, []);
    });

    it('rejects a grid cell under a column the schema does not declare', async () => {
        const validator = new FakeValidator();
        await MathBlock.validate(validator, ref({ rows: [{ yeer: 'y', co2: '' }] }));
        assert.deepEqual(validator.errors, ['Table output "results" has unknown columns: yeer']);
    });

    it('rejects a column binding the schema does not declare', async () => {
        const validator = new FakeValidator();
        await MathBlock.validate(validator, ref({ columns: { yeer: 'y', co2: '' } }));
        assert.deepEqual(validator.errors, ['Table output "results" has unknown columns: yeer']);
    });

    it('rejects a table output whose field declares no columns', async () => {
        const validator = new FakeValidator(null);
        await MathBlock.validate(validator, ref({ columns: { year: 'y' } }));
        assert.deepEqual(validator.errors, ['Table output "results" has no declared columns']);
    });

    it('does not check the columns of an ordinary output', async () => {
        const validator = new FakeValidator(null);
        await MathBlock.validate(validator, ref({ name: 'y', field: 'total' }));
        assert.deepEqual(validator.errors, []);
    });
});
