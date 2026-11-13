import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HideNotProvidedToggleComponent } from './hide-not-provided-toggle.component';

describe('HideNotProvidedToggleComponent', () => {
    const build = (pressed: boolean): ComponentFixture<HideNotProvidedToggleComponent> => {
        TestBed.resetTestingModule();
        TestBed.configureTestingModule({ declarations: [HideNotProvidedToggleComponent] });
        const fixture = TestBed.createComponent(HideNotProvidedToggleComponent);
        fixture.componentRef.setInput('pressed', pressed);
        fixture.detectChanges();
        return fixture;
    };
    const button = (fixture: ComponentFixture<HideNotProvidedToggleComponent>): HTMLButtonElement =>
        fixture.nativeElement.querySelector('button.hide-not-provided-toggle');

    it('reads "Hide not provided" and shows no check while it is off', () => {
        const fixture = build(false);
        expect(button(fixture).textContent!.trim()).toBe('Hide not provided');
        expect(button(fixture).getAttribute('aria-pressed')).toBe('false');
        expect(button(fixture).querySelector('.pi-check')).toBeNull();
    });

    it('is pressed and shows a check while it is on', () => {
        const fixture = build(true);
        expect(button(fixture).getAttribute('aria-pressed')).toBe('true');
        expect(button(fixture).querySelector('.pi-check')).not.toBeNull();
    });

    it('asks for the opposite state on click', () => {
        const off = build(false);
        const fromOff: boolean[] = [];
        off.componentInstance.toggled.subscribe((value) => fromOff.push(value));
        button(off).click();
        expect(fromOff).toEqual([true]);

        const on = build(true);
        const fromOn: boolean[] = [];
        on.componentInstance.toggled.subscribe((value) => fromOn.push(value));
        button(on).click();
        expect(fromOn).toEqual([false]);
    });
});
