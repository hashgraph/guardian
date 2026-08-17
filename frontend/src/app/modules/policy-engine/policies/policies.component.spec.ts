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
            {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any,
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
});
