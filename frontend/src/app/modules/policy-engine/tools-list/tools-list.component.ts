import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { GenerateUUIDv4, IUser, ModuleStatus, SchemaHelper, TagType, UserPermissions } from '@guardian/interfaces';
import { forkJoin, Subject, takeUntil } from 'rxjs';
import { InformService } from 'src/app/services/inform.service';
import { ProfileService } from 'src/app/services/profile.service';
import { TagsService } from 'src/app/services/tag.service';
import { ToolsService } from 'src/app/services/tools.service';
import { CompareModulesDialogComponent } from '../dialogs/compare-modules-dialog/compare-modules-dialog.component';
import { ExportPolicyDialog } from '../dialogs/export-policy-dialog/export-policy-dialog.component';
import { NewModuleDialog } from '../dialogs/new-module-dialog/new-module-dialog.component';
import { PreviewPolicyDialog } from '../dialogs/preview-policy-dialog/preview-policy-dialog.component';
import { DialogService } from 'primeng/dynamicdialog';
import { IImportEntityResult, ImportEntityDialog, ImportEntityType } from '../../common/import-entity-dialog/import-entity-dialog.component';
import { CustomConfirmDialogComponent } from '../../common/custom-confirm-dialog/custom-confirm-dialog.component';
import { PublishToolDialog } from '../dialogs/publish-tool-dialog/publish-tool-dialog.component';

enum OperationMode {
    None,
    Create,
    Import,
    Publish,
    Delete
}

/**
 * Component for choosing a tool and
 * display blocks of the selected tool
 */
@Component({
    selector: 'app-tools-list',
    templateUrl: './tools-list.component.html',
    styleUrls: ['./tools-list.component.scss']
})
export class ToolsListComponent implements OnInit, OnDestroy {
    public loading: boolean = true;
    public user: UserPermissions = new UserPermissions();
    public isConfirmed: boolean = false;
    public tools: any[] | null;
    public toolsCount: any;
    public pageIndex: number;
    public pageSize: number;
    public columns: string[] = [
        'name',
        'description',
        'topic',
        'tags',
        'schemas',
        'status',
        'operation',
        'operations'
    ];
    public mode: OperationMode = OperationMode.None;
    public taskId: string | undefined = undefined;
    public expectedTaskMessages: number = 0;
    public owner: any;
    public tagEntity = TagType.Tool;
    public tagSchemas: any[] = [];
    public tagOptions: string[] = [];

    public textSearch: string = '';
    public tagFilter: string = '';

    public publishMenuSelector: any = null;

