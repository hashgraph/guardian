import { ChangeDetectorRef, Component, Inject, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
    ContractType,
    IUser,
    LocationType,
    PolicyAvailability,
    PolicyHelper,
    PolicyStatus,
    Schema,
    SchemaHelper,
    TagType,
    Token,
    UserPermissions
} from '@guardian/interfaces';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { ProfileService } from 'src/app/services/profile.service';
import { TokenService } from 'src/app/services/token.service';
import { ExportPolicyDialog } from '../dialogs/export-policy-dialog/export-policy-dialog.component';
import { NewPolicyDialog } from '../dialogs/new-policy-dialog/new-policy-dialog.component';
import { PreviewPolicyDialog } from '../dialogs/preview-policy-dialog/preview-policy-dialog.component';
import { ReplaceSchemasDialogComponent } from '../dialogs/replace-schemas-dialog/replace-schemas-dialog.component';
import { TasksService } from 'src/app/services/tasks.service';
import { InformService } from 'src/app/services/inform.service';
import { MultiPolicyDialogComponent } from '../dialogs/multi-policy-dialog/multi-policy-dialog.component';
import { ComparePolicyDialog } from '../dialogs/compare-policy-dialog/compare-policy-dialog.component';
import { TagsService } from 'src/app/services/tag.service';
import { forkJoin, Subject, Subscription } from 'rxjs';
import { SchemaService } from 'src/app/services/schema.service';
import { WizardMode, WizardService } from 'src/app/modules/policy-engine/services/wizard.service';
import { UntypedFormControl, UntypedFormGroup } from '@angular/forms';
import { AnalyticsService } from 'src/app/services/analytics.service';
import { SearchPolicyDialog } from '../../analytics/search-policy-dialog/search-policy-dialog.component';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { SuggestionsConfigurationComponent } from '../../../views/suggestions-configuration/suggestions-configuration.component';
import { DeletePolicyDialogComponent } from '../dialogs/delete-policy-dialog/delete-policy-dialog.component';
import { CONFIGURATION_ERRORS } from '../injectors/configuration.errors.injector';
import { DiscontinuePolicy } from '../dialogs/discontinue-policy/discontinue-policy.component';
import { MigrateData } from '../dialogs/migrate-data/migrate-data.component';
import { ContractService } from 'src/app/services/contract.service';
import { PolicyTestDialog } from '../dialogs/policy-test-dialog/policy-test-dialog.component';
import { NewImportFileDialog } from '../dialogs/new-import-file-dialog/new-import-file-dialog.component';
import { PublishPolicyDialog } from '../dialogs/publish-policy-dialog/publish-policy-dialog.component';
import { WebSocketService } from 'src/app/services/web-socket.service';
import {
    IImportEntityResult,
    ImportEntityDialog,
    ImportEntityType
} from '../../common/import-entity-dialog/import-entity-dialog.component';
import { SearchExternalPolicyDialog } from '../dialogs/search-external-policy-dialog/search-external-policy-dialog.component';
import { OverlayPanel } from 'primeng/overlaypanel';
import { takeUntil } from 'rxjs/operators';
import { IndexedDbRegistryService } from 'src/app/services/indexed-db-registry.service';
import { DB_NAME, STORES_NAME } from 'src/app/constants';
import { ToastrService } from 'ngx-toastr';
import { UserPolicyDialog } from '../dialogs/user-policy-dialog/user-policy-dialog.component';

class MenuButton {
    public readonly visible: boolean;
    public readonly disabled: boolean;
    public readonly tooltip: string;
    public readonly icon: string;
    public readonly color: string;
    private readonly click: () => void;

    constructor(option: {
        visible: boolean,
        disabled: boolean,
        tooltip: string,
        icon: string,
        click: () => void;
    }) {
        this.visible = option.visible;
        this.disabled = option.disabled;
        this.tooltip = option.tooltip;
        this.icon = option.icon;
        this.click = option.click;
        this.color = option.disabled ? 'disabled-color' : 'primary-color';
    }

    public onClick() {
        if (!this.disabled) {
            this.click();
        }
    }
}

const columns = [{
    id: 'name',
    permissions: (user: UserPermissions, type: LocationType) => {
        return true;
    }
}, {
    id: 'description',
    permissions: (user: UserPermissions, type: LocationType) => {
        return true;
    }
}, {
    id: 'topic',
    permissions: (user: UserPermissions, type: LocationType) => {
        return (
            user.POLICIES_POLICY_CREATE ||
            user.POLICIES_POLICY_UPDATE ||
            user.POLICIES_POLICY_REVIEW ||
            user.POLICIES_POLICY_DELETE
        )
    }
}, {
    id: 'publicLink',
    permissions: (user: UserPermissions, type: LocationType) => {
        return true;
    }
}, {
    id: 'roles',
    permissions: (user: UserPermissions, type: LocationType) => {
        return !(
            user.POLICIES_POLICY_CREATE ||
            user.POLICIES_POLICY_UPDATE ||
            user.POLICIES_POLICY_REVIEW ||
            user.POLICIES_POLICY_DELETE
        )
    }
}, {
    id: 'version',
    permissions: (user: UserPermissions, type: LocationType) => {
        return true;
    }
}, {
    id: 'tests',
    permissions: (user: UserPermissions, type: LocationType) => {
        if (type === LocationType.LOCAL) {
            return (
                user.POLICIES_POLICY_CREATE ||
                user.POLICIES_POLICY_UPDATE ||
                user.POLICIES_POLICY_REVIEW ||
                user.POLICIES_POLICY_DELETE
            )
        } else {
            return false;
        }
    }
}, {
    id: 'tags',
    permissions: (user: UserPermissions, type: LocationType) => {
        return true;
    }
}, {
    id: 'tokens',
    permissions: (user: UserPermissions, type: LocationType) => {
        return user.TOKENS_TOKEN_READ;
    }
}, {
    id: 'schemas',
    permissions: (user: UserPermissions, type: LocationType) => {
        return user.SCHEMAS_SCHEMA_READ;
    }
}, {
    id: 'status',
    permissions: (user: UserPermissions, type: LocationType) => {
        return true;
    }
}, {
    id: 'instance',
    size: '150',
    permissions: (user: UserPermissions, type: LocationType) => {
        return true;
    }
}, {
    id: 'operations',
    permissions: (user: UserPermissions, type: LocationType) => {
        if (type === LocationType.LOCAL) {
            return (
                user.POLICIES_POLICY_CREATE ||
                user.POLICIES_POLICY_UPDATE ||
                user.POLICIES_POLICY_REVIEW ||
                user.POLICIES_POLICY_DELETE
            )
        } else {
            return false;
        }
    }
}, {
    id: 'multi-instance',
    permissions: (user: UserPermissions, type: LocationType) => {
        if (type === LocationType.LOCAL) {
            return user.POLICIES_POLICY_EXECUTE && !user.POLICIES_POLICY_MANAGE;
        } else {
            return false;
        }
    }
}];

