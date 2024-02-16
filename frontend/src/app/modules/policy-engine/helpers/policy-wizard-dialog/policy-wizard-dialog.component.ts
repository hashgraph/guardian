import {
    AfterViewInit,
    ChangeDetectorRef,
    Component,
    Inject,
    OnInit,
    TemplateRef,
    ViewChild,
} from '@angular/core';
import {
    Validators,
    FormBuilder,
    FormControl,
    FormGroup,
    FormArray,
    AbstractControl,
} from '@angular/forms';
import {
    IWizardConfig,
    Schema,
    SchemaField,
    Token,
} from '@guardian/interfaces';
import { Subject } from 'rxjs';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { takeUntil } from 'rxjs/operators';
import { SeparateStepperComponent } from 'src/app/modules/common/separate-stepper/separate-stepper.component';
import { GET_SCHEMA_NAME } from 'src/app/injectors/get-schema-name.injector';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { IPolicyCategory } from '../../structures';
import { PolicyEngineService } from '../../../../services/policy-engine.service';
import { PolicyCategoryType } from '@guardian/interfaces';

@Component({
    selector: 'app-policy-wizard-dialog',
    templateUrl: './policy-wizard-dialog.component.html',
    styleUrls: ['./policy-wizard-dialog.component.scss'],
})
export class PolicyWizardDialogComponent implements OnInit, AfterViewInit {
    @ViewChild(SeparateStepperComponent) matTree!: SeparateStepperComponent;
    @ViewChild('policyDescriptionForm', { read: TemplateRef })
    policyDescriptionFormTemp: any;
    @ViewChild('policyRoles', { read: TemplateRef }) policyRoles: any;
    @ViewChild('policySchemas', { read: TemplateRef }) policySchemas: any;
    @ViewChild('schemaConfig', { read: TemplateRef }) schemaConfig: any;
    @ViewChild('schemaRoleConfig', { read: TemplateRef }) schemaRoleConfig: any;
    @ViewChild('trustChainConfig', { read: TemplateRef }) trustChainConfig: any;
    @ViewChild('trustChainRoleConfig', { read: TemplateRef })
    trustChainRoleConfig: any;

    tokens!: Token[];
    schemas!: Schema[];
    policies!: any[];
    groupedSchemas: {
        name: string;
        schemas: Schema[];
    }[] = [];
    selectedSchemas: Schema[] = [];
    mintedSchemas: Schema[] = [];
    selectedTrustChainRoles: string[] = [];
    loading: boolean = false;

    policyForm = this.fb.group({
        name: ['', Validators.required],
        sectoralScope: new FormControl({
            value: '',
            disabled: this.loading,
        }),
        projectScale: new FormControl({
            value: '',
            disabled: this.loading,
        }),
        applicabilityConditions: [''],
        detailsUrl: [''],
        policyTag: [`Tag_${Date.now()}`, Validators.required],
        typicalProjects: [''],
        topicDescription: [''],
        description: [''],
        appliedTechnologyType: new FormControl({
            value: '',
            disabled: this.loading,
        }),
        migrationActivityType: new FormControl({
            value: [],
            disabled: this.loading,
        }),
        subType: new FormControl({value: [], disabled: this.loading}),
        atValidation: [''],
        monitored: [''],
    });
    policyRolesForm = this.fb.control(['OWNER']);
    policySchemasForm = this.fb.array([]);
    trustChainForm = this.fb.array([]);

    dataForm: FormGroup = this.fb.group({
        policy: this.policyForm,
        roles: this.policyRolesForm,
        schemas: this.policySchemasForm,
        trustChain: this.trustChainForm,
    });

    categories: IPolicyCategory[] = [];

    appliedTechnologyTypeOptions: IPolicyCategory[] = [];
    migrationActivityTypeOptions: IPolicyCategory[] = [];
    projectScaleOptions: IPolicyCategory[] = [];
    sectoralScopeOptions: IPolicyCategory[] = [];
    subTypeOptions: IPolicyCategory[] = [];

    treeData: any;
    currentNode: any;

    destroy$: Subject<boolean> = new Subject<boolean>();

    preset: any;

