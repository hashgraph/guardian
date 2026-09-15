import { TestBed } from '@angular/core/testing';
import { TablePersistenceService } from './table-persistence.service';
import { ArtifactService } from './artifact.service';
import { IPFSService } from './ipfs.service';
import { IndexedDbRegistryService } from './indexed-db-registry.service';
import { GzipService } from './gzip.service';

describe('TablePersistenceService', () => {
    let service: TablePersistenceService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                TablePersistenceService,
                { provide: ArtifactService, useValue: {} },
                { provide: IPFSService, useValue: {} },
                { provide: IndexedDbRegistryService, useValue: {} },
                { provide: GzipService, useValue: {} },
            ],
        });
        service = TestBed.inject(TablePersistenceService);
    });

    const persist = async (value: string): Promise<string> => {
        const document: Record<string, unknown> = { field0: value };
        await service.persistTablesInDocument(document, false);
        return String(document['field0']);
    };

    it('keeps the column keys and names in the compact value', async () => {
        const result = await persist(
            JSON.stringify({
                type: 'table',
                fileId: 'f1',
                cid: 'c1',
                columnKeys: ['year', 'co2_tonnes'],
                columnNames: ['Year', 'CO2 (tonnes)'],
            })
        );

        expect(JSON.parse(result)).toEqual({
            type: 'table',
            fileId: 'f1',
            cid: 'c1',
            columnKeys: ['year', 'co2_tonnes'],
            columnNames: ['Year', 'CO2 (tonnes)'],
        });
    });

    it('leaves a value with no column keys exactly as it is today', async () => {
        const result = await persist(JSON.stringify({ type: 'table', fileId: 'f1', cid: 'c1' }));

        expect(JSON.parse(result)).toEqual({ type: 'table', fileId: 'f1', cid: 'c1' });
    });

    it('writes neither list for empty arrays', async () => {
        const result = await persist(
            JSON.stringify({ type: 'table', fileId: 'f1', cid: 'c1', columnKeys: [], columnNames: [] })
        );

        const parsed = JSON.parse(result);

        expect('columnKeys' in parsed).toBeFalse();
        expect('columnNames' in parsed).toBeFalse();
    });

    it('writes neither list when the value carries keys but no names', async () => {
        const result = await persist(
            JSON.stringify({ type: 'table', fileId: 'f1', cid: 'c1', columnKeys: ['C1', 'C2'] })
        );

        const parsed = JSON.parse(result);

        expect('columnKeys' in parsed).toBeFalse();
        expect('columnNames' in parsed).toBeFalse();
    });

    it('leaves a value that is not a table alone', async () => {
        const result = await persist(JSON.stringify({ type: 'geo', fileId: 'f1' }));

        expect(JSON.parse(result)).toEqual({ type: 'geo', fileId: 'f1' });
    });
});