/**
 * Component for choosing a policy and
 * display blocks of the selected policy
 */
@Component({
    selector: 'app-policies',
    templateUrl: './policies.component.html',
    styleUrls: ['./policies.component.scss'],
})
export class PoliciesComponent implements OnInit {
    public user: UserPermissions = new UserPermissions();
    public policies: any[] | null;
    public loading: boolean = true;
    public isConfirmed: boolean = false;
    public pageIndex: number;
    public pageSize: number;
    public policiesCount: any;
    public owner: any;
    public tagEntity = TagType.Policy;
    public tagSchemas: any[] = [];
    public tagOptions: string[] = [];
    public publishMenuSelector: any = null;
    public noFilterResults: boolean = false;
    private columns: string[] = [];
    private columnSize = new Map<string, string | undefined>();
    private publishMenuOption = [
        {
            id: 'Publish',
            title: 'Publish',
            description: 'Release version into public domain.',
            color: '#4caf50',
        },
        {
            id: 'Dry-run',
            title: 'Dry Run',
            description: 'Run without making any persistent \n changes or executing transaction.',
            color: '#3f51b5',
        },
    ];
    private draftMenuOption = [
        {
            id: 'Draft',
            title: 'Stop',
            description: 'Return to editing.',
            color: '#9c27b0',
        },
        {
            id: 'Publish',
            title: 'Publish',
            description: 'Release version into public domain.',
            color: '#4caf50',
        },
    ];
    private publishErrorMenuOption = [
        {
            id: 'Publish',
            title: 'Publish',
            description: 'Release version into public domain.',
            color: '#4caf50',
        },
    ];
    private publishedMenuOption = [
        {
            id: 'Discontinue',
            title: 'Discontinue',
            description:
                'Discontinue policy flow.',
            color: 'red',
        },
    ];
    public tab: LocationType = LocationType.LOCAL;

    private filteredPolicies: any[] = [];
    public filtersForm = new UntypedFormGroup({
        policyName: new UntypedFormControl(''),
        tag: new UntypedFormControl(''),
    }, (fg) => {
        for (const key in (fg as UntypedFormGroup).controls) {
            if (!fg.get(key)) {
                continue;
            }
            const value = fg.get(key)?.value;
            if (value?.length > 0) {
                return null;
            }
        }
        return {
            policyName: 'At least one value must be set'
        };
    });

    private get filters(): { policyName: string; tag: string } {
        return {
            policyName: this.filtersForm.value?.policyName?.trim(),
            tag: this.filtersForm.value?.tag,
        };
    }

    public get policiesList(): any[] {
        return this.filteredPolicies.length > 0
            ? this.filteredPolicies
            : this.policies || [];
    }

    public get hasPolicies(): boolean {
        return this.policiesList.length > 0;
    }

    public checkMigrationStatus(status: string): boolean {
        return (
            status === PolicyStatus.PUBLISH ||
            status === PolicyStatus.DRY_RUN ||
            status === PolicyStatus.DEMO ||
            status === PolicyStatus.DISCONTINUED
        )
    }

    public showInstance(policy: any): string | null {
        switch (policy.status) {
            case PolicyStatus.VIEW: {
                if (this.user.POLICIES_POLICY_EXECUTE) {
                    return 'Register';
                } else {
                    return null;
                }
            }
            case PolicyStatus.PUBLISH:
            case PolicyStatus.DISCONTINUED: {
                if (this.user.POLICIES_POLICY_MANAGE) {
                    return 'Open';
                } else if (this.user.POLICIES_POLICY_EXECUTE) {
                    return 'Register';
                } else {
                    return null;
                }
            }
            case PolicyStatus.DRY_RUN: {
                if (this.user.POLICIES_POLICY_UPDATE) {
                    return 'Dry run';
                } else {
                    return null;
                }
            }
            case PolicyStatus.DEMO: {
                if (this.user.POLICIES_POLICY_UPDATE) {
                    return 'Demo';
                } else {
                    return null;
                }
            }
            default: {
                return null;
            }
        }
    }

    public showAudit(policy: any) {
        switch (policy.status) {
            case PolicyStatus.PUBLISH:
            case PolicyStatus.DISCONTINUED: {
                if (this.user.POLICIES_POLICY_AUDIT) {
                    return true;
                }
            }
        }
        return false;
    }

    public checkMultiPolicyStatus(status: string): boolean {
        return (
            status === PolicyStatus.PUBLISH ||
            status === PolicyStatus.DISCONTINUED
        )
    }

    public showStatus(policy: any): boolean {
        return (
            policy.status === PolicyStatus.DRAFT ||
            policy.status === PolicyStatus.DRY_RUN ||
            policy.status === PolicyStatus.PUBLISH_ERROR ||
            policy.status === PolicyStatus.PUBLISH
        )
    }

    public canDisplayColumn(columnName: string): boolean {
        return !!this.columns.find((column) => column === columnName);
    }

    public sizeColumn(columnName: string) {
        return this.columnSize.get(columnName);
    }

    public getColor(status: string, expired: boolean = false) {
        switch (status) {
            case PolicyStatus.DRAFT:
                return 'grey';
            case PolicyStatus.DRY_RUN:
                return 'grey';
            case PolicyStatus.DISCONTINUED:
            case PolicyStatus.PUBLISH_ERROR:
                return 'red';
            case PolicyStatus.VIEW:
            case PolicyStatus.PUBLISH:
                return expired ? 'yellow' : 'green';
            default:
                return 'grey';
        }
    }

    public getLabelStatus(status: string, expired: boolean = false) {
        switch (status) {
            case PolicyStatus.DRAFT:
                return 'Draft';
            case PolicyStatus.DRY_RUN:
                return 'Dry Run';
            case PolicyStatus.PUBLISH_ERROR:
                return 'Publish Error';
            case PolicyStatus.PUBLISH:
                return `Published${expired ? '*' : ''}`;
            case PolicyStatus.DISCONTINUED:
                return `Discontinued`;
            case PolicyStatus.VIEW:
                return `View`;
            default:
                return 'Incorrect status';
        }
    }

