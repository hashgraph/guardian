import { Component, EventEmitter, Input, Output } from '@angular/core';

/**
 * Reusable tab-style switcher matching the Schemas page tabs.
 * Renders a list of options as PrimeNG tabs and emits the selected value.
 */
@Component({
    selector: 'guardian-tabs-switch',
    templateUrl: './guardian-tabs-switch.component.html',
    styleUrls: ['./guardian-tabs-switch.component.scss'],
    standalone: false
})
export class GuardianTabsSwitch {
    @Input('options') options: { label: string; value: any }[] = [];
    @Input('value') value: any;

    @Output('valueChange') valueChange = new EventEmitter<any>();
    @Output('onChange') change = new EventEmitter<any>();

    onSelect(value: any): void {
        if (value === this.value) {
            return;
        }
        this.value = value;
        this.valueChange.emit(value);
        this.change.emit(value);
    }
}
