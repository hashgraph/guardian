import { ChangeDetectorRef, Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { TranslocoModule } from '@jsverse/transloco';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { InputTextModule } from 'primeng/inputtext';
import { PaginatorModule } from 'primeng/paginator';
import { ChipsModule } from 'primeng/chips';
import { Subscription, debounceTime, distinctUntilChanged } from 'rxjs';
import { ColumnType, TableComponent } from '@components/table/table.component';
import { AnalyticsService, ProjectTonnage } from '@services/analytics.service';

@Component({
    selector: 'app-projects',
    templateUrl: './projects.component.html',
    styleUrls: ['../collections/base-grid/base-grid.component.scss', './projects.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        MatPaginatorModule,
        MatTableModule,
        MatSortModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        TranslocoModule,
        TableComponent,
        PaginatorModule,
        ChipsModule,
        InputTextModule,
        InputGroupModule,
        InputGroupAddonModule,
    ],
})
export class ProjectsComponent implements OnInit, OnDestroy {
    public loading = true;
    public items: ProjectTonnage[] = [];
    public total = 0;
    public pageIndex = 0;
    public pageSize = 25;
    public orderField = 'totalMinted';
    public orderDir = 'DESC';

    public ownerFilter = new FormControl<string>('');
    public policyFilter = new FormControl<string>('');
    public minMintedFilter = new FormControl<string>('');

    private subs: Subscription[] = [];

    columns: any[] = [
        {
            id: 'policyName',
            title: 'Policy',
            type: ColumnType.TEXT,
            width: '20%',
        },
        {
            id: 'owner',
            title: 'Owner / Registry',
            type: ColumnType.TEXT,
            width: '22%',
        },
        {
            id: 'totalMinted',
            title: 'Total Minted (credits)',
            type: ColumnType.TEXT,
            width: '16%',
            format: (val: number) => val?.toLocaleString() ?? '0',
        },
        {
            id: 'mintEventCount',
            title: 'Mint Events',
            type: ColumnType.TEXT,
            width: '12%',
        },
        {
            id: 'tokenCount',
            title: 'Tokens',
            type: ColumnType.TEXT,
            width: '10%',
            getValue: (row: ProjectTonnage) => row.tokens?.length ?? 0,
        },
        {
            id: 'policyId',
            title: 'Policy ID',
            type: ColumnType.TEXT,
            width: '20%',
        },
    ];

    constructor(
        private analyticsService: AnalyticsService,
        private router: Router,
        private cdr: ChangeDetectorRef,
    ) {}

    ngOnInit(): void {
        this.loadData();

        const filterSub = [this.ownerFilter, this.policyFilter, this.minMintedFilter].map(ctrl =>
            ctrl.valueChanges.pipe(debounceTime(400), distinctUntilChanged()).subscribe(() => {
                this.pageIndex = 0;
                this.loadData();
            })
        );
        this.subs.push(...filterSub);
    }

    ngOnDestroy(): void {
        this.subs.forEach(s => s.unsubscribe());
    }

    loadData(): void {
        this.loading = true;
        this.analyticsService.getProjects({
            pageIndex: this.pageIndex,
            pageSize: this.pageSize,
            orderField: this.orderField,
            orderDir: this.orderDir,
            owner: this.ownerFilter.value || undefined,
            policyId: this.policyFilter.value || undefined,
            minMinted: this.minMintedFilter.value ? Number(this.minMintedFilter.value) : undefined,
        }).subscribe({
            next: (result) => {
                this.items = (result.items || []).map(p => ({
                    ...p,
                    tokenCount: p.tokens?.length ?? 0,
                }));
                this.total = result.total;
                this.loading = false;
                this.cdr.detectChanges();
            },
            error: () => {
                this.loading = false;
                this.cdr.detectChanges();
            },
        });
    }

    onPage(event: PageEvent): void {
        this.pageIndex = event.pageIndex;
        this.pageSize = event.pageSize;
        this.loadData();
    }

    onSort(event: { active: string; direction: string }): void {
        this.orderField = event.active;
        this.orderDir = event.direction?.toUpperCase() || 'DESC';
        this.pageIndex = 0;
        this.loadData();
    }

    onRowClick(row: ProjectTonnage): void {
        if (row?.policyId) {
            this.router.navigate(['/policies', row.policyId]);
        }
    }
}
