import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatSortModule } from '@angular/material/sort';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { SearchService } from '../../../services/search.service';
import { BaseGridComponent } from '../base-grid/base-grid.component';
import { LoadingComponent } from '../../../components/loading/loading.component';

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
        LoadingComponent
    ]
})
export class VpDocumentsComponent extends BaseGridComponent {
    constructor(
        private searchService: SearchService,
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
    }

    protected loadData(): void {
        const filters = this.getFilters();
        this.loading = true;
        this.searchService.getVpDocuments(filters).subscribe({
            next: (result) => {
                this.setResult(result);
                setTimeout(() => {
                    this.loading = false;
                }, 500);
            },
            error: ({ message }) => {
                this.loading = false;
                console.error(message);
            }
        });
    }

    public onOpen(element: any) {
        this.router.navigate([`/vp-documents/${element.consensusTimestamp}`]);
    }
}
