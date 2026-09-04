import { Component, OnInit } from '@angular/core';
import { IIwaFieldRemap, IIwaUpgradeReport } from '@guardian/interfaces';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';

type RemapStatus = 'renamed' | 'unchanged' | 'removed';

interface IRemapRow extends IIwaFieldRemap {
    status: RemapStatus;
}

/**
 * Confirmation dialog for remapping a draft schema's field properties from
 * IWA v1 to v3.
 */
@Component({
    selector: 'app-iwa-upgrade-dialog',
    templateUrl: './iwa-upgrade-dialog.component.html',
    styleUrls: ['./iwa-upgrade-dialog.component.scss'],
    standalone: false
})
export class IwaUpgradeDialogComponent implements OnInit {
    public loading = true;
    public header: string;

    public rows: IRemapRow[] = [];
    public renamedCount = 0;
    public unchangedCount = 0;
    public removedCount = 0;

    public showRemoved = true;
    public showRenamed = true;
    public showUnchanged = true;

    public pageIndex = 0;
    public pageSize = 25;
    public readonly pageSizeOptions = [10, 25, 50, 100, 500];

    constructor(
        public ref: DynamicDialogRef,
        public config: DynamicDialogConfig
    ) {
        this.header = this.config.data?.header || 'Upgrade to IWA v3';
        const report: IIwaUpgradeReport = this.config.data?.report || {
            renamed: [], unchanged: [], unmappable: []
        };

        const renamed = (report.renamed || []).map((e): IRemapRow => ({ ...e, status: 'renamed' }));
        const unchanged = (report.unchanged || []).map((e): IRemapRow => ({ ...e, status: 'unchanged' }));
        const removed = (report.unmappable || []).map((e): IRemapRow => ({ ...e, status: 'removed' }));

        this.renamedCount = renamed.length;
        this.unchangedCount = unchanged.length;
        this.removedCount = removed.length;

        this.rows = [...removed, ...renamed, ...unchanged];
    }

    ngOnInit() {
        this.loading = false;
    }

    public get total(): number {
        return this.rows.length;
    }

    public get filteredRows(): IRemapRow[] {
        return this.rows.filter((row) => {
            if (row.status === 'removed') { return this.showRemoved; }
            if (row.status === 'renamed') { return this.showRenamed; }
            return this.showUnchanged;
        });
    }

    public get pagedRows(): IRemapRow[] {
        const start = this.pageIndex * this.pageSize;
        return this.filteredRows.slice(start, start + this.pageSize);
    }

    public toggle(status: RemapStatus): void {
        if (status === 'removed') { this.showRemoved = !this.showRemoved; }
        if (status === 'renamed') { this.showRenamed = !this.showRenamed; }
        if (status === 'unchanged') { this.showUnchanged = !this.showUnchanged; }
        this.pageIndex = 0;
    }

    public onPage(event: { pageIndex: number, pageSize: number }): void {
        if (this.pageSize !== event.pageSize) {
            this.pageIndex = 0;
        } else {
            this.pageIndex = event.pageIndex;
        }
        this.pageSize = event.pageSize;
    }

    /**
     * Split a property path so the entity reads as secondary to the field name,
     * which is the part that actually differs between the two columns.
     */
    public entityOf(path: string): string {
        const i = (path || '').indexOf('.');
        return i < 0 ? '' : path.slice(0, i + 1);
    }

    public fieldOf(path: string): string {
        const i = (path || '').indexOf('.');
        return i < 0 ? (path || '') : path.slice(i + 1);
    }

    /** True when v3 moved the property to a different entity, not just renamed it. */
    public movedEntity(row: IRemapRow): boolean {
        return row.status === 'renamed' && !!row.to
            && this.entityOf(row.from) !== this.entityOf(row.to);
    }

    public onClose(): void {
        this.ref.close(null);
    }

    public onUpgrade(): void {
        this.ref.close('Upgrade');
    }
}