    constructor(
        private fb: FormBuilder,
        private cdRef: ChangeDetectorRef,
        @Inject(GET_SCHEMA_NAME)
        public getSchemaName: (
            name?: string,
            version?: string,
            status?: string
        ) => string,
        public ref: DynamicDialogRef,
        public config: DynamicDialogConfig,
        private policyEngineService: PolicyEngineService
    ) {
        this.schemas = this.config.data?.schemas || [];
        this.policies = this.config.data?.policies || [];
        this.groupedSchemas = this.mapGroupedSchemas(
            this.groupSchemasByTopics(this.schemas),
            this.policies,
            this.config.data?.policy
        );

        for (const group of this.groupedSchemas) {
            (group as any).label = group.name;
            (group as any).items = [];
            if (group.schemas && group.schemas.length) {
                for (const schema of group.schemas) {
                    (group as any).items.push({
                        label: schema.name,
                        value: schema,
                    });
                }
            }
        }

        if (this.config.data?.policy) {
            this.policyForm.patchValue(
                {
                    name: this.config.data?.policy.name,
                    sectoralScope: this.config.data?.policy.sectoralScope,
                    projectScale: this.config.data?.policy.projectScale,
                    applicabilityConditions: this.config.data?.policy.applicabilityConditions,
                    detailsUrl: this.config.data?.policy.detailsUrl,
                    policyTag: this.config.data?.policy.policyTag,
                    typicalProjects: this.config.data?.policy.typicalProjects,
                    topicDescription: this.config.data?.policy.topicDescription,
                    description: this.config.data?.policy.description,
                    appliedTechnologyType: this.config.data?.policy.appliedTechnologyType,
                    migrationActivityType: this.config.data?.policy.migrationActivityType,
                    subType: this.config.data?.policy.subType,
                    atValidation: this.config.data?.policy.atValidation,
                    monitored: this.config.data?.policy.monitored,
                }
                //     {
                //     name: this.config.data?.policy.name,
                //     description: this.config.data?.policy.description,
                //     policyTag: this.config.data?.policy.policyTag,
                //     topicDescription: this.config.data?.policy.topicDescription,
                // }
            );
            this.policyForm.get('policyTag')?.disable();
        }
        this.tokens = this.config.data?.tokens || [];
        this.preset = this.config.data?.state || [];

        this.loading = true;
        this.policyEngineService
            .getPolicyCategories()
            .subscribe((data: any) => {
                this.loading = false;
                this.categories = data;

                this.categories.forEach((item: IPolicyCategory) => {
                    switch (item.type) {
                        case PolicyCategoryType.APPLIED_TECHNOLOGY_TYPE:
                            this.appliedTechnologyTypeOptions.push(item);
                            break;
                        case PolicyCategoryType.MITIGATION_ACTIVITY_TYPE:
                            this.migrationActivityTypeOptions.push(item);
                            break;
                        case PolicyCategoryType.PROJECT_SCALE:
                            this.projectScaleOptions.push(item);
                            break;
                        case PolicyCategoryType.SECTORAL_SCOPE:
                            this.sectoralScopeOptions.push(item);
                            break;
                        case PolicyCategoryType.SUB_TYPE:
                            this.subTypeOptions.push(item);
                            break;

                        default:
                            break;
                    }
                });

                this.updateFormControlState();
            });
    }

    updateFormControlState() {
        if (this.loading) {
            this.dataForm.get('sectoralScope')?.disable();
            this.dataForm.get('projectScale')?.disable();
            this.dataForm.get('appliedTechnologyType')?.disable();
            this.dataForm.get('migrationActivityType')?.disable();
            this.dataForm.get('subType')?.disable();
        } else {
            this.dataForm.get('sectoralScope')?.enable();
            this.dataForm.get('projectScale')?.enable();
            this.dataForm.get('appliedTechnologyType')?.enable();
            this.dataForm.get('migrationActivityType')?.enable();
            this.dataForm.get('subType')?.enable();
        }
    }

