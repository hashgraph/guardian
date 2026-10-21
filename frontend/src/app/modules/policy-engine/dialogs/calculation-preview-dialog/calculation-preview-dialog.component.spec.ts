import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { CalculationPreviewDialogComponent } from './calculation-preview-dialog.component';

describe('CalculationPreviewDialogComponent', () => {
    let fixture: ComponentFixture<CalculationPreviewDialogComponent>;
    let close: jasmine.Spy;

    const create = (result: unknown, labels: Record<string, string> = {}) => {
        close = jasmine.createSpy('close');
        TestBed.configureTestingModule({
            declarations: [CalculationPreviewDialogComponent],
            providers: [
                { provide: DynamicDialogRef, useValue: { close } },
                { provide: DynamicDialogConfig, useValue: { data: { result, labels } } },
            ],
            schemas: [NO_ERRORS_SCHEMA],
        });
        fixture = TestBed.createComponent(CalculationPreviewDialogComponent);
        fixture.detectChanges();
        return fixture.nativeElement as HTMLElement;
    };

    it('shows errors, fields to fill, every calculation stage and every document', () => {
        const element = create({
            errors: ['Invalid expression: total'],
            missingFields: ['rate'],
            calculations: [{
                source: 'math_1',
                blockType: 'mathBlock',
                inputs: [{ name: 'a', path: 'amount', value: 2 }],
                values: [{ name: 'b', description: 'Double', formula: 'a\\cdot2', value: 4 }],
                outputs: [{ name: 'b', path: 'total', value: 4 }],
            }],
            documents: [{ source: 'math_1', target: 'save_1', blockType: 'sendToGuardianBlock', document: { total: 4 } }],
        }, { rate: 'Rate', amount: 'Amount' });
        const text = element.textContent || '';

        expect(text).toContain('Invalid expression: total');
        expect(text).toContain('Rate (rate)');
        expect(text).toContain('math_1');
        expect(text).toContain('Amount (amount)');
        expect(text).toContain('Double');
        expect(text).toContain('a\\cdot2');
        expect(text).toContain('Document for save_1');
        expect(text).toContain('"total": 4');
        expect(text).not.toContain('No Math or Calculate block ran');
    });

    it('says when no calculation ran', () => {
        const text = create({ documents: [] }).textContent || '';
        expect(text).toContain('No Math or Calculate block ran for this form.');
    });

    it('formats empty, missing and object values', () => {
        create({});
        const component = fixture.componentInstance;
        expect(component.formatValue(null)).toBe('—');
        expect(component.formatValue(undefined)).toBe('—');
        expect(component.formatValue(Number.NaN)).toBe('NaN');
        expect(component.formatValue({ a: 1 })).toBe('{"a":1}');
        expect(component.formatValue(0)).toBe('0');
    });

    it('names the end of a chain that has no next block', () => {
        create({});
        expect(fixture.componentInstance.getTarget({ target: null })).toBe('the end of the chain');
    });

    it('closes the dialog', () => {
        const element = create({});
        const button = element.querySelector('.preview-footer button') as HTMLButtonElement;
        button.click();
        expect(close).toHaveBeenCalledWith(null);
    });
});
