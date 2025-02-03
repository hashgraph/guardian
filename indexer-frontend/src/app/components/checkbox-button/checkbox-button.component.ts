import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'checkbox-button',
    templateUrl: './checkbox-button.component.html',
    styleUrl: './checkbox-button.component.scss',
    standalone: true,
    imports: [
        CommonModule
    ]
})
export class CheckboxButton {
    @Input('value') value!: boolean;
    @Output('valueChange') valueChange = new EventEmitter<boolean>();
    @Output('change') change = new EventEmitter<boolean>();

    constructor() {
    }

    ngOnInit(): void {
        this.value = !!this.value;
    }

    public onChange() {
        this.value = !this.value;
        this.valueChange.emit(this.value);
        this.change.emit(this.value);
    }
}
