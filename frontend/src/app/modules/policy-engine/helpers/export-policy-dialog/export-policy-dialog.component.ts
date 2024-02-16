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
    }

    ngOnInit() {
        this.loading = false;
    }

    getSchemaTitle(model: any) {
        return `${model.name} (${model.version}): ${model.messageId}`;
    }

    onClose(): void {
        this.ref.close(false);
    }

    handleCopyToClipboard(text: string): void {
        navigator.clipboard.writeText(text || '');
    }

    saveToFile() {
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
                    `policy_${Date.now()}.policy`
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

    moduleToFile() {
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
                    `module_${Date.now()}.module`
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

    toolToFile() {
        this.loading = true;
        this.toolsService.exportInFile(this.tool.id)
            .subscribe(fileBuffer => {
                let downloadLink = document.createElement('a');
                downloadLink.href = window.URL.createObjectURL(new Blob([new Uint8Array(fileBuffer)], {
                    type: 'application/guardian-tool'
                }));
                downloadLink.setAttribute('download', `tool_${Date.now()}.tool`);
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
