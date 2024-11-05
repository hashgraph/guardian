import { Component, EventEmitter, Inject, Input, Output, SimpleChanges } from '@angular/core';
import { GenerateUUIDv4 } from '@guardian/interfaces';
/**
 * Dialog for icon preview.
 */
@Component({
    selector: 'guardian-switch-button',
    templateUrl: './guardian-switch-button.component.html',
    styleUrls: ['./guardian-switch-button.component.scss']
})
export class GuardianSwitchButton {
    @Input('onLabel') onLabel!: string;
    @Input('offLabel') offLabel!: string;

    @Input('onValue') onValue!: string;
    @Input('offValue') offValue!: string;

    @Input('disabled') disabled: boolean = false;

    @Input('value') value!: boolean | string;
    @Output('valueChange') valueChange = new EventEmitter<boolean | string>();
    @Output('onChange') change = new EventEmitter<boolean | string>();

    public mode: string = GenerateUUIDv4();

    protected _onValue: any = true;
    protected _offValue: any = false;
    protected _value: boolean = false;

    constructor() {
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (this.onValue && typeof this.onValue === 'string') {
            this._onValue = this.onValue;
        } else {
            this._onValue = true;
        }
        if (this.offValue && typeof this.offValue === 'string') {
            this._offValue = this.offValue;
        } else {
            this._offValue = false;
        }
        this._value = this.value === this._onValue;
    }

    onChange() {
        if (this._value) {
            this.value = this._onValue;
        } else {
            this.value = this._offValue;
        }
        this.valueChange.emit(this.value);
        this.change.emit(this.value);
    }
}
