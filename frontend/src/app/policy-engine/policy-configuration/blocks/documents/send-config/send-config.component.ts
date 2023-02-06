import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges, ViewEncapsulation } from '@angular/core';
import { Schema, Token } from '@guardian/interfaces';
import { PolicyBlockModel, PolicyModel } from 'src/app/policy-engine/structures/policy-model';

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
    @Input('policy') policy!: PolicyModel;
    @Input('block') currentBlock!: PolicyBlockModel;
    @Input('schemas') schemas!: Schema[];
    @Input('tokens') tokens!: Token[];
    @Input('readonly') readonly!: boolean;
    @Output() onInit = new EventEmitter();

    propHidden: any = {
        main: false,
        optionGroup: false,
        options: {}
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
        this.block = block.properties;
        this.block.uiMetaData = this.block.uiMetaData || {};
        this.block.options = this.block.options || [];
        if (this.block.dataSource === 'database') {
            if (this.block.forceNew === true) {
                this.block.operation = 'create';
            } else if (!this.block.operation) {
                this.block.operation = 'update';
            }
            delete this.block.forceNew;
            if (this.block.operation == 'update') {
                if (!this.block.updateBy) {
                    this.block.updateBy = 'hash';
                }
            }
        }
        if (!this.block.dataType && !this.block.dataSource) {
            this.block.dataSource = 'auto';
        }
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
            const name = `New Topic ${this.policy.policyTopics.length}`;
            this.policy.createTopic({
                name: name,
                description: '',
                type: 'any',
                static: false
            });
            this.block.topic = name;
        }
    }

    onDataSource(event: any) {
        if (this.block.dataSource === 'database') {
            if (!this.block.operation) {
                this.block.operation = 'update';
            }
            if (this.block.operation == 'update') {
                if (!this.block.updateBy) {
                    this.block.updateBy = 'hash';
                }
            }
        }
    }
}