    private draftMenuOption = [
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

    private dryRunMenuOption = [
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

    private _destroy$ = new Subject<void>();

    constructor(
        public tagsService: TagsService,
        private profileService: ProfileService,
        private toolsService: ToolsService,
        private dialog: DialogService,
        private dialogService: DialogService,
        private route: ActivatedRoute,
        private informService: InformService,
        private router: Router,
    ) {
        this.tools = null;
        this.pageIndex = 0;
        this.pageSize = 10;
        this.toolsCount = 0;
    }

    ngOnInit() {
        this.textSearch = this.route.snapshot.queryParams['search'] || '';
        this.tagFilter = this.route.snapshot.queryParams['tag'] || '';

        this.loading = true;
        this.loadTools();
    }

    ngOnDestroy() {
        this._destroy$.next();
        this._destroy$.complete();
    }

    private loadTools() {
        this.tools = null;
        this.isConfirmed = false;
        this.loading = true;
        forkJoin([
            this.profileService.getProfile(),
            this.tagsService.getPublishedSchemas()
        ]).subscribe((value) => {
            const profile: IUser | null = value[0];
            const tagSchemas: any[] = value[1] || [];

            this.isConfirmed = !!(profile && profile.confirmed);
            this.owner = profile?.did;
            this.tagSchemas = SchemaHelper.map(tagSchemas);
            this.user = new UserPermissions(profile);

            if (this.isConfirmed) {
                this.loadAllTools();
            } else {
                setTimeout(() => {
                    this.loading = false;
                }, 500);
            }
        }, (e) => {
            this.loading = false;
        });
    }

    private loadAllTools() {
        this.loading = true;
        this.tagOptions = [];
        this.toolsService.page(this.pageIndex, this.pageSize, this.textSearch, this.tagFilter).subscribe((policiesResponse) => {
            this.tools = policiesResponse.body || [];
            this.toolsCount = policiesResponse.headers.get('X-Total-Count') || this.tools.length;
            this.loadTagsData();
        }, (e) => {
            this.loading = false;
        });
    }

    private loadTagsData() {
        if (this.user.TAGS_TAG_READ) {
            const ids = this.tools?.map(e => e.id) || [];
            this.tagsService.search(this.tagEntity, ids).subscribe((data) => {
                if (this.tools) {
                    for (const tool of this.tools) {
                        (tool as any)._tags = data[tool.id];
                        data[tool.id]?.tags.forEach((tag: any) => {
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
            }, (e) => {
                console.error(e.error);
                this.loading = false;
            });
        } else {
            setTimeout(() => {
                this.loading = false;
            }, 500);
        }
    }

    public onPage(event: any) {
        if (this.pageSize != event.pageSize) {
            this.pageIndex = 0;
            this.pageSize = event.pageSize;
        } else {
            this.pageIndex = event.pageIndex;
            this.pageSize = event.pageSize;
        }
        this.loadAllTools();
    }

    private importDetails(result: IImportEntityResult) {
        const { type, data, tool } = result;
        const dialogRef = this.dialogService.open(PreviewPolicyDialog, {
            header: 'Import tool',
            width: '720px',
            styleClass: 'guardian-dialog',
            showHeader: false,
            data: {
                title: 'Import tool',
                tool: tool,
                isFile: type === 'file'
            }
        });
        dialogRef.onClose.subscribe(async (result) => {
            if (result) {
                if (type === 'message') {
                    this.loading = true;
                    this.toolsService
                        .pushImportByMessage(data, {
                            tools: result.tools
                        })
                        .pipe(takeUntil(this._destroy$))
                        .subscribe(
                            (result) => {
                                // this.loadAllTools();
                                const { taskId, expectation } = result;
                                this.router.navigate(['task', taskId], {
                                    queryParams: {
                                        last: btoa(location.href),
                                        redir: String(true)
                                    },
                                });
                            }, (e) => {
                                this.loading = false;
                            });
                } else if (type === 'file') {
                    this.loading = true;
                    this.toolsService
                        .pushImportByFile(data, {
                            tools: result.tools
                        })
                        .pipe(takeUntil(this._destroy$))
                        .subscribe(
                            (result) => {
                                // this.loadAllTools();
                                const { taskId, expectation } = result;
                                this.router.navigate(['task', taskId], {
                                    queryParams: {
                                        last: btoa(location.href),
                                        redir: String(true)
                                    },
                                });
                            }, (e) => {
                                this.loading = false;
                            });
                }
            }
        });
    }

    public importTool(messageId?: string) {
        const dialogRef = this.dialogService.open(ImportEntityDialog, {
            showHeader: false,
            width: '720px',
            styleClass: 'guardian-dialog',
            data: {
                type: ImportEntityType.Tool,
                timeStamp: messageId
            }
        });
        dialogRef.onClose.subscribe(async (result: IImportEntityResult | null) => {
            if (result) {
                this.importDetails(result);
            }
        });
    }

    public compareTools(element?: any) {
        const dialogRef = this.dialogService.open(CompareModulesDialogComponent, {
            width: '650px',
            header: 'Compare Tools',
            styleClass: 'custom-dialog',
            closable: true,
            data: {
                type: 'Tool'
            }
        });
        dialogRef.onClose.subscribe(async (result) => {
            if (result && result.itemId1 && result.itemId2) {
                const items = btoa(JSON.stringify({
                    parent: null,
                    items: [
                        result.itemId1,
                        result.itemId2
                    ].map((id) => {
                        return {
                            type: 'id',
                            value: id
                        }
                    })
                }));
                this.router.navigate(['/compare'], {
                    queryParams: {
                        type: 'tool',
                        items
                    }
                });
            }
        });
    }

    public exportTool(element: any) {
        this.loading = true;
        this.toolsService.exportInMessage(element.id)
            .subscribe(tool => {
                this.loading = false;
                this.dialogService.open(ExportPolicyDialog, {
                    showHeader: false,
                    header: 'Export Tool',
                    width: '700px',
                    styleClass: 'guardian-dialog',
                    data: {
                        tool
                    },
                })
            });
    }

    public newTool() {
        const dialogRef = this.dialogService.open(NewModuleDialog, {
            width: '650px',
            styleClass: 'custom-dialog',
            header: 'New Tool',
            closable: true,
            data: {
                type: 'tool'
            }
        });
        dialogRef.onClose.subscribe(async (result) => {
            if (result) {
                const tool = {
                    name: result.name,
                    description: result.description,
                    menu: "show",
                    config: {
                        id: GenerateUUIDv4(),
                        blockType: 'tool'
                    }
                }
                this.loading = true;
                this.toolsService.pushCreate(tool).subscribe((result) => {
                    const { taskId, expectation } = result;
                    this.router.navigate(['/task', taskId]);
                }, (e) => {
                    this.loading = false;
                });
            }
        });
    }

    public deleteTool(element: any) {
        const dialogRef = this.dialog.open(CustomConfirmDialogComponent, {
            showHeader: false,
            width: '640px',
            styleClass: 'guardian-dialog',
            data: {
                header: 'Delete Tool',
                text: `Are you sure want to delete tool (${element.name})?`,
                buttons: [{
                    name: 'Close',
                    class: 'secondary'
                }, {
                    name: 'Delete',
                    class: 'delete'
                }]
            },
        });
        dialogRef.onClose.subscribe((result: string) => {
            if (result === 'Delete') {
                this.loading = true;
                this.toolsService.delete(element.id).subscribe((result) => {
                    this.loadAllTools();
                }, (e) => {
                    this.loading = false;
                });
            }
        });
    }

    public publishTool(element: any) {
        this.setToolVersion(element);
    }
    
    public setToolVersion(tool: any) {
        const dialogRef = this.dialogService.open(PublishToolDialog, {
            showHeader: false,
            header: 'Publish Tool',
            width: '600px',
            styleClass: 'guardian-dialog'
        });
        dialogRef.onClose.pipe(takeUntil(this._destroy$)).subscribe(async (options) => {
            if (options) {
                this.loading = true;
                this.toolsService.pushPublish(tool.id, options).pipe(takeUntil(this._destroy$)).subscribe((result) => {
                    const { taskId, expectation } = result;
                    this.router.navigate(['task', taskId], {
                        queryParams: {
                            last: btoa(location.href)
                        }
                    });
                }, (e) => {
                    console.error(e.error);
                    this.loading = false;
                });
            }
        });
    }

    private dryRunTool(tool: any) {
        this.loading = true;
        this.toolsService.dryRun(tool.id).pipe(takeUntil(this._destroy$)).subscribe((data: any) => {
            const { policies, isValid, errors } = data;
            if (isValid) {
                this.loadAllTools();
            } else {
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
                    'The tool is invalid'
                );
                this.loading = false;
            }
        }, (e) => {
            console.error(e.error);
            this.loading = false;
        });
    }

    public draftTool(tool: any) {
        this.loading = true;
        this.toolsService.draft(tool.id).pipe(takeUntil(this._destroy$)).subscribe((data: any) => {
            this.loadAllTools();
        }, (e) => {
            this.loading = false;
        });
    }

    public applyFilters(): void {
        this.pageIndex = 0;
        this.router.navigate(['/tools'], {
            queryParams: {
                search: this.textSearch || null,
                tag: this.tagFilter || null
            },
        });
        this.loadTools();
    }

    public clearFilters(): void {
        this.textSearch = '';
        this.tagFilter = '';
        this.pageIndex = 0;
        this.router.navigate(['/tools'], {
            queryParams: {
                search: null,
            },
        });
        this.loadTools();
    }
    
    public getColor(status: string) {
        switch (status) {
            case ModuleStatus.DRAFT:
                return 'grey';
            case ModuleStatus.DRY_RUN:
                return 'grey';
            case ModuleStatus.PUBLISH_ERROR:
                return 'red';
            case ModuleStatus.PUBLISHED:
                return 'green';
            default:
                return 'grey';
        }
    }

    public getLabelStatus(status: string) {
        switch (status) {
            case ModuleStatus.DRAFT:
                return 'Draft';
            case ModuleStatus.DRY_RUN:
                return 'Dry Run';
            case ModuleStatus.PUBLISH_ERROR:
                return 'Publish Error';
            case ModuleStatus.PUBLISHED:
                return 'Published';
            default:
                return 'Incorrect status';
        }
    }
    
    public showStatus(tool: any): boolean {
        return (
            tool.status === ModuleStatus.DRAFT ||
            tool.status === ModuleStatus.DRY_RUN ||
            tool.status === ModuleStatus.PUBLISH_ERROR
        )
    }
    
    public getStatusOptions(tool: any) {
        if (tool.status === ModuleStatus.DRAFT) {
            return this.draftMenuOption;
        }
        if (tool.status === ModuleStatus.DRY_RUN) {
            return this.dryRunMenuOption;
        } else {
            return this.publishErrorMenuOption;
        }
    }
    
    public getStatusName(tool: any): string {
        if (tool.status === ModuleStatus.DRAFT) {
            return 'Draft';
        }
        if (tool.status === ModuleStatus.DRY_RUN) {
            return 'In Dry Run';
        }
        if (tool.status === ModuleStatus.PUBLISHED) {
            return 'Published';
        }
        if (tool.status === ModuleStatus.PUBLISH_ERROR) {
            return 'Not published';
        }
        return 'Not published';
    }
    
    public onChangeStatus(event: any, tool: any): void {
        switch (tool.status) {
            case ModuleStatus.DRAFT:
                this.onDraftMenuAction(event, tool);
                break;
            case ModuleStatus.DRY_RUN:
                this.onDryRunMenuAction(event, tool);
                break;
            default:
                this.onPublishErrorAction(event, tool);
        }
    }

    private onDraftMenuAction(event: any, element: any) {
        if (event.value.id === 'Publish') {
            this.setToolVersion(element);
        } else if (event.value.id === 'Dry-run') {
            this.dryRunTool(element);
        }

        setTimeout(() => this.publishMenuSelector = null, 0);
    }

    private onDryRunMenuAction(event: any, element: any) {
        if (event.value.id === 'Publish') {
            this.setToolVersion(element);
        } else if (event.value.id === 'Draft') {
            this.draftTool(element);
        }

        setTimeout(() => this.publishMenuSelector = null, 0);
    }

    private onPublishErrorAction(event: any, element: any) {
        if (event.value.id === 'Publish') {
            this.setToolVersion(element);
        }
        setTimeout(() => this.publishMenuSelector = null, 0);
    }
}
