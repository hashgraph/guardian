import { Component } from '@angular/core';
import { ModulesService } from 'src/app/services/modules.service';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { ToolsService } from 'src/app/services/tools.service';
/**
 * Export schema dialog.
 */
@Component({
    selector: 'export-policy-dialog',
    templateUrl: './export-policy-dialog.component.html',
    styleUrls: ['./export-policy-dialog.component.scss'],
})
export class ExportPolicyDialog {
    public loading = true;

    public policy!: any;
    public module!: any;
    public tool!: any;
    public header!: any;

    constructor(
        public ref: DynamicDialogRef,
        public config: DynamicDialogConfig,
        private policyEngineService: PolicyEngineService,
        private modulesService: ModulesService,
        private toolsService: ToolsService
    ) {
        this.policy = this.config.data.policy;
        this.module = this.config.data.module;
        this.tool = this.config.data.tool;
        this.header = this.config.header;
    }

    ngOnInit() {
        this.loading = false;
    }

    public canCopy(): boolean {
        return (
            (this.policy && this.policy.messageId) ||
            (this.module && this.module.messageId) ||
            (this.tool && this.tool.messageId)
        )
    }

    public canSave(): boolean {
        return (
            (this.policy) ||
            (this.module) ||
            (this.tool)
        )
    }

    public onCopy(): void {
        if (this.policy) {
            this.handleCopyToClipboard(this.policy.messageId)
            return;
        }
        if (this.module) {
            this.handleCopyToClipboard(this.module.messageId)
            return;
        }
        if (this.tool) {
            this.handleCopyToClipboard(this.tool.messageId)
            return;
        }
    }

    public onSave(): void {
        if (this.policy) {
            this.saveToFile()
            return;
        }
        if (this.module) {
            this.moduleToFile()
            return;
        }
        if (this.tool) {
            this.toolToFile()
            return;
        }
    }

    public getSchemaTitle(model: any) {
        return `${model.name} (${model.version}): ${model.messageId}`;
    }

    public onClose(): void {
        this.ref.close(false);
    }

    private handleCopyToClipboard(text: string): void {
        navigator.clipboard.writeText(text || '');
    }

    private saveToFile() {
        this.loading = true;
        this.policyEngineService.exportInFile(this.policy.id).subscribe(
            (fileBuffer) => {
                let downloadLink = document.createElement('a');
                downloadLink.href = window.URL.createObjectURL(
                    new Blob([new Uint8Array(fileBuffer)], {
                        type: 'application/guardian-policy',
                    })
                );
                downloadLink.setAttribute(
                    'download',
                    `${this.policy.name}.policy`
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

    private moduleToFile() {
        this.loading = true;
        this.modulesService.exportInFile(this.module.uuid).subscribe(
            (fileBuffer) => {
                let downloadLink = document.createElement('a');
                downloadLink.href = window.URL.createObjectURL(
                    new Blob([new Uint8Array(fileBuffer)], {
                        type: 'application/guardian-module',
                    })
                );
                downloadLink.setAttribute(
                    'download',
                    `${this.module.name}.module`
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

    private toolToFile() {
        this.loading = true;
        this.toolsService.exportInFile(this.tool.id)
            .subscribe(fileBuffer => {
                let downloadLink = document.createElement('a');
                downloadLink.href = window.URL.createObjectURL(new Blob([new Uint8Array(fileBuffer)], {
                    type: 'application/guardian-tool'
                }));
                downloadLink.setAttribute('download', `${this.tool.name}.tool`);
                document.body.appendChild(downloadLink);
                downloadLink.click();
                setTimeout(() => {
                    this.loading = false;
                }, 500);
            }, error => {
                this.loading = false;
            });
    }
}
