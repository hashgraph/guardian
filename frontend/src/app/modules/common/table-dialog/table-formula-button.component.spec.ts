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
