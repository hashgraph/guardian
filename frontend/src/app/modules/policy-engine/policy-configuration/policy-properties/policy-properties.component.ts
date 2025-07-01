import {ChangeDetectorRef, Component, ElementRef, EventEmitter, Input, OnInit, Output, SimpleChanges, ViewChild} from '@angular/core';
import {IPolicyCategory, PolicyGroup, PolicyNavigationModel, PolicyNavigationStepModel, PolicyRole, PolicyTemplate, PolicyToken, PolicyTopic, SchemaVariables} from '../../structures';
import {IContract, PolicyCategoryType} from '@guardian/interfaces';

/**
 * Settings for policy.
 */
@Component({
    selector: 'policy-properties',
    templateUrl: './policy-properties.component.html',
    styleUrls: ['./policy-properties.component.scss']
})
export class PolicyPropertiesComponent implements OnInit {
    @Input('policy') policy!: PolicyTemplate;
    @Input('allCategories') allCategories!: any;
    @Input('policyCategories') policyCategories!: IPolicyCategory[];
    @Input('readonly') readonly!: boolean;
    @Input('type') type!: string;
    @Input('wipeContracts') wipeContracts: IContract[] = [];

    @Output() onInit = new EventEmitter();

    @ViewChild('body') body?: ElementRef;

    propHidden: any = {
        metaData: false,
        categorization: false,
        rolesGroup: false,
        navigationRoles: [],
        navigationSteps: [],
        groupsGroup: {},
        topicsGroup: {},
        tokensGroup: {}
    };
    policyGroups: PolicyGroup[] = [];
    topics: PolicyTopic[] = [];
    tokens: PolicyToken[] = [];
    roles: any[] = [];
    navigationRoles: any[] = [];
    navigation: PolicyNavigationModel[] = [];
    projectSchema: string;

    policySchemas: SchemaVariables[] | undefined = [];

    PolicyCategoryType = PolicyCategoryType;

    sectoralScopeOptions: IPolicyCategory[] = [];
    projectScaleOptions: IPolicyCategory[] = [];
    appliedTechnologyTypeOptions: IPolicyCategory[] = [];
    migrationActivityTypeOptions: IPolicyCategory[] = [];
    subTypeOptions: IPolicyCategory[] = [];

    sectoralScopeSelected: IPolicyCategory | undefined;
    projectScaleSelected: IPolicyCategory | undefined;
    appliedTechnologyTypeSelected: IPolicyCategory | undefined;
    migrationActivityTypeSelected: IPolicyCategory[] = [];
    subTypeSelected: IPolicyCategory[] = [];

    public groupAccessTypeOptions = [
        {label: 'Private', value: 'Private'},
        {label: 'Global', value: 'Global'}
    ];

    public groupDocumentOptions = [
        {label: 'Any', value: 'any'},
        {label: 'VC', value: 'vc'},
        {label: 'VP', value: 'vp'}
    ];

    public memoObjOptions = [
        {label: 'Topic Config', value: 'topic'},
        {label: 'Document', value: 'doc'}
    ];

    public groupRelationshipTypeOptions = [
        {label: 'Single', value: 'Single'},
        {label: 'Multiple', value: 'Multiple'}
    ];

    public tokenTypeOptions = [
        {label: 'To be specified by user', value: null},
        {label: 'Non Fungible', value: 'non-fungible'},
        {label: 'Fungible', value: 'fungible'}
    ];

    public enableAdminOptions = [
        {label: 'To be specified by user', value: null},
        {label: 'Yes', value: true},
        {label: 'No', value: false}
    ];

    public enableFreezeOptions = [
        {label: 'To be specified by user', value: null},
        {label: 'Yes', value: true},
        {label: 'No', value: false}
    ];

    public enableWipeOptions = [
        {label: 'To be specified by user', value: null},
        {label: 'Yes', value: true},
        {label: 'No', value: false}
    ];

    public enableKYCOptions = [
        {label: 'To be specified by user', value: null},
        {label: 'Yes', value: true},
        {label: 'No', value: false}
    ];

    constructor(private cd: ChangeDetectorRef) {
    }

    ngOnInit(): void {
        this.onInit.emit(this);
    }

    ngOnDestroy(): void {
        this.onInit.complete();
    }

