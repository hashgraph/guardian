import { ChangeDetectorRef, Component, Inject, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { ContractType, IUser, PolicyType, Schema, SchemaHelper, TagType, Token, UserRole } from '@guardian/interfaces';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { ProfileService } from 'src/app/services/profile.service';
import { TokenService } from 'src/app/services/token.service';
import { ExportPolicyDialog } from '../helpers/export-policy-dialog/export-policy-dialog.component';
import { NewPolicyDialog } from '../helpers/new-policy-dialog/new-policy-dialog.component';
import { ImportPolicyDialog } from '../helpers/import-policy-dialog/import-policy-dialog.component';
import { PreviewPolicyDialog } from '../helpers/preview-policy-dialog/preview-policy-dialog.component';
import { TasksService } from 'src/app/services/tasks.service';
import { InformService } from 'src/app/services/inform.service';
import { MultiPolicyDialogComponent } from '../helpers/multi-policy-dialog/multi-policy-dialog.component';
import { ComparePolicyDialog } from '../helpers/compare-policy-dialog/compare-policy-dialog.component';
import { TagsService } from 'src/app/services/tag.service';
import { forkJoin } from 'rxjs';
import { SchemaService } from 'src/app/services/schema.service';
import { WizardMode, WizardService } from 'src/app/modules/policy-engine/services/wizard.service';
import { FormControl, FormGroup } from '@angular/forms';
import { AnalyticsService } from 'src/app/services/analytics.service';
import { SearchPolicyDialog } from '../../analytics/search-policy-dialog/search-policy-dialog.component';
import { mobileDialog } from 'src/app/utils/mobile-utils';
import { DialogService } from 'primeng/dynamicdialog';
import { SuggestionsConfigurationComponent } from '../../../views/suggestions-configuration/suggestions-configuration.component';
import { DeletePolicyDialogComponent } from '../helpers/delete-policy-dialog/delete-policy-dialog.component';
import { SetVersionDialog } from '../../schema-engine/set-version-dialog/set-version-dialog.component';
import { CONFIGURATION_ERRORS } from '../injectors/configuration.errors.injector';
import { DiscontinuePolicy } from '../dialogs/discontinue-policy/discontinue-policy.component';
import { MigrateData } from '../dialogs/migrate-data/migrate-data.component';
import { ContractService } from 'src/app/services/contract.service';

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
    public policies: any[] | null;
    public role!: any;
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
    private columnsRole: any = {};
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
            description:
                'Run without making any persistent \n changes or executing transaction.',
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
        // {
        //     id: 'Draft',
        //     title: 'Stop',
        //     description: 'Return to editing.',
        //     color: '#9c27b0'
        // },
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
        private changeDetector: ChangeDetectorRef,
        private contractSerivce: ContractService,
        @Inject(CONFIGURATION_ERRORS)
        private _configurationErrors: Map<string, any>
    ) {
        this.policies = null;
        this.pageIndex = 0;
        this.pageSize = 10;
        this.policiesCount = 0;
        this.columnsRole = {};
        this.columnsRole[UserRole.STANDARD_REGISTRY] = [
            'name',
            'description',
            // 'roles',
            'topic',
            'version',
            'tags',
            'tokens',
            'schemas',
            'status',
            'instance',
            'operations',
        ];
        this.columnsRole[UserRole.USER] = [
            'name',
            'description',
            'roles',
            'version',
            'tags',
            'status',
            'instance',
        ];
    }

    ngOnInit() {
        this.loading = true;
        this.loadPolicy();
        this.handleTagsUpdate();
    }

    private loadPolicy() {
        this.policies = null;
        this.isConfirmed = false;
        this.loading = true;
        forkJoin([
            this.profileService.getProfile(),
            this.tagsService.getPublishedSchemas(),
        ]).subscribe(
            (value) => {
                const profile: IUser | null = value[0];
                const tagSchemas: any[] = value[1] || [];

                this.isConfirmed = !!(profile && profile.confirmed);
                this.role = profile ? profile.role : null;
                this.owner = profile?.did;
                this.tagSchemas = SchemaHelper.map(tagSchemas);

                if (this.role == UserRole.STANDARD_REGISTRY) {
                    this.columns = this.columnsRole[UserRole.STANDARD_REGISTRY];
                } else {
                    this.columns = this.columnsRole[UserRole.USER];
                }
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
        this.policyEngineService.page(this.pageIndex, this.pageSize).subscribe(
            (policiesResponse) => {
                this.policies = policiesResponse.body?.map(policy => {
                    if (policy.discontinuedDate) {
                        policy.discontinuedDate = new Date(policy.discontinuedDate);
                    }
                    return policy;
                }) || [];
                this.policiesCount =
                    policiesResponse.headers.get('X-Total-Count') ||
                    this.policies.length;
                const ids = this.policies.map((e) => e.id);
                this.tagsService.search(this.tagEntity, ids).subscribe(
                    (data) => {
                        if (this.policies) {
                            for (const policy of this.policies) {
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
                        }
                        setTimeout(() => {
                            this.loading = false;
                        }, 500);
                    },
                    (e) => {
                        console.error(e.error);
                        this.loading = false;
                    }
                );
            },
            (e) => {
                this.loading = false;
            }
        );
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

    public canDisplayColumn(columnName: string): boolean {
        return !!this.columns.find((column) => column === columnName);
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
        const dialogRef = this.dialog.open(SetVersionDialog, {
            width: '350px',
            disableClose: false,
            data: {},
        });
        dialogRef.afterClosed().subscribe((version) => {
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

    public deletePolicy(policyId: any, previousVersion: any) {
        const dialogRef = this.dialogService.open(DeletePolicyDialogComponent, {
            header: 'Delete Policy',
            width: '720px',
            styleClass: 'custom-dialog',
            data: {
                notificationText: !previousVersion
                    ? 'Are you sure want to delete policy with related schemas?'
                    : 'Are you sure want to delete policy?',
            },
        });
        dialogRef.onClose.subscribe((result) => {
            if (!result) {
                return;
            }

            this.loading = true;
            this.policyEngineService.pushDelete(policyId).subscribe(
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

    public exportPolicy(policyId: any) {
        this.policyEngineService
            .exportInMessage(policyId)
            .subscribe((exportedPolicy) =>
                this.dialogService.open(ExportPolicyDialog, {
                    header: 'Export',
                    width: '700px',
                    styleClass: 'custom-dialog',
                    data: {
                        policy: exportedPolicy,
                    },
                })
            );
    }

    public exportPolicyData(policyId: any) {
        this.policyEngineService
            .exportPolicyData(policyId)
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

    public exportVirtualKeys(policyId: any) {
        this.policyEngineService
            .exportVirtualKeys(policyId)
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
    public importVirtualKeys(policyId: any) {
        const handler = () => {
            input.removeEventListener('change', handler);
            this._input = null;
            this.loading = true;
            this.policyEngineService
                .importVirtualKeys(policyId, input.files![0])
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
                width: '720px',
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

                let versionOfTopicId = result.versionOfTopicId || null;
                this.loading = true;
                if (type == 'message') {
                    this.policyEngineService
                        .pushImportByMessage(data, versionOfTopicId, {
                            tools: result.tools
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
                } else if (type == 'file') {
                    this.policyEngineService
                        .pushImportByFile(data, versionOfTopicId, {
                            tools: result.tools
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
                width: '720px',
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

    public exportToExcel(policyId: any) {
        this.policyEngineService
            .exportToExcel(policyId)
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

    public importFromExcel(policyId: any) {
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
                this.importExcelDetails(result, policyId);
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

    onPublishedAction(event: any, element: any) {
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

    public getColor(status: string, expired: boolean = false) {
        switch (status) {
            case 'DRAFT':
                return 'grey';
            case 'DRY-RUN':
                return 'grey';
            case 'DISCONTINUED':
            case 'PUBLISH_ERROR':
                return 'red';
            case 'PUBLISH':
                return expired ? 'yellow' : 'green';
            default:
                return 'grey';
        }
    }

    public getLabelStatus(status: string, expired: boolean = false) {
        switch (status) {
            case 'DRAFT':
                return 'Draft';
            case 'DRY-RUN':
                return 'Dry Run';
            case 'PUBLISH_ERROR':
                return 'Publish Error';
            case 'PUBLISH':
                return `Published${expired ? '*' : ''}`;
            case 'DISCONTINUED':
                return `Discontinued`;
            default:
                return 'Incorrect status';
        }
    }

    private processPublishResult(taskId: string): void {
        this.taskService.get(taskId).subscribe((task: any) => {
            const { result } = task;
            if (result) {
                const { isValid, errors, policyId } = result;
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
                } else {
                    this.wizardService.removeWizardPreset(policyId);
                }
                this.loadAllPolicy();
            }
        });
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

    public comparePolicy(policyId?: any) {
        const item = this.policies?.find((e) => e.id === policyId);
        const dialogRef = this.dialogService.open(ComparePolicyDialog, {
            header: 'Compare Policy',
            width: '650px',
            styleClass: 'custom-dialog',
            data: {
                policy: item,
                policies: this.policies,
            },
        });
        dialogRef.onClose.subscribe(async (result) => {
            if (result && result.policyIds) {
                const policyIds: string[] = result.policyIds;
                if (policyIds.length === 2) {
                    this.router.navigate(['/compare'], {
                        queryParams: {
                            type: 'policy',
                            policyId1: policyIds[0],
                            policyId2: policyIds[1],
                        },
                    });
                } else {
                    this.router.navigate(['/compare'], {
                        queryParams: {
                            type: 'multi-policy',
                            policyIds: policyIds,
                        },
                    });
                }
            }
        });
    }

    public migrateData(policyId?: any) {
        const item = this.policies?.find((e) => e.id === policyId);
        this.loading = true;
        this.contractSerivce.getContracts({ type: ContractType.RETIRE }).subscribe({
            next: (res) => {
                const dialogRef = this.dialogService.open(MigrateData, {
                    header: 'Migrate Data',
                    width: '750px',
                    styleClass: 'custom-dialog',
                    data: {
                        policy: item,
                        policies: this.policies?.filter(item => [PolicyType.PUBLISH, PolicyType.DISCONTINUED, PolicyType.DRY_RUN].includes(item.status)),
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
            this.schemaService.getSchemas(),
            this.policyEngineService.all(),
            this.policyEngineService.getPolicyCategories()
        ]).subscribe(
            (result) => {
                const tokens = result[0].map((token) => new Token(token));
                const schemas = result[1].map((schema) => new Schema(schema));
                const policies = result[2];
                const categories = result[3];
                this.wizardService.openPolicyWizardDialog(
                    WizardMode.CREATE,
                    (value) => {
                        this.loading = true;
                        console.log(value);
                        this.wizardService
                            .createPolicyAsync({
                                wizardConfig: value.config,
                                saveState: value.saveState,
                            })
                            .subscribe(
                                (result) => {
                                    console.log(result);
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

    private get filters(): { policyName: string; tag: string } {
        return {
            policyName: this.filtersForm.value?.policyName?.trim(),
            tag: this.filtersForm.value?.tag,
        };
    }

    get isFilterButtonDisabled(): boolean {
        return this.filters.policyName.length === 0 && !this.filters.tag;
    }

    get policiesList(): any[] {
        return this.filteredPolicies.length > 0
            ? this.filteredPolicies
            : this.policies || [];
    }

    get hasPolicies(): boolean {
        return this.policiesList.length > 0;
    }

    get hasTagOptions(): boolean {
        return this.tagOptions.length > 0;
    }

    public searchPolicy(policyId: any) {
        this.loading = true;
        this.analyticsService.searchPolicies({ policyId }).subscribe(
            (data) => {
                this.loading = false;
                if (!data || !data.result) {
                    return;
                }
                const { target, result } = data;
                const list = result.sort((a: any, b: any) =>
                    a.rate > b.rate ? -1 : 1
                );
                const policy = target;
                this.dialog.open(SearchPolicyDialog, {
                    panelClass: 'g-dialog',
                    disableClose: true,
                    autoFocus: false,
                    data: {
                        header: 'Result',
                        policy,
                        policyId,
                        list,
                    },
                });
            },
            ({ message }) => {
                this.loading = false;
                console.error(message);
            }
        );
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

    public getStatusName(policy: any): string {
        if (policy.status == 'DRAFT') {
            return 'Draft';
        }
        if (policy.status == 'DRY-RUN') {
            return 'In Dry Run';
        }
        if (policy.status == 'PUBLISH') {
            return `Published${!!policy.discontinuedDate ? '*' : ''}`;
        }
        return 'Not published';
    }

    public onChangeStatus(event: any, policy: any): void {
        switch(policy.status) {
            case 'DRAFT':
                this.onPublishAction(event, policy);
                break;
            case 'DRY-RUN':
                this.onDryRunAction(event, policy);
                break;
            case 'PUBLISH':
                this.onPublishedAction(event, policy);
                break;
            default:
                this.onPublishErrorAction(event, policy)
        }
    }

    public getStatusOptions(policy: any) {
        if (policy.status == 'DRAFT') {
            return this.publishMenuOption;
        }
        if (policy.status == 'DRY-RUN') {
            return this.draftMenuOption;
        }
        if (policy.status == 'PUBLISH') {
            return this.publishedMenuOption;
        } else {
            return this.publishErrorMenuOption;
        }
    }

    public getDiscontinuedTooltip(date: Date) {
        return date ? `Discontinue date is ${date.toLocaleString()}` : '';
    }
}
