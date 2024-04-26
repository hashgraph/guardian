import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatSortModule } from '@angular/material/sort';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { LoadingComponent } from '@components/loading/loading.component';
import { BaseGridComponent, Filter } from '../base-grid/base-grid.component';
import { TranslocoModule } from '@jsverse/transloco';
import { SelectFilterComponent } from '@components/select-filter/select-filter.component';
import { EntitiesService } from '@services/entities.service';
import { FiltersService } from '@services/filters.service';

@Component({
    selector: 'vp-documents',
    templateUrl: './vp-documents.component.html',
    styleUrls: [
        '../base-grid/base-grid.component.scss',
        './vp-documents.component.scss',
    ],
    standalone: true,
    imports: [
        CommonModule,
        MatPaginatorModule,
        MatTableModule,
        MatSortModule,
        MatFormFieldModule,
        MatSelectModule,
        MatInputModule,
        FormsModule,
        MatButtonModule,
        LoadingComponent,
        TranslocoModule,
        ReactiveFormsModule,
        SelectFilterComponent
    ]
})
export class VpDocumentsComponent extends BaseGridComponent {
    public searchFilter: Filter;
    public policyFilter: Filter;
    public statusFilter: Filter;
    public schemaFilter: Filter;

    constructor(
        private entitiesService: EntitiesService,
        private filtersService: FiltersService,
        route: ActivatedRoute,
        router: Router
    ) {
        super(route, router);
        this.displayedColumns = [
            'topicId',
            'consensusTimestamp',
            'uuid',
            'status',
            'option.issuer',
            'account',
            'menu'
        ];

        this.searchFilter = new Filter({
            type: 'search',
            field: 'search',
        });
        this.policyFilter = new Filter({
            type: 'select',
            field: 'policy',
            multiple: true,
            data: ['iRec 2', 'iRec 4', 'iRec 5', 'CDM', 'iRec 6', 'iRec 9', 'iRec 2', 'iRec 4', 'iRec 5', 'CDM', 'iRec 6', 'iRec 9']
        });
        this.statusFilter = new Filter({
            type: 'select',
            field: 'status',
            multiple: true,
            data: ['iRec 2', 'iRec 4', 'iRec 5', 'CDM', 'iRec 6', 'iRec 9', 'iRec 2', 'iRec 4', 'iRec 5', 'CDM', 'iRec 6', 'iRec 9']
        });
        this.schemaFilter = new Filter({
            type: 'select',
            field: 'schema',
            multiple: true,
            data: ['iRec 2', 'iRec 4', 'iRec 5', 'CDM', 'iRec 6', 'iRec 9', 'iRec 2', 'iRec 4', 'iRec 5', 'CDM', 'iRec 6', 'iRec 9']
        });

        this.filters = [
            this.searchFilter,
            this.policyFilter,
            this.statusFilter,
            this.schemaFilter
        ]
    }

    protected loadData(): void {
        const filters = this.getFilters();
        this.loadingData = true;
        this.entitiesService.getVpDocuments(filters).subscribe({
            next: (result) => {
                this.setResult(result);
                setTimeout(() => {
                    this.loadingData = false;
                }, 500);
            },
            error: ({ message }) => {
                this.loadingData = false;
                console.error(message);
            }
        });
    }

    protected loadFilters(): void {
        this.loadingFilters = true;
        this.filtersService.getVpFilters().subscribe({
            next: (result) => {
                this.setFilters(result);
                setTimeout(() => {
                    this.loadingFilters = false;
                }, 500);
            },
            error: ({ message }) => {
                this.loadingFilters = false;
                console.error(message);
            }
        });
    }

    public onOpen(element: any) {
        this.router.navigate([`/vp-documents/${element.consensusTimestamp}`]);
    }
}
