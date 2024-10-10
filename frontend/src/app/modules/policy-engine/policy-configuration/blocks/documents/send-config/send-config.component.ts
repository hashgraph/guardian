import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges, ViewEncapsulation } from '@angular/core';
import { IModuleVariables, PolicyBlock, TopicVariables } from '../../../../structures';

/**
 * Settings for block of 'sendToGuardian' type.
 */
@Component({
    selector: 'send-config',
    templateUrl: './send-config.component.html',
    styleUrls: ['./send-config.component.scss'],
    encapsulation: ViewEncapsulation.Emulated
})
export class SendConfigComponent implements OnInit {
    @Input('block') currentBlock!: PolicyBlock;
    @Input('readonly') readonly!: boolean;
    @Output() onInit = new EventEmitter();

    private moduleVariables!: IModuleVariables | null;
    private item!: PolicyBlock;
    
    propHidden: any = {
        main: false,
        optionGroup: false,
        options: {}
    };

    properties!: any;
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

    load(block: PolicyBlock) {
        this.moduleVariables = block.moduleVariables;
        this.item = block;
        this.properties = block.properties;
        this.properties.uiMetaData = this.properties.uiMetaData || {};
        this.properties.options = this.properties.options || [];
        if (!this.properties.dataType && !this.properties.dataSource) {
            this.properties.dataSource = 'auto';
        }
        this.topics = this.moduleVariables?.topics || [];
    }

    onHide(item: any, prop: any) {
        item[prop] = !item[prop];
    }

    addOption() {
        this.properties.options.push({
            name: '',
            value: ''
        })
    }

    removeOption(i: number) {
        this.properties.options.splice(i, 1);
    }

    selectTopic(event: any) {
        if (event.value === 'new') {
            const name = this.moduleVariables?.module?.createTopic({
                description: '',
                type: 'any',
                static: false
            });
            this.properties.topic = name;
        }
    }

    onDataSource(event: any) {
    }
    
    onSave() {
        this.item.changed = true;
    }
}
