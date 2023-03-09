import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { IUser } from '@guardian/interfaces';
import { ProfileService } from 'src/app/services/profile.service';
import { TokenService } from 'src/app/services/token.service';
import { ExportPolicyDialog } from '../helpers/export-policy-dialog/export-policy-dialog.component';
import { ImportPolicyDialog } from '../helpers/import-policy-dialog/import-policy-dialog.component';
import { PreviewPolicyDialog } from '../helpers/preview-policy-dialog/preview-policy-dialog.component';
import { WebSocketService } from 'src/app/services/web-socket.service';
import { TasksService } from 'src/app/services/tasks.service';
import { InformService } from 'src/app/services/inform.service';
import { ConfirmationDialogComponent } from 'src/app/components/confirmation-dialog/confirmation-dialog.component';
import { ToastrService } from 'ngx-toastr';
import { ModulesService } from 'src/app/services/modules.service';
import { NewModuleDialog } from '../helpers/new-module-dialog/new-module-dialog.component';

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
    selector: 'app-modules-list',
    templateUrl: './modules-list.component.html',
    styleUrls: ['./modules-list.component.css']
})
export class ModulesListComponent implements OnInit, OnDestroy {
    public loading: boolean = true;
    public isConfirmed: boolean = false;
    public modules: any[] | null;
    public modulesCount: any;
    public pageIndex: number;
    public pageSize: number;
    public columns: string[] = [
        'name',
        'description',
        'status',
        'operation',
        'operations'
    ];
    public mode: OperationMode = OperationMode.None;
    public taskId: string | undefined = undefined;
    public expectedTaskMessages: number = 0;

    constructor(
        private profileService: ProfileService,
        private modulesService: ModulesService,
        private dialog: MatDialog,
        private informService: InformService,
    ) {
        this.modules = null;
        this.pageIndex = 0;
        this.pageSize = 100;
        this.modulesCount = 0;
    }

    ngOnInit() {
        this.loading = true;
        this.loadModules();
    }

    ngOnDestroy() {

    }

    private loadModules() {
        this.modules = null;
        this.isConfirmed = false;
        this.loading = true;
        this.profileService.getProfile().subscribe((profile: IUser | null) => {
            this.isConfirmed = !!(profile && profile.confirmed);
            if (this.isConfirmed) {
                this.loadAllModules();
            } else {
                setTimeout(() => {
                    this.loading = false;
                }, 500);
            }
        }, (e) => {
            this.loading = false;
        });
    }

    private loadAllModules() {
        this.loading = true;
        this.modulesService.page(this.pageIndex, this.pageSize).subscribe((policiesResponse) => {
            this.modules = policiesResponse.body || [];
            this.modulesCount = policiesResponse.headers.get('X-Total-Count') || this.modules.length;
            setTimeout(() => {
                this.loading = false;
            }, 500);
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
        this.loadAllModules();
    }

    private importDetails(result: any) {
        const { type, data, module } = result;
        const dialogRef = this.dialog.open(PreviewPolicyDialog, {
            width: '950px',
            panelClass: 'g-dialog',
            data: {
                module: module,
            }
        });
        dialogRef.afterClosed().subscribe(async (result) => {
            if (result) {
                if (type == 'message') {
                    this.loading = true;
                    this.modulesService.importByMessage(data).subscribe(
                        (result) => {
                            this.loadAllModules();
                        }, (e) => {
                            this.loading = false;
                        });
                } else if (type == 'file') {
                    this.loading = true;
                    this.modulesService.importByFile(data).subscribe(
                        (result) => {
                            this.loadAllModules();
                        }, (e) => {
                            this.loading = false;
                        });
                }
            }
        });
    }

    public importModules(messageId?: string) {
        const dialogRef = this.dialog.open(ImportPolicyDialog, {
            width: '500px',
            autoFocus: false,
            data: {
                type: 'module',
                timeStamp: messageId
            }
        });
        dialogRef.afterClosed().subscribe(async (result) => {
            if (result) {
                this.importDetails(result);
            }
        });
    }

    public exportModules(element: any) {
        this.loading = true;
        this.modulesService.exportInMessage(element.uuid)
            .subscribe(module => {
                this.loading = false;
                this.dialog.open(ExportPolicyDialog, {
                    width: '700px',
                    panelClass: 'g-dialog',
                    data: {
                        module: module
                    },
                    autoFocus: false
                })
            });
    }

    public newModules() {
        const dialogRef = this.dialog.open(NewModuleDialog, {
            width: '650px',
            panelClass: 'g-dialog',
            disableClose: true,
            autoFocus: false,
            data: {}
        });
        dialogRef.afterClosed().subscribe(async (result) => {
            if (result) {
                const module = {
                    name: result.name,
                    description: result.description,
                    menu: "show",
                    config: {
                        blockType: 'module'
                    }
                }
                this.loading = true;
                this.modulesService.create(module).subscribe((result) => {
                    this.loadAllModules();
                }, (e) => {
                    this.loading = false;
                });
            }
        });
    }

    public deleteModule(element: any) {
        const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
            data: {
                dialogTitle: 'Delete module',
                dialogText: 'Are you sure to delete module?'
            },
            autoFocus: false
        });
        dialogRef.afterClosed().subscribe((result) => {
            if (!result) {
                return;
            }
            this.loading = true;
            this.modulesService.delete(element.uuid).subscribe((result) => {
                this.loadAllModules();
            }, (e) => {
                this.loading = false;
            });
        });
    }

    public publishModule(element: any) {
        this.loading = true;
        this.modulesService.publish(element.uuid).subscribe((result) => {
            const { isValid, errors } = result;
            if (!isValid) {
                let text = [];
                const blocks = errors.blocks;
                const invalidBlocks = blocks.filter(
                    (block: any) => !block.isValid
                );
                for (let i = 0; i < invalidBlocks.length; i++) {
                    const block = invalidBlocks[i];
                    for (
                        let j = 0;
                        j < block.errors.length;
                        j++
                    ) {
                        const error = block.errors[j];
                        if (block.id) {
                            text.push(`<div>${block.id}: ${error}</div>`);
                        } else {
                            text.push(`<div>${error}</div>`);
                        }
                    }
                }
                this.informService.errorMessage(text.join(''), 'The module is invalid');
            }
            this.loadAllModules();
        }, (e) => {
            this.loading = false;
        });
    }
}