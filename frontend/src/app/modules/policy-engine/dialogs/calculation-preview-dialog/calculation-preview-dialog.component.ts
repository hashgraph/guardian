import { Component } from '@angular/core';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { ICalculationPreviewResult, normalizePreviewResult } from 'src/app/services/calculation-preview.service';

@Component({
    selector: 'calculation-preview-dialog',
    templateUrl: './calculation-preview-dialog.component.html',
    styleUrls: ['./calculation-preview-dialog.component.scss'],
    standalone: false
})
export class CalculationPreviewDialogComponent {
    public readonly result: ICalculationPreviewResult;
    private readonly labels: Record<string, string>;

    constructor(
        public dialogRef: DynamicDialogRef,
        public config: DynamicDialogConfig
    ) {
        this.result = normalizePreviewResult(this.config.data?.result);
        this.labels = this.config.data?.labels || {};
    }

    public getLabel(path: string): string {
        const label = this.labels[path];
        return label && label !== path ? `${label} (${path})` : path;
    }

    public formatValue(value: unknown): string {
        if (value === null || value === undefined) {
            return '—';
        }
        if (typeof value === 'number' && Number.isNaN(value)) {
            return 'NaN';
        }
        if (typeof value === 'object') {
            return JSON.stringify(value);
        }
        return String(value);
    }

    public formatDocument(document: unknown): string {
        return JSON.stringify(document, null, 2);
    }

    public getTarget(item: { target: string | null }): string {
        return item.target || 'the end of the chain';
    }

    public onClose(): void {
        this.dialogRef.close(null);
    }
}
