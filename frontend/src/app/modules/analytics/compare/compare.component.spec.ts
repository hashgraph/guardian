import { of, throwError } from 'rxjs';
import { CompareComponent } from './compare.component';

describe('CompareComponent', () => {
    let analyticsService: any;
    let snapshot: any;

    function create(): any {
        const component: any = Object.create(CompareComponent.prototype);
        component.route = { snapshot, queryParams: of({}) };
        component.router = { navigate: () => Promise.resolve(true) };
        component.analyticsService = analyticsService;
        component.compareStorage = { getFile: () => null };
        component.items = [];
        component.result = null;
        component.error = null;
        component.loading = false;
        return component;
    }

    // two items is the minimum the non-original paths require
    function twoItems(component: any) {
        component.items = [{ type: 'id', value: 'a' }, { type: 'id', value: 'b' }];
        snapshot.queryParams.items = btoa(JSON.stringify({
            parent: null,
            items: component.items,
        }));
    }

    beforeEach(() => {
        snapshot = { queryParams: {} };
        analyticsService = {
            compareDocuments: jasmine.createSpy('compareDocuments').and.returnValue(of({ total: 1 })),
            compareSchema: jasmine.createSpy('compareSchema').and.returnValue(of({ total: 1 })),
            compareModule: jasmine.createSpy('compareModule').and.returnValue(of({ total: 1 })),
            comparePolicy: jasmine.createSpy('comparePolicy').and.returnValue(of({ total: 1 })),
            compareTools: jasmine.createSpy('compareTools').and.returnValue(of({ total: 1 })),
            comparePolicyOriginal: jasmine.createSpy('comparePolicyOriginal').and.returnValue(of({ total: 1 })),
        };
    });

    // Every load error callback did only `loading = false; console.error(...)`, so the
    // template's `@if (error)` banner was reachable only from the local "Invalid params"
    // pre-check. A timeout, a 500 or an oversized diff left a blank page with no message.
    describe('a failed comparison explains itself', () => {
        function expectBanner(type: string, spy: jasmine.Spy) {
            spyOn(console, 'error');
            const component = create();
            snapshot.queryParams.type = type;
            twoItems(component);
            spy.and.returnValue(throwError(() => ({ message: `${type} load failed` })));

            component.loadData();

            expect(component.loading).toBe(false);
            expect(component.result).toBeNull();
            expect(component.error).toBe(`${type} load failed`);
        }

        it('reports a failed document comparison', () => {
            expectBanner('document', analyticsService.compareDocuments);
        });

        it('reports a failed schema comparison', () => {
            expectBanner('schema', analyticsService.compareSchema);
        });

        it('reports a failed module comparison', () => {
            expectBanner('module', analyticsService.compareModule);
        });

        it('reports a failed policy comparison', () => {
            expectBanner('policy', analyticsService.comparePolicy);
        });

        it('reports a failed tool comparison', () => {
            expectBanner('tool', analyticsService.compareTools);
        });

        it('falls back to a generic banner when the failure carries no message', () => {
            spyOn(console, 'error');
            const component = create();
            snapshot.queryParams.type = 'document';
            twoItems(component);
            analyticsService.compareDocuments.and.returnValue(throwError(() => ({})));

            component.loadData();

            expect(component.loading).toBe(false);
            expect(component.error).toBeTruthy();
        });

        it('leaves the banner clear on a successful comparison', () => {
            const component = create();
            snapshot.queryParams.type = 'document';
            twoItems(component);

            component.loadData();

            expect(component.error).toBeNull();
        });
    });
});
