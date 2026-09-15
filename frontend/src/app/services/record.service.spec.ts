import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from './api';
import { RecordService } from './record.service';

describe('RecordService recording lifecycle', () => {
    let service: RecordService;
    let http: HttpTestingController;
    const url = `${API_BASE_URL}/record/policy-1/recording`;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [RecordService],
        });
        service = TestBed.inject(RecordService);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    it('posts pause to the pause route', () => {
        let result = false;
        service.pauseRecording('policy-1').subscribe((value) => result = value);
        const request = http.expectOne(`${url}/pause`);
        expect(request.request.method).toBe('POST');
        expect(request.request.body).toBeNull();
        request.flush(true);
        expect(result).toBeTrue();
    });

    it('posts resume to the resume route', () => {
        let result = false;
        service.resumeRecording('policy-1').subscribe((value) => result = value);
        const request = http.expectOne(`${url}/resume`);
        expect(request.request.method).toBe('POST');
        expect(request.request.body).toBeNull();
        request.flush(true);
        expect(result).toBeTrue();
    });

    it('keeps stop on the existing binary route and body', () => {
        const options = { policyTest: { name: 'Record' } };
        let resultLength = 0;
        service.stopRecording('policy-1', options).subscribe((value) => resultLength = value.byteLength);
        const request = http.expectOne(`${url}/stop`);
        expect(request.request.method).toBe('POST');
        expect(request.request.body).toEqual(options);
        expect(request.request.responseType).toBe('arraybuffer');
        request.flush(new ArrayBuffer(2));
        expect(resultLength).toBe(2);
    });
});
