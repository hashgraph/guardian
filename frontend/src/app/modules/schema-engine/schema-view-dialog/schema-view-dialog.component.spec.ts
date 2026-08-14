import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { SchemaViewDialog } from './schema-view-dialog.component';

describe('SchemaViewDialog', () => {

    function createComponent(data: any = {}): SchemaViewDialog {
        const ref = {} as DynamicDialogRef;
        const config = { data } as DynamicDialogConfig;
        const component = new SchemaViewDialog(ref, config);
        component.ngOnInit();
        return component;
    }

    function issues(count: number, type: string): any[] {
        const result: any[] = [];
        for (let i = 0; i < count; i++) {
            result.push({ type, text: `${type} ${i}` });
        }
        return result;
    }

    describe('counts', () => {
        it('should count errors and warnings separately', () => {
            const c = createComponent({ errors: [...issues(3, 'error'), ...issues(5, 'warning')] });
            expect(c.errorCount).toBe(3);
            expect(c.warningCount).toBe(5);
        });

        it('should count nothing when there are no errors', () => {
            const c = createComponent({ errors: [] });
            expect(c.errorCount).toBe(0);
            expect(c.warningCount).toBe(0);
        });

        it('should not count an entry with an unknown type', () => {
            const c = createComponent({ errors: issues(2, 'info') });
            expect(c.errorCount).toBe(0);
            expect(c.warningCount).toBe(0);
        });
    });

    describe('issuesSummary', () => {
        it('should name both counts when both are present', () => {
            const c = createComponent({ errors: [...issues(3, 'error'), ...issues(5, 'warning')] });
            expect(c.issuesSummary).toBe('3 errors, 5 warnings');
        });

        it('should name only errors when there are no warnings', () => {
            const c = createComponent({ errors: issues(2, 'error') });
            expect(c.issuesSummary).toBe('2 errors');
        });

        it('should name only warnings when there are no errors', () => {
            const c = createComponent({ errors: issues(4, 'warning') });
            expect(c.issuesSummary).toBe('4 warnings');
        });

        it('should use the singular form for one error', () => {
            const c = createComponent({ errors: issues(1, 'error') });
            expect(c.issuesSummary).toBe('1 error');
        });

        it('should use the singular form for one warning', () => {
            const c = createComponent({ errors: issues(1, 'warning') });
            expect(c.issuesSummary).toBe('1 warning');
        });

        it('should be empty when there are no entries', () => {
            const c = createComponent({ errors: [] });
            expect(c.issuesSummary).toBe('');
        });

        it('should be empty when errors are missing from the dialog data', () => {
            const c = createComponent({});
            expect(c.errors).toEqual([]);
            expect(c.issuesSummary).toBe('');
        });

        it('should fall back to an issue count when no entry has a known type', () => {
            const c = createComponent({ errors: issues(2, 'info') });
            expect(c.issuesSummary).toBe('2 issues');
        });

        it('should use the singular fallback for a single unknown entry', () => {
            const c = createComponent({ errors: issues(1, 'info') });
            expect(c.issuesSummary).toBe('1 issue');
        });
    });

    describe('__path', () => {
        it('should prefer the cell over the row and the column', () => {
            const c = createComponent({ errors: [{ type: 'error', cell: 'B4', row: 4, col: 2 }] });
            expect(c.errors[0].__path).toBe('Cell: B4');
        });

        it('should use the row when there is no cell', () => {
            const c = createComponent({ errors: [{ type: 'error', row: 7, col: 2 }] });
            expect(c.errors[0].__path).toBe('Row: 7');
        });

        it('should use the column when there is no cell and no row', () => {
            const c = createComponent({ errors: [{ type: 'warning', col: 3 }] });
            expect(c.errors[0].__path).toBe('Col: 3');
        });
    });
});
