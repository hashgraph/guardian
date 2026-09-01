import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { AppComponent } from './app.component';
import { AuthStateService } from './services/auth-state.service';
import { BrandingService } from './services/branding.service';
import { WebSocketService } from './services/web-socket.service';

describe('AppComponent', () => {
    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [
                RouterTestingModule
            ],
            declarations: [
                AppComponent
            ],
            providers: [
                { provide: AuthStateService, useValue: { value: of(false) } },
                { provide: WebSocketService, useValue: {} },
                { provide: BrandingService, useValue: { loadBrandingData: () => undefined } },
            ],
            schemas: [NO_ERRORS_SCHEMA],
        }).compileComponents();
    });

    it('should create the app', () => {
        const fixture = TestBed.createComponent(AppComponent);
        const app = fixture.componentInstance;
        expect(app).toBeTruthy();
    });

    it(`should have as title 'guardian'`, () => {
        const fixture = TestBed.createComponent(AppComponent);
        const app = fixture.componentInstance;
        expect(app.title).toEqual('guardian');
    });
});
