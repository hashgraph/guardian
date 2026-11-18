import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { CustomConfirmDialogComponent } from './custom-confirm-dialog.component';

describe('CustomConfirmDialogComponent text class', () => {
    const render = (data: any) => {
        TestBed.configureTestingModule({
            declarations: [CustomConfirmDialogComponent],
            providers: [
                { provide: DynamicDialogRef, useValue: { close: vi.fn() } },
                { provide: DynamicDialogConfig, useValue: { data } }
            ],
            schemas: [NO_ERRORS_SCHEMA]
        });
        const fixture = TestBed.createComponent(CustomConfirmDialogComponent);
        fixture.detectChanges();
        return fixture.nativeElement.querySelector('.confirmation-text') as HTMLElement;
    };

    it('puts the requested class on the text', () => {
        const text = render({ header: 'H', text: 'Body', textClass: 'confirmation-text--regular' });
        expect(text.classList.contains('confirmation-text--regular')).toBe(true);
    });

    it('adds no extra class by default', () => {
        const text = render({ header: 'H', text: 'Body' });
        expect(Array.from(text.classList)).toEqual(['confirmation-text']);
    });
});
