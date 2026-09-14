import { SchemaTemplatesComponent } from './schema-templates.component';

describe('SchemaTemplatesComponent', () => {
    function create(state: any = {}): any {
        const component: any = Object.create(SchemaTemplatesComponent.prototype);
        component.templates = state.templates || [];
        component.total = state.total ?? 0;
        component.pageIndex = state.pageIndex ?? 0;
        component.pageSize = state.pageSize ?? 25;
        component.loads = 0;
        component.loadTemplates = () => { component.loads++; };
        return component;
    }

    // The grid used the p-table pager, which emits {first, rows} and offers no
    // rows-per-page control. app-paginator emits {pageIndex, pageSize} instead.
    describe('onPage', () => {
        it('moves to the requested page', () => {
            const component = create();

            component.onPage({ pageIndex: 3, pageSize: 25 });

            expect(component.pageIndex).toBe(3);
            expect(component.pageSize).toBe(25);
            expect(component.loads).toBe(1);
        });

        it('returns to the first page when the page size changes', () => {
            const component = create({ pageIndex: 4 });

            component.onPage({ pageIndex: 4, pageSize: 100 });

            expect(component.pageIndex).toBe(0);
            expect(component.pageSize).toBe(100);
            expect(component.loads).toBe(1);
        });
    });
});