    public getStatusName(policy: any): string {
        if (policy.status === PolicyStatus.DRAFT) {
            return 'Draft';
        }
        if (policy.status === PolicyStatus.DRY_RUN) {
            return 'In Dry Run';
        }
        if (policy.status === PolicyStatus.PUBLISH) {
            return `Published${!!policy.discontinuedDate ? '*' : ''}`;
        }
        if (policy.status === PolicyStatus.DISCONTINUED) {
            return 'Discontinued';
        }
        if (policy.status === PolicyStatus.PUBLISH_ERROR) {
            return 'Not published';
        }
        if (policy.status === PolicyStatus.DEMO) {
            return 'Demo';
        }
        if (policy.status === PolicyStatus.VIEW) {
            return 'View';
        }
        return 'Not published';
    }

    public getStatusOptions(policy: any) {
        if (policy.status === PolicyStatus.DRAFT) {
            return this.publishMenuOption;
        }
        if (policy.status === PolicyStatus.DRY_RUN) {
            return this.draftMenuOption;
        }
        if (policy.status === PolicyStatus.PUBLISH) {
            return this.publishedMenuOption;
        } else {
            return this.publishErrorMenuOption;
        }
    }

    public getDiscontinuedTooltip(date: Date) {
        return date ? `Discontinue date is ${date.toLocaleString()}` : '';
    }

    public getMenu(policy: any) {
        return {
            groups: [{
                tooltip: 'Analytics',
                group: false,
                visible: this.user.ANALYTIC_POLICY_READ,
                buttons: [
                    new MenuButton({
                        visible: this.user.ANALYTIC_POLICY_READ,
                        disabled: false,
                        tooltip: 'Search policies',
                        icon: 'search',
                        click: () => this.searchPolicy(policy)
                    }),
                    new MenuButton({
                        visible: this.user.ANALYTIC_POLICY_READ,
                        disabled: false,
                        tooltip: 'Compare policies',
                        icon: 'compare',
                        click: () => this.comparePolicy(policy)
                    })
                ]
            }, {
                tooltip: 'Test',
                group: false,
                visible: true,
                buttons: [
                    new MenuButton({
                        visible: true,
                        disabled: !(
                            policy.status === PolicyStatus.DRAFT ||
                            policy.status === PolicyStatus.DRY_RUN ||
                            policy.status === PolicyStatus.DEMO
                        ),
                        tooltip: 'Attach test file',
                        icon: 'add-test',
                        click: () => this.addTest(policy)
                    }),
                    new MenuButton({
                        visible: true,
                        disabled: !(policy.tests && policy.tests.length),
                        tooltip: 'Test details',
                        icon: 'run-test',
                        click: () => this.testDetails(policy)
                    })
                ]
            }, {
                tooltip: 'Export & Import',
                group: false,
                visible: true,
                buttons: [
                    new MenuButton({
                        visible: true,
                        disabled: false,
                        tooltip: 'Export policy',
                        icon: 'export-file',
                        click: () => this.exportPolicy(policy)
                    }),
                    new MenuButton({
                        visible: true,
                        disabled: false,
                        tooltip: 'Export schemas to Excel',
                        icon: 'export-xls',
                        click: () => this.exportToExcel(policy)
                    }),
                    new MenuButton({
                        visible: this.user.POLICIES_POLICY_UPDATE && this.user.SCHEMAS_SCHEMA_UPDATE,
                        disabled: policy.status !== PolicyStatus.DRAFT,
                        tooltip: 'Import schemas from Excel',
                        icon: 'import-xls',
                        click: () => this.importFromExcel(policy)
                    })
                ]
            }, {
                tooltip: 'Migrate data',
                group: true,
                visible: true,
                icon: 'import-data',
                buttons: [
                    new MenuButton({
                        visible: this.user.POLICIES_MIGRATION_CREATE,
                        disabled: !this.checkMigrationStatus(policy.status),
                        tooltip: 'Export policy data',
                        icon: 'export-data',
                        click: () => this.exportPolicyData(policy)
                    }),
                    new MenuButton({
                        visible: this.user.POLICIES_MIGRATION_CREATE,
                        disabled: false,
                        tooltip: 'Migrate data',
                        icon: 'import-data',
                        click: () => this.migrateData(policy)
                    }),
                    new MenuButton({
                        visible: PolicyHelper.isDryRunMode(policy) && this.user.POLICIES_MIGRATION_CREATE,
                        disabled: false,
                        tooltip: 'Export virtual keys',
                        icon: 'export-key',
                        click: () => this.exportVirtualKeys(policy)
                    }),
                    new MenuButton({
                        visible: PolicyHelper.isDryRunMode(policy) && this.user.POLICIES_MIGRATION_CREATE,
                        disabled: false,
                        tooltip: 'Import virtual keys',
                        icon: 'import-key',
                        click: () => this.importVirtualKeys(policy)
                    })
                ]
            }, {
                tooltip: 'Users',
                group: false,
                visible: true,
                buttons: [
                    new MenuButton({
                        visible: this.user.PERMISSIONS_ROLE_MANAGE || this.user.DELEGATION_ROLE_MANAGE,
                        disabled: false,
                        tooltip: 'User Manage',
                        icon: 'group',
                        click: () => this.userPolicyManage(policy)
                    })
                ]
            }, {
                tooltip: 'Delete',
                group: false,
                visible: true,
                buttons: [
                    new MenuButton({
                        visible: this.user.SCHEMAS_SCHEMA_DELETE,
                        disabled: !(
                            policy.status === PolicyStatus.DRAFT ||
                            policy.status === PolicyStatus.DEMO
                        ),
                        tooltip: 'Delete All Schemas',
                        icon: 'delete',
                        click: () => this.deleteAllSchemas(policy)
                    })
                ]
            }, {
                tooltip: 'Delete',
                group: false,
                visible: true,
                buttons: [
                    new MenuButton({
                        visible: this.user.POLICIES_POLICY_DELETE,
                        disabled: !(
                            policy.status === PolicyStatus.DRAFT ||
                            policy.status === PolicyStatus.DEMO
                        ),
                        tooltip: 'Delete Policy',
                        icon: 'delete',
                        click: () => this.deletePolicy(policy)
                    })
                ]
            }]
        }
    }

    public selectedMenuData: any;

    public onMenuClick(event: MouseEvent, overlayPanel: any, policy: any): void {
        this.selectedMenuData = this.getMenu(policy);

        overlayPanel.toggle(event)
    }

    public selectedSubMenuData: any[] = [];

    public onSubMenuClick(event: MouseEvent, overlayPanel: any, group: any): void {
        this.selectedSubMenuData = group.buttons ?? [];

        overlayPanel.toggle(event)
    }

    private subscription = new Subscription();

    @ViewChild('policyMenu') policyMenu?: OverlayPanel;
    @ViewChild('policySubMenu') policySubMenu?: OverlayPanel;

    private _destroy$ = new Subject<void>();

