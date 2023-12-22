import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { GenerateUUIDv4, IUser, SchemaHelper, TagType } from '@guardian/interfaces';
import { forkJoin } from 'rxjs';
import { ConfirmationDialogComponent } from 'src/app/modules/common/confirmation-dialog/confirmation-dialog.component';
import { InformService } from 'src/app/services/inform.service';
import { ProfileService } from 'src/app/services/profile.service';
import { TagsService } from 'src/app/services/tag.service';
import { ToolsService } from 'src/app/services/tools.service';
import { CompareModulesDialogComponent } from '../helpers/compare-modules-dialog/compare-modules-dialog.component';
import { ExportPolicyDialog } from '../helpers/export-policy-dialog/export-policy-dialog.component';
import { ImportPolicyDialog } from '../helpers/import-policy-dialog/import-policy-dialog.component';
import { NewModuleDialog } from '../helpers/new-module-dialog/new-module-dialog.component';
import { PreviewPolicyDialog } from '../helpers/preview-policy-dialog/preview-policy-dialog.component';
import { mobileDialog } from 'src/app/utils/mobile-utils';
import { DialogService } from 'primeng/dynamicdialog';

enum OperationMode {
    None,
    Create,
    Import,
    Publish,
    Delete
}

/**
 * Component for choosing a policy and
 * display blocks of the selected policy
 */
@Component({
    selector: 'app-tools-list',
    templateUrl: './tools-list.component.html',
    styleUrls: ['./tools-list.component.scss']
})
export class ToolsListComponent implements OnInit, OnDestroy {
    public loading: boolean = true;
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
    public tagEntity = TagType.Tool;
    public owner: any;
    public tagSchemas: any[] = [];
    public canPublishAnyTool: boolean = false;

    constructor(
        public tagsService: TagsService,
        private profileService: ProfileService,
        private toolsService: ToolsService,
        private dialog: MatDialog,
        private dialogService: DialogService,
        private informService: InformService,
        private router: Router,
    ) {
        this.tools = null;
        this.pageIndex = 0;
        this.pageSize = 10;
        this.toolsCount = 0;
    }

    ngOnInit() {
        this.loading = true;
        this.loadTools();
    }

    ngOnDestroy() {

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
        this.toolsService.page(this.pageIndex, this.pageSize).subscribe((policiesResponse) => {
            this.tools = policiesResponse.body || [];
            this.toolsCount = policiesResponse.headers.get('X-Total-Count') || this.tools.length;
            this.canPublishAnyTool = this.tools.some(tool => tool.status === 'DRAFT');

            const ids = this.tools.map(e => e.id);
            this.tagsService.search(this.tagEntity, ids).subscribe((data) => {
                if (this.tools) {
                    for (const policy of this.tools) {
                        (policy as any)._tags = data[policy.id];
                    }
                }
                setTimeout(() => {
                    this.loading = false;
                }, 500);
            }, (e) => {
                console.error(e.error);
                this.loading = false;
            });
        }, (e) => {
            this.loading = false;
        });
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

    private importDetails(result: any) {
        const { type, data, tool } = result;
        const dialogRef = this.dialogService.open(PreviewPolicyDialog, {
            header: 'Import tool',
            width: '720px',
            styleClass: 'custom-dialog',
            data: {
                tool: tool,
            }
        });
        dialogRef.onClose.subscribe(async (result) => {
            if (result) {
                if (type === 'message') {
                    this.loading = true;
                    this.toolsService.importByMessage(data).subscribe(
                        (result) => {
                            this.loadAllTools();
                        }, (e) => {
                            this.loading = false;
                        });
                } else if (type === 'file') {
                    this.loading = true;
                    this.toolsService.importByFile(data).subscribe(
                        (result) => {
                            this.loadAllTools();
                        }, (e) => {
                            this.loading = false;
                        });
                }
            }
        });
    }

    public importTool(messageId?: string) {
        const dialogRef = this.dialogService.open(ImportPolicyDialog, {
            width: '720px',
            header: 'Select action',
            styleClass: 'custom-dialog',
            closable: true,
            data: {
                type: 'tool',
                timeStamp: messageId
            }
        });
        dialogRef.onClose.subscribe(async (result) => {
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
                type: 'Tool',
                tools: this.tools,
            }
        });
        dialogRef.onClose.subscribe(async (result) => {
            if (result) {
                this.router.navigate(['/compare'], {
                    queryParams: {
                        type: 'tool',
                        toolId1: result.itemId1,
                        toolId2: result.itemId2
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
                    width: '700px',
                    header: 'Export',
                    styleClass: 'custom-dialog',
                    data: {
                        tool
                    },
                    closable: true
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
        const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
            data: {
                dialogTitle: 'Delete tool',
                dialogText: 'Are you sure to delete tool?'
            },
            disableClose: true,
            autoFocus: false
        });
        dialogRef.afterClosed().subscribe((result) => {
            if (!result) {
                return;
            }
            this.loading = true;
            this.toolsService.delete(element.id).subscribe((result) => {
                this.loadAllTools();
            }, (e) => {
                this.loading = false;
            });
        });
    }

    public publishTool(element: any) {
        this.loading = true;
        this.toolsService.pushPublish(element.id).subscribe((result) => {
            const { taskId, expectation } = result;
            this.router.navigate(['task', taskId], {
                queryParams: {
                    last: btoa(location.href)
                }
            });
        }, (e) => {
            this.loading = false;
        });
    }

    newOnPage() {
        this.pageIndex = 0;
        this.loadTools();
    }

    movePageIndex(inc: number) {
        if (
            inc > 0 &&
            this.pageIndex < this.toolsCount / this.pageSize - 1
        ) {
            this.pageIndex += 1;
            this.loadTools();
        } else if (inc < 0 && this.pageIndex > 0) {
            this.pageIndex -= 1;
            this.loadTools();
        }
    }
}
