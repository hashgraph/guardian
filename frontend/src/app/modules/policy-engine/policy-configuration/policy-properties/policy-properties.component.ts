import {ChangeDetectorRef, Component, ElementRef, EventEmitter, Input, OnInit, Output, SimpleChanges, ViewChild} from '@angular/core';
import {IPolicyCategory, PolicyGroup, PolicyNavigationModel, PolicyNavigationStepModel, PolicyRole, PolicyTemplate, PolicyToken, PolicyTopic, SchemaVariables} from '../../structures';
import {IContract, PolicyCategoryType, PolicyStatus} from '@guardian/interfaces';

/**
 * Settings for policy.
 */
@Component({
    selector: 'policy-properties',
    templateUrl: './policy-properties.component.html',
    styleUrls: ['./policy-properties.component.scss'],
    standalone: false
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
    creatorRoleOptions: PolicyRole[] = [];
    navigationRoles: any[] = [];
    navigation: PolicyNavigationModel[] = [];
    projectSchema?: string;

    public copiedField: string = '';

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
            ...this.policy.policyRoles
                .map(item => item.name)
                .filter((name): name is string => typeof name === 'string' && name.trim().length > 0),
            'NO_ROLE',
            'OWNER'
        ];
        this.navigation = this.policy.policyNavigation;
        this.policyGroups = this.policy.policyGroups;
        this.topics = this.policy.policyTopics;
        this.tokens = this.policy.policyTokens;

        this.migrationActivityTypeSelected = [];
        this.subTypeSelected = [];

        this.policySchemas = this.policy.blockVariables?.schemas.map(schema =>
            schema.name.length || schema.value.length
                ? schema
                : new SchemaVariables('None', '')
        );
        this.projectSchema = this.policy.projectSchema &&
            this.policySchemas?.some(schema => schema.value === this.policy.projectSchema)
            ? this.policy.projectSchema
            : undefined;
        this.updateCreatorRoleOptions();

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
        this.propHidden.rolesGroup = false;
        setTimeout(() => {
            if (this.body) {
                this.body.nativeElement.scrollTop = 10000;
            }
        });
    }

    onEditRole(role: PolicyRole) {
        role.emitUpdate();
        this.updateCreatorRoleOptions();
    }

    onRemoveRole(role: PolicyRole) {
        this.policy.removeRole(role);
        this.updateCreatorRoleOptions();
        if (!this.policy.policyRoles.length) {
            this.propHidden.rolesGroup = true;
        }
    }

    addStep(role: string, index?: number) {
        if (this.readonly) {
            return;
        }
        if (index == null) {
            index = this.navigation.find((nav: PolicyNavigationModel) => nav.role === role)?.steps.length || 0
        }
        this.policy.createStep(role, index);
        this.propHidden.navigationRoles[role] = false;
        setTimeout(() => {
            if (this.body) {
                this.body.nativeElement.scrollTop = 10000;
            }
        });
    }

    onEditStep(step: PolicyNavigationStepModel) {
        step.emitUpdate();
    }

    stepDragRole: string | null = null;
    stepDragIndex: number | null = null;
    stepDropIndex: number | null = null;
    stepDropAfter: boolean = false;

    onStepDragStart(event: DragEvent, role: string, index: number) {
        if (this.readonly) {
            event.preventDefault();
            return;
        }
        this.stepDragRole = role;
        this.stepDragIndex = index;
        if (event.dataTransfer) {
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/plain', String(index));
            const row = (event.target as HTMLElement).closest('tr');
            if (row) {
                event.dataTransfer.setDragImage(row, 0, row.clientHeight / 2);
            }
        }
    }

    onStepDragOver(event: DragEvent, role: string, index: number) {
        if (this.stepDragRole !== role || this.stepDragIndex === null) {
            return;
        }
        event.preventDefault();
        if (event.dataTransfer) {
            event.dataTransfer.dropEffect = 'move';
        }
        if (index === this.stepDragIndex) {
            this.stepDropIndex = null;
            return;
        }
        this.stepDropIndex = index;
        this.stepDropAfter = this.stepDragIndex < index;
    }

    onStepDragLeave(event: DragEvent, role: string, index: number) {
        const next = event.relatedTarget as HTMLElement | null;
        if (next && next.closest && next.closest('tr.stepRow, tr.propRow')) {
            return;
        }
        if (this.stepDragRole === role && this.stepDropIndex === index) {
            this.stepDropIndex = null;
        }
    }

    onStepDrop(event: DragEvent, role: string, index: number) {
        if (this.stepDragRole !== role || this.stepDragIndex === null) {
            return;
        }
        event.preventDefault();
        const from = this.stepDragIndex;
        if (index !== from) {
            this.moveStep(role, from, index);
        }
        this.onStepDragEnd();
    }

    onStepDragEnd() {
        this.stepDragRole = null;
        this.stepDragIndex = null;
        this.stepDropIndex = null;
        this.stepDropAfter = false;
    }

    private moveStep(role: string, from: number, to: number) {
        const nav = this.navigation.find((item: PolicyNavigationModel) => item.role === role);
        if (!nav || !nav.steps[from]) {
            return;
        }
        const flags = nav.steps.map((item, i) => this.propHidden.navigationSteps[role + i]);
        const [movedFlag] = flags.splice(from, 1);
        flags.splice(to, 0, movedFlag);
        this.policy.moveStep(role, from, to);
        nav.steps.forEach((item, i) => {
            this.propHidden.navigationSteps[role + i] = flags[i];
        });
    }

    onRemoveStep(role: string, step: PolicyNavigationStepModel) {
        if (this.readonly) {
            return;
        }
        this.policy.removeStep(role, step);
        const navigation = this.policy.policyNavigation.find((nav: PolicyNavigationModel) => nav.role === role);
        if (!navigation?.steps.length) {
            this.propHidden.navigationRoles[role] = true;
        }
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

    getCreatorRoleSelection(group: PolicyGroup): string | undefined {
        return this.creatorRoleOptions.some(role => role.name === group.creator)
            ? group.creator
            : undefined;
    }

    private updateCreatorRoleOptions(): void {
        this.creatorRoleOptions = this.policy.policyRoles.filter(role => role.name.trim().length > 0);
    }

    public copyValue(field: string, value: string | undefined, event?: Event): void {
        event?.stopPropagation();
        if (!value) {
            return;
        }
        navigator.clipboard.writeText(value);
        this.copiedField = field;
        setTimeout(() => {
            if (this.copiedField === field) {
                this.copiedField = '';
            }
        }, 1500);
    }

    public statusVariant(status: string | undefined): string {
        switch (status) {
            case PolicyStatus.DRY_RUN:
                return 'dryrun';
            case PolicyStatus.PUBLISH:
                return 'published';
            case PolicyStatus.DRAFT:
            case PolicyStatus.PUBLISH_ERROR:
                return 'draft';
            default:
                return 'demo';
        }
    }

    public statusLabel(status: string | undefined): string {
        switch (status) {
            case PolicyStatus.DRAFT:
                return 'Draft';
            case PolicyStatus.DRY_RUN:
                return 'Dry Run';
            case PolicyStatus.PUBLISH:
                return 'Published';
            case PolicyStatus.PUBLISH_ERROR:
                return 'Publish Error';
            case PolicyStatus.DEMO:
                return 'Demo';
            case PolicyStatus.DISCONTINUED:
                return 'Discontinued';
            case PolicyStatus.VIEW:
                return 'View';
            default:
                return status || '';
        }
    }
}