    constructor(
        public tagsService: TagsService,
        private profileService: ProfileService,
        private policyEngineService: PolicyEngineService,
        private router: Router,
        private route: ActivatedRoute,
        private dialogService: DialogService,
        private taskService: TasksService,
        private informService: InformService,
        private schemaService: SchemaService,
        private wizardService: WizardService,
        private tokenService: TokenService,
        private toastr: ToastrService,
        private analyticsService: AnalyticsService,
        private contractSerivce: ContractService,
        private wsService: WebSocketService,
        @Inject(CONFIGURATION_ERRORS)
        private _configurationErrors: Map<string, any>,
        private cdRef: ChangeDetectorRef,
        private indexedDb: IndexedDbRegistryService,
    ) {
        this.policies = null;
        this.pageIndex = 0;
        this.pageSize = 10;
        this.policiesCount = 0;

        this.indexedDb.registerStore(DB_NAME.GUARDIAN, {
            name: STORES_NAME.POLICY_STORAGE,
            options: { keyPath: 'policyId' }
        });
    }

    ngOnInit() {
        this.subscription.add(
            this.wsService.testSubscribe(((test) => {
                this.updatePolicyTest(test);
            }))
        );
        this.tab = this.route.snapshot.queryParams['tab'] || LocationType.LOCAL;
        this.subscription.add(
            this.route.queryParams.pipe(takeUntil(this._destroy$)).subscribe((queryParams) => {
                this.tab = this.route.snapshot.queryParams['tab'] || LocationType.LOCAL;
            })
        );
        this.loading = true;
        this.loadPolicy();
        this.handleTagsUpdate();
    }

    private destroyOverlayPanel(panel?: OverlayPanel): void {
        const container = panel?.container;
        if (container && container.parentNode) {
            try {
                container.parentNode.removeChild(container);
            } catch (e) {
                console.warn('Failed to remove overlay panel:', e);
            }
        }
    }

    ngOnDestroy(): void {
        this.subscription.unsubscribe();

        this.policyMenu?.hide();
        this.policySubMenu?.hide();

        setTimeout(() => {
            requestAnimationFrame(() => {
                this.destroyOverlayPanel(this.policyMenu);
                this.destroyOverlayPanel(this.policySubMenu);
            });
        }, 500);

        this.policyMenu = undefined;
        this.policySubMenu = undefined;

        this._destroy$.next();
        this._destroy$.complete();

        this.cdRef.detach()
    }

    private loadPolicy() {
        this.policies = null;
        this.isConfirmed = false;
        this.loading = true;
        forkJoin([
            this.profileService.getProfile(),
            this.tagsService.getPublishedSchemas(),
        ]).pipe(takeUntil(this._destroy$)).subscribe((value) => {
            const profile: IUser | null = value[0];
            const tagSchemas: any[] = value[1] || [];
            this.isConfirmed = !!(profile && profile.confirmed);
            this.user = new UserPermissions(profile);
            this.owner = this.user.did;
            this.tagSchemas = SchemaHelper.map(tagSchemas);

            if (this.isConfirmed) {
                this.loadAllPolicy();
            } else {
                setTimeout(() => {
                    this.loading = false;
                }, 500);
            }
        },
            (e) => {
                this.loading = false;
            }
        );
    }

    private loadAllPolicy() {
        this.loading = true;
        this.tagOptions = [];
        this.policyEngineService
            .page(this.pageIndex, this.pageSize, this.tab)
            .pipe(takeUntil(this._destroy$)).subscribe((policiesResponse) => {
                let publishedPolicy = false;

                this.policies = [];
                if (policiesResponse.body) {
                    for (const policy of policiesResponse.body) {
                        if (policy.discontinuedDate) {
                            policy.discontinuedDate = new Date(policy.discontinuedDate);
                        }
                        this.policies.push(policy);
                        publishedPolicy = publishedPolicy || (
                            policy.status === PolicyStatus.PUBLISH ||
                            policy.status === PolicyStatus.DISCONTINUED
                        )
                    }
                }

                this.policiesCount =
                    policiesResponse.headers.get('X-Total-Count') ||
                    this.policies.length;

                this.columns = [];
                this.columnSize.clear();
                for (const config of columns) {
                    if (config.permissions(this.user, this.tab)) {
                        this.columns.push(config.id);
                        this.columnSize.set(config.id, config?.size);
                    }
                }
                if (publishedPolicy && this.user.POLICIES_POLICY_AUDIT) {
                    this.columnSize.set('instance', '350')
                } else {
                    this.columnSize.set('instance', '150')
                }

                this.loadPolicyTags(this.policies);
            }, (e) => {
                this.loading = false;
            });
    }

    private loadPolicyTags(policies: any[]) {
        if (!this.user.TAGS_TAG_READ || !policies || !policies.length) {
            setTimeout(() => {
                this.loading = false;
            }, 500);
        } else {
            const ids = policies.map((e) => e.id);
            this.tagsService.search(this.tagEntity, ids).pipe(takeUntil(this._destroy$)).subscribe((data) => {
                for (const policy of policies) {
                    (policy as any)._tags = data[policy.id];
                    data[policy.id]?.tags.forEach((tag: any) => {
                        const totalTagOptions = [
                            ...this.tagOptions,
                            tag.name,
                        ];
                        this.tagOptions = [
                            ...new Set(totalTagOptions),
                        ];
                    });
                }
                setTimeout(() => {
                    this.loading = false;
                }, 500);
            }, (e) => {
                console.error(e.error);
                this.loading = false;
            });
        }
    }

    public onPage(event: any): void {
        if (this.pageSize != event.pageSize) {
            this.pageIndex = 0;
            this.pageSize = event.pageSize;
        } else {
            this.pageIndex = event.pageIndex;
            this.pageSize = event.pageSize;
        }
        this.loadPolicy();
    }

    private dryRun(element: any) {
        this.loading = true;
        this.policyEngineService.dryRun(element.id).pipe(takeUntil(this._destroy$)).subscribe(
            (data: any) => {
                const { policies, isValid, errors } = data;
                if (!isValid) {
                    let text = [];
                    const blocks = errors.blocks;
                    const invalidBlocks = blocks.filter(
                        (block: any) => !block.isValid
                    );
                    for (let i = 0; i < invalidBlocks.length; i++) {
                        const block = invalidBlocks[i];
                        for (let j = 0; j < block.errors.length; j++) {
                            const error = block.errors[j];
                            if (block.id) {
                                text.push(`<div>${block.id}: ${error}</div>`);
                            } else {
                                text.push(`<div>${error}</div>`);
                            }
                        }
                    }
                    this.informService.errorMessage(
                        text.join(''),
                        'The policy is invalid'
                    );
                    this._configurationErrors.set(element.id, errors);
                    this.router.navigate(['policy-configuration'], {
                        queryParams: {
                            policyId: element.id,
                        },
                        replaceUrl: true,
                    });
                }
                this.loadAllPolicy();
            },
            (e) => {
                this.loading = false;
            }
        );
    }

