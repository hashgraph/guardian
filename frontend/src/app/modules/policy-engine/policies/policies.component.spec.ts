import { of, Subject } from 'rxjs';
import { PoliciesComponent } from './policies.component';

describe('PoliciesComponent', () => {
    let component: PoliciesComponent;
    let dialogService: any;

    beforeEach(() => {
        dialogService = {
            open: vi.fn().mockReturnValue({
                onClose: { pipe: () => ({ subscribe: vi.fn() }) },
            }),
        };
        const indexedDb = { registerStore: vi.fn() };

        component = new PoliciesComponent({} as any, {} as any, {} as any, {} as any, {} as any, { queryParams: { subscribe: vi.fn() } } as any, dialogService as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, new Map<string, any>(), {} as any, indexedDb as any);
    });

    describe('setVersion previousVersion seeding', () => {
        it('seeds previousVersion from the highest related version', () => {
            component.policies = [
                { id: 'p1', uuid: 'u1', version: '1.0.0' },
                { id: 'p2', uuid: 'u1', version: '2.0.0' },
                { id: 'p3', uuid: 'u1', version: '1.5.0' },
                { id: 'p4', uuid: 'other', version: '9.0.0' },
            ] as any;

            (component as any).setVersion({ id: 'p1', uuid: 'u1' });

            expect(component.policies![0].previousVersion).toBe('2.0.0');
        });

        it('orders by version rather than by list position', () => {
            component.policies = [
                { id: 'p1', uuid: 'u1', version: '10.0.0' },
                { id: 'p2', uuid: 'u1', version: '9.0.0' },
            ] as any;

            (component as any).setVersion({ id: 'p1', uuid: 'u1' });

            expect(component.policies![0].previousVersion).toBe('10.0.0');
        });

        it('leaves previousVersion empty when nothing shares the uuid', () => {
            component.policies = [{ id: 'p1', uuid: 'u1', version: '' }] as any;

            (component as any).setVersion({ id: 'p1', uuid: 'u1' });

            expect(component.policies![0].previousVersion).toBe('');
        });
    });

    describe('openPolicyWizardDialog', () => {
        function stubServices(tokens: Subject<any[]>) {
            const openPolicyWizardDialog = vi.fn();
            (component as any).tokenService = { getTokens: () => tokens };
            (component as any).schemaService = { getSchemasByPage: () => of({ body: [] }) };
            (component as any).policyEngineService = { all: () => of([]), getPolicyCategories: () => of([]) };
            (component as any).wizardService = { openPolicyWizardDialog };
            return openPolicyWizardDialog;
        }

        it('does not cover the page with the loading overlay while the dialog data loads', () => {
            const tokens = new Subject<any[]>();
            stubServices(tokens);
            component.loading = false;

            component.openPolicyWizardDialog();

            expect(component.loading).toBe(false);
            expect(component.wizardLoading).toBe(true);
        });

        it('opens the wizard once the data is loaded and releases the button', () => {
            const tokens = new Subject<any[]>();
            const open = stubServices(tokens);
            component.loading = false;

            component.openPolicyWizardDialog();
            tokens.next([]);
            tokens.complete();

            expect(open).toHaveBeenCalledTimes(1);
            expect(component.wizardLoading).toBe(false);
            expect(component.loading).toBe(false);
        });

        it('ignores a second click while the data is loading', () => {
            const tokens = new Subject<any[]>();
            const open = stubServices(tokens);

            component.openPolicyWizardDialog();
            component.openPolicyWizardDialog();
            tokens.next([]);
            tokens.complete();

            expect(open).toHaveBeenCalledTimes(1);
        });
    });

    describe('loadAllPolicy', () => {
        it('cancels the previous request so a late response cannot overwrite a newer one', () => {
            const requests: Subject<any>[] = [];
            (component as any).policyEngineService = {
                page: vi.fn().mockImplementation(() => {
                    const request = new Subject<any>();
                    requests.push(request);
                    return request;
                }),
            };

            (component as any).loadAllPolicy();
            (component as any).loadAllPolicy();

            expect(requests.length).toBe(2);
            expect(requests[0].observed).toBe(false);
            expect(requests[1].observed).toBe(true);
        });
    });

    describe('status filter', () => {
        const key = 'GUARDIAN_POLICIES_STATUS_FILTER:did:1:local';

        beforeEach(() => {
            localStorage.clear();
            component.owner = 'did:1';
            component.tab = 'local';
            vi.spyOn(component as any, 'loadAllPolicy').mockImplementation(() => undefined);
        });

        afterEach(() => localStorage.clear());

        it('restores saved statuses and drops stale ones', () => {
            localStorage.setItem(key, JSON.stringify(['PUBLISH', 'VIEW', 'BOGUS']));
            component.restoreStatusFilter();
            expect(component.statusFilter).toEqual(['PUBLISH']);
        });

        it('offers VIEW on the remote tab only', () => {
            expect(component.statusOptions.map((o) => o.value)).not.toContain('VIEW');
            component.tab = 'remote';
            expect(component.statusOptions.map((o) => o.value)).toContain('VIEW');
        });

        it('saves per user and tab, resets the page and reloads', () => {
            component.pageIndex = 3;
            component.onStatusChange(['DRAFT', 'PUBLISH']);
            expect(JSON.parse(localStorage.getItem(key) as string)).toEqual(['DRAFT', 'PUBLISH']);
            expect(component.pageIndex).toBe(0);
            expect((component as any).loadAllPolicy).toHaveBeenCalled();
        });

        it('removes the stored value when cleared', () => {
            component.onStatusChange(['DRAFT']);
            component.onStatusChange([]);
            expect(localStorage.getItem(key)).toBeNull();
        });

        it('keeps the filter bar visible when a status is set and nothing matches', () => {
            component.policies = [];
            component.statusFilter = ['PUBLISH_ERROR'];
            expect(component.showFilterBar).toBe(true);
        });
    });
});
