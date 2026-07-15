import { describe, expect, it } from '@jest/globals';
import {
    EXPORT_FIELD_CATALOG,
    EXPORT_FIELD_GROUPS,
    getExportFields,
    getExportFieldKeys,
    getDefaultSelectedFieldKeys,
    type ExportDataset,
} from '@shared/config/export-field-catalog';

const DATASETS: ExportDataset[] = ['credits', 'projects', 'methodologies', 'registries'];
const VALID_GROUPS = new Set(EXPORT_FIELD_GROUPS.map((g) => g.group));

describe('export field catalog', () => {
    it('defines all four datasets, each with at least one field', () => {
        for (const dataset of DATASETS) {
            expect(EXPORT_FIELD_CATALOG[dataset]).toBeDefined();
            expect(getExportFields(dataset).length).toBeGreaterThan(0);
        }
    });

    it.each(DATASETS)('has unique, snake_case field keys for "%s"', (dataset) => {
        const keys = getExportFieldKeys(dataset);
        expect(new Set(keys).size).toBe(keys.length); // no duplicates
        for (const key of keys) {
            expect(key).toMatch(/^[a-z0-9_]+$/); // snake_case public contract
        }
    });

    it.each(DATASETS)('assigns every "%s" field to a valid group', (dataset) => {
        for (const field of getExportFields(dataset)) {
            expect(VALID_GROUPS.has(field.group)).toBe(true);
            expect(typeof field.required).toBe('boolean');
            expect(typeof field.defaultSelected).toBe('boolean');
        }
    });

    it.each(DATASETS)('default-selected keys are a subset of all keys for "%s"', (dataset) => {
        const all = new Set(getExportFieldKeys(dataset));
        for (const key of getDefaultSelectedFieldKeys(dataset)) {
            expect(all.has(key)).toBe(true);
        }
    });

    it('flags source_system_id as opt-in (defaultSelected: false) wherever it appears', () => {
        for (const dataset of DATASETS) {
            const field = getExportFields(dataset).find((f) => f.key === 'source_system_id');
            if (field) expect(field.defaultSelected).toBe(false);
        }
    });

    it('keeps transaction_id and registry_record_id as distinct credit columns (Q2)', () => {
        const creditKeys = getExportFieldKeys('credits');
        expect(creditKeys).toContain('transaction_id');
        expect(creditKeys).toContain('registry_record_id');
        expect(creditKeys.filter((k) => k === 'transaction_id')).toHaveLength(1);
    });

    it('exposes the standardized ESG reporting fields on the credits dataset', () => {
        const creditKeys = new Set(getExportFieldKeys('credits'));
        for (const esg of ['emissions_reduced', 'reporting_year', 'mitigation_type', 'standard', 'vintage']) {
            expect(creditKeys.has(esg)).toBe(true);
        }
    });
});