    private draft(element: any) {
        this.loading = true;
        this.policyEngineService.draft(element.id).pipe(takeUntil(this._destroy$)).subscribe(
            (data: any) => {
                const { policies, isValid, errors } = data;
                this.loadAllPolicy();
            },
            (e) => {
                this.loading = false;
            }
        );

        const databaseName = DB_NAME.TABLES;
        const storeNames = [
            STORES_NAME.FILES_STORE,
            STORES_NAME.DRAFT_STORE
        ];
        const keyPrefix = `${element.id}__`;

        this.indexedDb.clearByKeyPrefixAcrossStores(
            databaseName,
            storeNames,
            keyPrefix
        );
    }

    private setVersion(element: any) {
        const item = this.policies?.find((e) => e.id === element?.id);
        const dialogRef = this.dialogService.open(PublishPolicyDialog, {
            showHeader: false,
            header: 'Publish Policy',
            width: '600px',
            styleClass: 'guardian-dialog',
            data: {
                policy: item
            }
        });
        dialogRef.onClose.pipe(takeUntil(this._destroy$)).subscribe(async (options) => {
            if (options) {
                this.publish(element, options);
            }
        });
    }

    private publish(
        element: any,
        options: { policyVersion: string, policyAvailability: PolicyAvailability }
    ) {
        this.loading = true;
        this.policyEngineService.pushPublish(element.id, options).pipe(takeUntil(this._destroy$)).subscribe(
            (result) => {
                const { taskId, expectation } = result;
                this.router.navigate(['task', taskId], {
                    queryParams: {
                        last: btoa(location.href),
                    },
                });
            },
            (e) => {
                this.loading = false;
            }
        );

        const databaseName = DB_NAME.TABLES;
        const storeNames = [
            STORES_NAME.FILES_STORE,
            STORES_NAME.DRAFT_STORE
        ];
        const keyPrefix = `${element.id}__`;

        this.indexedDb.clearByKeyPrefixAcrossStores(
            databaseName,
            storeNames,
            keyPrefix
        );

        this.indexedDb.delete(DB_NAME.POLICY_WARNINGS, STORES_NAME.IGNORE_RULES_STORE, element.id).catch(() => {
            //
        })
    }

    public deletePolicy(policy?: any) {
        const dialogRef = this.dialogService.open(DeletePolicyDialogComponent, {
            header: 'Delete Policy',
            width: '720px',
            styleClass: 'custom-dialog',
            data: {
                notificationText: !policy?.previousVersion
                    ? 'Are you sure want to delete policy with related schemas?'
                    : 'Are you sure want to delete policy?',
            },
        });
        dialogRef.onClose.pipe(takeUntil(this._destroy$)).subscribe((result) => {
            if (!result) {
                return;
            }

            this.loading = true;
            this.policyEngineService.pushDelete(policy?.id).pipe(takeUntil(this._destroy$)).subscribe(
                async (result) => {
                    await this.indexedDb.delete(DB_NAME.GUARDIAN, STORES_NAME.POLICY_STORAGE, policy?.id);

                    const databaseName = DB_NAME.TABLES;
                    const storeNames = [
                        STORES_NAME.FILES_STORE,
                        STORES_NAME.DRAFT_STORE
                    ];
                    const keyPrefix = `${policy?.id}__`;

                    await this.indexedDb.clearByKeyPrefixAcrossStores(
                        databaseName,
                        storeNames,
                        keyPrefix
                    );

                    this.indexedDb.delete(DB_NAME.POLICY_WARNINGS, STORES_NAME.IGNORE_RULES_STORE, policy.id).catch(() => {
                        //
                    })

                    const { taskId, expectation } = result;
                    this.router.navigate(['task', taskId], {
                        queryParams: {
                            last: btoa(location.href),
                        },
                    });
                },
                (e) => {
                    this.loading = false;
                }
            );
        });
    }

    public deleteAllSchemas(policy?: any) {
        const dialogRef = this.dialogService.open(DeletePolicyDialogComponent, {
            header: 'Delete Schemas',
            width: '720px',
            styleClass: 'custom-dialog',
            data: {
                notificationText: 'Are you sure want to delete all schemas for this policy?'
            },
        });
        dialogRef.onClose.pipe(takeUntil(this._destroy$)).subscribe((result) => {
            if (!result) {
                return;
            }

            this.loading = true;

            this.schemaService.deleteSchemasByTopicId(policy?.topicId).pipe(takeUntil(this._destroy$)).subscribe(
                async (result) => {
                    this.loading = false;
                    this.toastr.success(`All schemas of topic ${policy.topicId} was successfully deleted`, '', {
                        timeOut: 3000,
                        closeButton: true,
                        positionClass: 'toast-bottom-right',
                        enableHtml: true,
                    });
                },
                (e) => {
                    this.loading = false;
                }
            );
        });
    }

    public exportPolicy(policy?: any) {
        this.policyEngineService
            .exportInMessage(policy?.id)
            .pipe(takeUntil(this._destroy$)).subscribe((exportedPolicy) => {
                this.dialogService.open(ExportPolicyDialog, {
                    showHeader: false,
                    header: 'Export Policy',
                    width: '700px',
                    styleClass: 'guardian-dialog',
                    data: {
                        policy: exportedPolicy,
                    },
                });
            });
    }

    public exportPolicyData(policy: any) {
        this.policyEngineService
            .exportPolicyData(policy?.id)
            .pipe(takeUntil(this._destroy$)).subscribe((response) => {
                const fileName =
                    response.headers
                        ?.get('Content-Disposition')
                        ?.split('filename=')[1]
                        .split(';')[0] || '';
                let downloadLink = document.createElement('a');
                downloadLink.href = window.URL.createObjectURL(
                    response.body as Blob
                );
                downloadLink.setAttribute('download', fileName);
                downloadLink.click();
            });
    }

    public exportVirtualKeys(policy?: any) {
        this.policyEngineService
            .exportVirtualKeys(policy?.id)
            .pipe(takeUntil(this._destroy$)).subscribe((response) => {
                const fileName =
                    response.headers
                        ?.get('Content-Disposition')
                        ?.split('filename=')[1]
                        .split(';')[0] || '';
                let downloadLink = document.createElement('a');
                downloadLink.href = window.URL.createObjectURL(
                    response.body as Blob
                );
                downloadLink.setAttribute('download', fileName);
                downloadLink.click();
            });
    }

