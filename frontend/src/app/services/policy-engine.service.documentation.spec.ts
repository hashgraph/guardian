import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { API_BASE_URL } from './api';
import { PolicyEngineService } from './policy-engine.service';

describe('PolicyEngineService.updatePolicyDocumentation', () => {
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

    it('puts only the entries to the documentation endpoint', () => {
        const entries = [{ alias: 'create', target: 't', method: 'POST' }];
        service.updatePolicyDocumentation('p1', entries).subscribe();
        const req = httpMock.expectOne(`${API_BASE_URL}/policies/p1/documentation`);
        expect(req.request.method).toBe('PUT');
        expect(req.request.body).toEqual({ entries });
        req.flush({});
    });
});
