import { Component, Inject, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { ContractType, IUser, PolicyHelper, PolicyType, Schema, SchemaHelper, TagType, Token, UserPermissions } from '@guardian/interfaces';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { ProfileService } from 'src/app/services/profile.service';
import { TokenService } from 'src/app/services/token.service';
import { ExportPolicyDialog } from '../dialogs/export-policy-dialog/export-policy-dialog.component';
import { NewPolicyDialog } from '../dialogs/new-policy-dialog/new-policy-dialog.component';
import { ImportPolicyDialog } from '../dialogs/import-policy-dialog/import-policy-dialog.component';
import { PreviewPolicyDialog } from '../dialogs/preview-policy-dialog/preview-policy-dialog.component';
import { TasksService } from 'src/app/services/tasks.service';
import { InformService } from 'src/app/services/inform.service';
import { MultiPolicyDialogComponent } from '../dialogs/multi-policy-dialog/multi-policy-dialog.component';
import { ComparePolicyDialog } from '../dialogs/compare-policy-dialog/compare-policy-dialog.component';
import { TagsService } from 'src/app/services/tag.service';
import { forkJoin, Subscription } from 'rxjs';
import { SchemaService } from 'src/app/services/schema.service';
import { WizardMode, WizardService } from 'src/app/modules/policy-engine/services/wizard.service';
import { FormControl, FormGroup } from '@angular/forms';
import { AnalyticsService } from 'src/app/services/analytics.service';
import { SearchPolicyDialog } from '../../analytics/search-policy-dialog/search-policy-dialog.component';
import { mobileDialog } from 'src/app/utils/mobile-utils';
import { DialogService } from 'primeng/dynamicdialog';
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
    permissions: (user: UserPermissions) => {
        return true;
    }
}, {
    id: 'description',
    permissions: (user: UserPermissions) => {
        return true;
    }
}, {
    id: 'topic',
    permissions: (user: UserPermissions) => {
        return (
            user.POLICIES_POLICY_CREATE ||
            user.POLICIES_POLICY_UPDATE ||
            user.POLICIES_POLICY_REVIEW ||
            user.POLICIES_POLICY_DELETE
        )
    }
}, {
    id: 'roles',
    permissions: (user: UserPermissions) => {
        return !(
            user.POLICIES_POLICY_CREATE ||
            user.POLICIES_POLICY_UPDATE ||
            user.POLICIES_POLICY_REVIEW ||
            user.POLICIES_POLICY_DELETE
        )
    }
}, {
    id: 'version',
    permissions: (user: UserPermissions) => {
        return true;
    }
}, {
    id: 'tests',
    permissions: (user: UserPermissions) => {
        return (
            user.POLICIES_POLICY_CREATE ||
            user.POLICIES_POLICY_UPDATE ||
            user.POLICIES_POLICY_REVIEW ||
            user.POLICIES_POLICY_DELETE
        )
    }
}, {
    id: 'tags',
    permissions: (user: UserPermissions) => {
        return true;
    }
}, {
    id: 'tokens',
    permissions: (user: UserPermissions) => {
        return user.TOKENS_TOKEN_READ;
    }
}, {
    id: 'schemas',
    permissions: (user: UserPermissions) => {
        return user.SCHEMAS_SCHEMA_READ;
    }
}, {
    id: 'status',
    permissions: (user: UserPermissions) => {
        return true;
    }
}, {
    id: 'instance',
    permissions: (user: UserPermissions) => {
        return true;
    }
}, {
    id: 'operations',
    permissions: (user: UserPermissions) => {
        return (
            user.POLICIES_POLICY_CREATE ||
            user.POLICIES_POLICY_UPDATE ||
            user.POLICIES_POLICY_REVIEW ||
            user.POLICIES_POLICY_DELETE
        )
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

    private filteredPolicies: any[] = [];
    public filtersForm = new FormGroup({
        policyName: new FormControl(''),
        tag: new FormControl(''),
    }, (fg) => {
        for (const key in (fg as FormGroup).controls) {
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
            status === PolicyType.PUBLISH ||
            status === PolicyType.DRY_RUN ||
            status === PolicyType.DEMO ||
            status === PolicyType.DISCONTINUED
        )
    }

    public instanceLabel(policy: any): string {
        if (this.user?.POLICIES_POLICY_MANAGE) {
            if (
                policy.status === PolicyType.PUBLISH ||
                policy.status === PolicyType.DISCONTINUED
            ) {
                return 'Open';
            } else if (
                policy.status === PolicyType.DEMO
            ) {
                return 'Demo';
            } else {
                return 'Dry run';
            }
        } else {
            return 'Register'
        }
    }

    public showStatus(policy: any): boolean {
        return (
            policy.status === PolicyType.DRAFT ||
            policy.status === PolicyType.DRY_RUN ||
            policy.status === PolicyType.PUBLISH_ERROR ||
            policy.status === PolicyType.PUBLISH
        )
    }

    public showInstance(policy: any): boolean {
        return (
            policy.status === PolicyType.DRY_RUN ||
            policy.status === PolicyType.DEMO ||
            policy.status === PolicyType.PUBLISH ||
            policy.status === PolicyType.DISCONTINUED
        )
    }

    public canDisplayColumn(columnName: string): boolean {
        return !!this.columns.find((column) => column === columnName);
    }

    public getColor(status: string, expired: boolean = false) {
        switch (status) {
            case PolicyType.DRAFT:
                return 'grey';
            case PolicyType.DRY_RUN:
                return 'grey';
            case PolicyType.DISCONTINUED:
            case PolicyType.PUBLISH_ERROR:
                return 'red';
            case PolicyType.PUBLISH:
                return expired ? 'yellow' : 'green';
            default:
                return 'grey';
        }
    }

    public getLabelStatus(status: string, expired: boolean = false) {
        switch (status) {
            case PolicyType.DRAFT:
                return 'Draft';
            case PolicyType.DRY_RUN:
                return 'Dry Run';
            case PolicyType.PUBLISH_ERROR:
                return 'Publish Error';
            case PolicyType.PUBLISH:
                return `Published${expired ? '*' : ''}`;
            case PolicyType.DISCONTINUED:
                return `Discontinued`;
            default:
                return 'Incorrect status';
        }
    }

    public getStatusName(policy: any): string {
        if (policy.status === PolicyType.DRAFT) {
            return 'Draft';
        }
        if (policy.status === PolicyType.DRY_RUN) {
            return 'In Dry Run';
        }
        if (policy.status === PolicyType.PUBLISH) {
            return `Published${!!policy.discontinuedDate ? '*' : ''}`;
        }
        if (policy.status === PolicyType.DISCONTINUED) {
            return 'Discontinued';
        }
        if (policy.status === PolicyType.PUBLISH_ERROR) {
            return 'Not published';
        }
        if (policy.status === PolicyType.DEMO) {
            return 'Demo';
        }
        return 'Not published';
    }

    public getStatusOptions(policy: any) {
        if (policy.status === PolicyType.DRAFT) {
            return this.publishMenuOption;
        }
        if (policy.status === PolicyType.DRY_RUN) {
            return this.draftMenuOption;
        }
        if (policy.status === PolicyType.PUBLISH) {
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
                            policy.status === PolicyType.DRAFT ||
                            policy.status === PolicyType.DRY_RUN ||
                            policy.status === PolicyType.DEMO
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
                        disabled: policy.status !== PolicyType.DRAFT,
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
                tooltip: 'Delete',
                group: false,
                visible: true,
                buttons: [
                    new MenuButton({
                        visible: this.user.POLICIES_POLICY_DELETE,
                        disabled: !(
                            policy.status === PolicyType.DRAFT ||
                            policy.status === PolicyType.DEMO
                        ),
                        tooltip: 'Delete Policy',
                        icon: 'delete',
                        click: () => this.deletePolicy(policy)
                    })
                ]
            }]
        }
    }

    private subscription = new Subscription();

    constructor(
        public tagsService: TagsService,
        private profileService: ProfileService,
        private policyEngineService: PolicyEngineService,
        private router: Router,
        private dialog: MatDialog,
        private dialogService: DialogService,
        private taskService: TasksService,
        private informService: InformService,
        private schemaService: SchemaService,
        private wizardService: WizardService,
        private tokenService: TokenService,
        private analyticsService: AnalyticsService,
        private contractSerivce: ContractService,
        private wsService: WebSocketService,
        @Inject(CONFIGURATION_ERRORS)
        private _configurationErrors: Map<string, any>
    ) {
        this.policies = null;
        this.pageIndex = 0;
        this.pageSize = 10;
        this.policiesCount = 0;
    }

    ngOnInit() {
        this.subscription.add(
            this.wsService.testSubscribe(((test) => {
                this.updatePolicyTest(test);
            }))
        );
        this.loading = true;
        this.loadPolicy();
        this.handleTagsUpdate();
    }

    ngOnDestroy(): void {
        this.subscription.unsubscribe();
    }

    private loadPolicy() {
        this.policies = null;
        this.isConfirmed = false;
        this.loading = true;
        forkJoin([
            this.profileService.getProfile(),
            this.tagsService.getPublishedSchemas(),
        ]).subscribe((value) => {
            const profile: IUser | null = value[0];
            const tagSchemas: any[] = value[1] || [];
            this.isConfirmed = !!(profile && profile.confirmed);
            this.user = new UserPermissions(profile);
            this.owner = this.user.did;
            this.tagSchemas = SchemaHelper.map(tagSchemas);

            this.columns = columns
                .filter((c) => c.permissions(this.user))
                .map((c) => c.id);

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
        this.policyEngineService.page(this.pageIndex, this.pageSize)
            .subscribe((policiesResponse) => {
                this.policies = policiesResponse.body?.map(policy => {
                    if (policy.discontinuedDate) {
                        policy.discontinuedDate = new Date(policy.discontinuedDate);
                    }
                    return policy;
                }) || [];
                this.policiesCount =
                    policiesResponse.headers.get('X-Total-Count') ||
                    this.policies.length;

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
            this.tagsService.search(this.tagEntity, ids).subscribe((data) => {
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
        this.policyEngineService.dryRun(element.id).subscribe(
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
        this.policyEngineService.draft(element.id).subscribe(
            (data: any) => {
                const { policies, isValid, errors } = data;
                this.loadAllPolicy();
            },
            (e) => {
                this.loading = false;
            }
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
        dialogRef.onClose.subscribe(async (version) => {
            if (version) {
                this.publish(element, version);
            }
        });
    }

    private publish(element: any, version: string) {
        this.loading = true;
        this.policyEngineService.pushPublish(element.id, version).subscribe(
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
        dialogRef.onClose.subscribe((result) => {
            if (!result) {
                return;
            }

            this.loading = true;
            this.policyEngineService.pushDelete(policy?.id).subscribe(
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
        });
    }

    public exportPolicy(policy?: any) {
        this.policyEngineService
            .exportInMessage(policy?.id)
            .subscribe((exportedPolicy) => {
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
            .subscribe((response) => {
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
            .subscribe((response) => {
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
                .subscribe({
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
        const dialogRef = this.dialogService.open(ImportPolicyDialog, {
            header: 'Select action',
            width: '720px',
            styleClass: 'custom-dialog',
            data: {
                timeStamp: messageId,
            },
        });
        dialogRef.onClose.subscribe(async (result) => {
            if (result) {
                this.importPolicyDetails(result);
            }
        });
    }

    private importPolicyDetails(result: any) {
        const { type, data, policy } = result;
        const distinctPolicies = this.getDistinctPolicy();
        let dialogRef;
        if (window.innerWidth <= 810) {
            const bodyStyles = window.getComputedStyle(document.body);
            const headerHeight: number = parseInt(
                bodyStyles.getPropertyValue('--header-height')
            );
            dialogRef = this.dialogService.open(PreviewPolicyDialog, {
                header: 'Preview',
                width: `${window.innerWidth.toString()}px`,
                styleClass: 'custom-dialog',
                data: {
                    policy: policy,
                    policies: distinctPolicies,
                },
            });
        } else {
            dialogRef = this.dialogService.open(PreviewPolicyDialog, {
                header: 'Preview',
                width: '800px',
                styleClass: 'custom-dialog',
                data: {
                    policy: policy,
                    policies: distinctPolicies,
                },
            });
        }
        dialogRef.onClose.subscribe(async (result) => {
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
                }
            }
        });
    }

    private importExcelDetails(result: any, policyId: string) {
        const { type, data, xlsx } = result;
        let dialogRef;
        if (window.innerWidth <= 810) {
            const bodyStyles = window.getComputedStyle(document.body);
            const headerHeight: number = parseInt(
                bodyStyles.getPropertyValue('--header-height')
            );
            dialogRef = this.dialogService.open(PreviewPolicyDialog, {
                header: 'Preview',
                width: `${window.innerWidth.toString()}px`,
                styleClass: 'custom-dialog',
                data: {
                    xlsx: xlsx,
                },
            });
        } else {
            dialogRef = this.dialogService.open(PreviewPolicyDialog, {
                header: 'Preview',
                width: '800px',
                styleClass: 'custom-dialog',
                data: {
                    xlsx: xlsx,
                },
            });
        }
        dialogRef.onClose.subscribe(async (result) => {
            if (result) {
                this.policyEngineService
                    .pushImportByXlsx(data, policyId)
                    .subscribe(
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
        });
    }

    public exportToExcel(policy?: any) {
        this.policyEngineService
            .exportToExcel(policy?.id)
            .subscribe((fileBuffer) => {
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
        const dialogRef = this.dialogService.open(ImportPolicyDialog, {
            header: 'Select action',
            width: '720px',
            styleClass: 'custom-dialog',
            data: {
                type: 'xlsx'
            },
        });
        dialogRef.onClose.subscribe(async (result) => {
            if (result) {
                this.importExcelDetails(result, policy?.id);
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
            const dialogRef = this.dialogService.open(DiscontinuePolicy, {
                header: 'Discontinue policy',
                width: 'auto',
            });
            dialogRef.onClose.subscribe((result) => {
                if (!result) {
                    return;
                }
                this.loading = true;
                this.policyEngineService.discontinue(element.id, result).subscribe((policies) => {
                    this.loadAllPolicy();
                }, () => this.loading = false);
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
        const dialogRef = this.dialog.open(MultiPolicyDialogComponent, mobileDialog({
            width: '650px',
            panelClass: 'g-dialog',
            disableClose: true,
            autoFocus: false,
            data: {
                policyId: element.id
            }
        }));
        dialogRef.afterClosed().subscribe(async (result) => {
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
        dialogRef.onClose.subscribe(async (result) => {
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
        this.contractSerivce.getContracts({ type: ContractType.RETIRE }).subscribe({
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
                dialogRef.onClose.subscribe(async (result) => {
                    if (!result) {
                        return;
                    }
                    this.policyEngineService.migrateDataAsync(result).subscribe(
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
            header: 'New Policy',
            width: '650px',
            styleClass: 'custom-dialog',
        });
        dialogRef.onClose.subscribe(async (result) => {
            if (result) {
                this.loading = true;
                this.policyEngineService.pushCreate(result).subscribe(
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
        ]).subscribe(
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
                            .subscribe(
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
        if (this.filters.policyName && this.filters.tag) {
            this.filterByNameAndTag();
            this.noFilterResults = this.filteredPolicies.length === 0;
            return;
        }

        this.filters.policyName
            ? this.filterByPolicyName()
            : this.filterByTag();
        this.noFilterResults = this.filteredPolicies.length === 0;
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
        this.tagsService.tagsUpdated$.subscribe({
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
        dialogRef.onClose.subscribe(async (result) => {
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
            .onClose.subscribe();
    }

    public onChangeStatus(event: any, policy: any): void {
        switch (policy.status) {
            case PolicyType.DRAFT:
                this.onPublishAction(event, policy);
                break;
            case PolicyType.DRY_RUN:
                this.onDryRunAction(event, policy);
                break;
            case PolicyType.PUBLISH:
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
        dialogRef.onClose.subscribe(async (files) => {
            if (files) {
                this.loading = true;
                this.policyEngineService.addPolicyTest(item.id, files)
                    .subscribe((result) => {
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
        dialogRef.onClose.subscribe(async (result) => { });
    }

    public onRunTest($event: any) {
        const { policy, test } = $event;
        this.loading = true;
        this.policyEngineService
            .runTest(policy.id, test.id)
            .subscribe((result) => {
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
}
