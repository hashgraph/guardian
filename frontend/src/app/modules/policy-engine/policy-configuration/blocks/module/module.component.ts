import { Component, EventEmitter, Inject, Input, OnInit, Output, SimpleChanges, ViewEncapsulation } from '@angular/core';
import {
    GroupVariables,
    IModuleVariables,
    PolicyBlockModel,
    PolicyModuleModel,
    RoleVariables,
    SchemaVariables,
    TokenTemplateVariables,
    TokenVariables,
    TopicVariables
} from '../../../structures';
import { GET_SCHEMA_NAME } from 'src/app/injectors/get-schema-name.injector';

/**
 * Settings for block of 'policyRolesBlock' type.
 */
@Component({
    selector: 'module',
    templateUrl: './module.component.html',
    styleUrls: ['./module.component.css'],
    encapsulation: ViewEncapsulation.Emulated
})
export class ModuleComponent implements OnInit {
    @Input('block') currentBlock!: PolicyBlockModel;
    @Input('readonly') readonly!: boolean;
    @Output() onInit = new EventEmitter();

    private moduleVariables!: IModuleVariables | null;
    private item!: PolicyBlockModel;

    propHidden: any = {
        main: false
    };

    properties!: any;
    variables!: any[];
    schemas!: SchemaVariables[];
    tokens!: TokenVariables[];
    tokenTemplate!: TokenTemplateVariables[];
    topics!: TopicVariables[];
    roles!: RoleVariables[];
    groups!: GroupVariables[];
    variablesHidden = [];

    constructor(
        @Inject(GET_SCHEMA_NAME)
        public getSchemaName: (
            name?: string,
            version?: string,
            status?: string
        ) => string,
    ) {}

    ngOnInit(): void {
        this.schemas = [];
        this.tokens = [];
        this.tokenTemplate = [];
        this.topics = [];
        this.roles = [];
        this.groups = [];
        this.variables = [];
        this.onInit.emit(this);
        this.load(this.currentBlock as any);
    }

    ngOnChanges(changes: SimpleChanges) {
        this.load(this.currentBlock as any);
    }

    load(block: PolicyModuleModel) {
        this.moduleVariables = block.moduleVariables;
        this.schemas = this.moduleVariables?.schemas || [];
        this.tokens = this.moduleVariables?.tokens || [];
        this.tokenTemplate = this.moduleVariables?.tokenTemplates || [];
        this.topics = this.moduleVariables?.topics || [];
        this.roles = this.moduleVariables?.roles || [];
        this.groups = this.moduleVariables?.groups || [];

        this.properties = block.properties;
        this.variables = [];
        if (Array.isArray(block.variables)) {
            for (const item of block.variables) {
                const key = (item.name || '').replace(/ /ig, '_');
                this.variables.push({
                    key,
                    type: item.type,
                    name: item.name,
                    description: item.description,
                    value: this.properties[key]
                })
            }
        }
    }

    onHide(item: any, prop: any) {
        item[prop] = !item[prop];
    }

    selectTopic(event: any, item: any) {
        if (event.value === 'new') {
            const name = this.moduleVariables?.module?.createTopic({
                description: '',
                type: 'any',
                static: false
            });
            this.properties[item.key] = name;
        }
    }

    onSave() {
        this.item.changed = true;
    }
}
