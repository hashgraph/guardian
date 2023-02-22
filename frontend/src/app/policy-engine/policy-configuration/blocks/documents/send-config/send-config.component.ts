import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges, ViewEncapsulation } from '@angular/core';
import { Schema, Token } from '@guardian/interfaces';
import { IModuleVariables, PolicyBlockModel, PolicyModel, TopicVariables } from 'src/app/policy-engine/structures';

/**
 * Settings for block of 'sendToGuardian' type.
 */
@Component({
    selector: 'send-config',
    templateUrl: './send-config.component.html',
    styleUrls: ['./send-config.component.css'],
    encapsulation: ViewEncapsulation.Emulated
})
export class SendConfigComponent implements OnInit {
    @Input('block') currentBlock!: PolicyBlockModel;
    @Input('readonly') readonly!: boolean;
    @Output() onInit = new EventEmitter();

    private moduleVariables!: IModuleVariables | null;

    propHidden: any = {
        main: false,
        optionGroup: false,
        options: {}
    };

    block!: any;
    topics!: TopicVariables[];

    constructor() {
    }

    ngOnInit(): void {
        this.topics = [];
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
        this.block.options = this.block.options || [];
        if (!this.block.dataType && !this.block.dataSource) {
            this.block.dataSource = 'auto';
        }
        this.topics = this.moduleVariables?.topics || [];
    }

    onHide(item: any, prop: any) {
        item[prop] = !item[prop];
    }

    addOption() {
        this.block.options.push({
            name: '',
            value: ''
        })
    }

    removeOption(i: number) {
        this.block.options.splice(i, 1);
    }

    selectTopic(event: any) {
        if (event.value === 'new') {
            const name = this.moduleVariables?.module?.createTopic({
                description: '',
                type: 'any',
                static: false
            });
            this.block.topic = name;
        }
    }

    onDataSource(event: any) {
    }
}
