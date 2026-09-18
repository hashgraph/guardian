import { Component } from '@angular/core';
import { Observable } from 'rxjs';
import { ModulesService } from 'src/app/services/modules.service';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { ToolsService } from 'src/app/services/tools.service';
import { SchemaTemplatesService } from 'src/app/services/schema-templates.service';
/**
 * Export schema dialog.
 */
@Component({
    selector: 'export-policy-dialog',
    templateUrl: './export-policy-dialog.component.html',
    styleUrls: ['./export-policy-dialog.component.scss'],
    standalone: false
})
export class ExportPolicyDialog {
    public loading = true;

    public policy!: any;
    public module!: any;
    public tool!: any;
    public schemaTemplate!: any;
    public header!: any;

    constructor(
        public ref: DynamicDialogRef,
        public config: DynamicDialogConfig,
        private policyEngineService: PolicyEngineService,
        private modulesService: ModulesService,
        private toolsService: ToolsService,
        private schemaTemplatesService: SchemaTemplatesService
    ) {
        this.policy = this.config.data.policy;
        this.module = this.config.data.module;
        this.tool = this.config.data.tool;
        this.schemaTemplate = this.config.data.schemaTemplate;
        this.header = this.config.header;
    }

    ngOnInit() {
        this.loading = false;
    }

    public canCopy(): boolean {
        return (
            (this.policy && this.policy.messageId) ||
            (this.module && this.module.messageId) ||
            (this.tool && this.tool.messageId) ||
            (this.schemaTemplate && this.schemaTemplate.messageId)
        )
    }

    public canSave(): boolean {
        return (
            (this.policy) ||
            (this.module) ||
            (this.tool) ||
            (this.schemaTemplate)
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
        if (this.schemaTemplate) {
            this.handleCopyToClipboard(this.schemaTemplate.messageId)
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
        if (this.schemaTemplate) {
            this.schemaTemplateToFile()
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
        this.download(
            this.policyEngineService.exportInFile(this.policy.id),
            'application/guardian-policy',
            `${this.policy.name}.policy`
        );
    }

    private moduleToFile() {
        this.download(
            this.modulesService.exportInFile(this.module.uuid),
            'application/guardian-module',
            `${this.module.name}.module`
        );
    }

    private toolToFile() {
        this.download(
            this.toolsService.exportInFile(this.tool.id),
            'application/guardian-tool',
            `${this.tool.name}.tool`
        );
    }

    private schemaTemplateToFile() {
        this.download(
            this.schemaTemplatesService.exportInFile(this.schemaTemplate.id),
            'application/guardian-schema-template',
            `${this.schemaTemplate.name}.template`
        );
    }

    private download(
        request: Observable<any>,
        type: string,
        fileName: string
    ): void {
        this.loading = true;
        request.subscribe(
            (fileBuffer) => {
                this.saveBuffer(fileBuffer, type, fileName);
                this.loading = false;
                this.ref.close(true);
            },
            (error) => {
                this.loading = false;
            }
        );
    }

    private saveBuffer(fileBuffer: any, type: string, fileName: string): void {
        const url = window.URL.createObjectURL(
            new Blob([new Uint8Array(fileBuffer)], { type })
        );
        const downloadLink = document.createElement('a');
        downloadLink.href = url;
        downloadLink.setAttribute('download', fileName);
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        setTimeout(() => window.URL.revokeObjectURL(url), 500);
    }
}
