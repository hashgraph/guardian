import {
    Component,
    EventEmitter,
    Input,
    OnInit,
    Output,
    SimpleChanges,
    ViewEncapsulation
} from '@angular/core';
import {
    GroupVariables,
    IModuleVariables,
    PolicyBlock,
    PolicyModule,
    RoleVariables,
    SchemaVariables,
    TokenTemplateVariables,
    TokenVariables,
    ToolVariables,
    TopicVariables
} from '../../../structures';

/**
 * Settings for block of 'policyRolesBlock' type.
 */
@Component({
    selector: 'tool',
    templateUrl: './tool.component.html',
    styleUrls: ['./tool.component.css'],
    encapsulation: ViewEncapsulation.Emulated
})
export class ToolComponent implements OnInit {
    @Input('block') currentBlock!: PolicyBlock;
    @Input('readonly') readonly!: boolean;
    @Output() onInit = new EventEmitter();

    public propHidden: any = {
        main: false,
        tool: false
    };
    public tool!: any;
    public properties!: any;
    public variables!: any[];
    public tools!: ToolVariables[];
    public schemas!: SchemaVariables[];
    public tokens!: TokenVariables[];
    public tokenTemplate!: TokenTemplateVariables[];
    public topics!: TopicVariables[];
    public roles!: RoleVariables[];
    public groups!: GroupVariables[];
    public variablesHidden = [];

    private moduleVariables!: IModuleVariables | null;
    private item!: PolicyBlock;

    constructor(
    ) {

    }

    ngOnInit(): void {
        this.tool = {};
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

    private load(block: PolicyModule) {
        this.moduleVariables = block.moduleVariables;
        this.tools = this.moduleVariables?.tools || [];
        this.schemas = this.moduleVariables?.schemas || [];
        this.tokens = this.moduleVariables?.tokens || [];
        this.tokenTemplate = this.moduleVariables?.tokenTemplates || [];
        this.topics = this.moduleVariables?.topics || [];
        this.roles = this.moduleVariables?.roles || [];
        this.groups = this.moduleVariables?.groups || [];

        this.properties = block.properties || {};
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

        const messageId = this.properties.messageId;
        const tool = this.tools.find(t => t.messageId === messageId);
        if (tool) {
            this.tool = {
                name: tool.name,
                description: tool.description,
                owner: tool.owner,
                messageId: tool.messageId,
                hash: tool.hash,
            };
        } else {
            this.tool = {
                messageId: messageId,
            };
        }
    }

    public onHide(item: any, prop: any) {
        item[prop] = !item[prop];
    }

    public selectTopic(event: any, item: any) {
        if (event.value === 'new') {
            const name = this.moduleVariables?.module?.createTopic({
                description: '',
                type: 'any',
                static: false
            });
            this.properties[item.key] = name;
        }
    }

    public onSave() {
        this.item.changed = true;
    }
}