    private _input?: any;

    public importVirtualKeys(policy?: any) {
        const handler = () => {
            input.removeEventListener('change', handler);
            this._input = null;
            this.loading = true;
            this.policyEngineService
                .importVirtualKeys(policy?.id, input.files![0])
                .pipe(takeUntil(this._destroy$)).subscribe({
                    complete: () => this.loading = false
                });
        };
        if (this._input) {
            this._input.removeEventListener('change', handler);
            this._input = null;
        }
        const input = document.createElement('input');
        this._input = input;
        input.type = 'file';
        input.accept = '.vk';
        input.click();
        input.addEventListener('change', handler);
    }

    public importPolicy(messageId?: string) {
        const dialogRef = this.dialogService.open(ImportEntityDialog, {
            showHeader: false,
            width: '720px',
            styleClass: 'guardian-dialog',
            data: {
                type: ImportEntityType.Policy,
                timeStamp: messageId
            }
        });
        dialogRef.onClose.pipe(takeUntil(this._destroy$)).subscribe(async (result: IImportEntityResult | null) => {
            if (result) {
                this.importPolicyDetails(result);
            }
        });
    }

    private importPolicyDetails(result: IImportEntityResult) {
        const { type, data, policy } = result;
        const distinctPolicies = this.getDistinctPolicy();
        const dialogRef = this.dialogService.open(PreviewPolicyDialog, {
            header: 'Preview',
            width: '800px',
            styleClass: 'guardian-dialog',
            showHeader: false,
            data: {
                title: 'Preview',
                policy: policy,
                policies: distinctPolicies,
            },
        });
        dialogRef.onClose.pipe(takeUntil(this._destroy$)).subscribe(async (result) => {
            if (result) {
                if (result.messageId) {
                    this.importPolicy(result.messageId);
                    return;
                }

                const versionOfTopicId = result.versionOfTopicId || null;
                const demo = result.demo || false;
                const tools = result.tools;

                this.loading = true;
                if (type == 'message') {
                    this.policyEngineService
                        .pushImportByMessage(data, versionOfTopicId, { tools }, demo)
                        .pipe(takeUntil(this._destroy$))
                        .subscribe((result) => {
                            const { taskId, expectation } = result;
                            this.router.navigate(['task', taskId], {
                                queryParams: {
                                    last: btoa(location.href),
                                    redir: String(!demo)
                                },
                            });
                        }, (e) => {
                            this.loading = false;
                        });
                } else if (type == 'file') {
                    this.policyEngineService
                        .pushImportByFile(data, versionOfTopicId, { tools }, demo)
                        .pipe(takeUntil(this._destroy$)).subscribe((result) => {
                            const { taskId, expectation } = result;
                            this.router.navigate(['task', taskId], {
                                queryParams: {
                                    last: btoa(location.href),
                                    redir: String(!demo)
                                },
                            });
                        }, (e) => {
                            this.loading = false;
                        });
                }
            }
        });
    }


    private importExcelReplace(result: IImportEntityResult, policyId: string) {
        const { data, schemasCanBeReplaced } = result;
        const dialogRef = this.dialogService.open(ReplaceSchemasDialogComponent, {
            header: 'Schemas for replace',
            width: '800px',
            styleClass: 'guardian-dialog',
            showHeader: false,
            data: {
                title: 'Schemas for replace',
                schemasCanBeReplaced,
            },
        });
        dialogRef.onClose.pipe(takeUntil(this._destroy$)).subscribe(async (resultWithSchemasForReplace) => {
            if (resultWithSchemasForReplace) {
                this.pushImportByXlsx(data, policyId, resultWithSchemasForReplace.selectedSchemaIds)
            }
        });
    }

    private pushImportByXlsx(data: any, policyId: string, schemasForReplace?: string[]) {
        this.policyEngineService
            .pushImportByXlsx(data, policyId, schemasForReplace)
            .pipe(takeUntil(this._destroy$)).subscribe(
                (result) => {
                    const { taskId, expectation } = result;
                    this.router.navigate(['task', taskId], {
                        queryParams: {
                            last: btoa(location.href),
                        },
                    });
                },
                (e) => {
                    this.loading = false;
                }
            );
    }

    private importExcelDetails(result: IImportEntityResult, policyId: string, topicId: string) {
        const { data, xlsx } = result;
        const dialogRef = this.dialogService.open(PreviewPolicyDialog, {
            header: 'Preview',
            width: '800px',
            styleClass: 'guardian-dialog',
            showHeader: false,
            data: {
                title: 'Preview',
                xlsx: xlsx,
            },
        });
        dialogRef.onClose.pipe(takeUntil(this._destroy$)).subscribe(async (res) => {
            if (res) {
                this.schemaService.checkForDublicates({
                    policyId: topicId,
                    schemaNames: xlsx.schemas.map(({ name }: { name: string }) => name)
                }).subscribe(
                    (res) => {
                        this.loading = false;
                        if (res?.schemasCanBeReplaced?.length) {
                            this.importExcelReplace({
                                ...result,
                                schemasCanBeReplaced: res.schemasCanBeReplaced,
                            }, policyId);
                        } else {
                            this.pushImportByXlsx(data, policyId)
                        }

                    },
                    (e) => {
                        this.loading = false;
                    }
                );
            }
        });
    }

    public exportToExcel(policy?: any) {
        this.policyEngineService
            .exportToExcel(policy?.id)
            .pipe(takeUntil(this._destroy$)).subscribe((fileBuffer) => {
                let downloadLink = document.createElement('a');
                downloadLink.href = window.URL.createObjectURL(
                    new Blob([new Uint8Array(fileBuffer)], {
                        type: 'application/guardian-policy',
                    })
                );
                downloadLink.setAttribute(
                    'download',
                    `policy_${Date.now()}.xlsx`
                );
                document.body.appendChild(downloadLink);
                downloadLink.click();
                setTimeout(() => {
                    this.loading = false;
                }, 500);
            },
                (error) => {
                    this.loading = false;
                }
            );
    }

    public importFromExcel(policy?: any) {
        const dialogRef = this.dialogService.open(ImportEntityDialog, {
            showHeader: false,
            width: '720px',
            styleClass: 'guardian-dialog',
            data: {
                type: ImportEntityType.Xlsx,
            }
        });
        dialogRef.onClose.pipe(takeUntil(this._destroy$)).subscribe(async (result: IImportEntityResult | null) => {
            if (result) {
                this.importExcelDetails(result, policy?.id, policy?.topicId);
            }
        });
    }