    ngOnChanges(changes: SimpleChanges) {
        this.roles = this.policy.policyRoles;
        this.navigationRoles = [
            ...this.policy.policyRoles.map(item => item.name),
            'NO_ROLE',
            'OWNER'
        ];
        this.navigation = this.policy.policyNavigation;
        this.policyGroups = this.policy.policyGroups;
        this.topics = this.policy.policyTopics;
        this.tokens = this.policy.policyTokens;
        this.projectSchema = this.policy.projectSchema;

        this.migrationActivityTypeSelected = [];
        this.subTypeSelected = [];

        this.policySchemas = this.policy.blockVariables?.schemas;

        this.policyCategories?.forEach((cat) => {
            if (cat.type === PolicyCategoryType.SECTORAL_SCOPE) {
                this.sectoralScopeSelected = cat;
            }
            if (cat.type === PolicyCategoryType.PROJECT_SCALE) {
                this.projectScaleSelected = cat;
            }
            if (cat.type === PolicyCategoryType.APPLIED_TECHNOLOGY_TYPE) {
                this.appliedTechnologyTypeSelected = cat;
            }
            if (cat.type === PolicyCategoryType.MITIGATION_ACTIVITY_TYPE) {
                this.migrationActivityTypeSelected.push(cat);
            }
            if (cat.type === PolicyCategoryType.SUB_TYPE) {
                this.subTypeSelected.push(cat);
            }
        })
    }

    onCategoriesChanged(): void {
        const allSelectedCategories = [...this.migrationActivityTypeSelected, ...this.subTypeSelected];
        if (this.sectoralScopeSelected) {
            allSelectedCategories.push(this.sectoralScopeSelected);
        }
        if (this.projectScaleSelected) {
            allSelectedCategories.push(this.projectScaleSelected);
        }
        if (this.appliedTechnologyTypeSelected) {
            allSelectedCategories.push(this.appliedTechnologyTypeSelected);
        }

        let selectedCategoryIds: string[] = allSelectedCategories.map(cat => cat.id);
        this.policy.setCategories(selectedCategoryIds);
    }

    onHide(item: any, prop: any) {
        if (!item) {
            item = {}
        }
        item[prop] = !item[prop];
    }

    addGroup() {
        this.policy.createGroup();
        setTimeout(() => {
            if (this.body) {
                this.body.nativeElement.scrollTop = 10000;
            }
        });
    }

    onEditGroup(group: PolicyGroup) {
        group.emitUpdate();
    }

    onRemoveGroup(group: PolicyGroup) {
        this.policy.removeGroup(group)
    }

    addRoles() {
        this.policy.createRole('');
        setTimeout(() => {
            if (this.body) {
                this.body.nativeElement.scrollTop = 10000;
            }
        });
    }

    onEditRole(role: PolicyRole) {
        role.emitUpdate();
    }

    onRemoveRole(role: PolicyRole) {
        this.policy.removeRole(role)
    }

    addStep(role: string, index?: number) {
        if (index == null) {
            index = this.navigation.find((nav: PolicyNavigationModel) => nav.role === role)?.steps.length || 0
        }
        this.policy.createStep(role, index);
        setTimeout(() => {
            if (this.body) {
                this.body.nativeElement.scrollTop = 10000;
            }
        });
    }

    onEditStep(step: PolicyNavigationStepModel) {
        step.emitUpdate();
    }

    onRemoveStep(role: string, step: PolicyNavigationStepModel) {
        this.policy.removeStep(role, step)
    }

    addTopic() {
        this.policy.createTopic({
            name: '',
            description: '',
            type: 'any',
            static: false
        });
    }

    onRemoveTopic(topic: PolicyTopic) {
        this.policy.removeTopic(topic)
    }

    setProjectSchema(value: string) {
        this.policy.setProjectSchema(value);
        setTimeout(() => {
            if (this.body) {
                this.body.nativeElement.scrollTop = 10000;
            }
        });
    }

    addToken() {
        this.policy.createToken({
            templateTokenTag: `token_template_${this.tokens.length}`,
            tokenName: '',
            tokenSymbol: '',
            decimals: ''
        });
    }

    onRemoveToken(topic: PolicyToken) {
        this.policy.removeToken(topic)
    }

    onTokenTypeChange(item: any) {
        item.decimals = '';
    }

    onEnableWipeChange(template: PolicyToken) {
        if (template.enableWipe !== true) {
            template.wipeContractId = undefined;
        }
    }

    getWipeContractOptions() {
        return [
            {label: 'To be specified by user', value: null},
            {label: 'Empty', value: ''},
            ...this.wipeContracts.map(contract => ({
                label: `${contract.contractId} (${contract.description})`,
                value: contract.contractId
            }))
        ];
    }
}
