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
    @Input('blocks') blocks!: PolicyBlockModel[];
    @Input('readonly') readonly!: boolean;
    @Input('value') value: string | PolicyBlockModel | null | undefined;
    @Input('type') type!: string;
    @Output('valueChange') valueChange = new EventEmitter<any>();
    @Output('change') change = new EventEmitter<any>();

    data?: any[];
    text: string | null | undefined;

    constructor(private registeredService: RegisteredService) {
    }

    onChange() {
        if (this.value && typeof this.value === 'object') {
            this.text === this.value.tag;
        } else {
            this.text = this.value;
        }
        this.valueChange.emit(this.value);
        this.change.emit();
    }

    ngOnChanges(changes: SimpleChanges) {
        if (this.value && typeof this.value === 'object') {
            this.text === this.value.tag;
        } else {
            this.text = this.value;
        }
        setTimeout(() => {
            this.data = [];
            if (this.blocks) {
                for (const block of this.blocks) {
                    this.data.push({
                        name: block.tag,
                        value: this.type === 'object' ? block : block.tag,
                        icon: this.registeredService.getIcon(block.blockType)
                    });
                }
            }
        }, 0);
    }
}