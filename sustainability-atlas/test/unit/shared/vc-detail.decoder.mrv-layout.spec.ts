import { describe, expect, it } from '@jest/globals';
import { buildSchemaFieldOrder, detectMrvLayout } from '@shared/vc-detail/vc-detail.decoder';
import type { SchemaFieldOrderEntry } from '@shared/vc-detail/vc-detail.decoder';

/**
 * Covers the two pure pieces of MRV layout detection that the dMRV table's
 * column order and date-range filter depend on:
 *
 *  - column order must follow the schema author's declared field order, which
 *    `rawSchemaJson` cannot supply because it is a Postgres `jsonb` OBJECT and
 *    jsonb reorders object keys (shorter keys first, then lexicographic). The
 *    order is recovered from `policy.schemaFields`, a jsonb ARRAY.
 *  - the monitoring period's start vs end date columns must be told apart so the
 *    range filter can test for period OVERLAP rather than a single end date.
 */
describe('MRV layout detection', () => {
    const SCHEMA_UUID = 'aaaaaaaa-1111-2222-3333-bbbbbbbbbbbb';
    const SCHEMA_IRI = `#${SCHEMA_UUID}&1.0.0`;

    /**
     * Properties in the order Postgres hands them back after jsonb's key
     * reordering — deliberately NOT the schema's declared order, reproducing
     * exactly what the live UI was rendering (End -> Guardian Version -> Start).
     */
    const jsonbReorderedProps = {
        endDate: { type: 'string', format: 'date-time', title: 'End Timestamp for the dMRV data' },
        guardianVersion: { type: 'string', title: 'Guardian Version' },
        startDate: { type: 'string', format: 'date-time', title: 'Start Timestamp for the dMRV data' },
        readings: { type: 'array', items: { $ref: '#cccccccc-4444-5555-6666-dddddddddddd&1.0.0' } },
    };

    const rawSchemaJson = { [SCHEMA_IRI]: { name: 'dMRV', document: { properties: jsonbReorderedProps } } };

    /** The order-preserving array the worker stores at decode time. */
    const schemaFields: SchemaFieldOrderEntry[] = [
        { schemaIri: SCHEMA_IRI, path: 'startDate', title: 'Start Timestamp for the dMRV data' },
        { schemaIri: SCHEMA_IRI, path: 'endDate', title: 'End Timestamp for the dMRV data' },
        { schemaIri: SCHEMA_IRI, path: 'guardianVersion', title: 'Guardian Version' },
        { schemaIri: SCHEMA_IRI, path: 'readings', title: 'Readings' },
        // Nested/$ref-resolved descendants carry a DOTTED path and must be
        // ignored when ordering this schema's top-level columns.
        { schemaIri: SCHEMA_IRI, path: 'readings.deviceId', title: 'Device Id' },
    ];

    describe('buildSchemaFieldOrder', () => {
        it('maps only this schema\'s top-level fields to their declared positions', () => {
            const order = buildSchemaFieldOrder(schemaFields, SCHEMA_UUID);
            expect([...order.entries()]).toEqual([
                ['startDate', 0],
                ['endDate', 1],
                ['guardianVersion', 2],
                ['readings', 3],
            ]);
            expect(order.has('readings.deviceId')).toBe(false);
        });

        it('ignores entries belonging to a different schema', () => {
            const order = buildSchemaFieldOrder(
                [{ schemaIri: '#99999999-0000-0000-0000-000000000000&1.0.0', path: 'somethingElse' }],
                SCHEMA_UUID,
            );
            expect(order.size).toBe(0);
        });

        it('returns an empty map for null/malformed input rather than throwing', () => {
            expect(buildSchemaFieldOrder(null, SCHEMA_UUID).size).toBe(0);
            expect(buildSchemaFieldOrder(undefined, SCHEMA_UUID).size).toBe(0);
            expect(buildSchemaFieldOrder([null as never, 'nope' as never], SCHEMA_UUID).size).toBe(0);
        });
    });

    describe('detectMrvLayout column order', () => {
        it('orders columns by schema declaration order, not jsonb key order', () => {
            const layout = detectMrvLayout(rawSchemaJson, SCHEMA_UUID, schemaFields);
            // Arrays are never columns, so `readings` is excluded.
            expect(layout.columns.map(c => c.key)).toEqual(['startDate', 'endDate', 'guardianVersion']);
        });

        it('falls back to raw properties order when schemaFields is absent', () => {
            const layout = detectMrvLayout(rawSchemaJson, SCHEMA_UUID);
            expect(layout.columns.map(c => c.key)).toEqual(['endDate', 'guardianVersion', 'startDate']);
        });

        it('never drops a column that is missing from schemaFields', () => {
            const partial = schemaFields.filter(f => f.path !== 'guardianVersion');
            const layout = detectMrvLayout(rawSchemaJson, SCHEMA_UUID, partial);
            expect(layout.columns.map(c => c.key).sort()).toEqual(['endDate', 'guardianVersion', 'startDate']);
            // Unmatched fields sort after every matched one.
            expect(layout.columns.map(c => c.key)).toEqual(['startDate', 'endDate', 'guardianVersion']);
        });
    });

    describe('detectMrvLayout start/end date detection', () => {
        it('identifies the period start and end columns by title', () => {
            const layout = detectMrvLayout(rawSchemaJson, SCHEMA_UUID, schemaFields);
            expect(layout.startDateColumnKey).toBe('startDate');
            expect(layout.endDateColumnKey).toBe('endDate');
        });

        it('is unaffected by jsonb ordering putting the end date first', () => {
            const layout = detectMrvLayout(rawSchemaJson, SCHEMA_UUID);
            expect(layout.startDateColumnKey).toBe('startDate');
            expect(layout.endDateColumnKey).toBe('endDate');
        });

        it('leaves start/end null for a single-date schema so the filter stays single-column', () => {
            const oneDate = {
                [SCHEMA_IRI]: {
                    name: 'dMRV',
                    document: {
                        properties: {
                            readingDate: { type: 'string', format: 'date-time', title: 'Reading Date' },
                            note: { type: 'string', title: 'Note' },
                        },
                    },
                },
            };
            const layout = detectMrvLayout(oneDate, SCHEMA_UUID);
            expect(layout.dateColumnKey).toBe('readingDate');
            expect(layout.startDateColumnKey).toBeNull();
            expect(layout.endDateColumnKey).toBeNull();
        });

        it('falls back to schema order when neither title matches a start/end hint', () => {
            const ambiguous = {
                [SCHEMA_IRI]: {
                    name: 'dMRV',
                    document: {
                        properties: {
                            timestampTwo: { type: 'string', format: 'date-time', title: 'Timestamp 2' },
                            timestampOne: { type: 'string', format: 'date-time', title: 'Timestamp 1' },
                        },
                    },
                },
            };
            const order: SchemaFieldOrderEntry[] = [
                { schemaIri: SCHEMA_IRI, path: 'timestampOne' },
                { schemaIri: SCHEMA_IRI, path: 'timestampTwo' },
            ];
            const layout = detectMrvLayout(ambiguous, SCHEMA_UUID, order);
            expect(layout.startDateColumnKey).toBe('timestampOne');
            expect(layout.endDateColumnKey).toBe('timestampTwo');
        });
    });
});
