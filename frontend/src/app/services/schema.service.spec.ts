import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { SchemaService } from './schema.service';
import { AuthService } from './auth.service';
import { API_BASE_URL } from './api';

const SINGLE_URL = `${API_BASE_URL}/schema`;

describe('SchemaService single-schema resolution', () => {
    let service: SchemaService;
    let httpMock: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [
                SchemaService,
                { provide: AuthService, useValue: {} },
            ],
        });
        service = TestBed.inject(SchemaService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpMock.verify());

    it('getSchemaById GETs /schema/:id', () => {
        service.getSchemaById('s1').subscribe();
        const req = httpMock.expectOne(`${SINGLE_URL}/s1`);
        expect(req.request.method).toBe('GET');
        req.flush({ id: 's1' });
    });

    it('resolveSchemaById de-duplicates concurrent subscribers into a single request', () => {
        const results: any[] = [];
        service.resolveSchemaById('s1').subscribe((v) => results.push(v));
        service.resolveSchemaById('s1').subscribe((v) => results.push(v));
        const req = httpMock.expectOne(`${SINGLE_URL}/s1`);
        req.flush({ id: 's1', document: { x: 1 } });
        expect(results.length).toBe(2);
        expect(results[0]).toEqual(results[1]);
    });

    it('serves a cached result without a second request', () => {
        service.resolveSchemaById('s1').subscribe();
        httpMock.expectOne(`${SINGLE_URL}/s1`).flush({ id: 's1' });
        let got: any;
        service.resolveSchemaById('s1').subscribe((v) => (got = v));
        httpMock.expectNone(`${SINGLE_URL}/s1`);
        expect(got).toEqual({ id: 's1' } as any);
    });

    it('evicts a failed fetch so a later call retries', () => {
        let err: any;
        service.resolveSchemaById('s1').subscribe({ error: (e) => (err = e) });
        httpMock.expectOne(`${SINGLE_URL}/s1`).flush('boom', { status: 500, statusText: 'Server Error' });
        expect(err).toBeTruthy();
        service.resolveSchemaById('s1').subscribe();
        const retry = httpMock.expectOne(`${SINGLE_URL}/s1`);
        expect(retry.request.method).toBe('GET');
        retry.flush({ id: 's1' });
    });
});