    private mapGroupedSchemas(
        groupedSchemasByTopic: any,
        policies: any[],
        policy?: any
    ) {
        const mappedSchemas = policy
            ? [
                  {
                      name:
                          policy.name +
                          (policy.version ? ' (' + policy.version + ')' : ''),
                      schemas: groupedSchemasByTopic[policy?.topicId],
                  },
                  {
                      name: 'Draft schemas',
                      schemas: groupedSchemasByTopic['draft'],
                  },
              ]
            : [
                  {
                      name: 'Draft schemas',
                      schemas: groupedSchemasByTopic['draft'],
                  },
              ];
        for (const group of Object.entries(groupedSchemasByTopic)) {
            if (
                group[0] &&
                group[0] !== 'draft' &&
                group[0] !== policy?.topicId
            ) {
                const policy = policies.find(
                    (policy) => policy.topicId === group[0]
                );
                if (!policy) {
                    continue;
                }
                mappedSchemas.push({
                    name:
                        policy.name +
                        (policy.version ? ' (' + policy.version + ')' : ''),
                    schemas: group[1] as Schema[],
                });
            }
        }
        return mappedSchemas;
    }

    private groupSchemasByTopics(schemas: Schema[]) {
        return this.schemas.reduce((group: any, schema: any) => {
            const { topicId } = schema;
            group[topicId] = group[topicId] ?? [];
            group[topicId].push(schema);
            return group;
        }, {});
    }

    ngOnInit() {}

    ngAfterViewInit() {
        const schemasNode = {
            id: '3',
            name: 'Policy Schemas',
            template: this.policySchemas,
            icon: 'description',
            children: [],
        };
        const trustChainNode = {
            id: '4',
            name: 'Trust Chain',
            control: this.trustChainForm,
            template: this.trustChainConfig,
            icon: 'link',
            children: [],
        };
        this.treeData = {
            name: 'Wizard Configuration',
            children: [
                {
                    id: '1',
                    name: 'Policy Description',
                    template: this.policyDescriptionFormTemp,
                    control: this.policyForm,
                    icon: 'settings',
                    children: [],
                },
                {
                    id: '2',
                    name: 'Policy Roles',
                    control: this.policyRolesForm,
                    template: this.policyRoles,
                    icon: 'groups',
                    children: [],
                },
                schemasNode,
                trustChainNode,
            ],
        };
        this.setParents(this.treeData);
        this.currentNode = this.treeData.children[0];
        if (this.preset) {
            this.loadData(
                this.preset.data,
                schemasNode,
                trustChainNode,
                this.preset.currentNode
            );
        }
        this.cdRef.detectChanges();
    }

    loadData(
        data: IWizardConfig,
        schemasNode: any,
        trustChainNode: any,
        currentNodeId?: string
    ) {
        if (!data) {
            return;
        }
        if (data.schemas) {
            const selectedSchemasIris = data.schemas.map((item) => item.iri);
            this.selectedSchemas = this.schemas.filter((item) =>
                selectedSchemasIris.includes(item.iri as any)
            );
            for (const schemaConfig of data.schemas) {
                const schema: any = this.schemas.find(
                    (item) => item.iri === schemaConfig.iri
                );
                const schemaNode: any = this.onSelectedSchemaChange(
                    schema,
                    schemasNode,
                    schemaConfig.rolesConfig.map((item: any) => item.role)
                );
                for (const roleConfig of schemaConfig.rolesConfig) {
                    const schemaRoleConfigControl = schemaNode.control.get(
                        'rolesConfig'
                    ) as FormArray;
                    const initialRolesForControl: any = schemaNode.control.get(
                        'initialRolesFor'
                    );

                    const isApproveEnableControl: any = schemaNode.control.get(
                        'isApproveEnable'
                    );
                    const dependencySchemaControl: any = schemaNode.control.get(
                        'dependencySchemaIri'
                    );
                    this.onSchemaRoleConfigChange(
                        roleConfig.role,
                        schema.fields,
                        schemaRoleConfigControl,
                        initialRolesForControl,
                        isApproveEnableControl,
                        dependencySchemaControl,
                        schemaNode
                    );
                }
            }
        }
        if (data.trustChain) {
            this.selectedTrustChainRoles = data.trustChain.map(
                (item) => item.role
            );
            for (const trustChainConfig of data.trustChain) {
                this.onSelectedTrustChainRoleChange(
                    trustChainConfig.role,
                    trustChainNode
                );
            }
        }
        this.dataForm.patchValue({
            roles: data.roles,
            schemas: data.schemas,
            trustChain: data.trustChain,
        });
        const currentNode = this.findCurrentNode(
            this.treeData,
            currentNodeId?.split('.')
        );
        if (currentNode && currentNode !== this.treeData) {
            this.currentNode = currentNode;
        }
    }

