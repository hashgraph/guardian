import { CodeEditorDialogComponent } from './code-editor-dialog.component';
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';

describe('CodeEditorDialogComponent', () => {

    function createComponent(data: any = {}): CodeEditorDialogComponent {
        const ref = {} as DynamicDialogRef;
        const config = { data } as DynamicDialogConfig;
        const component = new CodeEditorDialogComponent(ref, config);
        component.ngOnInit();
        return component;
    }

    describe('validateExpression', () => {

        describe('empty expressions', () => {
            it('should return error for empty expression', () => {
                const c = createComponent({ validate: true });
                c.expression = '';
                expect(c.validateExpression()).toEqual(['Expression is empty.']);
            });

            it('should return error for whitespace-only expression', () => {
                const c = createComponent({ validate: true });
                c.expression = '   ';
                expect(c.validateExpression()).toEqual(['Expression is empty.']);
            });
        });

        describe('valid expressions', () => {
            let component: CodeEditorDialogComponent;

            beforeEach(() => {
                component = createComponent({
                    validate: true,
                    helpContext: {
                        availableFields: ['field1', 'field2', 'price', 'quantity'],
                    },
                });
            });

            it('should pass simple arithmetic', () => {
                component.expression = 'field1 + field2';
                expect(component.validateExpression()).toEqual([]);
            });

            it('should pass ternary operator', () => {
                component.expression = 'field1 > 100 ? "high" : "low"';
                expect(component.validateExpression()).toEqual([]);
            });

            it('should pass Math functions', () => {
                component.expression = 'Math.round(field1 / field2 * 100) / 100';
                expect(component.validateExpression()).toEqual([]);
            });

            it('should pass Math.min/max', () => {
                component.expression = 'Math.min(Math.max(field1, 0), 100)';
                expect(component.validateExpression()).toEqual([]);
            });

            it('should pass string concatenation', () => {
                component.expression = '"ID-" + String(field1)';
                expect(component.validateExpression()).toEqual([]);
            });

            it('should pass parseFloat/parseInt', () => {
                component.expression = 'parseFloat("3.14") + parseInt("10")';
                expect(component.validateExpression()).toEqual([]);
            });

            it('should pass Number conversion', () => {
                component.expression = 'Number(field1) + Number(field2)';
                expect(component.validateExpression()).toEqual([]);
            });

            it('should pass boolean expressions', () => {
                component.expression = 'field1 > 0 && field2 > 0 ? price : 0';
                expect(component.validateExpression()).toEqual([]);
            });

            it('should pass nested ternary', () => {
                component.expression = 'field1 > 100 ? "high" : field1 > 50 ? "medium" : "low"';
                expect(component.validateExpression()).toEqual([]);
            });

            it('should pass IIFE with local variables', () => {
                component.expression = '(() => { const tax = field1 * 0.2; return field1 + tax; })()';
                expect(component.validateExpression()).toEqual([]);
            });

            it('should pass array methods', () => {
                component.expression = '[field1, field2].reduce((s, v) => s + v, 0)';
                expect(component.validateExpression()).toEqual([]);
            });

            it('should pass simple numeric literal', () => {
                component.expression = '42';
                expect(component.validateExpression()).toEqual([]);
            });

            it('should pass string literal', () => {
                component.expression = '"hello"';
                expect(component.validateExpression()).toEqual([]);
            });
        });

        describe('nested schema fields (dotted notation)', () => {
            let component: CodeEditorDialogComponent;

            beforeEach(() => {
                component = createComponent({
                    validate: true,
                    helpContext: {
                        availableFields: ['subSchema', 'field1'],
                    },
                });
            });

            it('should pass dotted field access', () => {
                component.expression = 'subSchema.width * subSchema.height';
                expect(component.validateExpression()).toEqual([]);
            });

            it('should pass deeply nested access', () => {
                component.expression = 'subSchema.nested.value + field1';
                expect(component.validateExpression()).toEqual([]);
            });
        });

        describe('table helper', () => {
            let component: CodeEditorDialogComponent;

            beforeEach(() => {
                component = createComponent({
                    validate: true,
                    helpContext: {
                        availableFields: ['myTable', 'field1'],
                    },
                });
            });

            it('should pass table.col with reduce', () => {
                component.expression = 'table.col(myTable, "amount").reduce((s, v) => s + table.num(v), 0)';
                expect(component.validateExpression()).toEqual([]);
            });

            it('should pass table.rows', () => {
                component.expression = 'table.rows(myTable).length';
                expect(component.validateExpression()).toEqual([]);
            });

            it('should pass table.cell', () => {
                component.expression = 'table.cell(myTable, 0, "name")';
                expect(component.validateExpression()).toEqual([]);
            });

            it('should pass table.keys', () => {
                component.expression = 'table.keys(myTable).length';
                expect(component.validateExpression()).toEqual([]);
            });
        });

        describe('unicode field names', () => {
            it('should pass Cyrillic field names', () => {
                const c = createComponent({
                    validate: true,
                    helpContext: {
                        availableFields: ['поле1', 'поле2'],
                    },
                });
                c.expression = 'поле1 + поле2';
                expect(c.validateExpression()).toEqual([]);
            });
        });

        describe('syntax errors', () => {
            let component: CodeEditorDialogComponent;

            beforeEach(() => {
                component = createComponent({
                    validate: true,
                    helpContext: {
                        availableFields: ['field1', 'field2'],
                    },
                });
            });

            it('should catch unmatched parenthesis', () => {
                component.expression = 'Math.round(field1';
                const errors = component.validateExpression();
                expect(errors.length).toBeGreaterThan(0);
            });

            it('should catch unmatched bracket', () => {
                component.expression = '[field1, field2';
                const errors = component.validateExpression();
                expect(errors.length).toBeGreaterThan(0);
            });

            it('should catch invalid syntax', () => {
                component.expression = 'field1 +* field2';
                const errors = component.validateExpression();
                expect(errors.length).toBeGreaterThan(0);
            });

            it('should catch undefined function call', () => {
                component.expression = 'SUM(field1, field2)';
                const errors = component.validateExpression();
                expect(errors.length).toBeGreaterThan(0);
            });

            it('should catch undefined variable', () => {
                component.expression = 'unknownField + field1';
                const errors = component.validateExpression();
                expect(errors.length).toBeGreaterThan(0);
            });

            it('should catch let statement (not an expression)', () => {
                component.expression = 'let a = 0; Math.abs(a)';
                const errors = component.validateExpression();
                expect(errors.length).toBeGreaterThan(0);
            });
        });

        describe('without helpContext', () => {
            it('should still validate syntax', () => {
                const c = createComponent({ validate: true });
                c.expression = 'field1 +* field2';
                const errors = c.validateExpression();
                expect(errors.length).toBeGreaterThan(0);
            });

            it('should pass valid expression without field checking', () => {
                const c = createComponent({ validate: true });
                c.expression = '1 + 2';
                expect(c.validateExpression()).toEqual([]);
            });
        });
    });

    describe('onSave', () => {
        it('should block save when validation fails', () => {
            const closeSpy = jasmine.createSpy('close');
            const ref = { close: closeSpy } as any;
            const config = { data: { validate: true, helpContext: { availableFields: ['f1'] } } } as DynamicDialogConfig;
            const c = new CodeEditorDialogComponent(ref, config);
            c.ngOnInit();
            c.expression = 'SUM(f1)';

            c.onSave();

            expect(closeSpy).not.toHaveBeenCalled();
            expect(c.validationErrors.length).toBeGreaterThan(0);
        });

        it('should allow save when validation passes', () => {
            const closeSpy = jasmine.createSpy('close');
            const ref = { close: closeSpy } as any;
            const config = { data: { validate: true, helpContext: { availableFields: ['f1'] } } } as DynamicDialogConfig;
            const c = new CodeEditorDialogComponent(ref, config);
            c.ngOnInit();
            c.expression = 'f1 + 1';

            c.onSave();

            expect(closeSpy).toHaveBeenCalledWith({ type: 'save', expression: 'f1 + 1' });
        });

        it('should skip validation when validate is false', () => {
            const closeSpy = jasmine.createSpy('close');
            const ref = { close: closeSpy } as any;
            const config = { data: { validate: false } } as DynamicDialogConfig;
            const c = new CodeEditorDialogComponent(ref, config);
            c.ngOnInit();
            c.expression = 'anything goes +++';

            c.onSave();

            expect(closeSpy).toHaveBeenCalled();
        });
    });

    describe('forceSave', () => {
        it('should save regardless of validation errors', () => {
            const closeSpy = jasmine.createSpy('close');
            const ref = { close: closeSpy } as any;
            const config = { data: { validate: true, helpContext: { availableFields: ['f1'] } } } as DynamicDialogConfig;
            const c = new CodeEditorDialogComponent(ref, config);
            c.ngOnInit();
            c.expression = 'SUM(f1)';

            c.forceSave();

            expect(closeSpy).toHaveBeenCalledWith({ type: 'save', expression: 'SUM(f1)' });
        });
    });

    describe('toggleHelpPanel', () => {
        it('should toggle helpPanelOpen', () => {
            const c = createComponent({});
            expect(c.helpPanelOpen).toBe(false);
            c.toggleHelpPanel();
            expect(c.helpPanelOpen).toBe(true);
            c.toggleHelpPanel();
            expect(c.helpPanelOpen).toBe(false);
        });
    });

    describe('ngOnInit', () => {
        it('should initialize from data', () => {
            const helpContext = { availableFields: ['a', 'b'] };
            const c = createComponent({
                mode: 'formula-lang',
                expression: 'a + b',
                readonly: true,
                test: true,
                validate: true,
                placeholder: 'enter expression',
                variables: ['a', 'b'],
                helpContext,
            });

            expect(c.expression).toBe('a + b');
            expect(c.codeMirrorOptions.mode).toBe('formula-lang');
            expect(c.codeMirrorOptions.readOnly).toBe(true);
            expect(c.codeMirrorOptions.placeholder).toBe('enter expression');
            expect(c.codeMirrorOptions.variables).toEqual(['a', 'b']);
            expect(c.test).toBe(true);
            expect(c.shouldValidate).toBe(true);
            expect(c.helpContext).toBe(helpContext);
        });

        it('should default helpContext to null', () => {
            const c = createComponent({});
            expect(c.helpContext).toBeNull();
        });
    });
});
