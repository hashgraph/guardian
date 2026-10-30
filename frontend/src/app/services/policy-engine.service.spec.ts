import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from './api';
import { PolicyEngineService } from './policy-engine.service';

const URL = `${API_BASE_URL}/policies`;

describe('PolicyEngineService', () => {
    let service: PolicyEngineService;
    let httpMock: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [PolicyEngineService],
        });
        service = TestBed.inject(PolicyEngineService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpMock.verify());

    describe('page', () => {
        it('requests API version 2 with paging and tab type', () => {
            service.page(2, 20, 'local').subscribe();
            const req = httpMock.expectOne((r) => r.url === URL);
            expect(req.request.method).toBe('GET');
            expect(req.request.headers.get('Api-Version')).toBe('2');
            expect(req.request.params.get('pageIndex')).toBe('2');
            expect(req.request.params.get('pageSize')).toBe('20');
            expect(req.request.params.get('type')).toBe('local');
            req.flush([]);
        });

        it('sends selected statuses as a comma-separated status parameter', () => {
            service.page(0, 10, 'local', ['DRAFT', 'PUBLISH']).subscribe();
            const req = httpMock.expectOne((r) => r.url === URL);
            expect(req.request.params.get('status')).toBe('DRAFT,PUBLISH');
            req.flush([]);
        });

        it('omits the status parameter when no status is selected', () => {
            service.page(0, 10, 'remote', []).subscribe();
            const req = httpMock.expectOne((r) => r.url === URL);
            expect(req.request.params.has('status')).toBeFalse();
            req.flush([]);
        });

        it('keeps the v2 header when called without status', () => {
            service.page(0, 100).subscribe();
            const req = httpMock.expectOne((r) => r.url === URL);
            expect(req.request.headers.get('Api-Version')).toBe('2');
            expect(req.request.params.has('status')).toBeFalse();
            req.flush([]);
        });
    });
});