    findCurrentNode(node: any, indexes: string[] = []) {
        if (!Array.isArray(indexes)) {
            return node;
        }
        let result = node;
        for (const index of indexes) {
            result = result.children[+index - 1];
        }
        return result;
    }

    handlePrevClick() {
        this.matTree.onPrevClick();
    }

    handleNextClick() {
        this.matTree.onNextClick();
    }

    setParents(root: any) {
        root.children?.forEach((child: any) => {
            child.parent = root;
            this.setParents(child);
        });
    }

    onSchemaRolesConfigChange(
        schemaConfigControl: FormGroup,
        roles: string[],
        fields: any[],
        options: any
    ) {
        const schemaRoleConfigControl = schemaConfigControl.get(
            'rolesConfig'
        ) as FormArray;
        const deletedRoles = options.displayedInRoles.filter(
            (displayedRole: any) => !roles.includes(displayedRole)
        );
        this.currentNode.children =
            this.currentNode.children.filter(
                (roleSchemaNode: any) =>
                    !deletedRoles.find(
                        (deletedRole: string) =>
                            roleSchemaNode.role === deletedRole
                    )
            ) || [];
        this.deleteControlsFromFormArray(
            schemaRoleConfigControl,
            schemaRoleConfigControl.controls.filter((control) =>
                deletedRoles.find(
                    (deletedRole: string) => control.value?.role === deletedRole
                )
            )
        );

        const addedRoles = roles.filter(
            (existingRole: any) =>
                !options.displayedInRoles.includes(existingRole)
        );
        const initialRolesForControl: any = schemaConfigControl.get(
            'initialRolesFor'
        );

        const isApproveEnableControl: any = schemaConfigControl.get(
            'isApproveEnable'
        );
        const dependencySchemaControl: any = schemaConfigControl.get(
            'dependencySchemaIri'
        );
        for (const role of addedRoles) {
            this.onSchemaRoleConfigChange(
                role,
                fields,
                schemaRoleConfigControl,
                initialRolesForControl,
                isApproveEnableControl,
                dependencySchemaControl,
                this.currentNode
            );
        }

        options.displayedInRoles = roles;
        this.matTree.refreshTree();
    }

    onSchemaRoleConfigChange(
        role: string,
        fields: SchemaField[],
        schemaRoleConfigControl: FormArray,
        initialRolesForControl: FormControl,
        isApproveEnableControl: FormControl,
        dependencySchemaControl: FormControl,
        node: any
    ) {
        const dependencySchema = this.selectedSchemas.find(
            (item) => item.iri === dependencySchemaControl?.value
        );
        const newNode: any = {
            id: `${node.id}.${node.children.length + 1}`,
            icon: node.icon,
            name: `${role} configuration`,
            parent: node,
            template: this.schemaRoleConfig,
            fields,
            initialSchemaFor: initialRolesForControl?.value,
            approveEnable: isApproveEnableControl?.value,
            dependencySchema: dependencySchema?.name,
            role,
        };
        const dependencySchemaListener = dependencySchemaControl?.valueChanges
            .pipe(takeUntil(this.destroy$))
            .subscribe((iri) => {
                newNode.dependencySchema = this.selectedSchemas.find(
                    (item) => item.iri === iri
                )?.name;
            });
        const isApproveEnableListener = isApproveEnableControl?.valueChanges
            .pipe(takeUntil(this.destroy$))
            .subscribe((value) => {
                newNode.approveEnable = value;
            });

        const initialRolesForListener = initialRolesForControl?.valueChanges
            .pipe(takeUntil(this.destroy$))
            .subscribe((value) => {
                newNode.initialSchemaFor = value;
            });
        const schemaRoleConfigForm = this.fb.group({
            role: [role],
            isApprover: [false],
            isCreator: [false],
            gridColumns: [[]],
        });
        schemaRoleConfigControl.push(schemaRoleConfigForm);
        newNode.control = schemaRoleConfigForm;
        node.children.push(newNode);

        const rolesSubscription = this.policyRolesForm.valueChanges
            .pipe(takeUntil(this.destroy$))
            .subscribe((value) => {
                if (!value.includes(role)) {
                    node.children.splice(node.children.indexOf(newNode), 1);
                    this.deleteControlsFromFormArray(
                        schemaRoleConfigControl,
                        schemaRoleConfigControl.controls.filter(
                            (control) => control === schemaRoleConfigForm
                        )
                    );
                    node.options.displayedInRoles = node.options.displayedInRoles.filter(
                        (displayedRole: string) => value.includes(displayedRole)
                    );
                    dependencySchemaListener.unsubscribe();
                    isApproveEnableListener.unsubscribe();
                    initialRolesForListener.unsubscribe();
                    this.matTree.refreshTree();
                    rolesSubscription.unsubscribe();
                }
            });

        return newNode;
    }

