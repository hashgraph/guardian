import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges, ViewEncapsulation } from '@angular/core';
import { Schema, Token } from '@guardian/interfaces';
import { IModuleVariables, PolicyBlockModel, PolicyModel, TokenTemplateVariables, TokenVariables } from 'src/app/policy-engine/structures';

/**
 * Settings for block of 'mintDocument' and 'wipeDocument' types.
 */
@Component({
    selector: 'mint-config',
    templateUrl: './mint-config.component.html',
    styleUrls: ['./mint-config.component.css'],
    encapsulation: ViewEncapsulation.Emulated
})
export class MintConfigComponent implements OnInit {
    @Input('block') currentBlock!: PolicyBlockModel;
    @Input('readonly') readonly!: boolean;
    @Output() onInit = new EventEmitter();

    private moduleVariables!: IModuleVariables | null;

    propHidden: any = {
        main: false,
    };

    block!: any;
    tokens!: TokenVariables[];
    tokenTemplate!: TokenTemplateVariables[];

    constructor() {
    }

    ngOnInit(): void {
        this.tokens = [];
        this.tokenTemplate = [];
        this.onInit.emit(this);
        this.load(this.currentBlock);
    }

    ngOnChanges(changes: SimpleChanges) {
        this.load(this.currentBlock);
    }

    load(block: PolicyBlockModel) {
        this.moduleVariables = block.moduleVariables;
        this.block = block.properties;
        this.block.uiMetaData = this.block.uiMetaData || {};

        this.tokens = this.moduleVariables?.tokens || [];
        this.tokenTemplate = this.moduleVariables?.tokenTemplates || [];
    }

    onHide(item: any, prop: any) {
        item[prop] = !item[prop];
    }

    changeAccountType() {
        delete this.block.accountId;
        delete this.block.accountIdValue;
    }

    onUseTemplateChange() {
        delete this.block.tokenId;
        delete this.block.template;
    }
}
