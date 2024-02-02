import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges } from '@angular/core';
import { IModuleVariables, PolicyBlock, TokenTemplateVariables } from '../../../../structures';


/**
 * Settings for block of 'Create Token' type.
 */
@Component({
    selector: 'create-token-config',
    templateUrl: './create-token-config.component.html',
    styleUrls: ['./create-token-config.component.scss']
})
export class CreateTokenConfigComponent implements OnInit {
    @Input('block') currentBlock!: PolicyBlock;
    @Input('readonly') readonly!: boolean;
    @Output() onInit = new EventEmitter();

    private moduleVariables!: IModuleVariables | null;
    private item!: PolicyBlock;
    
    propHidden: any = {
        main: false,
        properties: false,
    };

    properties!: any;
    tokenTemplate!: TokenTemplateVariables[];

    constructor() {
    }

    ngOnInit(): void {
        this.tokenTemplate = [];
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
        this.properties.uiMetaData = this.properties.uiMetaData || {};
        this.properties.uiMetaData.type = this.properties.uiMetaData.type || 'page';
        this.tokenTemplate = this.moduleVariables?.tokenTemplates || [];
    }

    onHide(item: any, prop: any) {
        item[prop] = !item[prop];
    }
    
    onSave() {
        this.item.changed = true;
    }
}
