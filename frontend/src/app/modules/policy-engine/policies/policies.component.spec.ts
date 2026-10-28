import { PoliciesComponent } from './policies.component';

describe('PoliciesComponent', () => {
    let component: PoliciesComponent;
    let dialogService: any;

    beforeEach(() => {
        dialogService = {
            open: jasmine.createSpy('open').and.returnValue({
                onClose: { pipe: () => ({ subscribe: jasmine.createSpy('subscribe') }) },
            }),
        };
        const indexedDb = { registerStore: jasmine.createSpy('registerStore') };

        component = new PoliciesComponent(
            {} as any, {} as any, {} as any, {} as any, {} as any,
            { queryParams: { subscribe: jasmine.createSpy('subscribe') } } as any,
            dialogService as any,
            {} as any, {} as any, {} as any, {} as any, {} as any, {} as any,
            new Map<string, any>(),
            {} as any,
            indexedDb as any
        );
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

    describe('status filter', () => {
        const key = 'GUARDIAN_POLICIES_STATUS_FILTER:did:1:local';

        beforeEach(() => {
            localStorage.clear();
            component.owner = 'did:1';
            component.tab = 'local';
            spyOn<any>(component, 'loadAllPolicy');
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
            expect(component.showFilterBar).toBeTrue();
        });
    });
});
