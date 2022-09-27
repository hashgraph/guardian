import { Component, EventEmitter, Inject, Input, Output, SimpleChanges } from '@angular/core';

/**
 * SelectBlock.
 */
@Component({
    selector: 'select-block',
    templateUrl: './select-block.component.html',
    styleUrls: ['./select-block.component.css']
})
export class SelectBlock {
    @Input('blocks') allBlocks!: any[];
    @Input('readonly') readonly!: boolean;

    @Input('value') value!: any;
    @Output('valueChange') valueChange = new EventEmitter<any>();

    data?:any[];

    constructor() {
    }

    onChange() {
        this.valueChange.emit(this.value);
    }

    ngOnChanges(changes: SimpleChanges) {
        setTimeout(() => {
            this.data = this.allBlocks;
        }, 0);
    }
}