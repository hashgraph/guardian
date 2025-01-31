import { ChangeDetectorRef, Component, EventEmitter, Input, Output, SimpleChanges } from '@angular/core';

interface IOptions {
    label: string;
    value: string;
    description: string;
    disable?: ((value: string, item?: any) => boolean) | boolean;
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
    @Input('item') item!: any;
    @Input('options') options!: IOptions[];
    @Input('status') status!: string;
    @Output('onChange') change = new EventEmitter<string>();

    public list: IOptions[] = [];
    public disabled: boolean = true;
    public label: string = '';

    constructor(
        private cdRef: ChangeDetectorRef,
    ) { }

    ngOnChanges(changes: SimpleChanges): void {
        this.options = this.options || [];
        this.list = this.options.filter((item) => {
            if (typeof item.disable === 'function') {
                return !item.disable(this.status, this.item);
            } else {
                return !item.disable;
            }
        })
        this.disabled = this.list.length === 0;
        const item = this.options.find((item) => item.value === this.status);
        if (item) {
            this.label = item.label;
        } else {
            this.label = this.status;
        }
    }

    onChange($event: any, dropdown: any) {
        if($event.value) {
            this.change.emit($event.value);
            dropdown.clear();
        }
    }
}
