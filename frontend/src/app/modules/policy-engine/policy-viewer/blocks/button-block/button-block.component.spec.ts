import { ChangeDetectorRef, NO_ERRORS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DialogService } from 'primeng/dynamicdialog';
import { of, throwError } from 'rxjs';
import { IndexedDbRegistryService } from 'src/app/services/indexed-db-registry.service';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { PolicyHelper } from 'src/app/services/policy-helper.service';
import { ToastService } from 'src/app/services/toast.service';
import { WebSocketService } from 'src/app/services/web-socket.service';
import { ButtonBlockComponent } from './button-block.component';

describe('ButtonBlockComponent', () => {
    let component: ButtonBlockComponent;
    let policyEngineService: jasmine.SpyObj<PolicyEngineService>;
    let toastService: jasmine.SpyObj<ToastService>;

    beforeEach(() => {
        policyEngineService = jasmine.createSpyObj<PolicyEngineService>(
            'PolicyEngineService', ['getBlockData', 'setBlockData']);
        toastService = jasmine.createSpyObj<ToastService>('ToastService', ['success', 'error', 'warn']);

        const wsService = jasmine.createSpyObj<WebSocketService>('WebSocketService', ['blockSubscribe']);
        wsService.blockSubscribe.and.returnValue({ unsubscribe: () => {} } as any);
        const indexedDbRegistry = jasmine.createSpyObj<IndexedDbRegistryService>(
            'IndexedDbRegistryService', ['registerStore', 'put', 'get', 'delete']);
        indexedDbRegistry.registerStore.and.returnValue(Promise.resolve());

        TestBed.configureTestingModule({
            declarations: [ButtonBlockComponent],
            providers: [
                { provide: PolicyEngineService, useValue: policyEngineService },
                { provide: WebSocketService, useValue: wsService },
                { provide: PolicyHelper, useValue: {} },
                { provide: DialogService, useValue: { open: jasmine.createSpy() } },
                { provide: ChangeDetectorRef, useValue: { detectChanges: () => {} } },
                { provide: IndexedDbRegistryService, useValue: indexedDbRegistry },
                { provide: ToastService, useValue: toastService },
            ],
            schemas: [NO_ERRORS_SCHEMA],
        });
        component = TestBed.createComponent(ButtonBlockComponent).componentInstance;
        component.id = 'b1';
        component.policyId = 'p1';
    });

    it('writes {document, tag} to the policy engine', () => {
        component.data = { status: 'A' };
        policyEngineService.setBlockData.and.returnValue(of(null as any));

        component.onSelect({ field: 'status', value: 'B', tag: 'btn1' });

        expect(component.data.status).toBe('B');
        expect(policyEngineService.setBlockData).toHaveBeenCalledWith('b1', 'p1', {
            document: { status: 'B' }, tag: 'btn1',
        });
    });

    // The success arm was empty, so an accepted Approve/Reject looked identical to
    // nothing happening; and a rejected submit left the row hidden with no message.
    describe('decision feedback', () => {
        it('confirms an accepted decision by name', () => {
            component.data = {};
            policyEngineService.setBlockData.and.returnValue(of(null as any));

            component.onSelect({ field: 'status', value: 'B', tag: 'btn1', name: 'Approve' });

            expect(toastService.success).toHaveBeenCalled();
            expect(toastService.success.calls.mostRecent().args[0]).toContain('Approve');
        });

        it('falls back to the tag when the button has no name', () => {
            component.data = {};
            policyEngineService.setBlockData.and.returnValue(of(null as any));

            component.onSelect({ field: 'status', value: 'B', tag: 'btn1' });

            expect(toastService.success.calls.mostRecent().args[0]).toContain('btn1');
        });

        it('restores the buttons and reports a rejected submit', () => {
            spyOn(console, 'error');
            component.data = {};
            component.commonVisible = true;
            policyEngineService.setBlockData.and.returnValue(
                throwError(() => ({ error: { message: 'nope' } }))
            );

            component.onSelect({ field: 'status', value: 'B', tag: 'btn1', name: 'Approve' });

            expect(component.commonVisible).toBeTrue();
            expect(component.loading).toBeFalse();
            expect(toastService.error).toHaveBeenCalledWith('nope', 'Action failed', { sticky: true });
            expect(toastService.success).not.toHaveBeenCalled();
        });

        it('hides the buttons while an accepted decision is in flight', () => {
            component.data = {};
            component.commonVisible = true;
            policyEngineService.setBlockData.and.returnValue(of(null as any));

            component.onSelect({ field: 'status', value: 'B', tag: 'btn1' });

            expect(component.commonVisible).toBeFalse();
        });
    });
});
