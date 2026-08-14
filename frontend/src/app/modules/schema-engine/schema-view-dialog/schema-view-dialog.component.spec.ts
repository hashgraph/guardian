import { of } from 'rxjs';
import { DialogService, DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { SchemaViewDialog } from './schema-view-dialog.component';

describe('SchemaViewDialog', () => {

    let closedWith: any;
    let confirmConfig: any;
    let confirmOpened: number;
    let confirmResult: string | undefined;

    function createComponent(data: any = {}): SchemaViewDialog {
        closedWith = undefined;
        confirmConfig = undefined;
        confirmOpened = 0;
        const ref = {
            close: (value: any) => { closedWith = value; }
        } as DynamicDialogRef;
        const config = { data } as DynamicDialogConfig;
        const dialogService = {
            open: (component: any, openConfig: any) => {
                confirmOpened++;
                confirmConfig = openConfig;
                return { onClose: of(confirmResult) };
            }
        } as DialogService;
        const component = new SchemaViewDialog(ref, config, dialogService);
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

    describe('onImport', () => {

        it('should import without asking when there are no entries', () => {
            const c = createComponent({ errors: [], topicId: 'topic-1' });
            c.onImport();
            expect(confirmOpened).toBe(0);
            expect(closedWith).toEqual({ topicId: 'topic-1' });
        });

        it('should import without asking when there are only warnings', () => {
            const c = createComponent({ errors: issues(3, 'warning'), topicId: 'topic-1' });
            c.onImport();
            expect(confirmOpened).toBe(0);
            expect(closedWith).toEqual({ topicId: 'topic-1' });
        });

        it('should ask before importing when there is at least one error', () => {
            confirmResult = undefined;
            const c = createComponent({ errors: issues(4, 'error'), topicId: 'topic-1' });
            c.onImport();
            expect(confirmOpened).toBe(1);
            expect(closedWith).toBeUndefined();
        });

        it('should name the error count in the confirmation text', () => {
            confirmResult = undefined;
            const c = createComponent({
                errors: [...issues(4, 'error'), ...issues(2, 'warning')],
                topicId: 'topic-1'
            });
            c.onImport();
            expect(confirmConfig.data.text).toBe('This import has 4 errors. Import anyway?');
        });

        it('should use the singular form for one error', () => {
            confirmResult = undefined;
            const c = createComponent({ errors: issues(1, 'error'), topicId: 'topic-1' });
            c.onImport();
            expect(confirmConfig.data.text).toBe('This import has 1 error. Import anyway?');
        });

        it('should offer a cancel and an import button', () => {
            confirmResult = undefined;
            const c = createComponent({ errors: issues(2, 'error'), topicId: 'topic-1' });
            c.onImport();
            expect(confirmConfig.data.buttons.map((b: any) => b.name)).toEqual(['Cancel', 'Import']);
        });

        it('should import when the confirmation is accepted', () => {
            confirmResult = 'Import';
            const c = createComponent({ errors: issues(2, 'error'), topicId: 'topic-1' });
            c.onImport();
            expect(closedWith).toEqual({ topicId: 'topic-1' });
        });

        it('should not import when the confirmation is cancelled', () => {
            confirmResult = 'Cancel';
            const c = createComponent({ errors: issues(2, 'error'), topicId: 'topic-1' });
            c.onImport();
            expect(closedWith).toBeUndefined();
        });

        it('should not import when the confirmation is dismissed', () => {
            confirmResult = undefined;
            const c = createComponent({ errors: issues(2, 'error'), topicId: 'topic-1' });
            c.onImport();
            expect(closedWith).toBeUndefined();
        });
    });
});
