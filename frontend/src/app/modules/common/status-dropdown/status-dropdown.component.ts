import { Component, EventEmitter, Input, Output, SimpleChanges } from '@angular/core';

interface IOptions {
    label: string;
    value: string;
    description: string;
    disable?: ((value: string) => boolean) | boolean;
}

/**
 * Hedera explorer.
 */
@Component({
    selector: 'status-dropdown',
    templateUrl: './status-dropdown.component.html',
    styleUrls: ['./status-dropdown.component.scss']
})
export class StatusDropdown {
    @Input('options') options!: IOptions[];
    @Input('value') value!: string;
    @Input('status') status!: string;
    @Output('valueChange') valueChange = new EventEmitter<string>();
    @Output('change') change = new EventEmitter<string>();

    public list: IOptions[] = [];
    public disabled: boolean = true;
    public label: string = '';

    constructor() { }

    ngOnChanges(changes: SimpleChanges): void {
        this.options = this.options || [];
        this.list = this.options.filter((item) => {
            if (typeof item.disable === 'function') {
                return !item.disable(this.value);
            } else {
                return !item.disable;
            }
        })
        this.disabled = this.list.length === 0;
        const item = this.options.find((item) => item.value === this.value);
        if (item) {
            this.label = item.label;
        } else {
            this.label = this.value;
        }
    }

    onChange() {
        this.valueChange.emit(this.value);
        this.change.emit(this.value)
    }
}