    onNoClick(): void {
        this.ref.close({
            create: false,
            currentNode: this.currentNode.id,
            config: this.dataForm.value,
        });
    }

    ngOnDestroy() {
        this.destroy$.next(true);
        this.destroy$.unsubscribe();
    }

    onAddRole(control: FormControl, name: string) {
        const selectedRoles: any[] = control?.value;
        if (!name || selectedRoles.indexOf(name) >= 0) {
            return;
        }
        selectedRoles?.push(name);
        control.updateValueAndValidity();
    }

    onRemoveRole(control: FormControl, name: string) {
        const array = control?.value;
        if (array.indexOf(name) >= 0 && name !== 'OWNER') {
            array?.splice(array.indexOf(name), 1);
            control.updateValueAndValidity();
        }
    }

    onAddColumn(title: string, field: string, gridColumns: any[]) {
        if (
            !title ||
            !field ||
            gridColumns.findIndex((item) => item.title === title) >= 0
        ) {
            return;
        }
        gridColumns.push({
            title,
            field,
        });
    }

    onRemoveColumn(title: string, gridColumns: any[]) {
        const array = gridColumns;
        if (array.findIndex((item) => item.title === title) >= 0) {
            array?.splice(
                array.findIndex((item) => item.title === title),
                1
            );
        }
    }

    onCreate() {
        if (!this.dataForm.valid) {
            return;
        }
        this.ref.close({
            create: true,
            currentNode: this.currentNode.id,
            config: this.dataForm.value,
        });
    }

    onSelectedSchemasChange(value: any) {
        const deletedSchemas = this.selectedSchemas.filter(
            (schema) => !value.some((item: any) => item.iri === schema.iri)
        );
        this.currentNode.children =
            this.currentNode.children.filter(
                (schema: any) =>
                    !deletedSchemas.some(
                        (deletedSchema) =>
                            deletedSchema.iri === schema.schema.iri
                    )
            ) || [];
        this.deleteControlsFromFormArray(
            this.policySchemasForm,
            this.policySchemasForm.controls.filter((control) =>
                deletedSchemas.find(
                    (deletedSchema) => deletedSchema.iri === control.value?.iri
                )
            )
        );
        this.mintedSchemas =
            this.mintedSchemas.filter(
                (schema: any) =>
                    !deletedSchemas.some(
                        (deletedSchema) => deletedSchema.iri === schema.iri
                    )
            ) || [];
        [];

        const addedSchemas = value.filter(
            (item: any) =>
                !this.selectedSchemas.some((schema) => item.iri === schema.iri)
        );
        for (const schema of addedSchemas) {
            this.onSelectedSchemaChange(schema, this.currentNode);
        }

        this.selectedSchemas = value;
        this.matTree.refreshTree();
    }

