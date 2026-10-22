import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { SILENT_HTTP_ERRORS } from '../constants';
import { API_BASE_URL } from './api';
import { ExternalPoliciesService } from './external-policy.service';

const URL = `${API_BASE_URL}/external-policies`;

describe('ExternalPoliciesService', () => {
    let service: ExternalPoliciesService;
    let httpMock: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [ExternalPoliciesService],
        });
        service = TestBed.inject(ExternalPoliciesService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpMock.verify());

    it('preview posts the messageId', () => {
        service.preview('msg-1').subscribe();
        const req = httpMock.expectOne(`${URL}/preview`);
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual({ messageId: 'msg-1' });
        req.flush({});
    });

    // The Search Policy dialog renders these failures inline; without the flag the global
    // interceptor toasts the identical message a second time.
    it('marks preview and import as handled inline', () => {
        service.preview('msg-1').subscribe();
        const preview = httpMock.expectOne(`${URL}/preview`);
        expect(preview.request.context.get(SILENT_HTTP_ERRORS)).toBeTrue();
        preview.flush({});

        service.import('msg-1').subscribe();
        const imported = httpMock.expectOne(`${URL}/import`);
        expect(imported.request.context.get(SILENT_HTTP_ERRORS)).toBeTrue();
        imported.flush({});
    });

    it('leaves other external-policy calls on the global toast', () => {
        service.approve('msg-1').subscribe();
        const req = httpMock.expectOne(`${URL}/msg-1/approve`);
        expect(req.request.context.get(SILENT_HTTP_ERRORS)).toBeFalse();
        req.flush({});
    });

    // The bulk actions list failures per row, so they opt out of the global toast.
    it('marks the bulk approve and reject calls as handled by the caller only when asked', () => {
        service.approveAction('msg-1').subscribe();
        const approve = httpMock.expectOne(`${URL}/requests/msg-1/approve`);
        expect(approve.request.method).toBe('PUT');
        expect(approve.request.context.get(SILENT_HTTP_ERRORS)).toBeFalse();
        approve.flush({});

        service.approveAction('msg-2', true).subscribe();
        const silentApprove = httpMock.expectOne(`${URL}/requests/msg-2/approve`);
        expect(silentApprove.request.context.get(SILENT_HTTP_ERRORS)).toBeTrue();
        silentApprove.flush({});

        service.rejectAction('msg-3', true).subscribe();
        const silentReject = httpMock.expectOne(`${URL}/requests/msg-3/reject`);
        expect(silentReject.request.context.get(SILENT_HTTP_ERRORS)).toBeTrue();
        silentReject.flush({});
    });

    it('sends the sort parameters of the incoming requests grid', () => {
        service.getActionRequests(0, 10, { sortField: 'createDate', sortDirection: 'asc' }).subscribe();
        const req = httpMock.expectOne((r) => r.url === `${URL}/requests`);
        expect(req.request.params.get('sortField')).toBe('createDate');
        expect(req.request.params.get('sortDirection')).toBe('asc');
        req.flush([]);
    });
});
