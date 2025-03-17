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
import { TranslocoModule } from '@jsverse/transloco';
import { EntitiesService } from '@services/entities.service';
import { FiltersService } from '@services/filters.service';
import { PaginatorModule } from 'primeng/paginator';
import { ChipsModule } from 'primeng/chips';
import { ColumnType, TableComponent } from '@components/table/table.component';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { InputTextModule } from 'primeng/inputtext';
import { BaseGridComponent, Filter } from '@views/collections/base-grid/base-grid.component';
import { LandingService } from '@services/landing.service';
import { IconField, IconFieldModule } from 'primeng/iconfield';
import { InputIcon, InputIconModule } from 'primeng/inputicon';
import { ButtonModule } from 'primeng/button';

@Component({
    selector: 'priority-queue',
    templateUrl: './priority-queue.component.html',
    styleUrls: ['./priority-queue.component.scss',],
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
        TranslocoModule,
        TableComponent,
        PaginatorModule,
        ChipsModule,
        ReactiveFormsModule,
        ButtonModule,
        InputTextModule,
        InputGroupModule,
        InputGroupAddonModule,
        IconFieldModule,
        InputIconModule,
        InputTextModule,
    ],
})
export class PriorityQueueComponent extends BaseGridComponent {
    columns: any[] = [
        {
            type: ColumnType.TEXT,
            field: 'priorityDate',
            title: 'grid.date',
        },
        {
            type: ColumnType.TEXT,
            field: 'topicId',
            title: 'grid.topic_id',
            link: {
                field: 'topicId',
                url: '/topics',
            },
        },
    ];

    topicIdSearch = new Filter({
                        label: 'grid.filter.topic_id',
                        type: 'input',
                        field: 'topicId',
                    })

    constructor(
        private landingService: LandingService,
        route: ActivatedRoute,
        router: Router
    ) {
        super(route, router);
        this.filters.push(new Filter(this.topicIdSearch));
    }

    protected loadData(): void {
        const filters = this.getFilters();
        this.loadingData = true;
        this.landingService.getDataPriorityLoadingProgress(filters).subscribe({
            next: (result) => {
                this.setResult(result);
                setTimeout(() => {
                    this.loadingData = false;
                }, 500);
            },
            error: ({ message }) => {
                this.loadingData = false;
                console.error(message);
            },
        });
    }

    protected override loadFilters(): void {
    }
    
    public priorityControl = new FormControl<string>('');
    public setPriorityDataLoading() {
        if (this.priorityControl.value) {
            this.landingService.setDataPriorityLoadingProgress(this.priorityControl.value).subscribe(data => {
                if (!data) {
                    console.log("Topic not found!")
                } else {
                    location.reload();
                }
            });
        }
    }
}
