import { TestBed } from '@angular/core/testing';
import { TableFormulaButtonComponent } from './table-formula-button.component';

describe('TableFormulaButtonComponent', () => {
    it('is keyboard accessible and opens its action without bubbling into a sortable header', () => {
        TestBed.configureTestingModule({ imports: [TableFormulaButtonComponent] });
        const fixture = TestBed.createComponent(TableFormulaButtonComponent);
        const open = vi.fn();
        fixture.componentInstance.action = { label: 'Show formulas for CO2', open };
        fixture.detectChanges();
        const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
        expect(button.type).toBe('button');
        expect(button.getAttribute('aria-label')).toBe('Show formulas for CO2');
        const bubble = vi.fn();
        fixture.nativeElement.addEventListener('click', bubble);
        button.click();
        expect(open).toHaveBeenCalledOnce();
        expect(bubble).not.toHaveBeenCalled();
    });
});

describe('TableFormulaButtonComponent compact styling', () => {
    it('keeps the button at the field Fx icon size', () => {
        TestBed.configureTestingModule({ imports: [TableFormulaButtonComponent] });
        const fixture = TestBed.createComponent(TableFormulaButtonComponent);
        fixture.componentInstance.action = { label: 'Show formulas', open: vi.fn() };
        fixture.detectChanges();
        const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
        const style = getComputedStyle(button);
        expect(parseFloat(style.width)).toBe(22);
        expect(parseFloat(style.height)).toBe(22);
        const icon = button.querySelector('svg')!;
        expect(parseFloat(getComputedStyle(icon).width)).toBe(16);
    });

    it('inherits the surrounding color when the theme variable is unavailable', () => {
        TestBed.configureTestingModule({ imports: [TableFormulaButtonComponent] });
        const fixture = TestBed.createComponent(TableFormulaButtonComponent);
        fixture.nativeElement.style.setProperty('--color-primary', 'initial');
        fixture.nativeElement.style.color = 'rgb(12, 34, 56)';
        fixture.componentInstance.action = { label: 'Show formulas', open: vi.fn() };
        fixture.detectChanges();
        const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
        expect(getComputedStyle(button).color).toBe('rgb(12, 34, 56)');
    });
});