    private getDistinctPolicy(): any[] {
        const policyByTopic: any = {};
        if (this.policies) {
            for (let i = 0; i < this.policies.length; i++) {
                const policy = this.policies[i];
                if (policy.topicId) {
                    if (!policyByTopic.hasOwnProperty(policy.topicId)) {
                        policyByTopic[policy.topicId] = policy;
                    } else if (
                        policyByTopic[policy.topicId].createDate >
                        policy.createDate
                    ) {
                        policyByTopic[policy.topicId] = policy;
                    }
                }
            }
        }
        return Object.values(policyByTopic).sort((a: any, b: any) =>
            a.createDate > b.createDate
                ? -1
                : b.createDate > a.createDate
                    ? 1
                    : 0
        );
    }

    private onPublishAction(event: any, element: any) {
        if (event.value.id === 'Publish') {
            this.setVersion(element);
        } else if (event.value.id === 'Dry-run') {
            this.dryRun(element);
        }

        setTimeout(() => this.publishMenuSelector = null, 0);
    }

    private onPublishedAction(event: any, element: any) {
        if (event.value.id === 'Discontinue') {
            let dialogRef: DynamicDialogRef<DiscontinuePolicy> | undefined = this.dialogService.open(DiscontinuePolicy, {
                header: 'Discontinue policy',
                width: 'auto',
            });
            dialogRef.onClose.pipe(takeUntil(this._destroy$)).subscribe((result) => {
                if (!result) {
                    return;
                }
                this.loading = true;
                this.policyEngineService.discontinue(element.id, result).pipe(takeUntil(this._destroy$)).subscribe((policies) => {
                    this.loadAllPolicy();
                }, () => this.loading = false);

                dialogRef?.close();
                dialogRef = undefined;
            });
        }

        setTimeout(() => this.publishMenuSelector = null, 0);
    }

    private onDryRunAction(event: any, element: any) {
        if (event.value.id === 'Publish') {
            this.setVersion(element);
        } else if (event.value.id === 'Draft') {
            this.draft(element);
        }

        setTimeout(() => this.publishMenuSelector = null, 0);
    }

    private onPublishErrorAction(event: any, element: any) {
        if (event.value.id === 'Publish') {
            this.setVersion(element);
        }
        // else if (event.id === 'Draft') {
        //     this.draft(element);
        // }
        setTimeout(() => this.publishMenuSelector = null, 0);
    }

    public createMultiPolicy(element: any) {
        const dialogRef = this.dialogService.open(MultiPolicyDialogComponent, {
            showHeader: false,
            width: '650px',
            styleClass: 'guardian-dialog',
            data: {
                policyId: element.id
            }
        });

        dialogRef.onClose.pipe(takeUntil(this._destroy$)).subscribe(async (result) => {
            if (result) {
                this.importPolicyDetails(result);
            }

            this.loadPolicy();
        });
    }

    public comparePolicy(policy?: any) {
        const item = this.policies?.find((e) => e.id === policy?.id);
        const dialogRef = this.dialogService.open(ComparePolicyDialog, {
            header: 'Policy Comparison',
            width: '900px',
            styleClass: 'custom-dialog',
            data: {
                policy: item
            },
        });
        dialogRef.onClose.pipe(takeUntil(this._destroy$)).subscribe(async (result) => {
            if (result) {
                const items = btoa(JSON.stringify({
                    parent: null,
                    items: result
                }));
                this.router.navigate(['/compare'], {
                    queryParams: {
                        type: 'policy',
                        items
                    },
                });
            }
        });
    }

    public migrateData(policy?: any) {
        const item = this.policies?.find((e) => e.id === policy?.id);
        this.loading = true;
        this.contractSerivce.getContracts({ type: ContractType.RETIRE }).pipe(takeUntil(this._destroy$)).subscribe({
            next: (res) => {
                const dialogRef = this.dialogService.open(MigrateData, {
                    header: 'Migrate Data',
                    width: '750px',
                    styleClass: 'custom-dialog',
                    data: {
                        policy: item,
                        policies: this.policies?.filter(item => PolicyHelper.isRun(item)),
                        contracts: res.body
                    },
                });
                dialogRef.onClose.pipe(takeUntil(this._destroy$)).subscribe(async (result) => {
                    if (!result) {
                        return;
                    }
                    this.policyEngineService.migrateDataAsync(result).pipe(takeUntil(this._destroy$)).subscribe(
                        (result) => {
                            const { taskId } = result;
                            this.router.navigate(['task', taskId], {
                                queryParams: {
                                    last: btoa(location.href),
                                },
                            });
                        },
                        (e) => {
                            this.loading = false;
                        }
                    );
                });
            },
            complete: () => this.loading = false
        })

    }

    public createNewPolicy() {
        const dialogRef = this.dialogService.open(NewPolicyDialog, {
            showHeader: false,
            header: 'New Policy',
            width: '650px',
            styleClass: 'guardian-dialog',
        });
        dialogRef.onClose.pipe(takeUntil(this._destroy$)).subscribe(async (result) => {
            if (result) {
                this.loading = true;
                this.policyEngineService.pushCreate(result).pipe(takeUntil(this._destroy$)).subscribe(
                    (result) => {
                        const { taskId, expectation } = result;
                        this.router.navigate(['/task', taskId]);
                    },
                    (e) => {
                        this.loading = false;
                    }
                );
            }
        });
    }

    public openPolicyWizardDialog() {
        this.loading = true;
        forkJoin([
            this.tokenService.getTokens(),
            this.schemaService.getSchemasByPage(),
            this.policyEngineService.all(),
            this.policyEngineService.getPolicyCategories()
        ]).pipe(takeUntil(this._destroy$)).subscribe(
            (result) => {
                const tokens = result[0].map((token) => new Token(token));
                const schemas = result[1].body?.map((schema) => new Schema(schema)) ?? [];
                const policies = result[2];
                const categories = result[3];
                this.wizardService.openPolicyWizardDialog(
                    WizardMode.CREATE,
                    (value) => {
                        this.loading = true;
                        this.wizardService
                            .createPolicyAsync({
                                wizardConfig: value.config,
                                saveState: value.saveState,
                            })
                            .pipe(takeUntil(this._destroy$)).subscribe(
                                (result) => {
                                    const { taskId, expectation } = result;
                                    this.router.navigate(['task', taskId], {
                                        queryParams: {
                                            last: btoa(location.href),
                                        },
                                    });
                                },
                                (e) => {
                                    this.loading = false;
                                }
                            );
                    },
                    tokens,
                    schemas,
                    policies
                );
            },
            () => undefined,
            () => (this.loading = false)
        );
    }

