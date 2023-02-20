import { Component, EventEmitter, Inject, Input, Output, SimpleChanges } from '@angular/core';
import { RegisteredService } from '../../registered-service/registered.service';
import { PolicyBlockModel } from '../../structures';

/**
 * SelectBlock.
 */
@Component({
    selector: 'select-block',
    templateUrl: './select-block.component.html',
    styleUrls: ['./select-block.component.css']
})
export class SelectBlock {
    @Input('blocks') allBlocks!: PolicyBlockModel[];
    @Input('readonly') readonly!: boolean;

    @Input('value') value!: any;
    @Output('valueChange') valueChange = new EventEmitter<any>();

    data?:any[];

    constructor(private registeredService: RegisteredService) {
    }

    onChange() {
        this.valueChange.emit(this.value);
    }

    ngOnChanges(changes: SimpleChanges) {
        setTimeout(() => {
            if(this.allBlocks) {
                this.data = this.allBlocks.map(block => {
                    return {
                        name: block.tag,
                        value: block.tag,
                        icon: this.registeredService.getIcon(block.blockType)
                    }
                });
            } else {
                this.data = [];
            }
        }, 0);
    }
}