import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { SearchService } from '../../../services/search.service';
import { BaseDetailsComponent } from '../base-details/base-details.component';
import { LoadingComponent } from '../../../components/loading/loading.component';
import { MatTabChangeEvent, MatTabsModule } from '@angular/material/tabs';

@Component({
    selector: 'vp-document-details',
    templateUrl: './vp-document-details.component.html',
    styleUrls: [
        '../base-details/base-details.component.scss',
        './vp-document-details.component.scss',
    ],
    standalone: true,
    imports: [
        CommonModule,
        LoadingComponent,
        MatTabsModule
    ]
})
export class VpDocumentDetailsComponent extends BaseDetailsComponent {
    constructor(
        private searchService: SearchService,
        route: ActivatedRoute,
        router: Router
    ) {
        super(route, router);
    }

    protected loadData(): void {
        if (this.id) {
            this.loading = true;
            this.searchService.getVpDocument(this.id).subscribe({
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
        } else {
            this.setResult();
        }
    }

    protected onNavigate(): void {
        if (this.id && this.tab === 'RELATIONSHIPS') {
            this.loading = true;
            this.searchService.getVpRelationships(this.id).subscribe({
                next: (result) => {
                    this.setRelationships(result);
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
    }

    protected getTabIndex(): number {
        if (this.target) {
            switch (this.tab) {
                case 'OVERVIEW': return 0;
                case 'DOCUMENT': return 1;
                case 'HISTORY': return 2;
                case 'RELATIONSHIPS': return 3;
                case 'ROW DATA': return 4;
                default: return 0;
            }
        } else {
            return 0;
        }
    }

    public getJson(item: any): string {
        return JSON.stringify(item, null, 4);
    }
}