    public applyFilters(): void {
        if (this.filters.policyName) {
            if (this.filters.tag) {
                this.filterByNameAndTag();
                this.noFilterResults = this.filteredPolicies.length === 0;
            } else {
                this.filterByPolicyName();
                this.noFilterResults = this.filteredPolicies.length === 0;
            }
        } else if (this.filters.tag) {
            this.filterByTag();
            this.noFilterResults = this.filteredPolicies.length === 0;
        } else {
            this.filteredPolicies = [];
            this.noFilterResults = false;
        }
    }

    public clearFilters(): void {
        this.filtersForm.reset({ policyName: '', tag: '' });
        this.filteredPolicies = [];
        this.noFilterResults = false;
    }

    private filterByPolicyName(): void {
        this.filteredPolicies =
            this.policies?.filter((policy) =>
                this.isPolicyNameEqualToFilter(policy)
            ) || [];
    }

    private filterByTag(): void {
        this.filteredPolicies =
            this.policies?.filter((policy) =>
                this.isTagAssignedToPolicy(policy._tags)
            ) || [];
    }

    private filterByNameAndTag(): void {
        this.filteredPolicies =
            this.policies?.filter(
                (policy) =>
                    this.isPolicyNameEqualToFilter(policy) &&
                    this.isTagAssignedToPolicy(policy._tags)
            ) || [];
    }

    private handleTagsUpdate(): void {
        this.tagsService.tagsUpdated$.pipe(takeUntil(this._destroy$)).subscribe({
            next: () => this.loadAllPolicy(),
        });
    }

    private isPolicyNameEqualToFilter(policy: any): boolean {
        return policy.name
            .toLowerCase()
            .includes(this.filters.policyName.toLowerCase());
    }

    private isTagAssignedToPolicy(_tags: any): boolean {
        return (
            _tags?.tags.filter((tag: any) =>
                tag.name.toLowerCase().includes(this.filters.tag.toLowerCase())
            ).length > 0
        );
    }

    public searchPolicy(policy?: any) {
        const item = this.policies?.find((e) => e.id === policy?.id);
        const dialogRef = this.dialogService.open(SearchPolicyDialog, {
            showHeader: false,
            width: '1100px',
            styleClass: 'custom-dialog custom-header-dialog',
            data: {
                policy: item
            }
        });
        dialogRef.onClose.pipe(takeUntil(this._destroy$)).subscribe(async (result) => {
            if (result) {
                const items = btoa(JSON.stringify({
                    parent: null,
                    items: result
                }));
                this.router.navigate(['/compare'], {
                    queryParams: {
                        type: 'policy',
                        items
                    },
                });
            }
        });
    }

    public openSuggestionsDialog() {
        this.dialogService
            .open(SuggestionsConfigurationComponent, {
                height: '640px',
                width: '860px',
                closable: true,
                header: 'Suggestions',
            })
            .onClose.pipe(takeUntil(this._destroy$)).subscribe();
    }

    public onChangeStatus(event: any, policy: any): void {
        switch (policy.status) {
            case PolicyStatus.DRAFT:
                this.onPublishAction(event, policy);
                break;
            case PolicyStatus.DRY_RUN:
                this.onDryRunAction(event, policy);
                break;
            case PolicyStatus.PUBLISH:
                this.onPublishedAction(event, policy);
                break;
            default:
                this.onPublishErrorAction(event, policy)
        }
    }

    public addTest(policy: any) {
        const item = this.policies?.find((e) => e.id === policy?.id);
        const dialogRef = this.dialogService.open(NewImportFileDialog, {
            header: 'Add Policy Tests',
            width: '600px',
            styleClass: 'custom-dialog',
            data: {
                policy: item,
                fileExtension: 'record',
                label: 'Add test .record file',
                multiple: true,
                type: 'File'
            }
        });
        dialogRef.onClose.pipe(takeUntil(this._destroy$)).subscribe(async (files) => {
            if (files) {
                this.loading = true;
                this.policyEngineService.addPolicyTest(item.id, files)
                    .pipe(takeUntil(this._destroy$)).subscribe((result) => {
                        this.loadAllPolicy();
                    }, (e) => {
                        this.loading = false;
                    })
            }
        });
    }

    public testDetails(policy: any) {
        const item = this.policies?.find((e) => e.id === policy?.id);
        const dialogRef = this.dialogService.open(PolicyTestDialog, {
            showHeader: false,
            header: 'Policy Tests',
            width: '1100px',
            styleClass: 'guardian-dialog',
            data: {
                policy: item
            }
        });
        dialogRef.onClose.pipe(takeUntil(this._destroy$)).subscribe(async (result) => { });
    }

    public onRunTest($event: any) {
        const { policy, test } = $event;
        this.loading = true;
        this.policyEngineService
            .runTest(policy.id, test.id)
            .pipe(takeUntil(this._destroy$)).subscribe((result) => {
                this.loadAllPolicy();
            }, (e) => {
                this.loading = false;
            });
    }

    public onAddTest($event: any) {
        const { policy } = $event;
        this.addTest(policy);
    }

    private updatePolicyTest(event: any) {
        const policy = this.policies?.find((e: any) => e.id === event.policyId);
        if (!policy) {
            return;
        }
        const test = policy.tests?.find((e: any) => e.id === event.id);
        if (!policy) {
            return;
        }
        test.date = event.date;
        test.progress = event.progress;
        test.status = event.status;
    }

    public onChangeTab(tab: any) {
        this.loading = true;
        this.tab = tab.index === 0 ? LocationType.LOCAL : LocationType.REMOTE;
        this.pageIndex = 0;
        this.router.navigate([], {
            queryParams: { tab: this.tab }
        });
        this.loadAllPolicy();
    }

    // public importExternalPolicy() {
    //     this.router.navigate(['/external-policies']);
    // }

    public importExternalPolicy() {
        const dialogRef = this.dialogService.open(SearchExternalPolicyDialog, {
            showHeader: false,
            width: '720px',
            styleClass: 'guardian-dialog',
        });
        dialogRef.onClose.pipe(takeUntil(this._destroy$)).subscribe(async (result: any | null) => {
            if (result) {
                // this.loadAllPolicy();
                this.router.navigate(['/external-policies']);
            }
        });
    }

    public onCopyMessage(row: any): void {
        this.handleCopyToClipboard(row.messageId)
    }

    private handleCopyToClipboard(text: string): void {
        navigator.clipboard.writeText(text || '');
    }

    public userPolicyManage(policy?: any) {
        this.policySubMenu?.hide();
        const dialogRef = this.dialogService.open(UserPolicyDialog, {
            showHeader: false,
            width: '720px',
            styleClass: 'guardian-dialog',
            data: {
                policy
            },
        });
        dialogRef.onClose.pipe(takeUntil(this._destroy$)).subscribe(async (options) => { });
    }
}
