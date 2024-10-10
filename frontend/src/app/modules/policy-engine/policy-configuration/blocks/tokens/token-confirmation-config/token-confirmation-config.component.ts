import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges, ViewEncapsulation } from '@angular/core';
import { IModuleVariables, PolicyBlock, TokenTemplateVariables, TokenVariables } from '../../../../structures';

/**
 * Settings for block of 'mintDocument' and 'wipeDocument' types.
 */
@Component({
    selector: 'token-confirmation-config',
    templateUrl: './token-confirmation-config.component.html',
    styleUrls: ['./token-confirmation-config.component.scss'],
    encapsulation: ViewEncapsulation.Emulated
})
export class TokenConfirmationConfigComponent implements OnInit {
    @Input('block') currentBlock!: PolicyBlock;
    @Input('readonly') readonly!: boolean;
    @Output() onInit = new EventEmitter();

    private moduleVariables!: IModuleVariables | null;
    private item!: PolicyBlock;

    propHidden: any = {
        main: false,
    };

    properties!: any;
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

    load(block: PolicyBlock) {
        this.moduleVariables = block.moduleVariables;
        this.item = block;
        this.properties = block.properties;
        this.tokens = this.moduleVariables?.tokens || [];
        this.tokenTemplate = this.moduleVariables?.tokenTemplates || [];
    }

    onHide(item: any, prop: any) {
        item[prop] = !item[prop];
    }

    onUseTemplateChange() {
        delete this.properties.tokenId;
        delete this.properties.template;
    }

    onSave() {
        this.item.changed = true;
    }
}
