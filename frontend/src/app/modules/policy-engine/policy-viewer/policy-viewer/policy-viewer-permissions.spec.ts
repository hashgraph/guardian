import { TestBed } from '@angular/core/testing';
import { PolicyViewerComponent } from './policy-viewer.component';
import { FormTakeoverService } from '../form-takeover/form-takeover.service';

// The template reads `permissions.STANDARD_REGISTRY` from the first change detection, before the
// viewer profile has arrived; reading it then must not throw (it filled the console with
// "Cannot read properties of undefined (reading 'STANDARD_REGISTRY')" on every policy page).
describe('PolicyViewerComponent permissions before the profile arrives', () => {
    it('reports no Standard Registry permission instead of failing', () => {
        const none = {} as any;
        TestBed.configureTestingModule({ providers: [{ provide: FormTakeoverService, useValue: none }] });
        const component = TestBed.runInInjectionContext(() => new PolicyViewerComponent(
            none, none, none, none, none, none, none, none, none, none, none, none
        ));

        expect(() => component.permissions.STANDARD_REGISTRY).not.toThrow();
        expect(component.permissions.STANDARD_REGISTRY).toBe(false);
    });
});