    onSelectedSchemaChange(
        schema: Schema,
        node: any,
        displayedInRoles?: string[]
    ) {
        const mintControl = this.fb.control(false);
        mintControl.valueChanges
            .pipe(takeUntil(this.destroy$))
            .subscribe((value) => {
                if (value) {
                    this.mintedSchemas.push(schema);
                } else {
                    this.mintedSchemas.splice(
                        this.mintedSchemas.indexOf(schema),
                        1
                    );
                }
            });
        const schemaConfigControl = this.fb.group({
            name: [schema.name],
            iri: [schema.iri],
            isApproveEnable: [false],
            isMintSchema: mintControl,
            mintOptions: this.fb.group({
                tokenId: [''],
                rule: [''],
            }),
            dependencySchemaIri: [''],
            relationshipsSchemaIri: [''],
            initialRolesFor: [[]],
            rolesConfig: this.fb.array([]),
        });
        this.policySchemasForm.push(schemaConfigControl);
        const newNode = {
            id: `${node.id}.${node.children.length + 1}`,
            icon: node.icon,
            name: `${schema.name} configuration`,
            children: [],
            parent: node,
            template: this.schemaConfig,
            schema,
            mintFields: schema.fields.filter((field) =>
                ['integer', 'number'].includes(field.type)
            ),
            control: schemaConfigControl,
            options: {
                displayedInRoles: displayedInRoles || [],
            },
        };
        node.children.push(newNode);
        return newNode;
    }

    onSelectedTrustChainRolesChange(value: any) {
        const deletedRoles = this.selectedTrustChainRoles.filter(
            (displayedRole: any) => !value.includes(displayedRole)
        );
        this.currentNode.children =
            this.currentNode.children.filter(
                (roleSchemaNode: any) =>
                    !deletedRoles.includes(roleSchemaNode.role)
            ) || [];
        this.deleteControlsFromFormArray(
            this.trustChainForm,
            this.trustChainForm.controls.filter((control) =>
                deletedRoles.includes(control.value?.role)
            )
        );

        const addedRoles = value.filter(
            (existingRole: any) =>
                !this.selectedTrustChainRoles.includes(existingRole)
        );
        for (const role of addedRoles) {
            this.onSelectedTrustChainRoleChange(role, this.currentNode);
        }

        this.selectedTrustChainRoles = value;
        this.matTree.refreshTree();
    }

    onSelectedTrustChainRoleChange(trustChainRole: string, node: any) {
        const trustChainRoleConfigControl = this.fb.group({
            role: [trustChainRole],
            viewOnlyOwnDocuments: [false],
            mintSchemaIri: [''],
        });
        this.trustChainForm.push(trustChainRoleConfigControl);
        const newNode = {
            id: `${node.id}.${node.children.length + 1}`,
            icon: node.icon,
            name: `${trustChainRole} configuration`,
            children: [],
            parent: node,
            template: this.trustChainRoleConfig,
            control: trustChainRoleConfigControl,
            role: trustChainRole,
        };
        node.children.push(newNode);

        const rolesSubscription = this.policyRolesForm.valueChanges
            .pipe(takeUntil(this.destroy$))
            .subscribe((value) => {
                if (!value.includes(trustChainRole)) {
                    node.children.splice(node.children.indexOf(newNode), 1);
                    this.deleteControlsFromFormArray(
                        this.trustChainForm,
                        trustChainRoleConfigControl
                    );
                    this.selectedTrustChainRoles = this.selectedTrustChainRoles.filter(
                        (displayedRole: string) => value.includes(displayedRole)
                    );
                    this.matTree.refreshTree();
                    rolesSubscription.unsubscribe();
                }
            });
    }

    deleteControlsFromFormArray(
        arrayControl: FormArray,
        deleteItems: AbstractControl | AbstractControl[]
    ) {
        if (Array.isArray(deleteItems)) {
            for (const deleteItem of deleteItems) {
                arrayControl.removeAt(
                    arrayControl.controls.indexOf(deleteItem)
                );
            }
        } else {
            arrayControl.removeAt(arrayControl.controls.indexOf(deleteItems));
        }
    }

    drop(event: CdkDragDrop<any[]>, gridColumnsArray: any[]) {
        moveItemInArray(
            gridColumnsArray,
            event.previousIndex,
            event.currentIndex
        );
    }
}
