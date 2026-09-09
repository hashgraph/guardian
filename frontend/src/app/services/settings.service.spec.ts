import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from './api';
import { SettingsService } from './settings.service';

const ENVIRONMENT_URL = `${API_BASE_URL}/settings/environment`;

describe('SettingsService', () => {
    let service: SettingsService;
    let http: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [SettingsService]
        });
        service = TestBed.inject(SettingsService);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        http.verify();
    });

    it('caches the network after a successful lookup', () => {
        const values: string[] = [];
        service.getHederaNet().subscribe((res) => values.push(res));
        http.expectOne(ENVIRONMENT_URL).flush('testnet');

        service.getHederaNet().subscribe((res) => values.push(res));
        http.expectNone(ENVIRONMENT_URL);

        expect(values).toEqual(['testnet', 'testnet']);
    });

    it('retries after a failed lookup instead of replaying the error', () => {
        service.getHederaNet().subscribe({ error: () => { } });
        http.expectOne(ENVIRONMENT_URL)
            .flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

        let network = '';
        service.getHederaNet().subscribe((res) => network = res);
        http.expectOne(ENVIRONMENT_URL).flush('testnet');

        expect(network).toBe('testnet');
    });
});
