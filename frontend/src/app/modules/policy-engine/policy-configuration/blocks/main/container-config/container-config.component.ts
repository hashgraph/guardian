import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges, ViewEncapsulation } from '@angular/core';
import { IModuleVariables, PolicyBlock } from '../../../../structures';

/**
 * Settings for block of 'interfaceContainerBlock' and 'interfaceStepBlock' types.
 */
@Component({
    selector: 'container-config',
    templateUrl: './container-config.component.html',
    styleUrls: ['./container-config.component.scss'],
    encapsulation: ViewEncapsulation.Emulated
})
export class ContainerConfigComponent implements OnInit {
    @Input('block') currentBlock!: PolicyBlock;
    @Input('readonly') readonly!: boolean;
    @Output() onInit = new EventEmitter();

    private moduleVariables!: IModuleVariables | null;
    private item!: PolicyBlock;

    propHidden: any = {
        main: false,
    };

    properties!: any;

    constructor() {
    }

    ngOnInit(): void {
        this.onInit.emit(this);
        this.load(this.currentBlock);
    }

    ngOnChanges(changes: SimpleChanges) {
        this.load(this.currentBlock);
    }

    load(block: PolicyBlock) {
        this.moduleVariables = block.moduleVariables;
        this.item = block;
        this.properties = block.properties;
        this.properties.uiMetaData = this.properties.uiMetaData || {}
        this.properties.uiMetaData.type = this.properties.uiMetaData.type || 'blank';
    }

    onHide(item: any, prop: any) {
        item[prop] = !item[prop];
    }

    onSave() {
        this.item.changed = true;
    }
}
