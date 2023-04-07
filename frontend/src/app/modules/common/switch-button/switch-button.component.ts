import { Component, EventEmitter, Inject, Input, Output, SimpleChanges } from '@angular/core';
import { GenerateUUIDv4 } from '@guardian/interfaces';
/**
 * Dialog for icon preview.
 */
@Component({
    selector: 'switch-button',
    templateUrl: './switch-button.component.html',
    styleUrls: ['./switch-button.component.css']
})
export class SwitchButton {
    @Input('on-label') on!: string;
    @Input('off-label') off!: string;
    
    @Input('value') value!: boolean;
    @Output('valueChange') valueChange = new EventEmitter<boolean>();

    mode: string = GenerateUUIDv4();

    constructor() {
    }

    onChange() {
        this.valueChange.emit(this.value);
    }
}