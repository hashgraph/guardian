import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges, ViewEncapsulation } from '@angular/core';
import { Schema, Token } from '@guardian/interfaces';
import { IModuleVariables, PolicyBlockModel, PolicyModel } from 'src/app/policy-engine/structures';

/**
 * Settings for block of 'interfaceContainerBlock' and 'interfaceStepBlock' types.
 */
@Component({
    selector: 'container-config',
    templateUrl: './container-config.component.html',
    styleUrls: ['./container-config.component.css'],
    encapsulation: ViewEncapsulation.Emulated
})
export class ContainerConfigComponent implements OnInit {
    @Input('block') currentBlock!: PolicyBlockModel;
    @Input('readonly') readonly!: boolean;
    @Output() onInit = new EventEmitter();

    private moduleVariables!: IModuleVariables | null;

    propHidden: any = {
        main: false,
    };

    block!: any;

    constructor() {
    }

    ngOnInit(): void {
        this.onInit.emit(this);
        this.load(this.currentBlock);
    }

    ngOnChanges(changes: SimpleChanges) {
        this.load(this.currentBlock);
    }

    load(block: PolicyBlockModel) {
        this.moduleVariables = block.moduleVariables;
        this.block = block.properties;
        this.block.uiMetaData = this.block.uiMetaData || {}
        this.block.uiMetaData.type = this.block.uiMetaData.type || 'blank';
    }

    onHide(item: any, prop: any) {
        item[prop] = !item[prop];
    }
}
