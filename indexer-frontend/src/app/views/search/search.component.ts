import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SearchService } from '@services/search.service';
import { MatInputModule } from '@angular/material/input';
import {
    FormControl,
    FormsModule,
    ReactiveFormsModule,
    Validators,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { ActivatedRoute, Router } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslocoModule } from '@jsverse/transloco';
import { ColumnType, TableComponent } from '@components/table/table.component';
import { InputTextModule } from 'primeng/inputtext';
import { InputIconModule } from 'primeng/inputicon';
import { IconFieldModule } from 'primeng/iconfield';

@Component({
    selector: 'app-search',
    templateUrl: './search.component.html',
    styleUrl: './search.component.scss',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        MatFormFieldModule,
        MatInputModule,
        ReactiveFormsModule,
        MatButtonModule,
        MatProgressSpinnerModule,
        TranslocoModule,
        TableComponent,
        InputTextModule,
        InputIconModule,
        IconFieldModule,
    ],
})
export class SearchViewComponent {
    public loading: boolean = true;
    public searchControl = new FormControl<string>('', [Validators.required]);
    public results: { type: string; id: string }[] = [];

    pageIndex: number = 0;
    total: number = 0;

    columns: any = [
        {
            type: ColumnType.CHIP,
            title: 'grid.type',
            field: 'type',
            width: '200px',
        },
        {
            type: ColumnType.TEXT,
            title: 'grid.consensus_timestamp',
            field: 'consensusTimestamp',
            width: '200px',
        },
        {
            type: ColumnType.BUTTON,
            title: 'grid.open',
            btn_label: 'grid.open',
            width: '100px',
            callback: this.onOpen.bind(this),
        },
    ];

    constructor(
        private searchService: SearchService,
        private route: ActivatedRoute,
        private router: Router
    ) {}

    ngOnInit() {
        this.loading = false;
        this.route.queryParams.subscribe((params: any) => {
            this.setSearch(params['search']);
            if (params.pageIndex) {
                this.pageIndex = Number(params.pageIndex);
            }
            this.onSearch();
        });
    }

    ngOnDestroy(): void {}

    public onPage(event: { pageIndex: number }) {
        this.pageIndex = event.pageIndex;
        this.router.navigate([], {
            relativeTo: this.route,
            queryParams: {
                search: this.searchControl.value,
                pageIndex: this.pageIndex,
            },
        });
    }

    public onSubmit() {
        this.pageIndex = 0;
        this.onSearch();
    }

    public setSearch(search: string) {
        if (this.searchControl.value !== search) {
            this.searchControl.setValue(search);
        }
    }

    public onSearch() {
        if (this.searchControl.valid && this.searchControl.value) {
            this.loading = true;
            this.searchService
                .search(this.searchControl.value, this.pageIndex)
                .subscribe({
                    next: (result) => {
                        const { items, total } = result;
                        this.total = total;
                        this.results = items || [];
                        setTimeout(() => {
                            this.loading = false;
                        }, 500);
                    },
                    error: ({ message }) => {
                        this.loading = false;
                        console.error(message);
                    },
                });
        } else {
            this.results = [];
        }
        this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { search: this.searchControl.value },
        });
    }

    public onOpen(item: any) {
        switch (item.type) {
            // Documents
            case 'EVC-Document':
            case 'VC-Document': {
                this.router.navigate([
                    `/vc-documents/${item.consensusTimestamp}`,
                ]);
                break;
            }
            case 'DID-Document': {
                this.router.navigate([
                    `/did-documents/${item.consensusTimestamp}`,
                ]);
                break;
            }
            case 'Schema': {
                this.router.navigate([`/schemas/${item.consensusTimestamp}`]);
                break;
            }
            case 'Policy': {
                this.router.navigate([`/policies/${item.consensusTimestamp}`]);
                break;
            }
            case 'Instance-Policy': {
                this.router.navigate([
                    `/policies/${item.consensusTimestamp}`,
                ]);
                break;
            }
            case 'VP-Document': {
                this.router.navigate([
                    `/vp-documents/${item.consensusTimestamp}`,
                ]);
                break;
            }
            case 'Standard Registry': {
                this.router.navigate([
                    `/registries/${item.consensusTimestamp}`,
                ]);
                break;
            }
            case 'Topic': {
                this.router.navigate([
                    `/topics/${item.topicId}`,
                ]);
                break;
            }
            case 'Token': {
                this.router.navigate([`/tokens/${item.tokenId}`]);
                break;
            }
            case 'Module': {
                this.router.navigate([`/modules/${item.consensusTimestamp}`]);
                break;
            }
            case 'Tool': {
                this.router.navigate([`/tools/${item.consensusTimestamp}`]);
                break;
            }
            case 'Tag': {
                this.router.navigate([`/tags/${item.consensusTimestamp}`]);
                break;
            }
            case 'Role-Document': {
                this.router.navigate([`/roles/${item.consensusTimestamp}`]);
                break;
            }
            case 'Synchronization Event': {
                this.router.navigate([`/events/${item.consensusTimestamp}`]);
                break;
            }
            case 'Contract': {
                this.router.navigate([`/contracts/${item.consensusTimestamp}`]);
                break;
            }
            default: {
                break;
            }
        }
    }
}
