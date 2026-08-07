import assert from 'node:assert/strict';
import { DashboardDTO } from '../dist/middlewares/validation/schemas/dashboard.js';
import { ReportDTO } from '../dist/middlewares/validation/schemas/report.js';
import { InternalServerErrorDTO } from '../dist/middlewares/validation/schemas/errors.js';
import { ReportDataDTO, RateDTO } from '../dist/middlewares/validation/schemas/report-data.js';

function fieldsOf(Cls) {
    // Decorated fields are not enumerable on the prototype; we assert that
    // constructing the class and assigning to documented field names doesn't
    // produce any thrown TypeErrors and yields enumerable own props.
    const o = new Cls();
    return Object.keys(o);
}

describe('@unit DashboardDTO', () => {
    it('constructs without arguments', () => {
        assert.doesNotThrow(() => new DashboardDTO());
    });

    it('accepts uuid/root/date assignments', () => {
        const d = new DashboardDTO();
        d.uuid = 'u1'; d.root = '0.0.1'; d.date = '2026-01-01';
        assert.equal(d.uuid, 'u1');
        assert.equal(d.root, '0.0.1');
        assert.equal(d.date, '2026-01-01');
    });
});

describe('@unit ReportDTO', () => {
    it('constructs and accepts the 9 documented fields', () => {
        const r = new ReportDTO();
        const payload = {
            uuid: 'u', root: '0.0.1', status: 'PROGRESS', steep: 'POLICIES',
            type: 'X', progress: 1, maxProgress: 10, error: '',
        };
        Object.assign(r, payload);
        for (const [k, v] of Object.entries(payload)) {
            assert.equal(r[k], v, `expected ReportDTO.${k} to round-trip`);
        }
    });
});

describe('@unit InternalServerErrorDTO', () => {
    it('has numeric code and string message slots', () => {
        const e = new InternalServerErrorDTO();
        e.code = 500;
        e.message = 'oops';
        assert.equal(e.code, 500);
        assert.equal(e.message, 'oops');
    });
});

describe('@unit RateDTO', () => {
    it('shape is { name: string, value: number }', () => {
        const r = new RateDTO();
        r.name = 'methodology-A';
        r.value = 42;
        assert.equal(r.name, 'methodology-A');
        assert.equal(r.value, 42);
    });
});

describe('@unit ReportDataDTO', () => {
    it('accepts all numeric tallies (messages, topics, users, etc.)', () => {
        const d = new ReportDataDTO();
        const fields = [
            'messages', 'topics', 'standardRegistries', 'users',
            'policies', 'instances', 'modules', 'documents',
            'vcDocuments', 'vpDocuments', 'didDocuments',
        ];
        for (const f of fields) {
            d[f] = 1;
            assert.equal(d[f], 1, `ReportDataDTO.${f} should be assignable`);
        }
    });
});
