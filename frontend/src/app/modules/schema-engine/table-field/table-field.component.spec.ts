import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DialogService } from 'primeng/dynamicdialog';
import { TableFieldComponent } from './table-field.component';
import { CsvService } from '../../../services/csv.service';
import { ArtifactService } from '../../../services/artifact.service';
import { IndexedDbRegistryService } from '../../../services/indexed-db-registry.service';
import { GzipService } from '../../../services/gzip.service';
import { IPFSService } from '../../../services/ipfs.service';

describe('TableFieldComponent', () => {
    const declared = [
        { name: 'Year', key: 'year' },
        { name: 'CO2 (tonnes)', key: 'co2_tonnes' },
    ];

    const build = (): TableFieldComponent => {
        TestBed.resetTestingModule();
        TestBed.configureTestingModule({
            declarations: [TableFieldComponent],
            providers: [
                { provide: DialogService, useValue: {} },
                { provide: CsvService, useValue: {} },
                { provide: ArtifactService, useValue: {} },
                { provide: IndexedDbRegistryService, useValue: { registerStores: () => Promise.resolve() } },
                { provide: GzipService, useValue: {} },
                { provide: IPFSService, useValue: {} },
            ],
            schemas: [CUSTOM_ELEMENTS_SCHEMA],
        });

        return TestBed.createComponent(TableFieldComponent).componentInstance;
    };

    it('reads the declared columns off the item field', () => {
        const component = build();
        component.item = { name: 'field4', field: { tableColumns: declared } } as any;

        expect(component.hasDeclaredColumns).toBeTrue();
        expect(component.previewHeaderNameFor('co2_tonnes', 1)).toBe('CO2 (tonnes)');
    });

    it('falls back to the spread copy when the field object carries none', () => {
        const component = build();
        component.item = { name: 'field4', tableColumns: declared, field: {} } as any;

        expect(component.hasDeclaredColumns).toBeTrue();
    });

    it('has none for an array element handed in without an owner field', () => {
        const component = build();
        component.item = { name: 'field4', index: '0' } as any;

        expect(component.hasDeclaredColumns).toBeFalse();
    });

    it('takes them from ownerField for an array element', () => {
        const component = build();
        component.item = { name: 'field4', index: '0' } as any;
        component.ownerField = { tableColumns: declared } as any;

        expect(component.hasDeclaredColumns).toBeTrue();
        expect(component.previewHeaderNameFor('year', 0)).toBe('Year');
    });

    it('has none when nothing declares columns', () => {
        const component = build();
        component.item = { name: 'field4', field: {} } as any;

        expect(component.hasDeclaredColumns).toBeFalse();
        expect(component.previewHeaderNameFor('C1', 0)).toBe('A');
    });

    it('falls back to spreadsheet letters for a value that carries keys but no names', () => {
        const component = build();
        component.item = {
            name: 'field4',
            field: {},
            control: { value: JSON.stringify({ type: 'table', columnKeys: ['C1', 'C2'], rows: [] }) },
        } as any;

        expect(component.previewHeaderNameFor('C1', 0)).toBe('A');
        expect(component.previewHeaderNameFor('C2', 1)).toBe('B');
    });

    it('uses the stored names when the value carries them', () => {
        const component = build();
        component.item = {
            name: 'field4',
            field: {},
            control: {
                value: JSON.stringify({
                    type: 'table',
                    columnKeys: ['year', 'co2_tonnes'],
                    columnNames: ['Year', 'CO2 (tonnes)'],
                    rows: [],
                }),
            },
        } as any;

        expect(component.previewHeaderNameFor('year', 0)).toBe('Year');
        expect(component.previewHeaderNameFor('co2_tonnes', 1)).toBe('CO2 (tonnes)');
    });

    it('names a downloaded file after the type and the moment', () => {
        const component = build();
        component.item = { name: 'field4', field: {} } as any;

        expect((component as any).makeDownloadFileName()).toMatch(/^table-\d+\.csv$/);
    });

    it('shows blank preview rows only when columns are declared', () => {
        const withColumns = build();
        withColumns.item = { name: 'field4', field: { tableColumns: declared } } as any;

        expect(withColumns.previewHeaderKeysLimited).toEqual(['year', 'co2_tonnes']);
        expect(withColumns.previewRowsLimited.length).toBe(4);
        expect(withColumns.previewRowsLimited[0]).toEqual({ year: '', co2_tonnes: '' });
        expect(withColumns.previewRowsLimited).toBe(withColumns.previewRowsLimited);

        const without = build();
        without.item = { name: 'field4', field: {} } as any;

        expect(without.previewHeaderKeysLimited).toEqual([]);
        expect(without.previewRowsLimited).toEqual([]);
    });
});
