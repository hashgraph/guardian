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
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { PaginatorModule } from 'primeng/paginator';
import { ChipsModule } from 'primeng/chips';
import { ColumnType, TableComponent } from '@components/table/table.component';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { InputTextModule } from 'primeng/inputtext';
import { BaseGridComponent, Filter } from '@views/collections/base-grid/base-grid.component';
import { LandingService } from '@services/landing.service';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { ButtonModule } from 'primeng/button';
import { MessageService } from 'primeng/api';
import { PriorityStatus } from '@indexer/interfaces';
import { catchError, of, switchMap } from 'rxjs';

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
            field: 'priorityStatusDate',
            title: 'grid.date',
            sort: true,
            formatValue: (date: any) => {
                if (date) {
                    return new Date(date).toLocaleString();
                }

                return '';
            }
        },
        {
            type: ColumnType.TEXT,
            field: 'entityId',
            title: 'grid.entity_id',
            sort: true,
            link: {
                field: 'entityId',
                getUrl: (item: any) => {
                    if (item.type === 'Topic')
                        return '/topics'

                    if (item.type === 'Token')
                        return '/tokens'

                    return null;
                }
            },
        },
        {
            type: ColumnType.TEXT,
            field: 'type',
            title: 'grid.entity_type',
            sort: true,
        },
        {
            type: ColumnType.CHIP,
            field: 'priorityStatus',
            title: 'grid.status',
            width: '100px',
            sort: true,
            severity: (row: any) => {
                switch (row.priorityStatus) {
                    case PriorityStatus.SCHEDULED:
                        return 'secondary'

                    case PriorityStatus.RUNNING:
                        return 'info'

                    case PriorityStatus.FINISHED:
                        return 'success'

                    default:
                        return 'secondary'
                }
            }
        },
        {
            type: ColumnType.TEXT,
            field: 'priorityStatusDate',
            title: 'grid.lastUpdate',
            sort: true,
            formatValue: (priorityStatusDate: any) => {
                if (priorityStatusDate) {
                    return new Date(priorityStatusDate).toLocaleString();
                }

                return '';
            }
        },
    ];

    topicIdSearch = new Filter({
        label: 'grid.filter.topic_id',
        type: 'input',
        field: 'entityId',
    })

    priorityControl = new FormControl<string>('');

    constructor(
        private landingService: LandingService,
        private messageService: MessageService,
        private translocoService: TranslocoService,
        route: ActivatedRoute,
        router: Router
    ) {
        super(route, router);
        this.filters.push(new Filter(this.topicIdSearch));
    }

    protected loadData(): void {
        const filters = this.getFilters();
        this.loadingData = true;

        if (filters['entityId']) {
            filters['entityId'] = filters['entityId'].trim();
        }

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

    public onChangePriorityControl(value: any) {
    }

    public setPriorityDataLoading() {
        if (this.priorityControl.value) {
            const searchValue = this.priorityControl.value.trim();

            this.landingService.setDataPriorityLoadingProgressAny(searchValue).subscribe(data => {
                if (data) {
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Success',
                        detail: this.translocoService.translate('priority_queue.add_to_queue_success'),
                        life: 3000
                    });

                    setTimeout(() => location.reload(), 1000)
                } else {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: this.translocoService.translate('priority_queue.not_exist_queue_error'),
                        life: 3000
                    });
                }
            })
        }
    }
}
