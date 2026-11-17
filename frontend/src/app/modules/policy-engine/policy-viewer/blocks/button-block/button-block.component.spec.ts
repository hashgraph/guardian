import type { Mock, MockedObject } from "vitest";
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
    let policyEngineService: MockedObject<PolicyEngineService>;
    let toastService: MockedObject<ToastService>;

    beforeEach(() => {
        policyEngineService = {
            getBlockData: vi.fn().mockName("PolicyEngineService.getBlockData"),
            setBlockData: vi.fn().mockName("PolicyEngineService.setBlockData")
        } as unknown as MockedObject<PolicyEngineService>;
        toastService = {
            success: vi.fn().mockName("ToastService.success"),
            error: vi.fn().mockName("ToastService.error"),
            warn: vi.fn().mockName("ToastService.warn")
        } as unknown as MockedObject<ToastService>;

        const wsService = {
            blockSubscribe: vi.fn().mockName("WebSocketService.blockSubscribe")
        };
        wsService.blockSubscribe.mockReturnValue({ unsubscribe: () => { } } as any);
        const indexedDbRegistry = {
            registerStore: vi.fn().mockName("IndexedDbRegistryService.registerStore"),
            put: vi.fn().mockName("IndexedDbRegistryService.put"),
            get: vi.fn().mockName("IndexedDbRegistryService.get"),
            delete: vi.fn().mockName("IndexedDbRegistryService.delete")
        };
        indexedDbRegistry.registerStore.mockReturnValue(Promise.resolve());

        TestBed.configureTestingModule({
            declarations: [ButtonBlockComponent],
            providers: [
                { provide: PolicyEngineService, useValue: policyEngineService },
                { provide: WebSocketService, useValue: wsService },
                { provide: PolicyHelper, useValue: {} },
                { provide: DialogService, useValue: { open: vi.fn() } },
                { provide: ChangeDetectorRef, useValue: { detectChanges: () => { } } },
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
        policyEngineService.setBlockData.mockReturnValue(of(null as any));

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
            policyEngineService.setBlockData.mockReturnValue(of(null as any));

            component.onSelect({ field: 'status', value: 'B', tag: 'btn1', name: 'Approve' });

            expect(toastService.success).toHaveBeenCalled();
            expect(vi.mocked(toastService.success).mock.lastCall![0]).toContain('Approve');
        });

        it('falls back to the tag when the button has no name', () => {
            component.data = {};
            policyEngineService.setBlockData.mockReturnValue(of(null as any));

            component.onSelect({ field: 'status', value: 'B', tag: 'btn1' });

            expect(vi.mocked(toastService.success).mock.lastCall![0]).toContain('btn1');
        });

        it('restores the buttons and reports a rejected submit', () => {
            vi.spyOn(console, 'error').mockImplementation(() => undefined);
            component.data = {};
            component.commonVisible = true;
            policyEngineService.setBlockData.mockReturnValue(throwError(() => ({ error: { message: 'nope' } })));

            component.onSelect({ field: 'status', value: 'B', tag: 'btn1', name: 'Approve' });

            expect(component.commonVisible).toBe(true);
            expect(component.loading).toBe(false);
            expect(toastService.error).toHaveBeenCalledWith('nope', 'Action failed', { sticky: true });
            expect(toastService.success).not.toHaveBeenCalled();
        });

        it('undoes the optimistic write when the submit is rejected', () => {
            component.data = { status: 'A' };
            policyEngineService.setBlockData.mockReturnValue(throwError(() => ({ error: {} })));

            component.onSelect({ field: 'status', value: 'B', tag: 'btn1' });

            expect(component.data.status).toBe('A');
        });

        it('undoes the dialog comment too, so a retry does not record it twice', () => {
            component.data = { option: { comment: ['first'] } };
            policyEngineService.setBlockData.mockReturnValue(throwError(() => ({ error: {} })));

            // what onSelectDialog does: capture, append, submit
            const restorePoint = JSON.stringify(component.data);
            (component.data as any).option.comment.push('second');
            component.onSelect({ field: 'status', value: 'B', tag: 'btn1' }, restorePoint);

            expect((component.data as any).option.comment).toEqual(['first']);
        });

        it('clears the persisted hide-events decision when the submit is rejected', async () => {
            // onSelect always clears once up front, so only the extra clear proves the undo
            const settle = async () => { for (let i = 0; i < 5; i++) {
                await Promise.resolve();
            } };
            const remove = (TestBed.inject(IndexedDbRegistryService) as any).delete as Mock;
            (component as any).hideEventsUserId = 'did:user';

            component.data = { status: 'A' };
            policyEngineService.setBlockData.mockReturnValue(of(null as any));
            remove.mockClear();
            component.onSelect({ field: 'status', value: 'B', tag: 'ok' });
            await settle();
            const whenAccepted = vi.mocked(remove).mock.calls.length;

            component.data = { status: 'A' };
            policyEngineService.setBlockData.mockReturnValue(throwError(() => ({ error: {} })));
            remove.mockClear();
            component.onSelect({ field: 'status', value: 'B', tag: 'rejected' });
            await settle();

            expect(vi.mocked(remove).mock.calls.length).toBe(whenAccepted + 1);
        });

        it('hides the buttons while an accepted decision is in flight', () => {
            component.data = {};
            component.commonVisible = true;
            policyEngineService.setBlockData.mockReturnValue(of(null as any));

            component.onSelect({ field: 'status', value: 'B', tag: 'btn1' });

            expect(component.commonVisible).toBe(false);
        });
    });
});
